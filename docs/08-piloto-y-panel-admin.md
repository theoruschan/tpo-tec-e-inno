# 08 — Piloto cerrado y panel de administración (ADR-008)

**Estado:** Implementado (28/10/2026) · Usuario admin creado y habilitado en `private.admins` el 28/10/2026 · Login con el usuario real probado en producción el 28/10/2026 (el panel carga con sesión, 0 reportes y 0 feedback)

---

## Qué es el piloto

Una prueba con un grupo reducido de estudiantes, con el sitio abierto por link (sin código de invitación): se comparte solo con el grupo. Suma tres cosas:

1. **Aviso fijo** en todas las pantallas: *"Versión piloto. Es una ayuda para detectar señales de estafa, no una garantía… No reemplaza ver la propiedad en persona."*
2. **Condiciones en lenguaje llano** (`PilotInfoView`): qué es y qué no es, qué datos se guardan, límites y cómo avisar si un reporte los perjudica. Aclara que **no son términos legales definitivos**.
3. **Feedback después de cada resultado** (Pantalla 6): ¿te sirvió? (sí / más o menos / no), ¿qué hiciste? (no decidí / no pagué / pagué y salió bien / pagué y era estafa) y un comentario de hasta 500 caracteres. Es anónimo y se puede **cambiar después** (por ejemplo, cuando el participante se entera de cómo terminó el alquiler). Solo aparece si hay Supabase configurado.

**Por qué el feedback importa:** es la primera forma de medir el motor con casos reales. El dato clave es *"pagó, era estafa y el motor dijo Verificado"* (`scam_missed`): cada caso es un error grave que hay que revisar. Las respuestas se pueden exportar a CSV y sirven de base para el experimento real de [docs/04](./04-experimento-validacion-30-anuncios.md).

## Panel de administración

- **Dónde:** `https://tpo-tec-e-inno.vercel.app/#admin`. No tiene ningún link en la app y se descarga en un chunk aparte (los participantes nunca lo bajan). **Eso solo evita que lo encuentren por casualidad: la protección real es el servidor.**
- **Login:** email + contraseña de Supabase Auth. La sesión vive solo en memoria: recargar la página, salir del panel o vencer el token (1 hora) la cierra.
- **Qué incluye:**
  - **Reportes pendientes:** ver el motivo, cuántos dispositivos distintos lo reportaron y **aprobar o rechazar**. Aprobar publica el motivo en el directorio; el panel lo advierte y pide no aprobar motivos con datos personales de terceros.
  - **Feedback:** tabla con lo que respondieron, con las "estafas no detectadas" resaltadas, y botón **Descargar CSV** (las celdas que empiezan con `= + - @` se neutralizan para que Excel no las ejecute como fórmula).
  - **Resumen:** reportes por estado, fotos en el índice, feedback y resultados, y el contador de estafas que dejó pasar el motor.

## Seguridad: cómo está protegido

Migración [`20261028120000_pilot_admin.sql`](../supabase/migrations/20261028120000_pilot_admin.sql).

- Las funciones `admin_list_pending_reports`, `admin_moderate_report`, `admin_list_feedback` y `admin_stats` son `SECURITY DEFINER`, **solo ejecutables por usuarios autenticados**, y cada una empieza con `private.require_admin()`: verifica que `auth.uid()` esté en `private.admins`. Si no, error `42501` (403).
- El feedback se escribe solo por `submit_pilot_feedback` (anon): valida los valores, un feedback por dispositivo y resultado (editable) y tope de 20 nuevos por hora. La tabla `pilot_feedback` tiene RLS sin políticas: nadie la lee ni escribe directo, solo el panel admin por las funciones.
- No se guarda IP, nombre ni email de los participantes; el dispositivo se guarda como HMAC con la sal secreta. **Los comentarios son texto libre**: la UI pide no poner datos personales, pero no se puede garantizar.

**Verificado (28/10/2026):** con la clave pública, las 4 funciones admin devuelven *permission denied* (401) y la tabla no se puede leer; un usuario autenticado que no es admin y un usuario sin sesión reciben `42501`; el admin (emulado con claims en una transacción que se revierte) lista, modera una sola vez por reporte y ve el feedback. En la app, el login contra el endpoint real de Supabase Auth con credenciales falsas muestra *"Email o contraseña incorrectos"*. **Login con el usuario admin real:** probado por el equipo en producción el 28/10/2026 (captura: panel con sesión iniciada y las tres pestañas).

## Cómo crear el usuario admin (una vez)

> **Importante:** la contraseña del admin tiene que ser larga y única (12+ caracteres). El panel está en una URL pública: con una contraseña corta o típica, cualquiera que adivine el email podría aprobar reportes falsos (que se publican en el directorio) y leer el feedback. Cambiala antes de compartir el link del piloto.

1. Entrá a https://supabase.com/dashboard → proyecto **tpo-tec e inno** → **Authentication → Users → Add user → Create new user**.
2. Poné tu email y una **contraseña que solo sepas vos** (no se la pases a nadie, ni a Claude). Marcá *Auto Confirm User*.
3. Habilitalo como admin en **SQL Editor** (reemplazá el email):

```sql
insert into private.admins (user_id, note)
select id, 'admin del piloto' from auth.users where email = 'TU_EMAIL@ejemplo.com';

-- Verificar: tiene que devolver 1 fila
select a.user_id, u.email from private.admins a join auth.users u on u.id = a.user_id;
```

4. Entrá a `/#admin` con ese email y contraseña.

Para **quitar** un admin: `delete from private.admins where user_id = '<uuid>';`.

## Operación diaria del piloto

- **Moderar:** entrar al panel, revisar los reportes pendientes y aprobar o rechazar. Nada se publica sin revisión salvo que **3 dispositivos distintos** reporten el mismo identificador (regla de [docs/06](./06-directorio-colaborativo-supabase.md)).
- **Dar de baja un reporte ya aprobado** (si alguien reclama): el panel todavía no lo hace; se hace por SQL:

```sql
-- Buscar por versión parcial (ej. 'alq•••.mp')
select id, identifier_masked, city, reason, status from public.fraud_reports where identifier_masked = 'alq•••.mp';
update public.fraud_reports set status = 'rejected', reviewed_at = now() where id = '<uuid>';
```

- **Mirar el feedback** una vez por semana y revisar cada "estafa no detectada".
- **Supabase gratis se pausa tras 7 días sin actividad:** si el piloto tiene días parados, entrá al sitio o al dashboard antes de que lo usen.

## Límites conocidos

- Con pocos participantes los porcentajes del resumen se mueven mucho: mirar siempre el conteo.
- Quien ya usó la app antes tiene un id de dispositivo distinto en otro navegador: un mismo participante puede contar más de una vez.
- El panel no permite (todavía) revisar fotos con alertas de pocas fuentes ni dar de baja reportes aprobados.
- Los términos y la política de datos son un borrador de piloto, **no asesoramiento legal**. Antes de abrir la app al público hay que revisarlos con alguien que sepa (Ley 25.326, registro de la base ante la AAIP, proceso de reclamo).
