import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as bve from './stemmen.js';
import './stemmen.css';

const FASES = [
  { id: 'invoeren', label: "Thema's invoeren" },
  { id: 'stemmen', label: 'Stemmen' },
  { id: 'uitslag', label: 'Uitslag' },
];

/**
 * Bende van Ellende: thema's voor carnaval op volgorde zetten, zoals Mentimeter.
 * Werkt zonder inlogcode — je vult alleen je naam in. Met de beheerderscode
 * (onderaan de pagina) krijg je er het beheer bij.
 */
export default function StemScherm({ onTerug }) {
  const [code, setCode] = useState(bve.bewaardeCode);

  const [stand, setStand] = useState(null);
  const [fout, setFout] = useState(null);
  const [tab, setTab] = useState(code ? 'beheer' : 'stem');

  const ververs = useCallback(async () => {
    const r = await bve.haalStand(code);
    if (r.error) setFout(r.error);
    else {
      setFout(null);
      setStand(r.data);
    }
  }, [code]);

  useEffect(() => {
    ververs();
    const t = setInterval(ververs, 3000);
    return () => clearInterval(t);
  }, [ververs]);

  const beheerder = Boolean(code && stand?.beheerder);

  return (
    <div className="bve">
      <header className="bve-kop">
        <button className="bve-terug" onClick={onTerug} aria-label="Terug">
          ←
        </button>
        <img className="bve-logo" src="/logo.png" alt="Bende van Ellende" />
        <span className="bve-kop-plek" />
      </header>

      <main className="bve-main">
        {beheerder && (
          <div className="bve-tabs" role="tablist">
            <button className={tab === 'beheer' ? 'is-aan' : ''} onClick={() => setTab('beheer')}>
              Beheer
            </button>
            <button className={tab === 'stem' ? 'is-aan' : ''} onClick={() => setTab('stem')}>
              Zelf stemmen
            </button>
          </div>
        )}

        {fout && <p className="bve-fout">{fout}</p>}
        {!stand && !fout && <p className="bve-zacht bve-midden">Even laden…</p>}

        {stand && beheerder && tab === 'beheer' && (
          <Beheer stand={stand} code={code} ververs={ververs} />
        )}
        {stand && (!beheerder || tab === 'stem') && <Deelnemer stand={stand} ververs={ververs} />}

        {stand && (
          <BeheerInlog
            ingelogd={beheerder}
            fout={Boolean(code) && !beheerder}
            onCode={(c) => {
              bve.bewaarCode(c);
              setCode(c);
              setTab(c ? 'beheer' : 'stem');
            }}
          />
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------- deelnemer

function Deelnemer({ stand, ververs }) {
  const [naam, setNaam] = useState(() => stand.mijn_stem?.naam || bve.bewaardeNaam());
  const [naamKlaar, setNaamKlaar] = useState(Boolean(naam));

  // Aangemeld zodra je naam er staat, en zolang het scherm openstaat af en toe
  // een seintje: zo ziet de beheerder live wie er is.
  useEffect(() => {
    if (!naamKlaar || !naam.trim()) return undefined;
    bve.aanmelden(naam.trim());
    const t = setInterval(() => bve.aanmelden(naam.trim()), 15000);
    return () => clearInterval(t);
  }, [naamKlaar, naam]);

  if (stand.fase === 'uitslag') {
    return (
      <>
        <h1 className="bve-titel">De uitslag</h1>
        <p className="bve-zacht">
          {stand.aantal_stemmen} {stand.aantal_stemmen === 1 ? 'stem' : 'stemmen'} · meeste punten bovenaan
        </p>
        <Uitslag rijen={stand.uitslag || []} />
      </>
    );
  }

  if (!naamKlaar) {
    return (
      <form
        className="bve-kaart bve-naam"
        onSubmit={(e) => {
          e.preventDefault();
          const schoon = naam.trim();
          if (!schoon) return;
          bve.bewaarNaam(schoon);
          setNaam(schoon);
          setNaamKlaar(true);
        }}
      >
        <h1 className="bve-titel">Welkom bij de vergadering!</h1>
        <label htmlFor="bve-naam">Wat is je naam?</label>
        <input
          id="bve-naam"
          className="bve-input"
          value={naam}
          maxLength={40}
          onChange={(e) => setNaam(e.target.value)}
          placeholder="Voornaam"
          autoComplete="given-name"
          enterKeyHint="go"
          autoFocus
        />
        <button className="bve-knop" type="submit" disabled={!naam.trim()}>
          Doe mee
        </button>
      </form>
    );
  }

  const wijzigNaam = (
    <button className="bve-linkje" onClick={() => setNaamKlaar(false)}>
      niet {naam}?
    </button>
  );

  if (stand.fase === 'invoeren') {
    return (
      <>
        <h1 className="bve-titel">Hoi {naam}!</h1>
        <p className="bve-zacht">
          De thema's worden nu verzameld. Zodra de stemming opengaat, zet je ze hier op volgorde.{' '}
          {wijzigNaam}
        </p>
        <div className="bve-kaart">
          <h2 className="bve-sub">
            Thema's tot nu toe <span>{stand.themas.length}</span>
          </h2>
          {stand.themas.length === 0 ? (
            <p className="bve-zacht">Nog niets — even geduld.</p>
          ) : (
            <ul className="bve-lijst">
              {stand.themas.map((t) => (
                <li key={t.id} className="bve-rij is-binnen">
                  {t.titel}
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    );
  }

  return <Ranken stand={stand} naam={naam} wijzigNaam={wijzigNaam} ververs={ververs} />;
}

function Ranken({ stand, naam, wijzigNaam, ververs }) {
  const opgeslagen = stand.mijn_stem?.volgorde || [];
  const [volgorde, setVolgorde] = useState(opgeslagen);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState(null);

  // Thema's die tussendoor verwijderd zijn vallen er gewoon uit; nieuwe komen
  // vanzelf bij "nog te plaatsen".
  const ids = new Set(stand.themas.map((t) => t.id));
  const titel = Object.fromEntries(stand.themas.map((t) => [t.id, t.titel]));
  const geplaatst = volgorde.filter((id) => ids.has(id));
  const open = stand.themas.filter((t) => !geplaatst.includes(t.id));
  const compleet = open.length === 0 && geplaatst.length > 0;
  const zelfde =
    stand.mijn_stem &&
    stand.mijn_stem.naam === naam &&
    JSON.stringify(opgeslagen.filter((id) => ids.has(id))) === JSON.stringify(geplaatst);

  function schuif(i, richting) {
    const j = i + richting;
    if (j < 0 || j >= geplaatst.length) return;
    const nieuw = [...geplaatst];
    [nieuw[i], nieuw[j]] = [nieuw[j], nieuw[i]];
    setVolgorde(nieuw);
  }

  async function verstuur() {
    setBezig(true);
    setMelding(null);
    const r = await bve.stem(naam, geplaatst);
    setBezig(false);
    if (r.error) setMelding(r.error);
    else ververs();
  }

  return (
    <>
      <h1 className="bve-titel">Zet ze op volgorde, {naam}</h1>
      <p className="bve-zacht">
        Tik je favoriet als eerste aan, dan de volgende, tot je slechtste onderaan staat. Met de
        pijltjes schuif je nog. {wijzigNaam}
      </p>

      {geplaatst.length > 0 && (
        <div className="bve-kaart">
          <h2 className="bve-sub">
            Jouw ranking <span>best → slechtst</span>
          </h2>
          <ol className="bve-lijst">
            {geplaatst.map((id, i) => (
              <li key={id} className="bve-rij is-geplaatst">
                <span className="bve-nr">{i + 1}</span>
                <span className="bve-rij-tekst">{titel[id]}</span>
                <span className="bve-pijlen">
                  <button onClick={() => schuif(i, -1)} disabled={i === 0} aria-label="Hoger">
                    ▲
                  </button>
                  <button
                    onClick={() => schuif(i, 1)}
                    disabled={i === geplaatst.length - 1}
                    aria-label="Lager"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => setVolgorde(geplaatst.filter((x) => x !== id))}
                    aria-label="Terugzetten"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {open.length > 0 && (
        <div className="bve-kaart">
          <h2 className="bve-sub">
            Nog te plaatsen <span>{open.length}</span>
          </h2>
          <ul className="bve-lijst">
            {open.map((t) => (
              <li key={t.id}>
                <button className="bve-rij is-open" onClick={() => setVolgorde([...geplaatst, t.id])}>
                  <span className="bve-nr is-leeg">{geplaatst.length + 1}</span>
                  <span className="bve-rij-tekst">{t.titel}</span>
                  <span className="bve-plus">+</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stand.themas.length === 0 && <p className="bve-zacht">Er staan nog geen thema's klaar.</p>}

      {melding && <p className="bve-fout">{melding}</p>}

      <div className="bve-onder">
        {zelfde && compleet ? (
          <p className="bve-klaar">✓ Je ranking is binnen. Aanpassen mag tot de stemming sluit.</p>
        ) : (
          <button className="bve-knop" onClick={verstuur} disabled={!compleet || bezig}>
            {bezig
              ? 'Versturen…'
              : compleet
                ? stand.mijn_stem
                  ? 'Wijziging versturen'
                  : 'Ranking versturen'
                : `Nog ${open.length} te plaatsen`}
          </button>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- uitslag

function Uitslag({ rijen }) {
  if (!rijen.length) return <p className="bve-zacht">Nog geen thema's.</p>;
  const max = Math.max(1, ...rijen.map((r) => r.punten));
  let plek = 0;
  let vorige = null;
  return (
    <ol className="bve-uitslag">
      {rijen.map((r, i) => {
        if (r.punten !== vorige) plek = i + 1;
        vorige = r.punten;
        return (
          <li key={r.id} className={`bve-uit ${plek <= 3 && r.punten > 0 ? `is-top is-${plek}` : ''}`}>
            <span className="bve-uit-plek">{plek}</span>
            <div className="bve-uit-midden">
              <strong>{r.titel}</strong>
              <span className="bve-balk">
                <span style={{ width: `${(r.punten / max) * 100}%` }} />
              </span>
              <span className="bve-uit-info">
                {r.gem_plek != null ? `gem. plek ${String(r.gem_plek).replace('.', ',')}` : 'geen stemmen'}
                {r.eerste > 0 && ` · ${r.eerste}× nummer 1`}
                {r.top3 > 0 && ` · ${r.top3}× top 3`}
              </span>
            </div>
            <span className="bve-uit-punten">
              {r.punten}
              <small>pt</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- beheer

function Beheer({ stand, code, ververs }) {
  // Zonder de nieuwste SQL is er nog geen deelnemerslijst: dan de stemmers.
  const deelnemers =
    stand.deelnemers ||
    (stand.stemmers || []).map((s) => ({ ...s, gestemd: true, online: false }));
  const aantalGestemd = deelnemers.filter((d) => d.gestemd).length;
  const [nieuw, setNieuw] = useState('');
  const [melding, setMelding] = useState(null);
  const invoer = useRef(null);

  async function doe(actie) {
    setMelding(null);
    const r = await actie;
    if (r.error) setMelding(r.error);
    await ververs();
    return !r.error;
  }

  async function voegToe(e) {
    e.preventDefault();
    // Meerdere regels plakken = meerdere thema's tegelijk.
    const titels = nieuw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!titels.length) return;
    setNieuw('');
    for (const t of titels) await bve.themaToevoegen(code, t);
    await ververs();
    invoer.current?.focus();
  }

  return (
    <>
      <div className="bve-kaart">
        <h2 className="bve-sub">Fase</h2>
        <div className="bve-fases">
          {FASES.map((f, i) => (
            <button
              key={f.id}
              className={stand.fase === f.id ? 'is-aan' : ''}
              onClick={() => doe(bve.zetFase(code, f.id))}
            >
              <span>{i + 1}</span>
              {f.label}
            </button>
          ))}
        </div>
        {stand.fase === 'invoeren' && (
          <button
            className="bve-knop bve-volgende"
            disabled={!stand.themas.length}
            onClick={() => {
              if (window.confirm(`Stemming openen met ${stand.themas.length} thema's?`)) {
                doe(bve.zetFase(code, 'stemmen'));
              }
            }}
          >
            {stand.themas.length ? 'Stemming openen →' : "Eerst thema's toevoegen"}
          </button>
        )}
        {stand.fase === 'stemmen' && (
          <button
            className="bve-knop bve-volgende"
            onClick={() => {
              if (window.confirm('Stemming sluiten en de uitslag aan iedereen tonen?')) {
                doe(bve.zetFase(code, 'uitslag'));
              }
            }}
          >
            Stemming sluiten · uitslag tonen →
          </button>
        )}
        <p className="bve-zacht bve-klein">
          {stand.fase === 'invoeren' && "Iedereen ziet de thema's binnenkomen, stemmen kan nog niet."}
          {stand.fase === 'stemmen' && 'De stemming is open. De uitslag zie alleen jij.'}
          {stand.fase === 'uitslag' && 'Iedereen ziet nu de uitslag. Stemmen kan niet meer.'}
        </p>
      </div>

      {melding && <p className="bve-fout">{melding}</p>}

      <Delen deelnemers={deelnemers} />

      <div className="bve-kaart">
        <h2 className="bve-sub">
          Thema's <span>{stand.themas.length}</span>
        </h2>
        <form className="bve-toevoegen" onSubmit={voegToe}>
          <input
            ref={invoer}
            className="bve-input"
            value={nieuw}
            onChange={(e) => setNieuw(e.target.value)}
            onPaste={(e) => {
              const tekst = e.clipboardData.getData('text');
              if (tekst.includes('\n')) {
                e.preventDefault();
                setNieuw(tekst);
              }
            }}
            placeholder="Nieuw thema"
            maxLength={2000}
            enterKeyHint="done"
          />
          <button className="bve-knop" type="submit" disabled={!nieuw.trim()}>
            Toevoegen
          </button>
        </form>
        {nieuw.includes('\n') && (
          <p className="bve-zacht bve-klein">
            {nieuw.split('\n').filter((s) => s.trim()).length} thema's in één keer
          </p>
        )}
        <ul className="bve-lijst">
          {stand.themas.map((t) => (
            <li key={t.id} className="bve-rij is-beheer">
              <span className="bve-rij-tekst">{t.titel}</span>
              <span className="bve-pijlen">
                <button
                  aria-label="Wijzigen"
                  onClick={() => {
                    const titel = window.prompt('Thema wijzigen', t.titel);
                    if (titel && titel.trim() && titel.trim() !== t.titel) {
                      doe(bve.themaWijzig(code, t.id, titel.trim()));
                    }
                  }}
                >
                  ✎
                </button>
                <button
                  aria-label="Verwijderen"
                  onClick={() => {
                    if (window.confirm(`"${t.titel}" verwijderen?`)) doe(bve.themaVerwijder(code, t.id));
                  }}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bve-kaart">
        <h2 className="bve-sub">
          Aangemeld{' '}
          <span>
            {deelnemers.length} · {aantalGestemd} gestemd
          </span>
        </h2>
        {deelnemers.length ? (
          <ul className="bve-lijst">
            {deelnemers.map((d) => (
              <li key={d.toestel} className="bve-rij is-deelnemer">
                <span className={`bve-stip ${d.online ? 'is-online' : ''}`} title={d.online ? 'online' : 'weg'} />
                <span className="bve-rij-tekst">{d.naam}</span>
                <span className={`bve-status ${d.gestemd ? 'is-gestemd' : ''}`}>
                  {d.gestemd ? '✓ gestemd' : stand.fase === 'stemmen' ? 'bezig…' : 'aangemeld'}
                </span>
                <span className="bve-pijlen">
                  <button
                    aria-label={`${d.naam} verwijderen`}
                    onClick={() => {
                      if (window.confirm(`${d.naam} (en zijn stem) verwijderen?`)) {
                        doe(bve.stemVerwijder(code, d.toestel));
                      }
                    }}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="bve-zacht">Nog niemand. Laat ze de QR-code scannen.</p>
        )}
        {stand.aantal_stemmen > 0 && (
          <button
            className="bve-linkje bve-wis"
            onClick={() => {
              if (window.confirm("Alle stemmen wissen? De thema's en deelnemers blijven staan.")) {
                doe(bve.stemmenWissen(code));
              }
            }}
          >
            Alle stemmen wissen
          </button>
        )}
      </div>

      <div className="bve-kaart">
        <h2 className="bve-sub">
          Uitslag <span>{stand.fase === 'uitslag' ? 'iedereen ziet dit' : 'alleen voor jou'}</span>
        </h2>
        <Uitslag rijen={stand.uitslag || []} />
      </div>
    </>
  );
}

function Delen({ deelnemers = [] }) {
  const link = `${window.location.origin}${bve.PAD}`;
  const [qr, setQr] = useState(null);
  const [groot, setGroot] = useState(false);
  const [gekopieerd, setGekopieerd] = useState(false);

  useEffect(() => {
    let weg = false;
    import('qrcode')
      .then((m) => m.toDataURL(link, { margin: 1, width: 640, color: { dark: '#0B2D66', light: '#FFFFFF' } }))
      .then((url) => !weg && setQr(url))
      .catch(() => {});
    return () => {
      weg = true;
    };
  }, [link]);

  const kort = useMemo(() => link.replace(/^https?:\/\//, ''), [link]);

  return (
    <div className="bve-kaart bve-delen">
      {qr && (
        <button className="bve-qr" onClick={() => setGroot(true)} aria-label="QR-code groot tonen">
          <img src={qr} alt="" />
        </button>
      )}
      <div>
        <h2 className="bve-sub">Laat iedereen meedoen</h2>
        <p className="bve-link">{kort}</p>
        <button
          className="bve-linkje"
          onClick={() => {
            navigator.clipboard?.writeText(link).then(() => {
              setGekopieerd(true);
              setTimeout(() => setGekopieerd(false), 1800);
            });
          }}
        >
          {gekopieerd ? 'Gekopieerd ✓' : 'Link kopiëren'}
        </button>
        {qr && (
          <button className="bve-linkje" onClick={() => setGroot(true)}>
            QR groot op scherm
          </button>
        )}
      </div>

      {groot && (
        <div className="bve-qr-groot" onClick={() => setGroot(false)}>
          <img className="bve-qr-logo" src="/logo.png" alt="" />
          <img className="bve-qr-code" src={qr} alt={`QR-code naar ${kort}`} />
          <p>{kort}</p>
          {deelnemers.length > 0 && (
            <div className="bve-qr-namen">
              <strong>{deelnemers.length} aangemeld</strong>
              <div>
                {deelnemers.map((d) => (
                  <span key={d.toestel}>{d.naam}</span>
                ))}
              </div>
            </div>
          )}
          <span>tik om te sluiten</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- beheerderscode

function BeheerInlog({ ingelogd, fout, onCode }) {
  const [open, setOpen] = useState(fout);
  const [invoer, setInvoer] = useState('');

  if (ingelogd || !open) {
    return (
      <p className="bve-beheer-inlog">
        <button className="bve-linkje" onClick={() => (ingelogd ? onCode(null) : setOpen(true))}>
          {ingelogd ? 'Uitloggen als beheerder' : 'Beheer'}
        </button>
      </p>
    );
  }

  return (
    <form
      className="bve-beheer-inlog"
      onSubmit={(e) => {
        e.preventDefault();
        if (invoer.trim()) onCode(invoer.trim());
      }}
    >
      {fout && <p className="bve-fout">Die code klopt niet.</p>}
      <input
        className="bve-input"
        type="password"
        autoComplete="off"
        placeholder="Beheerderscode"
        value={invoer}
        onChange={(e) => setInvoer(e.target.value)}
      />
      <button className="bve-knop" type="submit">
        Inloggen
      </button>
    </form>
  );
}
