// js/supabase-config.js
// Usando tu URL real de Supabase

const SUPABASE_URL = 'https://oafzgtsptoppukebcjfg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZnpndHNwdG9wcHVrZWJjamZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTQ5ODAsImV4cCI6MjA4OTMzMDk4MH0.OwPg_sqU7irojWK7KNfnePMhNIUlHIcEXI-VHfrzTvM';  // ⚠️ REEMPLAZA CON TU ANON KEY

// Crear cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase configurado correctamente');
console.log('URL:', SUPABASE_URL);