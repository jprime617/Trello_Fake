import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Board } from './components/Board';
import { Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Estados para gerenciar a abertura unificada de modais a partir de Sidebar e BottomNav
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | undefined>(undefined);

  // Carregar o perfil do usuário logado
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err.message);
    }
  };

  useEffect(() => {
    // 1. Obter sessão atual de forma assíncrona
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
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
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = () => {
    setSession(null);
    setProfile(null);
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
          // A sessão será detectada pelo listener onAuthStateChange
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
      />

      {/* Main Board view */}
      <Board
        isColumnModalOpen={isColumnModalOpen}
        setIsColumnModalOpen={setIsColumnModalOpen}
        isCardModalOpen={isCardModalOpen}
        setIsCardModalOpen={setIsCardModalOpen}
        selectedColumnId={selectedColumnId}
        setSelectedColumnId={setSelectedColumnId}
      />

      {/* Mobile Bottom Navigation (visível apenas em dispositivos móveis) */}
      <BottomNav
        userProfile={profile}
        onLogout={handleLogout}
        onAddColumnClick={() => setIsColumnModalOpen(true)}
        onAddTaskClick={() => setIsCardModalOpen(true)}
      />
    </div>
  );
}

export default App;
