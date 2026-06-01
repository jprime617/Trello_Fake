-- ==========================================================
-- SCRIPT DE SEGURANÇA PROFISSIONAL: ISOLAMENTO DE PROJETOS E SPRINTS
-- Execute este script no SQL Editor do Supabase para atualizar as políticas RLS
-- ==========================================================

-- 1. Certificar que as tabelas de Projetos e Membros existem
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  created_by uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member' check (role in ('owner', 'member')) not null,
  unique(project_id, user_id)
);

-- 2. Garantir que o RLS está ativo em todas as tabelas principais
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.boards enable row level security;

-- 3. Limpar políticas antigas de Projetos
drop policy if exists "Membros podem ver seus projetos" on public.projects;
drop policy if exists "Criadores têm controle total sobre projetos" on public.projects;
drop policy if exists "Membros autenticados podem ver projetos" on public.projects;

-- [POLÍTICA PROFISSIONAL] Apenas o criador ou participantes adicionados podem ver o projeto
create policy "Membros podem ver seus projetos"
  on public.projects for select
  to authenticated
  using (
    created_by = auth.uid() or
    exists (
      select 1 from public.project_members pm
      where pm.project_id = id and pm.user_id = auth.uid()
    )
  );

-- Apenas o criador do projeto pode gerenciar as configurações, título e exclusão
create policy "Criadores têm controle total sobre projetos"
  on public.projects for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());


-- 4. Limpar políticas antigas de Participantes
drop policy if exists "Membros podem ver membros do mesmo projeto" on public.project_members;
drop policy if exists "Criador do projeto pode gerenciar membros" on public.project_members;
drop policy if exists "Membros autenticados podem ver participantes" on public.project_members;
drop policy if exists "Criadores de projetos podem gerenciar participantes" on public.project_members;
drop policy if exists "Criadores de projetos podem inserir participantes" on public.project_members;
drop policy if exists "Criadores de projetos podem deletar participantes" on public.project_members;

-- Todos os usuários logados podem listar participantes para facilitar a busca do seletor inline
create policy "Membros autenticados podem ver participantes"
  on public.project_members for select
  to authenticated
  using (true);

-- Apenas o criador/dono do projeto pode adicionar participantes
create policy "Criadores de projetos podem inserir participantes"
  on public.project_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  );

-- Apenas o criador/dono do projeto pode remover participantes
create policy "Criadores de projetos podem deletar participantes"
  on public.project_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  );


-- 5. Limpar políticas antigas de Sprints (Boards) e aplicar Isolamento Profissional
drop policy if exists "Membros autenticados têm controle total sobre boards" on public.boards;

-- [POLÍTICA PROFISSIONAL] Sprints são visíveis/editáveis apenas se o usuário for dono ou participante do projeto correspondente
create policy "Membros autenticados têm controle total sobre boards"
  on public.boards for all
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (
        p.created_by = auth.uid() or
        exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id and pm.user_id = auth.uid()
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (
        p.created_by = auth.uid() or
        exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id and pm.user_id = auth.uid()
        )
      )
    )
  );
