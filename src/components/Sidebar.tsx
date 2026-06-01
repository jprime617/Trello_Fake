import React from 'react';
import { supabase } from '../lib/supabase';
import { Kanban, LogOut, User, FolderKanban, PlusCircle } from 'lucide-react';

interface SidebarProps {
  userProfile: { full_name: string; email: string } | null;
  onLogout: () => void;
  onAddColumnClick: () => void;
  onAddTaskClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userProfile,
  onLogout,
  onAddColumnClick,
  onAddTaskClick,
}) => {
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSignOut = async () => {
    if (window.confirm('Deseja realmente sair?')) {
      await supabase.auth.signOut();
      onLogout();
    }
  };

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen shrink-0 hidden lg:flex">
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-800/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
          <Kanban size={18} />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
          Trello<span className="text-indigo-400">Fake</span>
        </span>
      </div>

      {/* Navigation Quick Actions */}
      <div className="flex-1 px-4 py-6 space-y-7 overflow-y-auto">
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3">
            Quadro Kanban
          </span>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm font-medium transition-all shadow-inner">
              <FolderKanban size={16} className="text-indigo-400" />
              <span>Painel Principal</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3">
            Ações Rápidas
          </span>
          <div className="space-y-1">
            <button
              onClick={onAddTaskClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-sm font-medium transition-all"
            >
              <PlusCircle size={16} className="text-emerald-400" />
              <span>Nova Tarefa</span>
            </button>
            <button
              onClick={onAddColumnClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-sm font-medium transition-all"
            >
              <PlusCircle size={16} className="text-sky-400" />
              <span>Nova Coluna</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md shrink-0">
            {userProfile ? getInitials(userProfile.full_name) : <User size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">
              {userProfile ? userProfile.full_name : 'Carregando...'}
            </h4>
            <p className="text-xs text-zinc-500 truncate">
              {userProfile ? userProfile.email : ''}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sair da Conta"
            className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
