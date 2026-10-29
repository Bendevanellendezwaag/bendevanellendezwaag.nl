import { useState } from 'react';
import { aftellen, agenda, contact, deBende, paginas, socials, sponsors, sponsorWorden, wagens } from './gegevens.js';
import { datumDelen, scrolNaar, useNu } from './hulp.js';
import Icoon from './iconen.jsx';
import { Logo } from './Logo.jsx';

/* ------------------------------------------------------------------ lopende band */

const BAND = ['Bende van Ellende', 'Carnaval in Zwaag', 'Zelf ontworpen', 'Zelf gebouwd', 'Elk jaar weer'];

export function Band() {
  const reeks = (sleutel) =>
    BAND.map((t) => (
      <span key={`${sleutel}${t}`}>
        {t}
        <i aria-hidden="true">✦</i>
      </span>
    ));
  return (
    <div className="bv-band" aria-hidden="true">
      <div className="bv-band-spoor">
        {reeks('a')}
        {reeks('b')}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ sectiekop */

function SectieKop({ label, titel, id, children }) {
  return (
    <div className="bv-sectie-kop bv-onthul">
      <p className="bv-label">{label}</p>
      <h2 id={id}>{titel}</h2>
      {children && <p className="bv-sectie-intro">{children}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ over de bende */

export function OverDeBende() {
  const feiten = [
    { waarde: String(wagens.length), label: wagens.length === 1 ? 'Wagen gebouwd' : 'Wagens gebouwd' },
    ...deBende.feiten.filter((f) => f.waarde),
  ];

  return (
    <section id="over" className="bv-sectie bv-over" aria-labelledby="bv-over-kop">
      <div className="bv-over-tekst">
        <p className="bv-label bv-onthul">Over de Bende</p>
        <h2 id="bv-over-kop" className="bv-onthul">
          {deBende.kop}
        </h2>
        <div className="bv-over-alineas bv-onthul">
          {deBende.alineas.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </div>
        <dl className="bv-feiten bv-onthul">
          {feiten.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.waarde}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="bv-over-foto bv-onthul">
        {deBende.foto ? (
          <img src={deBende.foto} alt="De Bende van Ellende" loading="lazy" />
        ) : (
          <div className="bv-foto-leeg">
            <Logo titel="" />
            <span>Groepsfoto volgt</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ aftellen en agenda */

function Teller() {
  const nu = useNu();
  const doel = new Date(aftellen.datum).getTime();
  const over = Math.max(0, doel - nu);
  const voorbij = over === 0;
  const delen = [
    ['Dagen', Math.floor(over / 86400000)],
    ['Uren', Math.floor(over / 3600000) % 24],
    ['Minuten', Math.floor(over / 60000) % 60],
    ['Seconden', Math.floor(over / 1000) % 60],
  ];

  return (
    <div className="bv-teller bv-onthul">
      <Logo titel="" className="bv-teller-watermerk" />
      <p className="bv-label">{voorbij ? 'Het is zover' : `Aftellen naar ${aftellen.titel.toLowerCase()}`}</p>
      {voorbij ? (
        <p className="bv-teller-feest">Alaaf! {aftellen.titel} is begonnen.</p>
      ) : (
        <div className="bv-teller-cijfers" role="timer" aria-label={`Nog ${delen[0][1]} dagen tot ${aftellen.titel}`}>
          {delen.map(([label, waarde]) => (
            <div key={label}>
              <span className="bv-teller-cijfer">{String(waarde).padStart(2, '0')}</span>
              <span className="bv-teller-label">{label}</span>
            </div>
          ))}
        </div>
      )}
      <p className="bv-teller-tekst">{aftellen.omschrijving}</p>
    </div>
  );
}

export function Agenda() {
  const komend = agenda
    .filter((a) => new Date(`${a.datum}T23:59:59`).getTime() >= Date.now())
    .sort((a, b) => a.datum.localeCompare(b.datum));

  return (
    <section id="agenda" className="bv-sectie" aria-labelledby="bv-agenda-kop">
      <SectieKop label="Agenda" titel="Waar zie je ons?" id="bv-agenda-kop" />
      <div className="bv-agenda">
        <Teller />
        <div className="bv-agenda-lijst bv-onthul">
          {komend.length ? (
            <ul>
              {komend.map((a) => {
                const d = datumDelen(a.datum);
                return (
                  <li key={`${a.datum}${a.titel}`}>
                    <span className="bv-agenda-datum">
                      <strong>{d.dag}</strong>
                      {d.maand}
                    </span>
                    <span className="bv-agenda-info">
                      <strong>{a.titel}</strong>
                      <span>
                        {a.plaats && (
                          <>
                            <Icoon naam="plaats" grootte={15} /> {a.plaats}
                          </>
                        )}
                        {a.tijd && (
                          <>
                            <Icoon naam="klok" grootte={15} /> {a.tijd}
                          </>
                        )}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="bv-agenda-leeg">
              <strong>De agenda voor {new Date(aftellen.datum).getFullYear()} volgt</strong>
              <p>Zodra de data van de optochten en feesten bekend zijn, vind je ze hier.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ sponsors */

function SponsorTegel({ s, i }) {
  const inhoud = s.logo ? <img src={s.logo} alt={s.naam} loading="lazy" /> : <span>{s.naam}</span>;
  return (
    <li style={{ '--i': i }}>
      {s.url ? (
        <a href={s.url} target="_blank" rel="noopener noreferrer">
          {inhoud}
          <Icoon naam="pijlSchuin" grootte={16} className="bv-sponsor-pijl" />
        </a>
      ) : (
        <div>{inhoud}</div>
      )}
    </li>
  );
}

export function Sponsors() {
  const hoofd = sponsors.filter((s) => s.niveau === 'hoofd');
  const overig = sponsors.filter((s) => s.niveau !== 'hoofd');

  return (
    <section id="sponsors" className="bv-sectie" aria-labelledby="bv-sponsors-kop">
      <SectieKop label="Met dank aan" titel="Onze sponsors" id="bv-sponsors-kop">
        Zonder hen rijdt er geen wagen door Zwaag. Dank jullie wel!
      </SectieKop>
      {hoofd.length > 0 && (
        <ul className="bv-sponsors is-hoofd bv-onthul">
          {hoofd.map((s, i) => (
            <SponsorTegel key={`${s.naam}${i}`} s={s} i={i} />
          ))}
        </ul>
      )}
      {overig.length > 0 && (
        <ul className="bv-sponsors bv-onthul">
          {overig.map((s, i) => (
            <SponsorTegel key={`${s.naam}${i}`} s={s} i={i} />
          ))}
        </ul>
      )}
      <div className="bv-sponsor-actie bv-onthul">
        <div>
          <strong>Ook jouw naam op de wagen?</strong>
          <p>We zoeken altijd bedrijven die ons een warm hart toedragen.</p>
        </div>
        <a
          className="bv-knop is-groot"
          href={sponsorWorden || '#contact'}
          onClick={(e) => {
            if (!sponsorWorden) {
              e.preventDefault();
              scrolNaar('#contact');
            }
          }}
        >
          Word ook sponsor <Icoon naam="pijl" grootte={18} />
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ socials */

export function Socials() {
  return (
    <section id="socials" className="bv-sectie" aria-labelledby="bv-socials-kop">
      <SectieKop label="Volg de Bende" titel="Kijk mee achter de schermen" id="bv-socials-kop">
        Van de eerste schets tot de laatste lik verf: op onze socials zie je de wagen ontstaan.
      </SectieKop>
      <ul className="bv-socials bv-onthul">
        {socials.map((s, i) => {
          const binnen = (
            <>
              <span className="bv-social-icoon">
                <Icoon naam={s.netwerk} grootte={28} />
              </span>
              <span className="bv-social-tekst">
                <strong>{s.naam}</strong>
                <span>{s.url ? s.account || 'Volg ons' : 'Binnenkort'}</span>
              </span>
              <span className="bv-social-pijl">
                <Icoon naam="pijlSchuin" grootte={20} />
              </span>
            </>
          );
          return (
            <li key={s.netwerk} style={{ '--i': i }}>
              {s.url ? (
                <a className="bv-social" href={s.url} target="_blank" rel="noopener noreferrer">
                  {binnen}
                </a>
              ) : (
                <div className="bv-social is-binnenkort">{binnen}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ contact */

export function Contact() {
  const [melding, setMelding] = useState('');

  // Zonder eigen server: het formulier opent de mailapp met het bericht al ingevuld.
  const verstuur = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!contact.email) {
      setMelding('Het contactadres volgt binnenkort. Probeer het later nog eens.');
      return;
    }
    const onderwerp = `Bericht via de website van ${f.get('naam')}`;
    const tekst = `${f.get('bericht')}\n\n${f.get('naam')}\n${f.get('email')}`;
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(tekst)}`;
    setMelding('Je mailprogramma opent met je bericht. Alleen nog op verzenden drukken!');
  };

  return (
    <section id="contact" className="bv-sectie bv-contact" aria-labelledby="bv-contact-kop">
      <div className="bv-contact-tekst">
        <p className="bv-label bv-onthul">Contact</p>
        <h2 id="bv-contact-kop" className="bv-onthul">
          Zin in een praatje?
        </h2>
        <p className="bv-sectie-intro bv-onthul">{contact.tekst}</p>
        {contact.email && (
          <a className="bv-contact-mail bv-onthul" href={`mailto:${contact.email}`}>
            <Icoon naam="mail" grootte={20} />
            {contact.email}
          </a>
        )}
      </div>
      <form className="bv-form bv-onthul" onSubmit={verstuur}>
        <label>
          <span>Naam</span>
          <input name="naam" required autoComplete="name" placeholder="Je naam" />
        </label>
        <label>
          <span>E-mailadres</span>
          <input name="email" type="email" required autoComplete="email" placeholder="jij@voorbeeld.nl" />
        </label>
        <label>
          <span>Bericht</span>
          <textarea name="bericht" required rows={5} placeholder="Waar kunnen we je mee helpen?" />
        </label>
        <button className="bv-knop is-groot" type="submit">
          Verstuur bericht <Icoon naam="pijl" grootte={18} />
        </button>
        {melding && (
          <p className="bv-form-melding" role="status">
            {melding}
          </p>
        )}
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ voettekst */

export function Voet({ onLeden }) {
  const actieveSocials = socials.filter((s) => s.url);
  return (
    <footer className="bv-voet">
      <div className="bv-voet-boven">
        <a
          className="bv-voet-logo"
          href="/"
          aria-label="Naar boven"
          onClick={(e) => {
            e.preventDefault();
            scrolNaar('#top');
          }}
        >
          <Logo titel="" />
        </a>
        <nav className="bv-voet-nav" aria-label="Voettekst">
          <p>Ontdek</p>
          {paginas
            .filter((p) => p.klaar && p.href !== '#top')
            .map((p) => (
              <a
                key={p.label}
                href={p.href}
                onClick={(e) => {
                  if (scrolNaar(p.href)) e.preventDefault();
                }}
              >
                {p.label}
              </a>
            ))}
        </nav>
        <div className="bv-voet-nav">
          <p>Leden</p>
          <a
            href="/leden"
            onClick={(e) => {
              e.preventDefault();
              onLeden();
            }}
          >
            Ledenportaal
          </a>
          {actieveSocials.length > 0 && (
            <>
              <p className="is-tweede">Volg ons</p>
              <div className="bv-voet-socials">
                {actieveSocials.map((s) => (
                  <a key={s.netwerk} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.naam}>
                    <Icoon naam={s.netwerk} grootte={20} />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="bv-voet-onder">
        <span>© {new Date().getFullYear()} Bende van Ellende · Carnaval in Zwaag</span>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            scrolNaar('#top');
          }}
        >
          Terug naar boven ↑
        </a>
      </div>
    </footer>
  );
}
