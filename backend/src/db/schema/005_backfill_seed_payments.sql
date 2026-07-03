-- 005_backfill_seed_payments.sql
-- Backfills payments rows for seeded accounts so the payments ledger
-- (the source of truth for remaining balance, per backend/src/routes/payment.ts)
-- agrees with the installments_paid counter set directly in 003_seed_accounts.sql.
--
-- Without this, a real payment against a seeded account would compute
-- remaining balance from an empty ledger (SUM = 0) and ignore the seeded
-- progress entirely — silently wrong numbers.
--
-- One synthetic lump-sum payment row per account is sufficient: the
-- payment route only ever needs SUM(amount), not a realistic payment
-- history. bank_account_number/bank_last_4 are placeholder values clearly
-- marked as backfill, not real submitted payment data.

INSERT INTO payments (account_id, amount, method, bank_account_number, bank_last_4, paid_at)
SELECT
    id,
    ROUND(installment_amount * installments_paid, 2),
    'seed',
    '0000000000SEEDBACKFILL',
    '0000',
    created_at
FROM accounts
WHERE installments_paid > 0;
