-- ============================================================
--  Bende van Ellende — sponsorbeheer (alleen de beheerder)
--
--  Voer uit in Supabase: SQL Editor -> New query -> plakken -> Run.
--  Mag vaker draaien: het maakt niets kapot en leegt niets.
--  Vereist leden.sql (de functie is_beheerder()).
--
--  sponsoren          één rij per sponsor (bedrijf of familie/vriend), met de
--                     gegevens die later op een factuur komen
--  sponsorbijdragen   per sponsor per jaar: bedrag of iets in natura, en hoe
--                     het staat (contact, factuur, ontvangen)
--  sponsorjaren       de carnavalsjaren in het overzicht + eigen inleg
--
--  Lezen en schrijven kan alleen de beheerder: de lijst bevat e-mailadressen.
-- ============================================================

create table if not exists public.sponsoren (
  id            uuid primary key default gen_random_uuid(),
  naam          text not null check (char_length(naam) between 1 and 120),
  soort         text not null default 'zakelijk' check (soort in ('zakelijk', 'familie')),
  contact_via   text,          -- wie van de bende het contact heeft
  benadering    text check (benadering in ('fysiek', 'mail', 'app')),
  email         text,
  telefoon      text,
  contactpersoon text,         -- naam bij de sponsor (voor op de factuur)
  adres         text,
  postcode      text,
  plaats        text,
  kvk           text,
  btw           text,
  notitie       text,
  aangemaakt_op timestamptz not null default now()
);
alter table public.sponsoren enable row level security;

create table if not exists public.sponsorjaren (
  jaar        int primary key check (jaar between 2000 and 2100),
  eigen_inleg numeric(10, 2),
  notitie     text
);
alter table public.sponsorjaren enable row level security;

create table if not exists public.sponsorbijdragen (
  id          uuid primary key default gen_random_uuid(),
  sponsor     uuid not null references public.sponsoren (id) on delete cascade,
  jaar        int not null references public.sponsorjaren (jaar) on delete cascade,
  bedrag      numeric(10, 2) check (bedrag >= 0),  -- 0 = benaderd, maar niets dit jaar
  natura      text,                                -- bijv. 'Bouwplaats', 'Frituur', 'Hout'
  contact     boolean not null default false,      -- al contact gehad
  reactie     boolean not null default false,      -- al reactie gekregen
  betaalwijze text check (betaalwijze in ('factuur', 'tikkie', 'contant')),
  factuurnr   text,
  ontvangen   boolean not null default false,
  uitnodiging boolean not null default false,      -- uitnodiging sponsoravond verstuurd
  notitie     text,
  unique (sponsor, jaar)
);
alter table public.sponsorbijdragen enable row level security;
create index if not exists sponsorbijdragen_jaar on public.sponsorbijdragen (jaar);

drop policy if exists "sponsoren beheer" on public.sponsoren;
create policy "sponsoren beheer" on public.sponsoren
  for all to authenticated
  using (public.is_beheerder()) with check (public.is_beheerder());

drop policy if exists "sponsorjaren beheer" on public.sponsorjaren;
create policy "sponsorjaren beheer" on public.sponsorjaren
  for all to authenticated
  using (public.is_beheerder()) with check (public.is_beheerder());

drop policy if exists "sponsorbijdragen beheer" on public.sponsorbijdragen;
create policy "sponsorbijdragen beheer" on public.sponsorbijdragen
  for all to authenticated
  using (public.is_beheerder()) with check (public.is_beheerder());

revoke all on public.sponsoren, public.sponsorjaren, public.sponsorbijdragen from anon;

insert into public.sponsorjaren (jaar) values (2024), (2025), (2026), (2027)
on conflict (jaar) do nothing;

-- ---------------------------------------------------------------- facturen (30-10-2026)

-- Officiële naam op de factuur (bijv. 'HekoNed Engineering B.V.'); leeg = gewone naam.
alter table public.sponsoren add column if not exists factuurnaam text;
alter table public.sponsorbijdragen add column if not exists factuurdatum date;

-- Vaste teksten en bankgegevens van de factuur: één rij.
create table if not exists public.factuurinstellingen (
  id               int primary key default 1 check (id = 1),
  iban             text,
  tnv              text,
  email            text,
  intro            text,
  omschrijving     text,
  slot             text,
  afbeelding       text,   -- pad in de bucket themafotos, of een url
  afbeelding_tekst text,
  volg             text
);
alter table public.factuurinstellingen enable row level security;

drop policy if exists "factuurinstellingen beheer" on public.factuurinstellingen;
create policy "factuurinstellingen beheer" on public.factuurinstellingen
  for all to authenticated
  using (public.is_beheerder()) with check (public.is_beheerder());

revoke all on public.factuurinstellingen from anon;

insert into public.factuurinstellingen (id, intro, omschrijving, slot, afbeelding_tekst, volg)
values (
  1,
  'Uw bijdrage is enorm waardevol voor ons, wij zetten dit jaar weer alles op alles om u te verbazen. Tot ziens bij de sponsoravond of de optocht!',
  'Gelieve factuurnummer en bedrijfsnaam vermelden in de omschrijving',
  'Bedankt voor uw bijdrage namens de hele groep',
  'Bouwtekening carnaval {jaar}',
  'Blijf op de hoogte van het bouwproces via onze Instagram en Facebook!')
on conflict (id) do nothing;

-- ---------------------------------------------------------------- eigen inleg per lid (30-10-2026)
--
-- Flexibele inleg: ieder lid legt een eigen bedrag in. inleggers = de leden van de
-- bende (los van de accounts, niet iedereen heeft er een). Zolang er voor een jaar
-- geen inleg per lid is ingevuld, telt sponsorjaren.eigen_inleg als totaal.

create table if not exists public.inleggers (
  id            uuid primary key default gen_random_uuid(),
  naam          text not null check (char_length(naam) between 1 and 60),
  actief        boolean not null default true,
  aangemaakt_op timestamptz not null default now()
);
alter table public.inleggers enable row level security;

create table if not exists public.inleg (
  id       uuid primary key default gen_random_uuid(),
  inlegger uuid not null references public.inleggers (id) on delete cascade,
  jaar     int not null references public.sponsorjaren (jaar) on delete cascade,
  bedrag   numeric(10, 2) check (bedrag >= 0),  -- per maand; het jaar telt 12 x dit bedrag
  betaald  boolean not null default false,
  notitie  text,
  unique (inlegger, jaar)
);
alter table public.inleg enable row level security;

drop policy if exists "inleggers beheer" on public.inleggers;
create policy "inleggers beheer" on public.inleggers
  for all to authenticated
  using (public.is_beheerder()) with check (public.is_beheerder());

drop policy if exists "inleg beheer" on public.inleg;
create policy "inleg beheer" on public.inleg
  for all to authenticated
  using (public.is_beheerder()) with check (public.is_beheerder());

revoke all on public.inleggers, public.inleg from anon;

-- ---------------------------------------------------------------- overzicht voor leden (01-11-2026)
--
-- Leden zien (alleen lezen) welke sponsoren meedoen en voor welk bedrag. Alleen
-- bijdragen met een bedrag die de beheerder bevestigd heeft: er is een factuur
-- of toezegging (betaalwijze gekozen of factuurnummer ingevuld) of het geld is
-- al ontvangen. Geen contactgegevens, notities of bijdragen in natura.
-- De tabellen zelf blijven alleen voor de beheerder.

create or replace function public.sponsoroverzicht()
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
  return coalesce((
    select jsonb_agg(jsonb_build_object('jaar', j.jaar, 'sponsoren', j.sponsoren) order by j.jaar)
    from (
      select b.jaar,
             jsonb_agg(jsonb_build_object(
               'naam', s.naam,
               'soort', s.soort,
               'bedrag', b.bedrag,
               'ontvangen', b.ontvangen) order by b.bedrag desc, s.naam) as sponsoren
      from public.sponsorbijdragen b
      join public.sponsoren s on s.id = b.sponsor
      where b.bedrag > 0
        and (b.betaalwijze is not null or nullif(trim(b.factuurnr), '') is not null or b.ontvangen)
      group by b.jaar
    ) j), '[]'::jsonb);
end $fn$;

revoke all on function public.sponsoroverzicht() from public, anon;
grant execute on function public.sponsoroverzicht() to authenticated;
