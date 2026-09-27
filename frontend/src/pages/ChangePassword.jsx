import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { EyeIcon, Hero } from './Login.jsx';
import { LangToggle, useLang } from '../i18n.jsx';

// Forced first-login password change (organizer-created accounts). The gate is
// SERVER-enforced: with the change pending, every API call except this one is
// refused — this screen is the only way forward.

const RULES = [
  ['len', 'chpw.r_len', (p) => p.length >= 8],
  ['upper', 'chpw.r_upper', (p) => /[A-ZÁÉÍÓÚÑ]/.test(p)],
  ['lower', 'chpw.r_lower', (p) => /[a-záéíóúñ]/.test(p)],
  ['digit', 'chpw.r_digit', (p) => /\d/.test(p)],
  ['symbol', 'chpw.r_symbol', (p) => /[^a-zA-Z0-9À-ɏ]/.test(p)],
];
const isStrong = (p) => RULES.every(([, , test]) => test(p));

export default function ChangePassword() {
  const { user, changePassword, logout } = useAuth();
  const { t, terr } = useLang();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await changePassword(current, next);
      navigate(user.role === 'Admin' ? '/admin' : '/');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-split">
      <LangToggle float />
      <Hero variant="user" />

      <section className="login-panel">
        <div className="login-box">
          <span className="login-kicker">{t('chpw.kicker')}</span>
          <h1>{t('chpw.title')}</h1>
          <p className="login-sub">
            {t('chpw.sub', { name: user.displayName.split(' ')[0] })}
          </p>

          <form onSubmit={submit} className="login-form">
            <label>
              <span className="field-label">{t('chpw.temp_label')}</span>
              <span className="field">
                <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
                  required autoFocus placeholder={t('chpw.temp_ph')} autoComplete="current-password" />
              </span>
            </label>

            <label>
              <span className="field-label">{t('chpw.new_label')}</span>
              <span className="field">
                <input type={show ? 'text' : 'password'} value={next}
                  onChange={(e) => setNext(e.target.value)} minLength={8} required
                  placeholder="••••••••" autoComplete="new-password" />
                <button type="button" className="eye-btn" onClick={() => setShow(!show)}
                  aria-label={show ? t('login.hide_pw') : t('login.show_pw')}>
                  <EyeIcon off={show} />
                </button>
              </span>
            </label>

            <ul className="pw-checks" aria-live="polite">
              {RULES.map(([key, labelKey, test]) => {
                const ok = test(next);
                return (
                  <li key={key} className={ok ? 'done' : ''}>
                    <span className="pw-dot">{ok ? '✓' : '·'}</span> {t(labelKey)}
                  </li>
                );
              })}
            </ul>

            {error && <div className="error-box">{terr(error)}</div>}

            <button className="login-cta" disabled={busy || !isStrong(next) || !current}>
              {busy ? t('chpw.saving') : t('chpw.cta')}
            </button>
          </form>

          <div className="login-divider" />
          <p className="login-switch">
            <button className="linklike" onClick={logout}>{t('chpw.other_account')}</button>
          </p>
        </div>
      </section>
    </div>
  );
}
