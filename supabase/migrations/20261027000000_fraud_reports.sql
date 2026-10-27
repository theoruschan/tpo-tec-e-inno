-- CuartoSeguro — Directorio colaborativo de CBU/alias y teléfonos reportados (Fase 3)
--
-- Principios:
--   * Nunca se guarda el CBU/alias ni el teléfono en claro, ni nombres de personas.
--     Se guarda HMAC-SHA256(valor normalizado, sal secreta) + una versión enmascarada para la UI.
--   * La sal vive en el schema `private`, que no está expuesto por la API REST.
--   * Los reportes nuevos entran como 'pending'. Un identificador cuenta para el motor si tiene
--     al menos un reporte 'approved' o 3 reportes independientes (reporter_hash distintos).
--   * El cliente solo usa la clave pública (anon) y solo puede: llamar a submit_fraud_report,
--     hash_identifiers y get_public_fraud_directory, y leer filas 'approved' sin reporter_hash.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.settings (
  key text primary key,
  value text not null
);

insert into private.settings (key, value)
values ('identifier_salt', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

insert into private.settings (key, value)
values ('independent_reports_threshold', '3')
on conflict (key) do nothing;

-- ---------- Normalización, hash y enmascarado (privadas) ----------

create or replace function private.normalize_identifier(raw text)
returns text language sql immutable set search_path = '' as $$
  select nullif(regexp_replace(lower(trim(coalesce(raw, ''))), '\s+', '', 'g'), '')
$$;

-- Se usan los últimos 8 dígitos: el mismo criterio que IdentityCbuMatcher (ignora +54 9, 0, 15).
create or replace function private.normalize_phone(raw text)
returns text language sql immutable set search_path = '' as $$
  select nullif(right(regexp_replace(coalesce(raw, ''), '\D', '', 'g'), 8), '')
$$;

create or replace function private.salted_hash(normalized text)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when normalized is null or length(normalized) < 4 then null
    else encode(
      extensions.hmac(
        normalized,
        (select value from private.settings where key = 'identifier_salt'),
        'sha256'
      ),
      'hex'
    )
  end
$$;

create or replace function private.mask_identifier(normalized text)
returns text language sql immutable set search_path = '' as $$
  select case
    when normalized is null then null
    when normalized ~ '^\d+$' then repeat('•', greatest(length(normalized) - 4, 0)) || right(normalized, 4)
    when length(normalized) <= 6 then left(normalized, 1) || '•••'
    else left(normalized, 3) || '•••' || right(normalized, 3)
  end
$$;

create or replace function private.mask_phone(normalized text)
returns text language sql immutable set search_path = '' as $$
  select case when normalized is null then null else '•••• ' || right(normalized, 4) end
$$;

-- ---------- Tabla ----------

create table if not exists public.fraud_reports (
  id uuid primary key default gen_random_uuid(),
  identifier_hash text,
  identifier_masked text,
  phone_hash text,
  phone_masked text,
  city text not null check (city in ('CABA', 'Córdoba', 'La Plata', 'Rosario')),
  reason text not null check (char_length(reason) between 5 and 400),
  source text not null default 'Verificación usuario'
    check (source in ('Comunidad estudiantil', 'Centro de Estudiantes', 'Verificación usuario')),
  reporter_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint fraud_reports_has_identifier check (identifier_hash is not null or phone_hash is not null),
  -- Un mismo dispositivo no puede inflar el contador del mismo identificador.
  constraint fraud_reports_one_per_reporter unique nulls not distinct (identifier_hash, phone_hash, reporter_hash)
);

create index if not exists fraud_reports_identifier_idx on public.fraud_reports (identifier_hash);
create index if not exists fraud_reports_phone_idx on public.fraud_reports (phone_hash);

alter table public.fraud_reports enable row level security;

revoke all on public.fraud_reports from anon, authenticated;
-- Lectura pública directa: solo reportes aprobados y sin la columna reporter_hash.
grant select (id, identifier_hash, identifier_masked, phone_hash, phone_masked, city, reason, source, status, created_at)
  on public.fraud_reports to anon, authenticated;

drop policy if exists "Lectura pública de reportes aprobados" on public.fraud_reports;
create policy "Lectura pública de reportes aprobados"
  on public.fraud_reports for select to anon, authenticated
  using (status = 'approved');
-- No hay políticas de insert/update/delete: solo se escribe vía submit_fraud_report (security definer)
-- y la moderación se hace desde el dashboard con el rol de servicio.

-- ---------- API pública (RPC) ----------

create or replace function public.hash_identifiers(p_identifier text, p_phone text)
returns table (identifier_hash text, phone_hash text)
language sql stable security definer set search_path = '' as $$
  select
    private.salted_hash(private.normalize_identifier(p_identifier)),
    private.salted_hash(private.normalize_phone(p_phone))
$$;

create or replace function public.submit_fraud_report(
  p_identifier text,
  p_phone text,
  p_city text,
  p_reason text,
  p_reporter_id text
)
returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_identifier text := private.normalize_identifier(p_identifier);
  v_phone text := private.normalize_phone(p_phone);
  v_identifier_hash text := private.salted_hash(v_identifier);
  v_phone_hash text := private.salted_hash(v_phone);
  v_reporter_hash text := private.salted_hash(private.normalize_identifier(p_reporter_id));
begin
  if v_identifier_hash is null and v_phone_hash is null then
    raise exception 'Hace falta un CBU/alias o un teléfono para reportar.';
  end if;
  if v_reporter_hash is null then
    raise exception 'Falta el identificador del dispositivo que reporta.';
  end if;
  if char_length(coalesce(p_identifier, '')) > 64 or char_length(coalesce(p_phone, '')) > 32 then
    raise exception 'Identificador demasiado largo.';
  end if;

  insert into public.fraud_reports (
    identifier_hash, identifier_masked, phone_hash, phone_masked, city, reason, reporter_hash
  ) values (
    v_identifier_hash,
    private.mask_identifier(v_identifier),
    v_phone_hash,
    private.mask_phone(v_phone),
    p_city,
    left(trim(p_reason), 400),
    v_reporter_hash
  )
  on conflict on constraint fraud_reports_one_per_reporter do nothing;

  return 'pending';
end;
$$;

-- Directorio que usa el motor: identificadores con >= 1 reporte aprobado o >= N reportes independientes.
-- El motivo publicado es el del último reporte aprobado; si solo hay reportes pendientes, se muestra
-- un texto genérico (el texto libre sin moderar nunca se publica).
create or replace function public.get_public_fraud_directory()
returns table (
  identifier_hash text,
  identifier_masked text,
  phone_hash text,
  phone_masked text,
  city text,
  reports_count bigint,
  last_reported_at date,
  reason text,
  source text,
  is_approved boolean
)
language sql stable security definer set search_path = '' as $$
  with threshold as (
    select value::int as n from private.settings where key = 'independent_reports_threshold'
  ),
  grouped as (
    -- Se agrupa por CBU/alias cuando existe; los reportes solo con teléfono se agrupan por teléfono.
    select
      max(r.identifier_hash) as identifier_hash,
      max(r.phone_hash) as phone_hash,
      max(r.identifier_masked) as identifier_masked,
      max(r.phone_masked) as phone_masked,
      mode() within group (order by r.city) as city,
      count(distinct r.reporter_hash) filter (where r.status <> 'rejected') as reports_count,
      max(r.created_at)::date as last_reported_at,
      bool_or(r.status = 'approved') as is_approved,
      (array_agg(r.reason order by r.created_at desc) filter (where r.status = 'approved'))[1] as approved_reason,
      (array_agg(r.source order by r.created_at desc) filter (where r.status = 'approved'))[1] as approved_source
    from public.fraud_reports r
    where r.status <> 'rejected'
    group by coalesce(r.identifier_hash, 'phone:' || r.phone_hash)
  )
  select
    g.identifier_hash,
    g.identifier_masked,
    g.phone_hash,
    g.phone_masked,
    g.city,
    g.reports_count,
    g.last_reported_at,
    coalesce(g.approved_reason,
      'Reportado por varios estudiantes de forma independiente (pendiente de moderación).'),
    coalesce(g.approved_source, 'Verificación usuario'),
    g.is_approved
  from grouped g, threshold t
  where g.is_approved or g.reports_count >= t.n
  order by g.reports_count desc, g.last_reported_at desc
$$;

revoke all on function public.hash_identifiers(text, text) from public;
revoke all on function public.submit_fraud_report(text, text, text, text, text) from public;
revoke all on function public.get_public_fraud_directory() from public;
grant execute on function public.hash_identifiers(text, text) to anon, authenticated;
grant execute on function public.submit_fraud_report(text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_public_fraud_directory() to anon, authenticated;

-- ---------- Semilla: los 5 casos ficticios del prototipo, ya moderados ----------
-- Se cargan sin nombres de personas. Cada reporte semilla usa un reporter distinto
-- para reflejar el contador del dataset original.

insert into public.fraud_reports (identifier_hash, identifier_masked, phone_hash, phone_masked, city, reason, source, reporter_hash, status, created_at, reviewed_at)
select
  private.salted_hash(private.normalize_identifier(s.identifier)),
  private.mask_identifier(private.normalize_identifier(s.identifier)),
  private.salted_hash(private.normalize_phone(s.phone)),
  private.mask_phone(private.normalize_phone(s.phone)),
  s.city, s.reason, s.source,
  private.salted_hash('seed-' || s.identifier || '-' || n),
  'approved',
  s.last_reported::timestamptz - make_interval(days => n),
  now()
from (values
  ('alquiler.facil.ya.mp', '+54 9 11 6402-9918', 'CABA', 7, date '2026-08-29', 'Comunidad estudiantil',
   'Pide $120.000 de reserva por WhatsApp diciendo que vive en el interior y bloquea al estudiante tras recibir la transferencia.'),
  ('0000003100098412239104', '+54 9 351 781-4402', 'Córdoba', 5, date '2026-08-31', 'Centro de Estudiantes',
   'Publica fotos robadas de Airbnb en grupos de ingresantes UNC y exige seña inmediata para "guardar carpeta".'),
  ('reservas.depto.estudiantil', '+54 9 221 590-1120', 'La Plata', 4, date '2026-09-02', 'Comunidad estudiantil',
   'Dirección inexistente cerca de Plaza Paso. Usa presión de urgencia ("tengo dos chicos más esperando para transferir").'),
  ('propiedades.sur.reserva', '+54 9 341 612-8890', 'Rosario', 6, date '2026-09-04', 'Centro de Estudiantes',
   'Cobra gastos administrativos y seña por adelantado sin mostrar el inmueble cerca de la Facultad de Medicina UNR.'),
  ('dueño.directo.recoleta.ok', '+54 9 11 5019-3341', 'CABA', 3, date '2026-09-05', 'Verificación usuario',
   'Clonó las fotos de un departamento en venta en Recoleta y lo ofrece a mitad de precio para estudiantes del interior.')
) as s(identifier, phone, city, reports, last_reported, source, reason)
cross join lateral generate_series(0, s.reports - 1) as n
on conflict on constraint fraud_reports_one_per_reporter do nothing;
