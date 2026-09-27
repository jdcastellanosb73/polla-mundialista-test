import { Flag } from './flags.jsx';
import { TrophyIcon, ListIcon } from './icons.jsx';
import { useLang } from './i18n.jsx';

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
  const { t } = useLang();
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={label}>
      <div className="modal-card">
        {children}
        <button className="btn btn-primary modal-close" onClick={onClose}>{t('md.ok')}</button>
      </div>
    </div>
  );
}

const pointsLabel = (p, t) =>
  p === 3 ? ['exact', t('md.label_exact'), '+3 pts']
    : p === 1 ? ['outcome', t('md.label_outcome'), '+1 pt']
    : p === 0 ? ['miss', t('md.label_miss'), '+0 pts']
    : ['miss', t('md.label_nopred'), '+0 pts'];

/** Newly scored matches since the user's last visit + running total. */
export function ResultsSummaryModal({ items, totalPoints, onClose }) {
  const { t, team } = useLang();
  const earned = items.reduce((s, m) => s + (m.myPrediction?.points ?? 0), 0);
  return (
    <ModalShell onClose={onClose} label={t('md.results_label')}>
      <div className="modal-head">
        <span className="modal-icon"><ListIcon size={26} /></span>
        <h2>{t('md.news')}</h2>
        <p className="muted">
          {items.length === 1 ? t('md.played_one') : t('md.played_many', { n: items.length })}
        </p>
      </div>

      {items.map((m) => {
        const [cls, label, pts] = pointsLabel(m.myPrediction ? m.myPrediction.points : null, t);
        return (
          <div className="hist-item" key={m.id}>
            <div className="hist-teams">
              <span><Flag name={m.homeTeam} /> {team(m.homeTeam)}</span>
              <span className="vs">vs</span>
              <span>{team(m.awayTeam)} <Flag name={m.awayTeam} /></span>
            </div>
            <div className="hist-line">
              <span className="hist-score">{m.result.homeGoals} — {m.result.awayGoals}</span>
              <span className={`hist-label ${cls}`}>{label}</span>
              <span className="hist-pts">{pts}</span>
            </div>
            {m.myPrediction && (
              <div className="hist-pred">{t('md.your_pred_line', { h: m.myPrediction.homeGoals, a: m.myPrediction.awayGoals })}</div>
            )}
          </div>
        );
      })}

      <div className="modal-total">
        <span>{t('md.earned')} <strong>+{earned} pts</strong> {t('md.batch')}</span>
        <span>{t('md.total')} <strong>{totalPoints} pts</strong></span>
      </div>
    </ModalShell>
  );
}

/** One-time tournament champion announcement (participants and organizer). */
export function ChampionModal({ champion, isYou, onClose }) {
  const { t } = useLang();
  return (
    <ModalShell onClose={onClose} label={t('md.champ_label')}>
      <div className="modal-head champion">
        <span className="modal-icon big"><TrophyIcon size={34} /></span>
        <h2>{isYou ? t('md.champ_you') : t('md.champ_other')}</h2>
        <p className="muted">{t('md.all_done')}</p>
      </div>
      <div className="champion-card">
        <div className="champion-name">{champion.displayName}</div>
        <div className="champion-stats">
          <span><strong>{champion.points}</strong> {t('md.points')}</span>
          <span><strong>{champion.exactHits}</strong> {t('md.exact_hits')}</span>
        </div>
        <div className="muted" style={{ fontSize: '0.8rem' }}>{t('md.tiebreak')}</div>
      </div>
      {isYou && <p className="champion-cheer">{t('md.cheer')}</p>}
    </ModalShell>
  );
}
