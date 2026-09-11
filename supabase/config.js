// DriveWin — Configuração do Supabase (chave PUBLISHABLE do frontend).
// NUNCA coloque a service_role aqui. A segurança real é RLS no banco.
window.DW = {
  SUPABASE_URL: 'https://smgeuoqewbisorrertln.supabase.co',
  SUPABASE_KEY: 'sb_publishable_2c3rGWPaH5S3d-41A5Fdyw_lpO99EYO'
};

// Cliente Supabase compartilhado
window.DWClient = supabase.createClient(window.DW.SUPABASE_URL, window.DW.SUPABASE_KEY);
