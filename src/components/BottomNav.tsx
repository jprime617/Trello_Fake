import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Bell, Home } from 'lucide-react';
import { useCustomModal } from './CustomModals';
import { getPriorityClasses, getPriorityLabel, type Priority } from '../lib/colors';

interface Board {
  id: string;
  title: string;
}

interface BottomNavProps {
  userProfile: { full_name: string; avatar_emoji?: string; avatar_url?: string } | null;
  onLogout: () => void;
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
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-brand-bg/90 border-t border-brand-border backdrop-blur-lg flex items-center justify-around px-4 z-40 lg:hidden pb-safe">
      {/* Mobile Projects Hub Link */}
      <button
        onClick={() => setActiveProjectId('')}
        className="flex flex-col items-center justify-center text-brand-text-muted hover:text-brand-text active:scale-95 transition-all min-w-[60px] h-full"
        title="Voltar aos Projetos"
      >
        <Home size={20} />
        <span className="text-[10px] mt-1 font-semibold">Projetos</span>
      </button>

      {/* Deadline Alerts Trigger with dynamic red badge */}
      <button
        onClick={handleAlertsClick}
        className={`flex flex-col items-center justify-center relative min-w-[60px] h-full ${
          isAlertsSheetOpen ? 'text-brand-accent' : 'text-brand-text-muted'
        }`}
      >
        <Bell size={20} className={alerts.length > 0 ? 'text-red-400 animate-bounce' : ''} />
        <span className="text-[10px] mt-1 font-semibold">Alertas</span>
        {alerts.length > 0 && (
          <span className="absolute top-[4px] right-[10px] w-4 h-4 rounded-full bg-red-600 text-[9px] font-extrabold text-white flex items-center justify-center border border-brand-bg">
            {alerts.length}
          </span>
        )}
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
        <span className="text-[10px] mt-1 font-semibold text-brand-text-muted truncate max-w-[50px]">
          {userProfile ? userProfile.full_name.split(' ')[0] : 'Grupo'}
        </span>
      </button>

      {/* Logout Action */}
      <button
        onClick={handleSignOut}
        className="flex flex-col items-center justify-center text-brand-text-faint hover:text-red-400 min-w-[60px] h-full"
      >
        <LogOut size={20} />
        <span className="text-[10px] mt-1 font-semibold">Sair</span>
      </button>
    </nav>

      {isAlertsSheetOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={() => setIsAlertsSheetOpen(false)}>
          <div 
            className="w-full max-h-[80vh] bg-brand-bg/90 border-t border-brand-border rounded-t-3xl p-6 flex flex-col gap-4 shadow-2xl backdrop-blur-xl animate-slide-up text-brand-text pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-red-400 animate-pulse" />
                <h3 className="text-sm font-bold text-brand-text">Tarefas Próximas ao Vencimento</h3>
              </div>
              <button
                onClick={() => setIsAlertsSheetOpen(false)}
                className="text-brand-text-faint hover:text-brand-text p-1 rounded-lg hover:bg-brand-card transition-all text-xs font-semibold"
              >
                Fechar
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh] no-scrollbar">
              {alerts.map((task) => {
                const formattedDate = task.due_date ? new Date(task.due_date).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '';

                return (
                  <div key={task.id} className="p-3 bg-brand-card/40 border border-brand-border/60 rounded-xl flex items-center justify-between gap-3 hover:bg-brand-card/80 transition-all">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-brand-text truncate">{task.title}</h4>
                      <p className="text-[10px] text-brand-text-faint mt-1 flex items-center gap-1">
                        <span>Vence em:</span>
                        <span className="font-bold text-brand-text-muted">{formattedDate}</span>
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${getPriorityClasses(task.priority as Priority, 'solid')}`}>
                      {getPriorityLabel(task.priority as Priority)}
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
