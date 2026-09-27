import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { LeaderboardPanel } from '../LeaderboardPanel.jsx';
import { useLang } from '../i18n.jsx';

// Organizer's view of the global ranking, with the same expandable per-user
// history the participants see. Polls every 30s so results loaded from the
// other tab reflect here without a manual reload.

export default function AdminRanking() {
  const { user } = useAuth();
  const { t, terr } = useLang();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let hasData = false;
    const load = () => api('/api/leaderboard')
      .then((lb) => { if (!cancelled) { hasData = true; setRows(lb); } })
      .catch((e) => { if (!cancelled && !hasData) setError(e); });
    load();
    const timer = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{terr(error)}</div>;
  if (!rows) return <div className="loading"><span className="spinner" /> {t('dash.loading')}</div>;

  return (
    <>
      <span className="page-kicker">{t('hero.kicker_admin')}</span>
      <h1>{t('shell.nav_ranking')}</h1>
      <p className="page-sub">{t('dash.race')}</p>

      <section className="panel">
        <div className="panel-head">
          <h2>{t('dash.leaderboard')}</h2>
          <span className="jornada-chip">{t('ar.chip', { n: rows.length })}</span>
        </div>
        <LeaderboardPanel rows={rows} meId={user.id} />
      </section>
    </>
  );
}
