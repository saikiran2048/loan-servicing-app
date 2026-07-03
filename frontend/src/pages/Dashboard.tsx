import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, tokenStore } from '../api/client';
import type { DashboardData, ApiError, PaymentMethod, PaymentHistoryEntry } from '../api/client';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import Gauge from '../components/Gauge';
import { useToast } from '../components/Toast';

type ActiveModal = 'none' | 'payment' | 'ddc';

function formatCurrency(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const METHOD_OPTIONS: { value: PaymentMethod; icon: string; name: string; desc: string }[] = [
  { value: 'ach_transfer', icon: '🏦', name: 'ACH bank transfer', desc: 'Direct from your bank account' },
  { value: 'debit_card',   icon: '💳', name: 'Debit card',        desc: 'Instant, small processing fee' },
  { value: 'manual',       icon: '✍️', name: 'Manual payment',    desc: 'One-time, entered by hand' },
];

const METHOD_LABELS: Record<PaymentHistoryEntry['method'], string> = {
  autopay: 'Autopay',
  ach_transfer: 'ACH transfer',
  debit_card: 'Debit card',
  manual: 'Manual',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { showToast, notifications, hasUnread, markRead } = useToast();

  const [data, setData]           = useState<DashboardData | null>(null);
  const [history, setHistory]     = useState<PaymentHistoryEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [errorMsg, setErrorMsg]   = useState('');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [notifOpen, setNotifOpen] = useState(false);
  const [autopayBusy, setAutopayBusy] = useState(false);

  // Payment form state
  const [payAmount, setPayAmount]   = useState('');
  const [payMethod, setPayMethod]   = useState<PaymentMethod>('ach_transfer');
  const [bankAcctNum, setBankAcctNum] = useState('');
  const [bankLast4, setBankLast4]   = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError]     = useState('');

  // DDC form state
  const [newDueDate, setNewDueDate] = useState('');
  const [ddcLoading, setDdcLoading] = useState(false);
  const [ddcError, setDdcError]     = useState('');

  // Payoff calculator state
  const [extraMonthly, setExtraMonthly] = useState(0);

  // -----------------------------------------------------------------------
  const loadDashboard = useCallback(async () => {
    const token = tokenStore.getLogin();
    if (!token) { navigate('/login'); return; }

    setLoading(true);
    setErrorMsg('');
    try {
      const [dash, paymentsResult] = await Promise.all([
        api.getDashboard(token),
        api.listPayments(token),
      ]);
      setData(dash);
      setHistory(paymentsResult.payments);
      setPayAmount(dash.amountDue.amount.toFixed(2));

      if (dash.autopayCharged) {
        showToast('success', 'Autopay charge processed', `${formatCurrency(dash.installmentAmount)} was automatically charged to keep your account current.`);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.error?.toLowerCase().includes('session') || apiErr.error?.toLowerCase().includes('authentication')) {
        tokenStore.clearLogin();
        navigate('/login');
      } else {
        setErrorMsg(apiErr.error ?? 'Failed to load account data.');
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // -----------------------------------------------------------------------
  function openModal(modal: ActiveModal) {
    setActiveModal(modal);
    setPayError('');
    setDdcError('');
    if (data) setPayAmount(data.amountDue.amount.toFixed(2));
    setNewDueDate('');
  }

  function closeModal() {
    setActiveModal('none');
    setPayError('');
    setDdcError('');
  }

  // -----------------------------------------------------------------------
  async function handleAutopayToggle() {
    if (!data) return;
    const nextState = !data.autopayEnabled;
    setAutopayBusy(true);
    try {
      const token = tokenStore.getLogin()!;
      await api.toggleAutopay(token, nextState);
      showToast('success', nextState ? 'Autopay turned on' : 'Autopay turned off',
        nextState ? "We'll auto-charge your account if a payment is ever missed." : 'Auto-charging is now disabled.');
      await loadDashboard();
    } catch (err) {
      showToast('error', 'Could not update autopay', (err as ApiError).error ?? 'Please try again.');
    } finally {
      setAutopayBusy(false);
    }
  }

  // -----------------------------------------------------------------------
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
        method: payMethod,
      });
      showToast(
        'success',
        'Payment received',
        result.adjustedMessage ?? `${formatCurrency(result.appliedAmount)} applied to your account.`
      );
      closeModal();
      await loadDashboard();
    } catch (err) {
      setPayError((err as ApiError).error ?? 'Payment failed.');
    } finally {
      setPayLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  async function handleDdc() {
    if (!data) return;
    setDdcLoading(true);
    setDdcError('');
    try {
      const token = tokenStore.getLogin()!;
      const result = await api.changeDueDate(token, newDueDate);
      showToast(
        'success',
        'Due date updated',
        `New due date: ${formatDate(result.newDueDate)}. ${result.changesRemaining} change${result.changesRemaining !== 1 ? 's' : ''} remaining.`
      );
      closeModal();
      await loadDashboard();
    } catch (err) {
      setDdcError((err as ApiError).error ?? 'Could not update due date.');
    } finally {
      setDdcLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Payoff calculator — client-side estimate only, uses APR + remaining
  // balance from the dashboard payload. Simple amortization approximation,
  // clearly labeled as an estimate (no backend call, nothing persisted).
  // -----------------------------------------------------------------------
  const calc = useMemo(() => {
    if (!data || !data.apr) return null;
    const monthlyRate = data.apr / 100 / 12;
    const baseInstallment = data.installmentAmount;
    const balance = data.remainingBalance;
    if (balance <= 0) return { months: 0, interestSaved: 0 };

    function monthsToPayoff(payment: number): number {
      if (monthlyRate === 0) return Math.ceil(balance / payment);
      let bal = balance;
      let months = 0;
      while (bal > 0 && months < 600) {
        bal = bal * (1 + monthlyRate) - payment;
        months += 1;
      }
      return months;
    }

    const baseMonths = monthsToPayoff(baseInstallment);
    const withExtraMonths = monthsToPayoff(baseInstallment + extraMonthly);
    const monthsSaved = Math.max(0, baseMonths - withExtraMonths);

    // Rough interest-saved estimate: difference in total paid between the
    // two schedules. This is an estimate for illustration, not a binding
    // payoff quote.
    const totalBase = baseInstallment * baseMonths;
    const totalWithExtra = (baseInstallment + extraMonthly) * withExtraMonths;
    const interestSaved = Math.max(0, totalBase - totalWithExtra);

    return { months: monthsSaved, interestSaved };
  }, [data, extraMonthly]);

  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="auth-wrap">
        <Spinner size={28} color="#2ee6b8" />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="field-error">{errorMsg || 'Could not load account.'}</div>
          <button className="btn btn-primary btn-full" onClick={loadDashboard}>Retry</button>
        </div>
      </div>
    );
  }

  const { accountSummary: acct, paymentProgress: progress, amountDue, dueDateChangesRemaining } = data;
  const pct = Math.min(100, Math.round((progress.installmentsPaid / progress.totalInstallments) * 100));
  const minDate = addDays(amountDue.currentDueDate, 1);
  const maxDate = addDays(amountDue.currentDueDate, 10);
  const initials = acct.customerName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="dash-wrap">
      {/* ================================================================ */}
      {/* HEADER */}
      {/* ================================================================ */}
      <div className="dash-header">
        <div className="dash-welcome">
          <h1>Welcome back, {acct.customerName.split(' ')[0]}</h1>
          <p>Account ending in {acct.accountNumber.slice(-4)} · Member since {acct.memberSince ? formatShortDate(acct.memberSince) : '—'}</p>
        </div>
        <div className="dash-header-actions" style={{ position: 'relative' }}>
          <button
            className="bell-btn"
            onClick={() => { setNotifOpen((o) => !o); markRead(); }}
            aria-label="Notifications"
          >
            🔔
            {hasUnread && <span className="bell-dot" />}
          </button>
          {notifOpen && (
            <div className="notif-panel">
              {notifications.length === 0 && <div className="notif-empty">No activity yet this session.</div>}
              {notifications.map((n) => (
                <div key={n.id} className="notif-item">
                  <div>{n.title}</div>
                  <div className="t">{n.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* LOAN SUMMARY — gauge + progress + due + actions                  */}
      {/* ================================================================ */}
      <div className="dash-grid">
        <div className="card loan-card">
          <div className="gauge-svg-holder">
            <Gauge percent={pct} size={200} />
          </div>
          <div>
            <span className={`due-badge ${amountDue.isDelinquent ? 'overdue' : 'ok'}`}>
              {amountDue.isDelinquent ? '⚠ Past due' : '✓ On track'}
            </span>
            <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
              {amountDue.isDelinquent ? 'Amount due (incl. late fee)' : 'Amount due'}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 30, fontWeight: 600, margin: '4px 0 10px' }}>
              {formatCurrency(amountDue.amount)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Due {formatDate(amountDue.currentDueDate)}
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {progress.installmentsPaid} of {progress.totalInstallments} payments completed
            </div>
            <div className="loan-actions">
              <button className="btn btn-primary" onClick={() => openModal('payment')}>Make a payment</button>
              <button
                className="btn"
                onClick={() => openModal('ddc')}
                disabled={dueDateChangesRemaining === 0}
                title={dueDateChangesRemaining === 0 ? 'No due date changes remaining' : undefined}
              >
                Change due date {dueDateChangesRemaining === 0 ? '(none left)' : `(${dueDateChangesRemaining} left)`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* PROFILE / VEHICLE / AUTOPAY                                      */}
      {/* ================================================================ */}
      <div className="dash-grid">
        <div className="card">
          <div className="card-title">Profile</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <div className="avatar">{initials}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{acct.customerName}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{acct.phone ?? '—'}</div>
            </div>
          </div>
          <div className="info-row"><span className="k">Account number</span><span className="v">••••••{acct.accountNumber.slice(-4)}</span></div>
          <div className="info-row"><span className="k">Address</span><span className="v" style={{ fontFamily: 'inherit', textAlign: 'right' }}>{acct.address}</span></div>
        </div>

        <div className="card">
          <div className="card-title">Vehicle</div>
          {acct.vehicle.vin && <div className="vehicle-plate">{acct.vehicle.vin}</div>}
          <div className="info-row"><span className="k">Vehicle</span><span className="v" style={{ fontFamily: 'inherit' }}>{acct.vehicle.year} {acct.vehicle.make} {acct.vehicle.model}</span></div>
          <div className="info-row"><span className="k">Color</span><span className="v" style={{ fontFamily: 'inherit' }}>{acct.vehicle.color ?? '—'}</span></div>
          <div className="info-row"><span className="k">Ownership</span><span className="v" style={{ fontFamily: 'inherit', textTransform: 'capitalize' }}>{acct.ownershipType}</span></div>
        </div>

        <div className="card">
          <div className="card-title">Autopay</div>
          <div className="autopay-row">
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{data.autopayEnabled ? 'On' : 'Off'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Auto-charges if a payment is missed
              </div>
            </div>
            <button
              className={`toggle ${data.autopayEnabled ? 'on' : ''}`}
              onClick={handleAutopayToggle}
              disabled={autopayBusy}
              aria-label="Toggle autopay"
            />
          </div>
          <div className="info-row"><span className="k">APR</span><span className="v">{data.apr !== null ? `${data.apr.toFixed(2)}%` : '—'}</span></div>
          <div className="info-row"><span className="k">Remaining balance</span><span className="v">{formatCurrency(data.remainingBalance)}</span></div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* PAYOFF CALCULATOR                                                */}
      {/* ================================================================ */}
      {data.apr !== null && (
        <div className="card calc-card" style={{ marginBottom: 20 }}>
          <div>
            <div className="card-title">Payoff calculator</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Estimate only — see how an extra monthly payment shortens your loan.
            </p>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Extra per month: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(extraMonthly)}</strong>
            </label>
            <input
              type="range"
              min={0}
              max={Math.max(200, Math.round(data.installmentAmount))}
              step={5}
              value={extraMonthly}
              onChange={(e) => setExtraMonthly(Number(e.target.value))}
            />
          </div>
          <div>
            <div className="calc-result">
              <div className="big">{calc ? `${calc.months} mo` : '—'}</div>
              <div className="lbl">sooner payoff</div>
            </div>
            <div className="calc-result">
              <div className="big">{calc ? formatCurrency(calc.interestSaved) : '—'}</div>
              <div className="lbl">estimated savings</div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* PAYMENT HISTORY                                                  */}
      {/* ================================================================ */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>No payments yet.</td></tr>
            )}
            {history.map((p, i) => (
              <tr key={i}>
                <td>{formatShortDate(p.date)}</td>
                <td>{METHOD_LABELS[p.method]}</td>
                <td className="amt">{formatCurrency(p.amount)}</td>
                <td><span className="status-pill success">Success</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================================================================ */}
      {/* PAYMENT MODAL                                                    */}
      {/* ================================================================ */}
      <Modal
        open={activeModal === 'payment'}
        onClose={closeModal}
        title="Make a payment"
        subtitle="Overpayments are automatically capped at your remaining balance."
      >
        {payError && <div className="field-error">{payError}</div>}

        <div className="field">
          <label>Payment method</label>
          <div className="option-list">
            {METHOD_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`option-item ${payMethod === m.value ? 'selected' : ''}`}
                onClick={() => setPayMethod(m.value)}
              >
                <span className="option-icon">{m.icon}</span>
                <span>
                  <div className="name">{m.name}</div>
                  <div className="desc">{m.desc}</div>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="payAmount">Amount</label>
          <input
            id="payAmount"
            className="mono-input"
            type="number"
            min="0.01"
            step="0.01"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="bankAcctNum">Bank account number</label>
          <input
            id="bankAcctNum"
            className="mono-input"
            type="text"
            inputMode="numeric"
            placeholder="Your bank account number"
            value={bankAcctNum}
            onChange={(e) => setBankAcctNum(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="field">
          <label htmlFor="bankLast4">Bank account last 4</label>
          <input
            id="bankLast4"
            className="mono-input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="Last 4 digits"
            value={bankLast4}
            onChange={(e) => setBankLast4(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handlePayment}
          disabled={!payAmount || !bankAcctNum || bankLast4.length !== 4 || payLoading}
        >
          {payLoading ? <Spinner /> : 'Submit payment'}
        </button>
      </Modal>

      {/* ================================================================ */}
      {/* DDC MODAL                                                        */}
      {/* ================================================================ */}
      <Modal
        open={activeModal === 'ddc'}
        onClose={closeModal}
        title="Change due date"
        subtitle={`You can move your due date forward up to 10 days. ${dueDateChangesRemaining} change${dueDateChangesRemaining !== 1 ? 's' : ''} remaining (lifetime).`}
      >
        {ddcError && <div className="field-error">{ddcError}</div>}

        <div className="field">
          <label htmlFor="newDueDate">New due date</label>
          <input
            id="newDueDate"
            type="date"
            min={minDate}
            max={maxDate}
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
          />
          <span className="field-hint">
            Current due date: {formatDate(amountDue.currentDueDate)}. Select between {formatDate(minDate)} and {formatDate(maxDate)}.
          </span>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleDdc}
          disabled={!newDueDate || ddcLoading}
        >
          {ddcLoading ? <Spinner /> : 'Confirm change'}
        </button>
      </Modal>
    </div>
  );
}