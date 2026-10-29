import { useCallback, useEffect, useRef, useState } from 'react';
import { LOGO_PADEN, LOGO_VIEWBOX } from './logoPaden.js';
import { minderBeweging } from './hulp.js';

const LOGO_ANIMATIES = ['hup', 'wiebel', 'flits', 'stuiter'];

/** Het logo als losse paden, zodat elk deel apart kan bewegen. */
export function Logo({ className = '', animatie = '', titel = 'Bende van Ellende', ...rest }) {
  return (
    <svg
      className={`bv-logo ${animatie ? `is-${animatie}` : ''} ${className}`}
      viewBox={LOGO_VIEWBOX}
      role={titel ? 'img' : undefined}
      aria-label={titel || undefined}
      aria-hidden={titel ? undefined : true}
      {...rest}
    >
      {LOGO_PADEN.map((d, i) => (
        <path key={i} d={d} style={{ '--i': i }} />
      ))}
    </svg>
  );
}

/** Het logo linksboven: doet af en toe iets leuks, en ook als je eroverheen gaat. */
export function LevendLogo({ onClick }) {
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
      }, 7000 + Math.random() * 6000);
    };
    plan();
    return () => clearTimeout(timer);
  }, [speel]);

  return (
    <a
      className="bv-kop-logo"
      href="/"
      aria-label="Bende van Ellende – naar boven"
      onClick={onClick}
      onMouseEnter={() => !animatie && speel('hup')}
    >
      <Logo titel="" animatie={animatie} onAnimationEnd={(e) => e.target === e.currentTarget && setAnimatie('')} />
    </a>
  );
}

/** Intro bij elke keer laden: het logo komt in delen binnen en vervaagt naar de site. */
export function Intro({ onKlaar }) {
  const [fase, setFase] = useState('in');

  useEffect(() => {
    const snel = minderBeweging();
    const t1 = setTimeout(() => setFase('uit'), snel ? 250 : 1900);
    const t2 = setTimeout(onKlaar, snel ? 500 : 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onKlaar]);

  return (
    <div className={`bv-intro is-${fase}`} onClick={onKlaar} aria-hidden="true">
      <Logo titel="" className="bv-intro-logo" />
    </div>
  );
}
