import { useCallback, useEffect, useState } from 'react';
import { cloudEnabled, supabase } from '../lib/supabase.js';
import * as api from './api.js';
import Icoon from './iconen.jsx';
import Inloggen, { NieuwWachtwoord } from './Inloggen.jsx';
import Omgeving from './Omgeving.jsx';
import './leden.css';

/**
 * Toegang tot de ledenomgeving: niet ingelogd -> inloggen/registreren,
 * ingelogd maar nog niet goedgekeurd -> wachten, goedgekeurd -> omgeving.
 */
export default function Leden({ onSite }) {
  const [sessie, setSessie] = useState(undefined); // undefined = nog aan het laden
  const [herstel, setHerstel] = useState(false);
  const [profiel, setProfiel] = useState(undefined);
  const [fout, setFout] = useState(null);

  useEffect(() => {
    if (!cloudEnabled) return undefined;
    supabase.auth.getSession().then(({ data }) => setSessie(data.session));
    const { data } = supabase.auth.onAuthStateChange((gebeurtenis, s) => {
      if (gebeurtenis === 'PASSWORD_RECOVERY') setHerstel(true);
      setSessie(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const laadProfiel = useCallback(async () => {
    if (!sessie) {
      setProfiel(null);
      return;
    }
    const r = await api.mijnProfiel(sessie.user.id);
    if (r.error) setFout(r.error);
    else {
      setFout(null);
      setProfiel(r.data);
    }
  }, [sessie]);

  useEffect(() => {
    laadProfiel();
  }, [laadProfiel]);

  // Wie op goedkeuring wacht, komt vanzelf binnen zodra het zover is.
  useEffect(() => {
    if (profiel?.status !== 'wacht') return undefined;
    const t = setInterval(laadProfiel, 15000);
    return () => clearInterval(t);
  }, [profiel?.status, laadProfiel]);

  if (sessie && profiel?.status === 'goedgekeurd' && !herstel) {
    return <Omgeving profiel={profiel} onSite={onSite} onProfiel={laadProfiel} />;
  }

  let inhoud;
  if (!cloudEnabled) inhoud = <Melding titel="Geen verbinding" />;
  else if (sessie === undefined || (sessie && profiel === undefined)) inhoud = <p className="ld-zacht">Even laden…</p>;
  else if (herstel && sessie) inhoud = <NieuwWachtwoord klaar={() => setHerstel(false)} />;
  else if (!sessie) inhoud = <Inloggen />;
  else if (fout) inhoud = <Melding titel="Er ging iets mis">{fout}</Melding>;
  else if (!profiel) inhoud = <p className="ld-zacht">Je account wordt klaargezet…</p>;
  else if (profiel.status === 'wacht')
    inhoud = (
      <Melding titel={`Hoi ${profiel.naam.split(' ')[0]}!`} uitloggen>
        Je account wacht op goedkeuring.
      </Melding>
    );
  else
    inhoud = (
      <Melding titel="Geen toegang" uitloggen>
        Dit account heeft geen toegang tot de ledenomgeving.
      </Melding>
    );

  return (
    <div className="ld-login">
      <section className="ld-login-beeld">
        <a
          href="/"
          className="ld-login-terug"
          onClick={(e) => {
            e.preventDefault();
            onSite();
          }}
        >
          <Icoon naam="links" grootte={18} /> Website
        </a>
        <img className="ld-login-logo" src="/logo.svg" alt="Bende van Ellende" />
      </section>
      <section className="ld-login-vak">
        <div className="ld-login-form">{inhoud}</div>
      </section>
    </div>
  );
}

function Melding({ titel, children, uitloggen }) {
  return (
    <div className="ld-login-melding">
      <h1 className="ld-login-titel">{titel}</h1>
      {children && <p className="ld-zacht">{children}</p>}
      {uitloggen && (
        <button className="ld-knop is-rand" onClick={() => api.uitloggen()}>
          Uitloggen
        </button>
      )}
    </div>
  );
}
