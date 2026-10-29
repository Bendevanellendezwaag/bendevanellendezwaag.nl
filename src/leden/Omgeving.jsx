import { useCallback, useEffect, useState } from 'react';
import * as api from './api.js';
import Stemming from './Stemming.jsx';
import ThemaLijst from './ThemaLijst.jsx';
import LedenBeheer from './LedenBeheer.jsx';
import StemBeheer from './StemBeheer.jsx';

/** De ledenomgeving voor goedgekeurde leden; de beheerder krijgt er twee tabbladen bij. */
export default function Omgeving({ profiel, onSite, onProfiel }) {
  const beheerder = profiel.rol === 'beheerder';
  const [tab, setTab] = useState('stemming');
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
    if (beheerder) {
      const l = await api.alleLeden();
      if (!l.error) setWachtend(l.data.filter((x) => x.status === 'wacht').length);
    }
  }, [profiel.id, beheerder]);

  useEffect(() => {
    ververs();
    const t = setInterval(ververs, 10000);
    return () => clearInterval(t);
  }, [ververs]);

  const tabs = [
    { id: 'stemming', label: 'Stemming' },
    { id: 'themas', label: "Thema's" },
    ...(beheerder
      ? [
          { id: 'stembeheer', label: 'Beheer stemming' },
          { id: 'leden', label: 'Leden', teller: wachtend },
        ]
      : []),
  ];

  return (
    <div className="ld">
      <header className="ld-kop">
        <a
          href="/"
          className="ld-logo"
          onClick={(e) => {
            e.preventDefault();
            onSite();
          }}
        >
          <img src="/logo.png" alt="Bende van Ellende – naar de website" />
        </a>
        <Account profiel={profiel} onProfiel={onProfiel} />
      </header>

      <nav className="ld-tabs" aria-label="Ledenomgeving">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'is-aan' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {t.teller > 0 && <span className="ld-teller">{t.teller}</span>}
          </button>
        ))}
      </nav>

      <main className="ld-main">
        {fout && <p className="ld-fout">{fout}</p>}
        {!data && !fout && <p className="ld-zacht ld-midden">Even laden…</p>}
        {data && tab === 'stemming' && <Stemming data={data} ververs={ververs} />}
        {data && tab === 'themas' && <ThemaLijst themas={data.themas} />}
        {data && tab === 'stembeheer' && <StemBeheer data={data} ververs={ververs} />}
        {tab === 'leden' && <LedenBeheer mijnId={profiel.id} onWijziging={ververs} />}
      </main>
    </div>
  );
}

function Account({ profiel, onProfiel }) {
  const [open, setOpen] = useState(false);
  const [naam, setNaam] = useState(profiel.naam);

  return (
    <div className="ld-account">
      <button className="ld-account-knop" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ld-avatar">{profiel.naam.slice(0, 1).toUpperCase()}</span>
        <span className="ld-account-naam">{profiel.naam}</span>
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
              <span>Je naam</span>
              <input className="ld-input" value={naam} maxLength={60} onChange={(e) => setNaam(e.target.value)} />
            </label>
            <button className="ld-knop is-klein" type="submit">
              Naam opslaan
            </button>
          </form>
          <p className="ld-zacht ld-klein">{profiel.email}</p>
          <button className="ld-link" onClick={() => api.uitloggen()}>
            Uitloggen
          </button>
        </div>
      )}
    </div>
  );
}
