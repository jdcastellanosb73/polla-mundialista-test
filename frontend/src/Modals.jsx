import { Flag } from './flags.jsx';
import { TrophyIcon, ListIcon } from './icons.jsx';

// Post-result popups: a summary of newly scored matches when the user comes
// back, and a one-time champion announcement when the tournament completes.
// "Seen" state lives in localStorage per user — simple, per-device, and enough
// for this scope (a server-side notification feed is the scaling path).

export const seenKey = (userId) => `polla.seenResults.${userId}`;
export const championKey = (userId) => `polla.championSeen.${userId}`;

export function readSeen(userId) {
  try { return JSON.parse(localStorage.getItem(seenKey(userId))) || {}; } catch { return {}; }
}
export function markSeen(userId, finishedMatches) {
  const map = {};
  for (const m of finishedMatches) map[m.id] = m.result.loadedAt;
  try { localStorage.setItem(seenKey(userId), JSON.stringify(map)); } catch { /* private mode */ }
}
export function championSeen(userId) {
  try { return localStorage.getItem(championKey(userId)) === '1'; } catch { return false; }
}
export function markChampionSeen(userId) {
  try { localStorage.setItem(championKey(userId), '1'); } catch { /* private mode */ }
}

function ModalShell({ children, onClose, label }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={label}>
      <div className="modal-card">
        {children}
        <button className="btn btn-primary modal-close" onClick={onClose}>Entendido</button>
      </div>
    </div>
  );
}

const pointsLabel = (p) =>
  p === 3 ? ['exact', 'Marcador exacto', '+3 pts']
    : p === 1 ? ['outcome', 'Acertaste el resultado', '+1 pt']
    : p === 0 ? ['miss', 'No acertaste', '+0 pts']
    : ['miss', 'Sin predicción', '+0 pts'];

/** Newly scored matches since the user's last visit + running total. */
export function ResultsSummaryModal({ items, totalPoints, onClose }) {
  const earned = items.reduce((s, m) => s + (m.myPrediction?.points ?? 0), 0);
  return (
    <ModalShell onClose={onClose} label="Resumen de resultados">
      <div className="modal-head">
        <span className="modal-icon"><ListIcon size={26} /></span>
        <h2>¡Hay resultados nuevos!</h2>
        <p className="muted">
          {items.length === 1 ? 'Se jugó 1 partido' : `Se jugaron ${items.length} partidos`} desde tu última visita.
        </p>
      </div>

      {items.map((m) => {
        const [cls, label, pts] = pointsLabel(m.myPrediction ? m.myPrediction.points : null);
        return (
          <div className="hist-item" key={m.id}>
            <div className="hist-teams">
              <span><Flag name={m.homeTeam} /> {m.homeTeam}</span>
              <span className="vs">vs</span>
              <span>{m.awayTeam} <Flag name={m.awayTeam} /></span>
            </div>
            <div className="hist-line">
              <span className="hist-score">{m.result.homeGoals} — {m.result.awayGoals}</span>
              <span className={`hist-label ${cls}`}>{label}</span>
              <span className="hist-pts">{pts}</span>
            </div>
            {m.myPrediction && (
              <div className="hist-pred">Tu predicción: {m.myPrediction.homeGoals} — {m.myPrediction.awayGoals}</div>
            )}
          </div>
        );
      })}

      <div className="modal-total">
        <span>Ganaste <strong>+{earned} pts</strong> en esta tanda</span>
        <span>Total acumulado: <strong>{totalPoints} pts</strong></span>
      </div>
    </ModalShell>
  );
}

/** One-time tournament champion announcement (participants and organizer). */
export function ChampionModal({ champion, isYou, onClose }) {
  return (
    <ModalShell onClose={onClose} label="Campeón del torneo">
      <div className="modal-head champion">
        <span className="modal-icon big"><TrophyIcon size={34} /></span>
        <h2>{isYou ? '¡Eres el campeón de la polla!' : '¡Tenemos campeón!'}</h2>
        <p className="muted">Los 12 partidos del torneo están finalizados.</p>
      </div>
      <div className="champion-card">
        <div className="champion-name">{champion.displayName}</div>
        <div className="champion-stats">
          <span><strong>{champion.points}</strong> puntos</span>
          <span><strong>{champion.exactHits}</strong> marcadores exactos</span>
        </div>
        <div className="muted" style={{ fontSize: '0.8rem' }}>Desempate por marcadores exactos.</div>
      </div>
      {isYou && <p className="champion-cheer">Nadie leyó la cancha como tú.</p>}
    </ModalShell>
  );
}
