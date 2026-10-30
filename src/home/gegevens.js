/**
 * Alle inhoud van de homepagina op één plek.
 * Iets wijzigen of toevoegen? Pas het hier aan; de site past zich vanzelf aan.
 * Regels met PLACEHOLDER vervang je door de echte gegevens.
 */

/* ------------------------------------------------------------------ wagens */

// Nieuwste eerst. De tijdlijn toont precies deze jaren (oud naar nieuw) en 'Wagens gebouwd' telt ze.
// Een jaar zonder wagen laat je gewoon weg.
// foto:  hoofdfoto (zet bestanden in public/wagens/, liefst als .webp). Leeg = nette placeholder.
// uitsnede: optioneel, welk deel van de foto in beeld blijft als hij bijgesneden wordt,
//        bijvoorbeeld '50% 10%' (midden, bijna bovenaan). Standaard het midden.
// plek:  eindklassering in de optocht (getal). Laat weg als er geen is; dan verdwijnt de sticker.
//        Een 1e, 2e of 3e plek telt vanzelf mee bij 'Podiumplekken' onder Over de Bende.
// tekst: optioneel stukje tekst onder de titel (staat nu bij geen enkele wagen).
// fotos: { wagen: [...], bouw: [...] } voor het fotoalbum achter de knop.
export const wagens = [
  {
    jaar: 2026,
    titel: 'Woningnood in Zwaag',
    foto: '/wagens/2026-woningnood-in-zwaag-v2.webp',
    uitsnede: '50% 8%', // helm van de bouwvakker in beeld houden
    plek: 4,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2025,
    titel: 'Los in ons insectenbos',
    foto: '/wagens/2025-los-in-ons-insectenbos.jpg',
    plek: 4,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2024,
    titel: 'Prins Drikus rock(e)t man!',
    foto: '/wagens/2024-prins-drikus-rocket-man.jpg',
    plek: 4,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2023,
    titel: 'Wie weet waar Atlantis',
    foto: '/wagens/2023-wie-weet-waar-atlantis.jpg',
    plek: 5,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2022,
    titel: 'Gooi die bierpullen maar vol',
    foto: '/wagens/2022-gooi-die-bierpullen-maar-vol.jpg',
    plek: 6,
    fotos: { wagen: [], bouw: [] },
  },
  // 2021: geen optocht, dus ook geen wagen.
  {
    jaar: 2020,
    titel: 'Leven op het platteland',
    foto: '/wagens/2020-boeren.webp',
    plek: 9,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2019,
    titel: 'Stuurloos',
    foto: '/wagens/2019-piratenboot.webp',
    plek: 11,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2018,
    titel: 'Non-actief met carnaval',
    foto: '/wagens/2018-non-actief-met-carnaval.webp',
    fotos: { wagen: [], bouw: [] },
  },
];

/* ------------------------------------------------------------------ over de bende */

export const deBende = {
  kop: 'Een Bende van Ellende',
  alineas: [
    'Wij zijn de Bende van Ellende. Van de eerste ideeën bedenken in de kroeg tot de laatste lik verf in de schuur: alles bedenken, lassen, schroeven, piepschuimen en schilderen we zelf.',
    'Wekenlang bouwen we avond aan avond aan één doel. En als de wagen dan eindelijk door de straten van Zwaag rolt, vieren we dat samen met iedereen die langs de kant staat.',
  ],
  foto: '/bende/groep.jpg',
  // Getallen naast de tekst. Laat 'waarde' leeg om een getal te verbergen.
  // Het aantal wagens telt de site zelf uit de lijst hierboven.
  feiten: [
    { waarde: '', label: 'Opgericht' }, // PLACEHOLDER, bijvoorbeeld '2015'
    { waarde: '', label: 'Leden' }, // PLACEHOLDER, bijvoorbeeld '24'
  ],
};

/* ------------------------------------------------------------------ aftellen en agenda */

// De grote teller. Na de datum toont de site vanzelf een feestelijke melding.
export const aftellen = {
  titel: 'Carnaval 2027',
  datum: '2027-02-07T13:00:00', // PLACEHOLDER: controleer datum en starttijd van de optocht
  omschrijving: 'Zondag 7 februari rollen we door Zwaag. Zorg dat je erbij bent.', // PLACEHOLDER
};

// Agenda-items. Laat de lijst leeg tot de data bekend zijn; dan toont de site een nette melding.
export const agenda = [
  // { datum: '2027-02-07', titel: 'Grote optocht', plaats: 'Zwaag', tijd: '13:00' },
];

/* ------------------------------------------------------------------ sponsors */

// Zelfde volgorde als op het sponsordoek 2026. Logo's staan in public/sponsors/ (doorzichtig PNG).
// bouwplaats: krijgt een eigen blok bovenaan, zonder hen geen wagen.
// niveau 'hoofd': de drie grote tegels met het label Hoofdsponsor; de rest schuift voorbij in twee rijen.
// donker: logo met lichte letters, krijgt een donkere tegel.
// url:    link naar de website van de sponsor (optioneel).
export const bouwplaats = {
  naam: 'Familie Van der Laan',
  foto: '/bende/bouwplaats.webp', // leeg = alleen tekst
  tekst: 'Bij hen bouwen we elk jaar onze wagen. Zonder hun schuur, hun hulp en hun geduld komen we niet verder. Enorm bedankt!',
};

const logo = (bestand, naam, extra = {}) => ({ naam, logo: `/sponsors/${bestand}.png`, url: '', ...extra });

export const sponsors = [
  logo('de-witte-valk', 'Partycentrum De Witte Valk', { niveau: 'hoofd' }),
  logo('mookys-belettering', 'Mooky’s Belettering', { niveau: 'hoofd' }),
  logo('ep-beerepoot', 'EP Beerepoot', { niveau: 'hoofd' }),
  logo('hekoned', 'HekoNed Engineering'),
  logo('happy-cooker', 'De Happy Cooker'),
  logo('giling', 'Giling Custom Made Products'),
  logo('schipper', 'Schipper administratie & advies'),
  logo('van-der-laan', 'Van der Laan'),
  logo('1671', '1671 Finance & Organize'),
  logo('ccg-raamdecoratie', 'CCG Raamdecoratie'),
  logo('peerdeman', 'Bouwbedrijf C. Peerdeman & Zonen'),
  logo('bob-mens', 'Aannemersbedrijf Bob Mens'),
  logo('autobedrijf-avenhorn', 'Autobedrijf Avenhorn'),
  logo('ks-verlichting', 'KS Verlichting'),
  logo('more', 'More verbouwing'),
  logo('brasserie-doude-veiling', 'Brasserie d’Oude Veiling'),
  logo('veldboer-eenhoorn', 'Veldboer Eenhoorn'),
  logo('karo', 'KaRo'),
  logo('auxilium', 'Auxilium Hoorn'),
  logo('dj-longbow', 'DJ Longbow'),
  logo('rene-kramer', 'René Kramer schilderwerken'),
  logo('johan-rood', 'Johan Rood Project- en Woningstoffering'),
  logo('karsten-tenten', 'Karsten Tenten'),
  logo('mini-snackbar', 'Mini Snackbar'),
  logo('van-engen', 'Kraanverhuur R. van Engen'),
  logo('stabo', 'Stabo'),
  logo('erik-snip', 'Rijschool Erik Snip'),
  logo('hans-bakker', 'Hans Bakker TMT Werken'),
  logo('kapsalon-marly', 'Kapsalon Marly', { donker: true }),
  logo('swagerman', 'Swagerman slapen & wonen', { donker: true }),
  logo('anita-coffeng', 'Anita Coffeng Haarmode', { donker: true }),
  logo('slaapkenner-theo-bot', 'Slaapkenner Theo Bot', { donker: true }),
];


// Waar de knop ‘Word ook sponsor’ naartoe gaat, bijvoorbeeld 'mailto:...'. Leeg = naar ons Instagram-profiel.
export const sponsorWorden = '';

/* ------------------------------------------------------------------ instagram */

export const instagram = {
  account: 'bendevanellendezwaag',
  url: 'https://www.instagram.com/bendevanellendezwaag/',
};

/* ------------------------------------------------------------------ menu */

// Pagina's in het menu. Zolang alles op de homepagina staat, wijzen ze naar de juiste plek.
// Komt er een losse pagina bij? Zet de href op bijvoorbeeld '/agenda'. klaar: false toont 'binnenkort'.
export const paginas = [
  { label: 'Onze wagens', href: '#wagens', klaar: true },
  { label: 'De Bende', href: '#over', klaar: true },
  { label: 'Agenda', href: '#agenda', klaar: true },
  { label: 'Sponsors', href: '#sponsors', klaar: true },
  { label: 'Instagram', href: '#instagram', klaar: true },
];
