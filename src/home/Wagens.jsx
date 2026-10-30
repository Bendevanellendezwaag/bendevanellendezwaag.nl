import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { wagens } from './gegevens.js';
import { minderBeweging, woorden } from './hulp.js';
import Icoon from './iconen.jsx';
import { Logo } from './Logo.jsx';
import Stippen from './Stippen.jsx';

const STREEPJES_PER_JAAR = 12; // één streepje per maand

function WagenFoto({ wagen, jaar }) {
  if (wagen?.foto) {
    return (
      <img
        src={wagen.foto}
        alt={`Carnavalswagen ${jaar}: ${wagen.titel}`}
        style={wagen.uitsnede ? { objectPosition: wagen.uitsnede } : undefined}
      />
    );
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
  // Elk jaar met een wagen krijgt een eigen plek op volgorde; jaren zonder wagen (zoals 2021) ontbreken.
  const plek = (jaar) => Math.max(0, jaren.indexOf(jaar));
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
        left: plek(jaar) * afstand,
        behavior: vloeiend && !minderBeweging() ? 'smooth' : 'auto',
      });
    },
    [afstand, jaren],
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
      const jaar = jaren[Math.max(0, Math.min(jaren.length - 1, Math.round(pos / afstand)))];
      if (jaar !== actiefRef.current) onKies(jaar);
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
    if (bewogen) naarJaar(jaren[Math.max(0, Math.min(jaren.length - 1, Math.round(scroller.current.scrollLeft / afstand)))]);
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
              const jaar = jaren[n / STREEPJES_PER_JAAR];
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

/** Een foto groot bekijken, met bladeren (pijltjes, toetsen of vegen). */
function Groot({ fotos, start, titel, onSluit }) {
  const [i, setI] = useState(start);
  const veeg = useRef(null);
  const meer = fotos.length > 1;
  const vorige = useCallback(() => setI((n) => (n - 1 + fotos.length) % fotos.length), [fotos.length]);
  const volgende = useCallback(() => setI((n) => (n + 1) % fotos.length), [fotos.length]);

  useEffect(() => {
    const toets = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onSluit();
      } else if (e.key === 'ArrowLeft' && meer) vorige();
      else if (e.key === 'ArrowRight' && meer) volgende();
    };
    // Eerder dan het album luisteren, zodat Escape alleen de grote foto sluit.
    window.addEventListener('keydown', toets, true);
    return () => window.removeEventListener('keydown', toets, true);
  }, [meer, vorige, volgende, onSluit]);

  return (
    <div
      className="bv-groot"
      role="dialog"
      aria-modal="true"
      aria-label={`${titel}, foto ${i + 1} van ${fotos.length}`}
      onClick={(e) => {
        e.stopPropagation();
        onSluit();
      }}
      onPointerDown={(e) => (veeg.current = e.clientX)}
      onPointerUp={(e) => {
        if (veeg.current == null || !meer) return;
        const dx = e.clientX - veeg.current;
        veeg.current = null;
        if (Math.abs(dx) > 50) (dx > 0 ? vorige : volgende)();
      }}
    >
      <img key={fotos[i]} src={fotos[i]} alt={`${titel}, foto ${i + 1}`} onClick={(e) => e.stopPropagation()} />
      <button className="bv-rondknop bv-groot-sluit" onClick={onSluit} aria-label="Sluiten" autoFocus>
        <Icoon naam="sluit" grootte={18} />
      </button>
      {meer && (
        <>
          <button
            className="bv-rondknop bv-groot-pijl is-links"
            onClick={(e) => {
              e.stopPropagation();
              vorige();
            }}
            aria-label="Vorige foto"
          >
            <Icoon naam="pijlLinks" grootte={20} />
          </button>
          <button
            className="bv-rondknop bv-groot-pijl is-rechts"
            onClick={(e) => {
              e.stopPropagation();
              volgende();
            }}
            aria-label="Volgende foto"
          >
            <Icoon naam="pijl" grootte={20} />
          </button>
          <span className="bv-groot-teller">
            {i + 1} / {fotos.length}
          </span>
        </>
      )}
    </div>
  );
}

/** Fotoalbum per wagen: de wagen zelf (met de foto uit de tijdlijn voorop) en het bouwproces. */
function Album({ wagen, onSluit }) {
  const [tab, setTab] = useState('wagen');
  const [groot, setGroot] = useState(null);
  const lijsten = useMemo(
    () => ({
      wagen: [...new Set([wagen.foto, ...(wagen.fotos?.wagen || [])].filter(Boolean))],
      bouw: wagen.fotos?.bouw || [],
    }),
    [wagen],
  );
  const fotos = lijsten[tab];
  const naam = tab === 'wagen' ? `Wagen ${wagen.jaar}` : `Bouwproces ${wagen.jaar}`;
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
          <div className={`bv-album-raster ${fotos.length === 1 ? 'is-een' : ''}`}>
            {fotos.map((src, n) => (
              <button key={src} className="bv-album-foto" onClick={() => setGroot(n)} aria-label={`${naam}, foto ${n + 1} groot bekijken`}>
                <img src={src} alt="" loading="lazy" />
                <span className="bv-album-vergroot" aria-hidden="true">
                  <Icoon naam="pijlSchuin" grootte={18} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bv-album-leeg">
            <Logo titel="" />
            <p>De foto's van {tab === 'wagen' ? 'deze wagen' : 'het bouwproces'} volgen binnenkort.</p>
          </div>
        )}
      </div>
      {groot !== null && <Groot fotos={fotos} start={groot} titel={naam} onSluit={() => setGroot(null)} />}
    </div>
  );
}

export default function Wagens() {
  const perJaar = useMemo(() => Object.fromEntries(wagens.map((w) => [w.jaar, w])), []);
  // Precies de jaren uit de lijst met wagens, oud naar nieuw. Jaren zonder wagen staan er dus niet in.
  const jaren = useMemo(() => [...new Set(wagens.map((w) => w.jaar))].sort((a, b) => a - b), []);
  const nieuwste = jaren[jaren.length - 1];
  const [actief, setActief] = useState(nieuwste);
  const [album, setAlbum] = useState(false);
  const wagen = perJaar[actief];
  const titel = wagen ? wagen.titel : `Geen wagen in ${actief}`;

  return (
    <section id="wagens" className="bv-hero" aria-label="Onze wagens door de jaren heen">
      <Stippen />
      <div className="bv-kader">
        {/* Het podium: de foto van het jaar met titel, tekst en knop erin; de tijdlijn direct eronder. */}
        <div className="bv-podium">
          <div className="bv-podium-foto" key={`f${actief}`}>
            <WagenFoto wagen={wagen} jaar={actief} />
          </div>
          <div className="bv-podium-schaduw" aria-hidden="true" />
          {wagen?.plek ? <PlekSticker key={`s${actief}`} plek={wagen.plek} jaar={actief} /> : null}

          <div className="bv-podium-info" key={`t${actief}`}>
            <div className="bv-podium-tekst">
              <p className="bv-label">{actief === nieuwste ? `Wagen ${actief} · heden` : `Wagen ${actief}`}</p>
              <h1 className="bv-hero-titel" aria-label={titel}>
                {woorden(titel).map((w, i) => (
                  <span className="bv-woord" key={`${w}${i}`} aria-hidden="true">
                    <span style={{ '--i': i }}>{w}</span>
                  </span>
                ))}
              </h1>
              {wagen?.tekst && <p className="bv-hero-intro">{wagen.tekst}</p>}
            </div>
            {wagen && (
              <button className="bv-knop is-groot" onClick={() => setAlbum(true)}>
                Bekijk de foto's <Icoon naam="pijl" grootte={18} />
              </button>
            )}
          </div>
        </div>

        <Tijdlijn jaren={jaren} actief={actief} onKies={setActief} />
      </div>

      {album && wagen && <Album wagen={wagen} onSluit={() => setAlbum(false)} />}
    </section>
  );
}
