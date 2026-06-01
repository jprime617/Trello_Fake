import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X, HelpCircle } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmState {
  isOpen: boolean;
  message: string;
  resolve: (value: boolean) => void;
}

interface PromptState {
  isOpen: boolean;
  title: string;
  description?: string;
  defaultValue?: string;
  resolve: (value: string | null) => void;
}

interface ModalContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
  confirm: (message: string) => Promise<boolean>;
  prompt: (title: string, description?: string, defaultValue?: string) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useCustomModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useCustomModal deve ser usado dentro de um ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
    resolve: () => {},
  });
  const [promptState, setPromptState] = useState<PromptState>({
    isOpen: false,
    title: '',
    description: '',
    defaultValue: '',
    resolve: () => {},
  });

  const [promptValue, setPromptValue] = useState('');

  // 1. Toast Implementation
  const toast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // 2. Confirm Implementation
  const confirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        resolve: (value: boolean) => {
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(value);
        },
      });
    });
  };

  // 3. Prompt Implementation
  const prompt = (title: string, description?: string, defaultValue?: string): Promise<string | null> => {
    setPromptValue(defaultValue || '');
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        title,
        description,
        defaultValue,
        resolve: (value: string | null) => {
          setPromptState((prev) => ({ ...prev, isOpen: false }));
          resolve(value);
        },
      });
    });
  };

  // Listen to keyboard Escape/Enter keypresses on modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (confirmState.isOpen) {
        if (e.key === 'Escape') confirmState.resolve(false);
        if (e.key === 'Enter') confirmState.resolve(true);
      }
      if (promptState.isOpen) {
        if (e.key === 'Escape') promptState.resolve(null);
        if (e.key === 'Enter') promptState.resolve(promptValue);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState, promptState, promptValue]);

  return (
    <ModalContext.Provider value={{ toast, confirm, prompt }}>
      {children}

      {/* Global Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl pointer-events-auto transform transition-all duration-300 animate-slide-in ${
              t.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-100 shadow-emerald-950/30'
                : t.type === 'error'
                ? 'bg-rose-950/70 border-rose-800/60 text-rose-100 shadow-rose-950/30'
                : 'bg-zinc-900/80 border-zinc-800 text-zinc-100 shadow-black/40'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="text-emerald-400 shrink-0" size={18} />}
            {t.type === 'error' && <AlertTriangle className="text-rose-400 shrink-0" size={18} />}
            {t.type === 'info' && <Info className="text-brand-accent shrink-0" size={18} />}
            
            <p className="text-xs font-medium leading-relaxed flex-1">{t.message}</p>
            
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-zinc-400 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Global Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800/80 max-w-md w-full rounded-2xl p-6 shadow-2xl transform scale-100 transition-all animate-zoom-in">
            <div className="flex gap-4 items-start mb-5">
              <div className="p-3 bg-brand-accent/10 text-brand-accent rounded-xl shrink-0">
                <HelpCircle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Confirmação necessária</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{confirmState.message}</p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => confirmState.resolve(false)}
                className="px-4 py-2 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmState.resolve(true)}
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-brand-accent/20 active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Prompt Modal */}
      {promptState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800/80 max-w-md w-full rounded-2xl p-6 shadow-2xl transform scale-100 transition-all animate-zoom-in">
            <h3 className="text-sm font-semibold text-white mb-1">{promptState.title}</h3>
            {promptState.description && (
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{promptState.description}</p>
            )}
            
            <input
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all mb-5"
              autoFocus
              onFocus={(e) => e.target.select()}
            />
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => promptState.resolve(null)}
                className="px-4 py-2 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => promptState.resolve(promptValue)}
                className="px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-brand-accent/20 active:scale-95"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
