import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { TrophyIcon } from '../icons.jsx';
import { LangToggle, useLang } from '../i18n.jsx';

// Split-screen access pages (participants and organizers). PRIVATE-GROUP model:
// there is no self-registration — the organizer creates every account and hands
// out a temp password; portal segregation is SERVER-enforced (403 PORTAL_MISMATCH).

function MailIcon() {
  return (
    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11 20 2m-4 2 2.5 2.5M18 4l2 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" width="18" height="18">
      <path d="M12 3 5 6v5c0 4.4 3 8.4 7 9.6 4-1.2 7-5.2 7-9.6V6l-7-3Z" />
      <path d="m9.2 12 2 2 3.6-4" />
    </svg>
  );
}

export function EyeIcon({ off }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 3l18 18M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M6.7 6.9C4.6 8.1 3 10 2 12c1.8 3.7 5.5 6 10 6 1.5 0 2.9-.25 4.2-.73M12 6c4.5 0 8.2 2.3 10 6-.6 1.2-1.4 2.3-2.4 3.2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 12c1.8-3.7 5.5-6 10-6s8.2 2.3 10 6c-1.8 3.7-5.5 6-10 6s-8.2-2.3-10-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function Hero({ variant }) {
  const { t } = useLang();
  const admin = variant === 'admin';
  return (
    <aside className="login-hero">
      <div className="hero-top">
        <div className="hero-brand">
          <span className="hero-brand-mark"><TrophyIcon size={24} /></span>
          <span className="hero-brand-name">polla<em>Mundial</em></span>
        </div>
        {admin && (
          <span className="hero-secure"><ShieldIcon /> {t('hero.secure')}</span>
        )}
      </div>

      <div className="hero-body">
        <span className="hero-kicker">
          {admin ? t('hero.kicker_admin') : t('hero.kicker_user')}
        </span>
        {admin ? (
          <h2 className="hero-title">{t('hero.title_admin_1')}<br /><em>{t('hero.title_admin_2')}</em></h2>
        ) : (
          <h2 className="hero-title">{t('hero.title_user_1')}<br /><em>{t('hero.title_user_2')}</em></h2>
        )}
        <p className="hero-text">
          {admin ? t('hero.text_admin') : t('hero.text_user')}
        </p>
      </div>

      {admin ? (
        <div className="hero-foot hero-stats">
          <span className="hero-stat-block"><strong>12</strong><small>{t('hero.stat_matches')}</small></span>
          <span className="hero-stat-block"><strong>02</strong><small>{t('hero.stat_groups')}</small></span>
          <span className="hero-stat-block"><strong>100%</strong><small>{t('hero.stat_auto')}</small></span>
        </div>
      ) : (
        <div className="hero-foot">
          <span className="hero-stat">
            <strong>12</strong>
            <small>{t('hero.stat_matches_short')}</small>
          </span>
          <span className="hero-foot-text">
            <strong>{t('hero.foot_started')}</strong>
            <small>{t('hero.foot_ready')}</small>
          </span>
        </div>
      )}
    </aside>
  );
}

export default function Login({ variant = 'user' }) {
  const admin = variant === 'admin';
  const { user, login } = useAuth();
  const { t, terr } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: send each role to its home (declarative redirect — never
  // call navigate() during render).
  if (user) {
    if (user.mustChangePassword) return <Navigate to="/cambiar-contrasena" replace />;
    return <Navigate to={user.role === 'Admin' ? '/admin' : '/'} replace />;
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Portal segregation is SERVER-enforced; the page just declares itself.
      const logged = await login(form.email, form.password, admin ? 'admin' : 'user');
      if (logged.mustChangePassword) navigate('/cambiar-contrasena');
      else navigate(admin ? '/admin' : '/');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-split">
      <LangToggle float />
      <Hero variant={variant} />

      <section className="login-panel">
        <div className="login-box">
          <span className="login-kicker">
            {admin ? <><KeyIcon /> {t('login.kicker_admin')}</> : t('login.kicker_user')}
          </span>
          <h1>{admin ? t('login.title_admin') : t('login.title_user')}</h1>
          <p className="login-sub">
            {admin ? t('login.sub_admin') : t('login.sub_user')}
          </p>

          <form onSubmit={submit} className="login-form">
            <label>
              <span className="field-label">{admin ? t('login.email_admin') : t('login.email_user')}</span>
              <span className="field has-icon">
                <MailIcon />
                <input type="email" value={form.email} onChange={set('email')} required autoFocus
                  placeholder={admin ? t('login.email_ph_admin') : t('login.email_ph_user')} autoComplete="email" />
              </span>
            </label>

            <label>
              <span className="field-label">{t('login.password')}</span>
              <span className="field has-icon">
                {admin ? <KeyIcon /> : <LockIcon />}
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={set('password')} minLength={8} required placeholder="••••••••"
                  autoComplete="current-password" />
                <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? t('login.hide_pw') : t('login.show_pw')}>
                  <EyeIcon off={showPass} />
                </button>
              </span>
            </label>

            {error && <div className="error-box">{terr(error)}</div>}

            <button className="login-cta" disabled={busy}>
              {busy ? t('login.wait') : admin ? t('login.cta_admin') : t('login.cta_user')}
            </button>
          </form>

          <div className="admin-note">
            <ShieldIcon />
            <span>{admin ? t('login.note_admin') : t('login.note_user')}</span>
          </div>

          <div className="login-divider" />

          <p className="login-switch">
            {admin ? (
              <Link to="/login">{t('login.back_participants')}</Link>
            ) : (
              <>
                <span className="muted">{t('login.for_organizers')}</span>
                <Link to="/admin/login">{t('login.go_admin')}</Link>
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
