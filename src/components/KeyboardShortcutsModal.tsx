import React from 'react';
import { X, Command, Search, Plus, Filter, CheckSquare, Download, HelpCircle } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '/', description: 'Focar na busca instantânea', icon: Search },
    { key: 'N', description: 'Abrir modal de nova tarefa', icon: Plus },
    { key: 'F', description: 'Alternar painel de filtros avançados', icon: Filter },
    { key: 'B', description: 'Alternar modo de seleção em massa (Bulk)', icon: CheckSquare },
    { key: 'E', description: 'Exportar dados do quadro (JSON / CSV)', icon: Download },
    { key: '?', description: 'Abrir este guia de atalhos', icon: HelpCircle },
    { key: 'Esc', description: 'Fechar qualquer modal ou desmarcar seleções', icon: Command },
    { key: 'Ctrl + Enter', description: 'Salvar alterações / enviar comentário no modal', icon: Command },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800/90 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Command size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Atalhos de Teclado</h3>
              <p className="text-[11px] text-zinc-400">Produtividade para Power Users</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
          {shortcuts.map((s, index) => {
            const Icon = s.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-900/80 hover:border-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon size={15} className="text-indigo-400 shrink-0" />
                  <span className="text-xs font-medium text-zinc-200">{s.description}</span>
                </div>
                <kbd className="px-2.5 py-1 bg-zinc-900 border border-zinc-700/60 rounded-lg text-[11px] font-mono font-bold text-zinc-300 shadow-sm">
                  {s.key}
                </kbd>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
