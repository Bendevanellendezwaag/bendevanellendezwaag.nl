import { useState } from 'react';
import * as api from './api.js';

const KOPPEN = {
  inloggen: 'Inloggen',
  registreren: 'Account aanmaken',
  vergeten: 'Wachtwoord vergeten',
};

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
      if (!r.error && !r.data?.session)
        setGelukt('Bijna klaar! Klik op de link in de mail die je net kreeg om je account te bevestigen.');
    } else {
      r = await api.wachtwoordVergeten(schoon);
      if (!r.error) setGelukt('Als dit adres bij ons bekend is, staat er nu een mail klaar met een link.');
    }
    setBezig(false);
    if (r.error) setFout(r.error);
  }

  return (
    <form className="ld-kaart ld-form" onSubmit={verstuur}>
      <h1 className="ld-titel">{KOPPEN[stand]}</h1>
      {stand === 'inloggen' && (
        <p className="ld-zacht">De ledenomgeving van de Bende van Ellende.</p>
      )}
      {stand === 'registreren' && (
        <p className="ld-zacht">Na het aanmaken keurt de beheerder je account goed.</p>
      )}

      {stand === 'registreren' && (
        <label className="ld-veld">
          <span>Naam</span>
          <input
            className="ld-input"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            autoComplete="name"
            maxLength={60}
            required
          />
        </label>
      )}
      <label className="ld-veld">
        <span>E-mailadres</span>
        <input
          className="ld-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>
      {stand !== 'vergeten' && (
        <label className="ld-veld">
          <span>Wachtwoord</span>
          <input
            className="ld-input"
            type="password"
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            autoComplete={stand === 'registreren' ? 'new-password' : 'current-password'}
            minLength={stand === 'registreren' ? 8 : undefined}
            required
          />
          {stand === 'registreren' && <small>Minstens 8 tekens.</small>}
        </label>
      )}

      {fout && <p className="ld-fout">{fout}</p>}
      {gelukt && <p className="ld-gelukt">{gelukt}</p>}

      <button className="ld-knop" type="submit" disabled={bezig}>
        {bezig ? 'Even wachten…' : stand === 'vergeten' ? 'Stuur een link' : KOPPEN[stand]}
      </button>

      <div className="ld-wissel">
        {stand !== 'inloggen' && (
          <button type="button" className="ld-link" onClick={() => wissel('inloggen')}>
            Ik heb al een account
          </button>
        )}
        {stand !== 'registreren' && (
          <button type="button" className="ld-link" onClick={() => wissel('registreren')}>
            Account aanmaken
          </button>
        )}
        {stand === 'inloggen' && (
          <button type="button" className="ld-link" onClick={() => wissel('vergeten')}>
            Wachtwoord vergeten?
          </button>
        )}
      </div>
    </form>
  );
}

/** Na de link uit de wachtwoord-vergeten-mail. */
export function NieuwWachtwoord({ klaar }) {
  const [wachtwoord, setWachtwoord] = useState('');
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState(null);

  return (
    <form
      className="ld-kaart ld-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBezig(true);
        const r = await api.nieuwWachtwoord(wachtwoord);
        setBezig(false);
        if (r.error) setFout(r.error);
        else klaar();
      }}
    >
      <h1 className="ld-titel">Nieuw wachtwoord</h1>
      <label className="ld-veld">
        <span>Kies een nieuw wachtwoord</span>
        <input
          className="ld-input"
          type="password"
          value={wachtwoord}
          onChange={(e) => setWachtwoord(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
        />
      </label>
      {fout && <p className="ld-fout">{fout}</p>}
      <button className="ld-knop" type="submit" disabled={bezig}>
        {bezig ? 'Opslaan…' : 'Opslaan'}
      </button>
    </form>
  );
}
