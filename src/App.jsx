import { lazy, Suspense, useEffect, useState } from 'react';
import Site from './site/Site.jsx';

// De ledenomgeving laadt pas als je hem opent: de openbare site blijft licht.
const Leden = lazy(() => import('./leden/Leden.jsx'));

const LEDEN = '/leden';
// Oude links (/stemmen uit de eerste versie, /bende uit de darts-app) komen ook bij de leden uit.
const isLedenPad = (pad) => [LEDEN, '/stemmen', '/bende'].includes(pad);
const huidigPad = () => window.location.pathname.replace(/\/+$/, '') || '/';

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

  if (isLedenPad(pad)) {
    return (
      <Suspense fallback={<div className="ld-laden">Even laden…</div>}>
        <Leden onSite={() => ga('/')} />
      </Suspense>
    );
  }
  return <Site onLeden={() => ga(LEDEN)} />;
}
