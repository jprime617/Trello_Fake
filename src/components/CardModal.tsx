import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, User, AlignLeft, AlertCircle } from 'lucide-react';

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
}

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: Omit<Task, 'id' | 'position' | 'column_id'> & { column_id?: string }) => void;
  onDelete?: (taskId: string) => void;
  editingTask: Task | null;
  profiles: Profile[];
  defaultColumnId?: string;
}

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTask,
  profiles,
  defaultColumnId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setAssigneeId(editingTask.assignee_id || '');
      setDueDate(editingTask.due_date || '');
      setPriority(editingTask.priority);
    } else {
      setTitle('');
      setDescription('');
      setAssigneeId('');
      setDueDate('');
      setPriority('medium');
    }
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel rounded-2xl shadow-2xl overflow-hidden border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
          <h3 className="font-semibold text-white text-sm">
            {editingTask ? 'Detalhes da Tarefa' : 'Nova Tarefa'}
          </h3>
          <div className="flex items-center gap-2">
            {editingTask && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title="Excluir Tarefa"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all shrink-0"
              >
                <Trash2 size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Título da Tarefa
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Criar modelo de dados da API"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft size={13} />
              <span>Descrição</span>
            </label>
            <textarea
              placeholder="Descreva a tarefa em detalhes para ajudar o grupo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assignee Selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} />
                <span>Responsável</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-brand-accent transition-all text-sm cursor-pointer"
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
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={13} />
                <span>Data de Entrega</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-brand-accent transition-all text-sm cursor-pointer"
              />
            </div>
          </div>

          {/* Priority Level */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={13} />
              <span>Nível de Prioridade</span>
            </span>
            <div className="grid grid-cols-3 gap-3">
              {(['low', 'medium', 'high'] as const).map((level) => {
                const isSelected = priority === level;
                const labels = { low: 'Baixa', medium: 'Média', high: 'Alta' };
                const selectedColors = {
                  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
                  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
                  high: 'bg-red-500/20 text-red-300 border-red-500/50',
                };
                const inactiveColors = 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-900';

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPriority(level)}
                    className={`py-2 px-3 border rounded-xl font-medium text-xs transition-all active:scale-[0.98] ${
                      isSelected ? selectedColors[level] : inactiveColors
                    }`}
                  >
                    {labels[level]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800/50 pt-5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-brand-accent/10 active:scale-[0.98]"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
