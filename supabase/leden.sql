-- ============================================================
--  Bende van Ellende — ledenomgeving + themastemming
--
--  Voer uit in Supabase: SQL Editor -> New query -> plakken -> Run.
--  Dit script mag je vaker draaien: het maakt niets kapot en leegt niets.
--
--  Leden
--    Iedereen kan een account maken (Supabase Auth, e-mail + wachtwoord). Het
--    allereerste account wordt automatisch beheerder en is meteen goedgekeurd;
--    alle volgende staan op 'wacht' tot de beheerder ze goed- of afkeurt.
--    Alleen goedgekeurde leden zien iets van de ledenomgeving.
--
--  Stemming in drie rondes
--    ronde 1: iedereen zet alle thema's op volgorde (punten: nr. 1 krijgt N, nr. 2 N-1, ...)
--    ronde 2: maximaal 3 stemmen op de thema's die door zijn — uitslag ALLEEN voor de beheerder
--    ronde 3: één stem
--    Na elke ronde kiest de beheerder zelf welke thema's doorgaan (themas.ronde).
--    Een thema doet mee aan ronde r als themas.ronde >= r.
--
--  Beveiliging: RLS op alles. Stemmen kan alleen via stem_uitbrengen(), die
--  controleert of de ronde open is en of de keuze klopt. Wat iemand gestemd
--  heeft ziet alleen hijzelf en de beheerder.
-- ============================================================

-- ---------------------------------------------------------------- leden

create table if not exists public.leden (
  id            uuid primary key references auth.users (id) on delete cascade,
  naam          text not null check (char_length(naam) between 1 and 60),
  email         text not null,
  status        text not null default 'wacht' check (status in ('wacht', 'goedgekeurd', 'afgewezen')),
  rol           text not null default 'lid' check (rol in ('lid', 'beheerder')),
  aangemaakt_op timestamptz not null default now()
);
alter table public.leden enable row level security;

create or replace function public.is_lid()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (select 1 from public.leden where id = auth.uid() and status = 'goedgekeurd');
$fn$;

create or replace function public.is_beheerder()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.leden
    where id = auth.uid() and status = 'goedgekeurd' and rol = 'beheerder');
$fn$;

-- Nieuw account -> rij in leden. De eerste wordt beheerder.
create or replace function public.nieuw_lid()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_eerste boolean;
begin
  perform pg_advisory_xact_lock(4242);
  v_eerste := not exists (select 1 from public.leden where rol = 'beheerder');
  insert into public.leden (id, naam, email, status, rol)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'naam'), ''), split_part(new.email, '@', 1)), 60),
    new.email,
    case when v_eerste then 'goedgekeurd' else 'wacht' end,
    case when v_eerste then 'beheerder' else 'lid' end)
  on conflict (id) do nothing;
  return new;
end $fn$;

drop trigger if exists leden_nieuw on auth.users;
create trigger leden_nieuw
  after insert on auth.users
  for each row execute function public.nieuw_lid();

drop policy if exists "leden lezen" on public.leden;
create policy "leden lezen" on public.leden
  for select to authenticated
  using (id = auth.uid() or public.is_beheerder());

-- Goed- of afkeuren (niet jezelf).
create or replace function public.lid_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_beheerder() then
    raise exception 'Alleen de beheerder kan dit' using errcode = '42501';
  end if;
  if p_id = auth.uid() then
    raise exception 'Je kunt je eigen account niet afkeuren' using errcode = '42501';
  end if;
  update public.leden set status = p_status where id = p_id;
end $fn$;

-- Iemand (ook) beheerder maken, of dat weer intrekken (niet bij jezelf).
create or replace function public.lid_rol(p_id uuid, p_rol text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_beheerder() then
    raise exception 'Alleen de beheerder kan dit' using errcode = '42501';
  end if;
  if p_id = auth.uid() then
    raise exception 'Je kunt je eigen rol niet wijzigen' using errcode = '42501';
  end if;
  update public.leden set rol = p_rol where id = p_id;
end $fn$;

create or replace function public.mijn_naam(p_naam text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  update public.leden set naam = left(trim(p_naam), 60)
  where id = auth.uid() and char_length(trim(p_naam)) > 0;
end $fn$;

-- ---------------------------------------------------------------- thema's

create table if not exists public.themas (
  id            uuid primary key default gen_random_uuid(),
  titel         text not null check (char_length(titel) between 1 and 120),
  kort          text not null default '' check (char_length(kort) <= 300),
  toelichting   text not null default '' check (char_length(toelichting) <= 20000),
  fotos         jsonb not null default '[]'::jsonb,       -- paden in bucket themafotos
  ronde         int not null default 1 check (ronde between 1 and 3),
  aangemaakt_op timestamptz not null default now()
);
alter table public.themas enable row level security;

drop policy if exists "themas lezen" on public.themas;
create policy "themas lezen" on public.themas
  for select to authenticated using (public.is_lid());

drop policy if exists "themas beheren" on public.themas;
create policy "themas beheren" on public.themas
  for all to authenticated
  using (public.is_beheerder()) with check (public.is_beheerder());

-- ---------------------------------------------------------------- rondes

create table if not exists public.rondes (
  nr               int primary key check (nr between 1 and 3),
  status           text not null default 'gepland' check (status in ('gepland', 'open', 'gesloten')),
  uitslag_openbaar boolean not null default false,
  toelichting      text not null default '' check (char_length(toelichting) <= 4000),
  bijgewerkt_op    timestamptz not null default now(),
  check (nr <> 2 or not uitslag_openbaar)                 -- ronde 2 blijft geheim
);
insert into public.rondes (nr) values (1), (2), (3) on conflict (nr) do nothing;
create unique index if not exists rondes_een_open on public.rondes ((true)) where status = 'open';
alter table public.rondes enable row level security;

drop policy if exists "rondes lezen" on public.rondes;
create policy "rondes lezen" on public.rondes
  for select to authenticated using (public.is_lid());

drop policy if exists "rondes beheren" on public.rondes;
create policy "rondes beheren" on public.rondes
  for update to authenticated
  using (public.is_beheerder()) with check (public.is_beheerder());

-- Thema's door naar de volgende ronde: de gekozen gaan naar p_nr + 1, de rest
-- van deze ronde blijft op p_nr (zo kun je de keuze ook nog herzien).
create or replace function public.ronde_doorzetten(p_nr int, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_beheerder() then
    raise exception 'Alleen de beheerder kan dit' using errcode = '42501';
  end if;
  if p_nr not in (1, 2) then
    raise exception 'Alleen na ronde 1 of 2' using errcode = '22023';
  end if;
  update public.themas
     set ronde = case when id = any (p_ids) then p_nr + 1 else p_nr end
   where ronde >= p_nr;
end $fn$;

-- ---------------------------------------------------------------- stemmen

create table if not exists public.stemmen (
  lid           uuid not null references public.leden (id) on delete cascade,
  ronde         int not null check (ronde between 1 and 3),
  keuze         jsonb not null,                            -- thema-id's (ronde 1: beste eerst)
  bijgewerkt_op timestamptz not null default now(),
  primary key (lid, ronde)
);
alter table public.stemmen enable row level security;

drop policy if exists "stemmen lezen" on public.stemmen;
create policy "stemmen lezen" on public.stemmen
  for select to authenticated
  using (lid = auth.uid() or public.is_beheerder());

create or replace function public.stem_uitbrengen(p_ronde int, p_keuze uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_mee int;
  v_n int := coalesce(array_length(p_keuze, 1), 0);
begin
  if not public.is_lid() then
    raise exception 'Je account is (nog) niet goedgekeurd' using errcode = '42501';
  end if;
  if (select status from public.rondes where nr = p_ronde) is distinct from 'open' then
    raise exception 'Deze ronde is niet open' using errcode = '42501';
  end if;
  if v_n <> (select count(distinct x) from unnest(p_keuze) x) then
    raise exception 'Je kiest een thema dubbel' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(p_keuze) x
    where not exists (select 1 from public.themas t where t.id = x and t.ronde >= p_ronde)) then
    raise exception 'Dit thema doet niet mee in deze ronde' using errcode = '22023';
  end if;

  select count(*) into v_mee from public.themas where ronde >= p_ronde;
  if p_ronde = 1 and v_n <> v_mee then
    raise exception 'Zet alle thema''s op volgorde' using errcode = '22023';
  elsif p_ronde = 2 and (v_n < 1 or v_n > 3) then
    raise exception 'Kies 1 tot 3 thema''s' using errcode = '22023';
  elsif p_ronde = 3 and v_n <> 1 then
    raise exception 'Kies precies één thema' using errcode = '22023';
  end if;

  insert into public.stemmen (lid, ronde, keuze, bijgewerkt_op)
  values (auth.uid(), p_ronde, to_jsonb(p_keuze), now())
  on conflict (lid, ronde) do update set keuze = excluded.keuze, bijgewerkt_op = now();
end $fn$;

-- Hoeveel leden er per ronde gestemd hebben (voor iedereen in de ledenomgeving).
create or replace function public.ronde_deelname()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_lid() then
    return null;
  end if;
  return jsonb_build_object(
    'leden', (select count(*) from public.leden where status = 'goedgekeurd'),
    'per_ronde', coalesce((
      select jsonb_object_agg(r.nr, (select count(*) from public.stemmen s where s.ronde = r.nr))
      from public.rondes r), '{}'::jsonb));
end $fn$;

-- Uitslag van een ronde. De beheerder altijd; leden alleen als de beheerder
-- de uitslag openbaar heeft gemaakt — en ronde 2 nooit.
create or replace function public.uitslag(p_ronde int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_beheerder boolean := public.is_beheerder();
  v_n int;
begin
  if not v_beheerder and not (
       public.is_lid() and p_ronde <> 2
       and coalesce((select uitslag_openbaar from public.rondes where nr = p_ronde), false)) then
    return null;
  end if;
  select count(*) into v_n from public.themas where ronde >= p_ronde;

  return jsonb_build_object(
    'aantal_stemmen', (select count(*) from public.stemmen where ronde = p_ronde),
    'stemmers', case when v_beheerder then coalesce((
       select jsonb_agg(l.naam order by l.naam)
       from public.stemmen s join public.leden l on l.id = s.lid
       where s.ronde = p_ronde), '[]'::jsonb) end,
    'rijen', coalesce((
      select jsonb_agg(r order by r.punten desc, r.eerste desc, r.titel)
      from (
        select t.id, t.titel,
               coalesce(sum(case when p_ronde = 1 then v_n - p.plek + 1 else 1 end), 0)::int as punten,
               count(p.plek)::int                                as stemmen,
               count(*) filter (where p.plek = 1)::int           as eerste
        from public.themas t
        left join (
          select s.lid, e.id,
                 row_number() over (partition by s.lid order by e.nr) as plek
          from public.stemmen s
          cross join lateral jsonb_array_elements_text(s.keuze) with ordinality as e(id, nr)
          where s.ronde = p_ronde
            and exists (select 1 from public.themas t2 where t2.id::text = e.id and t2.ronde >= p_ronde)
        ) p on p.id = t.id::text
        where t.ronde >= p_ronde
        group by t.id, t.titel
      ) r), '[]'::jsonb));
end $fn$;

-- ---------------------------------------------------------------- foto's

-- Openbare bucket met willekeurige bestandsnamen: wie de link heeft kan de foto
-- zien, maar niemand kan de lijst opvragen (geen select-policy). Uploaden en
-- verwijderen alleen door de beheerder.
insert into storage.buckets (id, name, public)
values ('themafotos', 'themafotos', true)
on conflict (id) do nothing;

drop policy if exists "themafotos uploaden" on storage.objects;
create policy "themafotos uploaden" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'themafotos' and public.is_beheerder());

drop policy if exists "themafotos verwijderen" on storage.objects;
create policy "themafotos verwijderen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'themafotos' and public.is_beheerder());

-- ---------------------------------------------------------------- rechten

revoke all on function public.nieuw_lid()                   from public, anon, authenticated;
revoke all on function public.lid_status(uuid, text)        from public, anon;
revoke all on function public.lid_rol(uuid, text)           from public, anon;
revoke all on function public.mijn_naam(text)               from public, anon;
revoke all on function public.ronde_doorzetten(int, uuid[]) from public, anon;
revoke all on function public.stem_uitbrengen(int, uuid[])  from public, anon;
revoke all on function public.ronde_deelname()              from public, anon;
revoke all on function public.uitslag(int)                  from public, anon;

grant execute on function public.lid_status(uuid, text)        to authenticated;
grant execute on function public.lid_rol(uuid, text)           to authenticated;
grant execute on function public.mijn_naam(text)               to authenticated;
grant execute on function public.ronde_doorzetten(int, uuid[]) to authenticated;
grant execute on function public.stem_uitbrengen(int, uuid[])  to authenticated;
grant execute on function public.ronde_deelname()              to authenticated;
grant execute on function public.uitslag(int)                  to authenticated;
grant execute on function public.is_lid()                      to authenticated;
grant execute on function public.is_beheerder()                to authenticated;

-- Anoniem kan niets lezen of schrijven in deze tabellen.
revoke all on public.leden, public.themas, public.rondes, public.stemmen from anon;
