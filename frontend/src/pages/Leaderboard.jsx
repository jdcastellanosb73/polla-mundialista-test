import { Fragment, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Flag } from '../flags.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

function HistoryPanel({ userId }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/api/users/${userId}/predictions`).then(setHistory).catch((e) => setError(e.message));
  }, [userId]);

  if (error) return <p className="error">{error}</p>;
  if (!history) return <div className="loading"><span className="spinner" /> Cargando historial...</div>;
  if (history.predictions.length === 0)
    return (
      <p className="muted" style={{ padding: '0.3rem 0.5rem' }}>
        Sin predicciones puntuadas todavía — solo se muestran partidos con resultado cargado.
      </p>
    );

  return (
    <table className="table table-inner">
      <thead>
        <tr>
          <th>Partido</th>
          <th>Final</th>
          <th>Predicción</th>
          <th>Puntos</th>
        </tr>
      </thead>
      <tbody>
        {history.predictions.map((p) => (
          <tr key={p.matchId}>
            <td>
              <Flag name={p.homeTeam} /> {p.homeTeam} vs <Flag name={p.awayTeam} /> {p.awayTeam}{' '}
              <span className="muted">· Grupo {p.groupCode}</span>
            </td>
            <td><strong>{p.realHomeGoals} - {p.realAwayGoals}</strong></td>
            <td>{p.predictedHomeGoals} - {p.predictedAwayGoals}</td>
            <td className="points-cell">{p.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [openUser, setOpenUser] = useState(null);

  useEffect(() => {
    api('/api/leaderboard').then(setRows).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{error}</div>;
  if (!rows) return <div className="loading"><span className="spinner" /> Cargando ranking...</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Ranking</h1>
          <p className="subtitle">
            Haz clic en un participante para ver su historial (solo partidos finalizados).
            Desempate por marcadores exactos.
          </p>
        </div>
      </div>
      <section className="card">
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="pos-cell">#</th>
              <th>Participante</th>
              <th>Puntos</th>
              <th>Exactos</th>
              <th>Puntuadas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <Fragment key={r.userId}>
                <tr className="clickable"
                  onClick={() => setOpenUser(openUser === r.userId ? null : r.userId)}>
                  <td className="pos-cell">{MEDALS[i] || i + 1}</td>
                  <td>{r.displayName}</td>
                  <td className="points-cell">{r.points}</td>
                  <td>{r.exactHits}</td>
                  <td>{r.scoredPredictions}</td>
                </tr>
                {openUser === r.userId && (
                  <tr>
                    <td colSpan={5}>
                      <HistoryPanel userId={r.userId} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
