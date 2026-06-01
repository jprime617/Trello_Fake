-- ==========================================
-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==========================================

-- 1. Desativar triggers/tabelas se já existirem (para evitar erros de reexecução)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.tasks;
drop table if exists public.columns;
drop table if exists public.profiles;

-- 2. Criar Tabela de Perfis de Usuário (vinculado ao auth.users do Supabase)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para Profiles
alter table public.profiles enable row level security;

-- Criar políticas RLS para Profiles (Leitura por qualquer pessoa autenticada, Escrita apenas pelo próprio usuário)
create policy "Membros autenticados podem visualizar perfis"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Usuários podem atualizar seus próprios perfis"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- 3. Criar Tabela de Colunas do Kanban
create table public.columns (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  position integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para Columns
alter table public.columns enable row level security;

-- Criar políticas RLS para Columns (Membros autenticados podem fazer tudo)
create policy "Membros autenticados têm controle total sobre colunas"
  on public.columns for all
  to authenticated
  using (true)
  with check (true);

-- 4. Criar Tabela de Tarefas (Cards)
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  column_id uuid references public.columns(id) on delete cascade not null,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date date,
  priority text default 'medium'::text not null check (priority in ('low', 'medium', 'high')),
  position integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS para Tasks
alter table public.tasks enable row level security;

-- Criar políticas RLS para Tasks (Membros autenticados têm controle total)
create policy "Membros autenticados têm controle total sobre tarefas"
  on public.tasks for all
  to authenticated
  using (true)
  with check (true);

-- 5. Trigger para Sincronizar Novos Usuários do Supabase Auth para a Tabela Profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Inserir Colunas Padrão do Kanban para Inicialização
insert into public.columns (title, position) values
  ('A Fazer', 1),
  ('Em Andamento', 2),
  ('Em Revisão', 3),
  ('Concluído', 4);

-- 7. Habilitar Replicação do Realtime para as tabelas Columns e Tasks
-- (Permite a sincronização instantânea em tempo real de cards e colunas entre os membros)
do $$
begin
  -- Tentar adicionar a tabela columns à publicação supabase_realtime
  begin
    alter publication supabase_realtime add table public.columns;
  exception
    when duplicate_object then
      raise notice 'A tabela columns já está na publicação supabase_realtime';
    when others then
      raise notice 'Não foi possível adicionar a tabela columns à publicação supabase_realtime';
  end;

  -- Tentar adicionar a tabela tasks à publicação supabase_realtime
  begin
    alter publication supabase_realtime add table public.tasks;
  exception
    when duplicate_object then
      raise notice 'A tabela tasks já está na publicação supabase_realtime';
    when others then
      raise notice 'Não foi possível adicionar a tabela tasks à publicação supabase_realtime';
  end;
end;
$$;
