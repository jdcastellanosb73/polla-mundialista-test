import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ChampionModal, championSeen, markChampionSeen } from '../Modals.jsx';

// Organizer home: live stats, result loading with a match selector and a big
// score preview (design system), and a real activity feed derived from the
// data (loaded results + current leader) — nothing is faked.

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17" aria-hidden="true">
    <path d="M12 3 5 6v5c0 4.4 3 8.4 7 9.6 4-1.2 7-5.2 7-9.6V6l-7-3Z" />
    <path d="m9.2 12 2 2 3.6-4" />
  </svg>
);

const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Ahora';
  if (s < 3600) return `Hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `Hace ${Math.round(s / 3600)} h`;
  return `Hace ${Math.round(s / 86400)} d`;
};

const fmtKickoff = (iso) =>
  new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function AdminDashboard() {
  const { user } = useAuth();
  const [showChampion, setShowChampion] = useState(false);
  const [matches, setMatches] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([api('/api/matches'), api('/api/leaderboard')])
      .then(([ms, lb]) => {
        setMatches(ms);
        setLeaders(lb);
        const done = ms.length > 0 && ms.every((m) => m.result);
        if (done && !championSeen(user.id)) setShowChampion(true);
      })
      .catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const selected = useMemo(
    () => matches?.find((m) => String(m.id) === selectedId) || null,
    [matches, selectedId],
  );

  const pick = (id) => {
    setSelectedId(id);
    setStatus(null);
    const m = matches.find((x) => String(x.id) === id);
    setHome(m?.result ? String(m.result.homeGoals) : '');
    setAway(m?.result ? String(m.result.awayGoals) : '');
  };

  const save = async () => {
    if (selected.result && !window.confirm(
      'Este partido ya tiene resultado. Corregirlo recalculará los puntos de todas las predicciones. ¿Continuar?'
    )) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await api(`/api/matches/${selected.id}/result`, {
        method: 'POST',
        body: { homeGoals: Number(home), awayGoals: Number(away) },
      });
      setStatus({ ok: true, msg: `✓ Resultado guardado · ${res.predictionsScored} predicciones puntuadas` });
      load();
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="error-box" style={{ marginTop: '1.5rem' }}>{error}</div>;
  if (!matches) return <div className="loading"><span className="spinner" /> Cargando el panel…</div>;

  const finished = matches.filter((m) => m.result);
  const lastLoaded = [...finished].sort((a, b) => (b.result.loadedAt || '').localeCompare(a.result.loadedAt || ''));
  const leader = leaders[0];

  const activity = [
    ...(leader && leader.points > 0 ? [{
      icon: '🏆',
      title: `${leader.displayName} lidera el ranking`,
      detail: `${leader.points} puntos acumulados`,
      time: 'Ahora',
      key: 'leader',
    }] : []),
    ...lastLoaded.slice(0, 5).map((m) => ({
      icon: '📊',
      title: `${m.homeTeam} ${m.result.homeGoals} — ${m.result.awayGoals} ${m.awayTeam}`,
      detail: 'Resultado cargado y predicciones puntuadas',
      time: m.result.loadedAt ? timeAgo(m.result.loadedAt) : '',
      key: `m${m.id}`,
    })),
  ];

  return (
    <>
      {showChampion && leaders[0] && (
        <ChampionModal champion={leaders[0]} isYou={false}
          onClose={() => { markChampionSeen(user.id); setShowChampion(false); }} />
      )}

      <span className="page-kicker">CENTRO DE CONTROL · MUNDIAL 2026</span>
      <h1>Hola, organizador</h1>
      <p className="page-sub">Gestiona los resultados y mantén la competencia al día.</p>

      <div className="stats-row">
        <div className="stat-card accent">
          <div className="stat-label">Participantes</div>
          <div className="stat-value">{leaders.length}</div>
          <div className="stat-hint">en el ranking del torneo</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Partidos finalizados</div>
          <div className="stat-value">{finished.length}</div>
          <div className="stat-hint">de {matches.length} programados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Última actualización</div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>
            {lastLoaded[0]?.result.loadedAt ? timeAgo(lastLoaded[0].result.loadedAt) : 'Sin resultados'}
          </div>
          <div className="stat-hint">
            {lastLoaded[0] ? 'Todo está sincronizado' : 'Carga el primer resultado abajo'}
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Cargar resultado</h2>
            <span className="jornada-chip">● Fase de grupos</span>
          </div>
          <p className="panel-sub">Actualiza el marcador del partido seleccionado.</p>

          <label className="field-label" htmlFor="match-select">Partido</label>
          <select id="match-select" className="result-select" value={selectedId}
            onChange={(e) => pick(e.target.value)}>
            <option value="">Selecciona un partido…</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.homeTeam} vs {m.awayTeam} · {fmtKickoff(m.kickoffAt)}
                {m.result ? ` · finalizado ${m.result.homeGoals}-${m.result.awayGoals}` : ''}
              </option>
            ))}
          </select>

          {selected && (
            <>
              <div className="score-preview">
                <div className="score-team">
                  <span className="score-team-name">{selected.homeTeam}</span>
                  <input className="score-input" type="number" min="0" max="99" value={home}
                    onChange={(e) => setHome(e.target.value)} aria-label={`Goles ${selected.homeTeam}`} placeholder="·" />
                </div>
                <span className="score-sep">—</span>
                <div className="score-team">
                  <span className="score-team-name">{selected.awayTeam}</span>
                  <input className="score-input" type="number" min="0" max="99" value={away}
                    onChange={(e) => setAway(e.target.value)} aria-label={`Goles ${selected.awayTeam}`} placeholder="·" />
                </div>
              </div>

              {status && <div className={status.ok ? 'ok' : 'error-box'} style={{ marginBottom: '0.8rem' }}>{status.msg}</div>}

              <button className="btn btn-primary result-save" onClick={save}
                disabled={busy || home === '' || away === ''}>
                {busy ? 'Guardando…' : selected.result ? 'Corregir resultado' : 'Guardar resultado'}
              </button>
            </>
          )}

          <div className="result-note">
            <ShieldIcon />
            Los cambios se reflejan automáticamente en el leaderboard de todos los participantes.
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Actividad reciente</h2>
          </div>
          <p className="panel-sub">Lo que está pasando en tu polla.</p>
          {activity.length === 0 && <p className="lb-empty">Aún no hay actividad — todo empieza con el primer resultado.</p>}
          {activity.map((a) => (
            <div className="act-item" key={a.key}>
              <span className="act-icon">{a.icon}</span>
              <div className="act-body">
                <strong>{a.title}</strong>
                <span>{a.detail}</span>
              </div>
              <span className="act-time">{a.time}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
