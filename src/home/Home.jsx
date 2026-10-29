import { useCallback, useEffect, useState } from 'react';
import Kop from './Kop.jsx';
import { Intro } from './Logo.jsx';
import { Agenda, Band, Contact, OverDeBende, Socials, Sponsors, Voet } from './Secties.jsx';
import Wagens from './Wagens.jsx';
import { useOnthullen } from './hulp.js';
import './home.css';

const ACHTERGROND = '#2563FF';

/**
 * De homepagina. Elk onderdeel staat in een eigen bestand; de inhoud komt uit gegevens.js.
 * Komen er later losse pagina's bij, dan kunnen Kop en Voet daar gewoon hergebruikt worden.
 */
export default function Home({ onLeden }) {
  // De intro speelt bij elke keer laden of verversen van de pagina.
  const [intro, setIntro] = useState(true);
  const klaar = useCallback(() => setIntro(false), []);
  useOnthullen();

  // Eigen achtergrond- en themakleur voor deze pagina.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const oudeMeta = meta?.getAttribute('content');
    const oudeAchtergrond = document.body.style.background;
    meta?.setAttribute('content', ACHTERGROND);
    document.body.style.background = ACHTERGROND;
    return () => {
      if (meta && oudeMeta) meta.setAttribute('content', oudeMeta);
      document.body.style.background = oudeAchtergrond;
    };
  }, []);

  return (
    <div id="top" className={`bv-home ${intro ? 'is-intro' : ''}`}>
      {intro && <Intro onKlaar={klaar} />}
      <a className="bv-overslaan" href="#wagens">
        Naar de inhoud
      </a>
      <Kop onLeden={onLeden} />
      <main>
        <Wagens />
        <Band />
        <OverDeBende />
        <Agenda />
        <Sponsors />
        <Socials />
        <Contact />
      </main>
      <Voet onLeden={onLeden} />
    </div>
  );
}
