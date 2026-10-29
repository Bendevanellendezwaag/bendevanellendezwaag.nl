import { useCallback, useEffect, useState } from 'react';
import { cloudEnabled, supabase } from '../lib/supabase.js';
import * as api from './api.js';
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
  const [profiel, setProfiel] = useState(null);
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

  // Wie op goedkeuring wacht, ziet het vanzelf zodra het zover is.
  useEffect(() => {
    if (profiel?.status !== 'wacht') return undefined;
    const t = setInterval(laadProfiel, 15000);
    return () => clearInterval(t);
  }, [profiel?.status, laadProfiel]);

  let inhoud;
  if (!cloudEnabled) inhoud = <Melding titel="Geen verbinding">De database is niet ingesteld.</Melding>;
  else if (sessie === undefined) inhoud = <p className="ld-zacht ld-midden">Even laden…</p>;
  else if (herstel && sessie) inhoud = <NieuwWachtwoord klaar={() => setHerstel(false)} />;
  else if (!sessie) inhoud = <Inloggen />;
  else if (fout) inhoud = <Melding titel="Er ging iets mis">{fout}</Melding>;
  else if (!profiel) inhoud = <p className="ld-zacht ld-midden">Je account wordt klaargezet…</p>;
  else if (profiel.status === 'wacht')
    inhoud = (
      <Melding titel={`Welkom, ${profiel.naam}!`}>
        Je account is aangemaakt. Zodra de beheerder je heeft goedgekeurd, kom je hier in de
        ledenomgeving. Je hoeft deze pagina niet te verversen.
      </Melding>
    );
  else if (profiel.status === 'afgewezen')
    inhoud = (
      <Melding titel="Geen toegang">
        Je account is niet goedgekeurd voor de ledenomgeving. Denk je dat dit niet klopt? Neem dan
        contact op met de beheerder.
      </Melding>
    );
  else return <Omgeving profiel={profiel} onSite={onSite} onProfiel={laadProfiel} />;

  return (
    <div className="ld">
      <header className="ld-kop is-los">
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
        {sessie && (
          <button className="ld-link" onClick={() => api.uitloggen()}>
            Uitloggen
          </button>
        )}
      </header>
      <main className="ld-main is-smal">{inhoud}</main>
    </div>
  );
}

function Melding({ titel, children }) {
  return (
    <div className="ld-kaart ld-midden">
      <h1 className="ld-titel">{titel}</h1>
      <p className="ld-zacht">{children}</p>
    </div>
  );
}
