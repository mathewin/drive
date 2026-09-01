// DriveWin — Configuração do Supabase (chave PUBLISHABLE — segura para o frontend)
window.DW = {
  SUPABASE_URL: 'https://smgeuoqewbisorrertln.supabase.co',
  SUPABASE_KEY: 'sb_publishable_2c3rGWPaH5S3d-41A5Fdyw_lpO99EYO'
};

// Cliente Supabase compartilhado
window.DWClient = supabase.createClient(window.DW.SUPABASE_URL, window.DW.SUPABASE_KEY);
