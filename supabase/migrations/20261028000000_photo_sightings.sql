-- CuartoSeguro — Índice propio de fotos de anuncios (búsqueda inversa colaborativa)
--
-- Cada verificación con foto (y con la autorización marcada) registra la huella perceptual
-- (dHash de 64 bits) de la foto junto con la ciudad, el precio y el contacto HASHEADO.
-- Si otro estudiante ya verificó un anuncio con la misma foto pero con otro precio u otro
-- contacto, es la señal de "foto reutilizada" del Hallazgo 3.
--
-- Privacidad:
--   * No se guarda la imagen: un dHash no permite reconstruirla.
--   * CBU/alias y teléfono se guardan con la misma HMAC + sal secreta del directorio.
--   * La tabla no es legible por la API: solo se consulta vía match_and_register_photo,
--     que devuelve distancia, ciudad, precio, fecha (día) y si el contacto coincide.
-- Requiere la migración 20261027000000_fraud_reports.sql (schema private y sus funciones).

create table if not exists public.photo_sightings (
  id uuid primary key default gen_random_uuid(),
  dhash bigint not null,
  city text not null check (city in ('CABA', 'Córdoba', 'La Plata', 'Rosario')),
  monthly_rent_ars integer not null check (monthly_rent_ars between 1000 and 100000000),
  identifier_hash text,
  phone_hash text,
  reporter_hash text not null,
  created_at timestamptz not null default now(),
  -- El mismo dispositivo verificando el mismo anuncio no suma filas.
  constraint photo_sightings_dedupe unique nulls not distinct (dhash, identifier_hash, phone_hash, reporter_hash)
);

create index if not exists photo_sightings_created_idx on public.photo_sightings (created_at);
create index if not exists photo_sightings_reporter_idx on public.photo_sightings (reporter_hash, created_at);

alter table public.photo_sightings enable row level security;
revoke all on public.photo_sightings from anon, authenticated;
-- Sin políticas: nadie lee ni escribe directo; solo la función de abajo.

create or replace function public.match_and_register_photo(
  p_dhash text,
  p_city text,
  p_monthly_rent_ars integer,
  p_identifier text,
  p_phone text,
  p_reporter_id text,
  p_threshold integer default 10
)
returns table (
  distance integer,
  city text,
  monthly_rent_ars integer,
  seen_at date,
  same_contact boolean
)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_hash bigint;
  v_identifier_hash text := private.salted_hash(private.normalize_identifier(p_identifier));
  v_phone_hash text := private.salted_hash(private.normalize_phone(p_phone));
  v_reporter_hash text := private.salted_hash(private.normalize_identifier(p_reporter_id));
  v_threshold integer := least(greatest(coalesce(p_threshold, 10), 0), 16);
  v_recent integer;
begin
  if p_dhash is null or p_dhash !~ '^[0-9a-f]{16}$' then
    raise exception 'La huella de la foto tiene que ser un dHash de 16 caracteres hexadecimales.';
  end if;
  if v_reporter_hash is null then
    raise exception 'Falta el identificador del dispositivo.';
  end if;
  v_hash := ('x' || p_dhash)::bit(64)::bigint;

  -- 1) Coincidencias de OTROS dispositivos (las propias no cuentan como reutilización).
  return query
    select
      bit_count((s.dhash # v_hash)::bit(64))::integer,
      s.city,
      s.monthly_rent_ars,
      s.created_at::date,
      case
        when (v_identifier_hash is null or s.identifier_hash is null)
         and (v_phone_hash is null or s.phone_hash is null) then null
        else coalesce(v_identifier_hash = s.identifier_hash, false)
          or coalesce(v_phone_hash = s.phone_hash, false)
      end
    from public.photo_sightings s
    where s.reporter_hash <> v_reporter_hash
      and bit_count((s.dhash # v_hash)::bit(64)) <= v_threshold
    order by 1, s.created_at desc
    limit 5;

  -- 2) Registrar esta verificación (con tope por dispositivo para frenar spam).
  select count(*) into v_recent
  from public.photo_sightings s
  where s.reporter_hash = v_reporter_hash
    and s.created_at > now() - interval '1 hour';

  if v_recent < 30
     and p_city in ('CABA', 'Córdoba', 'La Plata', 'Rosario')
     and p_monthly_rent_ars between 1000 and 100000000 then
    insert into public.photo_sightings (
      dhash, city, monthly_rent_ars, identifier_hash, phone_hash, reporter_hash
    ) values (
      v_hash, p_city, p_monthly_rent_ars, v_identifier_hash, v_phone_hash, v_reporter_hash
    )
    on conflict on constraint photo_sightings_dedupe do nothing;
  end if;
end;
$$;

revoke all on function public.match_and_register_photo(text, text, integer, text, text, text, integer) from public;
grant execute on function public.match_and_register_photo(text, text, integer, text, text, text, integer) to anon, authenticated;
