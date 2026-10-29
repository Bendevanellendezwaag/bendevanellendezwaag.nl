import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { wagens } from './gegevens.js';
import { minderBeweging, woorden } from './hulp.js';
import Icoon from './iconen.jsx';
import { Logo } from './Logo.jsx';

const STREEPJES_PER_JAAR = 12; // één streepje per maand

function WagenFoto({ wagen, jaar }) {
  if (wagen?.foto) {
    return <img src={wagen.foto} alt={`Carnavalswagen ${jaar}: ${wagen.titel}`} />;
  }
  return (
    <div className="bv-foto-leeg">
      <Logo titel="" />
      <span>Foto wagen {jaar} volgt</span>
    </div>
  );
}

/** Ronde sticker met de eindklassering, met tekst die rondom draait. */
function PlekSticker({ plek, jaar }) {
  const tekst = `${plek}e plek · optocht ${jaar} · `;
  return (
    <div className="bv-sticker" aria-label={`${plek}e plek in de optocht van ${jaar}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <path id={`bv-cirkel-${jaar}`} d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
        </defs>
        <text>
          <textPath href={`#bv-cirkel-${jaar}`} textLength="477">
            {(tekst + tekst).toUpperCase()}
          </textPath>
        </text>
      </svg>
      <span className="bv-sticker-plek">
        {plek}
        <sup>e</sup>
      </span>
    </div>
  );
}

/** Tijdlijn met kleine streepjes per maand en grote bij elk jaartal. Slepen, swipen, klikken of pijltjes. */
function Tijdlijn({ jaren, actief, onKies }) {
  const scroller = useRef(null);
  const streepjes = useRef([]);
  const sleep = useRef(null);
  const frame = useRef(0);
  const [afstand, setAfstand] = useState(190);
  const [breedte, setBreedte] = useState(0);
  const eerste = jaren[0];
  const aantal = (jaren.length - 1) * STREEPJES_PER_JAAR + 1;

  useLayoutEffect(() => {
    const el = scroller.current;
    const meet = () => {
      setBreedte(el.clientWidth);
      setAfstand(el.clientWidth < 480 ? 96 : el.clientWidth < 760 ? 140 : 190);
    };
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const naarJaar = useCallback(
    (jaar, vloeiend = true) => {
      scroller.current?.scrollTo({
        left: (jaar - eerste) * afstand,
        behavior: vloeiend && !minderBeweging() ? 'smooth' : 'auto',
      });
    },
    [afstand, eerste],
  );

  const actiefRef = useRef(actief);
  actiefRef.current = actief;
  useLayoutEffect(() => {
    if (breedte) naarJaar(actiefRef.current, false);
  }, [breedte, afstand, naarJaar]);

  // Streepjes rond het midden worden iets groter: een golfje dat meebeweegt.
  const tekenGolf = useCallback(() => {
    const el = scroller.current;
    if (!el) return null;
    const pos = el.scrollLeft;
    const stap = afstand / STREEPJES_PER_JAAR;
    streepjes.current.forEach((s, i) => {
      if (!s) return;
      const d = Math.abs(i * stap - pos) / afstand;
      s.style.setProperty('--golf', Math.max(0, 1 - d / 1.2).toFixed(3));
    });
    return pos;
  }, [afstand]);

  const opScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const pos = tekenGolf();
      if (pos == null) return;
      const jaar = eerste + Math.round(pos / afstand);
      if (jaar !== actiefRef.current && jaren.includes(jaar)) onKies(jaar);
    });
  };

  useEffect(() => {
    tekenGolf();
  }, [tekenGolf, breedte]);

  const omlaag = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    sleep.current = { x: e.clientX, links: scroller.current.scrollLeft, bewogen: false };
    scroller.current.classList.add('is-slepen');
  };
  const beweeg = (e) => {
    if (!sleep.current) return;
    const dx = e.clientX - sleep.current.x;
    if (Math.abs(dx) > 3) sleep.current.bewogen = true;
    scroller.current.scrollLeft = sleep.current.links - dx;
  };
  const omhoog = () => {
    if (!sleep.current) return;
    const { bewogen } = sleep.current;
    sleep.current = null;
    scroller.current.classList.remove('is-slepen');
    if (bewogen) naarJaar(eerste + Math.round(scroller.current.scrollLeft / afstand));
  };

  const toets = (e) => {
    const i = jaren.indexOf(actief);
    if (e.key === 'ArrowLeft' && i > 0) naarJaar(jaren[i - 1]);
    else if (e.key === 'ArrowRight' && i < jaren.length - 1) naarJaar(jaren[i + 1]);
    else if (e.key === 'Home') naarJaar(jaren[0]);
    else if (e.key === 'End') naarJaar(jaren[jaren.length - 1]);
    else return;
    e.preventDefault();
  };

  const i = jaren.indexOf(actief);
  const stap = afstand / STREEPJES_PER_JAAR;

  return (
    <div className="bv-tijdlijn">
      <button className="bv-rondknop" onClick={() => naarJaar(jaren[i - 1])} disabled={i <= 0} aria-label="Vorig jaar">
        <Icoon naam="pijlLinks" grootte={18} />
      </button>

      <div className="bv-tijdlijn-venster">
        <div
          ref={scroller}
          className="bv-tijdlijn-scroller"
          tabIndex={0}
          role="slider"
          aria-label="Kies een jaar"
          aria-valuemin={jaren[0]}
          aria-valuemax={jaren[jaren.length - 1]}
          aria-valuenow={actief}
          onScroll={opScroll}
          onKeyDown={toets}
          onPointerDown={omlaag}
          onPointerMove={beweeg}
          onPointerUp={omhoog}
          onPointerLeave={omhoog}
        >
          <div className="bv-tijdlijn-baan" style={{ width: (jaren.length - 1) * afstand + breedte }}>
            {Array.from({ length: aantal }, (_, n) => {
              const isJaar = n % STREEPJES_PER_JAAR === 0;
              const jaar = eerste + n / STREEPJES_PER_JAAR;
              return (
                <div
                  key={n}
                  ref={(el) => (streepjes.current[n] = el)}
                  className={`bv-streep ${isJaar ? 'is-jaar' : ''} ${isJaar && jaar === actief ? 'is-actief' : ''}`}
                  style={{ left: breedte / 2 + n * stap }}
                >
                  {isJaar && (
                    <button className="bv-streep-jaar" tabIndex={-1} onClick={() => naarJaar(jaar)} aria-label={`Jaar ${jaar}`}>
                      {jaar}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="bv-tijdlijn-midden" aria-hidden="true" />
      </div>

      <button
        className="bv-rondknop"
        onClick={() => naarJaar(jaren[i + 1])}
        disabled={i >= jaren.length - 1}
        aria-label="Volgend jaar"
      >
        <Icoon naam="pijl" grootte={18} />
      </button>
    </div>
  );
}

/** Fotoalbum per wagen: de wagen zelf en het bouwproces. */
function Album({ wagen, onSluit }) {
  const [tab, setTab] = useState('wagen');
  const fotos = wagen.fotos?.[tab] || [];
  const sluitKnop = useRef(null);

  useEffect(() => {
    sluitKnop.current?.focus();
    document.documentElement.classList.add('bv-geen-scroll');
    const toets = (e) => e.key === 'Escape' && onSluit();
    window.addEventListener('keydown', toets);
    return () => {
      document.documentElement.classList.remove('bv-geen-scroll');
      window.removeEventListener('keydown', toets);
    };
  }, [onSluit]);

  return (
    <div className="bv-album" role="dialog" aria-modal="true" aria-label={`Foto's ${wagen.jaar}`} onClick={onSluit}>
      <div className="bv-album-paneel" onClick={(e) => e.stopPropagation()}>
        <div className="bv-album-kop">
          <div>
            <p className="bv-label">Wagen {wagen.jaar}</p>
            <h3>{wagen.titel}</h3>
          </div>
          <button ref={sluitKnop} className="bv-rondknop" onClick={onSluit} aria-label="Sluiten">
            <Icoon naam="sluit" grootte={18} />
          </button>
        </div>
        <div className="bv-album-tabs" role="tablist">
          {[
            ['wagen', 'De wagen'],
            ['bouw', 'Het bouwproces'],
          ].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-actief' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {fotos.length ? (
          <div className="bv-album-raster">
            {fotos.map((src, n) => (
              <img key={src} src={src} alt={`${tab === 'wagen' ? 'Wagen' : 'Bouwproces'} ${wagen.jaar}, foto ${n + 1}`} loading="lazy" />
            ))}
          </div>
        ) : (
          <div className="bv-album-leeg">
            <Logo titel="" />
            <p>De foto's van {tab === 'wagen' ? 'deze wagen' : 'het bouwproces'} volgen binnenkort.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Wagens() {
  const perJaar = useMemo(() => Object.fromEntries(wagens.map((w) => [w.jaar, w])), []);
  const jaren = useMemo(() => {
    const lijst = wagens.map((w) => w.jaar);
    const van = Math.min(...lijst);
    const tot = Math.max(...lijst);
    return Array.from({ length: tot - van + 1 }, (_, i) => van + i);
  }, []);
  const nieuwste = jaren[jaren.length - 1];
  const [actief, setActief] = useState(nieuwste);
  const [album, setAlbum] = useState(false);
  const wagen = perJaar[actief];
  const titel = wagen ? wagen.titel : `Geen wagen in ${actief}`;

  return (
    <section id="wagens" className="bv-hero" aria-label="Onze wagens door de jaren heen">
      <div className="bv-kader bv-hero-kop">
        <p className="bv-label">{actief === nieuwste ? `Wagen ${actief} · heden` : `Wagen ${actief}`}</p>
        <h1 className="bv-hero-titel" key={`h${actief}`} aria-label={titel}>
          {woorden(titel).map((w, i) => (
            <span className="bv-woord" key={`${w}${i}`} aria-hidden="true">
              <span style={{ '--i': i }}>{w}</span>
            </span>
          ))}
        </h1>
      </div>

      <div className="bv-hero-beeld-vak">
        <div className="bv-hero-beeld" data-scroll="groei">
          <div className="bv-hero-foto" key={`f${actief}`} data-scroll="door">
            <WagenFoto wagen={wagen} jaar={actief} />
          </div>
        </div>
        {wagen?.plek ? <PlekSticker key={`s${actief}`} plek={wagen.plek} jaar={actief} /> : null}
      </div>

      <div className="bv-kader bv-hero-onder" key={`o${actief}`}>
        <p className="bv-hero-intro">{wagen ? wagen.tekst : 'In dit jaar hebben we geen wagen gebouwd.'}</p>
        {wagen && (
          <button className="bv-knop is-groot" onClick={() => setAlbum(true)}>
            Bekijk de foto's <Icoon naam="pijl" grootte={18} />
          </button>
        )}
      </div>

      <div className="bv-kader">
        <Tijdlijn jaren={jaren} actief={actief} onKies={setActief} />
      </div>

      {album && wagen && <Album wagen={wagen} onSluit={() => setAlbum(false)} />}
    </section>
  );
}
