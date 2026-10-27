# 06 — Directorio Colaborativo Compartido (ADR-006)

**Estado:** Implementado y migración aplicada (27/10/2026) en el proyecto Supabase `tpo-tec e inno` (`pakcqhhecnlgkzznlytu`, región us-east-1)
**Contexto:** Alternativas 6 (bot de reportes cruzados) y 11 (directorio de CBU/alias) del Entregable 3.

---

## Decisión

El directorio deja de vivir solo en el `localStorage` de cada navegador y pasa a **Supabase (Postgres + RLS)**, detrás del puerto `FraudDirectoryRepository` (`src/domain/ports/`). Hay tres adaptadores:

| Adaptador | Cuándo se usa | Comparte entre estudiantes |
| :--- | :--- | :-: |
| `SupabaseFraudDirectoryRepository` | Hay `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` | Sí |
| `ResilientFraudDirectoryRepository` | Envuelve al de Supabase; si la red o Supabase fallan, cae al local (`local-fallback`) | — |
| `LocalFraudDirectoryRepository` | Sin variables de entorno (modo local) o como fallback | No |

La UI del directorio indica en todo momento qué fuente está mostrando.

## Modelo de datos y privacidad

Migración: [`supabase/migrations/20261027000000_fraud_reports.sql`](../supabase/migrations/20261027000000_fraud_reports.sql).

- **Nunca se guarda en claro** el CBU/alias ni el teléfono, ni el nombre del supuesto propietario. Se guarda:
  - `identifier_hash` = HMAC-SHA256(CBU/alias normalizado, sal secreta) y `identifier_masked` (ej. `alq•••.mp`, `••••…9104`).
  - `phone_hash` = HMAC-SHA256(últimos 8 dígitos, sal secreta) y `phone_masked` (ej. `•••• 9918`).
- La sal vive en `private.settings`, un schema que la API REST no expone. El cliente nunca la ve.
- El cliente solo usa la **clave pública (anon)**. Puede: leer filas `approved` (sin `reporter_hash`), llamar a `submit_fraud_report`, `hash_identifiers` y `get_public_fraud_directory`. No tiene `insert/update/delete` directo sobre la tabla.
- **Cómo se cruza sin exponer datos:** al verificar, la app pide `hash_identifiers(cbu, teléfono)` y compara esos hashes contra los del directorio. El CBU viaja por HTTPS al RPC pero no se persiste.
- **Límite honesto del hash:** como el espacio de alias/CBU es acotado, alguien con acceso a la sal podría hacer fuerza bruta. Por eso la sal es secreta y no está en el cliente. El hash con sal pública no protegería nada.
- El texto libre del motivo **solo se publica si un moderador aprobó el reporte**. Los identificadores activados por cantidad de reportes muestran un texto genérico.

## Moderación y anti-abuso

- Todo reporte nuevo entra como `pending`.
- Un identificador **cuenta en el motor** si tiene ≥ 1 reporte `approved` **o** ≥ **3** reportes de dispositivos distintos (`independent_reports_threshold` en `private.settings`).
- "Dispositivo" = UUID aleatorio guardado en `localStorage` (`cuartoseguro_reporter_id_v1`), hasheado en el servidor. Una restricción `unique` impide que el mismo dispositivo reporte dos veces el mismo identificador.
- **Límite conocido:** borrar el `localStorage` o usar otro navegador genera otro id. Contra un atacante decidido hace falta autenticación (p. ej. email institucional) o rate limiting por IP en un Edge Function. Queda como trabajo futuro.
- Moderar desde el dashboard de Supabase (SQL editor, rol de servicio):

```sql
-- Ver pendientes
select id, identifier_masked, phone_masked, city, reason, created_at
from public.fraud_reports where status = 'pending' order by created_at;

-- Aprobar o rechazar
update public.fraud_reports set status = 'approved', reviewed_at = now() where id = '<uuid>';
update public.fraud_reports set status = 'rejected', reviewed_at = now() where id = '<uuid>';
```

## Semilla

La migración carga los 5 casos ficticios del prototipo como reportes aprobados (sin nombres), con la misma cantidad de reportes que el dataset original, para que el escenario "Alerta CBU Denunciado" funcione igual en modo compartido.

## Cambios en el motor

- `IdentityCbuMatcher` compara en claro contra entradas locales (como antes) y **solo por hash exacto** contra entradas compartidas. Se pierde el match por substring en modo compartido.
- El hallazgo ya no incluye el nombre del titular.
- El **experimento de 30 anuncios** corre siempre contra el directorio semilla fijo (`INITIAL_FRAUD_DIRECTORY`), para que sus métricas no cambien cuando alguien reporta algo nuevo.

## Verificación en el proyecto real (27/10/2026)

Pruebas hechas con la clave publishable (la misma que usa el cliente):

| Prueba | Resultado |
| :--- | :--- |
| `get_public_fraud_directory` | 200 · 5 identificadores semilla, solo versiones enmascaradas |
| `hash_identifiers(" ALQUILER.facil.ya.mp ", "011 15 6402-9918")` | 200 · mismos hashes que la semilla (normaliza mayúsculas, espacios y prefijos) |
| `GET /fraud_reports?select=identifier_masked,status` | 200 · solo filas `approved` |
| `GET /fraud_reports?select=reporter_hash` | 401 · permiso denegado |
| `POST` / `PATCH` directo a `fraud_reports` | 401 · permiso denegado |
| Leer el schema `private` (sal) | 406 · schema no expuesto |
| Mismo dispositivo reporta dos veces | 1 sola fila |
| 2 reportes independientes de un alias nuevo | No aparece en el directorio |
| 3 reportes independientes | Aparece, con el texto genérico (no el motivo sin moderar) |
| Reporte desde la Pantalla 7 de la app | Fila `pending` con alias/teléfono enmascarados y hasheados, sin nombre |
| Escenario "Alerta CBU Denunciado" en la app | Detectado solo por hash ("reportado 7 veces") |

Las filas de prueba se borraron; la tabla quedó con los 25 reportes semilla.

**Advertencias del linter de Supabase aceptadas:** `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` sobre las 3 RPC. Son intencionales: `SECURITY DEFINER` es lo que les permite usar la sal del schema `private` sin exponerla. Las tres tienen `search_path = ''` y validan sus entradas. No hay advertencias de RLS.

## Índice colaborativo de fotos (búsqueda inversa propia)

Migración: [`supabase/migrations/20261028000000_photo_sightings.sql`](../supabase/migrations/20261028000000_photo_sightings.sql). Aplicada el 27/10/2026.

La base semilla tiene 5 fotos; por sí sola no detecta casi nada. Este índice hace que **cada verificación con foto alimente la detección de las siguientes**: si otro estudiante ya verificó un anuncio con la misma foto pero con **otro precio** (diferencia > 15 %) u **otro CBU/alias o teléfono**, el motor marca la alerta crítica *"Esta foto aparece en otro anuncio con un precio distinto"* (o *"…con otro CBU/alias o teléfono"*). Es el Hallazgo 3 del Entregable 3: los fraudes se detectan comparando anuncios entre sí.

- **Qué se guarda** (`public.photo_sightings`), solo si se subió una foto y se marcó la autorización: dHash de 64 bits (no la imagen, no se puede reconstruir), ciudad, precio publicado, CBU/alias y teléfono como HMAC con la misma sal secreta del directorio, id anónimo del dispositivo hasheado y fecha.
- **Qué devuelve** `match_and_register_photo` (única vía de acceso; la tabla no se puede leer ni escribir directo): hasta 5 coincidencias de **otros dispositivos** con distancia ≤ 10, cada una con distancia, ciudad, precio, día y si el contacto es el mismo (sí / no / no se sabe). Nunca devuelve hashes ni datos de contacto del otro anuncio.
- **Anti-abuso:** el mismo dispositivo no duplica filas para el mismo anuncio y tiene un tope de 30 registros por hora. **Límite conocido:** alguien con varios dispositivos podría "envenenar" una foto legítima subiéndola con otro precio para que salte la alerta. Mitigación pendiente: login, rate limit por IP y moderación de alertas con pocas fuentes.
- **Escala:** la búsqueda recorre la tabla completa (`bit_count` sobre XOR). Alcanza para miles de fotos; para cientos de miles habría que indexar por bandas (LSH).
- **Verificado (27/10/2026):** con la clave pública, 6 escenarios de dispositivos simulados (misma foto con otro precio/contacto, mismo anuncio, foto casi igual a distancia 2, foto distinta, dHash inválido, lectura directa bloqueada) y el tope de 30/hora. En la app, dos dispositivos con la misma foto a $540.000 y $300.000 → el segundo sale "Anuncio sospechoso" con ese motivo. Filas de prueba borradas.
- **Advertencia del linter aceptada:** `rls_enabled_no_policy` en `photo_sightings` es intencional (sin políticas = sin acceso directo).

## Configuración

```bash
cp .env.example .env.local   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
```

En Vercel: Project Settings → Environment Variables, las mismas dos variables (la anon key es pública por diseño; la `service_role` nunca va al cliente).
