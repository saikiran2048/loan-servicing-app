import { PoolClient } from 'pg';
import { ConfigValues } from './configService';
import { calculateAmountDue } from './billingService';

export interface AutopayAccountRow {
  id: string;
  total_amount: string | number;
  installment_amount: string | number;
  installments_paid: number;
  tenure_months: number;
  current_due_date: string | Date;
  autopay_enabled: boolean;
}

export interface AutopayResult {
  charged: boolean;
  appliedAmount?: number;
  newDueDate?: Date;
  newInstallmentsPaid?: number;
}

/**
 * Simulated autopay auto-charge (Stage 4 UI redesign).
 *
 * Render's free tier has no reliable background scheduler, so instead of a
 * real cron job, this runs inline on every GET /dashboard call:
 *   - No-op unless autopay_enabled AND the account is currently past due
 *   - Charges the same delinquent amount a manual payment would show
 *     (installment + late fee), capped at the remaining balance
 *   - Advances current_due_date by one billing cycle (monthly, matching
 *     the seed data's installment cadence)
 *
 * Idempotency guard: advancing current_due_date IS the guard. Once
 * advanced, the account is no longer past due, so a second GET /dashboard
 * call in the same cycle will find isDelinquent === false and no-op. This
 * is deliberate — no separate "already charged today" flag is needed, and
 * it's directly testable: hit /dashboard twice in a row, assert only one
 * payment row was created.
 *
 * Must be called inside an already-open transaction, with `account`
 * already SELECTed ... FOR UPDATE by the caller (same lock pattern as
 * payment.ts / dueDateChange.ts) so a concurrent request can't double-charge.
 */
export async function maybeProcessAutopayCharge(
  client: PoolClient,
  account: AutopayAccountRow,
  config: Pick<ConfigValues, 'late_fee_percent'>
): Promise<AutopayResult> {
  if (!account.autopay_enabled) {
    return { charged: false };
  }

  const { isDelinquent, amountDue } = calculateAmountDue(
    Number(account.installment_amount),
    new Date(account.current_due_date),
    config
  );

  if (!isDelinquent) {
    return { charged: false };
  }

  const paidSoFarResult = await client.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE account_id = $1`,
    [account.id]
  );
  const totalPaidSoFar = Number(paidSoFarResult.rows[0].total_paid);
  const remainingBalance = Number(account.total_amount) - totalPaidSoFar;

  if (remainingBalance <= 0) {
    // Already paid off — nothing to charge, and don't advance the due
    // date on a loan that's already complete.
    return { charged: false };
  }

  const appliedAmount = Math.min(amountDue, Math.round(remainingBalance * 100) / 100);

  await client.query(
    `INSERT INTO payments (account_id, amount, method) VALUES ($1, $2, 'autopay')`,
    [account.id, appliedAmount]
  );

  // Same whole-installment counter logic as payment.ts — installments_paid
  // stays an integer, derived from cumulative payments, not incremented by 1.
  const newTotalPaid = totalPaidSoFar + appliedAmount;
  const newInstallmentsPaid = Math.min(
    account.tenure_months,
    Math.floor(newTotalPaid / Number(account.installment_amount))
  );

  const updateResult = await client.query(
    `UPDATE accounts
     SET installments_paid = $1,
         current_due_date = current_due_date + INTERVAL '1 month',
         updated_at = now()
     WHERE id = $2
     RETURNING current_due_date`,
    [newInstallmentsPaid, account.id]
  );

  return {
    charged: true,
    appliedAmount,
    newDueDate: new Date(updateResult.rows[0].current_due_date),
    newInstallmentsPaid,
  };
}