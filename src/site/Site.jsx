import { useEffect, useState } from 'react';
import { agenda, contact, deBende, wagens } from './inhoud.js';
import './site.css';

const MENU_LINKS = [
  { id: 'wagens', label: 'Onze wagens' },
  { id: 'bende', label: 'De Bende' },
];
const MENU_RECHTS = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'contact', label: 'Contact' },
];

function naar(e, id, klaar) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  klaar?.();
}

export default function Site({ onLeden }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bv">
      <header className="bv-kop">
        <nav className="bv-nav" aria-label="Hoofdmenu">
          {MENU_LINKS.map((m) => (
            <a key={m.id} href={`#${m.id}`} onClick={(e) => naar(e, m.id)}>
              {m.label}
            </a>
          ))}
          <a className="bv-nav-logo" href="/" aria-label="Bende van Ellende – home">
            <img src="/logo.png" alt="Bende van Ellende" />
          </a>
          {MENU_RECHTS.map((m) => (
            <a key={m.id} href={`#${m.id}`} onClick={(e) => naar(e, m.id)}>
              {m.label}
            </a>
          ))}
        </nav>
        <button
          className="bv-hamburger"
          aria-label={menuOpen ? 'Menu sluiten' : 'Menu openen'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </header>

      {menuOpen && (
        <div className="bv-mobiel-menu">
          {[...MENU_LINKS, ...MENU_RECHTS].map((m) => (
            <a key={m.id} href={`#${m.id}`} onClick={(e) => naar(e, m.id, () => setMenuOpen(false))}>
              {m.label}
            </a>
          ))}
          <a
            href="/leden"
            onClick={(e) => {
              e.preventDefault();
              onLeden();
            }}
          >
            Inloggen voor leden
          </a>
        </div>
      )}

      <Carrousel />

      <section id="wagens" className="bv-sectie">
        <h2 className="bv-titel">Onze wagens</h2>
        <div className="bv-wagens">
          {wagens.map((w) => (
            <figure key={w.beeld} className="bv-wagen">
              <img src={w.beeld} alt={w.titel} loading="lazy" />
              <figcaption>
                <strong>{w.titel}</strong>
                {w.jaar && <span>{w.jaar}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="bende" className="bv-sectie bv-smal">
        <h2 className="bv-titel">{deBende.kop}</h2>
        {deBende.alineas.map((a) => (
          <p key={a} className="bv-tekst">
            {a}
          </p>
        ))}
      </section>

      <section id="agenda" className="bv-sectie bv-smal">
        <h2 className="bv-titel">Agenda</h2>
        {agenda.length === 0 ? (
          <p className="bv-tekst">De agenda voor het nieuwe seizoen volgt binnenkort.</p>
        ) : (
          <ul className="bv-agenda">
            {agenda.map((a) => (
              <li key={a.datum + a.titel}>
                <time dateTime={a.datum}>
                  <b>{new Date(a.datum).toLocaleDateString('nl-NL', { day: 'numeric' })}</b>
                  {new Date(a.datum).toLocaleDateString('nl-NL', { month: 'short' })}
                </time>
                <div>
                  <strong>{a.titel}</strong>
                  {a.plaats && <span>{a.plaats}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="contact" className="bv-sectie bv-smal">
        <h2 className="bv-titel">Contact</h2>
        <p className="bv-tekst">{contact.tekst}</p>
        <div className="bv-contact">
          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
          {contact.instagram && <a href={contact.instagram}>Instagram</a>}
          {contact.facebook && <a href={contact.facebook}>Facebook</a>}
        </div>
      </section>

      <section className="bv-sectie">
        <div className="bv-leden">
          <div>
            <h2>Lid van de Bende?</h2>
            <p>Log in voor de ledenomgeving: stemmen op het nieuwe thema en alles over het komende seizoen.</p>
          </div>
          <a
            className="bv-leden-knop"
            href="/leden"
            onClick={(e) => {
              e.preventDefault();
              onLeden();
            }}
          >
            Inloggen
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </section>

      <footer className="bv-voet">
        <img src="/logo.png" alt="" />
        <span>© {new Date().getFullYear()} Bende van Ellende · Zwaag</span>
        <a
          href="/leden"
          onClick={(e) => {
            e.preventDefault();
            onLeden();
          }}
        >
          Inloggen voor leden
        </a>
      </footer>
    </div>
  );
}

function Carrousel() {
  const [i, setI] = useState(0);
  const n = wagens.length;
  const stap = (r) => setI((x) => (x + r + n) % n);

  useEffect(() => {
    if (n < 2) return undefined;
    const pijl = (e) => {
      if (e.key === 'ArrowLeft') stap(-1);
      if (e.key === 'ArrowRight') stap(1);
    };
    window.addEventListener('keydown', pijl);
    return () => window.removeEventListener('keydown', pijl);
  });

  return (
    <section className="bv-held" aria-roledescription="carrousel" aria-label="Onze wagens">
      {n > 1 && (
        <button className="bv-pijl is-links" onClick={() => stap(-1)} aria-label="Vorige wagen">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      <div className="bv-held-beeld">
        {wagens.map((w, j) => (
          <img
            key={w.beeld}
            src={w.beeld}
            alt={w.titel}
            className={j === i ? 'is-aan' : ''}
            aria-hidden={j !== i}
            fetchpriority={j === 0 ? 'high' : undefined}
          />
        ))}
      </div>
      {n > 1 && (
        <button className="bv-pijl is-rechts" onClick={() => stap(1)} aria-label="Volgende wagen">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </section>
  );
}
