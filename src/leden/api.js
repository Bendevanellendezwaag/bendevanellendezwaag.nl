/**
 * Alles wat de ledenomgeving met Supabase doet. Elke functie geeft
 * { data } of { error: 'leesbare melding' } terug.
 */
import { cloudEnabled, supabase } from '../lib/supabase.js';

export const BUCKET = 'themafotos';

const MELDINGEN = {
  'Invalid login credentials': 'E-mailadres of wachtwoord klopt niet.',
  'Email not confirmed': 'Bevestig eerst je e-mailadres via de link in je mail.',
  'User already registered': 'Er bestaat al een account met dit e-mailadres.',
  'Password should be at least 6 characters.': 'Kies een wachtwoord van minstens 6 tekens.',
};

function netjes(error) {
  if (!error) return null;
  const tekst = error.message || String(error);
  if (MELDINGEN[tekst]) return MELDINGEN[tekst];
  if (/rate limit/i.test(tekst)) return 'Even te vaak geprobeerd. Wacht een paar minuten.';
  if (/fetch/i.test(tekst)) return 'Geen verbinding. Probeer het nog eens.';
  return tekst;
}

async function doe(belofte) {
  if (!cloudEnabled) return { error: 'Geen verbinding met de database.' };
  try {
    const r = await belofte;
    return r.error ? { error: netjes(r.error) } : { data: r.data };
  } catch (e) {
    return { error: netjes(e) };
  }
}

// ---------------------------------------------------------------- account

export const inloggen = (email, wachtwoord) =>
  doe(supabase.auth.signInWithPassword({ email, password: wachtwoord }));

export const registreren = (naam, email, wachtwoord) =>
  doe(
    supabase.auth.signUp({
      email,
      password: wachtwoord,
      options: { data: { naam }, emailRedirectTo: `${window.location.origin}/leden` },
    }),
  );

export const uitloggen = () => doe(supabase.auth.signOut());

export const wachtwoordVergeten = (email) =>
  doe(supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/leden` }));

export const nieuwWachtwoord = (wachtwoord) => doe(supabase.auth.updateUser({ password: wachtwoord }));

export const mijnProfiel = (id) => doe(supabase.from('leden').select('*').eq('id', id).maybeSingle());

export const mijnNaam = (naam) => doe(supabase.rpc('mijn_naam', { p_naam: naam }));

// ---------------------------------------------------------------- beheer leden

export const alleLeden = () => doe(supabase.from('leden').select('*').order('aangemaakt_op'));
export const lidStatus = (id, status) => doe(supabase.rpc('lid_status', { p_id: id, p_status: status }));
export const lidRol = (id, rol) => doe(supabase.rpc('lid_rol', { p_id: id, p_rol: rol }));

// ---------------------------------------------------------------- thema's en rondes

export const themas = () => doe(supabase.from('themas').select('*').order('aangemaakt_op'));
export const rondes = () => doe(supabase.from('rondes').select('*').order('nr'));
export const deelname = () => doe(supabase.rpc('ronde_deelname'));
export const mijnStemmen = (id) => doe(supabase.from('stemmen').select('ronde, keuze').eq('lid', id));
export const uitslag = (ronde) => doe(supabase.rpc('uitslag', { p_ronde: ronde }));
export const stem = (ronde, keuze) => doe(supabase.rpc('stem_uitbrengen', { p_ronde: ronde, p_keuze: keuze }));

export const themaOpslaan = ({ id, ...velden }) =>
  doe(
    id
      ? supabase.from('themas').update(velden).eq('id', id)
      : supabase.from('themas').insert(velden),
  );
export const themaVerwijder = (id) => doe(supabase.from('themas').delete().eq('id', id));

export const rondeBijwerken = (nr, velden) =>
  doe(supabase.from('rondes').update({ ...velden, bijgewerkt_op: new Date().toISOString() }).eq('nr', nr));

// Er mag maar één ronde tegelijk open staan: eerst de andere sluiten.
export async function rondeOpenen(nr) {
  const dicht = await doe(
    supabase.from('rondes').update({ status: 'gesloten' }).eq('status', 'open').neq('nr', nr),
  );
  if (dicht.error) return dicht;
  return rondeBijwerken(nr, { status: 'open' });
}

export const doorzetten = (nr, ids) => doe(supabase.rpc('ronde_doorzetten', { p_nr: nr, p_ids: ids }));

// ---------------------------------------------------------------- foto's

export const fotoUrl = (pad) => supabase?.storage.from(BUCKET).getPublicUrl(pad).data.publicUrl;

// Foto's verkleinen voor ze omhoog gaan: telefoonfoto's zijn al snel 5 MB.
async function verklein(bestand, max = 1800) {
  if (!bestand.type.startsWith('image/') || bestand.type === 'image/gif') return bestand;
  try {
    const bitmap = await createImageBitmap(bestand);
    const schaal = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * schaal);
    canvas.height = Math.round(bitmap.height * schaal);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob || bestand;
  } catch {
    return bestand;
  }
}

export async function fotoUploaden(bestand) {
  const blob = await verklein(bestand);
  const pad = `${crypto.randomUUID()}.${blob.type === 'image/jpeg' ? 'jpg' : bestand.name.split('.').pop()}`;
  const r = await doe(supabase.storage.from(BUCKET).upload(pad, blob, { contentType: blob.type }));
  return r.error ? r : { data: pad };
}

export const fotoVerwijder = (pad) => doe(supabase.storage.from(BUCKET).remove([pad]));
