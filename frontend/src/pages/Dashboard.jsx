import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  ChampionModal, ResultsSummaryModal,
  championSeen, markChampionSeen, markSeen, readSeen,
} from '../Modals.jsx';
import { HistoryItems, LeaderboardPanel } from '../LeaderboardPanel.jsx';
import { useLang } from '../i18n.jsx';

// Participant home: greeting, live stats, the shared ACTIVE leaderboard and
// the user's own history. Post-result popups chain here (results → champion).

export default function Dashboard() {
  const { user } = useAuth();
  const { t, terr } = useLang();
  const [rows, setRows] = useState(null);
  const [myHistory, setMyHistory] = useState(null);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);
  const [popup, setPopup] = useState(null); // {type:'results', items} | {type:'champion'}

  // Loads data on mount and then POLLS every 30s (and on tab focus), so new
  // results appear — points, ranking and popups — without a manual reload.
  useEffect(() => {
    let cancelled = false;
    let hasData = false;

    const load = () => Promise.all([
      api('/api/leaderboard'),
      api(`/api/users/${user.id}/predictions`),
      api('/api/matches'),
    ])
      .then(([lb, hist, ms]) => {
        if (cancelled) return;
        hasData = true;
        setRows(lb);
        setMyHistory(hist);
        setMatches(ms);

        // Post-result popups: newly scored matches first, champion afterwards.
        // Never replace a popup the user is currently reading.
        const finished = ms.filter((m) => m.result);
        const seen = readSeen(user.id);
        const newly = finished.filter((m) => seen[m.id] !== m.result.loadedAt);
        const done = ms.length > 0 && finished.length === ms.length;
        setPopup((current) => {
          if (current) return current;
          if (newly.length > 0) return { type: 'results', items: newly, done };
          if (done && !championSeen(user.id)) return { type: 'champion' };
          return null;
        });
      })
      .catch((e) => { if (!cancelled && !hasData) setError(e); });

    load();
    const timer = setInterval(load, 30000);
    const onFocus = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user.id]);

  const closeResults = () => {
    markSeen(user.id, matches.filter((m) => m.result));
    if (popup.done && !championSeen(user.id)) setPopup({ type: 'champion' });
    else setPopup(null);
  };
  const closeChampion = () => {
    markChampionSeen(user.id);
    setPopup(null);
  };

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{terr(error)}</div>;
  if (!rows) return <div className="loading"><span className="spinner" /> {t('dash.loading')}</div>;

  const myIndex = rows.findIndex((r) => r.userId === user.id);
  const me = rows[myIndex];
  const firstName = user.displayName.split(' ')[0];

  return (
    <>
      {popup?.type === 'results' && (
        <ResultsSummaryModal items={popup.items} totalPoints={me?.points ?? 0} onClose={closeResults} />
      )}
      {popup?.type === 'champion' && rows[0] && (
        <ChampionModal champion={rows[0]} isYou={rows[0].userId === user.id}
          history={rows[0].userId === user.id ? myHistory?.predictions : null}
          onClose={closeChampion} />
      )}

      <span className="page-kicker">{t('dash.kicker')}</span>
      <h1>{t('dash.hello', { name: firstName })}</h1>
      <p className="page-sub">{t('dash.sub')}</p>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">{t('dash.pos')}</div>
          <div className="stat-value">#{myIndex + 1}</div>
          <div className="stat-hint">{t('dash.pos_hint', { n: rows.length })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dash.points')}</div>
          <div className="stat-value">{me?.points ?? 0}</div>
          <div className="stat-hint">{t('dash.points_hint', { n: me?.scoredPredictions ?? 0 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dash.exact')}</div>
          <div className="stat-value">{me?.exactHits ?? 0}</div>
          <div className="stat-hint">{t('dash.exact_hint', { n: me?.scoredPredictions ?? 0 })}</div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>{t('dash.leaderboard')}</h2>
            <Link className="panel-link" to="/pronosticos">{t('dash.make_predictions')}</Link>
          </div>
          <p className="panel-sub">{t('dash.race')}</p>
          <LeaderboardPanel rows={rows} meId={user.id} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>{t('dash.your_history')}</h2>
          </div>
          <p className="panel-sub">{t('dash.pred_results')}</p>
          {myHistory === null
            ? <div className="loading"><span className="spinner" /></div>
            : <HistoryItems predictions={myHistory.predictions} own />}
          <p style={{ marginTop: '0.9rem', marginBottom: 0 }}>
            <Link className="panel-link" to="/pronosticos">{t('dash.view_all')}</Link>
          </p>
        </section>
      </div>
    </>
  );
}
