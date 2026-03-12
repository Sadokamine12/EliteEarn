export interface ReferralCommissionExecutor {
  query<T = unknown>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

interface ReferralLinkRow {
  referred_by: string | null;
}

interface SettingRow {
  key: string;
  value: string;
}

export interface AppliedReferralCommission {
  beneficiaryUserId: string;
  level: 1 | 2 | 3;
  ratePercent: number;
  commissionAmount: number;
  applied: boolean;
}

export async function applyReferralCommissions(params: {
  executor: ReferralCommissionExecutor;
  sourceUserId: string;
  subscriptionId: string;
  vipTierId: string;
  sourceAmount: number;
}): Promise<AppliedReferralCommission[]> {
  const { executor, sourceUserId, subscriptionId, vipTierId, sourceAmount } = params;
  const rates = await getReferralRates(executor);
  const applied: AppliedReferralCommission[] = [];

  let currentUserId = sourceUserId;
  for (const level of [1, 2, 3] as const) {
    const referralResult = await executor.query<ReferralLinkRow>(
      `
        SELECT referred_by
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [currentUserId],
    );

    const beneficiaryUserId = referralResult.rows[0]?.referred_by;
    if (!beneficiaryUserId) {
      break;
    }

    const ratePercent = rates[level];
    const commissionAmount = Number(((sourceAmount * ratePercent) / 100).toFixed(2));

    if (commissionAmount > 0) {
      await executor.query(
        `
          INSERT INTO balances (user_id)
          VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `,
        [beneficiaryUserId],
      );

      const insertResult = await executor.query<{ id: string }>(
        `
          INSERT INTO referral_commissions (
            beneficiary_user_id,
            source_user_id,
            subscription_id,
            vip_tier_id,
            level,
            rate_percent,
            source_amount,
            commission_amount
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (subscription_id, beneficiary_user_id, level) DO NOTHING
          RETURNING id
        `,
        [
          beneficiaryUserId,
          sourceUserId,
          subscriptionId,
          vipTierId,
          level,
          ratePercent.toFixed(2),
          sourceAmount.toFixed(2),
          commissionAmount.toFixed(2),
        ],
      );

      const wasApplied = Boolean(insertResult.rowCount);
      if (wasApplied) {
        await executor.query(
          `
            UPDATE balances
            SET
              available = available + $2,
              total_earned = total_earned + $2,
              this_month = this_month + $2,
              updated_at = NOW()
            WHERE user_id = $1
          `,
          [beneficiaryUserId, commissionAmount.toFixed(2)],
        );
      }

      applied.push({
        beneficiaryUserId,
        level,
        ratePercent,
        commissionAmount,
        applied: wasApplied,
      });
    }

    currentUserId = beneficiaryUserId;
  }

  return applied;
}

async function getReferralRates(executor: ReferralCommissionExecutor) {
  const result = await executor.query<SettingRow>(
    `
      SELECT key, value
      FROM platform_settings
      WHERE key IN (
        'referral_level_1_percent',
        'referral_level_2_percent',
        'referral_level_3_percent'
      )
    `,
  );

  const settings = Object.fromEntries(result.rows.map((row) => [row.key, Number(row.value)]));

  return {
    1: Number.isFinite(settings.referral_level_1_percent) ? settings.referral_level_1_percent : 10,
    2: Number.isFinite(settings.referral_level_2_percent) ? settings.referral_level_2_percent : 5,
    3: Number.isFinite(settings.referral_level_3_percent) ? settings.referral_level_3_percent : 2,
  };
}
