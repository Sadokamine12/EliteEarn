import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '@app/database';
import { UserRole, UserStatus } from '@app/common';
import {
  NotifyUserEvent,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RabbitMqService,
} from '@app/rabbitmq';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  getAccessExpiresIn,
  getAccessPrivateKey,
  getRefreshExpiresIn,
  getRefreshPrivateKey,
  getRefreshPublicKey,
} from './jwt-config';

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

interface UserRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  referral_code: string;
  referred_by: string | null;
  role: UserRole;
  status: UserStatus;
  welcome_bonus_claimed: boolean;
  referral_team_bonus_claimed: boolean;
  created_at: string;
  updated_at: string;
}

interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}

interface RefreshTokenPayload extends TokenPayload {
  sid: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rabbitMqService: RabbitMqService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto, meta: RequestMeta) {
    const usersCountResult = await this.databaseService.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM users
      `,
    );
    const usersCount = Number(usersCountResult.rows[0]?.count ?? 0);

    const existingUser = await this.databaseService.query<{ id: string }>(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)
        LIMIT 1
      `,
      [dto.email, dto.username],
    );

    if (existingUser.rowCount) {
      throw new ConflictException('A user with this email or username already exists');
    }

    const normalizedReferralCode = dto.referralCode?.trim();
    let referredById: string | null = null;

    if (normalizedReferralCode) {
      referredById = await this.resolveReferralCode(normalizedReferralCode);
    } else if (usersCount > 0) {
      throw new BadRequestException('Referral code is required');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const { user, teamBonusAwarded } = await this.databaseService.transaction(async (client) => {
      const referralCode = await this.generateReferralCode(client);
      const userResult = await client.query<UserRecord>(
        `
          INSERT INTO users (
            username,
            email,
            password_hash,
            referral_code,
            referred_by,
            welcome_bonus_claimed
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [
          dto.username,
          dto.email.toLowerCase(),
          passwordHash,
          referralCode,
          referredById,
          false,
        ],
      );

      const createdUser = userResult.rows[0];
      await client.query(
        `
          INSERT INTO balances (user_id, available, total_earned, this_month)
          VALUES ($1, $2, $2, $2)
        `,
        [createdUser.id, 0],
      );

      const teamBonusAwarded = referredById
        ? await this.applyReferralTeamBonusIfEligible(client, referredById)
        : 0;

      return {
        user: createdUser,
        teamBonusAwarded,
      };
    });

    if (referredById && teamBonusAwarded > 0) {
      const event: NotifyUserEvent = {
        userId: referredById,
        title: 'Referral Giveaway Unlocked!',
        message: `You invited 5 members and received $${teamBonusAwarded.toFixed(2)}.`,
        type: 'referral_team_bonus',
      };
      await this.rabbitMqService.publish(
        RABBITMQ_EXCHANGES.NOTIFS,
        RABBITMQ_QUEUES.NOTIFY_USER,
        event,
      );
    }

    const session = await this.createRefreshSession(user, meta);

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: session.token,
      user: this.toUserResponse(user),
    };
  }

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.findUserByIdentifier(dto.identifier);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const session = await this.createRefreshSession(user, meta);

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken: session.token,
      user: this.toUserResponse(user),
    };
  }

  async refresh(dto: RefreshTokenDto, meta: RequestMeta) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(dto.refreshToken, {
        publicKey: getRefreshPublicKey(),
        algorithms: ['RS256'],
      });
    } catch (_error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.databaseService.transaction(async (client) => {
      const sessionResult = await client.query<{
        id: string;
        token_hash: string;
        expires_at: string;
        revoked_at: string | null;
      }>(
        `
          SELECT id, token_hash, expires_at, revoked_at
          FROM refresh_tokens
          WHERE id = $1
          FOR UPDATE
        `,
        [payload.sid],
      );

      const session = sessionResult.rows[0];
      if (!session || session.revoked_at) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const incomingHash = this.hashToken(dto.refreshToken);
      if (incomingHash !== session.token_hash) {
        await client.query(
          `
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE user_id = $1 AND revoked_at IS NULL
          `,
          [payload.sub],
        );
        throw new UnauthorizedException('Refresh token mismatch detected');
      }

      if (new Date(session.expires_at).getTime() <= Date.now()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      const userResult = await client.query<UserRecord>(
        `
          SELECT *
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [payload.sub],
      );
      const currentUser = userResult.rows[0];

      if (!currentUser || currentUser.status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      const replacementSession = await this.insertRefreshToken(
        client,
        currentUser,
        meta,
      );

      await client.query(
        `
          UPDATE refresh_tokens
          SET revoked_at = NOW(), replaced_by_token_id = $2
          WHERE id = $1
        `,
        [session.id, replacementSession.sessionId],
      );

      return {
        user: currentUser,
        refreshToken: replacementSession.token,
      };
    });

    return {
      accessToken: await this.signAccessToken(user.user),
      refreshToken: user.refreshToken,
      user: this.toUserResponse(user.user),
    };
  }

  private async resolveReferralCode(referralCode: string): Promise<string> {
    const result = await this.databaseService.query<{ id: string }>(
      `
        SELECT id
        FROM users
        WHERE referral_code = $1
        LIMIT 1
      `,
      [referralCode],
    );

    const user = result.rows[0];
    if (!user) {
      throw new BadRequestException('Referral code is invalid');
    }

    return user.id;
  }

  private async findUserByIdentifier(identifier: string): Promise<UserRecord | null> {
    const result = await this.databaseService.query<UserRecord>(
      `
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
        LIMIT 1
      `,
      [identifier],
    );

    return result.rows[0] ?? null;
  }

  private async generateReferralCode(client: PoolClient): Promise<string> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const bytes = randomBytes(8);
      const candidate = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
      const exists = await client.query<{ referral_code: string }>(
        `
          SELECT referral_code
          FROM users
          WHERE referral_code = $1
          LIMIT 1
        `,
        [candidate],
      );

      if (!exists.rowCount) {
        return candidate;
      }
    }

    throw new ConflictException('Failed to generate a unique referral code');
  }

  private async applyReferralTeamBonusIfEligible(
    client: PoolClient,
    referrerUserId: string,
  ): Promise<number> {
    const settingsResult = await client.query<{ key: string; value: string }>(
      `
        SELECT key, value
        FROM platform_settings
        WHERE key IN ('referral_team_bonus_target', 'referral_team_bonus_amount')
      `,
    );

    const settings = Object.fromEntries(settingsResult.rows.map((row) => [row.key, row.value]));
    const target = Number(settings.referral_team_bonus_target ?? 5);
    const amount = Number(settings.referral_team_bonus_amount ?? 500);

    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(amount) || amount <= 0) {
      return 0;
    }

    const userResult = await client.query<{ referral_team_bonus_claimed: boolean }>(
      `
        SELECT referral_team_bonus_claimed
        FROM users
        WHERE id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [referrerUserId],
    );

    const referrer = userResult.rows[0];
    if (!referrer || referrer.referral_team_bonus_claimed) {
      return 0;
    }

    const referralsResult = await client.query<{ count: string }>(
      `
        SELECT COUNT(*)::TEXT AS count
        FROM users
        WHERE referred_by = $1
      `,
      [referrerUserId],
    );

    const totalReferrals = Number(referralsResult.rows[0]?.count ?? 0);
    if (totalReferrals < target) {
      return 0;
    }

    await client.query(
      `
        INSERT INTO balances (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [referrerUserId],
    );

    await client.query(
      `
        UPDATE balances
        SET
          available = available + $2,
          total_earned = total_earned + $2,
          this_month = this_month + $2,
          updated_at = NOW()
        WHERE user_id = $1
      `,
      [referrerUserId, amount],
    );

    await client.query(
      `
        UPDATE users
        SET referral_team_bonus_claimed = true, updated_at = NOW()
        WHERE id = $1
      `,
      [referrerUserId],
    );

    return amount;
  }

  private async signAccessToken(user: UserRecord): Promise<string> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
    };

    return this.jwtService.signAsync(payload, {
      algorithm: 'RS256',
      expiresIn: getAccessExpiresIn(),
      privateKey: getAccessPrivateKey(),
    });
  }

  private async createRefreshSession(user: UserRecord, meta: RequestMeta) {
    return this.databaseService.transaction(async (client) =>
      this.insertRefreshToken(client, user, meta),
    );
  }

  private async insertRefreshToken(
    client: PoolClient,
    user: UserRecord,
    meta: RequestMeta,
  ): Promise<{ sessionId: string; token: string }> {
    const sessionId = randomUUID();
    const payload: RefreshTokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      sid: sessionId,
    };
    const token = await this.jwtService.signAsync(payload, {
      algorithm: 'RS256',
      expiresIn: getRefreshExpiresIn(),
      privateKey: getRefreshPrivateKey(),
    });
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;

    if (!decoded?.exp) {
      throw new UnauthorizedException('Failed to determine refresh token expiration');
    }

    await client.query(
      `
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
        VALUES ($1, $2, $3, TO_TIMESTAMP($4), $5, $6)
      `,
      [
        sessionId,
        user.id,
        this.hashToken(token),
        decoded.exp,
        meta.userAgent ?? null,
        meta.ipAddress ?? null,
      ],
    );

    return {
      sessionId,
      token,
    };
  }

  private hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private toUserResponse(user: UserRecord) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      referralCode: user.referral_code,
      referredBy: user.referred_by,
      role: user.role,
      status: user.status,
      welcomeBonusClaimed: user.welcome_bonus_claimed,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
