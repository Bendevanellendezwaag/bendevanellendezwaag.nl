import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from './api.js';
import Icoon from './iconen.jsx';
import { meld } from './melding.js';
import { Leeg, Paginakop } from './onderdelen.jsx';
import Factuur from './Factuur.jsx';

const BEELD_KEY = 'bve-sponsorweergave';
const SOORTEN = { zakelijk: 'Zakelijk', familie: 'Familie & vrienden' };
const BENADERING = { fysiek: 'Langs geweest', mail: 'Mail', app: 'App' };
const BETAALWIJZE = { factuur: 'Factuur', tikkie: 'Tikkie', contant: 'Contant' };
const WEERGAVE = { alle: 'Alle', mee: 'Doen mee', benaderen: 'Nog benaderen', geen: 'Niet dit jaar' };

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
const toonWaarde = (b) => (!b ? '' : b.natura ? b.natura : b.bedrag != null ? String(b.bedrag).replace('.', ',') : '');
// Namen als ’t Valkje sorteren op de V, niet bovenaan.
const sorteerNaam = (n) => n.replace(/^[^a-z0-9]*(t\s)?/i, '');
const naamVolgorde = (a, b) => sorteerNaam(a).localeCompare(sorteerNaam(b), 'nl', { sensitivity: 'base' });
const doetMee = (b) => !!b && (b.bedrag > 0 || !!b.natura);

/** Beheerder: alle sponsoren met hun bijdrage per jaar. */
export default function Sponsoren() {
  const [data, setData] = useState(null);
  const [fout, setFout] = useState(null);
  const [jaar, setJaar] = useState(null);
  const [soort, setSoort] = useState('alle');
  const [weergave, setWeergave] = useState('alle');
  const [zoek, setZoek] = useState('');
  const [open, setOpen] = useState(null); // sponsor-id, of 'nieuw'
  const [sorteer, setSorteer] = useState(null); // null = op naam, anders een jaar (hoogste bedrag eerst)
  const [factuur, setFactuur] = useState(null); // { sponsor, jaar } of { jaar } voor het lege sjabloon
  const [beeld, setBeeld] = useState(() => {
    try {
      return localStorage.getItem(BEELD_KEY) || 'tegels';
    } catch {
      return 'tegels';
    }
  });
  const kiesBeeld = (b) => {
    setBeeld(b);
    try {
      localStorage.setItem(BEELD_KEY, b);
    } catch {
      /* niet onthouden */
    }
  };

  const laad = useCallback(async () => {
    const [s, b, j] = await Promise.all([api.sponsoren(), api.sponsorbijdragen(), api.sponsorjaren()]);
    const mis = [s, b, j].find((x) => x.error);
    if (mis) return setFout(mis.error);
    setFout(null);
    setData({ sponsoren: s.data, bijdragen: b.data, jaren: j.data });
  }, []);

  useEffect(() => {
    laad();
  }, [laad]);

  const jaren = data?.jaren.map((j) => j.jaar) || [];
  const gekozen = jaar ?? jaren[jaren.length - 1];

  // bijdrage[sponsorId][jaar]
  const bijdrage = useMemo(() => {
    const m = {};
    data?.bijdragen.forEach((b) => ((m[b.sponsor] ||= {})[b.jaar] = b));
    return m;
  }, [data]);

  const totalen = useMemo(() => {
    const t = {};
    data?.jaren.forEach((j) => (t[j.jaar] = { zakelijk: 0, familie: 0, inleg: Number(j.eigen_inleg) || 0, aantal: 0, natura: 0, ontvangen: 0 }));
    const soortVan = Object.fromEntries((data?.sponsoren || []).map((s) => [s.id, s.soort]));
    data?.bijdragen.forEach((b) => {
      const r = t[b.jaar];
      if (!r || !soortVan[b.sponsor]) return;
      r[soortVan[b.sponsor]] += Number(b.bedrag) || 0;
      if (doetMee(b)) r.aantal += 1;
      if (b.natura) r.natura += 1;
      if (b.ontvangen) r.ontvangen += Number(b.bedrag) || 0;
    });
    return t;
  }, [data]);

  if (!data) return fout ? <p className="ld-fout">{fout}</p> : null;

  const vorigJaar = jaren[jaren.indexOf(gekozen) - 1];
  const lijst = data.sponsoren.filter((s) => {
    if (soort !== 'alle' && s.soort !== soort) return false;
    if (zoek && !`${s.naam} ${s.factuurnaam || ''} ${s.contactpersoon || ''} ${s.plaats || ''} ${s.contact_via || ''} ${s.email || ''}`.toLowerCase().includes(zoek.toLowerCase())) return false;
    const nu = bijdrage[s.id]?.[gekozen];
    if (weergave === 'mee') return doetMee(nu);
    if (weergave === 'geen') return nu?.bedrag === 0 && !nu.natura;
    // Nog benaderen: deed vorig jaar mee, maar voor dit jaar is er nog niets bekend.
    if (weergave === 'benaderen') return doetMee(bijdrage[s.id]?.[vorigJaar]) && !doetMee(nu) && nu?.bedrag !== 0;
    return true;
  });
  const bedragIn = (s, j) => (bijdrage[s.id]?.[j]?.natura ? 0.5 : Number(bijdrage[s.id]?.[j]?.bedrag) || 0);
  lijst.sort((a, b) => (sorteer && bedragIn(b, sorteer) - bedragIn(a, sorteer)) || naamVolgorde(a.naam, b.naam));
  const t = totalen[gekozen];
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

  async function inlegOpslaan(waarde) {
    const { bedrag } = leesWaarde(waarde);
    const r = await api.jaarBijwerken(gekozen, { eigen_inleg: bedrag });
    if (r.error) meld(r.error, 'fout');
    else meld('Eigen inleg opgeslagen');
    laad();
  }

  return (
    <>
      <Paginakop titel="Sponsoren" sub={`${t.aantal} sponsoren in ${gekozen} · ${euro(t.zakelijk + t.familie)}`}>
        <span className="ld-sp-kopknoppen">
          <button className="ld-knop is-klein is-rand" onClick={() => setFactuur({ jaar: gekozen })}>
            <Icoon naam="factuur" grootte={16} /> Factuursjabloon
          </button>
          <button className="ld-knop is-klein" onClick={() => setOpen('nieuw')}>
            <Icoon naam="plus" grootte={16} /> Nieuwe sponsor
          </button>
        </span>
      </Paginakop>
      {fout && <p className="ld-fout">{fout}</p>}

      <section className="ld-kaart">
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
        <div className="ld-sp-legenda">
          <span><i className="is-zakelijk" /> Zakelijk</span>
          <span><i className="is-familie" /> Familie & vrienden</span>
          <span><i className="is-inleg" /> Eigen inleg</span>
        </div>
      </section>

      <div className="ld-sp-tegels">
        <Tegel label="Zakelijk" waarde={euro(t.zakelijk)} vorig={totalen[vorigJaar]?.zakelijk} nu={t.zakelijk} />
        <Tegel label="Familie & vrienden" waarde={euro(t.familie)} vorig={totalen[vorigJaar]?.familie} nu={t.familie} />
        <div className="ld-sp-tegel">
          <span>Eigen inleg</span>
          <input
            key={`${gekozen}-${t.inleg}`}
            className="ld-sp-inleg"
            defaultValue={t.inleg ? euro(t.inleg) : ''}
            placeholder="€ 0"
            inputMode="decimal"
            aria-label={`Eigen inleg ${gekozen}`}
            onBlur={(e) => Number(leesWaarde(e.target.value).bedrag || 0) !== t.inleg && inlegOpslaan(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>
        <Tegel label="Totaal" waarde={euro(t.zakelijk + t.familie + t.inleg)} sterk />
      </div>
      <p className="ld-sp-extra">
        {t.natura > 0 && `${t.natura} in natura · `}
        {euro(t.ontvangen)} ontvangen van {euro(t.zakelijk + t.familie)}
      </p>

      <section className="ld-kaart">
        <div className="ld-sp-filters">
          <div className="ld-segment ld-sp-beeld" role="tablist" aria-label="Weergave">
            {[['tegels', 'Tegels'], ['tabel', 'Tabel']].map(([k, v]) => (
              <button key={k} role="tab" aria-selected={beeld === k} className={beeld === k ? 'is-aan' : ''} onClick={() => kiesBeeld(k)}>
                {v}
              </button>
            ))}
          </div>
          <input className="ld-input" type="search" placeholder="Zoek op naam, contactpersoon, plaats…" value={zoek} onChange={(e) => setZoek(e.target.value)} />
          <select className="ld-input" value={soort} onChange={(e) => setSoort(e.target.value)} aria-label="Soort">
            <option value="alle">Iedereen</option>
            {Object.entries(SOORTEN).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select className="ld-input" value={weergave} onChange={(e) => setWeergave(e.target.value)} aria-label="Weergave">
            {Object.entries(WEERGAVE).map(([k, v]) => (
              <option key={k} value={k}>{v} {k !== 'alle' && gekozen}</option>
            ))}
          </select>
        </div>

        {beeld === 'tegels' ? (
          <ul className="ld-sp-kaarten">
            {lijst.map((s) => (
              <SponsorTegel key={s.id} sponsor={s} bijdragen={bijdrage[s.id] || {}} jaren={jaren} gekozen={gekozen} onOpen={() => setOpen(s.id)} />
            ))}
            <li>
              <button className="ld-sp-kaartje is-nieuw" onClick={() => setOpen('nieuw')}>
                <Icoon naam="plus" grootte={28} />
                Nieuwe sponsor
              </button>
            </li>
          </ul>
        ) : lijst.length === 0 ? (
          <Leeg titel="Geen sponsoren gevonden" />
        ) : (
          <div className="ld-sp-scroll">
            <table className="ld-sp-tabel">
              <thead>
                <tr>
                  <th>
                    <button className="ld-sp-sorteer" onClick={() => setSorteer(null)} aria-pressed={!sorteer}>
                      Sponsor
                    </button>
                  </th>
                  {jaren.map((j) => (
                    <th key={j} className={`is-getal ${j === gekozen ? 'is-gekozen' : ''}`}>
                      <button className="ld-sp-sorteer" onClick={() => setSorteer(sorteer === j ? null : j)} aria-pressed={sorteer === j}>
                        {j}
                        {sorteer === j && <Icoon naam="neer" grootte={12} />}
                      </button>
                    </th>
                  ))}
                  <th>Status {gekozen}</th>
                </tr>
              </thead>
              <tbody>
                {lijst.map((s) => (
                  <tr key={s.id}>
                    <th>
                      <button className="ld-sp-naam" onClick={() => setOpen(s.id)}>
                        {s.naam}
                        <small>
                          {[s.soort === 'familie' ? 'Familie' : null, s.contact_via && `via ${s.contact_via}`].filter(Boolean).join(' · ') || ' '}
                        </small>
                      </button>
                    </th>
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
                    <td>
                      <Status b={bijdrage[s.id]?.[gekozen]} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Totaal ({lijst.length})</th>
                  {jaren.map((j) => (
                    <td key={j} className={`is-getal ${j === gekozen ? 'is-gekozen' : ''}`}>
                      {euro(lijst.reduce((som, s) => som + (Number(bijdrage[s.id]?.[j]?.bedrag) || 0), 0))}
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {open && (
        <SponsorKaart
          sponsor={sponsorOpen}
          jaren={jaren}
          bijdragen={sponsorOpen ? bijdrage[sponsorOpen.id] || {} : {}}
          slaBijdrageOp={slaBijdrageOp}
          onFactuur={(j) => setFactuur({ sponsor: sponsorOpen, jaar: j })}
          onSluit={() => setOpen(null)}
          onOpgeslagen={(s) => {
            setOpen(s?.id || null);
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

function Tegel({ label, waarde, vorig, nu, sterk }) {
  const verschil = vorig != null && nu != null ? nu - vorig : null;
  return (
    <div className={`ld-sp-tegel ${sterk ? 'is-sterk' : ''}`}>
      <span>{label}</span>
      <strong>{waarde}</strong>
      {nu === 0 && vorig > 0 && <small>vorig jaar {euro(vorig)}</small>}
      {nu > 0 && verschil !== 0 && vorig > 0 && (
        <small className={verschil > 0 ? 'is-op' : 'is-neer'}>
          {verschil > 0 ? '+' : '−'}
          {euro(Math.abs(verschil))} t.o.v. vorig jaar
        </small>
      )}
    </div>
  );
}

function Waarde({ b }) {
  if (!b || (b.bedrag == null && !b.natura)) return <span className="ld-zacht">·</span>;
  if (b.natura) return <em className="ld-sp-natura">{b.natura}</em>;
  if (Number(b.bedrag) === 0) return <span className="ld-zacht">€ 0</span>;
  return euro(b.bedrag);
}

// Bedrag of natura direct in de tabel invullen; opslaan bij verlaten van het veld.
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

function SponsorKaart({ sponsor, jaren, bijdragen, slaBijdrageOp, onFactuur, onSluit, onOpgeslagen }) {
  const [form, setForm] = useState(() => ({ ...LEEG, ...Object.fromEntries(Object.entries(sponsor || {}).map(([k, v]) => [k, v ?? ''])) }));
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
