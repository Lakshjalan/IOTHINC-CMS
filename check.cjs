const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/laksh/Desktop/IOTHINC/IOTHINC/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies'); // Can't easily do this via JS client with anon key
}
