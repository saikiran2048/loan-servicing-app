import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, tokenStore } from '../api/client';
import type { ApiError } from '../api/client';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

type Step = 1 | 2 | 3;

interface Step1State {
  accountNumber: string;
  last4Ssn: string;
}

interface Step2State {
  email: string;
  confirmEmail: string;
  password: string;
  confirmPassword: string;
  disclaimerAccepted: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
}

interface Step3State {
  code: string;
  expired: boolean;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep]         = useState<Step>(1);
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [s1, setS1] = useState<Step1State>({ accountNumber: '', last4Ssn: '' });
  const [s2, setS2] = useState<Step2State>({
    email: '', confirmEmail: '', password: '', confirmPassword: '',
    disclaimerAccepted: false, showPassword: false, showConfirmPassword: false,
  });
  const [s3, setS3] = useState<Step3State>({ code: '', expired: false });

  // ---------------------------------------------------------------------
  // Step 1 — Verify Identity
  // ---------------------------------------------------------------------
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

  // ---------------------------------------------------------------------
  // Step 2 — Account Setup
  // ---------------------------------------------------------------------
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
      showToast('info', 'Verification code sent', `Check ${s2.email} for a 6-digit code.`);
      setStep(3);
    } catch (err) {
      setErrorMsg((err as ApiError).error ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------
  // Step 3 — Verify OTP
  // ---------------------------------------------------------------------
  async function handleVerifyOtp() {
    setLoading(true);
    setErrorMsg('');
    setS3((p) => ({ ...p, expired: false }));
    try {
      const token = tokenStore.getRegistration()!;
      const { loginToken } = await api.verifyOtp(token, s3.code);
      tokenStore.clearRegistration();
      tokenStore.setLogin(loginToken);
      showToast('success', 'Account registered', 'Welcome — redirecting to your dashboard.');
      navigate('/dashboard');
    } catch (err) {
      const apiErr = err as ApiError & { expired?: boolean };
      setErrorMsg(apiErr.error ?? 'Something went wrong.');
      if (apiErr.expired) setS3((p) => ({ ...p, expired: true }));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setLoading(true);
    setErrorMsg('');
    setS3((p) => ({ ...p, expired: false, code: '' }));
    try {
      const token = tokenStore.getRegistration()!;
      await api.resendOtp(token);
      showToast('info', 'New code sent', `Check ${s2.email} for the new 6-digit code.`);
    } catch (err) {
      setErrorMsg((err as ApiError).error ?? 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  }

  const step2Valid =
    s2.email.trim() !== '' &&
    s2.confirmEmail.trim() !== '' &&
    s2.password !== '' &&
    s2.confirmPassword !== '' &&
    s2.disclaimerAccepted;

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Create your account</h2>
        <span className="auth-sub">Step {step} of 3</span>

        <div className="steps">
          <div className={`step-dot-bar ${step >= 1 ? 'done' : ''}`} />
          <div className={`step-dot-bar ${step >= 2 ? 'done' : ''}`} />
          <div className={`step-dot-bar ${step >= 3 ? 'done' : ''}`} />
        </div>

        {errorMsg && (
          <div className="field-error">
            {errorMsg}
            {s3.expired && (
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-ghost" onClick={handleResendOtp} disabled={loading}>
                  Resend code
                </button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* STEP 1 — Identity verification */}
        {/* ------------------------------------------------------------ */}
        {step === 1 && (
          <>
            <div className="field">
              <label htmlFor="accountNumber">Account number</label>
              <input
                id="accountNumber"
                className="mono-input"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit account number"
                value={s1.accountNumber}
                onChange={(e) => setS1((p) => ({ ...p, accountNumber: e.target.value.replace(/\D/g, '') }))}
                onKeyDown={(e) => e.key === 'Enter' && s1.accountNumber && s1.last4Ssn && handleStep1()}
                autoFocus
              />
            </div>

            <div className="field">
              <label htmlFor="last4Ssn">Last 4 digits of SSN</label>
              <input
                id="last4Ssn"
                className="mono-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={s1.last4Ssn}
                onChange={(e) => setS1((p) => ({ ...p, last4Ssn: e.target.value.replace(/\D/g, '') }))}
                onKeyDown={(e) => e.key === 'Enter' && s1.accountNumber && s1.last4Ssn && handleStep1()}
              />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleStep1}
              disabled={!s1.accountNumber || !s1.last4Ssn || loading}
            >
              {loading ? <Spinner /> : 'Continue'}
            </button>

            <div className="switch-line">
              Already registered? <Link to="/login">Sign in</Link>
            </div>
          </>
        )}

        {/* ------------------------------------------------------------ */}
        {/* STEP 2 — Account setup */}
        {/* ------------------------------------------------------------ */}
        {step === 2 && (
          <>
            <div className="verified-box">✓ Identity verified — set up your login.</div>

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={s2.email}
                onChange={(e) => setS2((p) => ({ ...p, email: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="field">
              <label htmlFor="confirmEmail">Confirm email</label>
              <input
                id="confirmEmail"
                type="email"
                placeholder="you@example.com"
                value={s2.confirmEmail}
                onChange={(e) => setS2((p) => ({ ...p, confirmEmail: e.target.value }))}
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
                  onChange={(e) => setS2((p) => ({ ...p, password: e.target.value }))}
                  style={{ paddingRight: 52 }}
                />
                <button
                  type="button"
                  onClick={() => setS2((p) => ({ ...p, showPassword: !p.showPassword }))}
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
                  onChange={(e) => setS2((p) => ({ ...p, confirmPassword: e.target.value }))}
                  style={{ paddingRight: 52 }}
                />
                <button
                  type="button"
                  onClick={() => setS2((p) => ({ ...p, showConfirmPassword: !p.showConfirmPassword }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, padding: 4 }}
                  tabIndex={-1}
                >
                  {s2.showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="field" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input
                id="disclaimer"
                type="checkbox"
                style={{ marginTop: 3, width: 'auto' }}
                checked={s2.disclaimerAccepted}
                onChange={(e) => setS2((p) => ({ ...p, disclaimerAccepted: e.target.checked }))}
              />
              <label htmlFor="disclaimer" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                I agree to the{' '}
                <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--teal)' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--teal)' }}>E-Sign Consent Disclosure</a>
              </label>
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={handleStep2}
              disabled={!step2Valid || loading}
            >
              {loading ? <Spinner /> : 'Register'}
            </button>
          </>
        )}

        {/* ------------------------------------------------------------ */}
        {/* STEP 3 — OTP verification */}
        {/* ------------------------------------------------------------ */}
        {step === 3 && (
          <>
            <div className="verified-box">
              ✉️ We sent a 6-digit code to <strong>&nbsp;{s2.email}</strong>. It expires in 5 minutes.
            </div>

            <div className="field">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp"
                className="mono-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                style={{ letterSpacing: '0.3em', fontSize: 18, textAlign: 'center' }}
                value={s3.code}
                onChange={(e) => setS3((p) => ({ ...p, code: e.target.value.replace(/\D/g, '') }))}
                onKeyDown={(e) => e.key === 'Enter' && s3.code.length === 6 && handleVerifyOtp()}
                autoFocus
              />
            </div>

            <div className="btn-row" style={{ flexDirection: 'column' }}>
              <button
                className="btn btn-primary btn-full"
                onClick={handleVerifyOtp}
                disabled={s3.code.length !== 6 || loading}
              >
                {loading ? <Spinner /> : 'Complete Registration'}
              </button>

              {!s3.expired && (
                <button className="btn btn-full" onClick={handleResendOtp} disabled={loading}>
                  Resend code
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}