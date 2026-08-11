-- ==========================================
-- SCRIPT DE MIGRAÇÃO PARA ATRIBUIÇÃO DE RESPONSÁVEL EM SUBTAREFAS
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==========================================

-- Adicionar a coluna assignee_id na tabela subtasks vinculando à tabela profiles
alter table public.subtasks 
add column if not exists assignee_id uuid references public.profiles(id) on delete set null;
