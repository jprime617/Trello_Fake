-- ==========================================================
-- SCRIPT DE MIGRAÇÃO: TABELA DE TOKENS E PREFERÊNCIAS DE NOTIFICAÇÕES
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==========================================================

-- 1. Adicionar coluna alert_preference na tabela public.profiles se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS alert_preference text DEFAULT '48h' CHECK (alert_preference in ('1h', '24h', '48h', '7d'));

-- 2. Criar a Tabela de Tokens Push para salvar os tokens vinculados a cada usuário
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL UNIQUE,
  device_type text DEFAULT 'web' CHECK (device_type in ('web', 'android', 'ios')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS para a tabela user_push_tokens
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS de segurança para que cada usuário gerencie apenas seus tokens
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios tokens" ON public.user_push_tokens;

CREATE POLICY "Usuários podem gerenciar seus próprios tokens"
  ON public.user_push_tokens FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
