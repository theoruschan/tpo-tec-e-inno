-- CuartoSeguro — Baja de entradas publicadas del directorio desde el panel admin
--
-- Las condiciones del piloto prometen que un reporte que perjudica a alguien se puede dar de baja.
-- Esta migración agrega:
--   * private.admin_actions: registro de quién hizo qué (moderar / dar de baja), no expuesto por la API.
--   * admin_list_published_entries(): una fila por identificador visible hoy en el directorio.
--   * admin_takedown_entry(key): rechaza todos los reportes aprobados/pendientes de ese identificador,
--     con lo que desaparece del directorio, y lo registra.
--   * admin_moderate_report ahora también deja registro.
-- Requiere 20261028120000_pilot_admin.sql.

create table if not exists private.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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
  if v_found > 0 then
    insert into private.admin_actions (admin_id, action, detail)
    values (auth.uid(), 'moderate_report', jsonb_build_object('report_id', p_id, 'status', p_status));
  end if;
  return v_found > 0;
end;
$$;

-- La clave de una entrada es el hash del CBU/alias (o "phone:" + hash del teléfono si no hay CBU/alias),
-- el mismo criterio con el que get_public_fraud_directory agrupa los reportes.
create or replace function public.admin_list_published_entries()
returns table (
  entry_key text,
  identifier_masked text,
  phone_masked text,
  city text,
  reports_count bigint,
  approved_count bigint,
  reason text,
  last_reported_at date
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
    with grouped as (
      select
        coalesce(r.identifier_hash, 'phone:' || r.phone_hash) as entry_key,
        max(r.identifier_masked) as identifier_masked,
        max(r.phone_masked) as phone_masked,
        mode() within group (order by r.city) as city,
        count(distinct r.reporter_hash) as reports_count,
        count(*) filter (where r.status = 'approved') as approved_count,
        (array_agg(r.reason order by r.created_at desc) filter (where r.status = 'approved'))[1] as reason,
        max(r.created_at)::date as last_reported_at
      from public.fraud_reports r
      where r.status <> 'rejected'
      group by coalesce(r.identifier_hash, 'phone:' || r.phone_hash)
    ),
    threshold as (
      select value::int as n from private.settings where key = 'independent_reports_threshold'
    )
    select g.entry_key, g.identifier_masked, g.phone_masked, g.city, g.reports_count, g.approved_count,
           coalesce(g.reason, 'Publicado por alcanzar el umbral de reportes independientes (sin motivo aprobado).'),
           g.last_reported_at
    from grouped g, threshold t
    where g.approved_count > 0 or g.reports_count >= t.n
    order by g.reports_count desc, g.last_reported_at desc;
end;
$$;

create or replace function public.admin_takedown_entry(p_entry_key text)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_count integer;
begin
  perform private.require_admin();
  if p_entry_key is null or length(p_entry_key) < 5 then
    raise exception 'Clave inválida.';
  end if;
  update public.fraud_reports
     set status = 'rejected', reviewed_at = now()
   where coalesce(identifier_hash, 'phone:' || phone_hash) = p_entry_key
     and status <> 'rejected';
  get diagnostics v_count = row_count;
  if v_count > 0 then
    insert into private.admin_actions (admin_id, action, detail)
    values (auth.uid(), 'takedown_entry', jsonb_build_object('entry_key', p_entry_key, 'reports_rejected', v_count));
  end if;
  return v_count;
end;
$$;

revoke all on function public.admin_list_published_entries() from public, anon;
revoke all on function public.admin_takedown_entry(text) from public, anon;
grant execute on function public.admin_list_published_entries() to authenticated;
grant execute on function public.admin_takedown_entry(text) to authenticated;
