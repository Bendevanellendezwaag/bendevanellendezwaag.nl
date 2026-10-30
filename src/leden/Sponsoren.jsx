import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from './api.js';
import Icoon from './iconen.jsx';
import { meld } from './melding.js';
import { Leeg, Paginakop } from './onderdelen.jsx';
import Factuur from './Factuur.jsx';

const BEELD_KEY = 'bve-sponsorweergave-v2'; // nieuwe sleutel: iedereen begint weer op de tabel
const SECTIE_KEY = 'bve-sponsorsectie';
const SECTIES = {
  zakelijk: { label: 'Bedrijven', enkel: 'bedrijf', nieuw: 'Nieuw bedrijf' },
  familie: { label: 'Familie & vrienden', enkel: 'familie/vriend', nieuw: 'Nieuwe familie/vriend' },
  inleg: { label: 'Eigen inleg', enkel: 'lid', nieuw: 'Lid toevoegen' },
};
const SOORTEN = { zakelijk: 'Bedrijf', familie: 'Familie & vrienden' };
const BENADERING = { fysiek: 'Langs geweest', mail: 'Mail', app: 'App' };
const BETAALWIJZE = { factuur: 'Factuur', tikkie: 'Tikkie', contant: 'Contant' };
const FILTERS = { alle: 'Iedereen', mee: 'Doen mee', benaderen: 'Nog benaderen', geen: 'Niet dit jaar', open: 'Nog niet ontvangen' };
const SORTERINGEN = { hoog: 'Hoog → laag', laag: 'Laag → hoog', vorig: 'Vorig jaar hoog → laag', naam: 'Naam A → Z' };

const euroFmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const euro = (n) => euroFmt.format(n || 0);

// "250", "€ 1.250,50" -> getal; overige tekst ("Frituur") is een bijdrage in natura.
function leesWaarde(tekst) {
  const t = tekst.trim();
  if (!t) return { bedrag: null, natura: null };
  const schoon = t.replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(schoon)) return { bedrag: Number(schoon), natura: null };
  return { bedrag: null, natura: t.slice(0, 80) };
}
const toonWaarde = (b) => (!b ? '' : b.natura ? b.natura : b.bedrag != null ? String(Number(b.bedrag)).replace('.', ',') : '');
// Namen als ’t Valkje sorteren op de V, niet bovenaan.
const sorteerNaam = (n) => n.replace(/^[^a-z0-9]*(t\s)?/i, '');
const naamVolgorde = (a, b) => sorteerNaam(a).localeCompare(sorteerNaam(b), 'nl', { sensitivity: 'base' });
const doetMee = (b) => !!b && (b.bedrag > 0 || !!b.natura);
// Om op te sorteren: in natura telt mee boven 'niets', onder elk bedrag.
const sorteerWaarde = (b) => (b?.natura ? 0.5 : Number(b?.bedrag) || 0);

function onthouden(sleutel, standaard) {
  try {
    return localStorage.getItem(sleutel) || standaard;
  } catch {
    return standaard;
  }
}
// Op de telefoon is er geen ruimte voor de tabel: dan altijd de lijst.
function useSmal(grens = 860) {
  const vraag = `(max-width: ${grens}px)`;
  const [smal, setSmal] = useState(() => window.matchMedia(vraag).matches);
  useEffect(() => {
    const m = window.matchMedia(vraag);
    const wissel = () => setSmal(m.matches);
    m.addEventListener('change', wissel);
    return () => m.removeEventListener('change', wissel);
  }, [vraag]);
  return smal;
}

function bewaar(sleutel, waarde) {
  try {
    localStorage.setItem(sleutel, waarde);
  } catch {
    /* niet onthouden */
  }
}

/** Beheerder: sponsoring per jaar, strikt gescheiden in bedrijven, familie & vrienden en eigen inleg. */
export default function Sponsoren() {
  const [data, setData] = useState(null);
  const [fout, setFout] = useState(null);
  const [jaar, setJaar] = useState(null);
  const [sectie, setSectieState] = useState(() => onthouden(SECTIE_KEY, 'zakelijk'));
  const [open, setOpen] = useState(null); // sponsor-id, of 'nieuw'
  const [factuur, setFactuur] = useState(null); // { sponsor, jaar } of { jaar } voor het lege sjabloon

  const setSectie = (s) => {
    setSectieState(s);
    bewaar(SECTIE_KEY, s);
  };

  const laad = useCallback(async () => {
    const [s, b, j, l, i] = await Promise.all([api.sponsoren(), api.sponsorbijdragen(), api.sponsorjaren(), api.inleggers(), api.inleg()]);
    const mis = [s, b, j].find((x) => x.error);
    if (mis) return setFout(mis.error);
    setFout(l.error || i.error ? 'Eigen inleg per lid is nog niet beschikbaar: draai de nieuwste sponsoren.sql.' : null);
    setData({ sponsoren: s.data, bijdragen: b.data, jaren: j.data, inleggers: l.data || [], inleg: i.data || [] });
  }, []);

  useEffect(() => {
    laad();
  }, [laad]);

  const jaren = data?.jaren.map((j) => j.jaar) || [];
  const gekozen = jaar ?? jaren[jaren.length - 1];

  // bijdrage[sponsorId][jaar] en inlegVan[inleggerId][jaar]
  const bijdrage = useMemo(() => {
    const m = {};
    data?.bijdragen.forEach((b) => ((m[b.sponsor] ||= {})[b.jaar] = b));
    return m;
  }, [data]);
  const inlegVan = useMemo(() => {
    const m = {};
    data?.inleg.forEach((r) => ((m[r.inlegger] ||= {})[r.jaar] = r));
    return m;
  }, [data]);

  const totalen = useMemo(() => {
    const t = {};
    data?.jaren.forEach(
      (j) =>
        (t[j.jaar] = {
          zakelijk: 0,
          familie: 0,
          inleg: 0,
          los: Number(j.eigen_inleg) || 0, // totaal zonder verdeling per lid
          perLid: 0,
          n: { zakelijk: 0, familie: 0, inleg: 0 },
          natura: 0,
          ontvangen: { zakelijk: 0, familie: 0 },
        }),
    );
    const soortVan = Object.fromEntries((data?.sponsoren || []).map((s) => [s.id, s.soort]));
    data?.bijdragen.forEach((b) => {
      const r = t[b.jaar];
      const soort = soortVan[b.sponsor];
      if (!r || !soort) return;
      r[soort] += Number(b.bedrag) || 0;
      if (doetMee(b)) r.n[soort] += 1;
      if (b.natura) r.natura += 1;
      if (b.ontvangen) r.ontvangen[soort] += Number(b.bedrag) || 0;
    });
    data?.inleg.forEach((i) => {
      const r = t[i.jaar];
      if (!r || !(Number(i.bedrag) > 0)) return;
      r.perLid += Number(i.bedrag);
      r.n.inleg += 1;
    });
    Object.values(t).forEach((r) => (r.inleg = r.n.inleg ? r.perLid : r.los));
    return t;
  }, [data]);

  if (!data) return fout ? <p className="ld-fout">{fout}</p> : null;

  const vorigJaar = jaren[jaren.indexOf(gekozen) - 1];
  const t = totalen[gekozen];
  const v = totalen[vorigJaar];
  const max = Math.max(1, ...jaren.map((j) => totalen[j].zakelijk + totalen[j].familie + totalen[j].inleg));
  const sponsorOpen = open && open !== 'nieuw' ? data.sponsoren.find((s) => s.id === open) : null;

  async function slaBijdrageOp(sponsor, j, velden) {
    const r = await api.bijdrageOpslaan({ ...bijdrage[sponsor]?.[j], ...velden, sponsor, jaar: j });
    if (r.error) meld(r.error, 'fout');
    else
      setData((d) => ({
        ...d,
        bijdragen: [...d.bijdragen.filter((b) => !(b.sponsor === sponsor && b.jaar === j)), r.data],
      }));
    return r;
  }

  async function slaInlegOp(inlegger, j, velden) {
    const r = await api.inlegOpslaan({ ...inlegVan[inlegger]?.[j], ...velden, inlegger, jaar: j });
    if (r.error) meld(r.error, 'fout');
    else
      setData((d) => ({
        ...d,
        inleg: [...d.inleg.filter((x) => !(x.inlegger === inlegger && x.jaar === j)), r.data],
      }));
    return r;
  }

  // Factuurnummers per carnavalsjaar: 2026 -> 2601, 2602, ...
  function volgendNummer(j) {
    const voor = String(j).slice(2);
    const nrs = data.bijdragen.map((b) => b.factuurnr).filter((n) => /^\d{4}$/.test(n || '') && n.startsWith(voor));
    return nrs.length ? String(Math.max(...nrs.map(Number)) + 1) : `${voor}01`;
  }

  async function nieuwJaar() {
    const j = (jaren[jaren.length - 1] || new Date().getFullYear()) + 1;
    if (!window.confirm(`Carnavalsjaar ${j} toevoegen?`)) return;
    const r = await api.jaarToevoegen(j);
    if (r.error) return meld(r.error, 'fout');
    meld(`${j} toegevoegd`);
    setJaar(j);
    laad();
  }

  const totaal = t.zakelijk + t.familie + t.inleg;

  return (
    <>
      <Paginakop titel="Sponsoring" sub={`Carnaval ${gekozen} · ${euro(totaal)} totaal`}>
        <button className="ld-knop is-klein is-rand ld-sp-sjabloonknop" onClick={() => setFactuur({ jaar: gekozen })}>
          <Icoon naam="factuur" grootte={16} /> Factuursjabloon
        </button>
      </Paginakop>
      {fout && <p className="ld-fout">{fout}</p>}

      <section className="ld-kaart ld-sp-jarenkaart">
        <div className="ld-sp-jaren" role="tablist" aria-label="Carnavalsjaar">
          {jaren.map((j) => {
            const r = totalen[j];
            const som = r.zakelijk + r.familie + r.inleg;
            return (
              <button key={j} role="tab" aria-selected={j === gekozen} className={`ld-sp-jaar ${j === gekozen ? 'is-aan' : ''}`} onClick={() => setJaar(j)}>
                <span className="ld-sp-bedrag">{som ? euro(som) : '—'}</span>
                <span className="ld-sp-staaf" aria-hidden="true">
                  <i className="is-inleg" style={{ height: `${(r.inleg / max) * 100}%` }} />
                  <i className="is-familie" style={{ height: `${(r.familie / max) * 100}%` }} />
                  <i className="is-zakelijk" style={{ height: `${(r.zakelijk / max) * 100}%` }} />
                </span>
                <strong>{j}</strong>
              </button>
            );
          })}
          <button className="ld-sp-jaar is-nieuw" onClick={nieuwJaar} aria-label="Jaar toevoegen">
            <Icoon naam="plus" />
          </button>
        </div>
      </section>

      {/* De drie geldstromen, elk met eigen kleur; aantikken opent dat onderdeel. */}
      <div className="ld-sp-secties" role="tablist" aria-label="Onderdeel">
        {Object.entries(SECTIES).map(([k, s]) => (
          <button
            key={k}
            role="tab"
            aria-selected={sectie === k}
            className={`ld-sp-sectie is-${k} ${sectie === k ? 'is-aan' : ''}`}
            onClick={() => setSectie(k)}
          >
            <span className="ld-sp-sectie-label">{s.label}</span>
            <strong>{euro(t[k])}</strong>
            <small>
              {k === 'inleg' && !t.n.inleg ? (t.los ? 'niet per lid' : 'nog niets') : `${t.n[k]} ${k === 'inleg' ? 'leden' : k === 'zakelijk' ? 'bedrijven' : 'personen'}`}
              <Verschil nu={t[k]} vorig={v?.[k]} />
            </small>
          </button>
        ))}
      </div>

      {sectie === 'inleg' ? (
        <InlegSectie
          key="inleg"
          jaar={gekozen}
          vorigJaar={vorigJaar}
          inleggers={data.inleggers}
          inlegVan={inlegVan}
          totaal={t}
          slaInlegOp={slaInlegOp}
          herlaad={laad}
        />
      ) : (
        <SponsorSectie
          key={sectie}
          soort={sectie}
          sponsoren={data.sponsoren.filter((s) => s.soort === sectie)}
          bijdrage={bijdrage}
          jaren={jaren}
          gekozen={gekozen}
          vorigJaar={vorigJaar}
          totaal={t}
          slaBijdrageOp={slaBijdrageOp}
          onOpen={setOpen}
        />
      )}

      {open && (
        <SponsorKaart
          sponsor={sponsorOpen}
          nieuwSoort={sectie === 'familie' ? 'familie' : 'zakelijk'}
          jaren={jaren}
          bijdragen={sponsorOpen ? bijdrage[sponsorOpen.id] || {} : {}}
          slaBijdrageOp={slaBijdrageOp}
          onFactuur={(j) => setFactuur({ sponsor: sponsorOpen, jaar: j })}
          onSluit={() => setOpen(null)}
          onOpgeslagen={(s) => {
            setOpen(s?.id || null);
            if (s && s.soort !== sectie) setSectie(s.soort);
            laad();
          }}
        />
      )}

      {factuur && (
        <Factuur
          sponsor={factuur.sponsor}
          jaar={factuur.jaar}
          bijdrage={factuur.sponsor ? bijdrage[factuur.sponsor.id]?.[factuur.jaar] : null}
          volgendNummer={volgendNummer(factuur.jaar)}
          vastleggen={factuur.sponsor ? (velden) => slaBijdrageOp(factuur.sponsor.id, factuur.jaar, velden) : null}
          onSluit={() => setFactuur(null)}
        />
      )}
    </>
  );
}

function Verschil({ nu, vorig }) {
  if (!(vorig > 0) || !(nu > 0) || nu === vorig) return null;
  const op = nu > vorig;
  return (
    <em className={op ? 'is-op' : 'is-neer'}>
      {op ? '▲' : '▼'} {euro(Math.abs(nu - vorig))}
    </em>
  );
}

// Zoeken, filteren en sorteren; op de telefoon één compacte lijst.
function Gereedschap({ zoek, setZoek, filter, setFilter, filters, sorteer, setSorteer, beeld, setBeeld, jaar, plaatshouder }) {
  return (
    <div className="ld-sp-filters">
      <input className="ld-input" type="search" placeholder={plaatshouder} value={zoek} onChange={(e) => setZoek(e.target.value)} />
      <label className="ld-sp-keuze">
        <Icoon naam="filter" grootte={16} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
          {Object.entries(filters).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
              {k !== 'alle' && ` ${jaar}`}
            </option>
          ))}
        </select>
      </label>
      <label className="ld-sp-keuze">
        <Icoon naam="sorteer" grootte={16} />
        <select value={sorteer} onChange={(e) => setSorteer(e.target.value)} aria-label="Sorteren">
          {Object.entries(SORTERINGEN).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      {setBeeld && (
        <div className="ld-segment ld-sp-beeld" role="tablist" aria-label="Weergave">
          {[['tabel', 'Tabel'], ['tegels', 'Tegels']].map(([k, v]) => (
            <button key={k} role="tab" aria-selected={beeld === k} className={beeld === k ? 'is-aan' : ''} onClick={() => setBeeld(k)}>
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Volgorde blijft staan terwijl je bedragen invult; pas bij een andere sortering, filter of
// zoekterm wordt opnieuw gesorteerd. Anders springt de rij weg waar je net in typte.
function useVasteVolgorde(items, sorteren, sleutel) {
  const vast = useRef({ sleutel: null, ids: [] });
  if (vast.current.sleutel !== sleutel) vast.current = { sleutel, ids: sorteren(items).map((x) => x.id) };
  const plek = new Map(vast.current.ids.map((id, i) => [id, i]));
  return [...items].sort((a, b) => (plek.get(a.id) ?? Infinity) - (plek.get(b.id) ?? Infinity));
}

function sorteerLijst(lijst, sorteer, waardeNu, waardeVorig, naam) {
  return [...lijst].sort((a, b) => {
    const d =
      sorteer === 'hoog' ? waardeNu(b) - waardeNu(a)
      : sorteer === 'laag' ? waardeNu(a) - waardeNu(b)
      : sorteer === 'vorig' ? waardeVorig(b) - waardeVorig(a)
      : 0;
    return d || naamVolgorde(naam(a), naam(b));
  });
}

// ---------------------------------------------------------------- bedrijven / familie & vrienden

function SponsorSectie({ soort, sponsoren, bijdrage, jaren, gekozen, vorigJaar, totaal, slaBijdrageOp, onOpen }) {
  const [zoek, setZoek] = useState('');
  const [filter, setFilter] = useState('alle');
  const [sorteer, setSorteer] = useState('hoog');
  const [gekozenBeeld, setBeeldState] = useState(() => onthouden(BEELD_KEY, 'tabel'));
  const beeld = useSmal() ? 'tegels' : gekozenBeeld;
  const setBeeld = (b) => {
    setBeeldState(b);
    bewaar(BEELD_KEY, b);
  };
  const zakelijk = soort === 'zakelijk';
  const filters = zakelijk ? FILTERS : Object.fromEntries(Object.entries(FILTERS).filter(([k]) => k !== 'open'));

  const gefilterd = sponsoren.filter((s) => {
    if (zoek && !`${s.naam} ${s.factuurnaam || ''} ${s.contactpersoon || ''} ${s.plaats || ''} ${s.contact_via || ''} ${s.email || ''}`.toLowerCase().includes(zoek.toLowerCase())) return false;
    const nu = bijdrage[s.id]?.[gekozen];
    if (filter === 'mee') return doetMee(nu);
    if (filter === 'geen') return nu?.bedrag === 0 && !nu.natura;
    if (filter === 'open') return nu?.bedrag > 0 && !nu.ontvangen;
    // Nog benaderen: deed vorig jaar mee, maar voor dit jaar is er nog niets bekend.
    if (filter === 'benaderen') return doetMee(bijdrage[s.id]?.[vorigJaar]) && !doetMee(nu) && nu?.bedrag !== 0;
    return true;
  });
  const lijst = useVasteVolgorde(
    gefilterd,
    (l) => sorteerLijst(l, sorteer, (s) => sorteerWaarde(bijdrage[s.id]?.[gekozen]), (s) => sorteerWaarde(bijdrage[s.id]?.[vorigJaar]), (s) => s.naam),
    `${sorteer}|${filter}|${zoek}|${gekozen}|${gefilterd.length}`,
  );
  const som = lijst.reduce((x, s) => x + (Number(bijdrage[s.id]?.[gekozen]?.bedrag) || 0), 0);

  return (
    <section className={`ld-kaart ld-sp-blok is-${soort}`}>
      <header className="ld-sp-blokkop">
        <div>
          <h2>{SECTIES[soort].label}</h2>
          <p>
            {totaal.n[soort]} doen mee in {gekozen}
            {zakelijk && totaal[soort] > 0 && ` · ${euro(totaal.ontvangen[soort])} van ${euro(totaal[soort])} ontvangen`}
            {zakelijk && totaal.natura > 0 && ` · ${totaal.natura} in natura`}
          </p>
        </div>
        <button className="ld-knop is-klein" onClick={() => onOpen('nieuw')}>
          <Icoon naam="plus" grootte={16} /> {SECTIES[soort].nieuw}
        </button>
      </header>

      <Gereedschap
        zoek={zoek}
        setZoek={setZoek}
        filter={filter}
        setFilter={setFilter}
        filters={filters}
        sorteer={sorteer}
        setSorteer={setSorteer}
        beeld={beeld}
        setBeeld={setBeeld}
        jaar={gekozen}
        plaatshouder={zakelijk ? 'Zoek bedrijf, contactpersoon, plaats…' : 'Zoek op naam…'}
      />

      {lijst.length === 0 ? (
        <Leeg titel="Niemand gevonden" />
      ) : beeld === 'tegels' ? (
        <ul className="ld-sp-kaarten">
          {lijst.map((s) => (
            <SponsorTegel key={s.id} sponsor={s} bijdragen={bijdrage[s.id] || {}} jaren={jaren} gekozen={gekozen} onOpen={() => onOpen(s.id)} />
          ))}
        </ul>
      ) : (
        <SponsorTabel
          lijst={lijst}
          zakelijk={zakelijk}
          bijdrage={bijdrage}
          jaren={jaren}
          gekozen={gekozen}
          slaBijdrageOp={slaBijdrageOp}
          onOpen={onOpen}
        />
      )}
      {beeld === 'tegels' && lijst.length > 0 && (
        <p className="ld-sp-somregel">
          {lijst.length} getoond · samen {euro(som)} in {gekozen}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- eigen inleg

const INLEG_FILTERS = { alle: 'Iedereen', leeg: 'Nog niet ingevuld', onbetaald: 'Nog niet betaald' };

function InlegSectie({ jaar, vorigJaar, inleggers, inlegVan, totaal, slaInlegOp, herlaad }) {
  const [zoek, setZoek] = useState('');
  const [filter, setFilter] = useState('alle');
  const [sorteer, setSorteer] = useState('hoog');
  const [nieuw, setNieuw] = useState('');
  const [toonWeg, setToonWeg] = useState(false);

  const actief = inleggers.filter((l) => l.actief);
  const weg = inleggers.filter((l) => !l.actief);
  const bedragVan = (l, j) => Number(inlegVan[l.id]?.[j]?.bedrag) || 0;
  const gefilterd = actief.filter((l) => {
    if (zoek && !l.naam.toLowerCase().includes(zoek.toLowerCase())) return false;
    const r = inlegVan[l.id]?.[jaar];
    if (filter === 'leeg') return r?.bedrag == null;
    if (filter === 'onbetaald') return r?.bedrag > 0 && !r.betaald;
    return true;
  });
  const lijst = useVasteVolgorde(
    gefilterd,
    (l) => sorteerLijst(l, sorteer, (x) => bedragVan(x, jaar), (x) => bedragVan(x, vorigJaar), (x) => x.naam),
    `${sorteer}|${filter}|${zoek}|${jaar}|${gefilterd.length}`,
  );
  const ingevuld = actief.filter((l) => bedragVan(l, jaar) > 0);
  const betaald = ingevuld.filter((l) => inlegVan[l.id][jaar].betaald).reduce((x, l) => x + bedragVan(l, jaar), 0);
  const gemiddeld = ingevuld.length ? totaal.perLid / ingevuld.length : 0;
  const teKopieren = vorigJaar ? actief.filter((l) => inlegVan[l.id]?.[jaar]?.bedrag == null && bedragVan(l, vorigJaar) > 0) : [];

  async function toevoegen(e) {
    e.preventDefault();
    const naam = nieuw.trim();
    if (!naam) return;
    const r = await api.inleggerOpslaan({ naam });
    if (r.error) return meld(r.error, 'fout');
    meld(`${naam} toegevoegd`);
    setNieuw('');
    herlaad();
  }

  async function zetActief(l, aan) {
    if (!aan && !window.confirm(`${l.naam} uit de lijst halen? Eerdere inleg blijft bewaard.`)) return;
    const r = await api.inleggerOpslaan({ id: l.id, actief: aan });
    if (r.error) return meld(r.error, 'fout');
    meld(aan ? `${l.naam} staat weer in de lijst` : `${l.naam} uit de lijst`);
    herlaad();
  }

  async function kopieer() {
    if (!window.confirm(`Bij ${teKopieren.length} leden het bedrag van ${vorigJaar} invullen?`)) return;
    for (const l of teKopieren) await slaInlegOp(l.id, jaar, { bedrag: bedragVan(l, vorigJaar) });
    meld(`Bedragen van ${vorigJaar} overgenomen`);
  }

  return (
    <section className="ld-kaart ld-sp-blok is-inleg">
      <header className="ld-sp-blokkop">
        <div>
          <h2>Eigen inleg</h2>
          <p>
            {ingevuld.length} van {actief.length} leden ingevuld
            {ingevuld.length > 0 && ` · gemiddeld ${euro(gemiddeld)} · ${euro(betaald)} van ${euro(totaal.perLid)} betaald`}
          </p>
        </div>
        {teKopieren.length > 0 && (
          <button className="ld-knop is-klein is-rand" onClick={kopieer}>
            Bedragen {vorigJaar} overnemen
          </button>
        )}
      </header>

      {/* Oude jaren hebben alleen een totaalbedrag; dat blijft tellen tot er per lid is ingevuld. */}
      {!totaal.n.inleg && totaal.los > 0 && (
        <div className="ld-sp-los">
          <span>
            Totaal zonder verdeling per lid
            <small>Telt mee tot je hieronder per lid invult.</small>
          </span>
          <LosInleg jaar={jaar} waarde={totaal.los} herlaad={herlaad} />
        </div>
      )}

      <Gereedschap
        zoek={zoek}
        setZoek={setZoek}
        filter={filter}
        setFilter={setFilter}
        filters={INLEG_FILTERS}
        sorteer={sorteer}
        setSorteer={setSorteer}
        jaar={jaar}
        plaatshouder="Zoek lid…"
      />

      {actief.length === 0 ? (
        <Leeg titel="Nog geen leden">Voeg hieronder de leden toe die inleggen.</Leeg>
      ) : (
        <ul className="ld-sp-inleglijst">
          {lijst.map((l) => {
            const r = inlegVan[l.id]?.[jaar];
            const vorig = bedragVan(l, vorigJaar);
            return (
              <li key={l.id} className={r?.bedrag > 0 ? 'is-mee' : ''}>
                <span className="ld-sp-letter is-inleg">{l.naam.slice(0, 1).toUpperCase()}</span>
                <span className="ld-sp-inlegnaam">
                  <strong>{l.naam}</strong>
                  <small>{vorig > 0 ? `${vorigJaar}: ${euro(vorig)}` : ' '}</small>
                </span>
                <span className="ld-sp-eur">
                  €
                  <BedragInvoer
                    waarde={r?.bedrag}
                    label={`Inleg ${l.naam} ${jaar}`}
                    opslaan={(bedrag) => slaInlegOp(l.id, jaar, { bedrag })}
                  />
                </span>
                <button
                  className={`ld-sp-betaald ${r?.betaald ? 'is-aan' : ''}`}
                  disabled={!(r?.bedrag > 0)}
                  onClick={() => slaInlegOp(l.id, jaar, { betaald: !r.betaald })}
                  aria-pressed={!!r?.betaald}
                  title={r?.betaald ? 'Betaald' : 'Nog niet betaald'}
                >
                  <Icoon naam="vink" grootte={16} />
                  <span>Betaald</span>
                </button>
                <button className="ld-rondje is-rood ld-sp-weg-lid" onClick={() => zetActief(l, false)} aria-label={`${l.naam} uit de lijst halen`}>
                  <Icoon naam="kruis" grootte={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form className="ld-sp-nieuwlid" onSubmit={toevoegen}>
        <input className="ld-input" placeholder="Naam nieuw lid" maxLength={60} value={nieuw} onChange={(e) => setNieuw(e.target.value)} />
        <button className="ld-knop is-klein" type="submit" disabled={!nieuw.trim()}>
          <Icoon naam="plus" grootte={16} /> Lid toevoegen
        </button>
      </form>

      {weg.length > 0 && (
        <div className="ld-sp-uitlijst">
          <button className="ld-uitklap" onClick={() => setToonWeg((x) => !x)} aria-expanded={toonWeg}>
            Niet meer in de lijst ({weg.length}) <span>{toonWeg ? '−' : '+'}</span>
          </button>
          {toonWeg && (
            <ul className="ld-lijst is-scheiding">
              {weg.map((l) => (
                <li key={l.id} className="ld-lid">
                  <span>{l.naam}</span>
                  <button className="ld-link is-klein" onClick={() => zetActief(l, true)}>
                    Terugzetten
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function LosInleg({ jaar, waarde, herlaad }) {
  return (
    <span className="ld-sp-eur is-groot">
      €
      <BedragInvoer
        key={jaar}
        waarde={waarde || null}
        label={`Totaal eigen inleg ${jaar}`}
        opslaan={async (bedrag) => {
          const r = await api.jaarBijwerken(jaar, { eigen_inleg: bedrag });
          if (r.error) meld(r.error, 'fout');
          else meld('Opgeslagen');
          herlaad();
          return r;
        }}
      />
    </span>
  );
}

// Alleen een bedrag; opslaan bij verlaten van het veld of Enter.
function BedragInvoer({ waarde, label, opslaan }) {
  const begin = waarde != null ? String(Number(waarde)).replace('.', ',') : '';
  const [tekst, setTekst] = useState(begin);
  useEffect(() => setTekst(begin), [begin]);
  return (
    <input
      className="ld-sp-bedraginvoer"
      value={tekst}
      inputMode="decimal"
      placeholder="—"
      aria-label={label}
      onChange={(e) => setTekst(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={async () => {
        if (tekst.trim() === begin) return;
        const { bedrag, natura } = leesWaarde(tekst);
        if (natura) {
          meld('Vul een bedrag in', 'fout');
          return setTekst(begin);
        }
        const r = await opslaan(bedrag);
        if (r?.error) setTekst(begin);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setTekst(begin);
          setTimeout(() => e.target.blur());
        }
      }}
    />
  );
}

// Een sponsor als kaartje: wie, waar, wat dit jaar en hoe het de afgelopen jaren ging.
function SponsorTegel({ sponsor: s, bijdragen, jaren, gekozen, onOpen }) {
  const nu = bijdragen[gekozen];
  const reeks = jaren.filter((j) => j <= gekozen).slice(-4);
  const hoogste = Math.max(1, ...reeks.map((j) => Number(bijdragen[j]?.bedrag) || 0));
  const plek = [s.contactpersoon, s.plaats].filter(Boolean).join(' · ');
  return (
    <li>
      <button className={`ld-sp-kaartje ${doetMee(nu) ? 'is-mee' : ''}`} onClick={onOpen}>
        <span className="ld-sp-kaartje-kop">
          <span className={`ld-sp-letter ${s.soort === 'familie' ? 'is-familie' : ''}`}>{sorteerNaam(s.naam).slice(0, 1).toUpperCase()}</span>
          <span className="ld-sp-kaartje-naam">
            <strong>{s.naam}</strong>
            <small>{plek || (s.soort === 'familie' ? 'Familie & vrienden' : s.email || ' ')}</small>
          </span>
        </span>
        <span className="ld-sp-kaartje-bedrag">
          <Waarde b={nu} />
          <small>{gekozen}</small>
        </span>
        <span className="ld-sp-reeks" aria-hidden="true">
          {reeks.map((j) => {
            const b = bijdragen[j];
            const h = b?.natura ? 100 : ((Number(b?.bedrag) || 0) / hoogste) * 100;
            return (
              <span key={j} className={j === gekozen ? 'is-nu' : ''}>
                <i className={b?.natura ? 'is-natura' : ''} style={{ height: `${Math.max(h, 4)}%`, opacity: doetMee(b) ? 1 : 0.25 }} />
                <em>{String(j).slice(2)}</em>
              </span>
            );
          })}
        </span>
        <Status b={nu} />
        {s.contact_via && <span className="ld-sp-via">via {s.contact_via}</span>}
      </button>
    </li>
  );
}

function Waarde({ b }) {
  if (!b || (b.bedrag == null && !b.natura)) return <span className="ld-zacht">·</span>;
  if (b.natura) return <em className="ld-sp-natura">{b.natura}</em>;
  if (Number(b.bedrag) === 0) return <span className="ld-zacht">€ 0</span>;
  return euro(b.bedrag);
}

// Bedrag of natura direct in de tabel invullen; opslaan bij verlaten van het veld.
// Het overzicht zoals de Excel: bijdragen per jaar en daarnaast de status van het gekozen jaar,
// alles direct aan te vinken of in te vullen.
const VINKEN_VOOR = [
  ['contact', 'Benaderd', 'Al contact gehad'],
  ['reactie', 'Reactie', 'Al reactie gekregen'],
];
const VINKEN_NA = [
  ['ontvangen', 'Betaald', 'Geld ontvangen'],
  ['uitnodiging', 'Uitgen.', 'Uitnodiging sponsoravond verstuurd'],
];

function SponsorTabel({ lijst, zakelijk, bijdrage, jaren, gekozen, slaBijdrageOp, onOpen }) {
  const b = (s) => bijdrage[s.id]?.[gekozen];
  const zet = (s, velden) => slaBijdrageOp(s.id, gekozen, velden);
  const telAan = (k) => lijst.filter((s) => b(s)?.[k]).length;
  const vinkCel = (s, [k, kop]) => (
    <td key={k} className="is-vink is-st">
      <Vink aan={!!b(s)?.[k]} label={`${kop} ${s.naam}`} onWissel={() => zet(s, { [k]: !b(s)?.[k] })} />
    </td>
  );
  return (
    <div className="ld-sp-scroll">
      <table className="ld-sp-tabel is-excel">
        <thead>
          <tr className="ld-sp-groepkop">
            <th colSpan={zakelijk ? 3 : 2} />
            <th colSpan={jaren.length} className="is-getal">Bijdrage per jaar</th>
            <th colSpan={VINKEN_VOOR.length + VINKEN_NA.length + (zakelijk ? 2 : 1)} className="is-status">
              Status {gekozen}
            </th>
          </tr>
          <tr>
            <th>{zakelijk ? 'Bedrijf' : 'Naam'}</th>
            <th>Via</th>
            {zakelijk && <th>E-mail</th>}
            {jaren.map((j) => (
              <th key={j} className={`is-getal ${j === gekozen ? 'is-gekozen' : ''}`}>{j}</th>
            ))}
            {VINKEN_VOOR.map(([k, kop, uitleg]) => (
              <th key={k} className="is-vink is-status" title={uitleg}>{kop}</th>
            ))}
            <th className="is-status">Betaling</th>
            {zakelijk && <th className="is-status">Factuur</th>}
            {VINKEN_NA.map(([k, kop, uitleg]) => (
              <th key={k} className="is-vink is-status" title={uitleg}>{kop}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lijst.map((s) => (
            <tr key={s.id} className={b(s)?.ontvangen ? 'is-betaald' : ''}>
              <th>
                <button className="ld-sp-naam" onClick={() => onOpen(s.id)}>
                  {s.naam}
                  {s.plaats && <small>{s.plaats}</small>}
                </button>
              </th>
              <td className="ld-sp-zacht">{s.contact_via || ''}</td>
              {zakelijk && (
                <td className="ld-sp-mail" title={s.email || ''}>
                  {s.email || ''}
                </td>
              )}
              {jaren.map((j) =>
                j === gekozen ? (
                  <td key={j} className="is-getal is-gekozen">
                    <WaardeInvoer b={bijdrage[s.id]?.[j]} label={`${s.naam} ${j}`} opslaan={(v) => slaBijdrageOp(s.id, j, leesWaarde(v))} />
                  </td>
                ) : (
                  <td key={j} className="is-getal">
                    <Waarde b={bijdrage[s.id]?.[j]} />
                  </td>
                ),
              )}
              {VINKEN_VOOR.map((v) => vinkCel(s, v))}
              <td className="is-st">
                <select
                  className="ld-sp-celkeuze"
                  value={b(s)?.betaalwijze || ''}
                  aria-label={`Betaling ${s.naam}`}
                  onChange={(e) => zet(s, { betaalwijze: e.target.value || null })}
                >
                  <option value="">—</option>
                  {Object.entries(BETAALWIJZE).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </td>
              {zakelijk && (
                <td className="is-st">
                  <TekstCel
                    waarde={b(s)?.factuurnr || ''}
                    label={`Factuurnummer ${s.naam}`}
                    opslaan={(v) => zet(s, { factuurnr: v || null, ...(v && !b(s)?.betaalwijze ? { betaalwijze: 'factuur' } : {}) })}
                  />
                </td>
              )}
              {VINKEN_NA.map((v) => vinkCel(s, v))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>Totaal ({lijst.length})</th>
            <td />
            {zakelijk && <td />}
            {jaren.map((j) => (
              <td key={j} className={`is-getal ${j === gekozen ? 'is-gekozen' : ''}`}>
                {euro(lijst.reduce((x, s) => x + (Number(bijdrage[s.id]?.[j]?.bedrag) || 0), 0))}
              </td>
            ))}
            {VINKEN_VOOR.map(([k]) => (
              <td key={k} className="is-vink is-st">{telAan(k)}</td>
            ))}
            <td className="is-st" />
            {zakelijk && <td className="is-st" />}
            {VINKEN_NA.map(([k]) => (
              <td key={k} className="is-vink is-st">{telAan(k)}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Vink({ aan, label, onWissel }) {
  return (
    <button className={`ld-sp-vink ${aan ? 'is-aan' : ''}`} onClick={onWissel} aria-pressed={aan} aria-label={label}>
      {aan && <Icoon naam="vink" grootte={14} />}
    </button>
  );
}

// Losse tekst in een cel (factuurnummer); opslaan bij verlaten van het veld.
function TekstCel({ waarde, label, opslaan }) {
  const [tekst, setTekst] = useState(waarde);
  useEffect(() => setTekst(waarde), [waarde]);
  return (
    <input
      className="ld-sp-cel is-tekst"
      value={tekst}
      placeholder="—"
      aria-label={label}
      onChange={(e) => setTekst(e.target.value)}
      onBlur={() => tekst.trim() !== waarde && opslaan(tekst.trim())}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function WaardeInvoer({ b, label, opslaan }) {
  const begin = toonWaarde(b);
  const [waarde, setWaarde] = useState(begin);
  useEffect(() => setWaarde(begin), [begin]);
  return (
    <input
      className={`ld-sp-cel ${b?.natura ? 'is-natura' : ''}`}
      value={waarde}
      placeholder="—"
      aria-label={label}
      onChange={(e) => setWaarde(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={async () => {
        if (waarde.trim() === begin) return;
        const r = await opslaan(waarde);
        if (r.error) setWaarde(begin);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setWaarde(begin);
          setTimeout(() => e.target.blur());
        }
      }}
    />
  );
}

function Status({ b }) {
  if (!b) return null;
  const chips = [];
  if (b.betaalwijze) chips.push([BETAALWIJZE[b.betaalwijze] + (b.factuurnr ? ` ${b.factuurnr}` : ''), '']);
  else if (b.factuurnr) chips.push([`Factuur ${b.factuurnr}`, '']);
  if (b.ontvangen) chips.push(['Ontvangen', 'is-goed']);
  else if (b.bedrag > 0) chips.push(['Open', 'is-open']);
  if (b.uitnodiging) chips.push(['Uitgenodigd', 'is-grijs']);
  if (!chips.length) return null;
  return (
    <span className="ld-chips ld-sp-status">
      {chips.map(([tekst, klas]) => (
        <em key={tekst} className={klas}>{tekst}</em>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- één sponsor

const LEEG = { naam: '', factuurnaam: '', soort: 'zakelijk', contact_via: '', benadering: '', email: '', telefoon: '', contactpersoon: '', adres: '', postcode: '', plaats: '', kvk: '', btw: '', notitie: '' };

function SponsorKaart({ sponsor, nieuwSoort, jaren, bijdragen, slaBijdrageOp, onFactuur, onSluit, onOpgeslagen }) {
  const [form, setForm] = useState(() => ({ ...LEEG, soort: nieuwSoort || 'zakelijk', ...Object.fromEntries(Object.entries(sponsor || {}).map(([k, v]) => [k, v ?? ''])) }));
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const gewijzigd = !sponsor || Object.keys(LEEG).some((k) => (form[k] || '') !== (sponsor[k] ?? ''));

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onSluit();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onSluit]);

  const veld = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  async function opslaan(e) {
    e.preventDefault();
    if (!form.naam.trim()) return;
    setBezig(true);
    const velden = Object.fromEntries(Object.keys(LEEG).map((k) => [k, form[k].trim() || null]));
    const r = await api.sponsorOpslaan({ id: sponsor?.id, ...velden, soort: form.soort });
    setBezig(false);
    if (r.error) return setFout(r.error);
    meld(sponsor ? 'Opgeslagen' : `${velden.naam} toegevoegd`);
    onOpgeslagen(r.data);
  }

  async function verwijder() {
    if (!window.confirm(`${sponsor.naam} met alle bijdragen verwijderen?`)) return;
    const r = await api.sponsorVerwijder(sponsor.id);
    if (r.error) return setFout(r.error);
    meld(`${sponsor.naam} verwijderd`);
    onOpgeslagen(null);
  }

  return (
    <div className="ld-detail" role="dialog" aria-modal="true" aria-label={sponsor?.naam || 'Nieuwe sponsor'} onClick={onSluit}>
      <article className="ld-detail-blad ld-sp-blad" onClick={(e) => e.stopPropagation()}>
        <button className="ld-detail-sluit" onClick={onSluit} aria-label="Sluiten">
          <Icoon naam="kruis" />
        </button>
        <div className="ld-detail-tekst">
          <h2 className="ld-sp-titel">{sponsor?.naam || 'Nieuwe sponsor'}</h2>

          <form className="ld-sp-form" onSubmit={opslaan}>
            <label className="ld-veld is-breed">
              <span>Naam</span>
              <input className="ld-input" maxLength={120} required autoFocus={!sponsor} {...veld('naam')} />
            </label>
            <div className="ld-segment is-breed">
              {Object.entries(SOORTEN).map(([k, v]) => (
                <button type="button" key={k} className={form.soort === k ? 'is-aan' : ''} onClick={() => setForm({ ...form, soort: k })}>
                  {v}
                </button>
              ))}
            </div>
            <label className="ld-veld">
              <span>Contact via (bende)</span>
              <input className="ld-input" {...veld('contact_via')} />
            </label>
            <label className="ld-veld">
              <span>Benaderd via</span>
              <select className="ld-input" {...veld('benadering')}>
                <option value="">—</option>
                {Object.entries(BENADERING).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="ld-veld">
              <span>E-mail</span>
              <input className="ld-input" {...veld('email')} />
            </label>
            <label className="ld-veld">
              <span>Telefoon</span>
              <input className="ld-input" type="tel" {...veld('telefoon')} />
            </label>

            {form.soort === 'zakelijk' && (
              <details className="ld-sp-factuur is-breed" open={!sponsor || !!(form.factuurnaam || form.contactpersoon || form.adres || form.kvk)}>
                <summary>Factuurgegevens</summary>
                <div className="ld-sp-form">
                  <label className="ld-veld is-breed">
                    <span>Naam op factuur</span>
                    <input className="ld-input" placeholder={form.naam} {...veld('factuurnaam')} />
                  </label>
                  <label className="ld-veld is-breed">
                    <span>Ter attentie van</span>
                    <input className="ld-input" {...veld('contactpersoon')} />
                  </label>
                  <label className="ld-veld is-breed">
                    <span>Adres</span>
                    <input className="ld-input" {...veld('adres')} />
                  </label>
                  <label className="ld-veld">
                    <span>Postcode</span>
                    <input className="ld-input" {...veld('postcode')} />
                  </label>
                  <label className="ld-veld">
                    <span>Plaats</span>
                    <input className="ld-input" {...veld('plaats')} />
                  </label>
                  <label className="ld-veld">
                    <span>KvK-nummer</span>
                    <input className="ld-input" {...veld('kvk')} />
                  </label>
                  <label className="ld-veld">
                    <span>Btw-nummer</span>
                    <input className="ld-input" {...veld('btw')} />
                  </label>
                </div>
              </details>
            )}

            <label className="ld-veld is-breed">
              <span>Notitie</span>
              <textarea className="ld-input" rows={2} {...veld('notitie')} />
            </label>
            {fout && <p className="ld-fout is-breed">{fout}</p>}
            {gewijzigd && (
              <button className="ld-knop is-breed" type="submit" disabled={bezig || !form.naam.trim()}>
                {sponsor ? 'Gegevens opslaan' : 'Sponsor toevoegen'}
              </button>
            )}
          </form>

          {sponsor && (
            <>
              <h3 className="ld-sub ld-sp-kop">Per jaar</h3>
              <ul className="ld-lijst is-scheiding">
                {[...jaren].reverse().map((j) => (
                  <JaarRegel key={j} jaar={j} b={bijdragen[j]} zakelijk={sponsor.soort === 'zakelijk'} onFactuur={() => onFactuur(j)} opslaan={(v) => slaBijdrageOp(sponsor.id, j, v)} />
                ))}
              </ul>
              <button className="ld-link is-klein is-rood ld-sp-weg" onClick={verwijder}>
                Sponsor verwijderen
              </button>
            </>
          )}
        </div>
      </article>
    </div>
  );
}

function JaarRegel({ jaar, b, zakelijk, onFactuur, opslaan }) {
  const zet = (velden) => opslaan(velden);
  const vink = (k, label) => (
    <label className="ld-schakel is-klein">
      <input type="checkbox" checked={!!b?.[k]} onChange={(e) => zet({ [k]: e.target.checked })} />
      {label}
    </label>
  );
  return (
    <li className="ld-sp-jaarregel">
      <strong>{jaar}</strong>
      <div className="ld-sp-jaarvelden">
        <label className="ld-veld">
          <span>Bedrag of natura</span>
          <WaardeInvoerVeld b={b} opslaan={(v) => zet(leesWaarde(v))} />
        </label>
        <label className="ld-veld">
          <span>Betaling</span>
          <select className="ld-input" value={b?.betaalwijze || ''} onChange={(e) => zet({ betaalwijze: e.target.value || null })}>
            <option value="">—</option>
            {Object.entries(BETAALWIJZE).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="ld-veld">
          <span>Factuurnr.</span>
          <input
            key={b?.factuurnr || ''}
            className="ld-input"
            defaultValue={b?.factuurnr || ''}
            onBlur={(e) => e.target.value.trim() !== (b?.factuurnr || '') && zet({ factuurnr: e.target.value.trim() || null })}
          />
        </label>
      </div>
      <div className="ld-sp-vinkjes">
        {vink('contact', 'Contact gehad')}
        {vink('reactie', 'Reactie')}
        {vink('ontvangen', 'Ontvangen')}
        {vink('uitnodiging', 'Uitnodiging sponsoravond')}
        {zakelijk && (
          <button className="ld-link is-klein ld-sp-factuurknop" onClick={onFactuur}>
            <Icoon naam="factuur" grootte={15} /> {b?.factuurnr ? `Factuur ${b.factuurnr}` : 'Factuur maken'}
          </button>
        )}
      </div>
    </li>
  );
}

function WaardeInvoerVeld({ b, opslaan }) {
  const begin = toonWaarde(b);
  const [waarde, setWaarde] = useState(begin);
  useEffect(() => setWaarde(begin), [begin]);
  return (
    <input
      className="ld-input"
      value={waarde}
      placeholder="bijv. 250 of Frituur"
      onChange={(e) => setWaarde(e.target.value)}
      onBlur={() => waarde.trim() !== begin && opslaan(waarde)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}
