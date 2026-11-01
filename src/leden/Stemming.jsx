import { useEffect, useState } from 'react';
import * as api from './api.js';
import Icoon from './iconen.jsx';
import { meld } from './melding.js';
import { Leeg, Paginakop } from './onderdelen.jsx';
import { ThemaDetail } from './ThemaLijst.jsx';

export const RONDES = {
  1: { naam: 'Eerste vergadering', soort: 'Zet de thema’s op volgorde' },
  2: { naam: 'Stemronde 1', soort: 'Kies maximaal 3 thema’s' },
  3: { naam: 'Stemronde 2', soort: 'Kies je favoriet' },
};

export default function Stemming({ data, ververs }) {
  const [detail, setDetail] = useState(null);
  const open = data.rondes.find((r) => r.status === 'open');
  const gesloten = data.rondes.filter((r) => r.status === 'gesloten');
  // Alleen de uitslag van stemronde 1 gaat naar de leden, zodra de beheerder die ronde sluit.
  const openbaar = data.rondes.filter((r) => r.nr === 2 && r.status === 'gesloten');
  const winnaar = data.themas.find((t) => t.ronde === 4);

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
        {props.opgeslagen ? (
          <AlGestemd ronde={open.nr} keuze={props.opgeslagen} themas={data.themas} />
        ) : mee.length === 0 ? (
          <Leeg>Nog geen thema's in deze ronde.</Leeg>
        ) : open.nr === 1 ? (
          <Ranken key={open.nr} {...props} />
        ) : (
          <Kiezen key={open.nr} {...props} max={open.nr === 2 ? 3 : 1} />
        )}
      </>
    );
  } else {
    const laatste = gesloten[gesloten.length - 1];
    hoofd = (
      <>
        <Paginakop titel="Stemming" />
        {winnaar ? (
          <Leeg titel={`Ons thema: ${winnaar.titel}`}>Bedankt voor het stemmen! Bekijk het thema bij Thema’s.</Leeg>
        ) : laatste?.nr === 3 ? (
          <Leeg titel="De stemming is klaar">Bedankt voor het stemmen!</Leeg>
        ) : (
          <Leeg titel="Er staat nu geen stemming open">Bekijk alvast de thema’s.</Leeg>
        )}
      </>
    );
  }

  return (
    <>
      {hoofd}
      {openbaar
        .slice()
        .reverse()
        .map((r) => (
          <section key={r.nr} className="ld-kaart">
            <h2 className="ld-sub">Uitslag {RONDES[r.nr].naam.toLowerCase()}</h2>
            <UitslagLaden ronde={r.nr} />
          </section>
        ))}
      {detail && <ThemaDetail thema={detail} onSluit={() => setDetail(null)} />}
    </>
  );
}

function RondeKop({ ronde, deelname }) {
  const gestemd = deelname?.per_ronde?.[ronde.nr] ?? 0;
  const totaal = deelname?.leden || 0;
  return (
    <>
      <Paginakop titel={RONDES[ronde.nr].naam} sub={RONDES[ronde.nr].soort}>
        <div className="ld-deelname" title={`${gestemd} van ${totaal} leden hebben gestemd`}>
          <span className="ld-ring" style={{ '--p': totaal ? gestemd / totaal : 0 }} />
          <span>
            <strong>{gestemd}</strong>/{totaal}
            <small>gestemd</small>
          </span>
        </div>
      </Paginakop>
      {ronde.nr > 1 && (
        <div className="ld-stappen">
          {[2, 3].map((n) => (
            <span key={n} className={n < ronde.nr ? 'is-klaar' : n === ronde.nr ? 'is-nu' : ''}>
              {RONDES[n].naam}
            </span>
          ))}
        </div>
      )}
      {ronde.toelichting && <p className="ld-rondetekst">{ronde.toelichting}</p>}
    </>
  );
}

function InfoKnop({ thema, onInfo }) {
  return (
    <button
      type="button"
      className="ld-rondje"
      onClick={(e) => {
        e.stopPropagation();
        onInfo(thema);
      }}
      aria-label={`Meer over ${thema.titel}`}
    >
      <Icoon naam="info" grootte={18} />
    </button>
  );
}

// Je stemt één keer per ronde; daarna ligt je stem vast en zie je alleen nog wat je koos.
function AlGestemd({ ronde, keuze, themas }) {
  const perId = Object.fromEntries(themas.map((t) => [t.id, t]));
  const Lijst = ronde === 1 ? 'ol' : 'ul';
  return (
    <section className="ld-kaart is-plat">
      <p className="ld-binnen">
        <Icoon naam="vink" grootte={18} /> Je stem is binnen
      </p>
      <p className="ld-zacht ld-klein">Je kunt maar één keer stemmen per ronde. Je stem kan niet meer gewijzigd worden.</p>
      <h2 className="ld-sub">{ronde === 1 ? 'Jouw volgorde' : keuze.length === 1 ? 'Jouw keuze' : 'Jouw keuzes'}</h2>
      <Lijst className="ld-lijst">
        {keuze.map((id, i) => (
          <li key={id} className="ld-rij is-gekozen">
            {ronde === 1 && <span className="ld-nr">{i + 1}</span>}
            <span className="ld-rij-tekst">{perId[id]?.titel || '(thema verwijderd)'}</span>
          </li>
        ))}
      </Lijst>
    </section>
  );
}

const DEFINITIEF = 'Weet je het zeker? Je kunt maar één keer stemmen: daarna kun je je stem niet meer wijzigen.';

function Verstuur({ klaar, bezig, tekst, onKlik, melding }) {
  return (
    <div className="ld-onder">
      {melding && <p className="ld-fout">{melding}</p>}
      <button className="ld-knop" onClick={onKlik} disabled={!klaar || bezig}>
        {bezig ? 'Versturen…' : tekst}
      </button>
      <p className="ld-zacht ld-klein">Je stem is definitief: je kunt hem na versturen niet meer wijzigen.</p>
    </div>
  );
}

// ---------------------------------------------------------------- ronde 1: rangschikken

function Ranken({ ronde, themas, ververs }) {
  const [volgorde, setVolgorde] = useState([]);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState(null);

  // Verwijderde thema's vallen eruit; nieuwe komen vanzelf bij "nog te plaatsen".
  const ids = new Set(themas.map((t) => t.id));
  const perId = Object.fromEntries(themas.map((t) => [t.id, t]));
  const geplaatst = volgorde.filter((id) => ids.has(id));
  const open = themas.filter((t) => !geplaatst.includes(t.id));
  const compleet = open.length === 0 && geplaatst.length > 0;

  function schuif(i, r) {
    const j = i + r;
    if (j < 0 || j >= geplaatst.length) return;
    const nieuw = [...geplaatst];
    [nieuw[i], nieuw[j]] = [nieuw[j], nieuw[i]];
    setVolgorde(nieuw);
  }

  async function verstuur() {
    if (!window.confirm(DEFINITIEF)) return;
    setBezig(true);
    setMelding(null);
    const r = await api.stem(ronde, geplaatst);
    setBezig(false);
    if (r.error) setMelding(r.error);
    else {
      meld('Je volgorde is verstuurd');
      ververs();
    }
  }

  return (
    <>
      {geplaatst.length > 0 && (
        <section className="ld-kaart is-plat">
          <h2 className="ld-sub">
            Jouw volgorde
            {geplaatst.length > 1 && (
              <button className="ld-link is-klein" onClick={() => setVolgorde([])}>
                Opnieuw
              </button>
            )}
          </h2>
          <ol className="ld-lijst">
            {geplaatst.map((id, i) => (
              <li key={id} className="ld-rij is-gekozen">
                <span className="ld-nr">{i + 1}</span>
                <span className="ld-rij-tekst">{perId[id].titel}</span>
                <span className="ld-pijlen">
                  <button onClick={() => schuif(i, -1)} disabled={i === 0} aria-label="Hoger">
                    <Icoon naam="op" grootte={16} />
                  </button>
                  <button onClick={() => schuif(i, 1)} disabled={i === geplaatst.length - 1} aria-label="Lager">
                    <Icoon naam="neer" grootte={16} />
                  </button>
                  <button onClick={() => setVolgorde(geplaatst.filter((x) => x !== id))} aria-label="Terugzetten">
                    <Icoon naam="kruis" grootte={16} />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {open.length > 0 && (
        <section className="ld-kaart is-plat">
          <h2 className="ld-sub">
            {geplaatst.length === 0 ? 'Tik je favoriet aan' : `Kies nummer ${geplaatst.length + 1}`}
            <span>{open.length} over</span>
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
                  <span className="ld-rij-tekst">{t.titel}</span>
                  <span className="ld-plus">
                    <Icoon naam="plus" grootte={18} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Verstuur
        klaar={compleet}
        bezig={bezig}
        melding={melding}
        onKlik={verstuur}
        tekst={compleet ? 'Volgorde versturen' : `Nog ${open.length} te plaatsen`}
      />
    </>
  );
}

// ---------------------------------------------------------------- ronde 2 en 3: kiezen

function Kiezen({ ronde, themas, ververs, onInfo, max }) {
  const [keuze, setKeuze] = useState([]);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState(null);

  const geldig = keuze.filter((id) => themas.some((t) => t.id === id));

  function wissel(id) {
    if (max === 1) return setKeuze([id]);
    if (geldig.includes(id)) return setKeuze(geldig.filter((x) => x !== id));
    if (geldig.length < max) setKeuze([...geldig, id]);
  }

  async function verstuur() {
    if (!window.confirm(DEFINITIEF)) return;
    setBezig(true);
    setMelding(null);
    const r = await api.stem(ronde, geldig);
    setBezig(false);
    if (r.error) setMelding(r.error);
    else {
      meld('Je stem is verstuurd');
      ververs();
    }
  }

  return (
    <>
      {max > 1 && (
        <p className="ld-teller-regel">
          {[...Array(max)].map((_, i) => (
            <span key={i} className={i < geldig.length ? 'is-aan' : ''} />
          ))}
          {geldig.length} van {max} gekozen
        </p>
      )}
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
                <span className="ld-vink" aria-hidden="true">
                  {aan && <Icoon naam="vink" grootte={16} />}
                </span>
              </span>
              <span className="ld-keuze-tekst">
                <strong>{t.titel}</strong>
                {t.kort && <span>{t.kort}</span>}
              </span>
              <InfoKnop thema={t} onInfo={onInfo} />
            </div>
          );
        })}
      </div>
      <Verstuur
        klaar={geldig.length > 0}
        bezig={bezig}
        melding={melding}
        onKlik={verstuur}
        tekst={geldig.length === 0 ? (max === 1 ? 'Kies een thema' : 'Kies minstens één thema') : 'Stem versturen'}
      />
    </>
  );
}

// ---------------------------------------------------------------- uitslag

export function UitslagLaden({ ronde }) {
  const [u, setU] = useState(undefined); // undefined = laden, null = (nog) niet zichtbaar
  const [fout, setFout] = useState(null);

  useEffect(() => {
    let weg = false;
    api.uitslag(ronde).then((r) => {
      if (weg) return;
      if (r.error) setFout(r.error);
      else setU(r.data ?? null);
    });
    return () => {
      weg = true;
    };
  }, [ronde]);

  if (fout) return <p className="ld-fout">{fout}</p>;
  if (u === undefined) return <p className="ld-zacht">Laden…</p>;
  if (!u) return <p className="ld-zacht">De uitslag is nog niet beschikbaar.</p>;
  return (
    <>
      <p className="ld-zacht ld-klein">
        {u.aantal_stemmen} {u.aantal_stemmen === 1 ? 'lid heeft' : 'leden hebben'} gestemd
      </p>
      <Uitslag ronde={ronde} uitslag={u} />
    </>
  );
}

export function Uitslag({ ronde, uitslag }) {
  const rijen = uitslag.rijen || [];
  if (!rijen.length) return <p className="ld-zacht">Geen thema's in deze ronde.</p>;
  const max = Math.max(1, ...rijen.map((r) => r.punten));
  let plek = 0;
  let vorige = null;
  return (
    <ol className="ld-uitslag">
      {rijen.map((r, i) => {
        if (r.punten !== vorige) plek = i + 1;
        vorige = r.punten;
        return (
          <li key={r.id} className={plek === 1 && r.punten > 0 ? 'is-1' : ''}>
            <span className="ld-uit-plek">{plek}</span>
            <div className="ld-uit-midden">
              <strong>{r.titel}</strong>
              {ronde === 1 && r.eerste > 0 && (
                <span className="ld-uit-eerste">{r.eerste}× op nummer 1</span>
              )}
              <span className="ld-balk">
                <span style={{ width: `${(r.punten / max) * 100}%` }} />
              </span>
            </div>
            <span className="ld-uit-punten">
              {r.punten}
              <small>{ronde === 1 ? 'pt' : r.punten === 1 ? 'stem' : 'stemmen'}</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
