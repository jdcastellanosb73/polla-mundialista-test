import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Matches from './pages/Matches.jsx';

function RequireAuth({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
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
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Matches /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
