import { useState } from 'react';
import * as api from './api.js';

export default function Inloggen() {
  const [stand, setStand] = useState('inloggen');
  const [naam, setNaam] = useState('');
  const [email, setEmail] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);
  const [gelukt, setGelukt] = useState(null);

  function wissel(nieuw) {
    setStand(nieuw);
    setFout(null);
    setGelukt(null);
  }

  async function verstuur(e) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    setGelukt(null);
    const schoon = email.trim();
    let r;
    if (stand === 'inloggen') r = await api.inloggen(schoon, wachtwoord);
    else if (stand === 'registreren') {
      r = await api.registreren(naam.trim(), schoon, wachtwoord);
      // Staat e-mailbevestiging aan in Supabase, dan is er nog geen sessie.
      if (!r.error && !r.data?.session) setGelukt('Bevestig je account via de link in je mail.');
    } else {
      r = await api.wachtwoordVergeten(schoon);
      if (!r.error) setGelukt('Check je mail voor een link om een nieuw wachtwoord te kiezen.');
    }
    setBezig(false);
    if (r.error) setFout(r.error);
  }

  if (stand === 'vergeten') {
    return (
      <form className="ld-form" onSubmit={verstuur}>
        <h1 className="ld-login-titel">Wachtwoord vergeten</h1>
        <Veld label="E-mailadres" type="email" value={email} onChange={setEmail} autoComplete="email" autoFocus />
        {fout && <p className="ld-fout">{fout}</p>}
        {gelukt && <p className="ld-gelukt">{gelukt}</p>}
        <button className="ld-knop" type="submit" disabled={bezig}>
          {bezig ? 'Versturen…' : 'Stuur link'}
        </button>
        <button type="button" className="ld-link ld-midden" onClick={() => wissel('inloggen')}>
          Terug naar inloggen
        </button>
      </form>
    );
  }

  const nieuw = stand === 'registreren';

  return (
    <form className="ld-form" onSubmit={verstuur}>
      <h1 className="ld-login-titel">{nieuw ? 'Word lid' : 'Welkom terug'}</h1>

      <div className="ld-segment" role="tablist">
        <button type="button" role="tab" aria-selected={!nieuw} className={!nieuw ? 'is-aan' : ''} onClick={() => wissel('inloggen')}>
          Inloggen
        </button>
        <button type="button" role="tab" aria-selected={nieuw} className={nieuw ? 'is-aan' : ''} onClick={() => wissel('registreren')}>
          Account aanmaken
        </button>
      </div>

      {nieuw && <Veld label="Naam" value={naam} onChange={setNaam} autoComplete="name" maxLength={60} />}
      <Veld label="E-mailadres" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Veld
        label="Wachtwoord"
        type="password"
        value={wachtwoord}
        onChange={setWachtwoord}
        autoComplete={nieuw ? 'new-password' : 'current-password'}
        minLength={nieuw ? 8 : undefined}
        placeholder={nieuw ? 'Minstens 8 tekens' : undefined}
        extra={
          !nieuw && (
            <button type="button" className="ld-link is-klein" onClick={() => wissel('vergeten')}>
              Vergeten?
            </button>
          )
        }
      />

      {fout && <p className="ld-fout">{fout}</p>}
      {gelukt && <p className="ld-gelukt">{gelukt}</p>}

      <button className="ld-knop" type="submit" disabled={bezig}>
        {bezig ? 'Even wachten…' : nieuw ? 'Account aanmaken' : 'Inloggen'}
      </button>
    </form>
  );
}

function Veld({ label, onChange, extra, ...props }) {
  return (
    <label className="ld-veld">
      <span className="ld-veld-kop">
        {label}
        {extra}
      </span>
      <input className="ld-input" required {...props} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Na de link uit de wachtwoord-vergeten-mail. */
export function NieuwWachtwoord({ klaar }) {
  const [wachtwoord, setWachtwoord] = useState('');
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);

  return (
    <form
      className="ld-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBezig(true);
        const r = await api.nieuwWachtwoord(wachtwoord);
        setBezig(false);
        if (r.error) setFout(r.error);
        else klaar();
      }}
    >
      <h1 className="ld-login-titel">Nieuw wachtwoord</h1>
      <Veld
        label="Nieuw wachtwoord"
        type="password"
        value={wachtwoord}
        onChange={setWachtwoord}
        autoComplete="new-password"
        minLength={8}
        placeholder="Minstens 8 tekens"
        autoFocus
      />
      {fout && <p className="ld-fout">{fout}</p>}
      <button className="ld-knop" type="submit" disabled={bezig}>
        {bezig ? 'Opslaan…' : 'Opslaan'}
      </button>
    </form>
  );
}
