import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from './api.js';
import Icoon from './iconen.jsx';
import { luister } from './melding.js';
import Stemming from './Stemming.jsx';
import ThemaLijst from './ThemaLijst.jsx';
import LedenBeheer from './LedenBeheer.jsx';
import StemBeheer from './StemBeheer.jsx';
import Sponsoren from './Sponsoren.jsx';

const TAB_KEY = 'bve-tab';

/** De ledenomgeving: zijbalk op desktop, tabbalk onderin op de telefoon. */
export default function Omgeving({ profiel, onSite, onProfiel }) {
  const echteBeheerder = profiel.rol === 'beheerder';
  // De beheerder kan de omgeving bekijken zoals een gewoon lid hem ziet.
  const [alsLid, setAlsLid] = useState(false);
  const beheerder = echteBeheerder && !alsLid;
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem(TAB_KEY) || 'stemming';
    } catch {
      return 'stemming';
    }
  });
  const [data, setData] = useState(null);
  const [fout, setFout] = useState(null);
  const [wachtend, setWachtend] = useState(0);

  const ververs = useCallback(async () => {
    const [t, r, d, m] = await Promise.all([
      api.themas(),
      api.rondes(),
      api.deelname(),
      api.mijnStemmen(profiel.id),
    ]);
    const mis = [t, r, d, m].find((x) => x.error);
    if (mis) {
      setFout(mis.error);
      return;
    }
    setFout(null);
    setData({
      themas: t.data,
      rondes: r.data,
      deelname: d.data,
      mijnStemmen: Object.fromEntries(m.data.map((s) => [s.ronde, s.keuze])),
    });
    if (echteBeheerder) {
      const l = await api.alleLeden();
      if (!l.error) setWachtend(l.data.filter((x) => x.status === 'wacht').length);
    }
  }, [profiel.id, echteBeheerder]);

  useEffect(() => {
    ververs();
    const t = setInterval(ververs, 10000);
    // Terug naar het tabblad = meteen bijwerken.
    const zicht = () => document.visibilityState === 'visible' && ververs();
    document.addEventListener('visibilitychange', zicht);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', zicht);
    };
  }, [ververs]);

  const tabs = [
    { id: 'stemming', label: 'Stemming', icoon: 'stemming' },
    { id: 'themas', label: "Thema's", icoon: 'themas' },
    ...(beheerder
      ? [
          { id: 'stembeheer', label: 'Beheer', icoon: 'beheer' },
          { id: 'leden', label: 'Leden', icoon: 'leden', teller: wachtend },
          { id: 'sponsoren', label: 'Sponsoren', icoon: 'sponsor' },
        ]
      : []),
  ];
  const actief = tabs.some((t) => t.id === tab) ? tab : 'stemming';

  function kies(id) {
    setTab(id);
    window.scrollTo(0, 0);
    try {
      sessionStorage.setItem(TAB_KEY, id);
    } catch {
      /* geen opslag: dan maar niet onthouden */
    }
  }

  const navKnoppen = tabs.map((t) => (
    <button
      key={t.id}
      className={`ld-nav-knop ${actief === t.id ? 'is-aan' : ''}`}
      onClick={() => kies(t.id)}
      aria-current={actief === t.id ? 'page' : undefined}
    >
      <Icoon naam={t.icoon} />
      <span>{t.label}</span>
      {t.teller > 0 && <em className="ld-teller">{t.teller}</em>}
    </button>
  ));

  return (
    <div className="ld-app">
      <aside className="ld-zij">
        <a
          href="/"
          className="ld-zij-logo"
          onClick={(e) => {
            e.preventDefault();
            onSite();
          }}
        >
          <img src="/logo.svg" alt="Bende van Ellende – naar de website" />
        </a>
        <nav className="ld-zij-nav" aria-label="Ledenomgeving">
          {navKnoppen}
        </nav>
        <Account profiel={profiel} onProfiel={onProfiel} onSite={onSite} alsLid={echteBeheerder ? [alsLid, setAlsLid] : null} />
      </aside>

      <header className="ld-top">
        <img src="/logo.svg" alt="Bende van Ellende" className="ld-top-logo" />
        <Account profiel={profiel} onProfiel={onProfiel} onSite={onSite} alsLid={echteBeheerder ? [alsLid, setAlsLid] : null} compact />
      </header>

      {/* Sponsoring is een groot overzicht: dat krijgt de volle breedte. */}
      <main className={`ld-inhoud ${actief === 'sponsoren' ? 'is-breed' : ''}`}>
        {alsLid && (
          <div className="ld-alslid">
            <span>Je bekijkt de ledenversie</span>
            <button onClick={() => setAlsLid(false)}>Terug naar beheer</button>
          </div>
        )}
        {fout && <p className="ld-fout">{fout}</p>}
        {!data && !fout && <Laden />}
        {data && actief === 'stemming' && <Stemming data={data} ververs={ververs} />}
        {data && actief === 'themas' && <ThemaLijst themas={data.themas} />}
        {data && actief === 'stembeheer' && <StemBeheer data={data} ververs={ververs} />}
        {actief === 'sponsoren' && <Sponsoren />}
        {actief === 'leden' && <LedenBeheer mijnId={profiel.id} onWijziging={ververs} />}
      </main>

      <nav className="ld-onderbalk" aria-label="Ledenomgeving">
        {navKnoppen}
      </nav>

      <Meldingen />
    </div>
  );
}

function Laden() {
  return (
    <div className="ld-skelet" aria-label="Laden">
      <span />
      <span />
      <span />
    </div>
  );
}

function Account({ profiel, onProfiel, onSite, alsLid, compact }) {
  const [open, setOpen] = useState(false);
  const [naam, setNaam] = useState(profiel.naam);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const buiten = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', buiten);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', buiten);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className={`ld-account ${compact ? 'is-compact' : ''}`} ref={ref}>
      <button className="ld-account-knop" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ld-avatar">{profiel.naam.slice(0, 1).toUpperCase()}</span>
        {!compact && (
          <span className="ld-account-tekst">
            <strong>{profiel.naam}</strong>
            <small>{profiel.rol !== 'beheerder' ? 'Lid' : alsLid?.[0] ? 'Bekijkt als lid' : 'Beheerder'}</small>
          </span>
        )}
      </button>
      {open && (
        <div className="ld-account-menu">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!naam.trim()) return;
              await api.mijnNaam(naam.trim());
              onProfiel();
              setOpen(false);
            }}
          >
            <label className="ld-veld">
              <span>Naam</span>
              <input className="ld-input" value={naam} maxLength={60} onChange={(e) => setNaam(e.target.value)} />
            </label>
            {naam.trim() !== profiel.naam && (
              <button className="ld-knop is-klein" type="submit">
                Opslaan
              </button>
            )}
          </form>
          <p className="ld-klein ld-zacht">{profiel.email}</p>
          {alsLid && (
            <button
              className="ld-menu-regel"
              onClick={() => {
                alsLid[1](!alsLid[0]);
                setOpen(false);
              }}
            >
              <Icoon naam={alsLid[0] ? 'beheer' : 'leden'} grootte={18} /> {alsLid[0] ? 'Terug naar beheer' : 'Bekijk als lid'}
            </button>
          )}
          <button className="ld-menu-regel" onClick={onSite}>
            <Icoon naam="site" grootte={18} /> Naar de website
          </button>
          <button className="ld-menu-regel" onClick={() => api.uitloggen()}>
            <Icoon naam="uit" grootte={18} /> Uitloggen
          </button>
        </div>
      )}
    </div>
  );
}

function Meldingen() {
  const [lijst, setLijst] = useState([]);
  useEffect(
    () =>
      luister((m) => {
        setLijst((l) => [...l, m]);
        setTimeout(() => setLijst((l) => l.filter((x) => x.id !== m.id)), 2600);
      }),
    [],
  );
  return (
    <div className="ld-meldingen" aria-live="polite">
      {lijst.map((m) => (
        <div key={m.id} className={`ld-melding is-${m.soort}`}>
          {m.soort === 'goed' && <Icoon naam="vink" grootte={18} />}
          {m.tekst}
        </div>
      ))}
    </div>
  );
}
