import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as api from './api.js';
import Icoon from './iconen.jsx';
import { meld } from './melding.js';

// Teksten voor als de instellingen nog leeg zijn (zelfde als in sponsoren.sql).
const STANDAARD = {
  iban: '',
  tnv: '',
  email: '',
  intro: 'Uw bijdrage is enorm waardevol voor ons, wij zetten dit jaar weer alles op alles om u te verbazen. Tot ziens bij de sponsoravond of de optocht!',
  omschrijving: 'Gelieve factuurnummer en bedrijfsnaam vermelden in de omschrijving',
  slot: 'Bedankt voor uw bijdrage namens de hele groep',
  afbeelding: '',
  afbeelding_tekst: 'Bouwtekening carnaval {jaar}',
  volg: 'Blijf op de hoogte van het bouwproces via onze Instagram en Facebook!',
};

const vandaag = () => new Date().toISOString().slice(0, 10);
const datumNl = (iso) => (iso ? iso.split('-').reverse().join('-') : '');
const beeldUrl = (pad) => (!pad ? '' : /^(https?:)?\//.test(pad) ? pad : api.fotoUrl(pad));

/**
 * Factuur als A4 op het scherm: alles is aan te klikken en aan te passen voor je
 * hem afdrukt of als PDF bewaart. Zonder sponsor is het een leeg sjabloon.
 */
export default function Factuur({ sponsor, jaar, bijdrage, volgendNummer, vastleggen, onSluit }) {
  const [inst, setInst] = useState(null);
  const [instOpen, setInstOpen] = useState(false);
  const [nummer, setNummer] = useState(bijdrage?.factuurnr || (sponsor ? volgendNummer : ''));
  const [datum, setDatum] = useState(bijdrage?.factuurdatum || vandaag());
  const [bedrag, setBedrag] = useState(bijdrage?.bedrag > 0 ? String(Number(bijdrage.bedrag)) : '');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    api.factuurinstellingen().then((r) => {
      if (r.error) meld(r.error, 'fout');
      setInst({ ...STANDAARD, ...Object.fromEntries(Object.entries(r.data || {}).filter(([, v]) => v != null)) });
    });
  }, []);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onSluit();
    document.addEventListener('keydown', esc);
    document.body.classList.add('fa-open');
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('fa-open');
    };
  }, [onSluit]);

  // Het A4-blad past zich op het scherm aan de breedte aan; afdrukken gaat altijd op ware grootte.
  useLayoutEffect(() => {
    const pas = () => setZoom(Math.min(1, (window.innerWidth - 24) / 794));
    pas();
    window.addEventListener('resize', pas);
    return () => window.removeEventListener('resize', pas);
  }, []);

  function afdrukken() {
    const titel = document.title;
    document.title = `Factuur #${nummer || '____'} - ${sponsor?.naam || 'sjabloon'}`;
    window.print();
    document.title = titel;
  }

  async function legVast() {
    const r = await vastleggen({
      factuurnr: nummer.trim() || null,
      factuurdatum: datum || null,
      betaalwijze: 'factuur',
      ...(Number(bedrag) > 0 ? { bedrag: Number(bedrag), natura: null } : {}),
    });
    if (!r.error) meld(`Factuur ${nummer} vastgelegd bij ${jaar}`);
  }

  const naam = sponsor ? sponsor.factuurnaam || sponsor.naam : '';
  const postPlaats = [sponsor?.postcode, sponsor?.plaats].filter(Boolean).join(' ');
  const opgeslagen =
    !!bijdrage && bijdrage.factuurnr === (nummer.trim() || null) && (bijdrage.factuurdatum || '') === datum && (!(Number(bedrag) > 0) || Number(bijdrage.bedrag) === Number(bedrag));

  return createPortal(
    <div className="fa-laag" role="dialog" aria-modal="true" aria-label="Factuur">
      <div className="fa-balk">
        <button className="fa-balk-knop" onClick={onSluit} aria-label="Sluiten">
          <Icoon naam="kruis" />
        </button>
        <strong>{sponsor ? `Factuur ${sponsor.naam}` : `Factuursjabloon ${jaar}`}</strong>
        <span className="fa-balk-rechts">
          <button className="fa-balk-knop is-tekst" onClick={() => setInstOpen((o) => !o)} aria-expanded={instOpen}>
            <Icoon naam="beheer" grootte={18} /> <span>Vaste gegevens</span>
          </button>
          {vastleggen && (
            <button className="fa-balk-knop is-tekst" onClick={legVast} disabled={opgeslagen || !nummer.trim()}>
              <Icoon naam="vink" grootte={18} /> <span>{opgeslagen ? 'Vastgelegd' : `Vastleggen bij ${jaar}`}</span>
            </button>
          )}
          <button className="fa-balk-knop is-hoofd" onClick={afdrukken}>
            <Icoon naam="printer" grootte={18} /> <span>Afdrukken / PDF</span>
          </button>
        </span>
      </div>

      {instOpen && inst && <Instellingen inst={inst} onOpgeslagen={setInst} />}

      <div className="fa-scroll">
        {!inst ? null : (
          <article className="fa-pagina" style={{ zoom }}>
            <header className="fa-kop">
              <img src="/logo.svg" alt="Bende van Ellende" />
              <div>
                <h1>Factuur</h1>
                <p>Bende van Ellende · Carnaval {jaar}</p>
              </div>
            </header>

            <section className="fa-adressen">
              <div className="fa-aan">
                <small>Aan</small>
                <Tekst waarde={naam} leeg="Bedrijfsnaam" sterk />
                <Tekst waarde={sponsor?.contactpersoon ? `T.a.v. ${sponsor.contactpersoon}` : ''} leeg="T.a.v. contactpersoon" />
                <Tekst waarde={sponsor?.adres || ''} leeg="Straat en huisnummer" />
                <Tekst waarde={postPlaats} leeg="Postcode Plaats" />
              </div>
              <dl className="fa-gegevens">
                <dt>Factuurnummer</dt>
                <dd>
                  #<input className="fa-invoer is-nummer" value={nummer} placeholder={volgendNummer} onChange={(e) => setNummer(e.target.value)} aria-label="Factuurnummer" />
                </dd>
                <dt>Datum</dt>
                <dd>
                  <input className="fa-invoer is-scherm" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} aria-label="Factuurdatum" />
                  <span className="is-print">{datumNl(datum)}</span>
                </dd>
              </dl>
            </section>

            <Tekst className="fa-intro" waarde={inst.intro} blok />

            <table className="fa-regels">
              <thead>
                <tr>
                  <th>Omschrijving</th>
                  <th>Bedrag</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Tekst waarde={`Sponsorbijdrage carnaval ${jaar}`} />
                  </td>
                  <td className="fa-bedrag">
                    € <input className="fa-invoer is-bedrag" value={bedrag} placeholder="0" inputMode="decimal" onChange={(e) => setBedrag(e.target.value.replace(',', '.'))} aria-label="Sponsorbedrag" />
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th>Totaal</th>
                  <td className="fa-bedrag">€ {Number(bedrag) > 0 ? Number(bedrag).toLocaleString('nl-NL', { minimumFractionDigits: 2 }) : '—'}</td>
                </tr>
              </tfoot>
            </table>

            <section className="fa-betalen">
              <div>
                <small>Graag overmaken naar</small>
                <Tekst waarde={inst.iban} leeg="IBAN" sterk />
                <Tekst waarde={inst.tnv ? `T.a.v. ${inst.tnv}` : ''} leeg="T.a.v. rekeninghouder" />
              </div>
              <Tekst className="fa-omschrijving" waarde={inst.omschrijving} blok />
            </section>

            <Tekst className="fa-slot" waarde={inst.slot} blok />

            <figure className="fa-beeld">
              {inst.afbeelding ? <img src={beeldUrl(inst.afbeelding)} alt="" /> : <div className="fa-beeld-leeg">Bouwtekening {jaar} volgt</div>}
              <figcaption>
                <Tekst waarde={(inst.afbeelding_tekst || '').replace('{jaar}', jaar)} />
              </figcaption>
            </figure>

            <footer className="fa-voet">
              <Tekst waarde={inst.volg} blok />
              <span>{[inst.email, '@bendevanellendezwaag'].filter(Boolean).join(' · ')}</span>
            </footer>
          </article>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Losse tekst op de factuur: aanklikken en typen past hem alleen voor deze afdruk aan.
function Tekst({ waarde, leeg, sterk, blok, className = '' }) {
  const El = blok ? 'p' : 'span';
  return (
    <El
      key={waarde}
      className={`fa-tekst ${sterk ? 'is-sterk' : ''} ${className}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-leeg={leeg || ''}
    >
      {waarde}
    </El>
  );
}

const VELDEN = [
  ['iban', 'Rekeningnummer (IBAN)'],
  ['tnv', 'Ten name van'],
  ['email', 'E-mailadres'],
  ['intro', 'Openingstekst', true],
  ['omschrijving', 'Betaalinstructie', true],
  ['slot', 'Afsluiting'],
  ['afbeelding_tekst', 'Onderschrift afbeelding ({jaar} = het jaar)'],
  ['volg', 'Tekst onderaan', true],
];

// Vaste gegevens die op elke factuur staan; opgeslagen in de database, niet in de code.
function Instellingen({ inst, onOpgeslagen }) {
  const [form, setForm] = useState(inst);
  const [bezig, setBezig] = useState(false);

  async function opslaan(e) {
    e.preventDefault();
    setBezig(true);
    const velden = Object.fromEntries(Object.keys(STANDAARD).map((k) => [k, (form[k] || '').trim() || null]));
    const r = await api.factuurinstellingenOpslaan(velden);
    setBezig(false);
    if (r.error) return meld(r.error, 'fout');
    meld('Vaste gegevens opgeslagen');
    onOpgeslagen({ ...STANDAARD, ...form });
  }

  async function upload(e) {
    const bestand = e.target.files?.[0];
    e.target.value = '';
    if (!bestand) return;
    setBezig(true);
    const r = await api.fotoUploaden(bestand);
    setBezig(false);
    if (r.error) return meld(r.error, 'fout');
    setForm((f) => ({ ...f, afbeelding: r.data }));
  }

  return (
    <form className="fa-instellingen" onSubmit={opslaan}>
      {VELDEN.map(([k, label, lang]) => (
        <label key={k} className={`ld-veld ${lang ? 'is-breed' : ''}`}>
          <span>{label}</span>
          {lang ? (
            <textarea className="ld-input" rows={2} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          ) : (
            <input className="ld-input" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
          )}
        </label>
      ))}
      <div className="ld-veld is-breed">
        <span>Afbeelding (bouwtekening)</span>
        <div className="fa-inst-beeld">
          {form.afbeelding && <img src={beeldUrl(form.afbeelding)} alt="" />}
          <label className="ld-knop is-klein is-rand">
            <Icoon naam="foto" grootte={16} /> {form.afbeelding ? 'Andere kiezen' : 'Kiezen'}
            <input type="file" accept="image/*" hidden onChange={upload} />
          </label>
          {form.afbeelding && (
            <button type="button" className="ld-link is-klein is-rood" onClick={() => setForm({ ...form, afbeelding: '' })}>
              Weghalen
            </button>
          )}
        </div>
      </div>
      <button className="ld-knop is-klein is-breed" type="submit" disabled={bezig}>
        Opslaan
      </button>
    </form>
  );
}
