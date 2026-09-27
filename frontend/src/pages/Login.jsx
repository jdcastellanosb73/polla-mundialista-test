import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// Split-screen access pages (participants and organizers) — same backend
// endpoint; the ADMIN variant additionally verifies the returned role and
// refuses non-admin accounts client-side (the API enforces roles regardless).

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

function EyeIcon({ off }) {
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

function Hero({ variant }) {
  const admin = variant === 'admin';
  return (
    <aside className="login-hero">
      <div className="hero-top">
        <div className="hero-brand">
          <span className="hero-brand-mark">🏆</span>
          <span className="hero-brand-name">polla<em>Mundial</em></span>
        </div>
        {admin && (
          <span className="hero-secure"><ShieldIcon /> Entorno seguro</span>
        )}
      </div>

      <div className="hero-body">
        <span className="hero-kicker">
          {admin ? 'CENTRO DE CONTROL · MUNDIAL 2026' : 'MUNDIAL 2026 · EDICIÓN OFICIAL'}
        </span>
        {admin ? (
          <h2 className="hero-title">Tu polla.<br /><em>Tus reglas.</em></h2>
        ) : (
          <h2 className="hero-title">Donde cada<br /><em>pronóstico cuenta.</em></h2>
        )}
        <p className="hero-text">
          {admin
            ? 'Administra los resultados y la emoción de cada jornada desde un solo lugar.'
            : 'Vive la pasión del fútbol, reta a tus amigos y demuestra quién sabe más de la cancha.'}
        </p>
      </div>

      {admin ? (
        <div className="hero-foot hero-stats">
          <span className="hero-stat-block"><strong>12</strong><small>partidos programados</small></span>
          <span className="hero-stat-block"><strong>02</strong><small>grupos en juego</small></span>
          <span className="hero-stat-block"><strong>100%</strong><small>puntuación automática</small></span>
        </div>
      ) : (
        <div className="hero-foot">
          <span className="hero-stat">
            <strong>12</strong>
            <small>partidos</small>
          </span>
          <span className="hero-foot-text">
            <strong>La competencia ya empezó</strong>
            <small>¿Listo para jugar?</small>
          </span>
        </div>
      )}
    </aside>
  );
}

export default function Login({ variant = 'user' }) {
  const admin = variant === 'admin';
  const { user, login, register, logout } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // register only exists on the user variant
  const [form, setForm] = useState({ email: '', displayName: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Already signed in: send each role to its home (declarative redirect — never
  // call navigate() during render).
  if (user) return <Navigate to={user.role === 'Admin' ? '/admin' : '/'} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const logged = mode === 'login'
        ? await login(form.email, form.password)
        : await register(form.email, form.displayName, form.password);

      if (admin && logged.role !== 'Admin') {
        logout();
        setError('Esta cuenta no tiene acceso de organizador. Ingresa por el acceso de participantes.');
        return;
      }
      navigate(admin ? '/admin' : '/');
    } catch (err) {
      setError(err.message || 'Error inesperado');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-split">
      <Hero variant={variant} />

      <section className="login-panel">
        <div className="login-box">
          <span className="login-kicker">
            {admin ? <><KeyIcon /> ACCESO ADMINISTRATIVO</> : 'BIENVENIDO DE VUELTA'}
          </span>
          <h1>{admin ? 'Hola, organizador' : mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>
          <p className="login-sub">
            {admin
              ? 'Ingresa tus credenciales para continuar.'
              : mode === 'login'
                ? 'Ingresa para consultar y actualizar tus pronósticos.'
                : 'Regístrate para empezar a predecir los partidos del grupo.'}
          </p>

          <form onSubmit={submit} className="login-form">
            <label>
              <span className="field-label">{admin ? 'Correo de administrador' : 'Correo electrónico'}</span>
              <span className="field">
                <MailIcon />
                <input type="email" value={form.email} onChange={set('email')} required autoFocus
                  placeholder={admin ? 'admin@correo.com' : 'tu@correo.com'} autoComplete="email" />
              </span>
            </label>

            {!admin && mode === 'register' && (
              <label>
                <span className="field-label">Nombre para el ranking</span>
                <span className="field">
                  <input value={form.displayName} onChange={set('displayName')} minLength={2}
                    maxLength={60} required placeholder="Como te verán los demás" />
                </span>
              </label>
            )}

            <label>
              <span className="field-label">Contraseña</span>
              <span className="field">
                {admin ? <KeyIcon /> : <LockIcon />}
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={set('password')} minLength={8} required placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <EyeIcon off={showPass} />
                </button>
              </span>
            </label>

            {error && <div className="error-box">{error}</div>}

            <button className="login-cta" disabled={busy}>
              {busy ? 'Un momento…'
                : admin ? 'Entrar al panel →'
                : mode === 'login' ? 'Entrar a mi polla →' : 'Crear cuenta y jugar →'}
            </button>
          </form>

          {admin && (
            <div className="admin-note">
              <ShieldIcon />
              <span>Este acceso está reservado para los administradores del torneo.</span>
            </div>
          )}

          {!admin && (
            <p className="login-alt">
              {mode === 'login' ? (
                <>¿Aún no tienes una cuenta?{' '}
                  <button className="linklike" onClick={() => { setMode('register'); setError(null); }}>
                    Regístrate aquí
                  </button>
                </>
              ) : (
                <>¿Ya tienes cuenta?{' '}
                  <button className="linklike" onClick={() => { setMode('login'); setError(null); }}>
                    Inicia sesión
                  </button>
                </>
              )}
            </p>
          )}

          <div className="login-divider" />

          <p className="login-switch">
            {admin ? (
              <Link to="/login">Volver al acceso de participantes →</Link>
            ) : (
              <>
                <span className="muted">Acceso para organizadores</span>
                <Link to="/admin/login">Ir al panel admin →</Link>
              </>
            )}
          </p>

          {!admin && (
            <div className="demo-box">
              <strong>Cuentas demo</strong><br />
              Usuario: <code>user@polla.dev</code> / <code>User123!</code><br />
              Admin: <code>admin@polla.dev</code> / <code>Admin123!</code>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
