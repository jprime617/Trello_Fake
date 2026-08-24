-- ==========================================================
-- SCRIPT DE MIGRAÇÃO: PREFERÊNCIAS POR TIPO DE NOTIFICAÇÃO
-- E LOG ANTI-DUPLICIDADE DE AVISOS DE PRAZO
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==========================================================

-- 1. Preferências por categoria de notificação (mensagens de chat / prazos de tasks)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_chat_messages boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_task_deadlines boolean DEFAULT true;

-- 2. Log de notificações de prazo já enviadas, para evitar duplicidade
CREATE TABLE IF NOT EXISTS public.task_deadline_notifications_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  threshold text NOT NULL,
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (task_id, user_id, threshold)
);

-- 3. RLS: apenas o service role (usado pelo job agendado) acessa este log
ALTER TABLE public.task_deadline_notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apenas service role gerencia o log de notificações" ON public.task_deadline_notifications_log;
CREATE POLICY "Apenas service role gerencia o log de notificações"
  ON public.task_deadline_notifications_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
