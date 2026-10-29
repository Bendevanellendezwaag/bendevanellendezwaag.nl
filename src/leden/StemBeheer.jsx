import { useEffect, useState } from 'react';
import * as api from './api.js';
import Icoon from './iconen.jsx';
import { meld } from './melding.js';
import { Paginakop } from './onderdelen.jsx';
import { RONDES, Uitslag } from './Stemming.jsx';

const STATUS = { gepland: 'Gepland', open: 'Open', gesloten: 'Gesloten' };
const DOOR = { 1: 5, 2: 3 }; // standaard voorselectie: top 5 na de vergadering, top 3 na stemronde 1

/**
 * Beheerder, per ronde:
 *  - eerste vergadering: snel titels invoeren (live bij een fysieke vergadering, geen uitleg nodig)
 *  - stemrondes: de doorgezette thema's uitwerken met omschrijving en foto's
 * Elke ronde kan open/dicht, gewist worden, en na afloop thema's doorzetten.
 */
export default function StemBeheer({ data, ververs }) {
  const eersteNietKlaar = data.rondes.find((r) => r.status !== 'gesloten')?.nr ?? 3;
  return (
    <>
      <Paginakop titel="Beheer" />
      {data.rondes.map((r) => (
        <RondeBeheer
          key={r.nr}
          ronde={r}
          data={data}
          ververs={ververs}
          startOpen={r.status === 'open' || (!data.rondes.some((x) => x.status === 'open') && r.nr === eersteNietKlaar)}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------- rondes

function RondeBeheer({ ronde, data, ververs, startOpen }) {
  const mee = data.themas.filter((t) => t.ronde >= ronde.nr);
  const andereOpen = data.rondes.find((r) => r.status === 'open' && r.nr !== ronde.nr);
  const gestemd = data.deelname?.per_ronde?.[ronde.nr] ?? 0;
  const [uitslag, setUitslag] = useState(null);
  const [tekst, setTekst] = useState(ronde.toelichting);
  const [fout, setFout] = useState(null);
  const [uitgeklapt, setUitgeklapt] = useState(startOpen);

  // Uitslag live meeverversen zolang de ronde loopt of net klaar is.
  useEffect(() => {
    if (ronde.status === 'gepland' && gestemd === 0) {
      setUitslag(null);
      return undefined;
    }
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

  function wissen() {
    if (
      !window.confirm(
        `Alle stemmen en de uitslag van ${RONDES[ronde.nr].naam.toLowerCase()} wissen? De ronde gaat terug naar "gepland". Dit kan niet ongedaan worden.`,
      )
    )
      return;
    doe(api.rondeWissen(ronde.nr), `${RONDES[ronde.nr].naam} is gewist`);
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
              <button
                className="ld-knop is-klein"
                onClick={() => doe(api.rondeBijwerken(ronde.nr, { status: 'gesloten' }), `${RONDES[ronde.nr].naam} is gesloten`)}
              >
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
            {(gestemd > 0 || ronde.status !== 'gepland') && (
              <button className="ld-link is-klein is-rood ld-rechts" onClick={wissen}>
                Stemmen en uitslag wissen
              </button>
            )}
          </div>

          {ronde.nr === 1 ? (
            <SnelleThemas themas={data.themas} ververs={ververs} />
          ) : (
            <>
              {mee.length === 0 ? (
                <p className="ld-zacht ld-klein">Zet eerst thema's door vanuit {RONDES[ronde.nr - 1].naam.toLowerCase()}.</p>
              ) : (
                <UitwerkLijst ronde={ronde.nr} themas={mee} ververs={ververs} />
              )}
              <label className="ld-veld">
                <span>Uitleg voor de leden (optioneel)</span>
                <textarea className="ld-input" rows={2} value={tekst} maxLength={4000} onChange={(e) => setTekst(e.target.value)} />
              </label>
              {tekst !== ronde.toelichting && (
                <button
                  className="ld-knop is-klein is-rand"
                  onClick={() => doe(api.rondeBijwerken(ronde.nr, { toelichting: tekst }), 'Uitleg opgeslagen')}
                >
                  Uitleg opslaan
                </button>
              )}
            </>
          )}

          {uitslag && gestemd > 0 && (
            <div className="ld-ronde-uitslag">
              <h3 className="ld-sub">Uitslag {ronde.status === 'open' && <span className="ld-live">live</span>}</h3>
              <Uitslag ronde={ronde.nr} uitslag={uitslag} />
              {uitslag.stemmers?.length > 0 && <p className="ld-zacht ld-klein">Gestemd: {uitslag.stemmers.join(', ')}</p>}
            </div>
          )}

          {ronde.nr < 3 && ronde.status === 'gesloten' && uitslag && (
            <Doorzetten
              // Opnieuw beginnen zodra de doorgezette thema's elders wijzigen (knoppen in de lijst).
              key={mee
                .filter((t) => t.ronde > ronde.nr)
                .map((t) => t.id)
                .join()}
              ronde={ronde.nr}
              mee={mee}
              uitslag={uitslag}
              ververs={ververs}
            />
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
  const [fout, setFout] = useState(null);
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
      {fout && <p className="ld-fout">{fout}</p>}
      <button
        className="ld-knop is-klein"
        disabled={keuze.length === 0}
        onClick={async () => {
          const r = await api.doorzetten(ronde, keuze);
          if (r.error) setFout(r.error);
          else meld(`${keuze.length} thema's door naar ${RONDES[ronde + 1].naam.toLowerCase()} — werk ze daar uit`);
          ververs();
        }}
      >
        Doorzetten
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- eerste vergadering: alleen titels

function SnelleThemas({ themas, ververs }) {
  const [invoer, setInvoer] = useState('');
  const [bewerk, setBewerk] = useState(null); // { id, titel }
  const [fout, setFout] = useState(null);

  // Eén titel per regel: zo kun je ook een hele lijst in één keer plakken.
  async function toevoegen(e) {
    e.preventDefault();
    const titels = invoer
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    if (!titels.length) return;
    const r = await api.themasToevoegen(titels);
    if (r.error) setFout(r.error);
    else {
      setFout(null);
      setInvoer('');
      meld(titels.length === 1 ? 'Thema toegevoegd' : `${titels.length} thema's toegevoegd`);
    }
    ververs();
  }

  async function hernoem(e) {
    e.preventDefault();
    if (!bewerk.titel.trim()) return;
    const r = await api.themaOpslaan({ id: bewerk.id, titel: bewerk.titel.trim() });
    if (r.error) setFout(r.error);
    setBewerk(null);
    ververs();
  }

  // Met de hand door naar stemronde 1, of weer terughalen (ook als er niet gestemd is).
  async function wisselDoor(t) {
    const terug = t.ronde > 1;
    const r = await api.themaOpslaan({ id: t.id, ronde: terug ? 1 : 2 });
    if (r.error) setFout(r.error);
    else meld(terug ? `${t.titel} teruggehaald` : `${t.titel} door naar stemronde 1`);
    ververs();
  }

  async function verwijder(t) {
    if (!window.confirm(`"${t.titel}" verwijderen?`)) return;
    const r = await api.themaVerwijder(t.id);
    if (r.error) setFout(r.error);
    else {
      for (const pad of t.fotos || []) await api.fotoVerwijder(pad);
      meld('Thema verwijderd');
    }
    ververs();
  }

  return (
    <div className="ld-snel">
      <h3 className="ld-sub">
        Thema's <span>{themas.length}</span>
      </h3>
      <form className="ld-snel-invoer" onSubmit={toevoegen}>
        <textarea
          className="ld-input"
          rows={Math.min(6, Math.max(1, invoer.split('\n').length))}
          placeholder="Nieuw thema… (plak gerust een lijst, één per regel)"
          value={invoer}
          maxLength={5000}
          onChange={(e) => setInvoer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !invoer.includes('\n')) toevoegen(e);
          }}
        />
        <button className="ld-knop is-klein" type="submit" disabled={!invoer.trim()}>
          <Icoon naam="plus" grootte={16} /> Toevoegen
        </button>
      </form>
      {fout && <p className="ld-fout">{fout}</p>}
      {themas.length > 0 && (
        <ul className="ld-lijst is-scheiding">
          {themas.map((t) => (
            <li key={t.id} className="ld-snel-rij">
              {bewerk?.id === t.id ? (
                <form className="ld-snel-bewerk" onSubmit={hernoem}>
                  <input
                    className="ld-input"
                    value={bewerk.titel}
                    maxLength={120}
                    autoFocus
                    onChange={(e) => setBewerk({ ...bewerk, titel: e.target.value })}
                    onKeyDown={(e) => e.key === 'Escape' && setBewerk(null)}
                  />
                  <button className="ld-knop is-klein" type="submit">
                    Opslaan
                  </button>
                </form>
              ) : (
                <>
                  <span className="ld-rij-tekst">{t.titel}</span>
                  <button
                    className={`ld-door-knop ${t.ronde > 1 ? 'is-door' : ''}`}
                    onClick={() => wisselDoor(t)}
                    title={t.ronde > 1 ? 'Terughalen uit de stemrondes' : 'Door naar stemronde 1'}
                  >
                    {t.ronde > 1 ? (
                      <>
                        <Icoon naam="vink" grootte={14} /> {RONDES[t.ronde].naam}
                      </>
                    ) : (
                      'Doorzetten'
                    )}
                  </button>
                  <button className="ld-rondje" onClick={() => setBewerk({ id: t.id, titel: t.titel })} aria-label={`${t.titel} hernoemen`}>
                    <Icoon naam="pen" grootte={16} />
                  </button>
                  <button className="ld-rondje is-rood" onClick={() => verwijder(t)} aria-label={`${t.titel} verwijderen`}>
                    <Icoon naam="kruis" grootte={16} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- stemrondes: thema's uitwerken

function UitwerkLijst({ ronde, themas, ververs }) {
  const [bewerk, setBewerk] = useState(null);
  const klaar = themas.filter((t) => t.kort && t.fotos?.length).length;
  const vorige = RONDES[ronde - 1].naam.toLowerCase();

  // Uit deze ronde halen = terug naar de vorige ronde. Omschrijving en foto's blijven bewaard.
  async function terug(t) {
    const r = await api.themaOpslaan({ id: t.id, ronde: ronde - 1 });
    if (r.error) meld(r.error, 'fout');
    else meld(`${t.titel} terug naar ${vorige}`);
    ververs();
  }

  async function allesTerug() {
    if (!window.confirm(`Alle ${themas.length} thema's terugzetten naar ${vorige}?`)) return;
    const r = await api.doorzetten(ronde - 1, []);
    if (r.error) meld(r.error, 'fout');
    else meld(`Alles terug naar ${vorige}`);
    ververs();
  }

  if (bewerk) {
    return (
      <ThemaForm
        thema={bewerk}
        klaar={() => {
          setBewerk(null);
          ververs();
        }}
      />
    );
  }

  return (
    <div>
      <h3 className="ld-sub">
        Thema's uitwerken
        <span>
          {klaar} van {themas.length} compleet
        </span>
      </h3>
      <ul className="ld-lijst is-scheiding">
        {themas.map((t) => (
          <li key={t.id} className="ld-uitwerk-rij">
            <button className="ld-rij is-beheer" onClick={() => setBewerk(t)}>
              {t.fotos?.[0] ? (
                <img className="ld-mini" src={api.fotoUrl(t.fotos[0])} alt="" />
              ) : (
                <span className="ld-mini is-leeg">{t.titel.slice(0, 1)}</span>
              )}
              <span className="ld-rij-tekst">
                {t.titel}
                <span className="ld-chips">
                  <em className={t.kort ? 'is-goed' : ''}>{t.kort ? 'Omschrijving' : 'Geen omschrijving'}</em>
                  <em className={t.fotos?.length ? 'is-goed' : ''}>
                    {t.fotos?.length ? `${t.fotos.length} foto${t.fotos.length === 1 ? '' : "'s"}` : "Geen foto's"}
                  </em>
                </span>
              </span>
              <span className="ld-uitwerk-knop">
                <Icoon naam="pen" grootte={16} /> Uitwerken
              </span>
            </button>
            <button
              className="ld-rondje is-rood"
              onClick={() => terug(t)}
              aria-label={`${t.titel} uit deze ronde halen`}
              title="Uit deze ronde halen"
            >
              <Icoon naam="kruis" grootte={16} />
            </button>
          </li>
        ))}
      </ul>
      <button className="ld-link is-klein is-rood" onClick={allesTerug}>
        Alles terugzetten naar {vorige}
      </button>
    </div>
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
    meld('Thema opgeslagen');
    klaar();
  }

  async function annuleer() {
    for (const pad of nieuw) await api.fotoVerwijder(pad);
    klaar();
  }

  return (
    <form className="ld-themaform" onSubmit={opslaan}>
      <h3 className="ld-sub">
        {thema.titel}
        <button type="button" className="ld-link is-klein" onClick={annuleer} disabled={Boolean(bezig)}>
          Terug
        </button>
      </h3>
      <label className="ld-veld">
        <span>Titel</span>
        <input className="ld-input" value={v.titel} maxLength={120} required onChange={(e) => setV({ ...v, titel: e.target.value })} />
      </label>
      <label className="ld-veld">
        <span>Korte omschrijving</span>
        <input
          className="ld-input"
          value={v.kort}
          maxLength={300}
          placeholder="Eén zin die bij de stemming staat"
          onChange={(e) => setV({ ...v, kort: e.target.value })}
        />
      </label>
      <label className="ld-veld">
        <span>Toelichting</span>
        <textarea
          className="ld-input"
          rows={7}
          value={v.toelichting}
          maxLength={20000}
          placeholder="Het idee uitgewerkt: wagen, kostuums, muziek…"
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
                  <Icoon naam="links" grootte={14} />
                </button>
                <button type="button" onClick={() => setFotos(fotos.filter((x) => x !== p))} aria-label="Foto weghalen">
                  <Icoon naam="kruis" grootte={14} />
                </button>
                <button type="button" onClick={() => schuif(i, 1)} disabled={i === fotos.length - 1} aria-label="Naar achteren">
                  <Icoon naam="rechts" grootte={14} />
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
            <Icoon naam="foto" /> Foto's
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
      </div>
    </form>
  );
}
