import { useEffect, useState } from 'react';
import { fotoUrl } from './api.js';

/** Alle thema's als kaarten; tik er een aan voor de volledige toelichting. */
export default function ThemaLijst({ themas }) {
  const [open, setOpen] = useState(null);

  if (!themas.length) {
    return <p className="ld-zacht ld-midden">Er staan nog geen thema's klaar.</p>;
  }

  return (
    <>
      <h1 className="ld-titel">Thema's</h1>
      <div className="ld-themas">
        {themas.map((t) => (
          <ThemaKaart key={t.id} thema={t} onOpen={() => setOpen(t)} />
        ))}
      </div>
      {open && <ThemaDetail thema={open} onSluit={() => setOpen(null)} />}
    </>
  );
}

export function ThemaKaart({ thema, onOpen }) {
  const foto = thema.fotos?.[0];
  return (
    <button className="ld-themakaart" onClick={onOpen}>
      <span className="ld-themakaart-foto">
        {foto ? <img src={fotoUrl(foto)} alt="" loading="lazy" /> : <span>{thema.titel.slice(0, 1)}</span>}
        {thema.ronde > 1 && <em>Door naar ronde {thema.ronde}</em>}
      </span>
      <strong>{thema.titel}</strong>
      {thema.kort && <span className="ld-zacht">{thema.kort}</span>}
    </button>
  );
}

/** Volledig scherm: foto's om doorheen te bladeren + de uitgebreide toelichting. */
export function ThemaDetail({ thema, onSluit, kopje }) {
  const fotos = thema.fotos || [];
  const [i, setI] = useState(0);

  useEffect(() => {
    const toets = (e) => {
      if (e.key === 'Escape') onSluit();
      if (e.key === 'ArrowRight') setI((x) => Math.min(fotos.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', toets);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', toets);
      document.body.style.overflow = '';
    };
  }, [fotos.length, onSluit]);

  return (
    <div className="ld-detail" role="dialog" aria-modal="true" aria-label={thema.titel} onClick={onSluit}>
      <article className="ld-detail-blad" onClick={(e) => e.stopPropagation()}>
        <button className="ld-detail-sluit" onClick={onSluit} aria-label="Sluiten">
          ✕
        </button>
        {fotos.length > 0 && (
          <div className="ld-fotos">
            <img src={fotoUrl(fotos[i])} alt={`${thema.titel}, foto ${i + 1}`} />
            {fotos.length > 1 && (
              <>
                <button
                  className="ld-fotos-pijl is-links"
                  onClick={() => setI((x) => (x - 1 + fotos.length) % fotos.length)}
                  aria-label="Vorige foto"
                >
                  ‹
                </button>
                <button
                  className="ld-fotos-pijl is-rechts"
                  onClick={() => setI((x) => (x + 1) % fotos.length)}
                  aria-label="Volgende foto"
                >
                  ›
                </button>
                <div className="ld-fotos-stip">
                  {fotos.map((f, j) => (
                    <button key={f} className={j === i ? 'is-aan' : ''} onClick={() => setI(j)} aria-label={`Foto ${j + 1}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="ld-detail-tekst">
          {kopje}
          <h2 className="ld-titel">{thema.titel}</h2>
          {thema.kort && <p className="ld-detail-kort">{thema.kort}</p>}
          {thema.toelichting && <div className="ld-detail-uitleg">{thema.toelichting}</div>}
          {!thema.kort && !thema.toelichting && <p className="ld-zacht">Nog geen toelichting.</p>}
        </div>
      </article>
    </div>
  );
}
