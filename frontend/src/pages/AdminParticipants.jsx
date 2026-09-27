import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { initialsOf } from '../Shell.jsx';
import { useLang } from '../i18n.jsx';

// Organizer's participant management (private-group model): create accounts
// with a one-time temp password and see the group's onboarding status.

export default function AdminParticipants() {
  const { t, terr, locale } = useLang();
  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ email: '', displayName: '' });
  const [created, setCreated] = useState(null); // { user, tempPassword }
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api('/api/admin/users').then(setUsers).catch(setError);
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
      setStatus(terr(err));
    } finally {
      setBusy(false);
    }
  };

  const copyCreds = async () => {
    try {
      await navigator.clipboard.writeText(
        t('ap.cred_text', { email: created.user.email, temp: created.tempPassword }),
      );
      setCopied(true);
    } catch { /* clipboard unavailable */ }
  };

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{terr(error)}</div>;
  if (!users) return <div className="loading"><span className="spinner" /> {t('ap.loading')}</div>;

  const pending = users.filter((u) => u.mustChangePassword).length;

  return (
    <>
      <span className="page-kicker">{t('hero.kicker_admin')}</span>
      <h1>{t('shell.nav_participants')}</h1>
      <p className="page-sub">{t('ap.sub')}</p>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>{t('ap.group')}</h2>
            <span className="jornada-chip">{t('ap.total_chip', { n: users.length, p: pending })}</span>
          </div>
          <p className="panel-sub">{t('ap.status_hint')}</p>

          {users.length === 0 && <p className="lb-empty">{t('ap.none')}</p>}
          {users.map((u) => (
            <div className="part-row" key={u.id}>
              <span className="lb-avatar" style={{ background: 'var(--navy-2)' }}>{initialsOf(u.displayName)}</span>
              <span className="part-info">
                <span className="part-name">{u.displayName}</span>
                <span className="part-email">{u.email}</span>
              </span>
              {u.mustChangePassword
                ? <span className="badge badge-muted">{t('ap.pending')}</span>
                : <span className="badge badge-open">{t('ap.active')}</span>}
              <span className="part-date">{fmtDate(u.createdAt)}</span>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>{t('ap.create')}</h2>
          </div>
          <p className="panel-sub">{t('ap.create_sub')}</p>

          <form onSubmit={submit} className="login-form">
            <label>
              <span className="field-label">{t('ap.name_label')}</span>
              <span className="field">
                <input value={form.displayName} required minLength={2} maxLength={60}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder={t('ap.name_ph')} />
              </span>
            </label>
            <label>
              <span className="field-label">{t('ap.email_label')}</span>
              <span className="field">
                <input type="email" value={form.email} required
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t('ap.email_ph')} />
              </span>
            </label>

            {status && <div className="error-box">{status}</div>}

            <button className="btn btn-primary result-save" disabled={busy || !form.email || !form.displayName}>
              {busy ? t('ap.creating') : t('ap.create')}
            </button>
          </form>

          {created && (
            <div className="temp-cred">
              <strong>{t('ap.created', { name: created.user.displayName })}</strong>
              <p>{t('ap.hand_over_a')}<em>{t('ap.hand_over_b')}</em>:</p>
              <div className="temp-cred-box">
                <span>{created.user.email}</span>
                <code>{created.tempPassword}</code>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={copyCreds}>
                {copied ? t('ap.copied') : t('ap.copy')}
              </button>
              <p className="muted" style={{ fontSize: '0.78rem', marginBottom: 0 }}>
                {t('ap.first_note')}
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
