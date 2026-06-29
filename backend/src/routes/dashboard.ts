import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireLogin } from '../middleware/auth';
import { getConfig } from '../services/configService';
import { calculateAmountDue } from '../services/billingService';

const router = Router();

/**
 * GET /api/dashboard
 * Per REQUIREMENTS.md §4 — account summary, payment progress, amount due
 * header, due date. Requires login JWT.
 */
router.get('/', requireLogin, async (req: Request, res: Response) => {
  const { accountId } = req.auth!;

  const result = await pool.query(
    `SELECT account_number, customer_name, vehicle_make, vehicle_model, vehicle_year,
            ownership_type, address, total_amount, tenure_months, installment_amount,
            installments_paid, current_due_date, due_date_changes_used
     FROM accounts WHERE id = $1`,
    [accountId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  const account = result.rows[0];
  const config = await getConfig();

  const { isDelinquent, amountDue } = calculateAmountDue(
    Number(account.installment_amount),
    new Date(account.current_due_date),
    config
  );

  return res.status(200).json({
    accountSummary: {
      customerName: account.customer_name,
      accountNumber: account.account_number,
      vehicle: {
        make: account.vehicle_make,
        model: account.vehicle_model,
        year: account.vehicle_year,
      },
      ownershipType: account.ownership_type,
      address: account.address,
    },
    paymentProgress: {
      installmentsPaid: account.installments_paid,
      totalInstallments: account.tenure_months,
    },
    amountDue: {
      isDelinquent,
      amount: amountDue,
      currentDueDate: account.current_due_date,
    },
    dueDateChangesUsed: account.due_date_changes_used,
    dueDateChangesRemaining: Math.max(
      0,
      config.max_due_date_changes_lifetime - account.due_date_changes_used
    ),
  });
});

export default router;
