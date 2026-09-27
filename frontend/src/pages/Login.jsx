import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', displayName: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate('/');
    return null;
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.email, form.displayName, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error inesperado');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-logo"><span className="ball">⚽</span></div>
        <h1>Polla Mundialista</h1>
        <p className="subtitle">Predice los marcadores y compite con tu grupo</p>

        <div className="tabs">
          <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>
            Ingresar
          </button>
          <button className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => setMode('register')}>
            Crear cuenta
          </button>
        </div>

        <form onSubmit={submit} className="form">
          <label>
            Email
            <input type="email" value={form.email} onChange={set('email')} required autoFocus
              placeholder="tu@email.com" />
          </label>
          {mode === 'register' && (
            <label>
              Nombre para el ranking
              <input value={form.displayName} onChange={set('displayName')} minLength={2}
                maxLength={60} required placeholder="Como te verán los demás" />
            </label>
          )}
          <label>
            Contraseña
            <input type="password" value={form.password} onChange={set('password')} minLength={8}
              required placeholder="Mínimo 8 caracteres" />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Un momento...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta y jugar'}
          </button>
        </form>

        <div className="demo-box">
          <strong>Cuentas demo</strong><br />
          Usuario: <code>user@polla.dev</code> / <code>User123!</code><br />
          Admin: <code>admin@polla.dev</code> / <code>Admin123!</code>
        </div>
      </div>
    </div>
  );
}
