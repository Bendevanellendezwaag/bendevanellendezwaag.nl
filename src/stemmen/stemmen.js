/**
 * Thema's ranken voor carnaval. Iedereen met de link zet de thema's op
 * volgorde; wie de beheerderscode heeft zet de thema's erin en bepaalt de
 * fase. Alles loopt via de bve_*-functies in supabase/bende.sql.
 */
import { cloudEnabled, supabase } from '../lib/supabase.js';

const TOESTEL_KEY = 'bve-toestel';
const NAAM_KEY = 'bve-naam';
const CODE_KEY = 'bve-beheercode';

export const PAD = '/stemmen';

function lees(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function schrijf(key, waarde) {
  try {
    if (waarde == null) localStorage.removeItem(key);
    else localStorage.setItem(key, waarde);
  } catch {
    /* privémodus: dan maar alleen deze sessie */
  }
}

// Eén stem per toestel: zo kun je je ranking aanpassen zonder dat er een
// tweede bij komt, en kan niemand andermans stem overschrijven.
let toestel = lees(TOESTEL_KEY);
if (!toestel) {
  toestel = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  schrijf(TOESTEL_KEY, toestel);
}
export const mijnToestel = () => toestel;

export const bewaardeNaam = () => lees(NAAM_KEY) || '';
export const bewaarNaam = (naam) => schrijf(NAAM_KEY, naam);

// De beheerderscode blijft op dit toestel staan tot je uitlogt.
export const bewaardeCode = () => lees(CODE_KEY);
export const bewaarCode = (code) => schrijf(CODE_KEY, code);

async function rpc(naam, args) {
  if (!cloudEnabled) return { error: 'Geen verbinding met de database.' };
  const r = await supabase.rpc(naam, args).then((x) => x, (e) => ({ error: e }));
  if (!r.error) return { data: r.data };
  if (r.error.code === 'PGRST202') return { error: 'De stemming staat nog niet klaar in de database.' };
  return { error: r.error.message || 'Geen verbinding. Probeer het nog eens.' };
}

export const haalStand = (code) => rpc('bve_stand', { p_code: code, p_toestel: toestel });
export const aanmelden = (naam) => rpc('bve_aanmelden', { p_toestel: toestel, p_naam: naam });
export const stem = (naam, volgorde) =>
  rpc('bve_stem', { p_toestel: toestel, p_naam: naam, p_volgorde: volgorde });
export const themaToevoegen = (code, titel) => rpc('bve_thema_toevoegen', { p_code: code, p_titel: titel });
export const themaWijzig = (code, id, titel) => rpc('bve_thema_wijzig', { p_code: code, p_id: id, p_titel: titel });
export const themaVerwijder = (code, id) => rpc('bve_thema_verwijder', { p_code: code, p_id: id });
export const zetFase = (code, fase) => rpc('bve_fase', { p_code: code, p_fase: fase });
export const stemVerwijder = (code, t) => rpc('bve_stem_verwijder', { p_code: code, p_toestel: t });
export const stemmenWissen = (code) => rpc('bve_stemmen_wissen', { p_code: code });
