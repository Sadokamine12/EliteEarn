import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, UserRole, UserStatus } from '@app/common';
import { DatabaseService } from '@app/database';
import { getAccessPublicKey } from '../jwt-config';

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly databaseService: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: getAccessPublicKey(),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const result = await this.databaseService.query<{
      email: string;
      username: string;
      role: UserRole;
      status: UserStatus;
    }>(
      `
        SELECT email, username, role, status
        FROM users
        WHERE id = $1
      `,
      [payload.sub],
    );

    const user = result.rows[0];
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    return {
      sub: payload.sub,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
    };
  }
}
