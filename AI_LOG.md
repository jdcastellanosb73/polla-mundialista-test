# AI Log — Polla Mundialista

Trabajé todo el proyecto con Claude Code como herramienta principal, desde el
scaffolding hasta el despliegue. La regla que me puse desde el día uno es simple:
la IA propone y acelera, pero las decisiones de arquitectura, seguridad y negocio
las tomo yo, y no integro nada que no pueda explicar línea por línea.

Cada entrada de este log sigue el mismo esquema porque así trabajo los prompts
importantes: primero el contexto, después el prompt (con el contexto y las
restricciones adentro, porque un prompt sin contexto devuelve genéricos), luego
qué tuve que revisar o corregir de la respuesta, y al final las restricciones que
quedaron implementadas de verdad.

---

## 1. El candado de seguridad que funcionaba en local y no en producción

**Contexto.** Implementé la segregación de portales (una cuenta de organizador no
puede iniciar sesión por el acceso de participantes, ni al revés) con la validación
en el servidor, la probé en local con tests y todo verde, hice push... y al probar
la app hosteada seguía pudiendo entrar como admin desde el login normal. El clásico
"en mi máquina sí funciona", pero al revés: la duda era cuál de las tres piezas
desplegadas (front en GitHub Pages, API en Render, caché del navegador) se había
quedado con la versión vieja.

**Prompt:**

> "Acabo de desplegar un cambio de seguridad que valida en el backend y en el
> frontend, y en producción no está funcionando. Stack: front estático en GitHub
> Pages (workflow de Actions), API en Render desde el mismo repo, y el navegador
> puede tener caché. Dame verificaciones concretas para determinar cuál pieza está
> sirviendo código viejo, sin adivinar: algo que pueda comprobar con curl o
> inspeccionando el bundle, pieza por pieza."

**Revisión y ajustes.** Las verificaciones fueron directas: buscar en el bundle
publicado del front la marca del cambio (estaba: el front era el nuevo), y llamar al
API directo con el caso que debía rechazarse (devolvió 200 en vez de 403: el API era
el viejo). Con eso el diagnóstico quedó cerrado en minutos: Render no estaba
auto-desplegando los pushes. Un "Manual Deploy" lo resolvió en el momento, y activé
el auto-deploy para que no volviera a pasar. Lo que me quedó claro es que el error
habría sido invisible si la validación solo viviera en el front: por eso el candado
estaba en el servidor, y por eso la verificación se hace contra producción, no
contra lo que uno cree que desplegó.

**Restricciones que quedaron aplicadas:**
- La segregación de portales se verifica en producción en ambas direcciones
  (403/403 en los cruces, 200/200 en los accesos correctos), no solo en local.
- Regla de despliegue desde entonces: verificar el artefacto desplegado, no la
  intención (un push no es un deploy hasta comprobarlo).
- Auto-deploy activado en Render para que front y API nunca queden desincronizados
  tras un push.

## 2. Un bloqueo de verdad: el API arriba y nadie podía conectarse

**Contexto.** En local el API arrancaba limpio, Kestrel decía "Now listening"... y
todos los clientes se quedaban colgados: curl, PowerShell, hasta un socket TCP
escribiendo el request a mano. La conexión abría pero nunca llegaba un byte de
vuelta. Cero errores en logs. Mi sospecha era que algo fuera del proceso estaba
interceptando el tráfico, pero no quería adivinar.

**Prompt:**

> "API .NET 8 local en Windows: Kestrel reporta 'Now listening', el TCP conecta,
> pero ninguna respuesta HTTP llega. Probado con curl, PowerShell y socket crudo.
> Sin errores en logs. Ayúdame a montar experimentos que separen tres hipótesis:
> (a) mi aplicación colgada procesando, (b) problema del puerto, (c) un filtro a
> nivel de máquina apuntando al proceso. Uno por hipótesis, del más barato al más
> caro."

**Revisión y ajustes.** Corrimos la batería en orden: un servidor HTTP mínimo en
Python respondió perfecto (o sea, el loopback estaba bien), el mismo API en otro
puerto seguía mudo (no era el puerto), y al subir el logging de ASP.NET vimos que
los requests nunca llegaban a Kestrel. Era el web shield del antivirus interceptando
el HTTP hacia el proceso .NET. La decisión final fue mía y no fue de código: no iba
a pelear contra el antivirus de cada máquina. Contenericé el API y validé todo el
flujo dentro de la red de Docker, donde el filtro no aplica.

**Restricciones que quedaron aplicadas:**
- El API corre containerizado (Dockerfile multi-stage) y ese mismo Dockerfile es el
  artefacto de despliegue en producción: lo que pruebo local es lo que se despliega.
- El issue quedó documentado en el README como problema local conocido, con su
  workaround.

La lección que me llevo: cuando un servicio está "arriba" pero mudo, la primera
pregunta es si el request está llegando a la aplicación. Esa sola respuesta te ahorra
horas.

---

## 3. Cambio de contraseña obligatorio sin romper el API stateless

**Contexto.** El enunciado habla de un grupo privado, así que decidí que no hubiera
registro público: el organizador crea cada cuenta con una contraseña temporal y el
primer ingreso tiene que forzar el cambio. El reto técnico: quería la garantía del
lado del servidor, pero sin meter sesiones ni una consulta extra a la base en cada
request. Fijé esas restricciones antes de pedir opciones.

**Prompt:**

> "API stateless con JWT, sin sesiones en servidor. El admin crea cuentas con
> contraseña temporal que DEBE cambiarse en el primer login. Restricciones: (1) la
> garantía es del servidor, no confío en la UI; (2) cero estado de sesión;
> (3) cero queries extra por request para verificar el estado. Dame 2 o 3 opciones
> de diseño con sus trade-offs. No elijas por mí."

**Revisión y ajustes.** De las opciones que trajo elegí la del claim en el token:
un `pwd_change` que viaja en el JWT mientras el cambio está pendiente, un gate en el
pipeline que responde 403 PASSWORD_CHANGE_REQUIRED a todo excepto el endpoint de
cambio, y un token nuevo sin el claim cuando el usuario ya definió su contraseña.
Cumplía mis tres restricciones. Después le endurecí cosas que la primera versión no
traía: que la temporal no se pueda reutilizar como contraseña nueva, y que la
temporal generada cumpla la misma política fuerte que le exigimos a los usuarios.

**Restricciones que quedaron aplicadas:**
- La temporal se muestra una sola vez en la respuesta de creación; después es
  irrecuperable.
- La temporal cumple la política fuerte (8+ caracteres, mayúscula, minúscula,
  número, símbolo), igual que cualquier contraseña nueva.
- Reusar la temporal como nueva contraseña se rechaza (SAME_PASSWORD).
- El gate es del servidor: con el cambio pendiente, llamar al API directo con el
  token temporal devuelve 403 en todo menos el cambio.
- Flujo completo bajo tests de integración: crear → login temporal → gate → cambio
  → gate levantado.

---

## Cómo trabajé con la IA en este proyecto, en tres reglas

1. Todo diff generado lo leo como el PR de un junior talentoso pero confiado de más.
   La pregunta no es "¿se ve bien?" sino "¿qué pasa cuando esto falla o corre dos
   veces al tiempo?".
2. La verificación va proporcional al riesgo: un estilo se mira por encima; lo que
   toca autenticación, puntuación o datos se prueba con tests y de punta a punta
   contra el ambiente real antes de decir "listo".
3. La IA acelera la implementación y me ayuda a explorar alternativas. Las decisiones
   (candados, privacidad, política de contraseñas, qué queda fuera del alcance) las
   tomo yo, y están documentadas en docs/DECISIONS.md.
