import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireLogin } from '../middleware/auth';
import { sendPaymentConfirmationEmail } from '../email/sendEmail';

const router = Router();

interface PaymentBody {
  amount?: number;
  bankAccountNumber?: string;
  bankLast4?: string;
}

const BANK_ACCOUNT_REGEX = /^\d{4,17}$/;
const BANK_LAST4_REGEX = /^\d{4}$/;

/**
 * POST /api/payment
 * Per REQUIREMENTS.md §5:
 * - amount must be > 0
 * - overpayment capped at remaining balance (adjusted down, not rejected)
 * - due date is unaffected by payment
 * - triggers Payment Confirmation email
 */
router.post('/', requireLogin, async (req: Request<{}, {}, PaymentBody>, res: Response) => {
  const { accountId } = req.auth!;
  const { amount, bankAccountNumber, bankLast4 } = req.body;

  if (amount === undefined || amount === null || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than 0.' });
  }

  if (!bankAccountNumber || !BANK_ACCOUNT_REGEX.test(bankAccountNumber)) {
    return res.status(400).json({ error: 'Please enter a valid bank account number.' });
  }

  if (!bankLast4 || !BANK_LAST4_REGEX.test(bankLast4)) {
    return res.status(400).json({ error: 'Please enter a valid 4-digit bank account suffix.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const accountResult = await client.query(
      `SELECT account_number, customer_name, customer_email, total_amount,
              installment_amount, installments_paid, tenure_months
       FROM accounts WHERE id = $1 FOR UPDATE`,
      [accountId]
    );

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found.' });
    }

    const account = accountResult.rows[0];

    // Total paid-to-date is the authoritative SUM of the payments ledger,
    // not installments_paid * installment_amount — the latter is only a
    // whole-installment counter for the progress bar (REQUIREMENTS.md §4.2)
    // and would silently misstate the balance for any partial/odd payment.
    const paidSoFarResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE account_id = $1`,
      [accountId]
    );
    const totalPaidSoFar = Number(paidSoFarResult.rows[0].total_paid);
    const remainingBalance = Number(account.total_amount) - totalPaidSoFar;

    let appliedAmount = Number(amount);
    let adjustedMessage: string | null = null;

    if (appliedAmount > remainingBalance) {
      appliedAmount = Math.round(remainingBalance * 100) / 100;
      adjustedMessage = `Amount adjusted to remaining balance of $${appliedAmount.toFixed(2)}.`;
    }

    await client.query(
      `INSERT INTO payments (account_id, amount, bank_account_number, bank_last_4)
       VALUES ($1, $2, $3, $4)`,
      [accountId, appliedAmount, bankAccountNumber, bankLast4]
    );

    // installments_paid (REQUIREMENTS.md §4.2 progress bar) increments by
    // the number of WHOLE installments now covered by cumulative payments —
    // it stays an integer counter, never a fractional one, regardless of
    // how a given payment splits against the installment amount.
    const newTotalPaid = totalPaidSoFar + appliedAmount;
    const newInstallmentsPaid = Math.min(
      account.tenure_months,
      Math.floor(newTotalPaid / Number(account.installment_amount))
    );

    await client.query(
      `UPDATE accounts SET installments_paid = $1, updated_at = now() WHERE id = $2`,
      [newInstallmentsPaid, accountId]
    );

    await client.query('COMMIT');

    const newRemainingBalance = Math.max(
      0,
      Math.round((remainingBalance - appliedAmount) * 100) / 100
    );

    if (account.customer_email) {
      try {
        await sendPaymentConfirmationEmail({
          to: account.customer_email,
          customerName: account.customer_name,
          accountNumber: account.account_number,
          amount: appliedAmount,
          paymentDate: new Date(),
          bankLast4,
          balanceRemaining: newRemainingBalance,
        });
      } catch (err) {
        // Payment already succeeded and committed — a failed confirmation
        // email shouldn't fail the response. Log and move on.
        // eslint-disable-next-line no-console
        console.error('Failed to send payment confirmation email:', err);
      }
    }

    return res.status(200).json({
      appliedAmount,
      adjustedMessage,
      balanceRemaining: newRemainingBalance,
      installmentsPaid: newInstallmentsPaid,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default router;
