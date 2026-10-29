import { useCallback, useEffect, useRef, useState } from 'react';
import { instagram, paginas } from './gegevens.js';
import { minderBeweging, scrolNaar } from './hulp.js';
import Icoon from './iconen.jsx';
import { LevendLogo } from './Logo.jsx';

/** Kopbalk met logo, ledenportaal en de menuknop; het menu klapt open als een cirkel vanuit de knop. */
export default function Kop({ onLeden }) {
  const [menu, setMenu] = useState('dicht'); // dicht | open | sluiten
  const [gescrold, setGescrold] = useState(false);
  const knop = useRef(null);
  const eerste = useRef(null);
  const open = menu === 'open';

  useEffect(() => {
    const kijk = () => setGescrold(window.scrollY > 12);
    kijk();
    window.addEventListener('scroll', kijk, { passive: true });
    return () => window.removeEventListener('scroll', kijk);
  }, []);

  const sluit = useCallback(() => setMenu((m) => (m === 'open' ? 'sluiten' : m)), []);

  useEffect(() => {
    if (menu !== 'sluiten') return undefined;
    const t = setTimeout(() => setMenu('dicht'), minderBeweging() ? 0 : 650);
    return () => clearTimeout(t);
  }, [menu]);

  useEffect(() => {
    if (menu === 'dicht') return undefined;
    document.documentElement.classList.add('bv-geen-scroll');
    if (menu === 'open') setTimeout(() => eerste.current?.focus({ preventScroll: true }), 350);
    const toets = (e) => {
      if (e.key === 'Escape') {
        sluit();
        knop.current?.focus();
      }
    };
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
    // Even wachten tot het menu dicht is, anders scrolt de pagina niet.
    setTimeout(
      () => {
        if (!scrolNaar(p.href)) window.location.href = p.href;
      },
      menu === 'open' ? 380 : 0,
    );
  };

  const naarLeden = (e) => {
    e.preventDefault();
    onLeden();
  };

  return (
    <>
      <header className={`bv-kop ${gescrold ? 'is-gescrold' : ''} ${menu !== 'dicht' ? 'is-menu' : ''}`}>
        <div className="bv-kop-binnen">
        <LevendLogo
          onClick={(e) => {
            e.preventDefault();
            sluit();
            scrolNaar('#top');
          }}
        />
        <div className="bv-kop-rechts">
          <a className="bv-kop-leden" href="/leden" onClick={naarLeden}>
            <Icoon naam="slot" grootte={16} />
            Ledenportaal
          </a>
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
        </div>
        </div>
      </header>

      {menu !== 'dicht' && (
        <nav id="bv-menu" className={`bv-menu is-${menu}`} aria-label="Hoofdmenu">
          <ul className="bv-menu-lijst">
            {paginas.map((p, i) => (
              <li key={p.label} style={{ '--i': i }}>
                <a
                  ref={i === 0 ? eerste : undefined}
                  href={p.href}
                  className={p.klaar ? '' : 'is-binnenkort'}
                  aria-disabled={!p.klaar}
                  onClick={(e) => kies(e, p)}
                >
                  <span className="bv-menu-nr">{String(i + 1).padStart(2, '0')}</span>
                  <span className="bv-menu-label">{p.label}</span>
                  {p.klaar ? (
                    <span className="bv-menu-pijl" aria-hidden="true">
                      <Icoon naam="pijl" grootte={28} />
                    </span>
                  ) : (
                    <span className="bv-menu-tag">binnenkort</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
          <div className="bv-menu-voet" style={{ '--i': paginas.length }}>
            <a className="bv-knop" href="/leden" onClick={naarLeden}>
              <Icoon naam="slot" grootte={18} />
              Ledenportaal
            </a>
            <a className="bv-menu-insta" href={instagram.url} target="_blank" rel="noopener noreferrer">
              <Icoon naam="instagram" grootte={20} />@{instagram.account}
            </a>
          </div>
        </nav>
      )}
    </>
  );
}
