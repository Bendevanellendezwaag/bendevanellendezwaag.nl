import { createClient } from '@supabase/supabase-js';

// Sleutels komen lokaal uit .env.local en op Vercel uit de omgevingsvariabelen.
// Staan ze er niet, dan draait de app gewoon door: alleen op dit toestel.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

export const cloudEnabled = Boolean(url && key);

export const supabase = cloudEnabled
  ? createClient(url, key, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 20 } },
    })
  : null;
