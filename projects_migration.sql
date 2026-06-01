-- ==========================================================
-- SCRIPT DE MIGRAÇÃO: PROJETOS MÚLTIPLOS E GESTÃO DE MEMBROS
-- Execute este script no SQL Editor do Supabase
-- ==========================================================

-- 1. Criar Tabela de Projetos
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  created_by uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Criar Tabela de Membros do Projeto
create table if not exists public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member' check (role in ('owner', 'member')) not null,
  unique(project_id, user_id)
);

-- 3. Habilitar RLS para ambas as tabelas
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- 4. Criar Políticas RLS para Projetos (Sem recursão circular)
drop policy if exists "Membros podem ver seus projetos" on public.projects;
drop policy if exists "Criadores têm controle total sobre projetos" on public.projects;
drop policy if exists "Membros autenticados podem ver projetos" on public.projects;

-- Qualquer membro autenticado pode ver projetos do grupo
create policy "Membros autenticados podem ver projetos"
  on public.projects for select
  to authenticated
  using (true);

-- Apenas o criador/dono do projeto pode criar, editar ou excluir o projeto
create policy "Criadores têm controle total sobre projetos"
  on public.projects for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- 5. Criar Políticas RLS para Membros de Projetos (Sem recursão circular)
drop policy if exists "Membros podem ver membros do mesmo projeto" on public.project_members;
drop policy if exists "Criador do projeto pode gerenciar membros" on public.project_members;
drop policy if exists "Membros autenticados podem ver participantes" on public.project_members;
drop policy if exists "Criadores de projetos podem gerenciar participantes" on public.project_members;

-- Qualquer membro autenticado pode ver quem participa dos projetos
create policy "Membros autenticados podem ver participantes"
  on public.project_members for select
  to authenticated
  using (true);

-- Apenas o criador/dono do projeto pode adicionar ou remover participantes
create policy "Criadores de projetos podem gerenciar participantes"
  on public.project_members for all
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  );

-- 6. Atualizar Tabela de Boards (Sprints) para vincular a um Projeto
alter table public.boards add column if not exists project_id uuid references public.projects(id) on delete cascade;

-- 7. Habilitar Replicação Realtime para as novas tabelas de Projetos
do $$
begin
  begin
    alter publication supabase_realtime add table public.projects;
  exception
    when duplicate_object then
      raise notice 'Tabela projects já está na publicação';
    when others then
      null;
  end;

  begin
    alter publication supabase_realtime add table public.project_members;
  exception
    when duplicate_object then
      raise notice 'Tabela project_members já está na publicação';
    when others then
      null;
  end;
end;
$$;
