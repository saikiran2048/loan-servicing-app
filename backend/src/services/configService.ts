import { pool } from '../db/pool';

export interface ConfigValues {
  late_fee_percent: number;
  max_due_date_shift_days: number;
  max_due_date_changes_lifetime: number;
  otp_expiry_minutes: number;
  otp_max_resends: number;
  otp_lockout_minutes: number;
}

const CONFIG_KEYS: (keyof ConfigValues)[] = [
  'late_fee_percent',
  'max_due_date_shift_days',
  'max_due_date_changes_lifetime',
  'otp_expiry_minutes',
  'otp_max_resends',
  'otp_lockout_minutes',
];

/**
 * Reads all business-rule values fresh from the `config` table on every call.
 * Deliberately NOT cached in memory — this project's whole point is that
 * config changes in the DB take effect immediately without a redeploy,
 * which is exactly what a test would want to verify.
 */
export async function getConfig(): Promise<ConfigValues> {
  const result = await pool.query<{ key: string; value: string }>(
    'SELECT key, value FROM config WHERE key = ANY($1)',
    [CONFIG_KEYS]
  );

  const map = new Map(result.rows.map((row) => [row.key, row.value]));

  const missing = CONFIG_KEYS.filter((key) => !map.has(key));
  if (missing.length > 0) {
    throw new Error(`Missing config keys in DB: ${missing.join(', ')}`);
  }

  return {
    late_fee_percent: Number(map.get('late_fee_percent')),
    max_due_date_shift_days: Number(map.get('max_due_date_shift_days')),
    max_due_date_changes_lifetime: Number(map.get('max_due_date_changes_lifetime')),
    otp_expiry_minutes: Number(map.get('otp_expiry_minutes')),
    otp_max_resends: Number(map.get('otp_max_resends')),
    otp_lockout_minutes: Number(map.get('otp_lockout_minutes')),
  };
}
