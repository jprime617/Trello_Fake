-- ==========================================================
-- SCRIPT DE CUSTOMIZAÇÃO DE PERFIS E APARENCIA
-- Execute este script no SQL Editor do Supabase
-- ==========================================================

-- Adicionar colunas de customização na tabela public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme_color text DEFAULT 'indigo',
ADD COLUMN IF NOT EXISTS board_background text DEFAULT 'zinc',
ADD COLUMN IF NOT EXISTS avatar_emoji text DEFAULT '👤',
ADD COLUMN IF NOT EXISTS bio text;

-- Atualizar registros existentes para garantir que possuam valores padrão
UPDATE public.profiles
SET 
  theme_color = COALESCE(theme_color, 'indigo'),
  board_background = COALESCE(board_background, 'zinc'),
  avatar_emoji = COALESCE(avatar_emoji, '👤');
