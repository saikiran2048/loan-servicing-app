import { pool } from '../db/pool';
import { getConfig } from '../services/configService';
import { generateOtp } from '../utils/validation';
import { signLoginToken } from '../utils/jwt';
import { sendOtpEmail, sendRegistrationConfirmationEmail } from '../email/sendEmail';

interface OtpRow {
  id: number;
  account_id: number;
  code: string;
  expires_at: Date;
  resend_count: number;
  locked_until: Date | null;
  used: boolean;
}

async function getOtpRow(otpId: number, accountId: number): Promise<OtpRow | null> {
  const result = await pool.query<OtpRow>(
    `SELECT id, account_id, code, expires_at, resend_count, locked_until, used
     FROM otp_codes WHERE id = $1 AND account_id = $2`,
    [otpId, accountId]
  );
  return result.rows[0] ?? null;
}

/**
 * POST /api/registration/verify-otp logic.
 *
 * Per REQUIREMENTS.md §2 Step 3: a wrong code gets "Invalid OTP. Please
 * try again." while an expired code gets its own distinct "This code has
 * expired." message with a resend option. The thing NOT revealed is any
 * other distinction (e.g. wrong vs. already-used) — those all collapse to
 * the generic "Invalid OTP" message. Expiry is checked first since it's
 * the one case requiring different client behavior (show resend).
 * Always checked against the DB row, never trusting client-supplied state.
 */
export async function verifyOtp(accountId: number, otpId: number, submittedCode: string) {
  const otpRow = await getOtpRow(otpId, accountId);

  if (!otpRow || otpRow.used) {
    return { status: 400 as const, body: { error: 'Invalid OTP. Please try again.' } };
  }

  if (otpRow.locked_until && otpRow.locked_until.getTime() > Date.now()) {
    return {
      status: 429 as const,
      body: { error: 'Too many attempts. Please try again in 15 minutes.' },
    };
  }

  if (otpRow.expires_at.getTime() < Date.now()) {
    return { status: 400 as const, body: { error: 'This code has expired.', expired: true } };
  }

  if (otpRow.code !== submittedCode) {
    return { status: 400 as const, body: { error: 'Invalid OTP. Please try again.' } };
  }

  // Mark used, then promote pending_email/pending_password_hash into a real
  // customer record. Done in a transaction so a crash mid-way can't leave
  // an OTP marked used without a customer actually being created.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`UPDATE otp_codes SET used = true WHERE id = $1`, [otpRow.id]);

    const accountResult = await client.query(
      `SELECT account_number, customer_name, pending_email, pending_password_hash
       FROM accounts WHERE id = $1 FOR UPDATE`,
      [accountId]
    );
    const account = accountResult.rows[0];

    if (!account || !account.pending_email || !account.pending_password_hash) {
      await client.query('ROLLBACK');
      return {
        status: 400 as const,
        body: { error: 'Invalid registration session. Please start again.' },
      };
    }

    await client.query(
      `UPDATE accounts SET customer_email = $1, pending_email = NULL, pending_password_hash = NULL, updated_at = now()
       WHERE id = $2`,
      [account.pending_email, accountId]
    );

    const customerResult = await client.query(
      `INSERT INTO customers (account_id, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [accountId, account.pending_email, account.pending_password_hash]
    );
    const customerId = customerResult.rows[0].id;

    await client.query('COMMIT');

    // Registration itself has already succeeded at this point (customer
    // record committed). A failure to send the welcome email shouldn't
    // undo that or hang the response — log it and move on. This is
    // intentionally different from the OTP email (Step 2), which IS
    // essential to completing registration and must fail the request.
    try {
      await sendRegistrationConfirmationEmail(account.pending_email, account.customer_name, account.account_number);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to send registration confirmation email:', err);
    }

    const loginToken = signLoginToken(customerId, accountId);
    return { status: 200 as const, body: { loginToken } };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * POST /api/registration/resend-otp logic.
 * Enforces max resends + server-side lockout (REQUIREMENTS.md §2 Step 3).
 */
export async function resendOtp(accountId: number, otpId: number) {
  const otpRow = await getOtpRow(otpId, accountId);

  if (!otpRow || otpRow.used) {
    return { status: 400 as const, body: { error: 'Invalid registration session. Please start again.' } };
  }

  if (otpRow.locked_until && otpRow.locked_until.getTime() > Date.now()) {
    return {
      status: 429 as const,
      body: { error: 'Too many attempts. Please try again in 15 minutes.' },
    };
  }

  const config = await getConfig();

  if (otpRow.resend_count >= config.otp_max_resends) {
    const lockedUntil = new Date(Date.now() + config.otp_lockout_minutes * 60 * 1000);
    await pool.query(`UPDATE otp_codes SET locked_until = $1 WHERE id = $2`, [lockedUntil, otpRow.id]);
    return {
      status: 429 as const,
      body: { error: 'Too many attempts. Please try again in 15 minutes.' },
    };
  }

  const accountResult = await pool.query(
    `SELECT pending_email FROM accounts WHERE id = $1`,
    [accountId]
  );
  const pendingEmail = accountResult.rows[0]?.pending_email;
  if (!pendingEmail) {
    return { status: 400 as const, body: { error: 'Invalid registration session. Please start again.' } };
  }

  const newOtp = generateOtp();
  const newExpiresAt = new Date(Date.now() + config.otp_expiry_minutes * 60 * 1000);

  // Send before persisting, same rationale as Step 2's initial OTP send:
  // a failed send shouldn't burn one of the limited resend attempts or
  // reset the expiry timer for a code the customer never received.
  try {
    await sendOtpEmail(pendingEmail, newOtp, config.otp_expiry_minutes);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to send resend OTP email:', err);
    return {
      status: 502 as const,
      body: { error: 'We could not send your verification code. Please try again shortly.' },
    };
  }

  await pool.query(
    `UPDATE otp_codes
     SET code = $1, expires_at = $2, resend_count = resend_count + 1, used = false
     WHERE id = $3`,
    [newOtp, newExpiresAt, otpRow.id]
  );

  return { status: 200 as const, body: { message: 'A new code has been sent.' } };
}
