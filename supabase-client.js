// supabase-client.js

// SupabaseプロジェクトのURLとanonキー
const SUPABASE_URL = 'https://impkzpdypusdminmyyea.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltcGt6cGR5cHVzZG1pbm15eWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MTkxNTUsImV4cCI6MjA2NzA5NTE1NX0.soL4Acnn9sWNISYQ5ZhClKRTdZ-RCxLl3SZ3oYHu-Q0';

// Supabaseクライアントを初期化してエクスポート
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 他のファイルで使えるようにエクスポート
window.supabaseClient = supabaseClient;