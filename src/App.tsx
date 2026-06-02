import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Board } from './components/Board';
import { useCustomModal } from './components/CustomModals';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { Loader2 } from 'lucide-react';

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

  // Preferência de Alerta de Prazos: '24h' | '48h' | '7d'
  const [alertPreference, setAlertPreference] = useState<'24h' | '48h' | '7d'>('48h');

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
  const fetchProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      let loadedProjects = data || [];

      // Auto-inicializar Projeto Geral se nenhum existir
      if (loadedProjects.length === 0) {
        const { data: newProj, error: createError } = await supabase
          .from('projects')
          .insert({
            title: 'Projeto Geral',
            description: 'Meu primeiro projeto kanban',
            created_by: userId
          })
          .select()
          .single();

        if (!createError && newProj) {
          await supabase
            .from('project_members')
            .insert({
              project_id: newProj.id,
              user_id: userId,
              role: 'owner'
            });

          // Migrar boards existentes que não pertencem a nenhum projeto
          await supabase
            .from('boards')
            .update({ project_id: newProj.id })
            .is('project_id', null);

          loadedProjects = [newProj];
        }
      }

      setProjects(loadedProjects);

      if (loadedProjects.length > 0) {
        setActiveProjectId((prev) => {
          const exists = loadedProjects.some((p) => p.id === prev);
          return exists ? prev : loadedProjects[0].id;
        });
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
    // 1. Obter sessão atual de forma assíncrona
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchProjects(session.user.id);
        fetchAllProfiles();
      }
      setAuthLoading(false);
    });

    // 2. Escutar mudanças no estado de autenticação (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchProjects(session.user.id);
        fetchAllProfiles();
      } else {
        setProfile(null);
        setProjects([]);
        setActiveProjectId('');
        setBoards([]);
        setActiveBoardId('');
      }
      setAuthLoading(false);
    });

    return () => {
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
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        onCreateProject={handleCreateProject}
        projectMembers={projectMembers}
        onAddProjectMember={handleAddProjectMember}
        onRemoveProjectMember={handleRemoveProjectMember}
        allProfiles={allProfiles}
        filterAssigneeId={filterAssigneeId}
        setFilterAssigneeId={setFilterAssigneeId}
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
        onAddColumnClick={() => setIsColumnModalOpen(true)}
        onAddTaskClick={() => setIsCardModalOpen(true)}
        boards={boards}
        activeBoardId={activeBoardId}
        setActiveBoardId={setActiveBoardId}
        onCreateBoard={handleCreateBoard}
        alertPreference={alertPreference}
        setAlertPreference={setAlertPreference}
        userId={session.user.id}
        alerts={alerts}
        // Novos props de Projetos
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        onCreateProject={handleCreateProject}
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
