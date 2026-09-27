import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { api } from './api.js';
import { TrophyIcon } from './icons.jsx';
import { LangToggle, useLang } from './i18n.jsx';

// App shell after sign-in: navy sidebar (brand, user, role-aware nav, context
// card) + light content area. Matches the dashboard design system.

const RankingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
  </svg>
);
const BallIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5 8 10.4l1.5 4.6h5L16 10.4 12 7.5ZM12 3v4.5M4 9.5l4 1M20 9.5l-4 1M6.5 19l3-4M17.5 19l-3-4" />
  </svg>
);
const SummaryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 19c.7-3 3.2-4.6 6.2-4.6s5.5 1.6 6.2 4.6M16 4.6a3.4 3.4 0 0 1 0 6.8M18.4 14.6c1.6.7 2.6 2 3 4.4" />
  </svg>
);
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17" aria-hidden="true">
    <path d="M9 4H5v16h4M14 8l4 4-4 4M18 12H9" />
  </svg>
);

const fmtNext = (iso, locale) =>
  new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const initialsOf = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

export default function Shell() {
  const { user, logout } = useAuth();
  const { t, team, locale } = useLang();
  const isAdmin = user.role === 'Admin';
  const [next, setNext] = useState(null);

  useEffect(() => {
    if (isAdmin) return;
    api('/api/matches')
      .then((ms) => setNext(ms.filter((m) => m.isOpen).sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))[0] || null))
      .catch(() => {});
  }, [isAdmin]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb-brand">
          <span className="mark"><TrophyIcon size={20} /></span>
          <span className="name">polla<em>Mundial</em></span>
        </div>

        <div className="sb-user">
          <span className="sb-avatar">{initialsOf(user.displayName)}</span>
          <div>
            <div className="sb-user-name">{user.displayName}</div>
            <div className="sb-user-role">{isAdmin ? t('shell.role_admin') : t('shell.role_user')}</div>
          </div>
        </div>

        <nav className="sb-nav">
          {isAdmin ? (
            <>
              <NavLink to="/admin" end><SummaryIcon /> {t('shell.nav_summary')}</NavLink>
              <NavLink to="/admin/ranking"><RankingIcon /> {t('shell.nav_ranking')}</NavLink>
              <NavLink to="/admin/participantes"><UsersIcon /> {t('shell.nav_participants')}</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end><RankingIcon /> {t('shell.nav_ranking')}</NavLink>
              <NavLink to="/pronosticos"><BallIcon /> {t('shell.nav_predictions')}</NavLink>
            </>
          )}
        </nav>

        {isAdmin ? (
          <div className="sb-card">
            <strong>{t('shell.protected_title')}</strong>
            {t('shell.protected_sub')}
          </div>
        ) : next ? (
          <div className="sb-card">
            <strong>{t('shell.next_match')}</strong>
            <span className="hl">{team(next.homeTeam)} vs {team(next.awayTeam)}</span><br />
            {fmtNext(next.kickoffAt, locale)}
          </div>
        ) : null}

        <LangToggle dark />
        <button className="sb-logout" onClick={logout}><LogoutIcon /> {t('shell.logout')}</button>
      </aside>

      <main className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
