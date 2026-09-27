import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { initialsOf } from '../Shell.jsx';
import { Flag } from '../flags.jsx';
import {
  ChampionModal, ResultsSummaryModal,
  championSeen, markChampionSeen, markSeen, readSeen,
} from '../Modals.jsx';

// Participant home: greeting, live stats and an ACTIVE leaderboard — avatars,
// crown for the leader, points bars relative to the top score, own row
// highlighted, search, and inline expandable history per participant.

const AVATAR_HUES = [210, 160, 265, 20, 330, 95, 45, 190];
const hueOf = (name) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_HUES[h % AVATAR_HUES.length];
};

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);

function HistoryItems({ predictions, compact }) {
  if (!predictions.length)
    return <p className="lb-empty">Sin predicciones puntuadas todavía — se muestran solo partidos finalizados.</p>;
  return predictions.map((p) => {
    const label = p.points === 3
      ? ['exact', 'Acertaste el marcador']
      : p.points === 1 ? ['outcome', 'Acertaste el resultado'] : ['miss', 'No acertaste'];
    return (
      <div className="hist-item" key={p.matchId}>
        <div className="hist-teams">
          <span><Flag name={p.homeTeam} /> {p.homeTeam}</span>
          <span className="vs">vs</span>
          <span>{p.awayTeam} <Flag name={p.awayTeam} /></span>
        </div>
        <div className="hist-line">
          <span className="hist-score">{p.realHomeGoals} — {p.realAwayGoals}</span>
          <span className={`hist-label ${label[0]}`}>{label[1]}</span>
          <span className="hist-pts">+{p.points} pts</span>
        </div>
        {!compact && (
          <div className="hist-pred">Tu predicción: {p.predictedHomeGoals} — {p.predictedAwayGoals}</div>
        )}
      </div>
    );
  });
}

function LeaderboardRow({ row, rank, isMe, leaderPoints, open, onToggle }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (open && !history)
      api(`/api/users/${row.userId}/predictions`).then(setHistory).catch(() => setHistory({ predictions: [] }));
  }, [open, history, row.userId]);

  const pct = leaderPoints > 0 ? Math.max((row.points / leaderPoints) * 100, row.points > 0 ? 8 : 0) : 0;

  return (
    <>
      <div className={`lb-row${isMe ? ' me' : ''}${open ? ' open' : ''}`} onClick={onToggle}
        role="button" aria-expanded={open}>
        <span className={`lb-rank${rank <= 3 ? ` top${rank}` : ''}`}>{rank}</span>
        <span className="lb-avatar" style={{ background: `hsl(${hueOf(row.displayName)} 45% 45%)` }}>
          {rank === 1 && <span className="lb-crown">👑</span>}
          {initialsOf(row.displayName)}
        </span>
        <span className="lb-info">
          <span className="lb-name">
            {row.displayName}
            {isMe && <span className="you-chip">TÚ</span>}
          </span>
          <span className="lb-sub">{row.exactHits} marcadores exactos · {row.scoredPredictions} puntuadas</span>
          <span className="lb-track"><span className="lb-fill" style={{ width: `${pct}%` }} /></span>
        </span>
        <span className="lb-pts">{row.points} <small>pts</small></span>
        <span className="lb-chevron">›</span>
      </div>
      {open && (
        <div className="lb-expand">
          {history === null
            ? <div className="loading"><span className="spinner" /> Cargando historial…</div>
            : <HistoryItems predictions={history.predictions} compact />}
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [myHistory, setMyHistory] = useState(null);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [openUser, setOpenUser] = useState(null);
  const [popup, setPopup] = useState(null); // {type:'results', items} | {type:'champion'}

  useEffect(() => {
    Promise.all([
      api('/api/leaderboard'),
      api(`/api/users/${user.id}/predictions`),
      api('/api/matches'),
    ])
      .then(([lb, hist, ms]) => {
        setRows(lb);
        setMyHistory(hist);
        setMatches(ms);

        // Post-result popups: newly scored matches first, champion afterwards.
        const finished = ms.filter((m) => m.result);
        const seen = readSeen(user.id);
        const newly = finished.filter((m) => seen[m.id] !== m.result.loadedAt);
        const done = ms.length > 0 && finished.length === ms.length;
        if (newly.length > 0) setPopup({ type: 'results', items: newly, done });
        else if (done && !championSeen(user.id)) setPopup({ type: 'champion' });
      })
      .catch((e) => setError(e.message));
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

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{error}</div>;
  if (!rows) return <div className="loading"><span className="spinner" /> Cargando tu polla…</div>;

  const myIndex = rows.findIndex((r) => r.userId === user.id);
  const me = rows[myIndex];
  const leaderPoints = rows[0]?.points ?? 0;
  const firstName = user.displayName.split(' ')[0];
  const filtered = rows
    .map((r, i) => ({ row: r, rank: i + 1 }))
    .filter(({ row }) => row.displayName.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      {popup?.type === 'results' && (
        <ResultsSummaryModal items={popup.items} totalPoints={me?.points ?? 0} onClose={closeResults} />
      )}
      {popup?.type === 'champion' && rows[0] && (
        <ChampionModal champion={rows[0]} isYou={rows[0].userId === user.id} onClose={closeChampion} />
      )}

      <span className="page-kicker">MUNDIAL 2026 · POLLA OFICIAL</span>
      <h1>Hola, {firstName}</h1>
      <p className="page-sub">Así va tu participación en el torneo.</p>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Tu posición</div>
          <div className="stat-value">#{myIndex + 1}</div>
          <div className="stat-hint">de {rows.length} participantes</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Puntos acumulados</div>
          <div className="stat-value">{me?.points ?? 0}</div>
          <div className="stat-hint">en {me?.scoredPredictions ?? 0} predicciones puntuadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Marcadores exactos</div>
          <div className="stat-value">{me?.exactHits ?? 0}</div>
          <div className="stat-hint">de {me?.scoredPredictions ?? 0} partidos jugados</div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Leaderboard</h2>
            <Link className="panel-link" to="/pronosticos">Hacer pronósticos →</Link>
          </div>
          <p className="panel-sub">La carrera por el primer lugar — toca un participante para ver su historial.</p>

          <div className="lb-search">
            <SearchIcon />
            <input placeholder="Buscar participante" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          {filtered.length === 0 && <p className="lb-empty">Nadie coincide con "{query}".</p>}
          {filtered.map(({ row, rank }) => (
            <LeaderboardRow key={row.userId} row={row} rank={rank}
              isMe={row.userId === user.id} leaderPoints={leaderPoints}
              open={openUser === row.userId}
              onToggle={() => setOpenUser(openUser === row.userId ? null : row.userId)} />
          ))}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Tu historial</h2>
          </div>
          <p className="panel-sub">Predicciones y resultados</p>
          {myHistory === null
            ? <div className="loading"><span className="spinner" /></div>
            : <HistoryItems predictions={myHistory.predictions} />}
          <p style={{ marginTop: '0.9rem', marginBottom: 0 }}>
            <Link className="panel-link" to="/pronosticos">Ver todos mis pronósticos →</Link>
          </p>
        </section>
      </div>
    </>
  );
}
