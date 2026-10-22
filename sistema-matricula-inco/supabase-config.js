import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://vyopgfclpxhkqqxiatmv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FCfYiSMpJVdkYeW5WvixDA_1E1ytUkz";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export { supabase };
