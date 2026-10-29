import { useEffect, useState } from 'react';

export const minderBeweging = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Scrolt soepel naar een onderdeel op de pagina ('#over', '#top', ...). */
export function scrolNaar(href) {
  const gedrag = minderBeweging() ? 'auto' : 'smooth';
  if (href === '#top' || href === '/') {
    window.scrollTo({ top: 0, behavior: gedrag });
    return true;
  }
  const el = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
  if (!el) return false;
  el.scrollIntoView({ behavior: gedrag, block: 'start' });
  return true;
}

/**
 * Elementen met de klasse .bv-onthul schuiven zacht in beeld zodra je ernaartoe scrolt.
 * Eén waarnemer voor de hele pagina.
 */
export function useOnthullen(actief = true) {
  useEffect(() => {
    if (!actief) return undefined;
    const elementen = [...document.querySelectorAll('.bv-onthul:not(.is-zichtbaar)')];
    if (!('IntersectionObserver' in window) || minderBeweging()) {
      elementen.forEach((el) => el.classList.add('is-zichtbaar'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (items) =>
        items.forEach((item) => {
          if (item.isIntersecting) {
            item.target.classList.add('is-zichtbaar');
            io.unobserve(item.target);
          }
        }),
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
    );
    elementen.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [actief]);
}

/** De huidige tijd, elke seconde bijgewerkt (voor de aftelklok). */
export function useNu(interval = 1000) {
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNu(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return nu;
}

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** '2027-02-07' -> { dag: '07', maand: 'feb', jaar: 2027 } */
export function datumDelen(iso) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return { dag: String(d.getDate()).padStart(2, '0'), maand: MAANDEN[d.getMonth()], jaar: d.getFullYear() };
}
