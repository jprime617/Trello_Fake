-- ==========================================
-- SCRIPT DE MIGRAÇÃO INCREMENTAL PARA RECURSOS AVANÇADOS
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==========================================

-- 1. Criar Tabela de Quadros (Sprints/Áreas de Trabalho)
create table if not exists public.boards (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para Boards
alter table public.boards enable row level security;

-- Criar política RLS para Boards (Membros autenticados têm controle total)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'boards' and policyname = 'Membros autenticados têm controle total sobre boards'
  ) then
    create policy "Membros autenticados têm controle total sobre boards"
      on public.boards for all
      to authenticated
      using (true)
      with check (true);
  end if;
end;
$$;

-- 2. Inserir uma Sprint Padrão inicial se o banco estiver vazio
insert into public.boards (title, description)
select 'Sprint 1', 'Primeiro ciclo de entregas e tarefas do grupo'
where not exists (select 1 from public.boards);

-- 3. Vincular a Tabela de Colunas aos Quadros (Sprints)
-- Adiciona a coluna board_id se ela não existir
alter table public.columns 
add column if not exists board_id uuid references public.boards(id) on delete cascade;

-- Vincula colunas órfãs existentes ao primeiro quadro/Sprint criado acima
update public.columns
set board_id = (select id from public.boards order by created_at asc limit 1)
where board_id is null;

-- Tornar a coluna board_id NOT NULL para garantir integridade
alter table public.columns alter column board_id set not null;

-- 4. Criar Tabela de Subtarefas (Checklist de tarefas internas dos Cards)
create table if not exists public.subtasks (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para Subtarefas
alter table public.subtasks enable row level security;

-- Criar política RLS para Subtarefas (Membros autenticados têm controle total)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'subtasks' and policyname = 'Membros autenticados têm controle total sobre subtarefas'
  ) then
    create policy "Membros autenticados têm controle total sobre subtarefas"
      on public.subtasks for all
      to authenticated
      using (true)
      with check (true);
  end if;
end;
$$;

-- 5. Adicionar suporte a Anexos (PDF, ZIP, Imagens) e Etiquetas Customizadas nas Tarefas
-- Adiciona colunas JSONB flexíveis caso não existam
alter table public.tasks
add column if not exists labels jsonb default '[]'::jsonb not null,
add column if not exists attachments jsonb default '[]'::jsonb not null;

-- 6. Habilitar Replicação do Realtime do Supabase para Boards e Subtasks
do $$
begin
  -- Tentar adicionar a tabela boards à publicação de sincronização em tempo real
  begin
    alter publication supabase_realtime add table public.boards;
  exception
    when duplicate_object then
      raise notice 'A tabela boards já está na publicação supabase_realtime';
    when others then
      raise notice 'Erro ao habilitar realtime para boards';
  end;

  -- Tentar adicionar a tabela subtasks à publicação de sincronização em tempo real
  begin
    alter publication supabase_realtime add table public.subtasks;
  exception
    when duplicate_object then
      raise notice 'A tabela subtasks já está na publicação supabase_realtime';
    when others then
      raise notice 'Erro ao habilitar realtime para subtasks';
  end;
end;
$$;

-- ==========================================
-- 💡 CONFIGURAÇÃO AUTOMÁTICA DO BUCKET E RLS DE STORAGE
-- Execute este bloco abaixo no seu SQL Editor do Supabase.
-- Ele criará o bucket "attachments" como público e configurará todas as permissões RLS.
-- ==========================================

-- 1. Criar ou garantir que o bucket 'attachments' exista e seja público
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do update set public = true;

-- 2. Garantir que o RLS esteja ativo (já habilitado por padrão pelo Supabase)

-- 3. Remover políticas antigas se existirem para evitar conflitos de duplicação
drop policy if exists "Acesso público de leitura para anexos" on storage.objects;
drop policy if exists "Permitir inserção de anexos para usuários autenticados" on storage.objects;
drop policy if exists "Permitir remoção de anexos para usuários autenticados" on storage.objects;
drop policy if exists "Permitir atualização de anexos para usuários autenticados" on storage.objects;

-- 4. Criar política de Leitura Pública (SELECT)
create policy "Acesso público de leitura para anexos"
on storage.objects for select
using ( bucket_id = 'attachments' );

-- 5. Criar política de Inserção (INSERT) para membros autenticados
create policy "Permitir inserção de anexos para usuários autenticados"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'attachments' );

-- 6. Criar política de Atualização (UPDATE) para membros autenticados
create policy "Permitir atualização de anexos para usuários autenticados"
on storage.objects for update
to authenticated
using ( bucket_id = 'attachments' )
with check ( bucket_id = 'attachments' );

-- 7. Criar política de Remoção (DELETE) para membros autenticados
create policy "Permitir remoção de anexos para usuários autenticados"
on storage.objects for delete
to authenticated
using ( bucket_id = 'attachments' );
