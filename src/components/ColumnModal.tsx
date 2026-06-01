import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Column {
  id: string;
  title: string;
  position: number;
}

interface ColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  editingColumn: Column | null;
}

export const ColumnModal: React.FC<ColumnModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingColumn,
}) => {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (editingColumn) {
      setTitle(editingColumn.title);
    } else {
      setTitle('');
    }
  }, [editingColumn, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl overflow-hidden border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
          <h3 className="font-semibold text-white text-sm">
            {editingColumn ? 'Editar Coluna' : 'Nova Coluna'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Título da Coluna
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: Em Homologação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all text-sm"
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-800/50 pt-4 mt-6">
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
