import { useEffect, useState } from 'react';
import * as api from './api.js';
import { Leeg, Paginakop } from './onderdelen.jsx';

// Het carnavalsjaar dat leden zien.
const JAAR = 2027;

const SOORTEN = { zakelijk: 'Bedrijven', familie: 'Familie & vrienden' };

const euroFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const euro = (n) => euroFmt.format(n || 0);

/**
 * Sponsoring voor leden: alleen lezen. De database geeft alleen bijdragen met een
 * bedrag waarvan de beheerder een factuur of toezegging heeft vastgelegd, plus het
 * totaal van de eigen inleg (niet per lid).
 */
export default function SponsorOverzicht() {
  const [jaren, setJaren] = useState(null);
  const [fout, setFout] = useState(null);

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

  const jaar = jaren.find((j) => j.jaar === JAAR) || { sponsoren: [], inleg: 0 };
  const som = (lijst) => lijst.reduce((t, s) => t + Number(s.bedrag), 0);
  const per = Object.fromEntries(Object.keys(SOORTEN).map((k) => [k, jaar.sponsoren.filter((s) => s.soort === k)]));
  const inleg = Number(jaar.inleg) || 0;
  const totaal = som(jaar.sponsoren) + inleg;

  return (
    <>
      <Paginakop titel="Sponsoring" sub={`Carnaval ${JAAR}`} />

      <section className="ld-kaart ld-spo-totaal">
        <div className="is-hoofd">
          <small>Totaal</small>
          <strong>{euro(totaal)}</strong>
        </div>
        {Object.entries(SOORTEN).map(([k, label]) => (
          <div key={k}>
            <small>{label}</small>
            <strong>{euro(som(per[k]))}</strong>
          </div>
        ))}
        <div>
          <small>Eigen inleg</small>
          <strong>{euro(inleg)}</strong>
        </div>
      </section>

      {jaar.sponsoren.length === 0 && <Leeg titel="Nog geen sponsoren">Zodra er sponsoren zijn toegezegd, zie je ze hier.</Leeg>}

      {Object.entries(SOORTEN).map(([soort, label]) => {
        const lijst = per[soort];
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
