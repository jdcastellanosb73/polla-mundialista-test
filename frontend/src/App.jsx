import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Matches from './pages/Matches.jsx';
import Admin from './pages/Admin.jsx';
import Leaderboard from './pages/Leaderboard.jsx';

function RequireAuth({ children, role, loginPath = '/login' }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={loginPath} state={{ from: location }} replace />;
  // UI-level guard only — the API enforces roles on every endpoint regardless.
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <nav className="nav">
      <span className="nav-brand"><span className="ball">⚽</span>Polla Mundialista</span>
      <div className="nav-links">
        <NavLink to="/" end>Partidos</NavLink>
        <NavLink to="/leaderboard">Ranking</NavLink>
        {user.role === 'Admin' && <NavLink to="/admin">Admin</NavLink>}
      </div>
      <div className="nav-user">
        <span className="who">{user.displayName}{user.role === 'Admin' ? ' · Admin' : ''}</span>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login variant="user" />} />
          <Route path="/admin/login" element={<Login variant="admin" />} />
          <Route path="/" element={<RequireAuth><Matches /></RequireAuth>} />
          <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth role="Admin" loginPath="/admin/login"><Admin /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
