import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { initialsOf } from '../Shell.jsx';

// Organizer's participant management (private-group model): create accounts
// with a one-time temp password and see the group's onboarding status.

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

export default function AdminParticipants() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ email: '', displayName: '' });
  const [created, setCreated] = useState(null); // { user, tempPassword }
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api('/api/admin/users').then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setCreated(null);
    setCopied(false);
    setBusy(true);
    try {
      const res = await api('/api/admin/users', { method: 'POST', body: form });
      setCreated(res);
      setForm({ email: '', displayName: '' });
      load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyCreds = async () => {
    try {
      await navigator.clipboard.writeText(
        `Polla Mundialista — tu acceso\nUsuario: ${created.user.email}\nContraseña temporal: ${created.tempPassword}\n(Deberás cambiarla en tu primer ingreso)`,
      );
      setCopied(true);
    } catch { /* clipboard no disponible */ }
  };

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{error}</div>;
  if (!users) return <div className="loading"><span className="spinner" /> Cargando participantes…</div>;

  const pending = users.filter((u) => u.mustChangePassword).length;

  return (
    <>
      <span className="page-kicker">CENTRO DE CONTROL · MUNDIAL 2026</span>
      <h1>Participantes</h1>
      <p className="page-sub">
        Es una polla privada: tú creas cada cuenta y entregas la contraseña temporal.
      </p>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Grupo de participantes</h2>
            <span className="jornada-chip">{users.length} en total · {pending} sin primer ingreso</span>
          </div>
          <p className="panel-sub">El estado cambia cuando definen su propia contraseña.</p>

          {users.length === 0 && <p className="lb-empty">Aún no has creado participantes.</p>}
          {users.map((u) => (
            <div className="part-row" key={u.id}>
              <span className="lb-avatar" style={{ background: 'var(--navy-2)' }}>{initialsOf(u.displayName)}</span>
              <span className="part-info">
                <span className="part-name">{u.displayName}</span>
                <span className="part-email">{u.email}</span>
              </span>
              {u.mustChangePassword
                ? <span className="badge badge-muted">Pendiente de primer ingreso</span>
                : <span className="badge badge-open">Cuenta activa</span>}
              <span className="part-date">{fmtDate(u.createdAt)}</span>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Crear participante</h2>
          </div>
          <p className="panel-sub">Se genera una contraseña temporal que verás una sola vez.</p>

          <form onSubmit={submit} className="login-form">
            <label>
              <span className="field-label">Nombre para el ranking</span>
              <span className="field">
                <input value={form.displayName} required minLength={2} maxLength={60}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Como se verá en el ranking" />
              </span>
            </label>
            <label>
              <span className="field-label">Correo electrónico</span>
              <span className="field">
                <input type="email" value={form.email} required
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="participante@correo.com" />
              </span>
            </label>

            {status && <div className="error-box">{status}</div>}

            <button className="btn btn-primary result-save" disabled={busy || !form.email || !form.displayName}>
              {busy ? 'Creando…' : 'Crear participante'}
            </button>
          </form>

          {created && (
            <div className="temp-cred">
              <strong>✓ {created.user.displayName} creado</strong>
              <p>Entrega estas credenciales — la contraseña temporal <em>no se puede volver a consultar</em>:</p>
              <div className="temp-cred-box">
                <span>{created.user.email}</span>
                <code>{created.tempPassword}</code>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={copyCreds}>
                {copied ? '✓ Copiado' : 'Copiar credenciales'}
              </button>
              <p className="muted" style={{ fontSize: '0.78rem', marginBottom: 0 }}>
                En su primer ingreso el sistema le exigirá crear su propia contraseña.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
