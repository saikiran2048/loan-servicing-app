import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, tokenStore } from '../api/client';
import type { ApiError } from '../api/client';
import StepIndicator from '../components/StepIndicator';
import Spinner from '../components/Spinner';

type Step = 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Step 1 state
// ---------------------------------------------------------------------------
interface Step1State {
  accountNumber: string;
  last4Ssn: string;
}

// ---------------------------------------------------------------------------
// Step 2 state
// ---------------------------------------------------------------------------
interface Step2State {
  email: string;
  confirmEmail: string;
  password: string;
  confirmPassword: string;
  disclaimerAccepted: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
}

// ---------------------------------------------------------------------------
// Step 3 state
// ---------------------------------------------------------------------------
interface Step3State {
  code: string;
  expired: boolean;
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [step, setStep]         = useState<Step>(1);
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step-specific state
  const [s1, setS1] = useState<Step1State>({ accountNumber: '', last4Ssn: '' });
  const [s2, setS2] = useState<Step2State>({
    email: '', confirmEmail: '', password: '', confirmPassword: '',
    disclaimerAccepted: false, showPassword: false, showConfirmPassword: false,
  });
  const [s3, setS3] = useState<Step3State>({ code: '', expired: false });

  // ---------------------------------------------------------------------------
  // Step 1 — Verify Identity
  // ---------------------------------------------------------------------------
  async function handleStep1() {
    setLoading(true);
    setErrorMsg('');
    try {
      const { registrationToken } = await api.verifyIdentity(s1.accountNumber, s1.last4Ssn);
      tokenStore.setRegistration(registrationToken);
      setStep(2);
    } catch (err) {
      setErrorMsg((err as ApiError).error ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Step 2 — Account Setup
  // ---------------------------------------------------------------------------
  async function handleStep2() {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = tokenStore.getRegistration()!;
      const { registrationToken } = await api.setupAccount(token, {
        email: s2.email,
        confirmEmail: s2.confirmEmail,
        password: s2.password,
        confirmPassword: s2.confirmPassword,
        disclaimerAccepted: s2.disclaimerAccepted,
      });
      tokenStore.setRegistration(registrationToken);
      setStep(3);
    } catch (err) {
      setErrorMsg((err as ApiError).error ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Step 3 — Verify OTP
  // ---------------------------------------------------------------------------
  async function handleVerifyOtp() {
    setLoading(true);
    setErrorMsg('');
    setS3(p => ({ ...p, expired: false }));
    try {
      const token = tokenStore.getRegistration()!;
      const { loginToken } = await api.verifyOtp(token, s3.code);
      tokenStore.clearRegistration();
      tokenStore.setLogin(loginToken);
      navigate('/dashboard');
    } catch (err) {
      const apiErr = err as ApiError & { expired?: boolean };
      setErrorMsg(apiErr.error ?? 'Something went wrong.');
      if (apiErr.expired) setS3(p => ({ ...p, expired: true }));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setLoading(true);
    setErrorMsg('');
    setS3(p => ({ ...p, expired: false, code: '' }));
    try {
      const token = tokenStore.getRegistration()!;
      await api.resendOtp(token);
      setErrorMsg('');
    } catch (err) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.error ?? 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Derived: Step 2 register button enabled
  // ---------------------------------------------------------------------------
  const step2Valid =
    s2.email.trim() !== '' &&
    s2.confirmEmail.trim() !== '' &&
    s2.password !== '' &&
    s2.confirmPassword !== '' &&
    s2.disclaimerAccepted;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="page-center">
      <div className="card">
        <div className="portal-brand">Loan Servicing Portal</div>
        <StepIndicator current={step} />

        {errorMsg && !s3.expired && (
          <div className="alert alert-error">{errorMsg}</div>
        )}
        {s3.expired && (
          <div className="alert alert-warning">
            {errorMsg}
            {' '}
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 8 }}
              onClick={handleResendOtp}
              disabled={loading}
            >
              Resend code
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STEP 1 */}
        {/* ---------------------------------------------------------------- */}
        {step === 1 && (
          <>
            <p className="page-title">Verify your identity</p>
            <p className="page-subtitle">Enter your account details to get started.</p>

            <div className="field">
              <label htmlFor="accountNumber">Account number</label>
              <input
                id="accountNumber"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit account number"
                value={s1.accountNumber}
                onChange={e => setS1(p => ({ ...p, accountNumber: e.target.value.replace(/\D/g, '') }))}
                onKeyDown={e => e.key === 'Enter' && s1.accountNumber && s1.last4Ssn && handleStep1()}
              />
            </div>

            <div className="field">
              <label htmlFor="last4Ssn">Last 4 digits of SSN</label>
              <input
                id="last4Ssn"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={s1.last4Ssn}
                onChange={e => setS1(p => ({ ...p, last4Ssn: e.target.value.replace(/\D/g, '') }))}
                onKeyDown={e => e.key === 'Enter' && s1.accountNumber && s1.last4Ssn && handleStep1()}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleStep1}
              disabled={!s1.accountNumber || !s1.last4Ssn || loading}
            >
              {loading ? <Spinner /> : 'Continue'}
            </button>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
              Already registered?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STEP 2 */}
        {/* ---------------------------------------------------------------- */}
        {step === 2 && (
          <>
            <p className="page-title">Create your account</p>
            <p className="page-subtitle">Set up your email and password.</p>

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={s2.email}
                onChange={e => setS2(p => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="confirmEmail">Confirm email</label>
              <input
                id="confirmEmail"
                type="email"
                placeholder="you@example.com"
                value={s2.confirmEmail}
                onChange={e => setS2(p => ({ ...p, confirmEmail: e.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={s2.showPassword ? 'text' : 'password'}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                  value={s2.password}
                  onChange={e => setS2(p => ({ ...p, password: e.target.value }))}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setS2(p => ({ ...p, showPassword: !p.showPassword }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, padding: 4 }}
                  tabIndex={-1}
                >
                  {s2.showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <span className="field-hint">Min 8 characters — uppercase, lowercase, number, special character</span>
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={s2.showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={s2.confirmPassword}
                  onChange={e => setS2(p => ({ ...p, confirmPassword: e.target.value }))}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setS2(p => ({ ...p, showConfirmPassword: !p.showConfirmPassword }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, padding: 4 }}
                  tabIndex={-1}
                >
                  {s2.showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="checkbox-row">
              <input
                id="disclaimer"
                type="checkbox"
                checked={s2.disclaimerAccepted}
                onChange={e => setS2(p => ({ ...p, disclaimerAccepted: e.target.checked }))}
              />
              <label htmlFor="disclaimer">
                I agree to the{' '}
                <a href="#" onClick={e => e.preventDefault()}>Terms of Service</a>
                {' '}and{' '}
                <a href="#" onClick={e => e.preventDefault()}>E-Sign Consent Disclosure</a>
              </label>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleStep2}
              disabled={!step2Valid || loading}
            >
              {loading ? <Spinner /> : 'Register'}
            </button>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* STEP 3 */}
        {/* ---------------------------------------------------------------- */}
        {step === 3 && (
          <>
            <p className="page-title">Check your email</p>
            <p className="page-subtitle" style={{ marginBottom: 24 }}>
              We sent a 6-digit verification code to <strong>{s2.email}</strong>.
              It expires in 5 minutes.
            </p>

            <div className="field">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp"
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={s3.code}
                onChange={e => setS3(p => ({ ...p, code: e.target.value.replace(/\D/g, '') }))}
                onKeyDown={e => e.key === 'Enter' && s3.code.length === 6 && handleVerifyOtp()}
                autoFocus
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleVerifyOtp}
              disabled={s3.code.length !== 6 || loading}
              style={{ marginBottom: 12 }}
            >
              {loading ? <Spinner /> : 'Complete Registration'}
            </button>

            {!s3.expired && (
              <button
                className="btn btn-secondary"
                onClick={handleResendOtp}
                disabled={loading}
              >
                Resend code
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
