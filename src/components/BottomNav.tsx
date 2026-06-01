import React from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Plus, PlusSquare, FolderKanban } from 'lucide-react';

interface BottomNavProps {
  userProfile: { full_name: string } | null;
  onLogout: () => void;
  onAddColumnClick: () => void;
  onAddTaskClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
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
      .substring(0, 1);
  };

  const handleSignOut = async () => {
    if (window.confirm('Deseja realmente sair?')) {
      await supabase.auth.signOut();
      onLogout();
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-lg flex items-center justify-around px-4 z-40 lg:hidden pb-safe">
      {/* Home Dashboard Icon */}
      <div className="flex flex-col items-center justify-center text-indigo-400">
        <FolderKanban size={20} />
        <span className="text-[10px] mt-1 font-semibold">Painel</span>
      </div>

      {/* Add Task Quick Trigger */}
      <button
        onClick={onAddTaskClick}
        className="flex flex-col items-center justify-center text-zinc-400 hover:text-white"
      >
        <PlusSquare size={20} className="text-emerald-400" />
        <span className="text-[10px] mt-1 font-semibold">Tarefa</span>
      </button>

      {/* Main Indigo Action (Add Column) */}
      <button
        onClick={onAddColumnClick}
        className="w-12 h-12 rounded-full bg-indigo-600 border border-indigo-500/50 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 transform -translate-y-3 transition-transform duration-200 active:scale-95"
      >
        <Plus size={24} />
      </button>

      {/* Current User Info */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
          {userProfile ? getInitials(userProfile.full_name) : 'U'}
        </div>
        <span className="text-[10px] mt-1 font-semibold text-zinc-400 truncate max-w-[50px]">
          {userProfile ? userProfile.full_name.split(' ')[0] : 'Grupo'}
        </span>
      </div>

      {/* Logout Action */}
      <button
        onClick={handleSignOut}
        className="flex flex-col items-center justify-center text-zinc-500 hover:text-red-400"
      >
        <LogOut size={20} />
        <span className="text-[10px] mt-1 font-semibold">Sair</span>
      </button>
    </nav>
  );
};
