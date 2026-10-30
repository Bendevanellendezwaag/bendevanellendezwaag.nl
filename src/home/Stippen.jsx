import { useEffect, useRef } from 'react';
import { minderBeweging } from './hulp.js';

/*
 * Interactieve achtergrond achter het podium: een raster van kleine stippen.
 * - Rond de muis (of vinger) lichten de stippen op, worden groter en wijken iets opzij.
 * - Bij een klik loopt er een golf door het raster.
 * - Zonder muis ademt het raster rustig met een trage diagonale golf.
 * Het tekenen stopt zodra het bovenste deel van de pagina uit beeld is.
 */

const AFSTAND = 30; // ruimte tussen de stippen (px)
const STRAAL = 1.3; // gewone stipgrootte
const BEREIK = 230; // tot hoe ver de muis invloed heeft (px)
const DUW = 9; // hoe ver stippen opzij wijken (px)
const GOLF_SNELHEID = 0.55; // px per ms
const GOLF_BREEDTE = 70;
const GOLF_DUUR = 2200; // ms

export default function Stippen() {
  const doek = useRef(null);

  useEffect(() => {
    const canvas = doek.current;
    const ctx = canvas.getContext('2d');
    const rustig = minderBeweging();
    let breedte = 0;
    let hoogte = 0;
    let stippen = [];
    let frame = 0;
    let zichtbaar = true;
    // Muispositie (relatief aan het canvas); `doel` is waar de muis is, `muis` loopt er soepel achteraan.
    const doel = { x: -9999, y: -9999, sterkte: 0 };
    const muis = { x: -9999, y: -9999, sterkte: 0 };
    let golven = [];

    const maat = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      breedte = canvas.clientWidth;
      hoogte = canvas.clientHeight;
      canvas.width = Math.round(breedte * dpr);
      canvas.height = Math.round(hoogte * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stippen = [];
      const startX = (breedte % AFSTAND) / 2;
      const startY = (hoogte % AFSTAND) / 2;
      for (let y = startY; y <= hoogte; y += AFSTAND) {
        for (let x = startX; x <= breedte; x += AFSTAND) stippen.push({ x, y });
      }
      if (rustig) teken(0);
    };

    const teken = (tijd) => {
      ctx.clearRect(0, 0, breedte, hoogte);
      // Muis soepel volgen.
      muis.x += (doel.x - muis.x) * 0.16;
      muis.y += (doel.y - muis.y) * 0.16;
      muis.sterkte += (doel.sterkte - muis.sterkte) * 0.08;
      golven = golven.filter((g) => tijd - g.start < GOLF_DUUR);

      // Zacht lichtschijnsel rond de muis.
      if (muis.sterkte > 0.01) {
        const gloed = ctx.createRadialGradient(muis.x, muis.y, 0, muis.x, muis.y, BEREIK * 2.2);
        gloed.addColorStop(0, `rgba(184, 220, 255, ${0.16 * muis.sterkte})`);
        gloed.addColorStop(1, 'rgba(184, 220, 255, 0)');
        ctx.fillStyle = gloed;
        ctx.fillRect(muis.x - BEREIK * 2.2, muis.y - BEREIK * 2.2, BEREIK * 4.4, BEREIK * 4.4);
      }

      ctx.fillStyle = '#ffffff';
      for (const s of stippen) {
        // Rustige ademende golf over het hele raster.
        const adem = rustig ? 0 : (Math.sin(tijd * 0.0009 - (s.x + s.y) * 0.006) + 1) / 2;
        let licht = 0.1 + adem * 0.08;
        let r = STRAAL + adem * 0.35;
        let x = s.x;
        let y = s.y;

        // Invloed van de muis.
        const dx = s.x - muis.x;
        const dy = s.y - muis.y;
        const d = Math.hypot(dx, dy);
        if (d < BEREIK && muis.sterkte > 0.01) {
          const f = (1 - d / BEREIK) ** 2 * muis.sterkte;
          licht += f * 0.55;
          r += f * 2.2;
          if (d > 0.1) {
            x += (dx / d) * f * DUW;
            y += (dy / d) * f * DUW;
          }
        }

        // Golven van klikken.
        for (const g of golven) {
          const t = tijd - g.start;
          const voorkant = t * GOLF_SNELHEID;
          const gd = Math.hypot(s.x - g.x, s.y - g.y);
          const verschil = Math.abs(gd - voorkant);
          if (verschil < GOLF_BREEDTE) {
            const f = (1 - verschil / GOLF_BREEDTE) * (1 - t / GOLF_DUUR);
            licht += f * 0.45;
            r += f * 1.8;
          }
        }

        ctx.globalAlpha = Math.min(0.85, licht);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const lus = (tijd) => {
      teken(tijd);
      frame = zichtbaar && !document.hidden ? requestAnimationFrame(lus) : 0;
    };
    const start = () => {
      if (!rustig && !frame && zichtbaar && !document.hidden) frame = requestAnimationFrame(lus);
    };

    const beweeg = (e) => {
      const rect = canvas.getBoundingClientRect();
      doel.x = e.clientX - rect.left;
      doel.y = e.clientY - rect.top;
      doel.sterkte = 1;
    };
    const weg = () => {
      doel.sterkte = 0;
    };
    // Op de telefoon: na het loslaten van de vinger dooft het licht weer uit.
    const los = (e) => {
      if (e.pointerType !== 'mouse') weg();
    };
    const klik = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (y < 0 || y > rect.height) return;
      golven.push({ x, y, start: performance.now() });
    };
    const zicht = () => start();

    maat();
    const ro = new ResizeObserver(maat);
    ro.observe(canvas);
    const io = new IntersectionObserver(([item]) => {
      zichtbaar = item.isIntersecting;
      start();
    });
    io.observe(canvas);
    if (!rustig) {
      window.addEventListener('pointermove', beweeg, { passive: true });
      window.addEventListener('pointerdown', beweeg, { passive: true });
      window.addEventListener('pointerup', los, { passive: true });
      window.addEventListener('pointercancel', los, { passive: true });
      document.documentElement.addEventListener('pointerleave', weg);
      window.addEventListener('blur', weg);
      window.addEventListener('click', klik);
      document.addEventListener('visibilitychange', zicht);
    }
    start();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', beweeg);
      window.removeEventListener('pointerdown', beweeg);
      window.removeEventListener('pointerup', los);
      window.removeEventListener('pointercancel', los);
      document.documentElement.removeEventListener('pointerleave', weg);
      window.removeEventListener('blur', weg);
      window.removeEventListener('click', klik);
      document.removeEventListener('visibilitychange', zicht);
    };
  }, []);

  return <canvas ref={doek} className="bv-stippen" aria-hidden="true" />;
}
