import { useEffect, useRef } from 'react';
import { minderBeweging } from './hulp.js';

/*
 * Confetti bij elke klik: een knal vanaf de muis, dwarrelend naar beneden,
 * en onderaan het scherm hoopt het op tot een berg die daarna langzaam weer verdwijnt.
 * Ingedrukt houden laadt een mega-knal op: na 1,5 s verschijnt een laadbalk die steeds harder trilt;
 * loslaten geeft een schokgolf, heel veel confetti en een trillend scherm.
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
const LADEN_NA = 1500; // na zoveel ms ingedrukt houden verschijnt de laadbalk
const VOL_NA = 4000; // na zoveel ms is de laadbalk vol
const MAX_EXTRA = 560; // zoveel extra snippers bij een volle lading

const willekeurig = (min, max) => min + Math.random() * (max - min);

// kracht: snelheid-vermenigvuldiger; rondom: kans (0-1) dat een snipper alle kanten op vliegt in plaats van omhoog.
function maakSnipper(x, y, extra = 1, rondom = 0) {
  const hoek =
    Math.random() < rondom
      ? willekeurig(0, Math.PI * 2)
      : willekeurig(-Math.PI * 0.92, -Math.PI * 0.08); // vooral omhoog en opzij
  const kracht = willekeurig(4, 12.5) * extra * willekeurig(0.6, 1.15);
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
  const lading = useRef(null);

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
    let ringen = []; // schokgolven bij een mega-knal

    // ---- schermtril: de kopbalk, de inhoud en de voettekst schuiven een fractie heen en weer
    const pagina = canvas.closest('.bv-home');
    let tril = { tot: 0, duur: 1, kracht: 0 };
    let trilFrame = 0;
    const zetTril = (px) => {
      if (!pagina) return;
      if (px < 0.3) {
        pagina.style.removeProperty('--sx');
        pagina.style.removeProperty('--sy');
        return;
      }
      pagina.style.setProperty('--sx', `${willekeurig(-px, px).toFixed(1)}px`);
      pagina.style.setProperty('--sy', `${willekeurig(-px, px).toFixed(1)}px`);
    };
    const trilLus = (tijd) => {
      const rest = (tril.tot - tijd) / tril.duur;
      if (rest <= 0) {
        zetTril(0);
        trilFrame = 0;
        return;
      }
      zetTril(tril.kracht * rest * rest);
      trilFrame = requestAnimationFrame(trilLus);
    };
    const schud = (kracht, duur) => {
      tril = { tot: performance.now() + duur, duur, kracht };
      if (!trilFrame) trilFrame = requestAnimationFrame(trilLus);
    };

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
      const nu = performance.now();
      ringen = ringen.filter((g) => nu - g.start < g.duur);
      for (const g of ringen) {
        if (nu < g.start) continue; // deze golf begint pas straks
        const t = (nu - g.start) / g.duur;
        const zacht = 1 - (1 - t) ** 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 20 + zacht * g.straal, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * (1 - t)})`;
        ctx.lineWidth = 2 + (1 - t) * 10;
        ctx.stroke();
      }
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

      if (snippers.length || laatsteLanding > 0 || ringen.length) frame = requestAnimationFrame(stap);
      else {
        frame = 0;
        vorige = 0;
      }
    };

    const knal = (x, y, aantal, extra = 1, rondom = 0) => {
      for (let i = 0; i < aantal; i++) snippers.push(maakSnipper(x, y, extra, rondom));
      if (!frame) frame = requestAnimationFrame(stap);
    };

    // ---- ingedrukt houden: laden
    const balk = lading.current;
    const vulling = balk.querySelector('i');
    const tekst = balk.querySelector('.bv-lading-tekst');
    let houd = null; // { id, x, y, start, actief, c }
    let laadFrame = 0;
    let negeerKlik = false;

    const stopLaden = () => {
      houd = null;
      cancelAnimationFrame(laadFrame);
      laadFrame = 0;
      balk.classList.remove('is-zichtbaar', 'is-vol');
      document.documentElement.classList.remove('bv-laden');
      if (!trilFrame) zetTril(0);
    };

    const laadLus = (tijd) => {
      if (!houd) return;
      const t = tijd - houd.start;
      if (t >= LADEN_NA) {
        if (!houd.actief) {
          houd.actief = true;
          balk.classList.add('is-zichtbaar');
        }
        const c = Math.min(1, (t - LADEN_NA) / (VOL_NA - LADEN_NA));
        houd.c = c;
        // Hoe voller, hoe harder de balk trilt.
        const sterk = 0.6 + c * 5 + (c >= 1 ? 3 : 0);
        const dx = willekeurig(-sterk, sterk);
        const dy = willekeurig(-sterk, sterk);
        const draai = willekeurig(-1, 1) * c * 7;
        balk.style.transform = `translate(${houd.x + dx}px, ${houd.y + dy}px) translate(-50%, -100%) rotate(${draai}deg)`;
        vulling.style.transform = `scaleX(${c})`;
        if (c >= 1 && !balk.classList.contains('is-vol')) {
          balk.classList.add('is-vol');
          tekst.textContent = 'Loslaten!';
        }
        // Bij een bijna volle lading trilt het scherm al een beetje mee.
        if (!trilFrame) zetTril(Math.max(0, c - 0.6) * 5 + (c >= 1 ? 1.5 : 0));
      }
      laadFrame = requestAnimationFrame(laadLus);
    };

    const omlaag = (e) => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      stopLaden();
      houd = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, start: performance.now(), actief: false, c: 0 };
      tekst.textContent = 'Laden';
      vulling.style.transform = 'scaleX(0)';
      document.documentElement.classList.add('bv-laden');
      laadFrame = requestAnimationFrame(laadLus);
    };

    const beweeg = (e) => {
      if (!houd || e.pointerId !== houd.id) return;
      houd.x = e.clientX;
      houd.y = e.clientY;
      // Flink slepen voordat de balk er is (bijvoorbeeld de tijdlijn): dan is het geen laden.
      if (!houd.actief && Math.hypot(houd.x - houd.sx, houd.y - houd.sy) > 40) stopLaden();
    };

    const los = (e) => {
      if (!houd || e.pointerId !== houd.id) return;
      const { actief, c, x, y } = houd;
      stopLaden();
      if (!actief) return; // een gewone klik: die regelt de klik-afhandeling hieronder
      negeerKlik = true;
      setTimeout(() => (negeerKlik = false), 60);
      // De mega-knal: hoe voller de balk, hoe meer confetti, hoe harder en hoe meer alle kanten op.
      const kracht = c ** 1.2;
      knal(x, y, PER_KLIK + 40 + Math.round(kracht * MAX_EXTRA), 1 + kracht * 1.5, 0.15 + kracht * 0.6);
      ringen.push({ x, y, start: performance.now(), duur: 500 + kracht * 400, straal: 160 + kracht * 640 });
      if (c >= 1) ringen.push({ x, y, start: performance.now() + 90, duur: 900, straal: 1100 });
      schud(4 + kracht * 22, 350 + kracht * 850);
    };

    const klik = (e) => {
      if (negeerKlik) {
        // Na een mega-knal geen gewone klik (en geen link openen of knop indrukken).
        negeerKlik = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Alleen echte klikken met muis of vinger (niet met Enter op een knop).
      if (e.detail === 0) return;
      knal(e.clientX, e.clientY, PER_KLIK);
    };

    // Lang indrukken op de telefoon opent anders een menu.
    const menu = (e) => houd && e.preventDefault();

    maat();
    window.addEventListener('resize', maat);
    window.addEventListener('click', klik, true);
    window.addEventListener('pointerdown', omlaag, { passive: true });
    window.addEventListener('pointermove', beweeg, { passive: true });
    window.addEventListener('pointerup', los);
    window.addEventListener('pointercancel', stopLaden);
    window.addEventListener('blur', stopLaden);
    window.addEventListener('contextmenu', menu);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(trilFrame);
      stopLaden();
      zetTril(0);
      window.removeEventListener('resize', maat);
      window.removeEventListener('click', klik, true);
      window.removeEventListener('pointerdown', omlaag);
      window.removeEventListener('pointermove', beweeg);
      window.removeEventListener('pointerup', los);
      window.removeEventListener('pointercancel', stopLaden);
      window.removeEventListener('blur', stopLaden);
      window.removeEventListener('contextmenu', menu);
    };
  }, []);

  return (
    <>
      <canvas ref={doek} className="bv-confetti" aria-hidden="true" />
      <div ref={lading} className="bv-lading" aria-hidden="true">
        <span className="bv-lading-tekst">Laden</span>
        <span className="bv-lading-balk">
          <i />
        </span>
      </div>
    </>
  );
}
