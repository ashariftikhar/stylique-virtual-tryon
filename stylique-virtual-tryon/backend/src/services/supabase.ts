import { createClient } from '@supabase/supabase-js';

let supabaseClient: any;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseClient;
}
