import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Ensures there is an authenticated user session.
 * Requires Supabase Auth Provider "Anonymous" to be enabled in the project.
 */
export const ensureAnonymousSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (session?.user) return session.user;

  const { data, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw signInError;

  return data.user;
};
