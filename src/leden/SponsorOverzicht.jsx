import { useEffect, useState } from 'react';
import * as api from './api.js';
import { Leeg, Paginakop } from './onderdelen.jsx';

// Het carnavalsjaar dat leden zien.
const JAAR = 2027;


const euroFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const euro = (n) => euroFmt.format(n || 0);

/**
 * Sponsoring voor leden: alleen lezen. De database geeft van bedrijven alleen
 * bijdragen met een bedrag waarvan de beheerder een factuur of toezegging heeft
 * vastgelegd, plus bijdragen in natura. Familie & vrienden en de eigen inleg
 * komen alleen als totaal (geen namen).
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

  const jaar = jaren.find((j) => j.jaar === JAAR) || { sponsoren: [], inleg: 0, familie: 0, familie_natura: [] };
  const som = (lijst) => lijst.reduce((t, s) => t + (Number(s.bedrag) || 0), 0);
  const bedrijven = jaar.sponsoren;
  const familie = Number(jaar.familie) || 0;
  const familieNatura = jaar.familie_natura || [];
  const inleg = Number(jaar.inleg) || 0;
  const totaal = som(bedrijven) + familie + inleg;

  return (
    <>
      <Paginakop titel="Sponsoring" sub={`Carnaval ${JAAR}`} />

      <section className="ld-kaart ld-spo-totaal">
        <div className="is-hoofd">
          <small>Totaal</small>
          <strong>{euro(totaal)}</strong>
        </div>
        <div>
          <small>Bedrijven</small>
          <strong>{euro(som(bedrijven))}</strong>
        </div>
        <div>
          <small>Familie & vrienden</small>
          <strong>{euro(familie)}</strong>
        </div>
        <div>
          <small>Eigen inleg</small>
          <strong>{euro(inleg)}</strong>
        </div>
      </section>

      {bedrijven.length === 0 && <Leeg titel="Nog geen bedrijven">Zodra er bedrijven zijn toegezegd, zie je ze hier.</Leeg>}

      {bedrijven.length > 0 && (
        <section className="ld-kaart is-plat">
          <h2 className="ld-sub">
            Bedrijven <span>{euro(som(bedrijven))}</span>
          </h2>
          <ul className="ld-lijst">
            {bedrijven.map((s, i) => (
              <li key={`${s.naam}-${i}`} className="ld-rij ld-spo-rij">
                <span className="ld-rij-tekst">{s.naam}</span>
                {s.ontvangen && s.bedrag && <em className="ld-spo-binnen">binnen</em>}
                {s.bedrag ? <strong>{euro(s.bedrag)}</strong> : <em className="ld-spo-natura">{s.natura}</em>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {familieNatura.length > 0 && (
        <section className="ld-kaart is-plat">
          <h2 className="ld-sub">Familie & vrienden in natura</h2>
          <p className="ld-chips">
            {familieNatura.map((n) => (
              <em key={n}>{n}</em>
            ))}
          </p>
        </section>
      )}
    </>
  );
}
