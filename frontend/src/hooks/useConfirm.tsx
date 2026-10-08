import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

type DialogMode = 'confirm' | 'alert';

interface DialogState {
  open: boolean;
  message: string;
  mode: DialogMode;
}

const CLOSED: DialogState = { open: false, message: '', mode: 'confirm' };

export function useConfirm() {
  const [state, setState] = useState<DialogState>(CLOSED);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, message, mode: 'confirm' });
    });
  }, []);

  const alert = useCallback((message: string = 'İşlem Başarılı / Hata Oluştu', type?: string): Promise<void> => {
    const lowerMsg = message.toLowerCase();
    const isError = type === 'error' || lowerMsg.includes('hata') || lowerMsg.includes('başarısız') || lowerMsg.includes('yüklenemedi') || lowerMsg.includes('bulunamadı');
    
    if (isError) {
      toast.error(message);
    } else {
      toast.success(message);
    }
    
    return Promise.resolve();
  }, []);

  const handleOk = useCallback(() => {
    setState(CLOSED);
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState(CLOSED);
    resolveRef.current?.(false);
  }, []);

  useEffect(() => {
    if (!state.open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleOk();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.open, handleOk, handleCancel]);

  const confirmModal = state.open ? (
    <div
      className="fixed inset-0 bg-gray-900/60 transition-opacity z-[2000] flex items-center justify-center p-4"
      onMouseDown={state.mode === 'alert' ? handleOk : handleCancel}
    >
      <div
        className="bg-surface rounded-xl shadow-xl w-full max-w-[400px] p-6 animate-in zoom-in-95"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="mb-6 text-[15px] leading-relaxed whitespace-pre-line text-slate-700 font-medium">
          {state.message}
        </p>
        <div className="flex justify-end gap-3 mt-6">
          {state.mode === 'confirm' && (
            <button 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" 
              onClick={handleCancel}
            >
              İptal
            </button>
          )}
          <button
            className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm transition-colors disabled:opacity-50 ${
              state.mode === 'confirm' 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
            onClick={handleOk}
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, alert, confirmModal };
}
