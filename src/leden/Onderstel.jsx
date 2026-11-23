import { useEffect, useRef, useState } from 'react';
import Icoon from './iconen.jsx';
import { Paginakop } from './onderdelen.jsx';

/**
 * Uitleg voor leden over de aanschaf van een nieuw onderstel:
 * foto's om doorheen te klikken, wat er beter wordt en hoe we het betalen.
 *
 * Foto's staan in /public/onderstel/. Zolang de lijst leeg is, toont de
 * carrousel lege vlakken zodat de pagina al bruikbaar is.
 */
const FOTOS = [
  { src: '/onderstel/8.webp', alt: 'De vloer van het onderstel, met achterin de bestuurdersplek' },
  { src: '/onderstel/1.webp', alt: 'Bestuurdersplek met stuur, drukmeter, hydraulische slangen en stopcontacten' },
  { src: '/onderstel/4.webp', alt: 'Compressor met motor, ingebouwd in het onderstel' },
  { src: '/onderstel/5.webp', alt: 'Luchtvat onder de vloer van de wagen' },
  { src: '/onderstel/7.webp', alt: 'Hydrauliektank onder de vloer' },
  { src: '/onderstel/2.webp', alt: 'Schakelkasten voor stroom en pneumatiek' },
  { src: '/onderstel/9.webp', alt: 'Cilinders op de plank' },
  { src: '/onderstel/6.webp', alt: 'Het rek met cilinders en motoren' },
  { src: '/onderstel/3.webp', alt: 'Frames die wij kunnen overnemen' },
];

const STRAKS = [
  { kop: 'Elektromotor', tekst: 'We rijden elektrisch. Dat is een stuk betrouwbaarder.' },
  { kop: 'Hydraulisch rijden', tekst: 'Hier kunnen we in de toekomst extra beweging op aansluiten.' },
  { kop: '50 cilinders', tekst: 'Daarmee kunnen we van alles op de wagen laten bewegen.' },
  { kop: 'Vaste compressor', tekst: 'Op de wagen, met extra luchtvaten voor beweging.' },
  { kop: 'Schakelkasten', tekst: 'Eén voor de stroom en één voor de pneumatiek.' },
  { kop: 'Bediening bij de chauffeur', tekst: 'Alle techniek is te bedienen vanaf de bestuurdersplek.' },
  { kop: 'Verplaatsbare chauffeur', tekst: 'De plek van de chauffeur ligt niet meer vast, maar kunnen we verplaatsen.' },
];

export default function Onderstel() {
  return (
    <>
      <Paginakop titel="Nieuw onderstel" sub="Dit komt er allemaal bij" />

      <Carrousel fotos={FOTOS} />

      <section className="ld-kaart">
        <h2 className="ld-sub">Wat het nieuwe onderstel ons brengt</h2>
        <ul className="ld-os-tegels">
          {STRAKS.map((p) => (
            <li key={p.kop}>
              <span className="ld-os-bol">
                <Icoon naam="vink" grootte={14} />
              </span>
              <span>
                <strong>{p.kop}</strong>
                <small>{p.tekst}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** Foto's naast elkaar: vegen, pijltjes, stipjes of de pijltoetsen. */
function Carrousel({ fotos }) {
  const baan = useRef(null);
  const [index, setIndex] = useState(0);
  const dia = fotos.length
    ? fotos
    : [1, 2, 3].map((n) => ({ leeg: true, alt: `Foto ${n} volgt` }));
  const aantal = dia.length;

  useEffect(() => {
    const el = baan.current;
    if (!el) return undefined;
    const bij = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener('scroll', bij, { passive: true });
    return () => el.removeEventListener('scroll', bij);
  }, []);

  function naar(i) {
    const el = baan.current;
    if (!el) return;
    const doel = (i + aantal) % aantal;
    el.scrollTo({ left: doel * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <section
      className="ld-os-carrousel"
      aria-roledescription="carrousel"
      aria-label="Foto's van het nieuwe onderstel"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') naar(index - 1);
        if (e.key === 'ArrowRight') naar(index + 1);
      }}
    >
      <div className="ld-os-baan" ref={baan} tabIndex={0}>
        {dia.map((f, i) => (
          <figure
            key={f.src || i}
            className="ld-os-dia"
            aria-roledescription="dia"
            aria-label={`${i + 1} van ${aantal}`}
          >
            {f.leeg ? (
              <div className="ld-os-leeg">
                <Icoon naam="foto" grootte={40} />
                <span>{f.alt}</span>
              </div>
            ) : (
              <>
                <img src={f.src} alt={f.alt} loading={i === 0 ? 'eager' : 'lazy'} />
                <figcaption>{f.alt}</figcaption>
              </>
            )}
          </figure>
        ))}
      </div>

      {aantal > 1 && (
        <>
          <button className="ld-os-pijl is-links" onClick={() => naar(index - 1)} aria-label="Vorige foto">
            <Icoon naam="links" />
          </button>
          <button className="ld-os-pijl is-rechts" onClick={() => naar(index + 1)} aria-label="Volgende foto">
            <Icoon naam="rechts" />
          </button>
          <div className="ld-os-stippen">
            {dia.map((f, i) => (
              <button
                key={f.src || i}
                className={i === index ? 'is-aan' : ''}
                onClick={() => naar(i)}
                aria-label={`Foto ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
              />
            ))}
          </div>
          <span className="ld-os-teller">
            {index + 1} / {aantal}
          </span>
        </>
      )}
    </section>
  );
}
