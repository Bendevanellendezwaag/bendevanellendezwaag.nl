import { useCallback, useEffect, useState } from 'react';
import * as api from './api.js';

const datum = (d) => new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });

/** Beheerder: accounts goed- of afkeuren en eventueel extra beheerders aanwijzen. */
export default function LedenBeheer({ mijnId, onWijziging }) {
  const [leden, setLeden] = useState(null);
  const [fout, setFout] = useState(null);

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

  async function doe(belofte) {
    const r = await belofte;
    if (r.error) setFout(r.error);
    await laad();
    onWijziging?.();
  }

  if (!leden) return fout ? <p className="ld-fout">{fout}</p> : <p className="ld-zacht">Laden…</p>;

  const groep = (s) => leden.filter((l) => l.status === s);
  const wacht = groep('wacht');
  const goed = groep('goedgekeurd');
  const af = groep('afgewezen');

  return (
    <>
      <h1 className="ld-titel">Leden</h1>
      {fout && <p className="ld-fout">{fout}</p>}

      <div className="ld-kaart">
        <h2 className="ld-sub">
          Wachten op goedkeuring <span>{wacht.length}</span>
        </h2>
        {wacht.length === 0 ? (
          <p className="ld-zacht">Niemand. Nieuwe aanmeldingen verschijnen hier vanzelf.</p>
        ) : (
          <ul className="ld-lijst">
            {wacht.map((l) => (
              <li key={l.id} className="ld-lid">
                <LidInfo lid={l} />
                <span className="ld-lid-knoppen">
                  <button className="ld-knop is-klein" onClick={() => doe(api.lidStatus(l.id, 'goedgekeurd'))}>
                    Goedkeuren
                  </button>
                  <button className="ld-knop is-klein is-rand" onClick={() => doe(api.lidStatus(l.id, 'afgewezen'))}>
                    Afwijzen
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ld-kaart">
        <h2 className="ld-sub">
          Leden <span>{goed.length}</span>
        </h2>
        <ul className="ld-lijst">
          {goed.map((l) => (
            <li key={l.id} className="ld-lid">
              <LidInfo lid={l} />
              {l.id === mijnId ? (
                <span className="ld-zacht ld-klein">dat ben jij</span>
              ) : (
                <span className="ld-lid-knoppen">
                  <button
                    className="ld-link"
                    onClick={() => doe(api.lidRol(l.id, l.rol === 'beheerder' ? 'lid' : 'beheerder'))}
                  >
                    {l.rol === 'beheerder' ? 'Geen beheerder meer' : 'Maak beheerder'}
                  </button>
                  <button
                    className="ld-link is-rood"
                    onClick={() => {
                      if (window.confirm(`${l.naam} de toegang ontnemen?`)) doe(api.lidStatus(l.id, 'afgewezen'));
                    }}
                  >
                    Toegang intrekken
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {af.length > 0 && (
        <div className="ld-kaart">
          <h2 className="ld-sub">
            Afgewezen <span>{af.length}</span>
          </h2>
          <ul className="ld-lijst">
            {af.map((l) => (
              <li key={l.id} className="ld-lid">
                <LidInfo lid={l} />
                <button className="ld-link" onClick={() => doe(api.lidStatus(l.id, 'goedgekeurd'))}>
                  Alsnog goedkeuren
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function LidInfo({ lid }) {
  return (
    <span className="ld-lid-info">
      <strong>
        {lid.naam}
        {lid.rol === 'beheerder' && <em className="ld-label">beheerder</em>}
      </strong>
      <span className="ld-zacht ld-klein">
        {lid.email} · sinds {datum(lid.aangemaakt_op)}
      </span>
    </span>
  );
}
