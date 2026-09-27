# Decisiones de diseño — Polla Mundialista

Cada decisión relevante del proyecto: qué se eligió, qué alternativas se consideraron
y por qué gana la elegida **para este contexto** (una app de 4 módulos, construida
AI-First, revisada en vivo por un panel técnico y hosteada con usuarios reales).

> Formato por decisión: **elegido** → alternativas → razones → trade-off aceptado.

---

## 1. Arquitectura

### 1.1 Forma general: SPA + API (elegido) vs. monolito con vistas vs. microservicios

- **Elegido: SPA en React + Web API stateless en .NET 8, desplegados por separado.**
- Alternativas: (a) monolito server-rendered (Razor), (b) microservicios por módulo.
- Razones: la prueba exige "separación clara entre front y back" — un monolito con
  vistas la incumple. Microservicios para 4 módulos y una base de datos es teatro de
  arquitectura: agrega fronteras de red y modos de fallo sin beneficio a esta escala.
  SPA + API es el punto medio honesto: separación real, un deploy por lado, y camino
  de crecimiento sin reescritura (el API ya es stateless).
- Trade-off aceptado: SEO y first-paint no importan aquí (app privada autenticada).

### 1.2 Backend en Clean Architecture (4 proyectos)

- **Elegido: `Api` (presentación) → `Application` (contratos y errores) +
  `Infrastructure` (EF Core, seeding, JWT) → `Domain` (entidades y scoring, sin
  dependencias).**
- Alternativa: un solo proyecto con carpetas.
- Razones: dependencias en una sola dirección, el dominio (scoring) queda puro y
  testeable sin arrastre de framework, y es la convención que un equipo .NET navega
  sin explicaciones. La solución compila por capas y los paquetes viven solo donde
  se usan.
- Trade-off: más ceremonia de proyectos para una app pequeña — aceptado por
  legibilidad y por demostrar el estándar.

### 1.3 Por qué escala (la respuesta corta para la sesión en vivo)

1. API stateless (JWT, sin sesiones) → escalar horizontal es "agregar instancias".
2. Puntuación **materializada e idempotente** → leer el ranking es una agregación
   SQL indexada, nunca un recálculo.
3. Front y back se despliegan y escalan por separado.
4. La base es el único componente con estado — el cuello de botella conocido; escalera
   de mitigación: índices (ya están) → réplicas de lectura → caché (deliberadamente
   NO agregada hoy; ver 5.2).
5. Configuración 12-factor (conexión, JWT, CORS por variables de entorno): la misma
   imagen corre local, en Docker o en cualquier nube.

---

## 2. Modelo de cuentas: grupo privado

### 2.1 Sin registro público; el organizador crea las cuentas (elegido)

- **Elegido:** no existe `/api/auth/register`. El organizador crea cada participante
  (`POST /api/admin/users`); el sistema genera una contraseña temporal **fuerte** que
  viaja en la respuesta **una sola vez** y no es recuperable después.
- Alternativas: registro abierto (descartado: el enunciado dice "grupo privado de
  usuarios"), registro con código de invitación (más piezas móviles para el mismo
  resultado).
- Razones: refleja el dominio real de una polla entre conocidos, elimina cuentas
  basura y spam de registro, y hace del alta de participantes una función visible del
  panel del organizador (módulo Admin más completo).

### 2.2 Cambio de contraseña forzado en el primer ingreso

- **Elegido:** las cuentas creadas por el organizador nacen con `must_change_password`.
  Su JWT lleva un claim `pwd_change` y un gate del pipeline rechaza **todo** excepto
  `/api/auth/change-password` (403 `PASSWORD_CHANGE_REQUIRED`) hasta que definan su
  propia contraseña. Al cambiarla se emite un token fresco sin el claim.
- Alternativas: (a) confiar en que la UI redirija (inaceptable: se salta con curl),
  (b) consultar la base en cada request (rompe la restricción de cero queries extra),
  (c) sesiones en servidor (rompe stateless).
- Reglas adicionales: la temporal no puede reutilizarse como nueva (`SAME_PASSWORD`)
  y cumple la misma política fuerte que cualquier contraseña.

### 2.3 Política de contraseñas fuerte, del lado del servidor

- **Elegido:** mínimo 8 caracteres + mayúscula + minúscula + número + símbolo,
  validado en el servidor (400 `WEAK_PASSWORD` con detalle de lo que falta). El
  checklist en vivo de la UI es UX; la puerta es el servidor.

---

## 3. Autenticación y endurecimiento

- **JWT + BCrypt** (el enunciado sugiere JWT; BCrypt es el hash correcto para
  contraseñas). Claims mínimos: id, email, rol, nombre — nada sensible en un payload
  decodificable.
- **El registro/creación jamás asigna Admin**: el único admin nace del seeder por
  configuración. No existe ruta de auto-escalamiento de privilegios.
- **Portales segregados por servidor**: el login declara su portal (participantes u
  organizadores) y un rol que no corresponde recibe 403 `PORTAL_MISMATCH` — en ambas
  direcciones, imposible de saltar llamando al API directo. Se valida después de
  verificar la contraseña, así que no sirve para enumerar roles.
- **Rate limiting** por IP en `/api/auth/*` (10/min, 429 con el envelope estándar).
- **Lockout silencioso**: 5 fallos → 15 minutos bloqueada, respondiendo el mismo 401
  (un error "cuenta bloqueada" confirmaría que la cuenta existe).
- **Anti-enumeración**: mismo error y mismo costo (BCrypt contra un hash dummy) para
  email desconocido y contraseña incorrecta.
- Emails normalizados (trim + minúsculas) al crear y al ingresar.
- Trade-off documentado: la SPA guarda el JWT en `localStorage` (expuesto a XSS a
  cambio de simplicidad; React escapa la salida por defecto y la app no renderiza
  HTML de usuarios). El endurecimiento siguiente sería cookie httpOnly + CSRF.

---

## 4. Reglas del juego (las que hacen la app "confiable")

- **Partidos inmutables por API**: solo el seeder los crea; no existe endpoint para
  editarlos ni borrarlos (probado: PUT/PATCH/DELETE → 404/405, incluso como Admin).
  Cargar el resultado solo escribe el marcador real y su timestamp.
- **Una predicción por usuario por partido** — constraint UNIQUE en la base; el
  código recupera con gracia si la carrera dispara la violación.
- **Candados de predicción**: al kickoff (hora del servidor) y al existir resultado
  (409 `MATCH_ALREADY_STARTED` / `RESULT_ALREADY_LOADED`).
- **El admin puede corregir un resultado**: decisión deliberada (los errores de
  digitación existen) hecha segura por el recálculo idempotente — corregir
  sobreescribe puntos, jamás acumula. Verificado por test.
- **Privacidad de predicciones**: las de otros usuarios solo se exponen en partidos
  finalizados — el ranking no puede usarse para copiar jugadas. Aplicado en el
  backend, no escondido en la UI.
- **Puntuación 3/1/0** como función pura en el dominio (`ScoringService`), la unidad
  más testeada del sistema; el acierto de resultado se compara por el signo de la
  diferencia de goles (cubre empates naturalmente).
- **Cálculo síncrono y atómico al cargar el resultado** (elegido) vs. asíncrono con
  cola: a esta escala, puntuar es O(n) trivial y lo asíncrono abriría una ventana de
  inconsistencia (resultado visible, puntos no). La idempotencia ya construida deja
  listo el camino a un worker con outbox si la escala lo exigiera.
- **Popups de ciclo de juego**: resumen de partidos puntuados desde la última visita
  (+ total) y anuncio único de campeón al completarse los 12 partidos (con desempate
  por marcadores exactos). El "visto" vive en localStorage por usuario — decisión
  consciente a esta escala; el camino de crecimiento es un feed de notificaciones
  del lado del servidor.

---

## 5. Frontend

### 5.1 React + Vite; Context y fetch nativo (sin Redux ni axios)

- La app tiene un estado global (la sesión) y pantallas CRUD simples: Context es el
  tamaño correcto; un wrapper de fetch de 30 líneas cubre lo que daría axios
  (inyección del Bearer, parseo del envelope de errores, expiración de sesión).
- Diseño propio con CSS variables (sin framework de UI): bundle pequeño y revisión
  centrada en la lógica.

### 5.2 Sin caché de lecturas — a propósito

El ranking podría cachearse, pero a este volumen es optimización prematura que
arriesga servir posiciones viejas justo después de cargar un resultado (el bug de
frescura que un usuario nota de inmediato). Primero correcto; caché cuando la medición
lo pida. El API es stateless: agregarla después es aditivo, no un rediseño.

### 5.3 UX de plataforma

- **Pantalla de arranque en frío**: el hosting gratuito duerme el API; la app sondea
  `/health` y muestra progreso en lugar de un login congelado, con reintento a los
  2 minutos.
- SPA bajo subruta en GitHub Pages: `base` por variable de build, `basename` del
  router y fallback 404→SPA para deep links.

---

## 6. Base de datos

- **PostgreSQL 16** (relacional, requerido): dominio de libro para FKs, constraint
  única compuesta y agregación del ranking. Corre idéntico en Docker local y en el
  tier gratuito administrado (Neon). El cambio a SQL Server sería una línea
  (`UseNpgsql` → `UseSqlServer`) más la cadena de conexión.
- Esquema documentado en `backend/db/schema.sql` (fuente de verdad; EF Core mapea
  explícitamente a snake_case) + `seed.sql`. El API crea el esquema y siembra en el
  primer arranque (idempotente).
- El resultado vive en el partido (`home_goals`, `away_goals`,
  `result_loaded_at` como bandera y auditoría): un partido tiene a lo sumo un
  resultado; una tabla aparte agregaría un join sin ganancia de modelado.

---

## 7. Pruebas

**46 tests en dos capas:**

- **Unitarias (13)** sobre el motor de puntuación — la lógica pura de mayor
  consecuencia (exacto/resultado/fallo, empates, marcador invertido).
- **De integración (33)** con `WebApplicationFactory` arrancando la app REAL
  (routing, JWT, roles, envelope, EF) contra **SQLite en memoria** — elegido sobre el
  proveedor InMemory de EF porque SQLite sí aplica los constraints bajo prueba
  (únicos, FKs, CHECKs), y sobre Testcontainers por portabilidad (la suite corre sin
  Docker). Una base fresca por test.
- Qué protegen (los invariantes, no el happy path): sin registro público, alta por
  organizador con temporal de un solo uso, gate de cambio forzado, política de
  contraseñas, lockout, rate limiting, anti-enumeración, segregación de portales,
  candados de predicción, roles en resultados, recálculo idempotente, orden y
  desempate del ranking, privacidad del historial.

---

## 8. Hosting (entregable 2)

- **Front**: GitHub Pages (workflow de Actions: build → artefacto → deploy en cada
  push que toque `frontend/`).
- **API**: Render (imagen Docker desde `backend/Dockerfile`, blueprint en
  `render.yaml`), secretos por variables de entorno.
- **Base**: Neon (PostgreSQL administrado, tier gratuito).
- Nota operativa del tier gratuito: Render duerme el servicio tras ~15 min sin
  tráfico (primer request tarda 30-60 s) — cubierto por la pantalla de arranque en
  frío del front.

---

## 9. Fuera de alcance — decisiones conscientes

### 9.1 Dinero (montos, bote, premios): excluido a propósito

Las pollas reales suelen mover dinero. Se excluyó deliberadamente:

- **No está en el alcance de la prueba** (4 módulos definidos, ninguno lo menciona).
- **Cambia la categoría del producto**: montos reales sobre resultados deportivos es
  apuesta — en Colombia, territorio regulado (Coljuegos) — y técnicamente implica
  pagos, custodia de fondos, conciliación y disputas: un dominio completo con su
  propia clase de errores costosos, no un campo más en una tabla.
- Una función de dinero a medias es peor que ninguna. El diseño actual no lo impide:
  si entrara, sería un módulo aparte (aporte por participante, bote, auditoría de
  pagos) con su propio diseño — o, como paso intermedio sin riesgo, un campo
  puramente informativo del bote gestionado fuera de la app.

### 9.2 Otras exclusiones deliberadas

- **Recuperación de contraseña por email**: requiere proveedor de correo y flujo de
  tokens; en el modelo de grupo privado, el organizador puede recrear la cuenta.
- **Notificaciones del lado del servidor** (los popups usan "visto" local): el paso
  siguiente natural si el producto creciera.
- **Fases eliminatorias / más jornadas**: el enunciado acota a 12 partidos de fase de
  grupos; el modelo (grupos en `matches.group_code`) admite extenderlo.
