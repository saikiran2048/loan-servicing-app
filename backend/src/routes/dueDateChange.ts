import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { requireLogin } from '../middleware/auth';
import { getConfig } from '../services/configService';
import { sendDueDateChangeConfirmationEmail } from '../email/sendEmail';

const router = Router();

interface DueDateChangeBody {
  newDueDate?: string; // ISO date string, e.g. "2026-08-01"
}

/**
 * POST /api/due-date-change
 * Per REQUIREMENTS.md §6:
 * - forward only
 * - max shift: max_due_date_shift_days from config (default 10)
 * - lifetime cap: max_due_date_changes_lifetime from config (default 2)
 */
router.post('/', requireLogin, async (req: Request<{}, {}, DueDateChangeBody>, res: Response) => {
  const { accountId } = req.auth!;
  const { newDueDate } = req.body;

  if (!newDueDate || Number.isNaN(Date.parse(newDueDate))) {
    return res.status(400).json({ error: 'Please select a valid date.' });
  }

  const config = await getConfig();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const accountResult = await client.query(
      `SELECT account_number, customer_name, customer_email, current_due_date, due_date_changes_used
       FROM accounts WHERE id = $1 FOR UPDATE`,
      [accountId]
    );

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found.' });
    }

    const account = accountResult.rows[0];

    if (account.due_date_changes_used >= config.max_due_date_changes_lifetime) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'You have used both of your available due date changes for this account.',
      });
    }

    const currentDueDate = new Date(account.current_due_date);
    const requestedDate = new Date(newDueDate);

    // Compare by date only, consistent with billingService's date handling.
    const currentDateOnly = new Date(
      currentDueDate.getFullYear(),
      currentDueDate.getMonth(),
      currentDueDate.getDate()
    );
    const requestedDateOnly = new Date(
      requestedDate.getFullYear(),
      requestedDate.getMonth(),
      requestedDate.getDate()
    );

    if (requestedDateOnly.getTime() <= currentDateOnly.getTime()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'New due date must be after the current due date.' });
    }

    const diffDays = Math.round(
      (requestedDateOnly.getTime() - currentDateOnly.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > config.max_due_date_shift_days) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `New due date cannot be more than ${config.max_due_date_shift_days} days from the current due date.`,
      });
    }

    const newChangesUsed = account.due_date_changes_used + 1;

    await client.query(
      `UPDATE accounts SET current_due_date = $1, due_date_changes_used = $2, updated_at = now()
       WHERE id = $3`,
      [newDueDate, newChangesUsed, accountId]
    );

    await client.query('COMMIT');

    if (account.customer_email) {
      try {
        await sendDueDateChangeConfirmationEmail({
          to: account.customer_email,
          customerName: account.customer_name,
          accountNumber: account.account_number,
          previousDueDate: currentDueDate,
          newDueDate: requestedDate,
          changesRemaining: Math.max(0, config.max_due_date_changes_lifetime - newChangesUsed),
        });
      } catch (err) {
        // DDC already succeeded and committed — a failed confirmation
        // email shouldn't fail the response. Log and move on.
        // eslint-disable-next-line no-console
        console.error('Failed to send due date change confirmation email:', err);
      }
    }

    return res.status(200).json({
      newDueDate,
      changesUsed: newChangesUsed,
      changesRemaining: Math.max(0, config.max_due_date_changes_lifetime - newChangesUsed),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default router;
