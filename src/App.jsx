import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import StemScherm from './stemmen/StemScherm.jsx';
import { PAD as STEM_PAD } from './stemmen/stemmen.js';

const huidigPad = () => window.location.pathname.replace(/\/+$/, '') || '/';

/** Twee pagina's: de voorpagina en de stemming. Geen router nodig. */
export default function App() {
  const [pad, setPad] = useState(huidigPad);

  useEffect(() => {
    const terug = () => setPad(huidigPad());
    window.addEventListener('popstate', terug);
    return () => window.removeEventListener('popstate', terug);
  }, []);

  const ga = (naar) => {
    window.history.pushState({}, '', naar);
    setPad(naar);
    window.scrollTo(0, 0);
  };

  // Oude links uit de darts-app (/bende) komen ook bij de stemming uit.
  if (pad === STEM_PAD || pad === '/bende') return <StemScherm onTerug={() => ga('/')} />;
  return <Home onStemmen={() => ga(STEM_PAD)} />;
}
