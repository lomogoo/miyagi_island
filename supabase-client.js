// supabase-client.js

// config.js から設定を読み込む
const SUPABASE_URL = SUPABASE_CONFIG.URL;
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.ANON_KEY;

// Supabaseクライアントを初期化してエクスポート
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 他のファイルで使えるようにエクスポート
window.supabaseClient = supabaseClient;
