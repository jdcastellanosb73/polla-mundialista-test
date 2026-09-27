import { useEffect, useState } from 'react';
import { api } from './api.js';
import { initialsOf } from './Shell.jsx';
import { Flag } from './flags.jsx';
import { CrownIcon } from './icons.jsx';
import { useLang } from './i18n.jsx';

// Shared leaderboard: avatars, crown for the leader, points bars relative to
// the top score, search, and inline expandable history per participant.
// Used by the participant dashboard and the organizer's Ranking page.

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

// `own` switches the labels to second person ("Acertaste…") for the signed-in
// user's rows; anyone else's history reads in third person ("Acertó…").
export function HistoryItems({ predictions, compact, own }) {
  const { t, team } = useLang();
  if (!predictions.length)
    return <p className="lb-empty">{t('hist.empty')}</p>;
  const suffix = own ? 'you' : 'other';
  return predictions.map((p) => {
    const label = p.points === 3
      ? ['exact', t(`hist.exact_${suffix}`)]
      : p.points === 1 ? ['outcome', t(`hist.outcome_${suffix}`)] : ['miss', t(`hist.miss_${suffix}`)];
    return (
      <div className="hist-item" key={p.matchId}>
        <div className="hist-teams">
          <span><Flag name={p.homeTeam} /> {team(p.homeTeam)}</span>
          <span className="vs">vs</span>
          <span>{team(p.awayTeam)} <Flag name={p.awayTeam} /></span>
        </div>
        <div className="hist-line">
          <span className="hist-score">{p.realHomeGoals} — {p.realAwayGoals}</span>
          <span className={`hist-label ${label[0]}`}>{label[1]}</span>
          <span className="hist-pts">+{p.points} pts</span>
        </div>
        {!compact && own && (
          <div className="hist-pred">{t('hist.your_pred', { h: p.predictedHomeGoals, a: p.predictedAwayGoals })}</div>
        )}
      </div>
    );
  });
}

function LeaderboardRow({ row, rank, isMe, leaderPoints, open, onToggle }) {
  const { t } = useLang();
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
          {rank === 1 && <span className="lb-crown"><CrownIcon size={14} /></span>}
          {initialsOf(row.displayName)}
        </span>
        <span className="lb-info">
          <span className="lb-name">
            {row.displayName}
            {isMe && <span className="you-chip">{t('dash.you')}</span>}
          </span>
          <span className="lb-sub">{t('dash.sub_row', { e: row.exactHits, s: row.scoredPredictions })}</span>
          <span className="lb-track"><span className="lb-fill" style={{ width: `${pct}%` }} /></span>
        </span>
        <span className="lb-pts">{row.points} <small>pts</small></span>
        <span className="lb-chevron">›</span>
      </div>
      {open && (
        <div className="lb-expand">
          {history === null
            ? <div className="loading"><span className="spinner" /> {t('dash.loading_history')}</div>
            : <HistoryItems predictions={history.predictions} compact own={isMe} />}
        </div>
      )}
    </>
  );
}

export function LeaderboardPanel({ rows, meId }) {
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [openUser, setOpenUser] = useState(null);

  const leaderPoints = rows[0]?.points ?? 0;
  const filtered = rows
    .map((r, i) => ({ row: r, rank: i + 1 }))
    .filter(({ row }) => row.displayName.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <div className="lb-search">
        <SearchIcon />
        <input placeholder={t('dash.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 && <p className="lb-empty">{t('dash.no_match', { q: query })}</p>}
      {filtered.map(({ row, rank }) => (
        <LeaderboardRow key={row.userId} row={row} rank={rank}
          isMe={row.userId === meId} leaderPoints={leaderPoints}
          open={openUser === row.userId}
          onToggle={() => setOpenUser(openUser === row.userId ? null : row.userId)} />
      ))}
    </>
  );
}
