import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, tokenStore } from '../api/client';
import type { DashboardData, ApiError } from '../api/client';
import Spinner from '../components/Spinner';

type ActiveForm = 'none' | 'payment' | 'ddc';

function formatCurrency(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// Add N days to a date, return ISO date string (YYYY-MM-DD)
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const navigate = useNavigate();

  const [data,        setData]        = useState<DashboardData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [activeForm,  setActiveForm]  = useState<ActiveForm>('none');
  const [successMsg,  setSuccessMsg]  = useState('');

  // Payment form state
  const [payAmount,       setPayAmount]       = useState('');
  const [bankAcctNum,     setBankAcctNum]     = useState('');
  const [bankLast4,       setBankLast4]       = useState('');
  const [payLoading,      setPayLoading]      = useState(false);
  const [payError,        setPayError]        = useState('');

  // DDC form state
  const [newDueDate,   setNewDueDate]   = useState('');
  const [ddcLoading,   setDdcLoading]   = useState(false);
  const [ddcError,     setDdcError]     = useState('');

  // ---------------------------------------------------------------------------
  const loadDashboard = useCallback(async () => {
    const token = tokenStore.getLogin();
    if (!token) { navigate('/login'); return; }

    setLoading(true);
    setErrorMsg('');
    try {
      const result = await api.getDashboard(token);
      setData(result);
      // Pre-fill payment amount with current amount due
      setPayAmount(result.amountDue.amount.toFixed(2));
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.error?.toLowerCase().includes('session') ||
          apiErr.error?.toLowerCase().includes('authentication')) {
        tokenStore.clearLogin();
        navigate('/login');
      } else {
        setErrorMsg(apiErr.error ?? 'Failed to load account data.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ---------------------------------------------------------------------------
  function openForm(form: ActiveForm) {
    setActiveForm(form);
    setPayError('');
    setDdcError('');
    setSuccessMsg('');
    if (data) setPayAmount(data.amountDue.amount.toFixed(2));
    setNewDueDate('');
  }

  function closeForm() {
    setActiveForm('none');
    setPayError('');
    setDdcError('');
  }

  function handleLogout() {
    tokenStore.clearLogin();
    navigate('/login');
  }

  // ---------------------------------------------------------------------------
  // Payment submission
  // ---------------------------------------------------------------------------
  async function handlePayment() {
    if (!data) return;
    setPayLoading(true);
    setPayError('');
    try {
      const token = tokenStore.getLogin()!;
      const result = await api.makePayment(token, {
        amount: Number(payAmount),
        bankAccountNumber: bankAcctNum,
        bankLast4,
      });
      const msg = result.adjustedMessage
        ? `${result.adjustedMessage} Payment of ${formatCurrency(result.appliedAmount)} processed.`
        : `Payment of ${formatCurrency(result.appliedAmount)} processed successfully.`;
      setSuccessMsg(msg);
      closeForm();
      await loadDashboard();
    } catch (err) {
      setPayError((err as ApiError).error ?? 'Payment failed.');
    } finally {
      setPayLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // DDC submission
  // ---------------------------------------------------------------------------
  async function handleDdc() {
    if (!data) return;
    setDdcLoading(true);
    setDdcError('');
    try {
      const token = tokenStore.getLogin()!;
      const result = await api.changeDueDate(token, newDueDate);
      setSuccessMsg(
        `Due date updated to ${formatDate(result.newDueDate)}. ` +
        `${result.changesRemaining} change${result.changesRemaining !== 1 ? 's' : ''} remaining.`
      );
      closeForm();
      await loadDashboard();
    } catch (err) {
      setDdcError((err as ApiError).error ?? 'Could not update due date.');
    } finally {
      setDdcLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="page-center">
        <Spinner size={28} color="var(--accent)" />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="page-center">
        <div className="card">
          <div className="alert alert-error">{errorMsg || 'Could not load account.'}</div>
          <button className="btn btn-secondary" onClick={loadDashboard}>Retry</button>
        </div>
      </div>
    );
  }

  const { accountSummary: acct, paymentProgress: progress, amountDue, dueDateChangesRemaining } = data;
  const pct = Math.min(100, Math.round((progress.installmentsPaid / progress.totalInstallments) * 100));

  // DDC constraints for the date picker
  const minDate = addDays(amountDue.currentDueDate, 1);
  const maxDate = addDays(amountDue.currentDueDate, 10);

  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Header */}
      <header className="dashboard-header">
        <span className="brand">Loan Servicing Portal</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {acct.customerName}
          </span>
          <button className="logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="dashboard-body">

        {/* Success banner */}
        {successMsg && (
          <div className="alert alert-success">
            {successMsg}
            <button
              onClick={() => setSuccessMsg('')}
              style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
            >
              ×
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* AMOUNT DUE — signature element                                   */}
        {/* ================================================================ */}
        <div className={`amount-due-block ${amountDue.isDelinquent ? 'delinquent' : ''}`}>
          <div className="amount-due-label">
            {amountDue.isDelinquent ? '⚠ Overdue — late fee applied' : 'Amount due'}
          </div>
          <div className="amount-due-value">{formatCurrency(amountDue.amount)}</div>
          <div className="amount-due-meta">
            Due {formatDate(amountDue.currentDueDate)}
            {amountDue.isDelinquent && ' — payment past due'}
          </div>

          {activeForm === 'none' && (
            <div className="action-row" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={() => openForm('payment')}>
                Pay now
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => openForm('ddc')}
                disabled={dueDateChangesRemaining === 0}
                title={dueDateChangesRemaining === 0 ? 'No due date changes remaining' : undefined}
              >
                Change due date
                {dueDateChangesRemaining < 2 && dueDateChangesRemaining > 0
                  ? ` (${dueDateChangesRemaining} left)`
                  : dueDateChangesRemaining === 0
                  ? ' (none left)'
                  : ''}
              </button>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* PAYMENT FORM                                                     */}
        {/* ================================================================ */}
        {activeForm === 'payment' && (
          <div className="card" style={{ maxWidth: '100%' }}>
            <p className="page-title" style={{ fontSize: 17, marginBottom: 4 }}>Make a payment</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Overpayments are automatically capped at your remaining balance.
            </p>

            {payError && <div className="alert alert-error">{payError}</div>}

            <div className="field">
              <label htmlFor="payAmount">Amount</label>
              <input
                id="payAmount"
                type="number"
                min="0.01"
                step="0.01"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="bankAcctNum">Bank account number</label>
              <input
                id="bankAcctNum"
                type="text"
                inputMode="numeric"
                placeholder="Your bank account number"
                value={bankAcctNum}
                onChange={e => setBankAcctNum(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="field">
              <label htmlFor="bankLast4">Bank account last 4</label>
              <input
                id="bankLast4"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Last 4 digits"
                value={bankLast4}
                onChange={e => setBankLast4(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="action-row">
              <button
                className="btn btn-primary"
                onClick={handlePayment}
                disabled={!payAmount || !bankAcctNum || bankLast4.length !== 4 || payLoading}
              >
                {payLoading ? <Spinner /> : 'Submit payment'}
              </button>
              <button className="btn btn-secondary" onClick={closeForm} disabled={payLoading}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* DUE DATE CHANGE FORM                                             */}
        {/* ================================================================ */}
        {activeForm === 'ddc' && (
          <div className="card" style={{ maxWidth: '100%' }}>
            <p className="page-title" style={{ fontSize: 17, marginBottom: 4 }}>Change due date</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              You can move your due date forward up to 10 days.
              You have <strong>{dueDateChangesRemaining}</strong> change{dueDateChangesRemaining !== 1 ? 's' : ''} remaining (lifetime).
            </p>

            {ddcError && <div className="alert alert-error">{ddcError}</div>}

            <div className="field">
              <label htmlFor="newDueDate">New due date</label>
              <input
                id="newDueDate"
                type="date"
                min={minDate}
                max={maxDate}
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
              />
              <span className="field-hint">
                Current due date: {formatDate(amountDue.currentDueDate)}.
                Select a date between {formatDate(minDate)} and {formatDate(maxDate)}.
              </span>
            </div>

            <div className="action-row">
              <button
                className="btn btn-primary"
                onClick={handleDdc}
                disabled={!newDueDate || ddcLoading}
              >
                {ddcLoading ? <Spinner /> : 'Confirm change'}
              </button>
              <button className="btn btn-secondary" onClick={closeForm} disabled={ddcLoading}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* PAYMENT PROGRESS                                                 */}
        {/* ================================================================ */}
        <div className="card" style={{ maxWidth: '100%' }}>
          <div className="section-label">Payment progress</div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{progress.installmentsPaid}</strong>
            {' '}of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{progress.totalInstallments}</strong>
            {' '}payments completed ({pct}%)
          </p>
        </div>

        {/* ================================================================ */}
        {/* ACCOUNT SUMMARY                                                  */}
        {/* ================================================================ */}
        <div className="card" style={{ maxWidth: '100%' }}>
          <div className="section-label">Account summary</div>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="label">Account number</div>
              <div className="value">••••••{acct.accountNumber.slice(-4)}</div>
            </div>
            <div className="summary-item">
              <div className="label">Account holder</div>
              <div className="value">{acct.customerName}</div>
            </div>
            <div className="summary-item">
              <div className="label">Vehicle</div>
              <div className="value">{acct.vehicle.year} {acct.vehicle.make} {acct.vehicle.model}</div>
            </div>
            <div className="summary-item">
              <div className="label">Type</div>
              <div className="value" style={{ textTransform: 'capitalize' }}>{acct.ownershipType}</div>
            </div>
            <div className="summary-item" style={{ gridColumn: '1 / -1' }}>
              <div className="label">Address</div>
              <div className="value">{acct.address}</div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
