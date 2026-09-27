import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { EyeIcon, Hero } from './Login.jsx';

// Forced first-login password change (organizer-created accounts). The gate is
// SERVER-enforced: with the change pending, every API call except this one is
// refused — this screen is the only way forward.

const RULES = [
  ['len', 'Mínimo 8 caracteres', (p) => p.length >= 8],
  ['upper', 'Una mayúscula', (p) => /[A-ZÁÉÍÓÚÑ]/.test(p)],
  ['lower', 'Una minúscula', (p) => /[a-záéíóúñ]/.test(p)],
  ['digit', 'Un número', (p) => /\d/.test(p)],
  ['symbol', 'Un símbolo (!, #, $...)', (p) => /[^a-zA-Z0-9À-ɏ]/.test(p)],
];
const isStrong = (p) => RULES.every(([, , test]) => test(p));

export default function ChangePassword() {
  const { user, changePassword, logout } = useAuth();
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
      setError(err.message || 'Error inesperado');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-split">
      <Hero variant="user" />

      <section className="login-panel">
        <div className="login-box">
          <span className="login-kicker">PRIMER INGRESO</span>
          <h1>Crea tu contraseña</h1>
          <p className="login-sub">
            Hola, {user.displayName.split(' ')[0]}. Por seguridad, cambia la contraseña temporal
            que te entregó el organizador antes de continuar.
          </p>

          <form onSubmit={submit} className="login-form">
            <label>
              <span className="field-label">Contraseña temporal</span>
              <span className="field">
                <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
                  required autoFocus placeholder="La que te entregaron" autoComplete="current-password" />
              </span>
            </label>

            <label>
              <span className="field-label">Tu nueva contraseña</span>
              <span className="field">
                <input type={show ? 'text' : 'password'} value={next}
                  onChange={(e) => setNext(e.target.value)} minLength={8} required
                  placeholder="••••••••" autoComplete="new-password" />
                <button type="button" className="eye-btn" onClick={() => setShow(!show)}
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <EyeIcon off={show} />
                </button>
              </span>
            </label>

            <ul className="pw-checks" aria-live="polite">
              {RULES.map(([key, label, test]) => {
                const ok = test(next);
                return (
                  <li key={key} className={ok ? 'done' : ''}>
                    <span className="pw-dot">{ok ? '✓' : '·'}</span> {label}
                  </li>
                );
              })}
            </ul>

            {error && <div className="error-box">{error}</div>}

            <button className="login-cta" disabled={busy || !isStrong(next) || !current}>
              {busy ? 'Guardando…' : 'Guardar y entrar →'}
            </button>
          </form>

          <div className="login-divider" />
          <p className="login-switch">
            <button className="linklike" onClick={logout}>Salir e ingresar con otra cuenta</button>
          </p>
        </div>
      </section>
    </div>
  );
}
