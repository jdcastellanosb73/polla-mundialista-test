import { createContext, useContext, useEffect, useState } from 'react';

// Lightweight i18n: a flat dictionary + context, no runtime dependency.
// Spanish is the source language; English mirrors every key. The choice is
// per-device (localStorage) and applies instantly. Team names come from the
// database in Spanish and are translated for display only, so the flag lookup
// keeps working on the original value.

const TEAMS_EN = {
  'México': 'Mexico', 'Alemania': 'Germany', 'Escocia': 'Scotland', 'Uruguay': 'Uruguay',
  'Argentina': 'Argentina', 'Francia': 'France', 'Japón': 'Japan', 'Marruecos': 'Morocco',
};

const S = {
  // Shell (sidebar)
  'shell.role_admin': { es: 'Organizador del torneo', en: 'Tournament organizer' },
  'shell.role_user': { es: 'Participante', en: 'Participant' },
  'shell.nav_summary': { es: 'Resumen', en: 'Overview' },
  'shell.nav_participants': { es: 'Participantes', en: 'Participants' },
  'shell.nav_ranking': { es: 'Ranking', en: 'Ranking' },
  'shell.nav_predictions': { es: 'Mis pronósticos', en: 'My predictions' },
  'shell.protected_title': { es: 'Panel protegido', en: 'Protected panel' },
  'shell.protected_sub': { es: 'Solo cuentas con rol de administrador.', en: 'Admin-role accounts only.' },
  'shell.next_match': { es: 'Próximo partido', en: 'Next match' },
  'shell.logout': { es: 'Cerrar sesión', en: 'Sign out' },

  // Login hero
  'hero.secure': { es: 'Entorno seguro', en: 'Secure environment' },
  'hero.kicker_admin': { es: 'CENTRO DE CONTROL · MUNDIAL 2026', en: 'CONTROL CENTER · WORLD CUP 2026' },
  'hero.kicker_user': { es: 'MUNDIAL 2026 · EDICIÓN OFICIAL', en: 'WORLD CUP 2026 · OFFICIAL EDITION' },
  'hero.title_admin_1': { es: 'Tu polla.', en: 'Your pool.' },
  'hero.title_admin_2': { es: 'Tus reglas.', en: 'Your rules.' },
  'hero.title_user_1': { es: 'Donde cada', en: 'Where every' },
  'hero.title_user_2': { es: 'pronóstico cuenta.', en: 'prediction counts.' },
  'hero.text_admin': {
    es: 'Administra los resultados, tu grupo de participantes y la emoción de cada jornada.',
    en: 'Manage the results, your group of participants and the excitement of every matchday.',
  },
  'hero.text_user': {
    es: 'Vive la pasión del fútbol, reta a tus amigos y demuestra quién sabe más de la cancha.',
    en: 'Live the passion of football, challenge your friends and prove who knows the game best.',
  },
  'hero.stat_matches': { es: 'partidos programados', en: 'scheduled matches' },
  'hero.stat_groups': { es: 'grupos en juego', en: 'groups in play' },
  'hero.stat_auto': { es: 'puntuación automática', en: 'automatic scoring' },
  'hero.stat_matches_short': { es: 'partidos', en: 'matches' },
  'hero.foot_started': { es: 'La competencia ya empezó', en: 'The competition has started' },
  'hero.foot_ready': { es: '¿Listo para jugar?', en: 'Ready to play?' },

  // Login form
  'login.kicker_admin': { es: 'ACCESO ADMINISTRATIVO', en: 'ADMIN ACCESS' },
  'login.kicker_user': { es: 'BIENVENIDO DE VUELTA', en: 'WELCOME BACK' },
  'login.title_admin': { es: 'Hola, organizador', en: 'Hello, organizer' },
  'login.title_user': { es: 'Inicia sesión', en: 'Sign in' },
  'login.sub_admin': { es: 'Ingresa tus credenciales para continuar.', en: 'Enter your credentials to continue.' },
  'login.sub_user': { es: 'Ingresa para consultar y actualizar tus pronósticos.', en: 'Sign in to check and update your predictions.' },
  'login.email_admin': { es: 'Correo de administrador', en: 'Admin email' },
  'login.email_user': { es: 'Correo electrónico', en: 'Email address' },
  'login.email_ph_admin': { es: 'admin@correo.com', en: 'admin@email.com' },
  'login.email_ph_user': { es: 'tu@correo.com', en: 'you@email.com' },
  'login.password': { es: 'Contraseña', en: 'Password' },
  'login.show_pw': { es: 'Mostrar contraseña', en: 'Show password' },
  'login.hide_pw': { es: 'Ocultar contraseña', en: 'Hide password' },
  'login.wait': { es: 'Un momento…', en: 'One moment…' },
  'login.cta_admin': { es: 'Entrar al panel →', en: 'Enter the panel →' },
  'login.cta_user': { es: 'Entrar a mi polla →', en: 'Enter my pool →' },
  'login.note_admin': {
    es: 'Este acceso está reservado para los administradores del torneo.',
    en: 'This access is reserved for tournament administrators.',
  },
  'login.note_user': {
    es: 'Es una polla privada: el organizador crea tu cuenta y te entrega la contraseña temporal.',
    en: 'This is a private pool: the organizer creates your account and hands you a temporary password.',
  },
  'login.back_participants': { es: 'Volver al acceso de participantes →', en: 'Back to participant access →' },
  'login.for_organizers': { es: 'Acceso para organizadores', en: 'Organizer access' },
  'login.go_admin': { es: 'Ir al panel admin →', en: 'Go to the admin panel →' },

  // Forced password change
  'chpw.kicker': { es: 'PRIMER INGRESO', en: 'FIRST SIGN-IN' },
  'chpw.title': { es: 'Crea tu contraseña', en: 'Create your password' },
  'chpw.sub': {
    es: 'Hola, {name}. Por seguridad, cambia la contraseña temporal que te entregó el organizador antes de continuar.',
    en: 'Hi, {name}. For security, change the temporary password the organizer gave you before continuing.',
  },
  'chpw.temp_label': { es: 'Contraseña temporal', en: 'Temporary password' },
  'chpw.temp_ph': { es: 'La que te entregaron', en: 'The one you were given' },
  'chpw.new_label': { es: 'Tu nueva contraseña', en: 'Your new password' },
  'chpw.saving': { es: 'Guardando…', en: 'Saving…' },
  'chpw.cta': { es: 'Guardar y entrar →', en: 'Save and enter →' },
  'chpw.other_account': { es: 'Salir e ingresar con otra cuenta', en: 'Sign out and use another account' },
  'chpw.r_len': { es: 'Mínimo 8 caracteres', en: 'At least 8 characters' },
  'chpw.r_upper': { es: 'Una mayúscula', en: 'One uppercase letter' },
  'chpw.r_lower': { es: 'Una minúscula', en: 'One lowercase letter' },
  'chpw.r_digit': { es: 'Un número', en: 'One number' },
  'chpw.r_symbol': { es: 'Un símbolo (!, #, $...)', en: 'One symbol (!, #, $...)' },

  // Participant dashboard
  'dash.kicker': { es: 'MUNDIAL 2026 · POLLA OFICIAL', en: 'WORLD CUP 2026 · OFFICIAL POOL' },
  'dash.hello': { es: 'Hola, {name}', en: 'Hi, {name}' },
  'dash.sub': { es: 'Así va tu participación en el torneo.', en: 'Here is how you are doing in the tournament.' },
  'dash.loading': { es: 'Cargando tu polla…', en: 'Loading your pool…' },
  'dash.pos': { es: 'Tu posición', en: 'Your position' },
  'dash.pos_hint': { es: 'de {n} participantes', en: 'of {n} participants' },
  'dash.points': { es: 'Puntos acumulados', en: 'Total points' },
  'dash.points_hint': { es: 'en {n} predicciones puntuadas', en: 'across {n} scored predictions' },
  'dash.exact': { es: 'Marcadores exactos', en: 'Exact scores' },
  'dash.exact_hint': { es: 'de {n} partidos jugados', en: 'of {n} matches played' },
  'dash.leaderboard': { es: 'Leaderboard', en: 'Leaderboard' },
  'dash.make_predictions': { es: 'Hacer pronósticos →', en: 'Make predictions →' },
  'dash.race': {
    es: 'La carrera por el primer lugar — toca un participante para ver su historial.',
    en: 'The race for first place — tap a participant to see their history.',
  },
  'dash.search': { es: 'Buscar participante', en: 'Search participant' },
  'dash.no_match': { es: 'Nadie coincide con "{q}".', en: 'No one matches "{q}".' },
  'dash.you': { es: 'TÚ', en: 'YOU' },
  'dash.sub_row': { es: '{e} marcadores exactos · {s} puntuadas', en: '{e} exact scores · {s} scored' },
  'dash.loading_history': { es: 'Cargando historial…', en: 'Loading history…' },
  'dash.your_history': { es: 'Tu historial', en: 'Your history' },
  'dash.pred_results': { es: 'Predicciones y resultados', en: 'Predictions and results' },
  'dash.view_all': { es: 'Ver todos mis pronósticos →', en: 'View all my predictions →' },

  // History labels: second person for the signed-in user's own rows, third
  // person when browsing someone else's history.
  'hist.empty': {
    es: 'Sin predicciones puntuadas todavía — se muestran solo partidos finalizados.',
    en: 'No scored predictions yet — only finished matches are shown.',
  },
  'hist.exact_you': { es: 'Acertaste el marcador', en: 'You nailed the exact score' },
  'hist.exact_other': { es: 'Acertó el marcador', en: 'Nailed the exact score' },
  'hist.outcome_you': { es: 'Acertaste el resultado', en: 'You got the outcome' },
  'hist.outcome_other': { es: 'Acertó el resultado', en: 'Got the outcome' },
  'hist.miss_you': { es: 'No acertaste', en: 'You missed' },
  'hist.miss_other': { es: 'No acertó', en: 'Missed' },
  'hist.your_pred': { es: 'Tu predicción: {h} — {a}', en: 'Your prediction: {h} — {a}' },

  // Predictions page
  'mt.loading': { es: 'Cargando partidos…', en: 'Loading matches…' },
  'mt.title': { es: 'Mis pronósticos', en: 'My predictions' },
  'mt.rules': {
    es: '3 pts marcador exacto · 1 pt resultado correcto · 0 pts fallo. Cierra al inicio de cada partido.',
    en: '3 pts exact score · 1 pt correct outcome · 0 pts miss. Locks at kickoff.',
  },
  'mt.progress': { es: '{a}/{b} partidos abiertos predichos', en: '{a}/{b} open matches predicted' },
  'mt.group': { es: 'Grupo {g}', en: 'Group {g}' },
  'mt.group_stage': { es: 'Fase de grupos', en: 'Group stage' },
  'mt.predicted': { es: 'Predijiste {h}-{a}', en: 'You predicted {h}-{a}' },
  'mt.no_pred': { es: 'Sin predicción', en: 'No prediction' },
  'mt.badge_exact': { es: '3 pts · marcador exacto', en: '3 pts · exact score' },
  'mt.badge_outcome': { es: '1 pt · acertó resultado', en: '1 pt · correct outcome' },
  'mt.closed': { es: 'Cerrado · esperando resultado', en: 'Locked · awaiting result' },
  'mt.saved': { es: '✓ Guardada', en: '✓ Saved' },
  'mt.update': { es: 'Actualizar', en: 'Update' },
  'mt.save': { es: 'Guardar', en: 'Save' },
  'mt.home_goals': { es: 'Goles local', en: 'Home goals' },
  'mt.away_goals': { es: 'Goles visitante', en: 'Away goals' },

  // Organizer dashboard
  'ad.hello': { es: 'Hola, organizador', en: 'Hello, organizer' },
  'ad.sub': { es: 'Gestiona los resultados y mantén la competencia al día.', en: 'Manage the results and keep the competition up to date.' },
  'ad.loading': { es: 'Cargando el panel…', en: 'Loading the panel…' },
  'ad.participants': { es: 'Participantes', en: 'Participants' },
  'ad.in_ranking': { es: 'en el ranking del torneo', en: 'in the tournament ranking' },
  'ad.finished': { es: 'Partidos finalizados', en: 'Finished matches' },
  'ad.of_scheduled': { es: 'de {n} programados', en: 'of {n} scheduled' },
  'ad.last_update': { es: 'Última actualización', en: 'Last update' },
  'ad.no_results': { es: 'Sin resultados', en: 'No results' },
  'ad.synced': { es: 'Todo está sincronizado', en: 'Everything is in sync' },
  'ad.load_first': { es: 'Carga el primer resultado abajo', en: 'Load the first result below' },
  'ad.load_result': { es: 'Cargar resultado', en: 'Load result' },
  'ad.group_stage_chip': { es: '● Fase de grupos', en: '● Group stage' },
  'ad.update_score': { es: 'Actualiza el marcador del partido seleccionado.', en: 'Update the score of the selected match.' },
  'ad.match': { es: 'Partido', en: 'Match' },
  'ad.select': { es: 'Selecciona un partido…', en: 'Select a match…' },
  'ad.finished_opt': { es: 'finalizado', en: 'final' },
  'ad.goals_of': { es: 'Goles {t}', en: '{t} goals' },
  'ad.confirm': {
    es: 'Este partido ya tiene resultado. Corregirlo recalculará los puntos de todas las predicciones. ¿Continuar?',
    en: "This match already has a result. Correcting it will recalculate every prediction's points. Continue?",
  },
  'ad.saved': { es: '✓ Resultado guardado · {n} predicciones puntuadas', en: '✓ Result saved · {n} predictions scored' },
  'ad.saving': { es: 'Guardando…', en: 'Saving…' },
  'ad.correct': { es: 'Corregir resultado', en: 'Correct result' },
  'ad.save': { es: 'Guardar resultado', en: 'Save result' },
  'ad.note': {
    es: 'Los cambios se reflejan automáticamente en el leaderboard de todos los participantes.',
    en: "Changes are reflected automatically on every participant's leaderboard.",
  },
  'ad.activity': { es: 'Actividad reciente', en: 'Recent activity' },
  'ad.happening': { es: 'Lo que está pasando en tu polla.', en: 'What is happening in your pool.' },
  'ad.no_activity': { es: 'Aún no hay actividad — todo empieza con el primer resultado.', en: 'No activity yet — it all starts with the first result.' },
  'ad.leads': { es: '{name} lidera el ranking', en: '{name} leads the ranking' },
  'ad.points_acc': { es: '{n} puntos acumulados', en: '{n} points so far' },
  'ad.result_loaded': { es: 'Resultado cargado y predicciones puntuadas', en: 'Result loaded and predictions scored' },
  'time.now': { es: 'Ahora', en: 'Now' },
  'time.min': { es: 'Hace {n} min', en: '{n} min ago' },
  'time.hour': { es: 'Hace {n} h', en: '{n} h ago' },
  'time.day': { es: 'Hace {n} d', en: '{n} d ago' },

  // Organizer: ranking
  'ar.chip': { es: '{n} participantes', en: '{n} participants' },

  // Organizer: participants
  'ap.sub': {
    es: 'Es una polla privada: tú creas cada cuenta y entregas la contraseña temporal.',
    en: 'This is a private pool: you create each account and hand out the temporary password.',
  },
  'ap.loading': { es: 'Cargando participantes…', en: 'Loading participants…' },
  'ap.group': { es: 'Grupo de participantes', en: 'Participant group' },
  'ap.total_chip': { es: '{n} en total · {p} sin primer ingreso', en: '{n} total · {p} pending first sign-in' },
  'ap.status_hint': { es: 'El estado cambia cuando definen su propia contraseña.', en: 'Status changes once they set their own password.' },
  'ap.none': { es: 'Aún no has creado participantes.', en: 'You have not created participants yet.' },
  'ap.pending': { es: 'Pendiente de primer ingreso', en: 'Pending first sign-in' },
  'ap.active': { es: 'Cuenta activa', en: 'Active account' },
  'ap.create': { es: 'Crear participante', en: 'Create participant' },
  'ap.create_sub': { es: 'Se genera una contraseña temporal que verás una sola vez.', en: 'A temporary password is generated and shown only once.' },
  'ap.name_label': { es: 'Nombre para el ranking', en: 'Name for the ranking' },
  'ap.name_ph': { es: 'Como se verá en el ranking', en: 'As it will appear in the ranking' },
  'ap.email_label': { es: 'Correo electrónico', en: 'Email address' },
  'ap.email_ph': { es: 'participante@correo.com', en: 'participant@email.com' },
  'ap.creating': { es: 'Creando…', en: 'Creating…' },
  'ap.created': { es: '✓ {name} creado', en: '✓ {name} created' },
  'ap.hand_over_a': { es: 'Entrega estas credenciales — la contraseña temporal ', en: 'Hand over these credentials — the temporary password ' },
  'ap.hand_over_b': { es: 'no se puede volver a consultar', en: 'cannot be retrieved again' },
  'ap.copy': { es: 'Copiar credenciales', en: 'Copy credentials' },
  'ap.copied': { es: '✓ Copiado', en: '✓ Copied' },
  'ap.first_note': { es: 'En su primer ingreso el sistema le exigirá crear su propia contraseña.', en: 'On their first sign-in the system will require them to set their own password.' },
  'ap.cred_text': {
    es: 'Polla Mundialista — tu acceso\nUsuario: {email}\nContraseña temporal: {temp}\n(Deberás cambiarla en tu primer ingreso)',
    en: 'Polla Mundialista — your access\nUser: {email}\nTemporary password: {temp}\n(You must change it on your first sign-in)',
  },

  // Popups
  'md.results_label': { es: 'Resumen de resultados', en: 'Results summary' },
  'md.news': { es: '¡Hay resultados nuevos!', en: 'New results are in!' },
  'md.played_one': { es: 'Se jugó 1 partido desde tu última visita.', en: '1 match was played since your last visit.' },
  'md.played_many': { es: 'Se jugaron {n} partidos desde tu última visita.', en: '{n} matches were played since your last visit.' },
  'md.label_exact': { es: 'Marcador exacto', en: 'Exact score' },
  'md.label_outcome': { es: 'Acertaste el resultado', en: 'You got the outcome' },
  'md.label_miss': { es: 'No acertaste', en: 'You missed' },
  'md.label_nopred': { es: 'Sin predicción', en: 'No prediction' },
  'md.earned': { es: 'Ganaste', en: 'You earned' },
  'md.batch': { es: 'en esta tanda', en: 'in this batch' },
  'md.total': { es: 'Total acumulado:', en: 'Running total:' },
  'md.ok': { es: 'Entendido', en: 'Got it' },
  'md.champ_label': { es: 'Campeón del torneo', en: 'Tournament champion' },
  'md.champ_you': { es: '¡Eres el campeón de la polla!', en: 'You are the pool champion!' },
  'md.champ_other': { es: '¡Tenemos campeón!', en: 'We have a champion!' },
  'md.all_done': { es: 'Los 12 partidos del torneo están finalizados.', en: 'All 12 tournament matches are finished.' },
  'md.points': { es: 'puntos', en: 'points' },
  'md.exact_hits': { es: 'marcadores exactos', en: 'exact scores' },
  'md.tiebreak': { es: 'Desempate por marcadores exactos.', en: 'Tie broken by exact scores.' },
  'md.road': { es: 'Tu camino al título', en: 'Your road to the title' },
  'md.winner_is': { es: 'El ganador es:', en: 'The winner is:' },
  'md.cheer': { es: 'Nadie leyó la cancha como tú.', en: 'Nobody read the pitch like you.' },
  'md.your_pred_line': { es: 'Tu predicción: {h} — {a}', en: 'Your prediction: {h} — {a}' },

  // Server wake screen
  'wk.waking': { es: 'Despertando el servidor…', en: 'Waking up the server…' },
  'wk.text': {
    es: 'El servidor gratuito entra en reposo cuando nadie lo usa y tarda hasta un minuto en volver. Esto solo pasa en el primer acceso.',
    en: 'The free-tier server sleeps when idle and can take up to a minute to come back. This only happens on the first visit.',
  },
  'wk.elapsed': { es: '{s}s — no cierres esta pestaña', en: '{s}s — do not close this tab' },
  'wk.down': { es: 'El servidor no responde', en: 'The server is not responding' },
  'wk.down_text': {
    es: 'Llevamos más de dos minutos intentando. Puede ser un problema temporal del hosting.',
    en: 'We have been trying for over two minutes. It may be a temporary hosting issue.',
  },
  'wk.retry': { es: 'Reintentar →', en: 'Retry →' },

  // API error codes (English mode translates the server's Spanish messages)
  'err.INVALID_CREDENTIALS': { es: 'Correo o contraseña incorrectos.', en: 'Wrong email or password.' },
  'err.PORTAL_MISMATCH': { es: 'Esta cuenta no pertenece a este acceso.', en: 'This account does not belong to this portal.' },
  'err.RATE_LIMITED': { es: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.', en: 'Too many attempts. Wait a minute and try again.' },
  'err.WEAK_PASSWORD': { es: 'La contraseña no cumple los requisitos de seguridad.', en: 'The password does not meet the security requirements.' },
  'err.SAME_PASSWORD': { es: 'La nueva contraseña no puede ser igual a la temporal.', en: 'The new password cannot match the temporary one.' },
  'err.EMAIL_TAKEN': { es: 'Ya existe una cuenta con ese correo.', en: 'An account with that email already exists.' },
  'err.MATCH_ALREADY_STARTED': { es: 'El partido ya comenzó — las predicciones están cerradas.', en: 'The match has started — predictions are locked.' },
  'err.RESULT_ALREADY_LOADED': { es: 'El partido ya tiene resultado cargado.', en: 'The match already has a result.' },
  'err.PASSWORD_CHANGE_REQUIRED': { es: 'Debes cambiar tu contraseña temporal para continuar.', en: 'You must change your temporary password to continue.' },
  'err.UNAUTHORIZED': { es: 'Sesión expirada.', en: 'Session expired.' },
  'err.UNKNOWN': { es: 'Error inesperado.', en: 'Unexpected error.' },
};

const LangCtx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('polla.lang') === 'en' ? 'en' : 'es'; } catch { return 'es'; }
  });
  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem('polla.lang', l); } catch { /* private mode */ }
  };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const t = (key, vars) => {
    let s = S[key]?.[lang] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
  // Server messages are Spanish; in English mode prefer the code's translation.
  const terr = (err) => {
    const entry = err?.code ? S[`err.${err.code}`] : null;
    if (lang === 'en') return entry?.en || err?.message || S['err.UNKNOWN'].en;
    return err?.message || entry?.es || S['err.UNKNOWN'].es;
  };
  const locale = lang === 'en' ? 'en-US' : 'es-CO';
  const team = (name) => (lang === 'en' ? TEAMS_EN[name] || name : name);

  return <LangCtx.Provider value={{ lang, setLang, t, terr, locale, team }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

export function LangToggle({ dark, float }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-toggle${dark ? ' dark' : ''}${float ? ' float' : ''}`} role="group" aria-label="Idioma / Language">
      {['es', 'en'].map((l) => (
        <button key={l} type="button" className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
