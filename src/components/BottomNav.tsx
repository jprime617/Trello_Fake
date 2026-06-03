import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Plus, Bell, Home } from 'lucide-react';
import { useCustomModal } from './CustomModals';

interface Board {
  id: string;
  title: string;
}

interface BottomNavProps {
  userProfile: { full_name: string; avatar_emoji?: string; avatar_url?: string } | null;
  onLogout: () => void;
  onAddColumnClick: () => void;
  onAddTaskClick: () => void;
  boards: Board[];
  activeBoardId: string;
  setActiveBoardId: (id: string) => void;
  onCreateBoard: (title: string, description?: string) => void;
  alertPreference: '1h' | '24h' | '48h' | '7d';
  setAlertPreference: (pref: '1h' | '24h' | '48h' | '7d') => void;
  userId: string;
  alerts: any[];

  // Novos props de Projetos para Mobile
  setActiveProjectId: (id: string) => void;
  onOpenProfileSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  userProfile,
  onLogout,
  onAddTaskClick,
  alerts,
  setActiveProjectId,
  onOpenProfileSettings,
}) => {
  const { toast, confirm } = useCustomModal();
  const [isAlertsSheetOpen, setIsAlertsSheetOpen] = useState(false);

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
    const isConfirmed = await confirm('Deseja realmente sair do sistema?');
    if (isConfirmed) {
      await supabase.auth.signOut();
      onLogout();
    }
  };

  const handleAlertsClick = () => {
    if (alerts.length === 0) {
      toast('Tudo certo! Nenhuma tarefa está próxima do vencimento.', 'success');
      return;
    }
    setIsAlertsSheetOpen(true);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-lg flex items-center justify-around px-4 z-40 lg:hidden pb-safe">
      {/* Mobile Projects Hub Link */}
      <button
        onClick={() => setActiveProjectId('')}
        className="flex flex-col items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition-all min-w-[60px] h-full"
        title="Voltar aos Projetos"
      >
        <Home size={20} className="text-zinc-400" />
        <span className="text-[10px] mt-1 font-semibold text-zinc-400">Projetos</span>
      </button>

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

      {/* Main Brand Action (Add Task) */}
      <button
        onClick={onAddTaskClick}
        className="w-12 h-12 rounded-full bg-brand-accent border border-brand-accent/50 flex items-center justify-center text-white shadow-lg shadow-brand-accent/30 transform -translate-y-3 transition-transform duration-200 active:scale-95"
      >
        <Plus size={24} />
      </button>

      {/* Current User Info (opens customization panel) */}
      <button
        onClick={onOpenProfileSettings}
        className="flex flex-col items-center justify-center min-w-[60px] h-full"
      >
        <div className="w-6 h-6 rounded-full bg-brand-accent flex items-center justify-center text-white font-bold text-[11px] shadow-sm select-none overflow-hidden">
          {userProfile ? (
            userProfile.avatar_url ? (
              <img src={userProfile.avatar_url} alt={userProfile.full_name} className="w-full h-full object-cover" />
            ) : userProfile.avatar_emoji ? (
              userProfile.avatar_emoji
            ) : (
              getInitials(userProfile.full_name)
            )
          ) : (
            'U'
          )}
        </div>
        <span className="text-[10px] mt-1 font-semibold text-zinc-400 truncate max-w-[50px]">
          {userProfile ? userProfile.full_name.split(' ')[0] : 'Grupo'}
        </span>
      </button>

      {/* Logout Action */}
      <button
        onClick={handleSignOut}
        className="flex flex-col items-center justify-center text-zinc-500 hover:text-red-400 min-w-[60px] h-full"
      >
        <LogOut size={20} />
        <span className="text-[10px] mt-1 font-semibold">Sair</span>
      </button>
    </nav>

      {isAlertsSheetOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={() => setIsAlertsSheetOpen(false)}>
          <div 
            className="w-full max-h-[80vh] bg-zinc-950/90 border-t border-zinc-800/80 rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl backdrop-blur-xl animate-slide-up text-zinc-100 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-red-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">Tarefas Próximas ao Vencimento</h3>
              </div>
              <button 
                onClick={() => setIsAlertsSheetOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-all text-xs font-semibold"
              >
                Fechar
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh] no-scrollbar">
              {alerts.map((task) => {
                const priorityColors = {
                  high: 'bg-red-500/20 text-red-400 border-red-500/30',
                  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                };
                
                const formattedDate = task.due_date ? new Date(task.due_date).toLocaleString('pt-BR', { 
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                }) : '';

                return (
                  <div key={task.id} className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl flex items-center justify-between gap-3 hover:bg-zinc-900/80 transition-all">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{task.title}</h4>
                      <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                        <span>Vence em:</span>
                        <span className="font-bold text-zinc-400">{formattedDate}</span>
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}`}>
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
