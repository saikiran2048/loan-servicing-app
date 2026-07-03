import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, tokenStore } from '../api/client';
import type { ApiError } from '../api/client';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

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
      showToast('success', 'Welcome back', 'Signed in successfully.');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg((err as ApiError).error ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Sign in</h2>
        <span className="auth-sub">Access your account dashboard.</span>

        {errorMsg && <div className="field-error">{errorMsg}</div>}

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && email && password && handleLogin()}
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
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email && password && handleLogin()}
              style={{ paddingRight: 52 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
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
          <a href="mailto:support@loanservicing.demo" style={{ color: 'var(--teal)' }}>
            support@loanservicing.demo
          </a>
        </p>

        <button
          className="btn btn-primary btn-full"
          onClick={handleLogin}
          disabled={!email || !password || loading}
        >
          {loading ? <Spinner /> : 'Sign in'}
        </button>

        <div className="switch-line">
          New customer? <Link to="/register">Register your account</Link>
        </div>
      </div>
    </div>
  );
}