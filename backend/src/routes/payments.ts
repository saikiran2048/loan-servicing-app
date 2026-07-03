import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireLogin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/payments
 * Stage 4 addition — lists payment history for the logged-in account,
 * powering the redesigned dashboard's history table. Read-only; scoping
 * to the caller's own account comes for free via requireLogin's accountId,
 * same as every other route here.
 *
 * NOTE: assumes `payments.paid_at` exists (default now()), matching the
 * payments ledger timestamp. If your payments table uses a different
 * timestamp column name, swap it in the SELECT/ORDER BY below.
 */
router.get('/', requireLogin, async (req: Request, res: Response) => {
  const { accountId } = req.auth!;

  const result = await pool.query(
    `SELECT amount, method, paid_at
     FROM payments
     WHERE account_id = $1
     ORDER BY paid_at DESC
     LIMIT 50`,
    [accountId]
  );

  return res.status(200).json({
    payments: result.rows.map((row) => ({
      date: row.paid_at,
      method: row.method,
      amount: Number(row.amount),
    })),
  });
});

export default router;