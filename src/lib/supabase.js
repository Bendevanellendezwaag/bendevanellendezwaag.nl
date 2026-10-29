import { createClient } from '@supabase/supabase-js';

// Sleutels komen lokaal uit .env.local en op Vercel uit de omgevingsvariabelen.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

export const cloudEnabled = Boolean(url && key);

// De inlogsessie blijft op het toestel staan, zodat leden ingelogd blijven.
export const supabase = cloudEnabled ? createClient(url, key) : null;
