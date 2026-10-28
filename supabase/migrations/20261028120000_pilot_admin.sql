-- CuartoSeguro — Piloto cerrado: feedback de participantes y panel de administración
--
-- * public.pilot_feedback: lo que opinan los participantes de cada resultado. Se escribe solo vía
--   submit_pilot_feedback (anon) y se lee solo desde el panel admin. Sin IP ni datos de contacto;
--   el dispositivo se guarda como HMAC con la sal secreta del directorio.
-- * private.admins: usuarios de Supabase Auth autorizados como administradores.
-- * admin_*: funciones SECURITY DEFINER que exigen estar en private.admins (se valida en el
--   servidor con auth.uid(); esconder la pantalla en el cliente NO es la protección).
-- Requiere 20261027000000_fraud_reports.sql (schema private, salted_hash, fraud_reports)
-- y 20261028000000_photo_sightings.sql.

create table if not exists private.admins (
  user_id uuid primary key,
  note text,
  created_at timestamptz not null default now()
);

create or replace function private.require_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null
     or not exists (select 1 from private.admins a where a.user_id = auth.uid()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
end;
$$;

-- ---------- Feedback del piloto ----------

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  verification_id text not null check (char_length(verification_id) between 3 and 64),
  reporter_hash text not null,
  verdict text not null check (verdict in ('Anuncio sospechoso', 'Verificado', 'Sin datos suficientes')),
  confidence integer not null check (confidence between 0 and 100),
  city text check (city in ('CABA', 'Córdoba', 'La Plata', 'Rosario')),
  property_type text check (property_type in ('room', 'studio', 'two_rooms')),
  useful text not null check (useful in ('yes', 'partly', 'no')),
  -- not_paying: no pagué · paid_ok: pagué y salió bien · paid_scam: pagué y era estafa · undecided: todavía no decidí
  outcome text not null check (outcome in ('not_paying', 'paid_ok', 'paid_scam', 'undecided')),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_feedback_one_per_verification unique (reporter_hash, verification_id)
);

create index if not exists pilot_feedback_created_idx on public.pilot_feedback (created_at desc);

alter table public.pilot_feedback enable row level security;
revoke all on public.pilot_feedback from anon, authenticated;
-- Sin políticas: nadie lee ni escribe directo.

create or replace function public.submit_pilot_feedback(
  p_verification_id text,
  p_verdict text,
  p_confidence integer,
  p_city text,
  p_property_type text,
  p_useful text,
  p_outcome text,
  p_comment text,
  p_reporter_id text
)
returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_reporter_hash text := private.salted_hash(private.normalize_identifier(p_reporter_id));
  v_recent integer;
begin
  if v_reporter_hash is null then
    raise exception 'Falta el identificador del dispositivo.';
  end if;

  -- Tope por dispositivo: 20 feedbacks nuevos por hora (editar uno existente no cuenta).
  select count(*) into v_recent
  from public.pilot_feedback f
  where f.reporter_hash = v_reporter_hash and f.created_at > now() - interval '1 hour';
  if v_recent >= 20 and not exists (
    select 1 from public.pilot_feedback f
    where f.reporter_hash = v_reporter_hash and f.verification_id = p_verification_id
  ) then
    raise exception 'Demasiados envíos, probá más tarde.';
  end if;

  insert into public.pilot_feedback (
    verification_id, reporter_hash, verdict, confidence, city, property_type,
    useful, outcome, comment
  ) values (
    p_verification_id, v_reporter_hash, p_verdict, p_confidence, p_city, p_property_type,
    p_useful, p_outcome, nullif(left(trim(coalesce(p_comment, '')), 500), '')
  )
  on conflict on constraint pilot_feedback_one_per_verification do update
    set useful = excluded.useful,
        outcome = excluded.outcome,
        comment = excluded.comment,
        updated_at = now();

  return 'ok';
end;
$$;

revoke all on function public.submit_pilot_feedback(text, text, integer, text, text, text, text, text, text) from public;
grant execute on function public.submit_pilot_feedback(text, text, integer, text, text, text, text, text, text) to anon, authenticated;

-- ---------- Panel de administración (solo private.admins) ----------

create or replace function public.admin_list_pending_reports()
returns table (
  id uuid,
  identifier_masked text,
  phone_masked text,
  city text,
  reason text,
  source text,
  created_at timestamptz,
  reports_for_identifier bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select r.id, r.identifier_masked, r.phone_masked, r.city, r.reason, r.source, r.created_at,
           (select count(distinct x.reporter_hash)
              from public.fraud_reports x
             where x.status <> 'rejected'
               and coalesce(x.identifier_hash, 'phone:' || x.phone_hash)
                 = coalesce(r.identifier_hash, 'phone:' || r.phone_hash))
    from public.fraud_reports r
    where r.status = 'pending'
    order by r.created_at asc;
end;
$$;

create or replace function public.admin_moderate_report(p_id uuid, p_status text)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_found integer;
begin
  perform private.require_admin();
  if p_status not in ('approved', 'rejected') then
    raise exception 'Estado inválido.';
  end if;
  update public.fraud_reports
     set status = p_status, reviewed_at = now()
   where id = p_id and status = 'pending';
  get diagnostics v_found = row_count;
  return v_found > 0;
end;
$$;

create or replace function public.admin_list_feedback(p_limit integer default 100)
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  verification_id text,
  verdict text,
  confidence integer,
  city text,
  property_type text,
  useful text,
  outcome text,
  comment text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    select f.id, f.created_at, f.updated_at, f.verification_id, f.verdict, f.confidence,
           f.city, f.property_type, f.useful, f.outcome, f.comment
    from public.pilot_feedback f
    order by f.updated_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'reports_pending',  (select count(*) from public.fraud_reports where status = 'pending'),
    'reports_approved', (select count(*) from public.fraud_reports where status = 'approved'),
    'reports_rejected', (select count(*) from public.fraud_reports where status = 'rejected'),
    'photo_sightings',  (select count(*) from public.photo_sightings),
    'feedback_total',   (select count(*) from public.pilot_feedback),
    'useful_yes',       (select count(*) from public.pilot_feedback where useful = 'yes'),
    'useful_partly',    (select count(*) from public.pilot_feedback where useful = 'partly'),
    'useful_no',        (select count(*) from public.pilot_feedback where useful = 'no'),
    'outcome_not_paying', (select count(*) from public.pilot_feedback where outcome = 'not_paying'),
    'outcome_paid_ok',    (select count(*) from public.pilot_feedback where outcome = 'paid_ok'),
    'outcome_paid_scam',  (select count(*) from public.pilot_feedback where outcome = 'paid_scam'),
    'outcome_undecided',  (select count(*) from public.pilot_feedback where outcome = 'undecided'),
    'scam_missed', (select count(*) from public.pilot_feedback where outcome = 'paid_scam' and verdict = 'Verificado')
  );
end;
$$;

-- Solo usuarios autenticados pueden llamarlas (y además tienen que estar en private.admins).
revoke all on function public.admin_list_pending_reports() from public, anon;
revoke all on function public.admin_moderate_report(uuid, text) from public, anon;
revoke all on function public.admin_list_feedback(integer) from public, anon;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_list_pending_reports() to authenticated;
grant execute on function public.admin_moderate_report(uuid, text) to authenticated;
grant execute on function public.admin_list_feedback(integer) to authenticated;
grant execute on function public.admin_stats() to authenticated;
