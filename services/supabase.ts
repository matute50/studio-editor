import { createClient } from '@supabase/supabase-js';

// Leemos las claves desde las variables de entorno de Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log("¿La URL de Supabase está cargada?:", !!SUPABASE_URL);
console.log("¿La Anon Key de Supabase está cargada?:", !!SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Faltan configurar las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);