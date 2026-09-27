import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Shell from './Shell.jsx';
import Login from './pages/Login.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Matches from './pages/Matches.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminRanking from './pages/AdminRanking.jsx';
import AdminParticipants from './pages/AdminParticipants.jsx';

function RequireAuth({ children, role, denyRole, denyTo, loginPath = '/login' }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={loginPath} state={{ from: location }} replace />;
  // First-login password change pending: the server refuses everything else anyway.
  if (user.mustChangePassword) return <Navigate to="/cambiar-contrasena" replace />;
  // UI-level guards only — the API enforces roles on every endpoint regardless.
  if (role && user.role !== role) return <Navigate to="/" replace />;
  if (denyRole && user.role === denyRole) return <Navigate to={denyTo || '/'} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public access pages (own full-screen layout) */}
      <Route path="/login" element={<Login variant="user" />} />
      <Route path="/admin/login" element={<Login variant="admin" />} />
      <Route path="/cambiar-contrasena" element={<ChangePassword />} />

      {/* Participant area (sidebar shell) — organizers live in /admin */}
      <Route element={<RequireAuth denyRole="Admin" denyTo="/admin"><Shell /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pronosticos" element={<Matches />} />
      </Route>

      {/* Organizer area */}
      <Route element={<RequireAuth role="Admin" loginPath="/admin/login"><Shell /></RequireAuth>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/ranking" element={<AdminRanking />} />
        <Route path="/admin/participantes" element={<AdminParticipants />} />
      </Route>

      {/* Legacy paths */}
      <Route path="/leaderboard" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
