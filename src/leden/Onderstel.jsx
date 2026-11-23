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
  // { src: '/onderstel/1.jpg', alt: 'Het nieuwe onderstel van voren' },
];

const NU = ['Een onzekere motor: we weten nooit zeker of we de hele optocht halen.'];

const STRAKS = [
  { kop: 'Elektromotor', tekst: 'We rijden elektrisch. Dat is een stuk betrouwbaarder.' },
  { kop: 'Hydraulisch rijden', tekst: 'Hier kunnen we in de toekomst extra beweging op aansluiten.' },
  { kop: '50 cilinders', tekst: 'Daarmee kunnen we van alles op de wagen laten bewegen.' },
  { kop: 'Vaste compressor', tekst: 'Op de wagen, met extra luchtvaten voor beweging.' },
  { kop: 'Schakelkasten', tekst: 'Eén voor de stroom en één voor de pneumatiek.' },
  { kop: 'Bediening bij de chauffeur', tekst: 'Alle techniek is te bedienen vanaf de bestuurdersplek.' },
  { kop: 'Verplaatsbare chauffeur', tekst: 'De plek van de chauffeur ligt niet meer vast, maar kunnen we verplaatsen.' },
  { kop: 'Meerdere motoren', tekst: 'Het onderstel heeft meer dan één motor.' },
];

const euro = (n) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function Onderstel() {
  return (
    <>
      <Paginakop titel="Nieuw onderstel" sub="Waarom we eenmalig € 50 extra inleggen" />

      <Carrousel fotos={FOTOS} />

      <section className="ld-kaart ld-os-vergelijk">
        <div className="ld-os-nu">
          <h2 className="ld-sub">Nu</h2>
          <ul className="ld-os-lijst">
            {NU.map((t) => (
              <li key={t}>
                <span className="ld-os-bol is-nee">
                  <Icoon naam="kruis" grootte={14} />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ld-os-straks">
          <h2 className="ld-sub">Met het nieuwe onderstel</h2>
          <ul className="ld-os-lijst">
            {STRAKS.map((p) => (
              <li key={p.kop}>
                <span className="ld-os-bol">
                  <Icoon naam="vink" grootte={14} />
                </span>
                <span>
                  <strong>{p.kop}</strong> {p.tekst}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ld-kaart is-accent">
        <h2 className="ld-sub">Hoe betalen we het?</h2>
        <div className="ld-os-geld">
          <div className="is-hoofd">
            <small>Totaal</small>
            <strong>{euro(2250)}</strong>
          </div>
          <div>
            <small>Eenmalig extra per lid</small>
            <strong>{euro(50)}</strong>
          </div>
          <div>
            <small>De rest</small>
            <strong className="is-tekst">Uit de pot en de verkoop van onze huidige kar</strong>
          </div>
        </div>
        <p className="ld-zacht ld-os-slot">
          Het nieuwe onderstel kost samen {euro(2250)}. Iedereen legt eenmalig {euro(50)} extra in. De rest betalen we
          uit de pot en met wat de verkoop van onze huidige kar oplevert. Zo rijden we straks zonder zorgen de optocht
          uit, en kunnen we de komende jaren steeds meer laten bewegen.
        </p>
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
              <img src={f.src} alt={f.alt} loading={i === 0 ? 'eager' : 'lazy'} />
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
