const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/laksh/Desktop/IOTHINC/IOTHINC/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAll() {
  console.log("Testing event_teams...");
  const { data: etData, error: etErr } = await supabase
    .from('event_teams')
    .select('*, event_team_members(id, role, status)')
    .limit(1);
    
  if (etErr) console.error("event_teams error:", etErr);
  else console.log("event_teams success:", etData ? etData.length : 0);

  console.log("Testing events...");
  const { data: eData, error: eErr } = await supabase
    .from('events')
    .select('*')
    .limit(1);
  if (eErr) console.error("events error:", eErr);
  else console.log("events success:", eData ? eData.length : 0);

  console.log("Testing tasks...");
  const { data: tData, error: tErr } = await supabase
    .from('event_tasks')
    .select('*')
    .limit(1);
  if (tErr) console.error("tasks error:", tErr);
  else console.log("tasks success:", tData ? tData.length : 0);
  
  console.log("Testing teams...");
  const { data: tmData, error: tmErr } = await supabase
    .from('teams')
    .select('*')
    .limit(1);
  if (tmErr) console.error("teams error:", tmErr);
  else console.log("teams success:", tmData ? tmData.length : 0);
}

testAll();
