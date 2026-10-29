import { useEffect, useMemo, useState } from 'react';
import { aftellen, agenda, deBende, instagram, paginas, sponsors, sponsorWorden, wagens } from './gegevens.js';
import { datumDelen, scrolNaar, useNu, woorden } from './hulp.js';
import Icoon from './iconen.jsx';
import { Logo } from './Logo.jsx';

/* ------------------------------------------------------------------ over de bende */

export function OverDeBende() {
  const feiten = [
    { waarde: String(wagens.length), label: wagens.length === 1 ? 'Wagen gebouwd' : 'Wagens gebouwd' },
    ...deBende.feiten.filter((f) => f.waarde),
  ];
  // Alle woorden van beide alinea's krijgen een volgnummer, zodat ze tijdens het scrollen één voor één oplichten.
  const alineas = useMemo(() => {
    let n = 0;
    const totaal = deBende.alineas.reduce((s, a) => s + woorden(a).length, 0);
    return deBende.alineas.map((a) => woorden(a).map((w) => ({ w, d: n++ / totaal })));
  }, []);

  return (
    <section id="over" className="bv-laag is-ijs" aria-labelledby="bv-over-kop">
      <div className="bv-kader">
        <p className="bv-label bv-onthul">Over de Bende</p>
        <h2 id="bv-over-kop" className="bv-reuzekop bv-onthul">
          {deBende.kop}
        </h2>

        <div className="bv-over">
          <div className="bv-over-foto" data-scroll="door">
            <div className="bv-over-foto-binnen">
              {deBende.foto ? (
                <img src={deBende.foto} alt="De Bende van Ellende" loading="lazy" />
              ) : (
                <div className="bv-foto-leeg">
                  <Logo titel="" />
                  <span>Groepsfoto volgt</span>
                </div>
              )}
            </div>
          </div>

          <div className="bv-over-tekst">
            <div className="bv-lees" data-scroll="lees">
              {alineas.map((alinea, i) => (
                <p key={i} aria-label={deBende.alineas[i]}>
                  {alinea.map(({ w, d }, j) => (
                    <span key={j} style={{ '--d': d }} aria-hidden="true">
                      {w}{' '}
                    </span>
                  ))}
                </p>
              ))}
            </div>
            <dl className="bv-feiten bv-onthul">
              {feiten.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.waarde}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ aftellen */

function Cijfer({ waarde }) {
  const tekst = String(waarde).padStart(2, '0');
  // Elk cijfer schuift omhoog weg zodra het verandert.
  return (
    <span className="bv-cijfer">
      {tekst.split('').map((c, i) => (
        <span className="bv-cijfer-vak" key={i}>
          <span key={c}>{c}</span>
        </span>
      ))}
    </span>
  );
}

export function Agenda() {
  const nu = useNu();
  const doel = new Date(aftellen.datum).getTime();
  const over = Math.max(0, doel - nu);
  const voorbij = over === 0;
  const datum = datumDelen(aftellen.datum);
  const delen = [
    ['Dagen', Math.floor(over / 86400000)],
    ['Uren', Math.floor(over / 3600000) % 24],
    ['Minuten', Math.floor(over / 60000) % 60],
    ['Seconden', Math.floor(over / 1000) % 60],
  ];
  const komend = agenda
    .filter((a) => new Date(`${a.datum}T23:59:59`).getTime() >= nu)
    .sort((a, b) => a.datum.localeCompare(b.datum));

  return (
    <section id="agenda" className="bv-laag is-licht" aria-labelledby="bv-agenda-kop">
      <div className="bv-kader">
        <div className="bv-agenda-kop">
          <div>
            <p className="bv-label bv-onthul">Aftellen naar {aftellen.titel.toLowerCase()}</p>
            <h2 id="bv-agenda-kop" className="bv-reuzekop bv-onthul">
              Waar zie je ons?
            </h2>
          </div>
          <div className="bv-datum-kaart bv-onthul" aria-label={`${datum.dag} ${datum.maand} ${datum.jaar}`}>
            <span>{datum.maand}</span>
            <strong>{datum.dag}</strong>
            <span>{datum.jaar}</span>
          </div>
        </div>

        {voorbij ? (
          <p className="bv-teller-feest bv-onthul">Alaaf! {aftellen.titel} is begonnen.</p>
        ) : (
          <div className="bv-teller" role="timer" aria-label={`Nog ${delen[0][1]} dagen tot ${aftellen.titel}`} data-scroll="in">
            {delen.map(([label, waarde], i) => (
              <div className="bv-teller-tegel" key={label} style={{ '--i': i }} aria-hidden="true">
                <Cijfer waarde={waarde} />
                <span className="bv-teller-label">{label}</span>
              </div>
            ))}
          </div>
        )}
        <p className="bv-agenda-tekst bv-onthul">{aftellen.omschrijving}</p>

        {komend.length > 0 && (
          <ul className="bv-agenda-lijst bv-onthul">
            {komend.map((a) => {
              const d = datumDelen(a.datum);
              return (
                <li key={`${a.datum}${a.titel}`}>
                  <span className="bv-agenda-datum">
                    <strong>{d.dag}</strong>
                    {d.maand}
                  </span>
                  <strong className="bv-agenda-titel">{a.titel}</strong>
                  <span className="bv-agenda-info">
                    {a.plaats && (
                      <span>
                        <Icoon naam="plaats" grootte={16} /> {a.plaats}
                      </span>
                    )}
                    {a.tijd && (
                      <span>
                        <Icoon naam="klok" grootte={16} /> {a.tijd}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ sponsors */

function SponsorTegel({ s, verborgen }) {
  const inhoud = s.logo ? <img src={s.logo} alt={verborgen ? '' : s.naam} loading="lazy" /> : <span>{s.naam}</span>;
  if (s.url) {
    return (
      <a className="bv-sponsor" href={s.url} target="_blank" rel="noopener noreferrer" tabIndex={verborgen ? -1 : undefined}>
        {inhoud}
      </a>
    );
  }
  return <div className="bv-sponsor">{inhoud}</div>;
}

/** Een rij sponsors die eindeloos voorbij schuift. Twee kopieën achter elkaar maken de lus naadloos. */
function SponsorRij({ lijst, omgekeerd }) {
  return (
    <div className={`bv-rij ${omgekeerd ? 'is-omgekeerd' : ''}`} style={{ '--duur': `${Math.max(30, lijst.length * 5)}s` }}>
      <div className="bv-rij-spoor">
        {[0, 1].map((kopie) => (
          <ul key={kopie} aria-hidden={kopie === 1 || undefined}>
            {lijst.map((s, i) => (
              <li key={`${s.naam}${i}`}>
                <SponsorTegel s={s} verborgen={kopie === 1} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function Sponsors() {
  const hoofd = sponsors.filter((s) => s.niveau === 'hoofd');
  const overig = sponsors.filter((s) => s.niveau !== 'hoofd');
  const helft = Math.ceil(overig.length / 2);
  const rijen = overig.length > 8 ? [overig.slice(0, helft), overig.slice(helft)] : [overig];
  const doel = sponsorWorden || instagram.url;

  return (
    <section id="sponsors" className="bv-laag is-nacht" aria-labelledby="bv-sponsors-kop">
      <div className="bv-kader">
        <p className="bv-label bv-onthul">Met dank aan</p>
        <h2 id="bv-sponsors-kop" className="bv-reuzekop bv-onthul">
          Onze sponsors
        </h2>
        <p className="bv-sectie-intro bv-onthul">Zonder hen rijdt er geen wagen door Zwaag. Dank jullie wel!</p>

        {hoofd.length > 0 && (
          <ul className="bv-hoofdsponsors" data-scroll="in">
            {hoofd.map((s, i) => (
              <li key={`${s.naam}${i}`} style={{ '--i': i }}>
                <SponsorTegel s={s} />
                <span className="bv-hoofd-label">Hoofdsponsor</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {overig.length > 0 && (
        <div className="bv-rijen" aria-label="Sponsors">
          {rijen.map((rij, i) => (
            <SponsorRij key={i} lijst={rij} omgekeerd={i % 2 === 1} />
          ))}
        </div>
      )}

      <div className="bv-kader">
        <div className="bv-sponsor-actie bv-onthul">
          <div>
            <strong>Ook jouw naam op de wagen?</strong>
            <p>We zoeken altijd bedrijven die ons een warm hart toedragen.</p>
          </div>
          <a
            className="bv-knop is-groot"
            href={doel}
            target={doel.startsWith('http') ? '_blank' : undefined}
            rel={doel.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            Word ook sponsor <Icoon naam="pijl" grootte={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ instagram */

function useInstagramPosts() {
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    if (!instagram.feed) return undefined;
    let weg = false;
    fetch(instagram.feed)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => !weg && setPosts((d.posts || []).slice(0, 3)))
      .catch(() => !weg && setPosts(null));
    return () => {
      weg = true;
    };
  }, []);
  return posts;
}

function Post({ post, i }) {
  if (!post) {
    return (
      <a className="bv-post is-leeg" href={instagram.url} target="_blank" rel="noopener noreferrer" style={{ '--i': i }}>
        <Logo titel="" />
        <span className="bv-post-icoon">
          <Icoon naam="instagram" grootte={22} />
        </span>
        <span className="bv-post-tekst">Bekijk op Instagram</span>
      </a>
    );
  }
  const beeld = post.sizes?.medium?.mediaUrl || post.thumbnailUrl || post.mediaUrl;
  const tekst = post.prunedCaption || post.caption || '';
  return (
    <a className="bv-post" href={post.permalink} target="_blank" rel="noopener noreferrer" style={{ '--i': i }}>
      <img src={beeld} alt={post.altText || tekst.slice(0, 120) || 'Instagram-post van de Bende van Ellende'} loading="lazy" />
      <span className="bv-post-icoon">
        <Icoon naam="instagram" grootte={22} />
      </span>
      {tekst && <span className="bv-post-tekst">{tekst.length > 140 ? `${tekst.slice(0, 140)}…` : tekst}</span>}
    </a>
  );
}

export function Instagram() {
  const posts = useInstagramPosts();
  const reeks = posts?.length ? posts : [null, null, null];

  return (
    <section id="instagram" className="bv-laag is-blauw" aria-labelledby="bv-insta-kop">
      <div className="bv-kader">
        <div className="bv-insta-kop">
          <div>
            <p className="bv-label bv-onthul">Volg de Bende</p>
            <h2 id="bv-insta-kop" className="bv-reuzekop bv-onthul">
              Kijk mee achter de schermen
            </h2>
          </div>
          <a className="bv-knop is-groot bv-onthul" href={instagram.url} target="_blank" rel="noopener noreferrer">
            <Icoon naam="instagram" grootte={18} />@{instagram.account}
          </a>
        </div>
        <div className="bv-posts" data-scroll="in">
          {reeks.map((post, i) => (
            <Post key={post?.id || i} post={post} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ voettekst */

export function Voet({ onLeden }) {
  return (
    <footer className="bv-laag is-licht bv-voet">
      <div className="bv-kader">
        <div className="bv-voet-boven">
          <p className="bv-voet-groet">
            Tot op de optocht.
            <br />
            Alaaf!
          </p>
          <nav className="bv-voet-nav" aria-label="Voettekst">
            {paginas
              .filter((p) => p.klaar && p.href !== '#top')
              .map((p) => (
                <a
                  key={p.label}
                  href={p.href}
                  onClick={(e) => {
                    if (scrolNaar(p.href)) e.preventDefault();
                  }}
                >
                  {p.label}
                </a>
              ))}
            <a
              href="/leden"
              onClick={(e) => {
                e.preventDefault();
                onLeden();
              }}
            >
              Ledenportaal
            </a>
          </nav>
        </div>
      </div>
      <div className="bv-voet-logo" data-scroll="in">
        <Logo titel="" />
      </div>
      <div className="bv-kader">
        <div className="bv-voet-onder">
          <span>© {new Date().getFullYear()} Bende van Ellende · Carnaval in Zwaag</span>
          <a href={instagram.url} target="_blank" rel="noopener noreferrer">
            <Icoon naam="instagram" grootte={16} /> @{instagram.account}
          </a>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrolNaar('#top');
            }}
          >
            Terug naar boven ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
