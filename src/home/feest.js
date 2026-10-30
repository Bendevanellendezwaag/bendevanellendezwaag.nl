/*
 * Feestmodus: 5 seconden feest als je de laadbalk precies op het groene streepje loslaat.
 * - Alle blauwe kleuren van de site lopen door de regenboog.
 * - Gekleurde spotlights zwaaien over het scherm.
 * - Koppen, foto's, knoppen en tegels stuiteren alle kanten op.
 * Daarna koelt alles in ruim een seconde af naar de gewone site.
 * De confetti-regen tijdens het feest regelt Confetti.jsx.
 */

export const FEEST_DUUR = 5000;
const AFKOELEN = 1400;

// Wat er allemaal mag stuiteren.
const STUITERAARS = [
  '.bv-kop-logo',
  '.bv-menuknop',
  '.bv-kop-leden',
  '.bv-podium',
  '.bv-tijdlijn',
  '.bv-sticker',
  '.bv-label',
  'h1',
  'h2',
  '.bv-lees p',
  '.bv-feiten > div',
  '.bv-over-foto',
  '.bv-datum-kaart',
  '.bv-teller-tegel',
  '.bv-agenda-tekst',
  '.bv-bouwplaats-bord',
  '.bv-hoofdsponsors li',
  '.bv-sponsor-actie',
  '.bv-knop',
  '.bv-voet-groet',
  '.bv-voet-nav a',
  '.bv-voet-logo',
].join(',');

// De kleuren die meedoen, met hoe ze bij een gegeven tint (0-360) heten.
const KLEUREN = {
  '--blauw': (h) => `hsl(${h} 100% 57%)`,
  '--blauw-diep': (h) => `hsl(${h} 78% 48%)`,
  '--blauw-nacht': (h) => `hsl(${h} 80% 22%)`,
  '--lichtblauw': (h) => `hsl(${h} 100% 86%)`,
  '--lichtblauw-hover': (h) => `hsl(${h} 100% 82%)`,
  '--ijs': (h) => `hsl(${h} 100% 96%)`,
  '--hemel': (h) => `hsl(${h} 100% 65%)`,
};
const GEWOON = 223; // de tint van ons blauw (#2563ff)

const willekeurig = (min, max) => min + Math.random() * (max - min);

let bezig = false;

export function feestBezig() {
  return bezig;
}

/** Start het feest op de pagina (.bv-home). Geeft een belofte terug die klaar is als alles weer normaal is. */
export function startFeest(pagina) {
  if (!pagina || bezig) return Promise.resolve();
  bezig = true;

  // Elk element krijgt een eigen richting, hoogte, draai en tempo. Alleen elementen die in beeld zijn
  // (plus een marge), zodat het snel blijft. We gebruiken de losse eigenschappen translate/rotate/scale,
  // zodat bestaande animaties van de elementen gewoon blijven werken.
  const vh = window.innerHeight;
  const elementen = [...pagina.querySelectorAll(STUITERAARS)]
    .filter((el) => {
      const b = el.getBoundingClientRect();
      return b.bottom > -vh * 0.5 && b.top < vh * 1.5 && b.width > 0;
    })
    .map((el) => {
      const r = Math.min(1, 180 / Math.max(90, el.offsetHeight)); // grote vlakken minder ver
      return {
        el,
        x: willekeurig(-38, 38) * r,
        y: willekeurig(14, 46) * r,
        draai: willekeurig(-10, 10) * r,
        schaal: willekeurig(0.03, 0.09),
        snel: willekeurig(0.0075, 0.013), // per ms
        fase: willekeurig(0, Math.PI * 2),
      };
    });

  // Spotlights
  const licht = document.createElement('div');
  licht.className = 'bv-feest-licht';
  licht.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 5; i++) {
    const bundel = document.createElement('i');
    bundel.style.setProperty('--k', i);
    licht.appendChild(bundel);
  }
  pagina.appendChild(licht);

  pagina.classList.add('is-feest');
  pagina.style.setProperty('--feest', '1');

  const start = performance.now();
  const oudBody = document.body.style.background;
  const meta = document.querySelector('meta[name="theme-color"]');
  const oudMeta = meta?.getAttribute('content');

  return new Promise((klaar) => {
    const lus = (nu) => {
      const t = nu - start;
      let tint;
      let sterkte = 1;
      if (t < FEEST_DUUR) {
        tint = (GEWOON + t * 0.22) % 360; // ongeveer 1 keer de regenboog rond per 1,6 s
      } else {
        // Afkoelen: terug naar ons eigen blauw en de beweging rustig uit laten lopen.
        const a = Math.min(1, (t - FEEST_DUUR) / AFKOELEN);
        const zacht = 1 - (1 - a) ** 3;
        const vanTint = (GEWOON + FEEST_DUUR * 0.22) % 360;
        const verschil = ((GEWOON - vanTint + 540) % 360) - 180;
        tint = (vanTint + verschil * zacht + 360) % 360;
        sterkte = 1 - zacht;
        licht.style.opacity = String(1 - zacht);
      }
      pagina.style.setProperty('--feest', sterkte.toFixed(3));
      // Stuiteren: steeds omhoog springen (abs van een sinus) en heen en weer zwaaien.
      for (const s of elementen) {
        const g = t * s.snel + s.fase;
        const sprong = Math.abs(Math.sin(g));
        s.el.style.translate = `${(Math.sin(g * 0.5) * s.x * sterkte).toFixed(1)}px ${(-sprong * s.y * sterkte).toFixed(1)}px`;
        s.el.style.rotate = `${(Math.sin(g * 0.5 + 1) * s.draai * sterkte).toFixed(2)}deg`;
        s.el.style.scale = String((1 + (sprong - 0.5) * s.schaal * sterkte).toFixed(3));
      }
      for (const [naam, maak] of Object.entries(KLEUREN)) pagina.style.setProperty(naam, maak(tint.toFixed(1)));
      document.body.style.background = KLEUREN['--blauw'](tint.toFixed(1));
      meta?.setAttribute('content', KLEUREN['--blauw'](tint.toFixed(1)));

      if (t < FEEST_DUUR + AFKOELEN) {
        requestAnimationFrame(lus);
        return;
      }
      // Alles weer netjes terug.
      pagina.classList.remove('is-feest');
      pagina.style.removeProperty('--feest');
      for (const naam of Object.keys(KLEUREN)) pagina.style.removeProperty(naam);
      document.body.style.background = oudBody;
      if (meta && oudMeta) meta.setAttribute('content', oudMeta);
      elementen.forEach(({ el }) => {
        el.style.removeProperty('translate');
        el.style.removeProperty('rotate');
        el.style.removeProperty('scale');
      });
      licht.remove();
      bezig = false;
      klaar();
    };
    requestAnimationFrame(lus);
  });
}
