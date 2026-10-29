import { useEffect, useState } from 'react';
import * as api from './api.js';
import { ThemaDetail } from './ThemaLijst.jsx';

export const RONDES = {
  1: { naam: 'Ronde 1', soort: 'Zet alle thema’s op volgorde, van favoriet naar minst leuk.' },
  2: { naam: 'Ronde 2', soort: 'Stem op maximaal 3 thema’s. De uitslag blijft geheim.' },
  3: { naam: 'Finale', soort: 'Eén stem op je favoriete thema.' },
};

export default function Stemming({ data, ververs }) {
  const [detail, setDetail] = useState(null);
  const open = data.rondes.find((r) => r.status === 'open');
  const gesloten = data.rondes.filter((r) => r.status === 'gesloten');
  const openbaar = data.rondes.filter((r) => r.status === 'gesloten' && r.uitslag_openbaar && r.nr !== 2);

  let hoofd;
  if (open) {
    const mee = data.themas.filter((t) => t.ronde >= open.nr);
    const props = {
      ronde: open.nr,
      themas: mee,
      opgeslagen: data.mijnStemmen[open.nr] || null,
      ververs,
      onInfo: setDetail,
    };
    hoofd = (
      <>
        <RondeKop ronde={open} deelname={data.deelname} />
        {mee.length === 0 ? (
          <p className="ld-zacht">Er staan nog geen thema's in deze ronde.</p>
        ) : open.nr === 1 ? (
          <Ranken key={open.nr} {...props} />
        ) : (
          <Kiezen key={open.nr} {...props} max={open.nr === 2 ? 3 : 1} />
        )}
      </>
    );
  } else if (!gesloten.length) {
    hoofd = (
      <div className="ld-kaart ld-midden">
        <h1 className="ld-titel">De stemming begint binnenkort</h1>
        <p className="ld-zacht">
          Zodra de eerste ronde opengaat kun je hier stemmen. Kijk alvast bij Thema's wat er op
          tafel ligt.
        </p>
      </div>
    );
  } else {
    const laatste = gesloten[gesloten.length - 1];
    hoofd = (
      <div className="ld-kaart ld-midden">
        <h1 className="ld-titel">
          {laatste.nr === 3 ? 'De stemming is klaar' : `${RONDES[laatste.nr].naam} is gesloten`}
        </h1>
        <p className="ld-zacht">
          {laatste.nr === 3
            ? 'Bedankt voor het stemmen! De uitslag hoor je van de beheerder.'
            : 'Bedankt voor je stem. De volgende ronde opent binnenkort.'}
        </p>
      </div>
    );
  }

  return (
    <>
      {hoofd}
      {openbaar
        .slice()
        .reverse()
        .map((r) => (
          <div key={r.nr} className="ld-kaart">
            <h2 className="ld-sub">Uitslag {RONDES[r.nr].naam.toLowerCase()}</h2>
            <UitslagLaden ronde={r.nr} />
          </div>
        ))}
      {detail && <ThemaDetail thema={detail} onSluit={() => setDetail(null)} />}
    </>
  );
}

function RondeKop({ ronde, deelname }) {
  const gestemd = deelname?.per_ronde?.[ronde.nr] ?? 0;
  return (
    <div className="ld-rondekop">
      <div className="ld-stappen" aria-label={`Ronde ${ronde.nr} van 3`}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n < ronde.nr ? 'is-klaar' : n === ronde.nr ? 'is-nu' : ''} />
        ))}
      </div>
      <h1 className="ld-titel">{RONDES[ronde.nr].naam}</h1>
      <p className="ld-zacht">{RONDES[ronde.nr].soort}</p>
      {ronde.toelichting && <p className="ld-rondetekst">{ronde.toelichting}</p>}
      {deelname && (
        <p className="ld-klein ld-zacht">
          {gestemd} van de {deelname.leden} leden hebben gestemd
        </p>
      )}
    </div>
  );
}

function InfoKnop({ thema, onInfo }) {
  return (
    <button
      type="button"
      className="ld-info"
      onClick={(e) => {
        e.stopPropagation();
        onInfo(thema);
      }}
      aria-label={`Meer over ${thema.titel}`}
    >
      i
    </button>
  );
}

function Mini({ thema }) {
  const foto = thema.fotos?.[0];
  return foto ? <img className="ld-mini" src={api.fotoUrl(foto)} alt="" loading="lazy" /> : null;
}

function Verstuur({ klaar, zelfde, bezig, tekst, onKlik, melding }) {
  return (
    <div className="ld-onder">
      {melding && <p className="ld-fout">{melding}</p>}
      {zelfde ? (
        <p className="ld-gelukt">✓ Je stem is binnen. Aanpassen mag tot de ronde sluit.</p>
      ) : (
        <button className="ld-knop" onClick={onKlik} disabled={!klaar || bezig}>
          {bezig ? 'Versturen…' : tekst}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- ronde 1: rangschikken

function Ranken({ ronde, themas, opgeslagen, ververs, onInfo }) {
  const [volgorde, setVolgorde] = useState(opgeslagen || []);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState(null);

  // Verwijderde thema's vallen eruit; nieuwe komen vanzelf bij "nog te plaatsen".
  const ids = new Set(themas.map((t) => t.id));
  const perId = Object.fromEntries(themas.map((t) => [t.id, t]));
  const geplaatst = volgorde.filter((id) => ids.has(id));
  const open = themas.filter((t) => !geplaatst.includes(t.id));
  const compleet = open.length === 0 && geplaatst.length > 0;
  const zelfde = compleet && JSON.stringify(opgeslagen) === JSON.stringify(geplaatst);

  function schuif(i, r) {
    const j = i + r;
    if (j < 0 || j >= geplaatst.length) return;
    const nieuw = [...geplaatst];
    [nieuw[i], nieuw[j]] = [nieuw[j], nieuw[i]];
    setVolgorde(nieuw);
  }

  async function verstuur() {
    setBezig(true);
    setMelding(null);
    const r = await api.stem(ronde, geplaatst);
    setBezig(false);
    if (r.error) setMelding(r.error);
    else ververs();
  }

  return (
    <>
      <p className="ld-zacht ld-klein">
        Tik eerst je favoriet aan, dan de volgende, tot alles een plek heeft. Met de pijltjes schuif
        je nog. Via <b>i</b> lees je meer over een thema.
      </p>

      {geplaatst.length > 0 && (
        <div className="ld-kaart">
          <h2 className="ld-sub">
            Jouw volgorde <span>favoriet bovenaan</span>
          </h2>
          <ol className="ld-lijst">
            {geplaatst.map((id, i) => (
              <li key={id} className="ld-rij is-gekozen">
                <span className="ld-nr">{i + 1}</span>
                <Mini thema={perId[id]} />
                <span className="ld-rij-tekst">{perId[id].titel}</span>
                <InfoKnop thema={perId[id]} onInfo={onInfo} />
                <span className="ld-pijlen">
                  <button onClick={() => schuif(i, -1)} disabled={i === 0} aria-label="Hoger">
                    ▲
                  </button>
                  <button onClick={() => schuif(i, 1)} disabled={i === geplaatst.length - 1} aria-label="Lager">
                    ▼
                  </button>
                  <button onClick={() => setVolgorde(geplaatst.filter((x) => x !== id))} aria-label="Terugzetten">
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {open.length > 0 && (
        <div className="ld-kaart">
          <h2 className="ld-sub">
            Nog te plaatsen <span>{open.length}</span>
          </h2>
          <ul className="ld-lijst">
            {open.map((t) => (
              <li key={t.id}>
                <div
                  role="button"
                  tabIndex={0}
                  className="ld-rij is-open"
                  onClick={() => setVolgorde([...geplaatst, t.id])}
                  onKeyDown={(e) => e.key === 'Enter' && setVolgorde([...geplaatst, t.id])}
                >
                  <span className="ld-nr is-leeg">{geplaatst.length + 1}</span>
                  <Mini thema={t} />
                  <span className="ld-rij-tekst">{t.titel}</span>
                  <InfoKnop thema={t} onInfo={onInfo} />
                  <span className="ld-plus">+</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Verstuur
        klaar={compleet}
        zelfde={zelfde}
        bezig={bezig}
        melding={melding}
        onKlik={verstuur}
        tekst={compleet ? (opgeslagen ? 'Wijziging versturen' : 'Volgorde versturen') : `Nog ${open.length} te plaatsen`}
      />
    </>
  );
}

// ---------------------------------------------------------------- ronde 2 en 3: kiezen

function Kiezen({ ronde, themas, opgeslagen, ververs, onInfo, max }) {
  const [keuze, setKeuze] = useState(opgeslagen || []);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState(null);

  const geldig = keuze.filter((id) => themas.some((t) => t.id === id));
  const zelfde =
    opgeslagen && geldig.length > 0 && [...opgeslagen].sort().join() === [...geldig].sort().join();

  function wissel(id) {
    if (max === 1) return setKeuze([id]);
    if (geldig.includes(id)) return setKeuze(geldig.filter((x) => x !== id));
    if (geldig.length < max) setKeuze([...geldig, id]);
  }

  async function verstuur() {
    setBezig(true);
    setMelding(null);
    const r = await api.stem(ronde, geldig);
    setBezig(false);
    if (r.error) setMelding(r.error);
    else ververs();
  }

  return (
    <>
      <p className="ld-zacht ld-klein">
        {max === 1
          ? 'Tik je favoriet aan en verstuur je stem.'
          : `Gekozen: ${geldig.length} van maximaal ${max}.`}{' '}
        Via <b>i</b> lees je meer over een thema.
      </p>
      <div className="ld-keuzes">
        {themas.map((t) => {
          const aan = geldig.includes(t.id);
          const vol = !aan && max > 1 && geldig.length >= max;
          return (
            <div
              key={t.id}
              role={max === 1 ? 'radio' : 'checkbox'}
              aria-checked={aan}
              aria-disabled={vol}
              tabIndex={0}
              className={`ld-keuze ${aan ? 'is-aan' : ''} ${vol ? 'is-vol' : ''}`}
              onClick={() => !vol && wissel(t.id)}
              onKeyDown={(e) => e.key === 'Enter' && !vol && wissel(t.id)}
            >
              <span className="ld-keuze-foto">
                {t.fotos?.[0] ? <img src={api.fotoUrl(t.fotos[0])} alt="" loading="lazy" /> : <span>{t.titel.slice(0, 1)}</span>}
              </span>
              <span className="ld-keuze-tekst">
                <strong>{t.titel}</strong>
                {t.kort && <span>{t.kort}</span>}
              </span>
              <InfoKnop thema={t} onInfo={onInfo} />
              <span className="ld-vink" aria-hidden="true">
                {aan ? '✓' : ''}
              </span>
            </div>
          );
        })}
      </div>
      <Verstuur
        klaar={geldig.length > 0}
        zelfde={zelfde}
        bezig={bezig}
        melding={melding}
        onKlik={verstuur}
        tekst={
          geldig.length === 0
            ? max === 1
              ? 'Kies een thema'
              : 'Kies minstens één thema'
            : opgeslagen
              ? 'Wijziging versturen'
              : max === 1
                ? 'Stem versturen'
                : `${geldig.length} ${geldig.length === 1 ? 'stem' : 'stemmen'} versturen`
        }
      />
    </>
  );
}

// ---------------------------------------------------------------- uitslag

export function UitslagLaden({ ronde, tik }) {
  const [u, setU] = useState(null);
  const [fout, setFout] = useState(null);

  useEffect(() => {
    let weg = false;
    api.uitslag(ronde).then((r) => {
      if (weg) return;
      if (r.error) setFout(r.error);
      else setU(r.data);
    });
    return () => {
      weg = true;
    };
  }, [ronde, tik]);

  if (fout) return <p className="ld-fout">{fout}</p>;
  if (!u) return <p className="ld-zacht">Laden…</p>;
  return <Uitslag ronde={ronde} uitslag={u} />;
}

export function Uitslag({ ronde, uitslag }) {
  const rijen = uitslag.rijen || [];
  if (!rijen.length) return <p className="ld-zacht">Geen thema's in deze ronde.</p>;
  const max = Math.max(1, ...rijen.map((r) => r.punten));
  let plek = 0;
  let vorige = null;
  return (
    <>
      <p className="ld-zacht ld-klein">
        {uitslag.aantal_stemmen} {uitslag.aantal_stemmen === 1 ? 'lid heeft' : 'leden hebben'} gestemd
        {ronde === 1 && ' · punten: nummer 1 krijgt de meeste'}
      </p>
      <ol className="ld-uitslag">
        {rijen.map((r, i) => {
          if (r.punten !== vorige) plek = i + 1;
          vorige = r.punten;
          return (
            <li key={r.id} className={plek <= 3 && r.punten > 0 ? `is-top is-${plek}` : ''}>
              <span className="ld-uit-plek">{plek}</span>
              <div className="ld-uit-midden">
                <strong>{r.titel}</strong>
                <span className="ld-balk">
                  <span style={{ width: `${(r.punten / max) * 100}%` }} />
                </span>
                {ronde === 1 && r.eerste > 0 && <span className="ld-klein ld-zacht">{r.eerste}× op nummer 1</span>}
              </div>
              <span className="ld-uit-punten">
                {r.punten}
                <small>{ronde === 1 ? 'pt' : r.punten === 1 ? 'stem' : 'stemmen'}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}
