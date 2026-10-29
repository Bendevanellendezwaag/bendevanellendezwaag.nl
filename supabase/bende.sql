-- ============================================================
--  Bende van Ellende — thema's ranken voor de carnavalsvergadering
--  Voor bendevanellende.nl/stemmen, in een eigen Supabase-project.
--  De beheerderscode zelf staat NIET in dit bestand: die zet je er één keer in
--  met supabase/beheercode.local.sql (gitignored).
--
--  Voer uit in Supabase: SQL Editor -> New query -> plakken -> Run.
--  Dit script mag je vaker draaien: het maakt niets kapot en leegt niets.
--
--  Hoe het werkt:
--    fase 'invoeren' -> de beheerder zet de thema's erin, iedereen ziet ze binnenkomen
--    fase 'stemmen'  -> iedereen zet met zijn naam alle thema's op volgorde
--    fase 'uitslag'  -> iedereen ziet de uitslag
--  Punten: met N thema's krijgt je nummer 1 N punten, nummer 2 N-1, enzovoort.
--
--  Beveiliging: de tabellen zitten helemaal dicht (RLS aan, geen policy). Alles
--  loopt via de functies hieronder. Stemmen kan alleen in de fase 'stemmen', en
--  alleen je eigen stem (per toestel). Thema's en fases alleen met een
--  beheerderscode. Wie wat gestemd heeft ziet alleen de beheerder.
--
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- Beheerderscodes, alleen als hash. Geen policy: niemand kan ze lezen.
create table if not exists public.bve_beheerders (
  naam      text primary key,
  code_hash text not null
);
alter table public.bve_beheerders enable row level security;

create or replace function public.bve_is_beheerder(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $fn$
  select coalesce(p_code, '') <> '' and exists (
    select 1 from public.bve_beheerders b
    where b.code_hash = extensions.crypt(p_code, b.code_hash));
$fn$;

create table if not exists public.bve_status (
  id            int primary key default 1 check (id = 1),
  fase          text not null default 'invoeren' check (fase in ('invoeren', 'stemmen', 'uitslag')),
  bijgewerkt_op timestamptz not null default now()
);
insert into public.bve_status (id) values (1) on conflict (id) do nothing;

create table if not exists public.bve_themas (
  id            uuid primary key default gen_random_uuid(),
  titel         text not null check (char_length(titel) between 1 and 120),
  aangemaakt_op timestamptz not null default now()
);

create table if not exists public.bve_stemmen (
  toestel       text primary key check (char_length(toestel) between 8 and 64),
  naam          text not null check (char_length(naam) between 1 and 40),
  volgorde      jsonb not null default '[]'::jsonb,   -- thema-id's, beste eerst
  bijgewerkt_op timestamptz not null default now()
);

-- Wie er meedoet: zodra je je naam invult. gezien_op loopt mee zolang het
-- scherm openstaat, zo ziet de beheerder wie er nu online is.
create table if not exists public.bve_deelnemers (
  toestel       text primary key check (char_length(toestel) between 8 and 64),
  naam          text not null check (char_length(naam) between 1 and 40),
  aangemeld_op  timestamptz not null default now(),
  gezien_op     timestamptz not null default now()
);

alter table public.bve_deelnemers enable row level security;
alter table public.bve_status  enable row level security;
alter table public.bve_themas  enable row level security;
alter table public.bve_stemmen enable row level security;

-- Alles wat het scherm nodig heeft in één keer. De uitslag (en wie er gestemd
-- heeft per toestel) alleen voor de beheerder, of voor iedereen bij 'uitslag'.
create or replace function public.bve_stand(p_code text default null, p_toestel text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_fase text;
  v_beheerder boolean;
  v_n int;
begin
  select fase into v_fase from public.bve_status where id = 1;
  v_beheerder := coalesce(public.bve_is_beheerder(p_code), false);
  select count(*) into v_n from public.bve_themas;

  return jsonb_build_object(
    'fase', v_fase,
    'beheerder', v_beheerder,
    'themas', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'titel', t.titel) order by t.aangemaakt_op)
      from public.bve_themas t), '[]'::jsonb),
    'aantal_stemmen', (select count(*) from public.bve_stemmen),
    'aantal_deelnemers', (select count(*) from public.bve_deelnemers),
    'deelnemers', case when v_beheerder then coalesce((
      select jsonb_agg(jsonb_build_object(
               'toestel', d.toestel,
               'naam', coalesce(s.naam, d.naam),
               'gestemd', s.toestel is not null,
               'online', d.gezien_op > now() - interval '40 seconds')
             order by d.aangemeld_op)
      from public.bve_deelnemers d
      left join public.bve_stemmen s on s.toestel = d.toestel), '[]'::jsonb) end,
    'mijn_stem', (
      select jsonb_build_object('naam', s.naam, 'volgorde', s.volgorde)
      from public.bve_stemmen s where s.toestel = p_toestel),
    'stemmers', case when v_beheerder then coalesce((
      select jsonb_agg(jsonb_build_object('toestel', s.toestel, 'naam', s.naam) order by s.bijgewerkt_op)
      from public.bve_stemmen s), '[]'::jsonb) end,
    'uitslag', case when v_beheerder or v_fase = 'uitslag' then coalesce((
      select jsonb_agg(r order by r.punten desc, r.eerste desc, r.titel)
      from (
        select t.id, t.titel,
               coalesce(sum(v_n - p.plek + 1), 0)::int        as punten,
               round(avg(p.plek), 1)                            as gem_plek,
               count(*) filter (where p.plek = 1)::int          as eerste,
               count(*) filter (where p.plek <= 3)::int         as top3
        from public.bve_themas t
        left join (
          -- plek opnieuw tellen over de thema's die nog bestaan
          select s.toestel, e.id,
                 row_number() over (partition by s.toestel order by e.nr) as plek
          from public.bve_stemmen s
          cross join lateral jsonb_array_elements_text(s.volgorde) with ordinality as e(id, nr)
          where exists (select 1 from public.bve_themas t2 where t2.id::text = e.id)
        ) p on p.id = t.id::text
        group by t.id, t.titel
      ) r), '[]'::jsonb) end
  );
end $fn$;

create or replace function public.bve_aanmelden(p_toestel text, p_naam text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  insert into public.bve_deelnemers (toestel, naam)
  values (p_toestel, left(trim(p_naam), 40))
  on conflict (toestel) do update
    set naam = excluded.naam, gezien_op = now();
end $fn$;

create or replace function public.bve_stem(p_toestel text, p_naam text, p_volgorde jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if (select fase from public.bve_status where id = 1) <> 'stemmen' then
    raise exception 'De stemming is niet open' using errcode = '42501';
  end if;
  if jsonb_typeof(p_volgorde) <> 'array' or jsonb_array_length(p_volgorde) > 200 then
    raise exception 'Ongeldige volgorde' using errcode = '22023';
  end if;
  insert into public.bve_stemmen (toestel, naam, volgorde, bijgewerkt_op)
  values (p_toestel, trim(p_naam), p_volgorde, now())
  on conflict (toestel) do update
    set naam = excluded.naam, volgorde = excluded.volgorde, bijgewerkt_op = now();
  perform public.bve_aanmelden(p_toestel, p_naam);
end $fn$;

-- Alles hieronder alleen met een beheerderscode.
create or replace function public.bve_eis_beheerder(p_code text)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.bve_is_beheerder(p_code) then
    raise exception 'Hier heb je de rechten niet voor' using errcode = '42501';
  end if;
end $fn$;

create or replace function public.bve_thema_toevoegen(p_code text, p_titel text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  perform public.bve_eis_beheerder(p_code);
  insert into public.bve_themas (titel) values (left(trim(p_titel), 120));
end $fn$;

create or replace function public.bve_thema_wijzig(p_code text, p_id uuid, p_titel text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  perform public.bve_eis_beheerder(p_code);
  update public.bve_themas set titel = left(trim(p_titel), 120) where id = p_id;
end $fn$;

create or replace function public.bve_thema_verwijder(p_code text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  perform public.bve_eis_beheerder(p_code);
  delete from public.bve_themas where id = p_id;
end $fn$;

create or replace function public.bve_fase(p_code text, p_fase text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  perform public.bve_eis_beheerder(p_code);
  update public.bve_status set fase = p_fase, bijgewerkt_op = now() where id = 1;
end $fn$;

create or replace function public.bve_stem_verwijder(p_code text, p_toestel text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  perform public.bve_eis_beheerder(p_code);
  delete from public.bve_stemmen where toestel = p_toestel;
  delete from public.bve_deelnemers where toestel = p_toestel;
end $fn$;

-- Opnieuw beginnen: alle stemmen weg (de thema's blijven staan).
create or replace function public.bve_stemmen_wissen(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  perform public.bve_eis_beheerder(p_code);
  delete from public.bve_stemmen where true;
end $fn$;

revoke all on function public.bve_stand(text, text)                from public;
revoke all on function public.bve_stem(text, text, jsonb)          from public;
revoke all on function public.bve_aanmelden(text, text)           from public;
revoke all on function public.bve_eis_beheerder(text)             from public, anon, authenticated;
revoke all on function public.bve_thema_toevoegen(text, text)     from public;
revoke all on function public.bve_thema_wijzig(text, uuid, text)  from public;
revoke all on function public.bve_thema_verwijder(text, uuid)     from public;
revoke all on function public.bve_fase(text, text)                from public;
revoke all on function public.bve_stem_verwijder(text, text)      from public;
revoke all on function public.bve_stemmen_wissen(text)            from public;

grant execute on function public.bve_stand(text, text)               to anon, authenticated;
grant execute on function public.bve_stem(text, text, jsonb)         to anon, authenticated;
grant execute on function public.bve_aanmelden(text, text)          to anon, authenticated;
grant execute on function public.bve_thema_toevoegen(text, text)     to anon, authenticated;
grant execute on function public.bve_thema_wijzig(text, uuid, text)  to anon, authenticated;
grant execute on function public.bve_thema_verwijder(text, uuid)     to anon, authenticated;
grant execute on function public.bve_fase(text, text)                to anon, authenticated;
grant execute on function public.bve_stem_verwijder(text, text)      to anon, authenticated;
grant execute on function public.bve_stemmen_wissen(text)            to anon, authenticated;
revoke all on function public.bve_is_beheerder(text)              from public, anon, authenticated;
