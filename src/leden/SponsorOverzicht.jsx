import { useEffect, useState } from 'react';
import * as api from './api.js';
import { Leeg, Paginakop } from './onderdelen.jsx';

const SOORTEN = { zakelijk: 'Bedrijven', familie: 'Familie & vrienden' };

const euroFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const euro = (n) => euroFmt.format(n || 0);

/**
 * Sponsoring voor leden: alleen lezen. De database geeft alleen bijdragen met een
 * bedrag waarvan de beheerder een factuur of toezegging heeft vastgelegd.
 */
export default function SponsorOverzicht() {
  const [jaren, setJaren] = useState(null);
  const [fout, setFout] = useState(null);
  const [jaar, setJaar] = useState(null);

  useEffect(() => {
    let weg = false;
    api.sponsoroverzicht().then((r) => {
      if (weg) return;
      if (r.error) setFout(/sponsoroverzicht/.test(r.error) ? 'Het sponsoroverzicht is nog niet beschikbaar.' : r.error);
      else setJaren(r.data || []);
    });
    return () => {
      weg = true;
    };
  }, []);

  if (fout) return <p className="ld-fout">{fout}</p>;
  if (!jaren) return <p className="ld-zacht">Laden…</p>;
  if (!jaren.length)
    return (
      <>
        <Paginakop titel="Sponsoring" />
        <Leeg titel="Nog geen sponsoren">Zodra er sponsoren zijn toegezegd, zie je ze hier.</Leeg>
      </>
    );

  const gekozen = jaren.find((j) => j.jaar === jaar) || jaren[jaren.length - 1];
  const som = (lijst) => lijst.reduce((t, s) => t + Number(s.bedrag), 0);
  const totaal = som(gekozen.sponsoren);
  const binnen = som(gekozen.sponsoren.filter((s) => s.ontvangen));
  const max = Math.max(1, ...jaren.map((j) => som(j.sponsoren)));

  return (
    <>
      <Paginakop titel="Sponsoring" sub={`Carnaval ${gekozen.jaar} · ${euro(totaal)} toegezegd`} />

      {jaren.length > 1 && (
        <section className="ld-kaart ld-sp-jarenkaart">
          <div className="ld-sp-jaren" role="tablist" aria-label="Carnavalsjaar">
            {jaren.map((j) => {
              const t = som(j.sponsoren);
              return (
                <button
                  key={j.jaar}
                  role="tab"
                  aria-selected={j === gekozen}
                  className={`ld-sp-jaar ${j === gekozen ? 'is-aan' : ''}`}
                  onClick={() => setJaar(j.jaar)}
                >
                  <span className="ld-sp-bedrag">{euro(t)}</span>
                  <span className="ld-sp-staaf" aria-hidden="true">
                    <i className="is-zakelijk" style={{ height: `${(t / max) * 100}%` }} />
                  </span>
                  <strong>{j.jaar}</strong>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="ld-kaart ld-spo-totaal">
        <div>
          <small>Toegezegd</small>
          <strong>{euro(totaal)}</strong>
        </div>
        <div>
          <small>Al binnen</small>
          <strong>{euro(binnen)}</strong>
        </div>
        <div>
          <small>Sponsoren</small>
          <strong>{gekozen.sponsoren.length}</strong>
        </div>
      </section>

      {Object.entries(SOORTEN).map(([soort, label]) => {
        const lijst = gekozen.sponsoren.filter((s) => s.soort === soort);
        if (!lijst.length) return null;
        return (
          <section key={soort} className="ld-kaart is-plat">
            <h2 className="ld-sub">
              {label} <span>{euro(som(lijst))}</span>
            </h2>
            <ul className="ld-lijst">
              {lijst.map((s, i) => (
                <li key={`${s.naam}-${i}`} className="ld-rij ld-spo-rij">
                  <span className="ld-rij-tekst">{s.naam}</span>
                  {s.ontvangen && <em className="ld-spo-binnen">binnen</em>}
                  <strong>{euro(s.bedrag)}</strong>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="ld-zacht ld-klein">Alleen bijdragen met een factuur of toezegging. Je kunt hier niets aanpassen.</p>
    </>
  );
}
