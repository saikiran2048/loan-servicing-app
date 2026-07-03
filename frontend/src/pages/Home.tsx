import { useNavigate } from 'react-router-dom';
import Gauge from '../components/Gauge';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <div className="hero">
        <div>
          <div className="eyebrow">Vehicle Loan Servicing</div>
          <h1>
            Your loan,
            <br />
            in the <span>driver's seat.</span>
          </h1>
          <p>
            Track your auto loan, manage payments, and stay ahead of every due date — all from
            one clean, modern dashboard.
          </p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => navigate('/register')}>
              Get started
            </button>
            <button className="btn" onClick={() => navigate('/login')}>
              I have an account
            </button>
          </div>
        </div>

        <div className="gauge-wrap">
          <div className="gauge-label">Sample account</div>
          <div className="gauge-title">Loan payoff progress</div>
          <div className="gauge-svg-holder">
            <Gauge percent={65} size={220} />
          </div>
          <div className="gauge-stats">
            <div>
              <div className="gauge-stat-label">Remaining</div>
              <div className="gauge-stat-val">$4,520</div>
            </div>
            <div>
              <div className="gauge-stat-label">Next due</div>
              <div className="gauge-stat-val">Jul 15</div>
            </div>
          </div>
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
            💳
          </div>
          <h3>Flexible payments</h3>
          <p>Pay by ACH transfer, debit card, or manual payment, and switch on autopay so you never miss a cycle.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>
            📅
          </div>
          <h3>Move your due date</h3>
          <p>Shift your monthly due date forward, up to twice over the life of your account.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: 'rgba(139,148,168,0.15)', color: 'var(--text-secondary)' }}>
            📊
          </div>
          <h3>Payoff calculator</h3>
          <p>See how extra payments shorten your loan term and cut your total interest.</p>
        </div>
      </div>

      <footer className="app-footer">
        © 2026 Ignition Auto Finance · Demo interface — no real data is processed
      </footer>
    </>
  );
}