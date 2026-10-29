/**
 * Alle inhoud van de homepagina op één plek.
 * Nieuwe wagen, sponsor of pagina? Voeg hier een regel toe; de site past zich vanzelf aan.
 */

// Wagens, nieuwste eerst. De tijdlijn loopt van het oudste jaar tot het nieuwste.
// foto:  hoofdfoto naast de titel (zet bestanden in public/wagens/). Leeg = nette placeholder.
// fotos: { wagen: [...], bouw: [...] } voor het fotoalbum achter de knop.
// PLACEHOLDERS: titels, teksten en foto's worden later vervangen.
export const wagens = [
  {
    jaar: 2026,
    titel: 'Naam of spreuk van de wagen',
    tekst:
      'Hier komt een kort stukje over de wagen van dit jaar: het idee erachter, hoe lang we gebouwd hebben en wat je ervan moet weten als je hem langs ziet komen.',
    foto: '/wagens/placeholder-2026.svg',
    fotos: { wagen: [], bouw: [] },
  },
  ...[2025, 2024, 2023, 2022, 2021, 2020, 2019].map((jaar) => ({
    jaar,
    titel: `Wagen ${jaar}`,
    tekst: 'De naam, het verhaal en de foto’s van deze wagen volgen binnenkort.',
    foto: '',
    fotos: { wagen: [], bouw: [] },
  })),
];

// Pagina's in het menu. Zet klaar op true zodra een pagina bestaat (en vul href in).
export const paginas = [
  { label: 'Home', href: '/', klaar: true },
  { label: 'Onze wagens', href: '/wagens', klaar: false },
  { label: 'De Bende', href: '/de-bende', klaar: false },
  { label: 'Agenda', href: '/agenda', klaar: false },
  { label: 'Sponsors', href: '/#sponsors', klaar: true },
  { label: 'Contact', href: '/contact', klaar: false },
];

// Sponsors. logo: pad naar een (liefst witte of transparante) afbeelding in public/sponsors/.
// Zonder logo toont de site de naam. url is optioneel.
// PLACEHOLDERS: vervang door de echte sponsors.
export const sponsors = Array.from({ length: 24 }, (_, i) => ({
  naam: `Sponsor ${i + 1}`,
  logo: '',
  url: '',
}));

// Waar de knop ‘Word ook sponsor’ naartoe gaat, bijvoorbeeld 'mailto:...' of '/sponsor-worden'.
export const sponsorWorden = '';
