import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';
import { signLoginToken } from '../utils/jwt';

const router = Router();

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

interface LoginBody {
  email?: string;
  password?: string;
}

/**
 * POST /api/auth/login
 * Minimal stub per REQUIREMENTS.md §3 — generic error on failure (no
 * enumeration), success returns a login JWT. "Forgot Password" is out of
 * scope for this build.
 */
router.post('/login', async (req: Request<{}, {}, LoginBody>, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: GENERIC_LOGIN_ERROR });
  }

  const result = await pool.query(
    `SELECT id, account_id, password_hash FROM customers WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
  }

  const customer = result.rows[0];
  const passwordMatches = await bcrypt.compare(password, customer.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
  }

  const token = signLoginToken(customer.id, customer.account_id);
  return res.status(200).json({ loginToken: token });
});

export default router;
