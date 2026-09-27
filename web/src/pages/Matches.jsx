import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Flag } from '../flags.jsx';

const fmtKickoff = (iso) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function Team({ name }) {
  return (
    <>
      <Flag name={name} />
      <span>{name}</span>
    </>
  );
}

function PointsBadge({ points }) {
  if (points === null || points === undefined) return null;
  if (points === 3) return <span className="badge badge-gold">🎯 3 pts · marcador exacto</span>;
  if (points === 1) return <span className="badge badge-silver">✔ 1 pt · acertó resultado</span>;
  return <span className="badge badge-muted">0 pts</span>;
}

function MatchRow({ match, onSaved }) {
  const [home, setHome] = useState(match.myPrediction?.homeGoals ?? '');
  const [away, setAway] = useState(match.myPrediction?.awayGoals ?? '');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await api(`/api/matches/${match.id}/prediction`, {
        method: 'PUT',
        body: { homeGoals: Number(home), awayGoals: Number(away) },
      });
      setStatus({ ok: true, msg: '✓ Guardada' });
      onSaved();
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
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
      <div className="match-kickoff">🕐 {fmtKickoff(match.kickoffAt)}</div>

      {match.result ? (
        <div className="match-final">
          <span className="score">{match.result.homeGoals} - {match.result.awayGoals}</span>
          {match.myPrediction ? (
            <>
              <span className="mypred">
                Predijiste {match.myPrediction.homeGoals}-{match.myPrediction.awayGoals}
              </span>
              <PointsBadge points={match.myPrediction.points} />
            </>
          ) : (
            <span className="mypred">Sin predicción</span>
          )}
        </div>
      ) : match.isOpen ? (
        <div className="match-predict">
          <input type="number" min="0" max="99" value={home}
            onChange={(e) => setHome(e.target.value)} aria-label="Goles local" placeholder="·" />
          <span className="dash">-</span>
          <input type="number" min="0" max="99" value={away}
            onChange={(e) => setAway(e.target.value)} aria-label="Goles visitante" placeholder="·" />
          <button className="btn btn-primary btn-sm" onClick={save}
            disabled={busy || home === '' || away === ''}>
            {busy ? '...' : match.myPrediction ? 'Actualizar' : 'Guardar'}
          </button>
          {match.myPrediction && !status && <span className="ok">✓</span>}
          {status && <span className={status.ok ? 'ok' : 'error'}>{status.msg}</span>}
        </div>
      ) : (
        <div className="match-final">
          <span className="badge badge-muted">Cerrado · esperando resultado</span>
          {match.myPrediction && (
            <span className="mypred">
              Predijiste {match.myPrediction.homeGoals}-{match.myPrediction.awayGoals}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Matches() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  const load = () =>
    api('/api/matches').then(setMatches).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{error}</div>;
  if (!matches) return <div className="loading"><span className="spinner" /> Cargando partidos...</div>;

  const groups = [...new Set(matches.map((m) => m.groupCode))].sort();
  const open = matches.filter((m) => m.isOpen);
  const predicted = open.filter((m) => m.myPrediction);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Partidos</h1>
          <p className="subtitle">3 pts marcador exacto · 1 pt resultado correcto · 0 pts fallo. Cierra al inicio de cada partido.</p>
        </div>
        <span className="progress-chip">
          {predicted.length}/{open.length} partidos abiertos predichos
        </span>
      </div>

      {groups.map((g) => (
        <section key={g} className="card">
          <div className="group-head">
            <h2>Grupo {g}</h2>
            <span className="group-tag">Fase de grupos</span>
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
