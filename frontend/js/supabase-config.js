// js/supabase-config.js
// Usando tu URL real de Supabase

const SUPABASE_URL = 'https://nvvxklchamfhepnprrmb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AcK8OuXIyMFa4EDOhg7nkQ_mCULQ6zt';  

// Crear cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase configurado correctamente');
console.log('URL:', SUPABASE_URL);