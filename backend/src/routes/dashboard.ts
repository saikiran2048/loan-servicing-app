import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireLogin } from '../middleware/auth';
import { getConfig } from '../services/configService';
import { calculateAmountDue } from '../services/billingService';
import { maybeProcessAutopayCharge } from '../services/autopayService';
import { sendPaymentConfirmationEmail } from '../email/sendEmail';

const router = Router();

/**
 * GET /api/dashboard
 * Per REQUIREMENTS.md §4, plus Stage 4 UI redesign additions: vehicle
 * detail (VIN/color), phone, member-since, APR, autopay state, and the
 * simulated autopay auto-charge check (services/autopayService.ts).
 * Requires login JWT.
 */
router.get('/', requireLogin, async (req: Request, res: Response) => {
  const { accountId } = req.auth!;
  const config = await getConfig();

  const client = await pool.connect();
  let account: any;
  let autopayResult;
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT a.id, a.account_number, a.customer_name, a.vehicle_make, a.vehicle_model,
              a.vehicle_year, a.ownership_type, a.address, a.total_amount, a.tenure_months,
              a.installment_amount, a.installments_paid, a.current_due_date,
              a.due_date_changes_used, a.customer_email,
              a.vin, a.vehicle_color, a.phone, a.apr, a.autopay_enabled,
              c.registered_at AS member_since
       FROM accounts a
       LEFT JOIN customers c ON c.account_id = a.id
       WHERE a.id = $1
       FOR UPDATE OF a`,
      [accountId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found.' });
    }

    account = result.rows[0];

    // Locked FOR UPDATE above, so this can safely write within the same
    // transaction without a second round-trip lock.
    autopayResult = await maybeProcessAutopayCharge(client, account, config);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Autopay charge already committed above — a failed confirmation email
  // shouldn't affect the response, same non-blocking pattern as the
  // user-initiated payment/DDC flows.
  if (autopayResult.charged && account.customer_email) {
    const remainingAfterCharge = Math.max(
      0,
      Math.round(
        (Number(account.total_amount) -
          autopayResult.newInstallmentsPaid! * Number(account.installment_amount)) *
          100
      ) / 100
    );
    sendPaymentConfirmationEmail({
      to: account.customer_email,
      customerName: account.customer_name,
      accountNumber: account.account_number,
      amount: autopayResult.appliedAmount!,
      paymentDate: new Date(),
      method: 'autopay',
      balanceRemaining: remainingAfterCharge,
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to send autopay payment confirmation email:', err);
    });
  }

  // Reflect the post-autopay state in this response, rather than the
  // pre-charge values that were true at the start of the request.
  const effectiveDueDate = autopayResult.charged
    ? autopayResult.newDueDate!
    : new Date(account.current_due_date);
  const effectiveInstallmentsPaid = autopayResult.charged
    ? autopayResult.newInstallmentsPaid!
    : account.installments_paid;

  const { isDelinquent, amountDue } = calculateAmountDue(
    Number(account.installment_amount),
    effectiveDueDate,
    config
  );

  // Remaining balance is derived from the payments ledger (SUM), same
  // "ledger is authoritative, not installments_paid * installment_amount"
  // principle used in payment.ts / autopayService.ts. Read after COMMIT —
  // no lock needed for a display-only figure.
  const paidResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE account_id = $1`,
    [accountId]
  );
  const totalPaid = Number(paidResult.rows[0].total_paid);
  const remainingBalance = Math.max(
    0,
    Math.round((Number(account.total_amount) - totalPaid) * 100) / 100
  );

  return res.status(200).json({
    accountSummary: {
      customerName: account.customer_name,
      accountNumber: account.account_number,
      vehicle: {
        make: account.vehicle_make,
        model: account.vehicle_model,
        year: account.vehicle_year,
        vin: account.vin,
        color: account.vehicle_color,
      },
      ownershipType: account.ownership_type,
      address: account.address,
      phone: account.phone,
      memberSince: account.member_since,
    },
    paymentProgress: {
      installmentsPaid: effectiveInstallmentsPaid,
      totalInstallments: account.tenure_months,
    },
    amountDue: {
      isDelinquent,
      amount: amountDue,
      currentDueDate: effectiveDueDate,
    },
    dueDateChangesUsed: account.due_date_changes_used,
    dueDateChangesRemaining: Math.max(
      0,
      config.max_due_date_changes_lifetime - account.due_date_changes_used
    ),
    apr: account.apr !== null ? Number(account.apr) : null,
    autopayEnabled: account.autopay_enabled,
    installmentAmount: Number(account.installment_amount),
    totalAmount: Number(account.total_amount),
    remainingBalance,
    // Exposed mainly so tests can assert directly on "did autopay fire this
    // call" without inferring it from a due-date diff.
    autopayCharged: autopayResult.charged,
  });
});

/**
 * PATCH /api/dashboard/autopay
 * Stage 4 addition. Toggles autopay_enabled only — no charge happens here.
 * The actual charge is evaluated lazily on the next GET /dashboard call
 * once the account is past due (see services/autopayService.ts).
 */
router.patch(
  '/autopay',
  requireLogin,
  async (req: Request<{}, {}, { enabled?: boolean }>, res: Response) => {
    const { accountId } = req.auth!;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: '`enabled` must be true or false.' });
    }

    const result = await pool.query(
      `UPDATE accounts SET autopay_enabled = $1, updated_at = now()
       WHERE id = $2 RETURNING autopay_enabled`,
      [enabled, accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    return res.status(200).json({ autopayEnabled: result.rows[0].autopay_enabled });
  }
);

export default router;