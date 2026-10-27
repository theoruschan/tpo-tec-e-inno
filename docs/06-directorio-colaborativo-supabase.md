# 06 — Directorio Colaborativo Compartido (ADR-006)

**Estado:** Implementado en código · Migración pendiente de aplicar en Supabase
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

## Configuración

```bash
cp .env.example .env.local   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
```

En Vercel: Project Settings → Environment Variables, las mismas dos variables (la anon key es pública por diseño; la `service_role` nunca va al cliente).
