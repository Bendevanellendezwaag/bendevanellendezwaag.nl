import { useCallback, useEffect, useState } from 'react';
import * as api from './api.js';
import { meld } from './melding.js';
import { Paginakop } from './onderdelen.jsx';

const datum = (d) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });

/** Beheerder: accounts goed- of afkeuren en eventueel extra beheerders aanwijzen. */
export default function LedenBeheer({ mijnId, onWijziging }) {
  const [leden, setLeden] = useState(null);
  const [fout, setFout] = useState(null);
  const [toonAf, setToonAf] = useState(false);

  const laad = useCallback(async () => {
    const r = await api.alleLeden();
    if (r.error) setFout(r.error);
    else {
      setFout(null);
      setLeden(r.data);
    }
  }, []);

  useEffect(() => {
    laad();
    const t = setInterval(laad, 15000);
    return () => clearInterval(t);
  }, [laad]);

  async function doe(belofte, tekst) {
    const r = await belofte;
    if (r.error) setFout(r.error);
    else meld(tekst);
    await laad();
    onWijziging?.();
  }

  if (!leden) return fout ? <p className="ld-fout">{fout}</p> : null;

  const groep = (s) => leden.filter((l) => l.status === s);
  const wacht = groep('wacht');
  const goed = groep('goedgekeurd');
  const af = groep('afgewezen');

  return (
    <>
      <Paginakop titel="Leden" sub={`${goed.length} ${goed.length === 1 ? 'lid' : 'leden'}`} />
      {fout && <p className="ld-fout">{fout}</p>}

      {wacht.length > 0 && (
        <section className="ld-kaart is-accent">
          <h2 className="ld-sub">
            Nieuwe aanvragen <span className="ld-teller">{wacht.length}</span>
          </h2>
          <ul className="ld-lijst is-scheiding">
            {wacht.map((l) => (
              <li key={l.id} className="ld-lid">
                <LidInfo lid={l} />
                <span className="ld-lid-knoppen">
                  <button className="ld-knop is-klein" onClick={() => doe(api.lidStatus(l.id, 'goedgekeurd'), `${l.naam} is toegelaten`)}>
                    Toelaten
                  </button>
                  <button className="ld-knop is-klein is-rand" onClick={() => doe(api.lidStatus(l.id, 'afgewezen'), `${l.naam} is afgewezen`)}>
                    Afwijzen
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ld-kaart">
        <ul className="ld-lijst is-scheiding">
          {goed.map((l) => (
            <li key={l.id} className="ld-lid">
              <LidInfo lid={l} ik={l.id === mijnId} />
              {l.id !== mijnId && (
                <span className="ld-lid-knoppen">
                  <button
                    className="ld-link is-klein"
                    onClick={() =>
                      doe(
                        api.lidRol(l.id, l.rol === 'beheerder' ? 'lid' : 'beheerder'),
                        l.rol === 'beheerder' ? `${l.naam} is geen beheerder meer` : `${l.naam} is nu beheerder`,
                      )
                    }
                  >
                    {l.rol === 'beheerder' ? 'Beheerder af' : 'Maak beheerder'}
                  </button>
                  <button
                    className="ld-link is-klein is-rood"
                    onClick={() => {
                      if (window.confirm(`${l.naam} de toegang ontnemen?`)) doe(api.lidStatus(l.id, 'afgewezen'), `Toegang van ${l.naam} ingetrokken`);
                    }}
                  >
                    Toegang intrekken
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {af.length > 0 && (
        <section className="ld-kaart is-plat">
          <button className="ld-uitklap" onClick={() => setToonAf((t) => !t)} aria-expanded={toonAf}>
            Afgewezen ({af.length}) <span>{toonAf ? '−' : '+'}</span>
          </button>
          {toonAf && (
            <ul className="ld-lijst is-scheiding">
              {af.map((l) => (
                <li key={l.id} className="ld-lid">
                  <LidInfo lid={l} />
                  <button className="ld-link is-klein" onClick={() => doe(api.lidStatus(l.id, 'goedgekeurd'), `${l.naam} is toegelaten`)}>
                    Alsnog toelaten
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

function LidInfo({ lid, ik }) {
  return (
    <span className="ld-lid-info">
      <span className="ld-avatar">{lid.naam.slice(0, 1).toUpperCase()}</span>
      <span>
        <strong>
          {lid.naam}
          {ik && <em className="ld-label is-grijs">jij</em>}
          {lid.rol === 'beheerder' && <em className="ld-label">beheerder</em>}
        </strong>
        <small>
          {lid.email} · {datum(lid.aangemaakt_op)}
        </small>
      </span>
    </span>
  );
}
