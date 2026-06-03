import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Board } from './components/Board';
import { useCustomModal } from './components/CustomModals';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { Logo } from './components/Logo';
import { Loader2, FolderKanban, Plus, Trash2, LogOut, Settings, ArrowRight } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role?: string;
  avatar_emoji?: string;
  theme_color?: string;
  board_background?: string;
  bio?: string;
}

interface Project {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  created_at: string;
}

interface BoardData {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  project_id?: string;
}

function App() {
  const { toast, confirm } = useCustomModal();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Estados de Projetos
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [projectMembers, setProjectMembers] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('');

  // Estados para gerenciar múltiplos quadros (Sprints)
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [boardsLoading, setBoardsLoading] = useState(false);

  // Preferência de Alerta de Prazos: '1h' | '24h' | '48h' | '7d'
  const [alertPreference, setAlertPreference] = useState<'1h' | '24h' | '48h' | '7d'>('48h');

  // Estado de alertas calculados
  const [alerts, setAlerts] = useState<any[]>([]);

  // Estados para gerenciar a abertura unificada de modais
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | undefined>(undefined);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Carregar o perfil do usuário logado
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Se o perfil não for encontrado, tenta criá-lo dinamicamente
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const email = user.email || '';
          const fullName = user.user_metadata?.full_name || email.split('@')[0];
          const avatarUrl = user.user_metadata?.avatar_url || '';

          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({ id: userId, email, full_name: fullName, avatar_url: avatarUrl })
            .select()
            .single();

          if (!insertError && newProfile) {
            setProfile(newProfile);
            return;
          }
        }
        throw error;
      }
      setProfile(data);
    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err.message);
      // Fallback local caso o perfil não exista na tabela e falhe em criar
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setProfile({
            id: userId,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
          });
        }
      } catch (fallbackErr) {
        console.error('Erro no fallback de perfil:', fallbackErr);
      }
    }
  };

  // Carregar todos os Projetos em que participo
  const fetchProjects = async (_userId?: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedProjects = data || [];
      setProjects(loadedProjects);

      if (loadedProjects.length > 0) {
        setActiveProjectId((prev) => {
          if (!prev) return '';
          const exists = loadedProjects.some((p) => p.id === prev);
          return exists ? prev : '';
        });
      } else {
        setActiveProjectId('');
      }
    } catch (err: any) {
      console.error('Erro ao carregar projetos:', err.message);
    }
  };

  // Carregar Membros do Projeto ativo
  const fetchProjectMembers = async (projectId: string) => {
    if (!projectId) return;
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role,
          profiles (
            id,
            full_name,
            email,
            avatar_url,
            avatar_emoji
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const members = (data || [])
        .map((m: any) => ({
          ...m.profiles,
          role: m.role
        }))
        .filter((p) => p.id);

      setProjectMembers(members);
    } catch (err: any) {
      console.error('Erro ao carregar membros do projeto:', err.message);
    }
  };

  // Carregar todos os perfis cadastrados no sistema
  const fetchAllProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setAllProfiles(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar perfis cadastrados:', err.message);
    }
  };

  // Carregar Sprints do Projeto ativo
  const fetchBoards = async (projectId: string) => {
    if (!projectId) return;
    try {
      setBoardsLoading(true);
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedBoards = data || [];
      setBoards(loadedBoards);

      if (loadedBoards.length > 0) {
        setActiveBoardId((prev) => {
          const exists = loadedBoards.some((b) => b.id === prev);
          return exists ? prev : loadedBoards[0].id;
        });
      } else {
        setActiveBoardId('');
      }
    } catch (err: any) {
      console.error('Erro ao carregar sprints:', err.message);
    } finally {
      setBoardsLoading(false);
    }
  };

  // Criar nova Sprint
  const handleCreateBoard = async (title: string, description?: string) => {
    if (!activeProjectId) {
      toast('Selecione ou crie um projeto primeiro!', 'info');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({ title, description, project_id: activeProjectId })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setBoards((prev) => [...prev, data]);
        setActiveBoardId(data.id);
      }
    } catch (err: any) {
      toast('Erro ao criar Sprint: ' + err.message, 'error');
    }
  };

  // Criar Novo Projeto
  const handleCreateProject = async (title: string, description?: string) => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          title,
          description,
          created_by: session.user.id
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        await supabase
          .from('project_members')
          .insert({
            project_id: data.id,
            user_id: session.user.id,
            role: 'owner'
          });

        // Auto-inicializar uma Sprint 1 para o novo projeto
        await supabase
          .from('boards')
          .insert({
            title: 'Sprint 1',
            description: 'Primeiro ciclo de entregas e tarefas do projeto',
            project_id: data.id
          });

        setProjects((prev) => [...prev, data]);
        setActiveProjectId(data.id);
      }
    } catch (err: any) {
      toast('Erro ao criar projeto: ' + err.message, 'error');
    }
  };

  // Excluir Projeto (Apenas Proprietário)
  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    
    const confirmDelete = await confirm(
      `Tem certeza que deseja excluir o projeto "${project.title}"? Todos os quadros, listas e tarefas associados serão permanentemente excluídos.`
    );
    
    if (!confirmDelete) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
        
      if (error) throw error;
      
      toast('Projeto excluído com sucesso!', 'success');
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeProjectId === projectId) {
        setActiveProjectId('');
      }
    } catch (err: any) {
      toast('Erro ao excluir projeto: ' + err.message, 'error');
    }
  };

  // Adicionar Membro por E-mail
  const handleAddProjectMember = async (email: string): Promise<boolean> => {
    if (!activeProjectId) return false;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (profileError || !profileData) {
        toast('Nenhum usuário cadastrado com este e-mail. Peça para ele se cadastrar primeiro!', 'error');
        return false;
      }

      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: activeProjectId,
          user_id: profileData.id,
          role: 'member'
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast('Este usuário já faz parte deste projeto!', 'info');
        } else {
          throw insertError;
        }
        return false;
      }

      fetchProjectMembers(activeProjectId);
      toast(`${profileData.full_name} foi adicionado ao projeto com sucesso!`, 'success');
      return true;
    } catch (err: any) {
      toast('Erro ao adicionar participante: ' + err.message, 'error');
      return false;
    }
  };

  // Remover Membro do Projeto
  const handleRemoveProjectMember = async (memberUserId: string) => {
    if (!activeProjectId) return;
    const project = projects.find((p) => p.id === activeProjectId);
    if (project?.created_by === memberUserId) {
      toast('O proprietário/criador do projeto não pode ser removido.', 'error');
      return;
    }

    const isConfirmed = await confirm('Tem certeza que deseja remover este participante do projeto?');
    if (isConfirmed) {
      try {
        const { error } = await supabase
          .from('project_members')
          .delete()
          .eq('project_id', activeProjectId)
          .eq('user_id', memberUserId);

        if (error) throw error;
        fetchProjectMembers(activeProjectId);
        toast('Membro removido com sucesso!', 'success');
      } catch (err: any) {
        toast('Erro ao remover participante: ' + err.message, 'error');
      }
    }
  };

  // Aplicar tema de cores global ao carregar o perfil
  useEffect(() => {
    if (profile) {
      const themeColor = profile.theme_color || 'indigo';
      const colors: Record<string, { hex: string; hoverHex: string }> = {
        indigo: { hex: '#6366f1', hoverHex: '#4f46e5' },
        violet: { hex: '#8b5cf6', hoverHex: '#7c3aed' },
        fuchsia: { hex: '#d946ef', hoverHex: '#c084fc' },
        rose: { hex: '#ec4899', hoverHex: '#db2777' },
        crimson: { hex: '#f43f5e', hoverHex: '#e11d48' },
        orange: { hex: '#f97316', hoverHex: '#ea580c' },
        amber: { hex: '#f59e0b', hoverHex: '#d97706' },
        emerald: { hex: '#10b981', hoverHex: '#059669' },
        teal: { hex: '#0d9488', hoverHex: '#0f766e' },
        sky: { hex: '#0ea5e9', hoverHex: '#0284c7' },
        slate: { hex: '#64748b', hoverHex: '#475569' },
        bronze: { hex: '#fb7185', hoverHex: '#fda4af' },
      };
      const selected = colors[themeColor] || colors.indigo;
      document.documentElement.style.setProperty('--color-brand-accent', selected.hex);
      document.documentElement.style.setProperty('--color-brand-accent-hover', selected.hoverHex);
    }
  }, [profile]);

  // Carregar e sincronizar dados ao mudar de projeto ativo
  useEffect(() => {
    if (activeProjectId) {
      fetchBoards(activeProjectId);
      fetchProjectMembers(activeProjectId);
      setFilterAssigneeId('');
    }
  }, [activeProjectId]);

  useEffect(() => {
    let active = true;
    let loadedUserId: string | null = null;

    // Escutar mudanças no estado de autenticação (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      setSession(session);

      if (session?.user) {
        const userId = session.user.id;
        if (userId !== loadedUserId) {
          loadedUserId = userId;
          Promise.all([
            fetchUserProfile(userId),
            fetchProjects(userId),
            fetchAllProfiles(),
          ]).catch((err) => {
            console.error('Erro ao carregar dados pós-login:', err);
          });
        }
      } else {
        loadedUserId = null;
        setProfile(null);
        setProjects([]);
        setActiveProjectId('');
        setBoards([]);
        setActiveBoardId('');
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Escutar realtime para Sprints, Projetos e Membros
  useEffect(() => {
    if (!session) return;

    const boardsSubscription = supabase
      .channel('boards-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boards' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBoard = payload.new as BoardData;
            if (newBoard.project_id === activeProjectId) {
              setBoards((prev) => {
                if (prev.some((b) => b.id === newBoard.id)) return prev;
                return [...prev, newBoard];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setBoards((prev) => {
              const updated = prev.filter((b) => b.id !== deleted.id);
              if (activeBoardId === deleted.id && updated.length > 0) {
                setActiveBoardId(updated[0].id);
              }
              return updated;
            });
          }
        }
      )
      .subscribe();

    const projectsSubscription = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProj = payload.new as Project;
            setProjects((prev) => {
              if (prev.some((p) => p.id === newProj.id)) return prev;
              return [...prev, newProj];
            });
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setProjects((prev) => prev.filter((p) => p.id !== deleted.id));
            if (activeProjectId === deleted.id) {
              setActiveProjectId('');
            }
          }
        }
      )
      .subscribe();

    const membersSubscription = supabase
      .channel('members-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members' },
        (_payload) => {
          if (activeProjectId) {
            fetchProjectMembers(activeProjectId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(boardsSubscription);
      supabase.removeChannel(projectsSubscription);
      supabase.removeChannel(membersSubscription);
    };
  }, [session, activeProjectId, activeBoardId]);

  const handleLogout = () => {
    setSession(null);
    setProfile(null);
    setProjects([]);
    setActiveProjectId('');
    setBoards([]);
    setActiveBoardId('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-screen bg-brand-bg flex flex-col items-center justify-center text-zinc-500 gap-3">
        <Loader2 className="animate-spin text-brand-accent" size={36} />
        <span className="text-sm font-semibold tracking-wider">Autenticando sessão...</span>
      </div>
    );
  }

  // Se o usuário não estiver logado, exibe a tela de login
  if (!session) {
    return (
      <Login
        onAuthSuccess={() => {
          // Detectado automaticamente
        }}
      />
    );
  }

  // Se o usuário não tiver selecionado um projeto ativo, exibe a página principal (Project Hub)
  if (session && !activeProjectId) {
    const handleSignOut = async () => {
      try {
        await supabase.auth.signOut();
        handleLogout();
      } catch (err: any) {
        toast('Erro ao sair: ' + err.message, 'error');
      }
    };

    return (
      <div className="min-h-screen bg-brand-bg text-zinc-100 font-sans flex flex-col relative overflow-hidden">
        {/* Background Gradient effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Header bar */}
        <header className="border-b border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <span className="text-xl font-bold tracking-tight text-white">
              Trello<span className="text-brand-accent">Fake</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-sm font-medium text-zinc-300">
                {profile?.avatar_emoji || '👋'} Olá, <span className="text-white font-bold">{profile?.full_name || profile?.email || 'Usuário'}</span>
              </span>
            </div>
            
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all active:scale-95"
              title="Configurações de Perfil"
            >
              <Settings size={18} />
            </button>
            
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all active:scale-95"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-12 relative z-10 flex flex-col justify-start overflow-y-auto">
          <div className="mb-10 text-left">
            <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
              Seus <span className="text-brand-accent">Projetos</span>
            </h1>
            <p className="mt-3 text-lg text-zinc-400 max-w-2xl">
              Crie um novo espaço de trabalho ou entre em um projeto compartilhado com você para gerenciar suas tarefas e Sprints.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Grid of Projects (left 2/3 on desktop) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <FolderKanban size={16} className="text-zinc-500" />
                  <span>Projetos Disponíveis ({projects.length})</span>
                </h2>
              </div>

              {projects.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl border border-zinc-800/80 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-600">
                    <FolderKanban size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Nenhum projeto encontrado</h3>
                  <p className="text-sm text-zinc-400 max-w-md">
                    Você ainda não criou nenhum projeto e não foi adicionado como participante em projetos de outros usuários. Crie o seu primeiro projeto ao lado para começar!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((proj) => {
                    const isOwner = proj.created_by === session.user.id;
                    return (
                      <div 
                        key={proj.id}
                        onClick={() => setActiveProjectId(proj.id)}
                        className="group glass-panel p-6 rounded-2xl border border-zinc-800/80 hover:border-brand-accent/50 hover:bg-zinc-900/30 transition-all duration-300 cursor-pointer flex flex-col h-56 justify-between relative overflow-hidden"
                      >
                        {/* Hover accent glow */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border tracking-wider ${
                              isOwner 
                                ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20' 
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                              {isOwner ? 'Dono' : 'Membro'}
                            </span>
                            
                            {isOwner && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleDeleteProject(proj.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Excluir Projeto"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                          
                          <h3 className="text-xl font-bold text-white group-hover:text-brand-accent transition-colors line-clamp-1">
                            {proj.title}
                          </h3>
                          
                          <p className="text-sm text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                            {proj.description || 'Sem descrição cadastrada.'}
                          </p>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between border-t border-zinc-900 pt-3">
                          <span className="text-[11px] text-zinc-500 font-medium">
                            Criado em: {new Date(proj.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="text-sm font-bold text-brand-accent flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Entrar <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create Project Panel (right 1/3 on desktop) */}
            <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/20 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="text-brand-accent" size={20} />
                <span>Criar Novo Projeto</span>
              </h2>
              
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  const title = formData.get('title') as string;
                  const description = formData.get('description') as string;
                  
                  if (title && title.trim()) {
                    await handleCreateProject(title.trim(), description?.trim() || undefined);
                    form.reset();
                  } else {
                    toast('Por favor, informe o título do projeto.', 'error');
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label htmlFor="title" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Título do Projeto
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    placeholder="Ex: App Web Trello"
                    className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent/80 transition-all placeholder:text-zinc-600"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label htmlFor="description" className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Descrição (Opcional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="Descreva brevemente os objetivos deste projeto..."
                    className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white rounded-xl py-3 px-4 focus:outline-none focus:border-brand-accent/80 transition-all placeholder:text-zinc-600 resize-none"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-zinc-950 font-bold text-sm transition-all duration-300 shadow-lg shadow-brand-accent/10 active:scale-[0.98]"
                >
                  Criar e Acessar Projeto
                </button>
              </form>
            </div>
          </div>
        </main>
        
        {/* Profile Settings Modal */}
        <ProfileSettingsModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          userProfile={profile}
          onProfileUpdate={() => profile && fetchUserProfile(profile.id)}
          userId={session.user.id}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-brand-bg text-zinc-100 font-sans">
      {/* Desktop Sidebar (visível apenas a partir de md/lg) */}
      <Sidebar
        userProfile={profile}
        onLogout={handleLogout}
        onAddColumnClick={() => setIsColumnModalOpen(true)}
        onAddTaskClick={() => setIsCardModalOpen(true)}
        boards={boards}
        activeBoardId={activeBoardId}
        setActiveBoardId={setActiveBoardId}
        onCreateBoard={handleCreateBoard}
        boardsLoading={boardsLoading}
        alertPreference={alertPreference}
        setAlertPreference={setAlertPreference}
        userId={session.user.id}
        alerts={alerts}
        // Novos props de Projetos
        setActiveProjectId={setActiveProjectId}
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
      />

      {/* Main Board view */}
      <Board
        isColumnModalOpen={isColumnModalOpen}
        setIsColumnModalOpen={setIsColumnModalOpen}
        isCardModalOpen={isCardModalOpen}
        setIsCardModalOpen={setIsCardModalOpen}
        selectedColumnId={selectedColumnId}
        setSelectedColumnId={setSelectedColumnId}
        activeBoardId={activeBoardId}
        boards={boards}
        setActiveBoardId={setActiveBoardId}
        onCreateBoard={handleCreateBoard}
        alertPreference={alertPreference}
        userId={session.user.id}
        onAlertsCalculated={setAlerts}
        projectMembers={projectMembers}
        onAddProjectMember={handleAddProjectMember}
        onRemoveProjectMember={handleRemoveProjectMember}
        allProfiles={allProfiles}
        filterAssigneeId={filterAssigneeId}
        setFilterAssigneeId={setFilterAssigneeId}
        boardBackground={profile?.board_background}
      />

      {/* Mobile Bottom Navigation (visível apenas em dispositivos móveis) */}
      <BottomNav
        userProfile={profile}
        onLogout={handleLogout}
        boards={boards}
        activeBoardId={activeBoardId}
        setActiveBoardId={setActiveBoardId}
        onCreateBoard={handleCreateBoard}
        alertPreference={alertPreference}
        setAlertPreference={setAlertPreference}
        userId={session.user.id}
        alerts={alerts}
        // Novos props de Projetos
        setActiveProjectId={setActiveProjectId}
        onOpenProfileSettings={() => setIsProfileModalOpen(true)}
      />

      {/* Modal de Configurações de Perfil */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={profile}
        onProfileUpdate={() => profile && fetchUserProfile(profile.id)}
        userId={session.user.id}
      />
    </div>
  );
}

export default App;
