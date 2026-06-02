import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCustomModal } from './CustomModals';
import { 
  X, 
  User, 
  Palette, 
  Image as ImageIcon, 
  FileText, 
  Loader2, 
  Sparkles, 
  Camera, 
  Trash2, 
  Lock, 
  KeyRound, 
  Mail,
  Bell
} from 'lucide-react';
import {
  registerPushNotifications,
  unregisterPushNotifications,
  getNotificationPermissionStatus
} from '../lib/pushNotifications';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_emoji?: string;
  theme_color?: string;
  board_background?: string;
  bio?: string;
  avatar_url?: string;
  alert_preference?: string;
}

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: Profile | null;
  onProfileUpdate: () => void;
  userId: string;
}

const EMOJIS = [
  // Identidade / Profissões
  '👤', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '👨‍🚀', '👩‍🚀', '🥷', '🦸‍♂️', '🦸‍♀️',
  // Tecnologia & Criatividade
  '💻', '🎨', '🚀', '👾', '🎮', '💡', '🔥', '📈', '🧩', '🧪',
  // Conquistas & Hobbies
  '🏆', '🎖️', '🌟', '🎸', '📷', '🍕', '☕', '🍿', '🎬', '📚',
  // Símbolos & Elementos
  '⚡', '🛡️', '🔑', '💎', '🌈', '🍀', '🔮', '🎯', '📢', '🌍',
  // Animais & Fantasia
  '🐱', '🦊', '🐨', '🐸', '🐼', '🦄', '🦁', '🐉', '🐙', '🦉'
];

const THEME_COLORS = [
  { id: 'indigo', label: 'Índigo (Padrão)', hex: '#6366f1', hoverHex: '#4f46e5' },
  { id: 'violet', label: 'Violeta', hex: '#8b5cf6', hoverHex: '#7c3aed' },
  { id: 'fuchsia', label: 'Fúcsia', hex: '#d946ef', hoverHex: '#c084fc' },
  { id: 'rose', label: 'Cereja', hex: '#ec4899', hoverHex: '#db2777' },
  { id: 'crimson', label: 'Carmesim', hex: '#f43f5e', hoverHex: '#e11d48' },
  { id: 'orange', label: 'Laranja', hex: '#f97316', hoverHex: '#ea580c' },
  { id: 'amber', label: 'Âmbar', hex: '#f59e0b', hoverHex: '#d97706' },
  { id: 'emerald', label: 'Esmeralda', hex: '#10b981', hoverHex: '#059669' },
  { id: 'teal', label: 'Turquesa', hex: '#0d9488', hoverHex: '#0f766e' },
  { id: 'sky', label: 'Celeste', hex: '#0ea5e9', hoverHex: '#0284c7' },
  { id: 'slate', label: 'Metal Escuro', hex: '#64748b', hoverHex: '#475569' },
  { id: 'bronze', label: 'Bronze Rosado', hex: '#fb7185', hoverHex: '#fda4af' },
];

const BOARD_BACKGROUNDS = [
  { id: 'zinc', label: 'Grafite Sólido', class: 'bg-zinc-950', preview: 'bg-zinc-900 border border-zinc-800' },
  { id: 'obsidian', label: 'Obsidiana Negra', class: 'bg-[#020617]', preview: 'bg-gray-950 border border-gray-900' },
  { id: 'sunset', label: 'Crepúsculo Roxo', class: 'bg-gradient-to-tr from-purple-950/60 via-zinc-950 to-pink-950/20', preview: 'bg-gradient-to-tr from-purple-900 via-zinc-900 to-pink-900' },
  { id: 'ocean', label: 'Abismo Oceânico', class: 'bg-gradient-to-tr from-blue-950/60 via-zinc-950 to-cyan-950/20', preview: 'bg-gradient-to-tr from-blue-900 via-zinc-900 to-cyan-900' },
  { id: 'aurora', label: 'Aurora Boreal', class: 'bg-gradient-to-tr from-emerald-950/60 via-zinc-950 to-teal-950/20', preview: 'bg-gradient-to-tr from-emerald-900 via-zinc-900 to-teal-900' },
  { id: 'cosmic', label: 'Nebulosa Cósmica', class: 'bg-gradient-to-tr from-violet-950/60 via-zinc-950 to-indigo-950/20', preview: 'bg-gradient-to-tr from-violet-900 via-zinc-900 to-indigo-900' },
  { id: 'cyberpunk', label: 'Neon Cyberpunk', class: 'bg-gradient-to-tr from-fuchsia-950/60 via-zinc-950 to-yellow-950/20', preview: 'bg-gradient-to-tr from-fuchsia-900 via-zinc-900 to-yellow-900' },
  { id: 'forest', label: 'Pinho & Névoa', class: 'bg-gradient-to-tr from-emerald-950/60 via-zinc-950 to-emerald-950/15', preview: 'bg-gradient-to-tr from-emerald-900 via-zinc-900 to-emerald-950' },
  { id: 'volcano', label: 'Magma Profundo', class: 'bg-gradient-to-tr from-red-950/60 via-zinc-950 to-amber-950/20', preview: 'bg-gradient-to-tr from-red-900 via-zinc-900 to-amber-900' },
  { id: 'lavender', label: 'Névoa de Lavanda', class: 'bg-gradient-to-tr from-purple-950/50 via-zinc-950 to-sky-950/25', preview: 'bg-gradient-to-tr from-purple-900 via-zinc-900 to-sky-900' },
];

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdate,
  userId,
}) => {
  const { toast } = useCustomModal();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  
  // Estados da Aba de Personalização
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emoji, setEmoji] = useState('👤');
  const [themeColor, setThemeColor] = useState('indigo');
  const [boardBg, setBoardBg] = useState('zinc');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Estados da Aba de Segurança/Conta
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Estados da Aba de Notificações
  const [alertPref, setAlertPref] = useState('48h');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [registeringNotification, setRegisteringNotification] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default'>('default');

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || '');
      setEmoji(userProfile.avatar_emoji || '👤');
      setThemeColor(userProfile.theme_color || 'indigo');
      setBoardBg(userProfile.board_background || 'zinc');
      setBio(userProfile.bio || '');
      setAvatarUrl(userProfile.avatar_url || '');
      setNewEmail(userProfile.email || '');
      setAlertPref(userProfile.alert_preference || '48h');

      getNotificationPermissionStatus().then((status) => {
        setPermissionStatus(status);
        setNotificationsEnabled(status === 'granted' && !!localStorage.getItem('fcm_token'));
      });
    }
  }, [userProfile, isOpen]);

  const handleToggleNotifications = async () => {
    try {
      setRegisteringNotification(true);
      if (notificationsEnabled) {
        await unregisterPushNotifications();
        setNotificationsEnabled(false);
        toast('Notificações push desativadas para este dispositivo.', 'success');
      } else {
        await registerPushNotifications(userId);
        setNotificationsEnabled(true);
        setPermissionStatus('granted');
        toast('Notificações push ativadas com sucesso neste dispositivo!', 'success');
      }
    } catch (err: any) {
      toast('Erro ao configurar notificações: ' + err.message, 'error');
    } finally {
      setRegisteringNotification(false);
    }
  };

  if (!isOpen) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image')) {
      toast('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast('A foto deve ter no máximo 5MB.', 'error');
      return;
    }

    try {
      setUploadingPhoto(true);
      const fileExt = file.name.split('.').pop() || '';
      const uniqueFileName = `${userId}/${Date.now()}.${fileExt}`;
      const filePath = `avatars/${uniqueFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('attachments').getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast('Foto de perfil carregada com sucesso!', 'success');
    } catch (err: any) {
      toast('Erro ao carregar foto: ' + err.message, 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
    toast('Foto de perfil removida. O emoji selecionado será exibido.', 'success');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast('Por favor, preencha o seu nome completo.', 'error');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          avatar_emoji: emoji,
          avatar_url: avatarUrl || null,
          theme_color: themeColor,
          board_background: boardBg,
          bio: bio.trim() || null,
          alert_preference: alertPref,
        })
        .eq('id', userId);

      if (error) throw error;

      // Aplicar o tema de cores instantaneamente na janela global
      const selectedColor = THEME_COLORS.find(c => c.id === themeColor);
      if (selectedColor) {
        document.documentElement.style.setProperty('--color-brand-accent', selectedColor.hex);
        document.documentElement.style.setProperty('--color-brand-accent-hover', selectedColor.hoverHex);
      }

      toast('Perfil personalizado com sucesso!', 'success');
      onProfileUpdate();
      onClose();
    } catch (err: any) {
      toast('Erro ao atualizar configurações de perfil: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast('Por favor, preencha todos os campos da senha.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('As novas senhas digitadas não coincidem.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('A nova senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast('Sua senha foi atualizada com sucesso!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast('Erro ao atualizar senha: ' + err.message, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast('Por favor, insira um e-mail válido.', 'error');
      return;
    }
    if (newEmail.trim().toLowerCase() === userProfile?.email?.toLowerCase()) {
      toast('Por favor, insira um e-mail diferente do seu e-mail atual.', 'error');
      return;
    }

    try {
      setEmailLoading(true);
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim().toLowerCase(),
      });

      if (error) throw error;

      toast('Solicitação enviada! Um link de confirmação foi enviado para o novo e-mail.', 'success');
      onProfileUpdate();
    } catch (err: any) {
      toast('Erro ao atualizar e-mail: ' + err.message, 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-zinc-100">
      <div className="w-full max-w-xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-zoom-in">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40 shrink-0">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Sparkles size={16} className="text-yellow-500 animate-pulse" />
            <span>Configurações do Usuário</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800/80 rounded-xl shrink-0 mx-6 mt-4">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-brand-accent text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Palette size={14} />
            <span className="hidden sm:inline">Personalização & Tema</span>
            <span className="inline sm:hidden">Tema</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'notifications'
                ? 'bg-brand-accent text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Bell size={14} />
            <span className="hidden sm:inline">Notificações</span>
            <span className="inline sm:hidden">Avisos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'security'
                ? 'bg-brand-accent text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Lock size={14} />
            <span className="hidden sm:inline">Conta & Segurança</span>
            <span className="inline sm:hidden">Conta</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSave} className="p-6 space-y-6">
              
              {/* 1. SEÇÃO DE DADOS BÁSICOS & EMOJI */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <User size={12} className="text-zinc-600" />
                  <span>Identidade & Avatar</span>
                </span>

                <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
                  {/* Visualizador de Avatar com Imagem ou Emoji Grande */}
                  <div className="relative group shrink-0 mx-auto md:mx-0">
                    <div className="w-20 h-20 rounded-2xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-4xl shadow-lg shadow-brand-accent/5 select-none transition-transform group-hover:scale-105 duration-300 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Foto de Perfil" className="w-full h-full object-cover" />
                      ) : (
                        emoji
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-zinc-900 border border-zinc-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-zinc-400">
                      {avatarUrl ? 'Foto' : 'Emoji'}
                    </span>
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        Seu Nome Exibido
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Prof. Milena"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-xs font-semibold"
                      />
                    </div>

                    {/* Botões de Ação para Carregar Imagem */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <input
                        type="file"
                        accept="image/*"
                        id="avatar-file-upload"
                        disabled={uploadingPhoto}
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="avatar-file-upload"
                        className="px-3 py-2 bg-brand-accent/20 hover:bg-brand-accent border border-brand-accent/40 hover:border-brand-accent text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 select-none"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="animate-spin" size={12} />
                        ) : (
                          <Camera size={12} />
                        )}
                        <span>{uploadingPhoto ? 'Carregando...' : 'Enviar Foto'}</span>
                      </label>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-2 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 hover:border-red-500 text-red-400 hover:text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm select-none"
                        >
                          <Trash2 size={12} />
                          <span>Remover Foto</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seletor Curado de Emojis */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Escolha um Emoji para seu Perfil
                  </label>
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEmoji(e)}
                        className={`h-9 w-9 rounded-lg flex items-center justify-center text-lg transition-all hover:bg-zinc-850 hover:scale-110 active:scale-95 ${
                          emoji === e ? 'bg-brand-accent/20 border border-brand-accent/50 scale-105' : 'bg-transparent border border-transparent text-zinc-300'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. SEÇÃO DE TEMA DO SISTEMA */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <Palette size={12} className="text-zinc-600" />
                  <span>Paleta de Cores do Tema</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEME_COLORS.map((color) => {
                    const isSelected = themeColor === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setThemeColor(color.id)}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left active:scale-[0.98] ${
                          isSelected 
                            ? 'bg-zinc-900 border-zinc-700 shadow-md shadow-black/30' 
                            : 'bg-zinc-900/30 border-zinc-900/80 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span 
                          className="w-4 h-4 rounded-full border border-black/40 shrink-0 block"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-xs font-bold truncate">
                          {color.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. SEÇÃO DE PLANO DE FUNDO DO QUADRO (BOARD BACKGROUND) */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <ImageIcon size={12} className="text-zinc-600" />
                  <span>Plano de Fundo dos Quadros</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {BOARD_BACKGROUNDS.map((bg) => {
                    const isSelected = boardBg === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setBoardBg(bg.id)}
                        className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all text-left active:scale-[0.98] ${
                          isSelected 
                            ? 'bg-zinc-900 border-zinc-700 shadow-md shadow-black/30' 
                            : 'bg-zinc-900/30 border-zinc-900/80 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className={`w-full h-12 rounded-lg ${bg.preview} relative overflow-hidden`}>
                          {isSelected && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-[9px] font-extrabold uppercase text-white bg-brand-accent px-1.5 py-0.5 rounded-md">Ativo</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-white px-0.5">
                          {bg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. BIOGRAFIA & APRESENTAÇÃO */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <FileText size={12} className="text-zinc-600" />
                  <span>Minha Apresentação (Bio)</span>
                </span>

                <div className="space-y-1">
                  <textarea
                    placeholder="Conte um pouco sobre suas responsabilidades ou cargo no projeto (ex: Desenvolvedora Frontend, Docente Orientadora)..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-xs resize-none font-light leading-relaxed text-zinc-100"
                  />
                </div>
              </div>

            </form>
          ) : activeTab === 'notifications' ? (
            <div className="p-6 space-y-6 animate-fade-in">
              
              {/* Preferência de Prazos */}
              <div className="space-y-4 p-5 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <Bell size={12} className="text-zinc-600" />
                  <span>Alertas de Prazos (Kanban)</span>
                </span>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">
                    Quando alertar sobre prazos de tarefas?
                  </label>
                  <select
                    value={alertPref}
                    onChange={(e) => setAlertPref(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-xs font-semibold"
                  >
                    <option value="1h">No dia do prazo (1 hora antes)</option>
                    <option value="24h">24 horas antes (1 dia)</option>
                    <option value="48h">48 horas antes (2 dias)</option>
                    <option value="7d">7 dias antes (1 semana)</option>
                  </select>
                  <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
                    Escolha com quanta antecedência deseja que o sistema agende os alertas de vencimento para as tarefas atribuídas a você.
                  </p>
                </div>
              </div>

              {/* Notificações Push do Dispositivo */}
              <div className="space-y-4 p-5 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <Sparkles size={12} className="text-zinc-600" />
                  <span>Notificações Push no Dispositivo</span>
                </span>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <span className="text-xs font-bold text-white block">Notificações Push</span>
                    <span className="text-[10px] text-zinc-450 block font-light leading-relaxed">
                      {permissionStatus === 'denied' 
                        ? 'A permissão de notificações está bloqueada neste dispositivo. Por favor, redefina as permissões nas configurações do navegador ou do sistema.'
                        : 'Ative para receber avisos nativos sobre vencimentos de tarefas diretamente na sua barra de status (mesmo com o app fechado).'}
                    </span>
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-550 uppercase">Status do Dispositivo:</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        permissionStatus === 'granted'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50'
                          : permissionStatus === 'denied'
                          ? 'bg-red-950/40 text-red-400 border border-red-900/50'
                          : 'bg-zinc-900 text-zinc-450 border border-zinc-800'
                      }`}>
                        {permissionStatus === 'granted' ? 'Permitido' : permissionStatus === 'denied' ? 'Bloqueado' : 'Não Solicitado'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={registeringNotification || permissionStatus === 'denied'}
                    onClick={handleToggleNotifications}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-50 select-none cursor-pointer whitespace-nowrap ${
                      notificationsEnabled
                        ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300'
                        : 'bg-brand-accent hover:bg-brand-accent-hover text-white'
                    }`}
                  >
                    {registeringNotification ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : notificationsEnabled ? (
                      <span>Desativar</span>
                    ) : (
                      <span>Ativar</span>
                    )}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-6 space-y-6 animate-fade-in">
              
              {/* Painel de Alterar Senha */}
              <form onSubmit={handlePasswordChange} className="space-y-4 p-5 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <KeyRound size={12} className="text-zinc-600" />
                  <span>Segurança da Conta & Senha</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="No mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repita a senha acima"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-accent/10 active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {passwordLoading ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <span>Atualizar Senha</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Painel de Alterar E-mail */}
              <form onSubmit={handleEmailChange} className="space-y-4 p-5 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <Mail size={12} className="text-zinc-600" />
                  <span>E-mail de Cadastro</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      E-mail Atual
                    </label>
                    <input
                      type="text"
                      disabled
                      value={userProfile?.email || ''}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-500 text-xs font-semibold cursor-not-allowed select-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Novo E-mail
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="exemplo@novodominio.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-xl text-[10px] text-amber-400 font-semibold leading-relaxed flex gap-2">
                  <span className="text-xs shrink-0 select-none block">⚠️</span>
                  <span>
                    <strong>Importante:</strong> Para concluir a alteração do e-mail, o Supabase enviará uma mensagem de confirmação para o novo endereço de e-mail por motivos de segurança.
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="px-4 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-accent/10 active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {emailLoading ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <span>Atualizar E-mail</span>
                    )}
                  </button>
                </div>
              </form>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === 'profile' || activeTab === 'notifications' ? (
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-accent/10 active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <span>Salvar Configurações</span>
              )}
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-800 text-zinc-450 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              Fechar Configurações
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
