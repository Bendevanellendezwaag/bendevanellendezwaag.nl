import { useEffect, useState } from 'react';
import * as api from './api.js';
import Icoon from './iconen.jsx';
import { meld } from './melding.js';
import { Paginakop } from './onderdelen.jsx';
import { RONDES, Uitslag } from './Stemming.jsx';

const STATUS = { gepland: 'Gepland', open: 'Open', gesloten: 'Gesloten' };
const DOOR = { 1: 5, 2: 3 }; // standaard voorselectie: top 5 na ronde 1, top 3 na ronde 2

/** Beheerder: rondes openen/sluiten, uitslagen bekijken, thema's doorzetten en beheren. */
export default function StemBeheer({ data, ververs }) {
  return (
    <>
      <Paginakop titel="Beheer" />
      <h2 className="ld-kopje">Rondes</h2>
      {data.rondes.map((r) => (
        <RondeBeheer key={r.nr} ronde={r} data={data} ververs={ververs} />
      ))}
      <ThemaBeheer themas={data.themas} ververs={ververs} />
    </>
  );
}

// ---------------------------------------------------------------- rondes

function RondeBeheer({ ronde, data, ververs }) {
  const mee = data.themas.filter((t) => t.ronde >= ronde.nr);
  const andereOpen = data.rondes.find((r) => r.status === 'open' && r.nr !== ronde.nr);
  const gestemd = data.deelname?.per_ronde?.[ronde.nr] ?? 0;
  const [uitslag, setUitslag] = useState(null);
  const [tekst, setTekst] = useState(ronde.toelichting);
  const [fout, setFout] = useState(null);
  const [uitgeklapt, setUitgeklapt] = useState(ronde.status === 'open');

  // Uitslag live meeverversen zolang de ronde loopt of net klaar is.
  useEffect(() => {
    if (ronde.status === 'gepland') return;
    let weg = false;
    api.uitslag(ronde.nr).then((r) => !weg && !r.error && setUitslag(r.data));
    return () => {
      weg = true;
    };
  }, [ronde.nr, ronde.status, gestemd, data]);

  async function doe(belofte, tekst) {
    setFout(null);
    const r = await belofte;
    if (r.error) setFout(r.error);
    else if (tekst) meld(tekst);
    ververs();
  }

  function openen() {
    if (andereOpen && !window.confirm(`${RONDES[andereOpen.nr].naam} staat nog open en wordt dan gesloten. Doorgaan?`)) return;
    doe(api.rondeOpenen(ronde.nr), `${RONDES[ronde.nr].naam} staat open voor de leden`);
  }

  return (
    <section className={`ld-kaart ld-ronde is-${ronde.status}`}>
      <button className="ld-ronde-kop" onClick={() => setUitgeklapt((u) => !u)} aria-expanded={uitgeklapt}>
        <span className="ld-ronde-nr">{ronde.nr}</span>
        <span className="ld-ronde-naam">
          <strong>{RONDES[ronde.nr].naam}</strong>
          <small>
            {mee.length} thema's · {gestemd} {gestemd === 1 ? 'stem' : 'stemmen'}
          </small>
        </span>
        <em className={`ld-status is-${ronde.status}`}>{STATUS[ronde.status]}</em>
        <span className={`ld-pijltje ${uitgeklapt ? 'is-open' : ''}`}>
          <Icoon naam="neer" grootte={18} />
        </span>
      </button>

      {uitgeklapt && (
        <div className="ld-ronde-inhoud">
          {fout && <p className="ld-fout">{fout}</p>}

          <div className="ld-rij-knoppen">
            {ronde.status === 'open' ? (
              <button className="ld-knop is-klein" onClick={() => doe(api.rondeBijwerken(ronde.nr, { status: 'gesloten' }), `${RONDES[ronde.nr].naam} is gesloten`)}>
                Sluiten
              </button>
            ) : (
              <button className="ld-knop is-klein" onClick={openen} disabled={mee.length === 0}>
                {ronde.status === 'gesloten' ? 'Opnieuw openen' : 'Openzetten voor leden'}
              </button>
            )}
            {ronde.nr === 1 ? (
              <label className="ld-schakel">
                <input
                  type="checkbox"
                  checked={ronde.uitslag_openbaar}
                  onChange={(e) =>
                    doe(
                      api.rondeBijwerken(ronde.nr, { uitslag_openbaar: e.target.checked }),
                      e.target.checked ? 'Uitslag zichtbaar voor leden' : 'Uitslag verborgen',
                    )
                  }
                />
                Uitslag zichtbaar voor leden
              </label>
            ) : (
              <span className="ld-geheim">
                <Icoon naam="slot" grootte={16} /> Uitslag alleen voor jou
              </span>
            )}
          </div>
          {mee.length === 0 && ronde.nr > 1 && (
            <p className="ld-zacht ld-klein">Zet eerst thema's door vanuit {RONDES[ronde.nr - 1].naam.toLowerCase()}.</p>
          )}

          <label className="ld-veld">
            <span>Uitleg voor de leden (optioneel)</span>
            <textarea className="ld-input" rows={2} value={tekst} maxLength={4000} onChange={(e) => setTekst(e.target.value)} />
          </label>
          {tekst !== ronde.toelichting && (
            <button className="ld-knop is-klein is-rand" onClick={() => doe(api.rondeBijwerken(ronde.nr, { toelichting: tekst }), 'Uitleg opgeslagen')}>
              Uitleg opslaan
            </button>
          )}

          {uitslag && (
            <div className="ld-ronde-uitslag">
              <h3 className="ld-sub">Uitslag {ronde.status === 'open' && <span className="ld-live">live</span>}</h3>
              <Uitslag ronde={ronde.nr} uitslag={uitslag} />
              {uitslag.stemmers?.length > 0 && (
                <p className="ld-zacht ld-klein">Gestemd: {uitslag.stemmers.join(', ')}</p>
              )}
            </div>
          )}

          {ronde.nr < 3 && ronde.status === 'gesloten' && uitslag && (
            <Doorzetten ronde={ronde.nr} mee={mee} uitslag={uitslag} ververs={ververs} />
          )}
        </div>
      )}
    </section>
  );
}

function Doorzetten({ ronde, mee, uitslag, ververs }) {
  const al = mee.filter((t) => t.ronde > ronde).map((t) => t.id);
  const top = uitslag.rijen.slice(0, DOOR[ronde]).map((r) => r.id);
  const [keuze, setKeuze] = useState(al.length ? al : top);
  const [klaar, setKlaar] = useState(null);
  const volgorde = uitslag.rijen.map((r) => mee.find((t) => t.id === r.id)).filter(Boolean);

  return (
    <div className="ld-door">
      <h3 className="ld-sub">
        Door naar {RONDES[ronde + 1].naam.toLowerCase()} <span>{keuze.length} gekozen</span>
      </h3>
      <ul className="ld-lijst">
        {volgorde.map((t) => (
          <li key={t.id}>
            <label className="ld-schakel is-rij">
              <input
                type="checkbox"
                checked={keuze.includes(t.id)}
                onChange={(e) => setKeuze(e.target.checked ? [...keuze, t.id] : keuze.filter((x) => x !== t.id))}
              />
              {t.titel}
            </label>
          </li>
        ))}
      </ul>
      <button
        className="ld-knop is-klein"
        disabled={keuze.length === 0}
        onClick={async () => {
          const r = await api.doorzetten(ronde, keuze);
          if (r.error) setKlaar(r.error);
          else meld(`${keuze.length} thema's door naar ${RONDES[ronde + 1].naam.toLowerCase()}`);
          ververs();
        }}
      >
        Doorzetten
      </button>
      {klaar && <p className="ld-klein">{klaar}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- thema's

const LEEG = { titel: '', kort: '', toelichting: '', fotos: [] };

function ThemaBeheer({ themas, ververs }) {
  const [bewerk, setBewerk] = useState(null);

  return (
    <>
      <h2 className="ld-kopje">
        Thema's
        {!bewerk && (
          <button className="ld-knop is-klein" onClick={() => setBewerk(LEEG)}>
            <Icoon naam="plus" grootte={16} /> Nieuw thema
          </button>
        )}
      </h2>
    <section className="ld-kaart">
      {bewerk ? (
        <ThemaForm
          thema={bewerk}
          klaar={() => {
            setBewerk(null);
            ververs();
          }}
        />
      ) : (
        <>
          {themas.length === 0 && <p className="ld-zacht">Nog geen thema's.</p>}
          <ul className="ld-lijst is-scheiding">
            {themas.map((t) => (
              <li key={t.id}>
                <button className="ld-rij is-beheer" onClick={() => setBewerk(t)}>
                  {t.fotos?.[0] ? (
                    <img className="ld-mini" src={api.fotoUrl(t.fotos[0])} alt="" />
                  ) : (
                    <span className="ld-mini is-leeg">{t.titel.slice(0, 1)}</span>
                  )}
                  <span className="ld-rij-tekst">
                    {t.titel}
                    <small>
                      {t.fotos?.length || 0} foto's · {RONDES[t.ronde].naam}
                    </small>
                  </span>
                  <Icoon naam="pen" grootte={18} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
    </>
  );
}

function ThemaForm({ thema, klaar }) {
  const [v, setV] = useState({ titel: thema.titel, kort: thema.kort, toelichting: thema.toelichting });
  const [fotos, setFotos] = useState(thema.fotos || []);
  const [nieuw, setNieuw] = useState([]); // deze sessie geüpload: weg bij annuleren
  const [bezig, setBezig] = useState(null);
  const [fout, setFout] = useState(null);

  async function upload(bestanden) {
    setFout(null);
    for (const [i, b] of [...bestanden].entries()) {
      setBezig(`Foto ${i + 1} van ${bestanden.length} uploaden…`);
      const r = await api.fotoUploaden(b);
      if (r.error) {
        setFout(r.error);
        break;
      }
      setFotos((f) => [...f, r.data]);
      setNieuw((n) => [...n, r.data]);
    }
    setBezig(null);
  }

  function schuif(i, r) {
    const j = i + r;
    if (j < 0 || j >= fotos.length) return;
    const f = [...fotos];
    [f[i], f[j]] = [f[j], f[i]];
    setFotos(f);
  }

  async function opslaan(e) {
    e.preventDefault();
    setBezig('Opslaan…');
    const r = await api.themaOpslaan({ id: thema.id, ...v, titel: v.titel.trim(), fotos });
    if (r.error) {
      setBezig(null);
      setFout(r.error);
      return;
    }
    // Weggehaalde foto's ook uit de opslag halen.
    for (const pad of (thema.fotos || []).filter((p) => !fotos.includes(p))) await api.fotoVerwijder(pad);
    meld(thema.id ? 'Thema opgeslagen' : 'Thema toegevoegd');
    klaar();
  }

  async function annuleer() {
    for (const pad of nieuw) await api.fotoVerwijder(pad);
    klaar();
  }

  async function verwijder() {
    if (!window.confirm(`"${thema.titel}" verwijderen? Stemmen op dit thema tellen dan niet meer mee.`)) return;
    setBezig('Verwijderen…');
    const r = await api.themaVerwijder(thema.id);
    if (r.error) {
      setBezig(null);
      setFout(r.error);
      return;
    }
    for (const pad of [...(thema.fotos || []), ...nieuw]) await api.fotoVerwijder(pad);
    meld('Thema verwijderd');
    klaar();
  }

  return (
    <form className="ld-themaform" onSubmit={opslaan}>
      <label className="ld-veld">
        <span>Titel</span>
        <input className="ld-input" value={v.titel} maxLength={120} required onChange={(e) => setV({ ...v, titel: e.target.value })} />
      </label>
      <label className="ld-veld">
        <span>Korte omschrijving (één zin, staat bij de stemming)</span>
        <input className="ld-input" value={v.kort} maxLength={300} onChange={(e) => setV({ ...v, kort: e.target.value })} />
      </label>
      <label className="ld-veld">
        <span>Toelichting (zo uitgebreid als je wilt; witregels blijven staan)</span>
        <textarea
          className="ld-input"
          rows={8}
          value={v.toelichting}
          maxLength={20000}
          onChange={(e) => setV({ ...v, toelichting: e.target.value })}
        />
      </label>

      <div className="ld-veld">
        <span>Foto's (de eerste is de omslagfoto)</span>
        <div className="ld-fotobeheer">
          {fotos.map((p, i) => (
            <figure key={p}>
              <img src={api.fotoUrl(p)} alt={`Foto ${i + 1}`} />
              <span>
                <button type="button" onClick={() => schuif(i, -1)} disabled={i === 0} aria-label="Naar voren">
                  ◀
                </button>
                <button type="button" onClick={() => setFotos(fotos.filter((x) => x !== p))} aria-label="Foto weghalen">
                  ✕
                </button>
                <button type="button" onClick={() => schuif(i, 1)} disabled={i === fotos.length - 1} aria-label="Naar achteren">
                  ▶
                </button>
              </span>
            </figure>
          ))}
          <label className="ld-fotoknop">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = '';
              }}
            />
            + Foto's
          </label>
        </div>
      </div>

      {fout && <p className="ld-fout">{fout}</p>}
      {bezig && <p className="ld-zacht ld-klein">{bezig}</p>}

      <div className="ld-rij-knoppen">
        <button className="ld-knop is-klein" type="submit" disabled={Boolean(bezig) || !v.titel.trim()}>
          Opslaan
        </button>
        <button className="ld-knop is-klein is-rand" type="button" onClick={annuleer} disabled={Boolean(bezig)}>
          Annuleren
        </button>
        {thema.id && (
          <button className="ld-link is-rood" type="button" onClick={verwijder} disabled={Boolean(bezig)}>
            Thema verwijderen
          </button>
        )}
      </div>
    </form>
  );
}
