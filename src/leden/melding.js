/** Korte bevestigingen rechtsonder ("Opgeslagen"), los van welk scherm ze afvuurt. */
const luisteraars = new Set();

export function meld(tekst, soort = 'goed') {
  const m = { id: Math.random(), tekst, soort };
  luisteraars.forEach((f) => f(m));
}

export function luister(f) {
  luisteraars.add(f);
  return () => luisteraars.delete(f);
}
