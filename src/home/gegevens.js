/**
 * Alle inhoud van de homepagina op één plek.
 * Iets wijzigen of toevoegen? Pas het hier aan; de site past zich vanzelf aan.
 * Regels met PLACEHOLDER vervang je door de echte gegevens.
 */

/* ------------------------------------------------------------------ wagens */

// Nieuwste eerst. De tijdlijn loopt van het oudste jaar tot het nieuwste.
// foto:  hoofdfoto (zet bestanden in public/wagens/, liefst als .webp). Leeg = nette placeholder.
// plek:  eindklassering in de optocht (getal). Laat weg als er geen is; dan verdwijnt de sticker.
// fotos: { wagen: [...], bouw: [...] } voor het fotoalbum achter de knop.
export const wagens = [
  {
    jaar: 2026,
    titel: 'Woningnood in Zwaag',
    tekst:
      'We waren klaar met de woningnood, dus zijn we zelf maar huizen gaan bouwen. We behaalden dit jaar een mooie 4e plek.',
    foto: '/wagens/2026-woningnood-in-zwaag.webp',
    plek: 4,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2025,
    titel: 'Kriebelbeestjes', // PLACEHOLDER: echte naam van de wagen
    tekst: 'Een kleurrijke tuin vol vrolijke beestjes: krekel, libelle en neushoornkever. Goed voor een 4e plek.',
    foto: '/wagens/2025-kriebelbeestjes.jpg',
    plek: 4,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2024,
    titel: 'Henrikus rock(e)t man!',
    tekst: 'Een sterrenshow met een rockster achter de piano en een astronaut op zijn raket. Opnieuw een 4e plek.',
    foto: '/wagens/2024-henrikus-rocket-man.jpg',
    plek: 4,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2023,
    titel: 'Poseidon', // PLACEHOLDER: echte naam van de wagen
    tekst: 'Poseidon op zijn tempel, met een octopus en een reuzenschildpad die door de straten zwom. We werden 5e.',
    foto: '/wagens/2023-poseidon.jpg',
    plek: 5,
    fotos: { wagen: [], bouw: [] },
  },
  {
    jaar: 2022,
    titel: 'Carnaval in Tirol, gooi de bierpullen maar',
    tekst: 'Een Tiroler skihut met bratwurst, bierpullen en een skiër op het dak. Goed voor een 6e plek.',
    foto: '/wagens/2022-carnaval-in-tirol.jpg',
    plek: 6,
    fotos: { wagen: [], bouw: [] },
  },
  // PLACEHOLDER: eerdere jaren
  ...[2021, 2020, 2019].map((jaar) => ({
    jaar,
    titel: `Wagen ${jaar}`,
    tekst: 'De naam, het verhaal en de foto’s van deze wagen volgen binnenkort.',
    foto: '',
    fotos: { wagen: [], bouw: [] },
  })),
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

// niveau: 'hoofd' (grote tegels bovenaan) of 'sponsor'.
// logo: pad naar een (liefst witte of transparante) afbeelding in public/sponsors/. Zonder logo toont de site de naam.
// PLACEHOLDERS: vervang door de echte sponsors.
export const sponsors = [
  ...Array.from({ length: 3 }, (_, i) => ({ naam: `Hoofdsponsor ${i + 1}`, niveau: 'hoofd', logo: '', url: '' })),
  ...Array.from({ length: 21 }, (_, i) => ({ naam: `Sponsor ${i + 1}`, niveau: 'sponsor', logo: '', url: '' })),
];

// Waar de knop ‘Word ook sponsor’ naartoe gaat, bijvoorbeeld 'mailto:...'. Leeg = naar ons Instagram-profiel.
export const sponsorWorden = '';

/* ------------------------------------------------------------------ instagram */

export const instagram = {
  account: 'bendevanellendezwaag',
  url: 'https://www.instagram.com/bendevanellendezwaag/',
  // De 3 nieuwste posts komen automatisch binnen via een gratis Behold-feed (behold.so):
  // maak daar een account, koppel Instagram, kies 'JSON feed' en plak de feed-link hieronder,
  // bijvoorbeeld 'https://feeds.behold.so/AbCdEf123'. Zolang dit leeg is, toont de site nette tegels
  // die naar het Instagram-profiel linken.
  feed: '',
};

/* ------------------------------------------------------------------ menu */

// Pagina's in het menu. Zolang alles op de homepagina staat, wijzen ze naar de juiste plek.
// Komt er een losse pagina bij? Zet de href op bijvoorbeeld '/agenda'. klaar: false toont 'binnenkort'.
export const paginas = [
  { label: 'Home', href: '#top', klaar: true },
  { label: 'Onze wagens', href: '#wagens', klaar: true },
  { label: 'De Bende', href: '#over', klaar: true },
  { label: 'Agenda', href: '#agenda', klaar: true },
  { label: 'Sponsors', href: '#sponsors', klaar: true },
  { label: 'Instagram', href: '#instagram', klaar: true },
];
