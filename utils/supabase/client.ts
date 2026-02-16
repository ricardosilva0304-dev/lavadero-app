// utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no existen las variables, devolvemos un cliente vacío o manejamos el error
  // pero evitamos que el "build" de Vercel se caiga.
  if (!supabaseUrl || !supabaseKey) {
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder');
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}