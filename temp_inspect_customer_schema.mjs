globalThis.WebSocket = class DummyWebSocket {};

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    envVars[key] = val;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function inspectSchemaAndData() {
  const { data: realProf } = await supabaseAdmin.from('profiles').select('*').eq('email', 'tnklaxamx@gmail.com');
  console.log('REAL PROFILE SAMPLE:', realProf);

  const { data: realCust } = await supabaseAdmin.from('customers').select('*').eq('email', 'tnklaxamx@gmail.com');
  console.log('REAL CUSTOMER SAMPLE:', realCust);
}

inspectSchemaAndData();
