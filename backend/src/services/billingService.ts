import { ConfigValues } from './configService';

export interface AmountDueResult {
  isDelinquent: boolean;
  amountDue: number;
}

/**
 * Per REQUIREMENTS.md §4.3:
 * - current date <= due date: regular installment amount
 * - current date > due date: installment_amount * (1 + late_fee_percent / 100)
 *
 * late_fee_percent comes from the config table, never hardcoded, so this
 * function takes it as a parameter rather than importing a constant.
 */
export function calculateAmountDue(
  installmentAmount: number,
  currentDueDate: Date,
  config: Pick<ConfigValues, 'late_fee_percent'>,
  now: Date = new Date()
): AmountDueResult {
  // Compare by date only (ignore time-of-day) since due dates are DATE
  // columns, not timestamps — a payment made any time on the due date
  // itself should NOT be considered delinquent.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(currentDueDate.getFullYear(), currentDueDate.getMonth(), currentDueDate.getDate());

  const isDelinquent = today.getTime() > due.getTime();

  const amountDue = isDelinquent
    ? installmentAmount * (1 + config.late_fee_percent / 100)
    : installmentAmount;

  return { isDelinquent, amountDue: Math.round(amountDue * 100) / 100 };
}
