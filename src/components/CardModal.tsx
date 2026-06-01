import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
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
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
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
  defaultColumnId?: string;
  subtasks: Subtask[];
  onAddSubtask: (title: string, taskId: string) => Promise<void>;
  onToggleSubtask: (subtaskId: string, isCompleted: boolean) => Promise<void>;
  onDeleteSubtask: (subtaskId: string) => Promise<void>;
  userId: string;
}

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTask,
  profiles,
  defaultColumnId,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  userId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Estados dos recursos avançados
  const [labels, setLabels] = useState<{ name: string; color: string }[]>([]);
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string }[]>([]);

  // Modais e inputs internos
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('indigo');

  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paleta de cores para etiquetas
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

  const handleDelete = () => {
    if (editingTask && onDelete) {
      if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
        onDelete(editingTask.id);
        onClose();
      }
    }
  };

  // Checklist: Adicionar item
  const handleAddSubtaskItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !editingTask) return;
    await onAddSubtask(newSubtaskTitle.trim(), editingTask.id);
    setNewSubtaskTitle('');
  };

  // Etiquetas: Adicionar etiqueta
  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    const tagExists = labels.some(
      (lbl) => lbl.name.toLowerCase() === newTagName.trim().toLowerCase()
    );
    if (tagExists) {
      alert('Esta etiqueta já foi adicionada!');
      return;
    }
    setLabels((prev) => [...prev, { name: newTagName.trim(), color: newTagColor }]);
    setNewTagName('');
  };

  // Etiquetas: Remover etiqueta
  const handleRemoveTag = (index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  // Anexos: Adicionar Link da Web
  const handleAddLink = () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const newLink = {
      name: linkTitle.trim(),
      url: formattedUrl,
      type: 'link',
    };
    setAttachments((prev) => [...prev, newLink]);
    setLinkTitle('');
    setLinkUrl('');
  };

  // Anexos: Upload de Arquivos Físicos (PDF, ZIP, Imagens) para o Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar se excede tamanho limite (ex: 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('O arquivo é muito grande! Escolha um arquivo de até 20MB.');
      return;
    }

    try {
      setUploadingFile(true);
      const fileExt = file.name.split('.').pop() || '';
      const uniqueFileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${userId}/${uniqueFileName}`;

      // Envia para o bucket attachments
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // Pegar URL Pública
      const {
        data: { publicUrl },
      } = supabase.storage.from('attachments').getPublicUrl(filePath);

      let fileType = 'zip';
      if (file.type.includes('image')) {
        fileType = 'image';
      } else if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
        fileType = 'pdf';
      }

      const newAttachment = {
        name: file.name,
        url: publicUrl,
        type: fileType,
      };

      setAttachments((prev) => [...prev, newAttachment]);
    } catch (err: any) {
      console.error('Erro no upload:', err.message);
      alert('Erro ao fazer upload do arquivo: ' + err.message + '\n\nCertifique-se de que o bucket "attachments" foi criado no Supabase Storage e que o RLS dele permite uploads.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Obter cores seguras para renderização das etiquetas selecionadas
  const getTagColorClass = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-500/15 text-red-400 border border-red-500/30';
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'amber':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'blue':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'purple':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'pink':
        return 'bg-pink-500/15 text-pink-400 border border-pink-500/30';
      case 'indigo':
      default:
        return 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30';
    }
  };

  // Calcular progresso do checklist
  const totalSub = subtasks.length;
  const completedSub = subtasks.filter((s) => s.is_completed).length;
  const progressPercent = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40 shrink-0">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
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

        {/* Form & Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <form id="card-modal-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Título da Tarefa
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Criar modelo de dados da API"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-semibold"
              />
            </div>

            {/* Description */}
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

            {/* Grid for Assignee & Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assignee Selection */}
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
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={12} className="text-zinc-600" />
                  <span>Data de Entrega</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all text-xs font-semibold cursor-pointer"
                />
              </div>
            </div>

            {/* Priority Level */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <AlertCircle size={12} className="text-zinc-600" />
                <span>Nível de Prioridade</span>
              </span>
              <div className="grid grid-cols-3 gap-3">
                {(['low', 'medium', 'high'] as const).map((level) => {
                  const isSelected = priority === level;
                  const labelsText = { low: 'Baixa', medium: 'Média', high: 'Alta' };
                  const selectedColors = {
                    low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
                    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
                    high: 'bg-red-500/20 text-red-300 border-red-500/50',
                  };
                  const inactiveColors =
                    'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900/60';

                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPriority(level)}
                      className={`py-2 px-3 border rounded-xl font-bold text-xs transition-all active:scale-[0.98] ${
                        isSelected ? selectedColors[level] : inactiveColors
                      }`}
                    >
                      {labelsText[level]}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>

          {/* ================= RECURSOS AVANÇADOS ================= */}
          <div className="border-t border-zinc-800/80 pt-6 space-y-6">
            
            {/* 1. ETIQUETAS CUSTOMIZADAS */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={12} className="text-zinc-600" />
                <span>Etiquetas Personalizadas</span>
              </span>

              {/* Etiquetas Selecionadas */}
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2">
                  {labels.map((lbl, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getTagColorClass(
                        lbl.color
                      )}`}
                    >
                      <span>{lbl.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(idx)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Criador de Etiquetas */}
              <div className="flex flex-wrap gap-2 items-center bg-zinc-900/40 border border-zinc-900 p-3 rounded-xl">
                <input
                  type="text"
                  placeholder="Nome da tag (ex: Frontend)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-xs font-semibold flex-1 min-w-[150px]"
                />
                <select
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none cursor-pointer"
                >
                  {colors.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
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

            {/* 2. CHECKLIST / SUBTAREFAS (Apenas para tarefas já criadas) */}
            {editingTask ? (
              <div className="space-y-4">
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

                {/* Checklist Progress Bar */}
                {totalSub > 0 && (
                  <div className="space-y-1">
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-850">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Subtasks Checklist */}
                <div className="space-y-2">
                  {subtasks.length > 0 ? (
                    subtasks.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-900 hover:border-zinc-800/80 transition-colors group/sub"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={sub.is_completed}
                            onChange={(e) => onToggleSubtask(sub.id, e.target.checked)}
                            className="rounded border-zinc-800 text-indigo-600 focus:ring-indigo-500 bg-zinc-900 cursor-pointer h-4 w-4 shrink-0"
                          />
                          <span
                            className={`text-xs font-semibold truncate ${
                              sub.is_completed ? 'line-through text-zinc-500' : 'text-zinc-200'
                            }`}
                          >
                            {sub.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => onDeleteSubtask(sub.id)}
                          className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover\u002fsub:opacity-100 transition-opacity rounded-md"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-zinc-600 pl-2">Nenhum item adicionado ao checklist</p>
                  )}
                </div>

                {/* Subtask Adder Form */}
                <form onSubmit={handleAddSubtaskItem} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar um item de tarefa..."
                    required
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs font-semibold flex-1"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Adicionar</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-zinc-900 rounded-xl bg-zinc-950/20 text-center text-xs text-zinc-600">
                <span>Salve o cartão uma vez antes de poder adicionar checklists ou documentos.</span>
              </div>
            )}

            {/* 3. ANEXOS (DOCUMENTOS PDF, ZIP, IMAGENS E LINKS) */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Paperclip size={12} className="text-zinc-600" />
                <span>Documentos e Anexos</span>
              </span>

              {/* Lista de Anexos */}
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
                            {isImg ? (
                              <Image size={14} className="text-blue-400" />
                            ) : isPdf ? (
                              <FileText size={14} className="text-red-400" />
                            ) : isZip ? (
                              <FileArchive size={14} className="text-yellow-400" />
                            ) : (
                              <Link size={14} className="text-indigo-400" />
                            )}
                          </div>
                          <div className="min-w-0 leading-tight">
                            <h5 className="text-xs font-semibold text-white truncate max-w-[200px] md:max-w-[280px]">
                              {att.name}
                            </h5>
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-zinc-500 hover:text-indigo-400 font-bold flex items-center gap-0.5 mt-0.5"
                            >
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
                <p className="text-[11px] text-zinc-600 pl-2">Nenhum anexo adicionado</p>
              )}

              {/* upload e link adder */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload Físico de PDF / ZIP / Imagem */}
                <div className="p-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10 flex flex-col items-center justify-center text-center gap-2 select-none relative">
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

                {/* Adicionador de Links Externos */}
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
                    className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white rounded-lg text-[10px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Anexar Link</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer (Fixed at bottom) */}
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
            Salvar Alterações
          </button>
        </div>

      </div>
    </div>
  );
};
