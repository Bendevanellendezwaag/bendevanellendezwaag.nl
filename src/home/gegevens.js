/**
 * Alle inhoud van de homepagina op één plek.
 * Iets wijzigen of toevoegen? Pas het hier aan; de site past zich vanzelf aan.
 * Regels met PLACEHOLDER vervang je door de echte gegevens.
 */

/* ------------------------------------------------------------------ wagens */

// Nieuwste eerst. De tijdlijn loopt van het oudste jaar tot het nieuwste.
// foto:  hoofdfoto naast de titel (zet bestanden in public/wagens/). Leeg = nette placeholder.
// fotos: { wagen: [...], bouw: [...] } voor het fotoalbum achter de knop.
export const wagens = [
  {
    jaar: 2026,
    titel: 'Naam of spreuk van de wagen', // PLACEHOLDER
    tekst:
      'Hier komt een kort stukje over de wagen van dit jaar: het idee erachter, hoe lang we gebouwd hebben en wat je ervan moet weten als je hem langs ziet komen.', // PLACEHOLDER
    foto: '/wagens/placeholder-2026.svg', // PLACEHOLDER
    fotos: { wagen: [], bouw: [] },
  },
  // PLACEHOLDER: eerdere jaren
  ...[2025, 2024, 2023, 2022, 2021, 2020, 2019].map((jaar) => ({
    jaar,
    titel: `Wagen ${jaar}`,
    tekst: 'De naam, het verhaal en de foto’s van deze wagen volgen binnenkort.',
    foto: '',
    fotos: { wagen: [], bouw: [] },
  })),
];

/* ------------------------------------------------------------------ over de bende */

export const deBende = {
  kop: 'Een vriendengroep uit Zwaag met één missie: elk jaar een wagen waar je niet omheen kunt.', // PLACEHOLDER
  alineas: [
    // PLACEHOLDER
    'Wij zijn de Bende van Ellende. Van het eerste idee aan de keukentafel tot de laatste lik verf in de schuur: alles bedenken, lassen, timmeren en schilderen we zelf.',
    'Maandenlang bouwen we avond aan avond aan één doel. En als de wagen dan eindelijk door de straten van Zwaag rolt, vieren we dat samen met iedereen die langs de kant staat.',
  ],
  foto: '', // PLACEHOLDER: groepsfoto, bijvoorbeeld '/bende/groep.jpg'
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

// Waar de knop ‘Word ook sponsor’ naartoe gaat. Leeg = naar het contactformulier.
export const sponsorWorden = '';

/* ------------------------------------------------------------------ socials en contact */

// Laat url leeg tot het account er is; dan toont de kaart 'binnenkort'.
export const socials = [
  { netwerk: 'instagram', naam: 'Instagram', account: '', url: '' }, // PLACEHOLDER
  { netwerk: 'facebook', naam: 'Facebook', account: '', url: '' }, // PLACEHOLDER
  { netwerk: 'tiktok', naam: 'TikTok', account: '', url: '' }, // PLACEHOLDER
];

export const contact = {
  email: '', // PLACEHOLDER: bijvoorbeeld 'info@bendevanellendezwaag.nl'
  tekst: 'Vragen, sponsoring, een optreden of zin om mee te bouwen? Laat het ons weten, we reageren zo snel mogelijk.',
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
  { label: 'Contact', href: '#contact', klaar: true },
];
