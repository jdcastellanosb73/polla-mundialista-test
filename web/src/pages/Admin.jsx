import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Flag } from '../flags.jsx';

function ResultRow({ match, onSaved }) {
  const [home, setHome] = useState(match.result?.homeGoals ?? '');
  const [away, setAway] = useState(match.result?.awayGoals ?? '');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (match.result && !window.confirm(
      'Este partido ya tiene resultado. Corregirlo recalculará los puntos de todas las predicciones. ¿Continuar?'
    )) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await api(`/api/matches/${match.id}/result`, {
        method: 'POST',
        body: { homeGoals: Number(home), awayGoals: Number(away) },
      });
      setStatus({ ok: true, msg: `✓ ${res.predictionsScored} predicciones puntuadas` });
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
        <Flag name={match.homeTeam} />
        <span>{match.homeTeam}</span>
        <span className="vs">vs</span>
        <Flag name={match.awayTeam} />
        <span>{match.awayTeam}</span>
      </div>
      <div className="match-kickoff">
        Grupo {match.groupCode}
        {match.result
          ? <span className="badge badge-open" style={{ marginLeft: '0.5rem' }}>Resultado cargado</span>
          : <span className="badge badge-muted" style={{ marginLeft: '0.5rem' }}>Pendiente</span>}
      </div>
      <div className="match-predict">
        <input type="number" min="0" max="99" value={home}
          onChange={(e) => setHome(e.target.value)} aria-label="Goles local (real)" placeholder="·" />
        <span className="dash">-</span>
        <input type="number" min="0" max="99" value={away}
          onChange={(e) => setAway(e.target.value)} aria-label="Goles visitante (real)" placeholder="·" />
        <button className="btn btn-primary btn-sm" onClick={save}
          disabled={busy || home === '' || away === ''}>
          {busy ? '...' : match.result ? 'Corregir' : 'Guardar resultado'}
        </button>
        {status && <span className={status.ok ? 'ok' : 'error'}>{status.msg}</span>}
      </div>
    </div>
  );
}

export default function Admin() {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);

  const load = () =>
    api('/api/matches').then(setMatches).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{error}</div>;
  if (!matches) return <div className="loading"><span className="spinner" /> Cargando...</div>;

  const loaded = matches.filter((m) => m.result).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Panel de administración</h1>
          <p className="subtitle">
            Al guardar un resultado se puntúan todas las predicciones del partido.
            Corregir es seguro: el recálculo es idempotente.
          </p>
        </div>
        <span className="progress-chip">{loaded}/{matches.length} resultados cargados</span>
      </div>
      <section className="card">
        {matches.map((m) => (
          <ResultRow key={m.id} match={m} onSaved={load} />
        ))}
      </section>
    </div>
  );
}
