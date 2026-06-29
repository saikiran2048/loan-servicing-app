import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';
import { getConfig } from '../services/configService';
import { isValidEmailFormat, validatePassword, generateOtp } from '../utils/validation';
import { signRegistrationOtpToken } from '../utils/jwt';
import { sendOtpEmail } from '../email/sendEmail';

export interface AccountSetupBody {
  email?: string;
  confirmEmail?: string;
  password?: string;
  confirmPassword?: string;
  disclaimerAccepted?: boolean;
}

const BCRYPT_COST_FACTOR = 10;

/**
 * Handles registration Step 2 (account setup) + kicks off Step 3 (OTP send).
 * Called from the /api/registration/setup route, which is protected by
 * requireRegistrationSetupToken middleware — req.registrationSetup.accountId
 * tells us which account this setup attempt is for.
 */
export async function handleAccountSetup(accountId: number, body: AccountSetupBody) {
  const { email, confirmEmail, password, confirmPassword, disclaimerAccepted } = body;

  if (!email || !confirmEmail || !password || !confirmPassword) {
    return { status: 400 as const, body: { error: 'All fields are required.' } };
  }

  if (!disclaimerAccepted) {
    return { status: 400 as const, body: { error: 'You must accept the disclaimer to continue.' } };
  }

  if (!isValidEmailFormat(email)) {
    return { status: 400 as const, body: { error: 'Please enter a valid email address.' } };
  }

  if (email !== confirmEmail) {
    return { status: 400 as const, body: { error: 'Email and Confirm Email must match.' } };
  }

  if (password !== confirmPassword) {
    return { status: 400 as const, body: { error: 'Password and Confirm Password must match.' } };
  }

  // Fetch account details needed for the password substring check and to
  // confirm the account is still eligible (defensive — Step 1 already
  // checked this, but the JWT could be replayed after account state changed).
  const accountResult = await pool.query(
    `SELECT account_number, customer_name, account_type, customer_email
     FROM accounts WHERE id = $1`,
    [accountId]
  );

  if (accountResult.rows.length === 0) {
    return { status: 400 as const, body: { error: 'Invalid registration session. Please start again.' } };
  }

  const account = accountResult.rows[0];

  if (account.account_type !== 'active' || account.customer_email) {
    return { status: 400 as const, body: { error: 'Invalid registration session. Please start again.' } };
  }

  const passwordCheck = validatePassword(password, account.account_number, account.customer_name);
  if (!passwordCheck.valid) {
    return { status: 400 as const, body: { error: passwordCheck.errors[0], errors: passwordCheck.errors } };
  }

  // Email uniqueness across all accounts (REQUIREMENTS.md §2 Step 2).
  const emailTakenResult = await pool.query(
    `SELECT 1 FROM accounts WHERE customer_email = $1
     UNION ALL
     SELECT 1 FROM customers WHERE email = $1`,
    [email]
  );
  if (emailTakenResult.rows.length > 0) {
    return { status: 409 as const, body: { error: 'This email is already registered to another account.' } };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);
  const config = await getConfig();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + config.otp_expiry_minutes * 60 * 1000);

  // Send the email BEFORE writing any DB state. If sending fails, we want
  // to fail the request cleanly with no side effects — no orphaned OTP row,
  // no stale pending_email/pending_password_hash sitting on the account —
  // rather than persisting state for an OTP the customer never received.
  try {
    await sendOtpEmail(email, otp, config.otp_expiry_minutes);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to send OTP email:', err);
    return {
      status: 502 as const,
      body: { error: 'We could not send your verification code. Please try again shortly.' },
    };
  }

  // Pending email/password are staged on the account row (pending_email,
  // pending_password_hash — see schema/004_pending_registration.sql) rather
  // than committed to customer_email/customers yet. They only become
  // permanent once OTP verification succeeds in Step 3. This keeps
  // accounts.customer_email's meaning unambiguous: NULL = not registered,
  // NOT NULL = registered, full stop.
  const otpResult = await pool.query(
    `INSERT INTO otp_codes (account_id, code, expires_at, resend_count, used)
     VALUES ($1, $2, $3, 0, false)
     RETURNING id`,
    [accountId, otp, expiresAt]
  );
  const otpId = otpResult.rows[0].id;

  await pool.query(
    `UPDATE accounts SET pending_email = $1, pending_password_hash = $2, updated_at = now()
     WHERE id = $3`,
    [email, passwordHash, accountId]
  );

  const token = signRegistrationOtpToken(accountId, otpId);
  return { status: 200 as const, body: { registrationToken: token } };
}
