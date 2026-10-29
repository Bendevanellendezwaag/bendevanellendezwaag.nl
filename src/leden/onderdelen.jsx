/** Kleine bouwstenen die op meerdere schermen terugkomen. */

export function Paginakop({ titel, sub, children }) {
  return (
    <header className="ld-paginakop">
      <div>
        <h1>{titel}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children}
    </header>
  );
}

export function Leeg({ titel, children }) {
  return (
    <div className="ld-leeg">
      {titel && <strong>{titel}</strong>}
      {children && <span>{children}</span>}
    </div>
  );
}
