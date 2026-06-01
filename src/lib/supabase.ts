import { createClient } from '@supabase/supabase-js';

// Obter as variáveis de ambiente fornecidas pelo Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Aviso: As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram encontradas. Siga as instruções do arquivo .env.example para configurá-las.'
  );
}

// Instanciar o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
