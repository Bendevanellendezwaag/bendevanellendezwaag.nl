import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LOGO_PADEN, LOGO_VIEWBOX } from './logoPaden.js';
import { paginas, sponsors, sponsorWorden, wagens } from './gegevens.js';
import './home.css';

const ACHTERGROND = '#171A15';
const INTRO_SLEUTEL = 'bve-intro-gezien';
const LOGO_ANIMATIES = ['hup', 'wiebel', 'flits', 'stuiter'];

const minderBeweging = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function leesSessie(sleutel) {
  try {
    return window.sessionStorage.getItem(sleutel);
  } catch {
    return null;
  }
}
function schrijfSessie(sleutel, waarde) {
  try {
    window.sessionStorage.setItem(sleutel, waarde);
  } catch {
    /* privévenster of geblokkeerde opslag: dan zie je de intro gewoon vaker */
  }
}

/* ---------- Logo ---------- */

function Logo({ className = '', animatie = '', ...rest }) {
  return (
    <svg
      className={`bv-logo ${animatie ? `is-${animatie}` : ''} ${className}`}
      viewBox={LOGO_VIEWBOX}
      role="img"
      aria-label="Bende van Ellende"
      {...rest}
    >
      {LOGO_PADEN.map((d, i) => (
        <path key={i} d={d} style={{ '--i': i }} />
      ))}
    </svg>
  );
}

// Het logo linksboven doet af en toe iets leuks (en ook als je eroverheen gaat).
function LevendLogo({ onClick }) {
  const [animatie, setAnimatie] = useState('');
  const vorige = useRef('');

  const speel = useCallback((naam) => {
    if (minderBeweging()) return;
    const opties = LOGO_ANIMATIES.filter((a) => a !== vorige.current);
    const keuze = naam || opties[Math.floor(Math.random() * opties.length)];
    vorige.current = keuze;
    setAnimatie('');
    requestAnimationFrame(() => setAnimatie(keuze));
  }, []);

  useEffect(() => {
    let timer;
    const plan = () => {
      timer = setTimeout(() => {
        speel();
        plan();
      }, 6000 + Math.random() * 6000);
    };
    plan();
    return () => clearTimeout(timer);
  }, [speel]);

  return (
    <a
      className="bv-kop-logo"
      href="/"
      aria-label="Bende van Ellende – naar home"
      onClick={onClick}
      onMouseEnter={() => !animatie && speel('hup')}
    >
      <Logo animatie={animatie} onAnimationEnd={(e) => e.target === e.currentTarget && setAnimatie('')} />
    </a>
  );
}

/* ---------- Intro ---------- */

function Intro({ onKlaar }) {
  const [fase, setFase] = useState('in');

  useEffect(() => {
    const snel = minderBeweging();
    const t1 = setTimeout(() => setFase('uit'), snel ? 300 : 1900);
    const t2 = setTimeout(onKlaar, snel ? 600 : 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onKlaar]);

  return (
    <div className={`bv-intro is-${fase}`} onClick={onKlaar} aria-hidden="true">
      <Logo className="bv-intro-logo" />
    </div>
  );
}

/* ---------- Kop en menu ---------- */

function Kop({ onLeden }) {
  const [menu, setMenu] = useState('dicht'); // dicht | open | sluiten
  const [gescrold, setGescrold] = useState(false);
  const knop = useRef(null);
  const open = menu === 'open';

  useEffect(() => {
    const kijk = () => setGescrold(window.scrollY > 12);
    kijk();
    window.addEventListener('scroll', kijk, { passive: true });
    return () => window.removeEventListener('scroll', kijk);
  }, []);

  const sluit = useCallback(() => {
    setMenu((m) => (m === 'open' ? 'sluiten' : m));
  }, []);

  useEffect(() => {
    if (menu !== 'sluiten') return;
    const t = setTimeout(() => setMenu('dicht'), minderBeweging() ? 0 : 650);
    return () => clearTimeout(t);
  }, [menu]);

  useEffect(() => {
    if (menu === 'dicht') return;
    document.documentElement.classList.add('bv-geen-scroll');
    const toets = (e) => e.key === 'Escape' && (sluit(), knop.current?.focus());
    window.addEventListener('keydown', toets);
    return () => {
      document.documentElement.classList.remove('bv-geen-scroll');
      window.removeEventListener('keydown', toets);
    };
  }, [menu, sluit]);

  const kies = (e, p) => {
    e.preventDefault();
    if (!p.klaar) return;
    sluit();
    if (p.href.startsWith('/#')) {
      document.getElementById(p.href.slice(2))?.scrollIntoView({ behavior: 'smooth' });
    } else if (p.href === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = p.href;
    }
  };

  return (
    <>
      <header className={`bv-kop ${gescrold ? 'is-gescrold' : ''} ${menu !== 'dicht' ? 'is-menu' : ''}`}>
        <LevendLogo
          onClick={(e) => {
            e.preventDefault();
            sluit();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        <button
          ref={knop}
          className={`bv-menuknop ${open ? 'is-open' : ''}`}
          aria-expanded={open}
          aria-controls="bv-menu"
          onClick={() => (open ? sluit() : setMenu('open'))}
        >
          <span className="bv-menuknop-tekst" aria-hidden="true">
            <span>Menu</span>
            <span>Sluit</span>
          </span>
          <span className="bv-sr">{open ? 'Menu sluiten' : 'Menu openen'}</span>
          <span className="bv-menuknop-streepjes" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </header>

      {menu !== 'dicht' && (
        <nav id="bv-menu" className={`bv-menu is-${menu}`} aria-label="Hoofdmenu">
          <ul className="bv-menu-lijst">
            {paginas.map((p, i) => (
              <li key={p.label} style={{ '--i': i }}>
                <a
                  href={p.href}
                  className={p.klaar ? '' : 'is-binnenkort'}
                  aria-disabled={!p.klaar}
                  onClick={(e) => kies(e, p)}
                >
                  <span className="bv-menu-nr">{String(i + 1).padStart(2, '0')}</span>
                  <span className="bv-menu-label">{p.label}</span>
                  {!p.klaar && <span className="bv-menu-tag">binnenkort</span>}
                </a>
              </li>
            ))}
          </ul>
          <div className="bv-menu-voet" style={{ '--i': paginas.length }}>
            <a
              className="bv-knop bv-knop-accent"
              href="/leden"
              onClick={(e) => {
                e.preventDefault();
                onLeden();
              }}
            >
              Ledenportaal <span aria-hidden="true">→</span>
            </a>
          </div>
        </nav>
      )}
    </>
  );
}

/* ---------- Wagens + tijdlijn ---------- */

const STREEPJES_PER_JAAR = 12;

function WagenFoto({ wagen, jaar }) {
  if (wagen?.foto) {
    return <img src={wagen.foto} alt={wagen ? `Carnavalswagen ${jaar}: ${wagen.titel}` : ''} />;
  }
  return (
    <div className="bv-foto-leeg">
      <Logo />
      <span>Foto wagen {jaar} volgt</span>
    </div>
  );
}

function Tijdlijn({ jaren, actief, onKies }) {
  const scroller = useRef(null);
  const streepjes = useRef([]);
  const sleep = useRef(null);
  const frame = useRef(0);
  const [afstand, setAfstand] = useState(180);
  const [breedte, setBreedte] = useState(0);
  const eerste = jaren[0];
  const aantal = (jaren.length - 1) * STREEPJES_PER_JAAR + 1;

  // Maat bepalen (en opnieuw bij draaien/resizen).
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
      const el = scroller.current;
      if (!el) return;
      el.scrollTo({ left: (jaar - eerste) * afstand, behavior: vloeiend && !minderBeweging() ? 'smooth' : 'auto' });
    },
    [afstand, eerste],
  );

  // Bij start (en na resize) staat het actieve jaar in het midden.
  const actiefRef = useRef(actief);
  actiefRef.current = actief;
  useLayoutEffect(() => {
    if (breedte) naarJaar(actiefRef.current, false);
  }, [breedte, afstand, naarJaar]);

  // Streepjes rond het midden worden iets groter: een golfje dat meebeweegt.
  const tekenGolf = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
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

  // Slepen met de muis (aanraken en trackpad scrollen al vanzelf).
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
    const bewogen = sleep.current.bewogen;
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
      <button
        className="bv-tijdlijn-pijl"
        onClick={() => naarJaar(jaren[i - 1])}
        disabled={i <= 0}
        aria-label="Vorig jaar"
      >
        ←
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
                    <button
                      className="bv-streep-jaar"
                      tabIndex={-1}
                      onClick={() => naarJaar(jaar)}
                      aria-label={`Jaar ${jaar}`}
                    >
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
        className="bv-tijdlijn-pijl"
        onClick={() => naarJaar(jaren[i + 1])}
        disabled={i >= jaren.length - 1}
        aria-label="Volgend jaar"
      >
        →
      </button>
    </div>
  );
}

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
            <p className="bv-label">{wagen.jaar}</p>
            <h3>{wagen.titel}</h3>
          </div>
          <button ref={sluitKnop} className="bv-album-sluit" onClick={onSluit} aria-label="Sluiten">
            ✕
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
            <Logo />
            <p>De foto's van {tab === 'wagen' ? 'deze wagen' : 'het bouwproces'} volgen binnenkort.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Wagens() {
  const perJaar = useMemo(() => Object.fromEntries(wagens.map((w) => [w.jaar, w])), []);
  const jaren = useMemo(() => {
    const lijst = wagens.map((w) => w.jaar);
    const van = Math.min(...lijst);
    const tot = Math.max(...lijst);
    return Array.from({ length: tot - van + 1 }, (_, i) => van + i);
  }, []);
  const [actief, setActief] = useState(jaren[jaren.length - 1]);
  const [album, setAlbum] = useState(false);
  const wagen = perJaar[actief];

  return (
    <section className="bv-wagens" aria-label="Onze wagens door de jaren heen">
      <div className="bv-held">
        <div className="bv-held-foto" key={`f${actief}`}>
          <WagenFoto wagen={wagen} jaar={actief} />
        </div>
        <div className="bv-held-tekst" key={`t${actief}`}>
          <p className="bv-label">
            {actief === jaren[jaren.length - 1] ? `Wagen ${actief} · heden` : `Wagen ${actief}`}
          </p>
          <h1>{wagen ? wagen.titel : `Geen wagen in ${actief}`}</h1>
          <p className="bv-held-intro">
            {wagen ? wagen.tekst : 'In dit jaar hebben we geen wagen gebouwd.'}
          </p>
          {wagen && (
            <button className="bv-knop bv-knop-accent" onClick={() => setAlbum(true)}>
              Bekijk de foto's <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>

      <Tijdlijn jaren={jaren} actief={actief} onKies={setActief} />

      {album && wagen && <Album wagen={wagen} onSluit={() => setAlbum(false)} />}
    </section>
  );
}

/* ---------- Sponsors ---------- */

function Sponsors() {
  const raster = useRef(null);

  // Tegels schuiven één voor één in beeld zodra je bij de sponsors komt.
  useEffect(() => {
    const el = raster.current;
    if (!el || !('IntersectionObserver' in window)) {
      el?.classList.add('is-zichtbaar');
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-zichtbaar');
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="sponsors" className="bv-sponsors" aria-labelledby="bv-sponsors-kop">
      <div className="bv-sectie-kop">
        <p className="bv-label">Met dank aan</p>
        <h2 id="bv-sponsors-kop">Onze sponsors</h2>
      </div>
      <ul ref={raster} className="bv-sponsor-raster">
        {sponsors.map((s, i) => {
          const inhoud = s.logo ? <img src={s.logo} alt={s.naam} loading="lazy" /> : <span>{s.naam}</span>;
          return (
            <li key={`${s.naam}-${i}`} style={{ '--i': i }}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {inhoud}
                </a>
              ) : (
                <div>{inhoud}</div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="bv-sponsor-actie">
        <a className="bv-knop bv-knop-groot" href={sponsorWorden || '#sponsors'}>
          Word ook sponsor <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}

/* ---------- Pagina ---------- */

export default function Home({ onLeden }) {
  const [intro, setIntro] = useState(() => !leesSessie(INTRO_SLEUTEL));
  const klaar = useCallback(() => {
    schrijfSessie(INTRO_SLEUTEL, '1');
    setIntro(false);
  }, []);

  // Eigen achtergrond- en themakleur voor deze pagina.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const oudeMeta = meta?.getAttribute('content');
    const oudeAchtergrond = document.body.style.background;
    meta?.setAttribute('content', ACHTERGROND);
    document.body.style.background = ACHTERGROND;
    return () => {
      if (meta && oudeMeta) meta.setAttribute('content', oudeMeta);
      document.body.style.background = oudeAchtergrond;
    };
  }, []);

  return (
    <div className={`bv-home ${intro ? 'is-intro' : ''}`}>
      {intro && <Intro onKlaar={klaar} />}
      <Kop onLeden={onLeden} />
      <main>
        <Wagens />
        <Sponsors />
      </main>
      <footer className="bv-voet">
        <Logo />
        <span>© {new Date().getFullYear()} Bende van Ellende · Carnaval in Zwaag</span>
        <a
          href="/leden"
          onClick={(e) => {
            e.preventDefault();
            onLeden();
          }}
        >
          Ledenportaal
        </a>
      </footer>
    </div>
  );
}
