import React from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Plus, FolderKanban, Bell } from 'lucide-react';

interface Board {
  id: string;
  title: string;
}

interface BottomNavProps {
  userProfile: { full_name: string } | null;
  onLogout: () => void;
  onAddColumnClick: () => void;
  onAddTaskClick: () => void;
  boards: Board[];
  activeBoardId: string;
  setActiveBoardId: (id: string) => void;
  onCreateBoard: (title: string, description?: string) => void;
  alertPreference: '24h' | '48h' | '7d';
  setAlertPreference: (pref: '24h' | '48h' | '7d') => void;
  userId: string;
  alerts: any[];

  // Novos props de Projetos para Mobile
  projects: any[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  onCreateProject: (title: string, description?: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  userProfile,
  onLogout,
  onAddTaskClick,
  alerts,
  projects = [],
  activeProjectId,
  setActiveProjectId,
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

  const handleAlertsClick = () => {
    if (alerts.length === 0) {
      alert('Tudo certo! Nenhuma tarefa está próxima do vencimento.');
      return;
    }

    const alertListStr = alerts
      .map((a, idx) => `${idx + 1}. ${a.title} (${a.due_date}) [Prioridade: ${a.priority === 'high' ? 'Alta' : 'Normal'}]`)
      .join('\n');
    
    alert(`🚨 TAREFAS EXPIRANDO EM BREVE:\n\n${alertListStr}`);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-lg flex items-center justify-around px-4 z-40 lg:hidden pb-safe">
      {/* Mobile Project Selector Overlay Trigger */}
      <div className="flex flex-col items-center justify-center text-indigo-400 relative cursor-pointer min-w-[60px] h-full">
        <FolderKanban size={20} />
        <span className="text-[10px] mt-1 font-semibold">Projetos</span>
        {projects.length > 0 && (
          <select
            value={activeProjectId}
            onChange={(e) => setActiveProjectId(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Deadline Alerts Trigger with dynamic red badge */}
      <button
        onClick={handleAlertsClick}
        className="flex flex-col items-center justify-center text-zinc-400 relative min-w-[60px] h-full"
      >
        <Bell size={20} className={alerts.length > 0 ? 'text-red-400 animate-bounce' : 'text-zinc-400'} />
        <span className="text-[10px] mt-1 font-semibold">Alertas</span>
        {alerts.length > 0 && (
          <span className="absolute top-[4px] right-[10px] w-4 h-4 rounded-full bg-red-600 text-[9px] font-extrabold text-white flex items-center justify-center border border-zinc-950">
            {alerts.length}
          </span>
        )}
      </button>

      {/* Main Indigo Action (Add Task) */}
      <button
        onClick={onAddTaskClick}
        className="w-12 h-12 rounded-full bg-indigo-600 border border-indigo-500/50 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 transform -translate-y-3 transition-transform duration-200 active:scale-95"
      >
        <Plus size={24} />
      </button>

      {/* Current User Info */}
      <div className="flex flex-col items-center justify-center min-w-[60px] h-full">
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
        className="flex flex-col items-center justify-center text-zinc-500 hover:text-red-400 min-w-[60px] h-full"
      >
        <LogOut size={20} />
        <span className="text-[10px] mt-1 font-semibold">Sair</span>
      </button>
    </nav>
  );
};
