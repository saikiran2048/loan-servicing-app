import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { signRegistrationSetupToken } from '../utils/jwt';
import { requireRegistrationSetupToken, requireRegistrationOtpToken } from '../middleware/auth';
import { handleAccountSetup, AccountSetupBody } from './registrationSetup';
import { verifyOtp, resendOtp } from './registrationOtp';

const router = Router();

const GENERIC_VERIFY_ERROR = "We couldn't verify your information.";
const ALREADY_REGISTERED_ERROR =
  'This account is already registered. Please log in or use Forgot Password.';

interface IdentityVerifyBody {
  accountNumber?: string;
  last4Ssn?: string;
}

/**
 * POST /api/registration/verify-identity
 * Step 1 of registration (REQUIREMENTS.md §2 Step 1).
 *
 * Security note: returns the SAME generic error regardless of whether the
 * account doesn't exist, the SSN doesn't match, or the account type isn't
 * 'active' — this prevents account enumeration (REQUIREMENTS.md §2.5).
 * The only distinct error is "already registered", which is intentionally
 * NOT folded into the generic error since the requirements call for a
 * specific, actionable message there.
 */
router.post('/verify-identity', async (req: Request<{}, {}, IdentityVerifyBody>, res: Response) => {
  const { accountNumber, last4Ssn } = req.body;

  if (!accountNumber || !last4Ssn) {
    return res.status(400).json({ error: 'Account number and last 4 of SSN are required.' });
  }

  const result = await pool.query(
    `SELECT id, account_type, last_4_ssn, customer_email
     FROM accounts
     WHERE account_number = $1`,
    [accountNumber]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ error: GENERIC_VERIFY_ERROR });
  }

  const account = result.rows[0];

  if (account.account_type !== 'active') {
    return res.status(400).json({ error: GENERIC_VERIFY_ERROR });
  }

  if (account.last_4_ssn !== last4Ssn) {
    return res.status(400).json({ error: GENERIC_VERIFY_ERROR });
  }

  if (account.customer_email) {
    return res.status(409).json({ error: ALREADY_REGISTERED_ERROR });
  }

  const token = signRegistrationSetupToken(account.id);
  return res.status(200).json({ registrationToken: token });
});

/**
 * POST /api/registration/setup
 * Step 2 of registration — requires the JWT issued by /verify-identity.
 */
router.post(
  '/setup',
  requireRegistrationSetupToken,
  async (req: Request<{}, {}, AccountSetupBody>, res: Response) => {
    const accountId = req.registrationSetup!.accountId;
    const result = await handleAccountSetup(accountId, req.body);
    return res.status(result.status).json(result.body);
  }
);

interface VerifyOtpBody {
  code?: string;
}

/**
 * POST /api/registration/verify-otp
 * Step 3 of registration — requires the JWT issued by /setup.
 */
router.post(
  '/verify-otp',
  requireRegistrationOtpToken,
  async (req: Request<{}, {}, VerifyOtpBody>, res: Response) => {
    const { accountId, otpId } = req.registrationOtp!;
    const { code } = req.body;

    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit code.' });
    }

    const result = await verifyOtp(accountId, otpId, code);
    return res.status(result.status).json(result.body);
  }
);

/**
 * POST /api/registration/resend-otp
 * Step 3 resend — requires the same OTP-stage JWT.
 */
router.post('/resend-otp', requireRegistrationOtpToken, async (req: Request, res: Response) => {
  const { accountId, otpId } = req.registrationOtp!;
  const result = await resendOtp(accountId, otpId);
  return res.status(result.status).json(result.body);
});

export default router;
