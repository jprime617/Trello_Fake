import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getLabelClasses, getPriorityClasses, PRIORITY_LABELS } from '../lib/colors';
import { useModalA11y } from '../hooks/useModalA11y';
import { useCustomModal } from './CustomModals';
import {
  X,
  Trash2,
  Calendar,
  User,
  AlignLeft,
  AlertCircle,
  ListTodo,
  Tag,
  Paperclip,
  Link,
  Plus,
  Loader2,
  FileText,
  FileArchive,
  Image,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  avatar_emoji?: string;
}

interface Task {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  position: number;
  labels: { name: string; color: string }[];
  attachments: { name: string; url: string; type: string }[];
}

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  assignee_id?: string;
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    cardData: Omit<Task, 'id' | 'position' | 'column_id'> & {
      column_id?: string;
      labels: { name: string; color: string }[];
      attachments: { name: string; url: string; type: string }[];
    }
  ) => void;
  onDelete?: (taskId: string) => void;
  editingTask: Task | null;
  profiles: Profile[];
  allProfiles?: Profile[];
  defaultColumnId?: string;
  subtasks: Subtask[];
  onAddSubtask: (title: string, taskId: string, assigneeId?: string) => Promise<void>;
  onToggleSubtask: (subtaskId: string, isCompleted: boolean) => Promise<void>;
  onDeleteSubtask: (subtaskId: string) => Promise<void>;
  onAssignSubtask: (subtaskId: string, assigneeId?: string) => Promise<void>;
  userId: string;
  comments: Comment[];
  onAddComment: (content: string, taskId: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  projectLabels: { name: string; color: string }[];
}

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTask,
  profiles,
  allProfiles = [],
  defaultColumnId,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onAssignSubtask,
  userId,
  comments,
  onAddComment,
  onDeleteComment,
  projectLabels,
}) => {
  const { toast, confirm } = useCustomModal();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const [labels, setLabels] = useState<{ name: string; color: string }[]>([]);
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string }[]>([]);

  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'attachments' | 'comments'>('details');

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('indigo');
  const [newCommentText, setNewCommentText] = useState('');

  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useModalA11y(isOpen, onClose, titleInputRef);

  const colors = [
    { value: 'indigo', label: 'Índigo' },
    { value: 'red', label: 'Vermelho' },
    { value: 'emerald', label: 'Verde' },
    { value: 'amber', label: 'Amarelo' },
    { value: 'blue', label: 'Azul' },
    { value: 'purple', label: 'Roxo' },
    { value: 'pink', label: 'Rosa' },
  ];

  useEffect(() => {
    setActiveTab('details');
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setAssigneeId(editingTask.assignee_id || '');
      setDueDate(editingTask.due_date || '');
      setPriority(editingTask.priority);
      setLabels(editingTask.labels || []);
      setAttachments(editingTask.attachments || []);
    } else {
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setDueDate('');
      setPriority('medium');
      setLabels([]);
      setAttachments([]);
    }
    setNewSubtaskTitle('');
    setNewSubtaskAssigneeId('');
    setNewTagName('');
    setLinkTitle('');
    setLinkUrl('');
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      assignee_id: assigneeId || undefined,
      due_date: dueDate || undefined,
      priority,
      labels,
      attachments,
      ...(defaultColumnId && !editingTask ? { column_id: defaultColumnId } : {}),
    });
    onClose();
  };

  const handleDelete = async () => {
    if (editingTask && onDelete) {
      const isConfirmed = await confirm('Tem certeza que deseja excluir esta tarefa?');
      if (isConfirmed) {
        onDelete(editingTask.id);
        onClose();
      }
    }
  };

  const handleAddSubtaskItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !editingTask) return;
    await onAddSubtask(newSubtaskTitle.trim(), editingTask.id, newSubtaskAssigneeId || undefined);
    setNewSubtaskTitle('');
    setNewSubtaskAssigneeId('');
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const tagExists = labels.some((lbl) => lbl.name.toLowerCase() === newTagName.trim().toLowerCase());
    if (tagExists) {
      toast('Esta etiqueta já foi adicionada!', 'info');
      return;
    }
    setLabels((prev) => [...prev, { name: newTagName.trim(), color: newTagColor }]);
    setNewTagName('');
  };

  const handleRemoveTag = (index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleProjectTag = (clickedTag: { name: string; color: string }) => {
    const isAlreadyAdded = labels.some((l) => l.name.toLowerCase() === clickedTag.name.toLowerCase());
    if (isAlreadyAdded) {
      setLabels((prev) => prev.filter((l) => l.name.toLowerCase() !== clickedTag.name.toLowerCase()));
    } else {
      setLabels((prev) => [...prev, clickedTag]);
    }
  };

  const handleAddLink = () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    setAttachments((prev) => [...prev, { name: linkTitle.trim(), url: formattedUrl, type: 'link' }]);
    setLinkTitle('');
    setLinkUrl('');
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !editingTask) return;
    try {
      await onAddComment(newCommentText.trim(), editingTask.id);
      setNewCommentText('');
    } catch (err: any) {
      toast('Erro ao enviar comentário: ' + err.message, 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast('O arquivo é muito grande! Escolha um arquivo de até 20MB.', 'error');
      return;
    }
    try {
      setUploadingFile(true);
      const fileExt = file.name.split('.').pop() || '';
      const uniqueFileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${userId}/${uniqueFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
      let fileType = 'zip';
      if (file.type.includes('image')) fileType = 'image';
      else if (file.type.includes('pdf') || file.name.endsWith('.pdf')) fileType = 'pdf';
      setAttachments((prev) => [...prev, { name: file.name, url: publicUrl, type: fileType }]);
    } catch (err: any) {
      console.error('Erro no upload:', err.message);
      toast('Erro ao fazer upload do arquivo. Certifique-se de que o bucket "attachments" existe.', 'error');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const totalSub = subtasks.length;
  const completedSub = subtasks.filter((s) => s.is_completed).length;
  const progressPercent = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >

        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40 shrink-0">
          <h3 id="card-modal-title" className="font-bold text-white text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            {editingTask ? 'Detalhes e Recursos da Tarefa' : 'Nova Tarefa'}
          </h3>
          <div className="flex items-center gap-2">
            {editingTask && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title="Excluir Tarefa"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all shrink-0 active:scale-95"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors active:scale-95"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs — only when editing */}
        {editingTask && (
          <div className="flex items-center gap-1 px-4 pt-2 border-b border-zinc-800/80 bg-zinc-950/60 overflow-x-auto no-scrollbar shrink-0">
            {([
              { key: 'details', icon: <AlignLeft size={13} />, label: 'Geral', badge: null },
              { key: 'checklist', icon: <ListTodo size={13} />, label: 'Checklist', badge: totalSub > 0 ? `${completedSub}/${totalSub}` : null },
              { key: 'attachments', icon: <Paperclip size={13} />, label: 'Anexos', badge: attachments.length > 0 ? `${attachments.length}` : null },
              { key: 'comments', icon: <MessageSquare size={13} />, label: 'Chat', badge: comments.length > 0 ? `${comments.length}` : null },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] font-extrabold px-1.5 rounded-full bg-zinc-800 text-zinc-300">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

          {/* ══════════ ABA GERAL ══════════ */}
          <div className={activeTab === 'details' || !editingTask ? 'block space-y-5' : 'hidden'}>
            <form
              id="card-modal-form"
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              className="space-y-5"
            >
              {/* Título */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Título da Tarefa
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  required
                  placeholder="Ex: Criar modelo de dados da API"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-semibold"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <AlignLeft size={12} className="text-zinc-600" />
                  <span>Descrição</span>
                </label>
                <textarea
                  placeholder="Descreva a tarefa em detalhes para ajudar o grupo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-xs resize-none font-light leading-relaxed"
                />
              </div>

              {/* Responsável + Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <User size={12} className="text-zinc-600" />
                    <span>Responsável</span>
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all text-xs font-semibold cursor-pointer"
                  >
                    <option value="">Sem responsável</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profile.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={12} className="text-zinc-600" />
                    <span>Data de Entrega</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate ? new Date(new Date(dueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all text-xs font-semibold cursor-pointer"
                  />
                </div>
              </div>

              {/* Prioridade */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-zinc-600" />
                  <span>Nível de Prioridade</span>
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {(['low', 'medium', 'high'] as const).map((level) => {
                    const isSelected = priority === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setPriority(level)}
                        className={`py-2 px-3 border rounded-xl font-bold text-xs transition-all active:scale-[0.98] ${isSelected ? getPriorityClasses(level, 'solid') : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                      >
                        {PRIORITY_LABELS[level]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editingTask && (
                <p className="text-[10px] text-zinc-600 text-right">
                  Dica: <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-[10px] font-mono">Ctrl+Enter</kbd> para salvar rapidamente.
                </p>
              )}
            </form>

            {/* Etiquetas (ficam na aba Geral) */}
            <div className="border-t border-zinc-800/80 pt-5 space-y-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={12} className="text-zinc-600" />
                <span>Etiquetas Personalizadas</span>
              </span>

              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {labels.map((lbl, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getLabelClasses(lbl.color)}`}
                    >
                      <span>{lbl.name}</span>
                      <button type="button" onClick={() => handleRemoveTag(idx)} className="text-zinc-500 hover:text-white">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {projectLabels && projectLabels.length > 0 && (
                <div className="space-y-2 pb-2 pt-1 pl-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block select-none">Etiquetas do Projeto:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {projectLabels.map((lbl, idx) => {
                      const isSelected = labels.some((l) => l.name.toLowerCase() === lbl.name.toLowerCase());
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleProjectTag(lbl)}
                          className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${isSelected
                              ? `${getLabelClasses(lbl.color)} border-brand-accent/30 shadow-sm`
                              : 'bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
                            }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                          <span>{lbl.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-center bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl">
                <input
                  type="text"
                  placeholder="Nome da tag (ex: Frontend)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-xs font-semibold flex-1 min-w-[150px]"
                />
                <select
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none cursor-pointer"
                >
                  {colors.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 flex items-center justify-center"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* ══════════ ABA CHECKLIST ══════════ */}
          <div className={activeTab === 'checklist' ? 'block space-y-4' : 'hidden'}>
            {editingTask ? (
              <>
                {/* Header do checklist */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <ListTodo size={12} className="text-zinc-600" />
                    <span>Checklist de Subtarefas</span>
                  </span>
                  {totalSub > 0 && (
                    <span className="text-[10px] font-extrabold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-lg">
                      {completedSub} de {totalSub} ({progressPercent}%)
                    </span>
                  )}
                </div>

                {/* Barra de progresso */}
                {totalSub > 0 && (
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-850">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}

                {/* Lista de subtarefas */}
                <div className="space-y-2">
                  {subtasks.length > 0 ? (
                    subtasks.map((sub) => {
                      const subAssignee =
                        profiles.find((p) => p.id === sub.assignee_id) ||
                        allProfiles.find((p) => p.id === sub.assignee_id);
                      return (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-900 hover:border-zinc-800 transition-colors group/sub"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={sub.is_completed}
                              onChange={(e) => onToggleSubtask(sub.id, e.target.checked)}
                              className="rounded border-zinc-800 text-indigo-600 focus:ring-indigo-500 bg-zinc-900 cursor-pointer h-4 w-4 shrink-0"
                            />
                            <span className={`text-xs font-semibold truncate ${sub.is_completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                              {sub.title}
                            </span>
                            {subAssignee && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-zinc-300 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50 shrink-0 font-medium"
                                title={`Atribuído a ${subAssignee.full_name}`}
                              >
                                {subAssignee.avatar_url ? (
                                  <img src={subAssignee.avatar_url} alt={subAssignee.full_name} className="w-3.5 h-3.5 rounded-full object-cover" />
                                ) : subAssignee.avatar_emoji ? (
                                  <span className="text-[11px]">{subAssignee.avatar_emoji}</span>
                                ) : (
                                  <User size={10} className="text-indigo-400" />
                                )}
                                <span className="truncate max-w-[90px]">{subAssignee.full_name.split(' ')[0]}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <select
                              value={sub.assignee_id || ''}
                              onChange={(e) => onAssignSubtask(sub.id, e.target.value || undefined)}
                              className="bg-zinc-950/90 text-[11px] text-zinc-300 border border-zinc-800 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 hover:border-zinc-700 cursor-pointer transition-colors max-w-[130px] truncate"
                              title="Alterar responsável do item"
                            >
                              <option value="">👤 Sem resp.</option>
                              {profiles.map((p) => (
                                <option key={p.id} value={p.id}>{p.full_name}</option>
                              ))}
                              {sub.assignee_id && !profiles.some((p) => p.id === sub.assignee_id) && subAssignee && (
                                <option value={sub.assignee_id} disabled>
                                  {subAssignee.full_name} (Fora do projeto)
                                </option>
                              )}
                            </select>
                            <button
                              type="button"
                              onClick={() => onDeleteSubtask(sub.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity rounded-md cursor-pointer hover:bg-zinc-800/50"
                              title="Excluir item"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                      <ListTodo size={30} className="text-zinc-700" />
                      <p className="text-[11px] text-zinc-500">Nenhum item ainda. Adicione abaixo!</p>
                    </div>
                  )}
                </div>

                {/* Form para adicionar subtarefa */}
                <form onSubmit={handleAddSubtaskItem} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar um item de tarefa..."
                    required
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs font-semibold flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newSubtaskAssigneeId}
                      onChange={(e) => setNewSubtaskAssigneeId(e.target.value)}
                      className="px-2.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-indigo-500 text-xs font-semibold max-w-[140px] truncate cursor-pointer"
                      title="Atribuir responsável ao novo item"
                    >
                      <option value="">👤 Sem resp.</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="p-4 border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20 text-center text-xs text-zinc-600">
                <span>Salve o cartão uma vez antes de poder adicionar checklists.</span>
              </div>
            )}
          </div>

          {/* ══════════ ABA ANEXOS ══════════ */}
          <div className={activeTab === 'attachments' ? 'block space-y-4' : 'hidden'}>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Paperclip size={12} className="text-zinc-600" />
              <span>Documentos e Anexos</span>
            </span>

            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((att, idx) => {
                  const isImg = att.type === 'image';
                  const isPdf = att.type === 'pdf';
                  const isZip = att.type === 'zip';
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800 transition-colors group/att"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center border border-zinc-900 shrink-0">
                          {isImg ? <Image size={14} className="text-blue-400" />
                            : isPdf ? <FileText size={14} className="text-red-400" />
                              : isZip ? <FileArchive size={14} className="text-yellow-400" />
                                : <Link size={14} className="text-indigo-400" />}
                        </div>
                        <div className="min-w-0 leading-tight">
                          <h5 className="text-xs font-semibold text-white truncate max-w-[200px] md:max-w-[280px]">{att.name}</h5>
                          <a href={att.url} target="_blank" rel="noreferrer" className="text-[9px] text-zinc-500 hover:text-indigo-400 font-bold flex items-center gap-0.5 mt-0.5">
                            <span>Visualizar Anexo</span>
                            <ExternalLink size={8} />
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover/att:opacity-100 transition-opacity rounded-md"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <Paperclip size={30} className="text-zinc-700" />
                <p className="text-[11px] text-zinc-500">Nenhum arquivo ou link anexado ainda.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upload físico */}
              <div className="p-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10 flex flex-col items-center justify-center text-center gap-2 select-none">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.zip,.rar,.tar.gz,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
                {uploadingFile ? (
                  <>
                    <Loader2 className="animate-spin text-indigo-400" size={18} />
                    <span className="text-[10px] text-zinc-400 font-semibold">Enviando arquivo...</span>
                  </>
                ) : (
                  <>
                    <FileArchive size={18} className="text-zinc-600" />
                    <div className="leading-normal">
                      <span className="text-[10px] text-zinc-400 font-bold block">Upload PDF, ZIP ou Imagem</span>
                      <span className="text-[9px] text-zinc-600 block">Limite de 20MB por arquivo</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-white rounded-lg transition-all"
                    >
                      Selecionar Arquivo
                    </button>
                  </>
                )}
              </div>

              {/* Link externo */}
              <div className="p-4 border border-zinc-900 bg-zinc-900/20 rounded-xl flex flex-col gap-2">
                <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 leading-none mb-1">
                  <Link size={10} />
                  <span>Adicionar Link Web</span>
                </span>
                <input
                  type="text"
                  placeholder="Título do Link (ex: Protótipo Figma)"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 text-[10px] focus:outline-none focus:border-indigo-500 font-semibold"
                />
                <input
                  type="text"
                  placeholder="URL (ex: figma.com/...)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 text-[10px] focus:outline-none focus:border-indigo-500 font-semibold"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-lg text-[10px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                >
                  <Plus size={12} />
                  <span>Anexar Link</span>
                </button>
              </div>
            </div>
          </div>

          {/* ══════════ ABA COMENTÁRIOS ══════════ */}
          <div className={activeTab === 'comments' ? 'block space-y-4' : 'hidden'}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare size={12} className="text-zinc-600" />
                <span>Discussão / Comentários</span>
              </span>
              {comments.length > 0 && (
                <span className="text-[10px] font-extrabold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                  {comments.length}
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 no-scrollbar">
              {comments.length > 0 ? (
                comments.map((comment) => {
                  const author =
                    profiles.find((p) => p.id === comment.user_id) ||
                    allProfiles.find((p) => p.id === comment.user_id);
                  const authorName = author ? author.full_name : 'Membro do Grupo';
                  const getInitials = (n: string) => n.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={comment.id}
                      className="flex gap-3 p-3 rounded-xl bg-zinc-900/20 border border-zinc-900 hover:border-zinc-850 transition-all group/comm"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-800 to-zinc-900 flex items-center justify-center text-white font-bold text-[10px] shadow-inner shrink-0 select-none overflow-hidden">
                        {author?.avatar_url ? (
                          <img src={author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                        ) : author?.avatar_emoji ? (
                          <span className="text-sm">{author.avatar_emoji}</span>
                        ) : (
                          <span>{getInitials(authorName)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between leading-none">
                          <span className="text-xs font-bold text-zinc-200 truncate">{authorName}</span>
                          <span className="text-[9px] text-zinc-500 font-medium">
                            {new Date(comment.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-light mt-1.5 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                      </div>
                      {comment.user_id === userId && (
                        <button
                          type="button"
                          onClick={() => confirm('Deseja realmente excluir este comentário?').then((ans) => { if (ans) onDeleteComment(comment.id); })}
                          className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover/comm:opacity-100 transition-opacity rounded-md self-start"
                          title="Excluir comentário"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <MessageSquare size={30} className="text-zinc-700" />
                  <p className="text-[11px] text-zinc-500">Nenhum comentário ainda. Comece a discussão!</p>
                </div>
              )}
            </div>

            {editingTask ? (
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adicionar um comentário... (Enter para enviar)"
                  required
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent text-xs font-semibold flex-1"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>Comentar</span>
                </button>
              </form>
            ) : (
              <div className="p-3 border border-dashed border-zinc-900 rounded-xl text-center text-xs text-zinc-600">
                Salve o cartão antes de comentar.
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98]"
          >
            {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
          </button>
        </div>

      </div>
    </div>
  );
};
