import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  width?: 'md' | 'lg' | 'xl' | 'full';
  submitDisabled?: boolean;
  hideSubmit?: boolean;
  hideFooter?: boolean;
}

export function ActionModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = 'Kaydet',
  cancelText = 'İptal',
  width = 'md',
  submitDisabled = false,
  hideSubmit = false,
  hideFooter = false,
}: ActionModalProps) {
  
  // ESC ile kapatma
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Body scroll kilitleme
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClass = {
    md: 'w-full max-w-md',
    lg: 'w-full max-w-lg',
    xl: 'w-full max-w-2xl',
    full: 'w-[calc(100vw-2rem)] max-w-[1600px] sm:w-[calc(100vw-3rem)]'
  }[width];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:hidden">
      {/* Backdrop (Blur iptal, koyu gölge eklendi) */}
      <div 
        className="fixed inset-0 bg-gray-900/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div 
        className={`relative ${widthClass} bg-white rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden transform transition-all scale-100 opacity-100 animate-in fade-in zoom-in duration-200`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body & Form */}
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-4 overflow-auto flex-1 bg-gray-50/30">
              {children}
            </div>
            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50/50 border-t border-gray-100 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              {cancelText}
            </Button>
            {!hideSubmit && (
              <Button
                type="submit"
                variant="primary"
                disabled={submitDisabled}
              >
                {submitText}
              </Button>
            )}
          </div>
          </form>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-4 overflow-auto flex-1 bg-gray-50/30">
              {children}
            </div>
            {/* Modal Footer (No Form) */}
            {!hideFooter && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Kapat
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
