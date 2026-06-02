import React from 'react';
import { supabase } from '../lib/supabase';
import { useCustomModal } from './CustomModals';
import {
  Kanban,
  LogOut,
  User,
  Plus,
  Bell,
  Clock,
  Sparkles,
  Layers,
  Settings2,
  FolderKanban,
  Trash2,
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
  alertPreference: '24h' | '48h' | '7d';
  setAlertPreference: (pref: '24h' | '48h' | '7d') => void;
  userId: string;
  alerts: any[];

  // Novos props de Projetos
  projects: any[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  onCreateProject: (title: string, description?: string) => void;
  projectMembers: any[];
  onAddProjectMember: (email: string) => Promise<boolean>;
  onRemoveProjectMember: (userId: string) => void;
  allProfiles: any[];
  filterAssigneeId: string;
  setFilterAssigneeId: (id: string) => void;
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
  projects,
  activeProjectId,
  setActiveProjectId,
  onCreateProject,
  projectMembers,
  onAddProjectMember,
  onRemoveProjectMember,
  allProfiles = [],
  filterAssigneeId,
  setFilterAssigneeId,
  onOpenProfileSettings,
}) => {
  const { confirm, prompt } = useCustomModal();
  
  // Estado para controlar a abertura da caixa de seleção e o usuário selecionado
  const [isAddingMember, setIsAddingMember] = React.useState(false);
  const [selectedMemberEmail, setSelectedMemberEmail] = React.useState('');

  const nonMembers = allProfiles.filter(
    (profile) => !projectMembers.some((member) => member.id === profile.id)
  );

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr + 'T00:00:00');
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Atrasado';
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    return `Em ${diffDays} dias`;
  };

  return (
    <aside className="w-68 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen shrink-0 hidden lg:flex">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent">
          <Kanban size={18} />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Trello<span className="text-brand-accent">Fake</span>
        </span>
      </div>

      {/* Main Left Pane Content */}
      <div className="flex-1 px-4 py-5 space-y-6 overflow-y-auto no-scrollbar">
        {/* Projetos / Workspace Area */}
        <div className="space-y-3 pb-3 border-b border-zinc-900/80">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <FolderKanban size={12} className="text-zinc-600" />
              <span>Meus Projetos</span>
            </span>
            <button
              onClick={async () => {
                const title = await prompt('Qual o nome do novo Projeto?', 'Digite o título do projeto');
                if (title && title.trim()) {
                  const desc = await prompt('Descrição do Projeto (Opcional):', 'Digite uma breve descrição');
                  onCreateProject(title.trim(), desc?.trim() || undefined);
                }
              }}
              title="Novo Projeto"
              className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all active:scale-90"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="px-2">
            <select
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-white rounded-xl py-2 px-3 focus:outline-none focus:border-brand-accent/80 cursor-pointer"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.title}
                </option>
              ))}
            </select>
          </div>
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

        {/* Project Members Area */}
        <div className="space-y-3 pb-3 border-t border-zinc-900/80 pt-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <User size={12} className="text-zinc-600" />
              <span>Participantes ({projectMembers.length})</span>
            </span>
            {!isAddingMember && (
              <button
                onClick={() => {
                  setIsAddingMember(true);
                  if (nonMembers.length > 0) {
                    setSelectedMemberEmail(nonMembers[0].email);
                  }
                }}
                title="Adicionar Participante"
                className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all active:scale-90"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {isAddingMember && (
            <div className="px-2 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
              <div className="text-[10px] font-bold text-zinc-400">Selecionar Usuário:</div>
              {nonMembers.length > 0 ? (
                <>
                  <select
                    value={selectedMemberEmail}
                    onChange={(e) => setSelectedMemberEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-[11px] font-semibold text-white rounded-lg py-1.5 px-2 focus:outline-none focus:border-brand-accent/80 cursor-pointer"
                  >
                    {nonMembers.map((p) => (
                      <option key={p.id} value={p.email}>
                        {p.full_name} ({p.email})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={async () => {
                        if (selectedMemberEmail) {
                          const success = await onAddProjectMember(selectedMemberEmail);
                          if (success) {
                            setIsAddingMember(false);
                            setSelectedMemberEmail('');
                          }
                        }
                      }}
                      className="flex-1 py-1 rounded-md bg-brand-accent hover:bg-brand-accent-hover text-white text-[10px] font-bold transition-all active:scale-95"
                    >
                      Adicionar
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingMember(false);
                        setSelectedMemberEmail('');
                      }}
                      className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold transition-all active:scale-95"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-zinc-500 py-1 space-y-2">
                  <span>Todos os usuários já participam deste projeto!</span>
                  <button
                    onClick={() => setIsAddingMember(false)}
                    className="w-full py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold transition-all"
                  >
                    Voltar
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {projectMembers.map((member) => {
              const isFiltered = filterAssigneeId === member.id;
              return (
                <div
                  key={member.id}
                  onClick={() => {
                    if (isFiltered) {
                      setFilterAssigneeId('');
                    } else {
                      setFilterAssigneeId(member.id);
                    }
                  }}
                  title={isFiltered ? "Clique para limpar filtro" : "Clique para ver apenas as tarefas deste participante"}
                  className={`group/member flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isFiltered
                      ? 'bg-brand-accent/15 border-brand-accent/30 text-white shadow-sm shadow-brand-accent/5'
                      : 'border-zinc-900 bg-zinc-950/20 hover:bg-zinc-900/30'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold uppercase transition-all shrink-0 select-none overflow-hidden ${
                      isFiltered
                        ? 'bg-brand-accent text-white'
                        : 'bg-brand-accent/20 border border-brand-accent/30 text-brand-accent'
                    }`}>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                      ) : member.avatar_emoji ? (
                        member.avatar_emoji
                      ) : (
                        member.full_name ? member.full_name[0] : 'U'
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-semibold text-zinc-300 truncate leading-tight">
                        {member.full_name}
                      </span>
                      <span className="text-[9px] text-zinc-500 truncate leading-none mt-0.5">
                        {member.role === 'owner' ? 'Dono' : 'Membro'}
                      </span>
                    </div>
                  </div>
                  {member.role !== 'owner' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Evitar disparar o filtro ao deletar!
                        onRemoveProjectMember(member.id);
                      }}
                      title="Remover do Projeto"
                      className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-950/20 opacity-0 group-hover/member:opacity-100 transition-all"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            })}
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
