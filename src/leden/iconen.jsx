/** Kleine lijn-iconen (24×24, currentColor). */
const PADEN = {
  stemming: 'M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  themas: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  beheer: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  leden: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.75',
  uit: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3',
  site: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  op: 'M18 15l-6-6-6 6',
  neer: 'M6 9l6 6 6-6',
  kruis: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  vink: 'M5 12l5 5L20 7',
  slot: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z',
  foto: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01',
  links: 'M15 18l-6-6 6-6',
  rechts: 'M9 6l6 6-6 6',
  sponsor: 'M17 6.5A6 6 0 1 0 17 17.5M4 10h9M4 14h9',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
};

export default function Icoon({ naam, grootte = 20 }) {
  return (
    <svg
      className="ld-icoon"
      width={grootte}
      height={grootte}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PADEN[naam]} />
    </svg>
  );
}
