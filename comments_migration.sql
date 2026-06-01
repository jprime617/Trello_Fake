-- ==========================================================
-- SCRIPT DE ADIÇÃO DE COMENTÁRIOS EM TAREFAS
-- Execute este script no SQL Editor do Supabase para atualizar a estrutura
-- ==========================================================

-- 1. Criar Tabela de Comentários
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas RLS profissionais
DROP POLICY IF EXISTS "Qualquer membro autenticado pode ver comentários" ON public.comments;
CREATE POLICY "Qualquer membro autenticado pode ver comentários"
  ON public.comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuários podem criar seus próprios comentários" ON public.comments;
CREATE POLICY "Usuários podem criar seus próprios comentários"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir seus próprios comentários" ON public.comments;
CREATE POLICY "Usuários podem excluir seus próprios comentários"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Habilitar Realtime para comentários
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'A tabela comments já está no Realtime';
  END;
END $$;
