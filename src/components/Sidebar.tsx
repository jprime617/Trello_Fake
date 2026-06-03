import React from 'react';
import { supabase } from '../lib/supabase';
import { useCustomModal } from './CustomModals';
import { Logo } from './Logo';
import {
  LogOut,
  User,
  Plus,
  Bell,
  Clock,
  Sparkles,
  Layers,
  Settings2,
  Home,
} from 'lucide-react';

interface Board {
  id: string;
  title: string;
  description?: string;
  created_at: string;
}

interface SidebarProps {
  userProfile: { full_name: string; email: string; avatar_emoji?: string; theme_color?: string; avatar_url?: string } | null;
  onLogout: () => void;
  onAddColumnClick: () => void;
  onAddTaskClick: () => void;
  boards: Board[];
  activeBoardId: string;
  setActiveBoardId: (id: string) => void;
  onCreateBoard: (title: string, description?: string) => void;
  boardsLoading: boolean;
  alertPreference: '1h' | '24h' | '48h' | '7d';
  setAlertPreference: (pref: '1h' | '24h' | '48h' | '7d') => void;
  userId: string;
  alerts: any[];

  // Novos props de Projetos
  setActiveProjectId: (id: string) => void;
  onOpenProfileSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  userProfile,
  onLogout,
  boards,
  activeBoardId,
  setActiveBoardId,
  onCreateBoard,
  alertPreference,
  setAlertPreference,
  alerts,
  setActiveProjectId,
  onOpenProfileSettings,
}) => {
  const { confirm, prompt } = useCustomModal();

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
    const isConfirmed = await confirm('Deseja realmente sair da sua conta?');
    if (isConfirmed) {
      await supabase.auth.signOut();
      onLogout();
    }
  };

  const handleCreateSprint = async () => {
    const title = await prompt('Qual o nome da nova Sprint?', 'Ex: Sprint 2 - Banco de Dados');
    if (title && title.trim()) {
      const desc = await prompt('Descrição da Sprint (Opcional):', 'Foco ou objetivos desta sprint');
      onCreateBoard(title.trim(), desc?.trim() || undefined);
    }
  };

  const formatTimeLeft = (dateStr?: string) => {
    if (!dateStr) return '';
    const now = new Date();
    const dueDate = new Date(dateStr);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);

    if (diffHours < 0) return 'Atrasado';
    if (diffHours <= 1) return 'Em minutos';
    if (diffHours <= 24) return `Em ${Math.round(diffHours)} horas`;
    const diffDays = Math.ceil(diffHours / 24);
    if (diffDays === 1) return 'Amanhã';
    return `Em ${diffDays} dias`;
  };

  return (
    <aside className="w-68 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen shrink-0 hidden lg:flex">
      <div className="p-5 border-b border-zinc-800/80 flex items-center gap-3">
        <Logo size={32} />
        <span className="text-lg font-bold text-white tracking-tight">
          Trello<span className="text-brand-accent">Fake</span>
        </span>
      </div>

      {/* Main Left Pane Content */}
      <div className="flex-1 px-4 py-5 space-y-6 overflow-y-auto no-scrollbar">
        {/* Link de Navegação para a Home de Projetos */}
        <div className="pb-3 border-b border-zinc-900/80">
          <button
            onClick={() => setActiveProjectId('')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800/50 transition-all font-bold text-xs uppercase tracking-wider active:scale-[0.98]"
          >
            <Home size={14} className="text-brand-accent" />
            <span>Voltar aos Projetos</span>
          </button>
        </div>

        {/* Sprints List Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Layers size={12} className="text-zinc-600" />
              <span>Sprints / Áreas</span>
            </span>
            <button
              onClick={handleCreateSprint}
              title="Nova Sprint"
              className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all active:scale-90"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {boards.length > 0 ? (
              boards.map((b) => {
                const isActive = b.id === activeBoardId;
                return (
                  <button
                    key={b.id}
                    onClick={() => setActiveBoardId(b.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-brand-accent/10 border border-brand-accent/30 text-white'
                        : 'border border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand-accent animate-pulse' : 'bg-zinc-700'}`} />
                    <span className="truncate flex-1">{b.title}</span>
                  </button>
                );
              })
            ) : (
              <span className="text-[11px] text-zinc-600 pl-3">Nenhuma Sprint</span>
            )}
          </div>
        </div>



        {/* Deadline Alerts Panel */}
        <div className="space-y-3 border-t border-zinc-900/80 pt-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Bell size={12} className="text-zinc-600" />
              <span>Alertas de Prazos</span>
            </span>
            {alerts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-950 border border-red-800/80 text-[9px] font-extrabold text-red-300 animate-pulse">
                {alerts.length}
              </span>
            )}
          </div>

          {/* Settings for notification frequency */}
          <div className="px-2 pb-1.5 flex items-center gap-2 border-b border-zinc-900">
            <Settings2 size={12} className="text-zinc-600 shrink-0" />
            <select
              value={alertPreference}
              onChange={(e) => setAlertPreference(e.target.value as any)}
              className="bg-transparent text-[11px] font-bold text-zinc-400 focus:outline-none cursor-pointer hover:text-white transition-colors"
            >
              <option value="24h">Prazo em 24 Horas</option>
              <option value="48h">Prazo em 48 Horas</option>
              <option value="7d">Prazo em 1 Semana</option>
            </select>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {alerts.length > 0 ? (
              alerts.map((task) => {
                const isOver = formatTimeLeft(task.due_date) === 'Atrasado';
                return (
                  <div
                    key={task.id}
                    className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                      isOver
                        ? 'bg-red-950/20 border-red-900/30'
                        : 'bg-zinc-900/40 border-zinc-800/40'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-white truncate leading-snug">
                      {task.title}
                    </span>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className={`px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider ${
                        task.priority === 'high'
                          ? 'text-red-400 bg-red-950/40'
                          : task.priority === 'medium'
                          ? 'text-amber-400 bg-amber-950/40'
                          : 'text-emerald-400 bg-emerald-950/40'
                      }`}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                      <span className={`font-semibold flex items-center gap-1 ${isOver ? 'text-red-400' : 'text-zinc-500'}`}>
                        <Clock size={10} />
                        <span>{formatTimeLeft(task.due_date)}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-16 border border-dashed border-zinc-900 rounded-xl flex flex-col items-center justify-center text-zinc-700 text-[10px] gap-1 bg-zinc-950/20 select-none">
                <Sparkles size={12} className="text-zinc-800" />
                <span>Nenhum alerta pendente</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/50 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-md shrink-0 select-none overflow-hidden">
            {userProfile ? (
              userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt={userProfile.full_name} className="w-full h-full object-cover" />
              ) : userProfile.avatar_emoji ? (
                userProfile.avatar_emoji
              ) : (
                getInitials(userProfile.full_name)
              )
            ) : (
              <User size={18} />
            )}
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
            onClick={onOpenProfileSettings}
            title="Customizar Aparência & Perfil"
            className="p-2 rounded-lg text-zinc-500 hover:text-brand-accent hover:bg-zinc-800/50 transition-all shrink-0"
          >
            <Settings2 size={16} />
          </button>
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
