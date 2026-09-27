import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ChampionModal, championSeen, markChampionSeen } from '../Modals.jsx';
import { TrophyIcon, ChartIcon } from '../icons.jsx';
import { Flag } from '../flags.jsx';
import { useLang } from '../i18n.jsx';

// Organizer home: live stats, result loading with a match selector and a big
// score preview (design system), and a real activity feed derived from the
// data (loaded results + current leader) — nothing is faked.

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17" aria-hidden="true">
    <path d="M12 3 5 6v5c0 4.4 3 8.4 7 9.6 4-1.2 7-5.2 7-9.6V6l-7-3Z" />
    <path d="m9.2 12 2 2 3.6-4" />
  </svg>
);

const timeAgoT = (iso, t) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t('time.now');
  if (s < 3600) return t('time.min', { n: Math.round(s / 60) });
  if (s < 86400) return t('time.hour', { n: Math.round(s / 3600) });
  return t('time.day', { n: Math.round(s / 86400) });
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t, terr, team, locale } = useLang();
  const timeAgo = (iso) => timeAgoT(iso, t);
  const fmtKickoff = (iso) =>
    new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const [showChampion, setShowChampion] = useState(false);
  const [matches, setMatches] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([api('/api/matches'), api('/api/leaderboard')])
      .then(([ms, lb]) => {
        setMatches(ms);
        setLeaders(lb);
        const done = ms.length > 0 && ms.every((m) => m.result);
        if (done && !championSeen(user.id)) setShowChampion(true);
      })
      .catch(setError);

  useEffect(() => { load(); }, []);

  const selected = useMemo(
    () => matches?.find((m) => String(m.id) === selectedId) || null,
    [matches, selectedId],
  );

  const pick = (id) => {
    setSelectedId(id);
    setStatus(null);
    const m = matches.find((x) => String(x.id) === id);
    setHome(m?.result ? String(m.result.homeGoals) : '');
    setAway(m?.result ? String(m.result.awayGoals) : '');
  };

  const save = async () => {
    if (selected.result && !window.confirm(t('ad.confirm'))) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await api(`/api/matches/${selected.id}/result`, {
        method: 'POST',
        body: { homeGoals: Number(home), awayGoals: Number(away) },
      });
      setStatus({ ok: true, msg: t('ad.saved', { n: res.predictionsScored }) });
      load();
    } catch (err) {
      setStatus({ ok: false, msg: terr(err) });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{terr(error)}</div>;
  if (!matches) return <div className="loading"><span className="spinner" /> {t('ad.loading')}</div>;

  const finished = matches.filter((m) => m.result);
  const lastLoaded = [...finished].sort((a, b) => (b.result.loadedAt || '').localeCompare(a.result.loadedAt || ''));
  const leader = leaders[0];

  const activity = [
    ...(leader && leader.points > 0 ? [{
      icon: <TrophyIcon size={16} />,
      title: t('ad.leads', { name: leader.displayName }),
      detail: t('ad.points_acc', { n: leader.points }),
      time: t('time.now'),
      key: 'leader',
    }] : []),
    ...lastLoaded.slice(0, 5).map((m) => ({
      icon: <ChartIcon size={16} />,
      title: `${team(m.homeTeam)} ${m.result.homeGoals} — ${m.result.awayGoals} ${team(m.awayTeam)}`,
      detail: t('ad.result_loaded'),
      time: m.result.loadedAt ? timeAgo(m.result.loadedAt) : '',
      key: `m${m.id}`,
    })),
  ];

  return (
    <>
      {showChampion && leaders[0] && (
        <ChampionModal champion={leaders[0]} isYou={false}
          onClose={() => { markChampionSeen(user.id); setShowChampion(false); }} />
      )}

      <span className="page-kicker">{t('hero.kicker_admin')}</span>
      <h1>{t('ad.hello')}</h1>
      <p className="page-sub">{t('ad.sub')}</p>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">{t('ad.participants')}</div>
          <div className="stat-value">{leaders.length}</div>
          <div className="stat-hint">{t('ad.in_ranking')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('ad.finished')}</div>
          <div className="stat-value">{finished.length}</div>
          <div className="stat-hint">{t('ad.of_scheduled', { n: matches.length })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('ad.last_update')}</div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>
            {lastLoaded[0]?.result.loadedAt ? timeAgo(lastLoaded[0].result.loadedAt) : t('ad.no_results')}
          </div>
          <div className="stat-hint">
            {lastLoaded[0] ? t('ad.synced') : t('ad.load_first')}
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>{t('ad.load_result')}</h2>
            <span className="jornada-chip">{t('ad.group_stage_chip')}</span>
          </div>
          <p className="panel-sub">{t('ad.update_score')}</p>

          <label className="field-label" htmlFor="match-select">{t('ad.match')}</label>
          <select id="match-select" className="result-select" value={selectedId}
            onChange={(e) => pick(e.target.value)}>
            <option value="">{t('ad.select')}</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {team(m.homeTeam)} vs {team(m.awayTeam)} · {fmtKickoff(m.kickoffAt)}
                {m.result ? ` · ${t('ad.finished_opt')} ${m.result.homeGoals}-${m.result.awayGoals}` : ''}
              </option>
            ))}
          </select>

          {selected && (
            <>
              <div className="score-preview">
                <div className="score-team">
                  <span className="score-team-name"><Flag name={selected.homeTeam} /> {team(selected.homeTeam)}</span>
                  <input className="score-input" type="number" min="0" max="99" value={home}
                    onChange={(e) => setHome(e.target.value)} aria-label={t('ad.goals_of', { t: team(selected.homeTeam) })} placeholder="·" />
                </div>
                <span className="score-sep">—</span>
                <div className="score-team">
                  <span className="score-team-name"><Flag name={selected.awayTeam} /> {team(selected.awayTeam)}</span>
                  <input className="score-input" type="number" min="0" max="99" value={away}
                    onChange={(e) => setAway(e.target.value)} aria-label={t('ad.goals_of', { t: team(selected.awayTeam) })} placeholder="·" />
                </div>
              </div>

              {status && <div className={status.ok ? 'ok' : 'error-box'} style={{ marginBottom: '0.8rem' }}>{status.msg}</div>}

              <button className="btn btn-primary result-save" onClick={save}
                disabled={busy || home === '' || away === ''}>
                {busy ? t('ad.saving') : selected.result ? t('ad.correct') : t('ad.save')}
              </button>
            </>
          )}

          <div className="result-note">
            <ShieldIcon />
            {t('ad.note')}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>{t('ad.activity')}</h2>
          </div>
          <p className="panel-sub">{t('ad.happening')}</p>
          {activity.length === 0 && <p className="lb-empty">{t('ad.no_activity')}</p>}
          {activity.map((a) => (
            <div className="act-item" key={a.key}>
              <span className="act-icon">{a.icon}</span>
              <div className="act-body">
                <strong>{a.title}</strong>
                <span>{a.detail}</span>
              </div>
              <span className="act-time">{a.time}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
