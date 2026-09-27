import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Flag } from '../flags.jsx';
import { useLang } from '../i18n.jsx';

function Team({ name }) {
  const { team } = useLang();
  return (
    <>
      <Flag name={name} />
      <span>{team(name)}</span>
    </>
  );
}

function PointsBadge({ points }) {
  const { t } = useLang();
  if (points === null || points === undefined) return null;
  if (points === 3) return <span className="badge badge-gold">{t('mt.badge_exact')}</span>;
  if (points === 1) return <span className="badge badge-silver">{t('mt.badge_outcome')}</span>;
  return <span className="badge badge-muted">0 pts</span>;
}

function MatchRow({ match, onSaved }) {
  const { t, terr, locale } = useLang();
  const [home, setHome] = useState(match.myPrediction?.homeGoals ?? '');
  const [away, setAway] = useState(match.myPrediction?.awayGoals ?? '');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const fmtKickoff = (iso) =>
    new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await api(`/api/matches/${match.id}/prediction`, {
        method: 'PUT',
        body: { homeGoals: Number(home), awayGoals: Number(away) },
      });
      setStatus({ ok: true, msg: t('mt.saved') });
      onSaved();
    } catch (err) {
      setStatus({ ok: false, msg: terr(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="match-row">
      <div className="match-teams">
        <Team name={match.homeTeam} />
        <span className="vs">vs</span>
        <Team name={match.awayTeam} />
      </div>
      <div className="match-kickoff">{fmtKickoff(match.kickoffAt)}</div>

      {match.result ? (
        <div className="match-final">
          <span className="score">{match.result.homeGoals} - {match.result.awayGoals}</span>
          {match.myPrediction ? (
            <>
              <span className="mypred">
                {t('mt.predicted', { h: match.myPrediction.homeGoals, a: match.myPrediction.awayGoals })}
              </span>
              <PointsBadge points={match.myPrediction.points} />
            </>
          ) : (
            <span className="mypred">{t('mt.no_pred')}</span>
          )}
        </div>
      ) : match.isOpen ? (
        <div className="match-predict">
          <input type="number" min="0" max="99" value={home}
            onChange={(e) => setHome(e.target.value)} aria-label={t('mt.home_goals')} placeholder="·" />
          <span className="dash">-</span>
          <input type="number" min="0" max="99" value={away}
            onChange={(e) => setAway(e.target.value)} aria-label={t('mt.away_goals')} placeholder="·" />
          <button className="btn btn-primary btn-sm" onClick={save}
            disabled={busy || home === '' || away === ''}>
            {busy ? '...' : match.myPrediction ? t('mt.update') : t('mt.save')}
          </button>
          {match.myPrediction && !status && <span className="ok">✓</span>}
          {status && <span className={status.ok ? 'ok' : 'error'}>{status.msg}</span>}
        </div>
      ) : (
        <div className="match-final">
          <span className="badge badge-muted">{t('mt.closed')}</span>
          {match.myPrediction && (
            <span className="mypred">
              {t('mt.predicted', { h: match.myPrediction.homeGoals, a: match.myPrediction.awayGoals })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Matches() {
  const { t, terr } = useLang();
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  const load = () =>
    api('/api/matches').then(setMatches).catch(setError);

  useEffect(() => {
    load();
  }, []);

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{terr(error)}</div>;
  if (!matches) return <div className="loading"><span className="spinner" /> {t('mt.loading')}</div>;

  const groups = [...new Set(matches.map((m) => m.groupCode))].sort();
  const open = matches.filter((m) => m.isOpen);
  const predicted = open.filter((m) => m.myPrediction);

  return (
    <div>
      <span className="page-kicker">{t('dash.kicker')}</span>
      <div className="page-head">
        <div>
          <h1>{t('mt.title')}</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>{t('mt.rules')}</p>
        </div>
        <span className="progress-chip">
          {t('mt.progress', { a: predicted.length, b: open.length })}
        </span>
      </div>

      {groups.map((g) => (
        <section key={g} className="card">
          <div className="group-head">
            <h2>{t('mt.group', { g })}</h2>
            <span className="group-tag">{t('mt.group_stage')}</span>
          </div>
          {matches
            .filter((m) => m.groupCode === g)
            .map((m) => (
              <MatchRow key={m.id} match={m} onSaved={load} />
            ))}
        </section>
      ))}
    </div>
  );
}
