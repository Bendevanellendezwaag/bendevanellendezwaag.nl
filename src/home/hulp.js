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

const binnen = (x) => Math.min(1, Math.max(0, x));

/**
 * Scroll-motor voor de effecten. Elk element met data-scroll krijgt een CSS-variabele --p (0 tot 1)
 * die meeloopt met het scrollen; de CSS bepaalt wat er met die waarde gebeurt.
 *   data-scroll="groei"  0 bij het laden, 1 als het element bijna bovenaan staat (hero-foto)
 *   data-scroll="door"   0 als het onderaan binnenkomt, 1 als het bovenaan verdwijnt (parallax)
 *   data-scroll="in"     0 als het onderaan binnenkomt, 1 als het een derde in beeld is
 *   data-scroll="lees"   loopt van 0 naar 1 terwijl je langs een tekst scrolt (woord voor woord)
 */
export function useScrollMotor() {
  useEffect(() => {
    const rustig = minderBeweging();
    let frame = 0;

    const reken = () => {
      frame = 0;
      const vh = window.innerHeight;
      document.querySelectorAll('[data-scroll]').forEach((el) => {
        if (rustig) {
          el.style.setProperty('--p', '1');
          return;
        }
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;
        let p;
        switch (el.dataset.scroll) {
          case 'groei':
            p = (vh * 0.42 - r.top) / (vh * 0.42);
            break;
          case 'door':
            p = (vh - r.top) / (vh + r.height);
            break;
          case 'lees':
            p = (vh * 0.85 - r.top) / (r.height + vh * 0.2);
            break;
          default:
            p = (vh - r.top) / (vh * 0.7);
        }
        el.style.setProperty('--p', binnen(p).toFixed(4));
      });
    };

    const plan = () => {
      if (!frame) frame = requestAnimationFrame(reken);
    };
    reken();
    // Nieuwe onderdelen (bijvoorbeeld als de Instagram-posts binnenkomen) ook meenemen.
    const mo = new MutationObserver(plan);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', plan, { passive: true });
    window.addEventListener('resize', plan);
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      window.removeEventListener('scroll', plan);
      window.removeEventListener('resize', plan);
    };
  }, []);
}

/** Splitst tekst in woorden, zodat ze één voor één kunnen verschijnen. */
export function woorden(tekst) {
  return tekst.split(/\s+/).filter(Boolean);
}
