import { useEffect, useRef } from 'react';
import { minderBeweging } from './hulp.js';

/*
 * Confetti bij elke klik: een knal vanaf de muis, dwarrelend naar beneden,
 * en onderaan het scherm hoopt het op tot een berg die daarna langzaam weer verdwijnt.
 * Alles gebeurt op één canvas over de pagina heen; klikken gaan er gewoon doorheen.
 */

const KLEUREN = ['#ffffff', '#b8dcff', '#ffd23f', '#ff5c7a', '#ff9f1c', '#c77dff', '#2ec4b6', '#4f86ff'];
const PER_KLIK = 46;
const ZWAARTEKRACHT = 0.32;
const MAX_VAL = 4.2;
const KOLOM = 4; // breedte van één kolom in de berg (px)
const MAX_BERG = 0.24; // de berg wordt maximaal zo hoog (deel van de schermhoogte)
const BLIJFT_LIGGEN = 500; // zo lang (ms) blijft de berg na het laatste snippertje liggen
const VERVAAGT_IN = 3500; // daarna vervaagt hij in zoveel ms

const willekeurig = (min, max) => min + Math.random() * (max - min);

function maakSnipper(x, y) {
  const hoek = willekeurig(-Math.PI * 0.92, -Math.PI * 0.08); // vooral omhoog en opzij
  const kracht = willekeurig(4, 12.5);
  const rond = Math.random() < 0.18;
  return {
    x,
    y,
    vx: Math.cos(hoek) * kracht,
    vy: Math.sin(hoek) * kracht,
    b: rond ? willekeurig(5, 7) : willekeurig(7, 12),
    h: rond ? 0 : willekeurig(3.5, 6),
    rond,
    kleur: KLEUREN[Math.floor(Math.random() * KLEUREN.length)],
    hoek: willekeurig(0, Math.PI * 2),
    draai: willekeurig(-0.25, 0.25),
    flip: willekeurig(0, Math.PI * 2),
    flipSnel: willekeurig(0.08, 0.22),
    wiebel: willekeurig(0, Math.PI * 2),
    vervaag: 1,
  };
}

function tekenSnipper(ctx, s, plat = false) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.hoek);
  ctx.globalAlpha = s.vervaag;
  ctx.fillStyle = s.kleur;
  if (s.rond) {
    ctx.beginPath();
    if (plat) ctx.ellipse(0, 0, s.b / 2, s.b / 3.2, 0, 0, Math.PI * 2);
    else ctx.arc(0, 0, s.b / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Omklappen langs de lengte: zo lijkt het papiertje te dwarrelen.
    const hoogte = plat ? s.h : s.h * Math.cos(s.flip);
    ctx.fillRect(-s.b / 2, -hoogte / 2, s.b, hoogte || 0.6);
  }
  ctx.restore();
}

export default function Confetti() {
  const doek = useRef(null);

  useEffect(() => {
    if (minderBeweging()) return undefined;
    const canvas = doek.current;
    const ctx = canvas.getContext('2d');
    // De berg op een eigen (onzichtbaar) canvas, zodat we die niet elk beeld opnieuw hoeven op te bouwen.
    const berg = document.createElement('canvas');
    const bctx = berg.getContext('2d');

    let snippers = [];
    let hoogtes = [];
    let breedte = 0;
    let hoogte = 0;
    let bergHoogte = 0; // hoogte van het berg-canvas; de berg ligt altijd tegen de onderkant van het scherm
    let frame = 0;
    let laatsteLanding = 0; // tijdstip waarop het laatste snippertje op de berg viel
    let bergZicht = 1; // 1 = volledig zichtbaar, 0 = weg
    let vorige = 0;

    const maat = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nieuweBreedte = window.innerWidth;
      const nieuweHoogte = window.innerHeight;
      // Alleen bij een andere breedte opnieuw beginnen; hoogte verandert op de telefoon steeds door de adresbalk.
      const opnieuw = nieuweBreedte !== breedte;
      breedte = nieuweBreedte;
      hoogte = nieuweHoogte;
      canvas.width = Math.round(breedte * dpr);
      canvas.height = Math.round(hoogte * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (opnieuw) {
        bergHoogte = Math.ceil(Math.max(hoogte, window.screen?.height || 0) * MAX_BERG) + 24;
        berg.width = Math.round(breedte * dpr);
        berg.height = Math.round(bergHoogte * dpr);
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        hoogtes = new Array(Math.ceil(breedte / KOLOM) + 1).fill(0);
      }
      teken();
    };

    const vloer = (x) => {
      const k = Math.max(0, Math.min(hoogtes.length - 1, Math.floor(x / KOLOM)));
      return { k, y: hoogte - hoogtes[k] };
    };

    // Een snipper komt tot rust: op de berg tekenen en de berg rond die plek iets ophogen.
    // Nieuwe confetti op een half vervaagde berg: eerst de vervaging vastleggen, dan weer vol zichtbaar.
    const vervagingVastleggen = () => {
      if (bergZicht >= 1) return;
      bctx.save();
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.globalCompositeOperation = 'destination-out';
      bctx.globalAlpha = 1 - bergZicht;
      bctx.fillRect(0, 0, berg.width, berg.height);
      bctx.restore();
      bergZicht = 1;
    };

    const landen = (s, k) => {
      vervagingVastleggen();
      laatsteLanding = performance.now();
      // Op het berg-canvas rekenen we vanaf de onderkant.
      s.y = bergHoogte - hoogtes[k] - (s.rond ? s.b / 3.2 : s.h / 2);
      s.hoek = willekeurig(-0.5, 0.5);
      s.vervaag = 1;
      tekenSnipper(bctx, s, true);
      const ophoging = s.rond ? 2.2 : 1.9;
      const piek = hoogtes[k] + ophoging;
      for (let d = -4; d <= 4; d++) {
        const j = k + d;
        if (j < 0 || j >= hoogtes.length) continue;
        hoogtes[j] = Math.max(hoogtes[j], piek - Math.abs(d) * 0.85);
      }
    };

    const teken = () => {
      ctx.clearRect(0, 0, breedte, hoogte);
      if (bergZicht > 0) {
        ctx.globalAlpha = bergZicht;
        ctx.drawImage(berg, 0, hoogte - bergHoogte, breedte, bergHoogte);
        ctx.globalAlpha = 1;
      }
      for (const s of snippers) tekenSnipper(ctx, s);
    };

    const stap = (tijd) => {
      const dt = Math.min(2.5, vorige ? (tijd - vorige) / 16.67 : 1);
      vorige = tijd;
      const maxBerg = Math.min(hoogte * MAX_BERG, bergHoogte - 24);

      snippers = snippers.filter((s) => {
        s.vy = Math.min(MAX_VAL, s.vy + ZWAARTEKRACHT * dt);
        s.vx *= Math.pow(0.975, dt);
        s.wiebel += 0.07 * dt;
        s.x += (s.vx + (s.vy > 0 ? Math.sin(s.wiebel) * 0.9 : 0)) * dt;
        s.y += s.vy * dt;
        s.hoek += s.draai * dt;
        s.flip += s.flipSnel * dt;

        if (s.x < -20 || s.x > breedte + 20) return false;
        if (s.vy <= 0) return true;

        const { k, y } = vloer(s.x);
        if (s.y < y) return true;
        if (hoogtes[k] < maxBerg) {
          landen(s, k);
          return false;
        }
        // De berg is vol: dan vervaagt de snipper op de top.
        s.y = y;
        s.vervaag -= 0.04 * dt;
        return s.vervaag > 0;
      });

      teken();
      // Langzaam laten verdwijnen: eerst even blijven liggen, dan vervagen en de berg weer laten zakken.
      const heeftBerg = laatsteLanding > 0;
      if (heeftBerg) {
        const stil = tijd - laatsteLanding - BLIJFT_LIGGEN;
        if (stil > 0) {
          bergZicht = Math.max(0, 1 - stil / VERVAAGT_IN);
          if (bergZicht === 0) {
            bctx.clearRect(0, 0, breedte, bergHoogte);
            hoogtes.fill(0);
            bergZicht = 1;
            laatsteLanding = 0;
            teken(); // het scherm meteen leeg tekenen
          }
        }
      }

      if (snippers.length || laatsteLanding > 0) frame = requestAnimationFrame(stap);
      else {
        frame = 0;
        vorige = 0;
      }
    };

    const klik = (e) => {
      // Alleen echte klikken met muis of vinger (niet met Enter op een knop).
      if (e.detail === 0) return;
      for (let i = 0; i < PER_KLIK; i++) snippers.push(maakSnipper(e.clientX, e.clientY));
      if (!frame) frame = requestAnimationFrame(stap);
    };

    maat();
    window.addEventListener('resize', maat);
    window.addEventListener('click', klik);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', maat);
      window.removeEventListener('click', klik);
    };
  }, []);

  return <canvas ref={doek} className="bv-confetti" aria-hidden="true" />;
}
