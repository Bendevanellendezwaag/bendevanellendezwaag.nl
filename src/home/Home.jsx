import { useCallback, useEffect, useState } from 'react';
import Confetti from './Confetti.jsx';
import Kop from './Kop.jsx';
import { Intro } from './Logo.jsx';
import { Agenda, Instagram, OverDeBende, Sponsors, Voet } from './Secties.jsx';
import Wagens from './Wagens.jsx';
import { useOnthullen, useScrollMotor } from './hulp.js';
import './home.css';

const ACHTERGROND = '#2563FF';

/**
 * De homepagina. Elk onderdeel staat in een eigen bestand; de inhoud komt uit gegevens.js.
 * De onderdelen zijn gekleurde lagen die bij het scrollen over elkaar heen schuiven.
 */
export default function Home({ onLeden }) {
  // De intro speelt bij elke keer laden of verversen van de pagina.
  const [intro, setIntro] = useState(true);
  const klaar = useCallback(() => setIntro(false), []);
  useOnthullen();
  useScrollMotor();

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
        <OverDeBende />
        <Agenda />
        <Sponsors />
        <Instagram />
      </main>
      <Voet onLeden={onLeden} />
      <Confetti />
    </div>
  );
}
