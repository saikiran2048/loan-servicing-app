import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, tokenStore } from '../api/client';
import type { ApiError } from '../api/client';
import Spinner from '../components/Spinner';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin() {
    setLoading(true);
    setErrorMsg('');
    try {
      const { loginToken } = await api.login(email, password);
      tokenStore.setLogin(loginToken);
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg((err as ApiError).error ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <div className="portal-brand">Loan Servicing Portal</div>

        <p className="page-title">Sign in</p>
        <p className="page-subtitle">Access your account dashboard.</p>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && email && password && handleLogin()}
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && email && password && handleLogin()}
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, padding: 4 }}
              tabIndex={-1}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Forgot Password is out of scope per REQUIREMENTS.md §3 */}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          Forgot your password? Contact{' '}
          <a href="mailto:support@loanservicing.demo">support@loanservicing.demo</a>
        </p>

        <button
          className="btn btn-primary"
          onClick={handleLogin}
          disabled={!email || !password || loading}
        >
          {loading ? <Spinner /> : 'Sign in'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          New customer?{' '}
          <Link to="/register">Register your account</Link>
        </p>
      </div>
    </div>
  );
}
