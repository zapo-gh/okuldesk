import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface DeleteAllSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
  totalStudents: number;
  totalClasses?: number;
  activeClassName?: string;
}

const CONFIRMATION_KEYWORD = 'TÜMÜNÜ SİL';

export function DeleteAllSecurityModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  totalStudents,
  totalClasses,
  activeClassName,
}: DeleteAllSecurityModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setIsAcknowledged(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedInput = confirmInput.trim().toLocaleUpperCase('tr-TR');
  const isKeywordMatched = normalizedInput === CONFIRMATION_KEYWORD;
  const canSubmit = isKeywordMatched && isAcknowledged && !loading;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !loading) {
      onClose();
    } else if (e.key === 'Enter' && canSubmit) {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-5 border-b border-red-100 bg-red-50/80 flex items-start justify-between gap-3.5">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0 shadow-xs">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Kritik Güvenlik Adımı: Tüm Öğrencileri Sil
              </h3>
              <p className="text-xs text-red-800/80 mt-0.5">
                Veritabanındaki tüm öğrenci kayıtlarını toplu ve kalıcı olarak temizleme işlemi
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-red-100/60 transition-colors disabled:opacity-50"
            title="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* İstatistik / Etki Alanı */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium">Silme Kapsamı:</span>
              <span className="font-semibold text-red-700 bg-red-100/80 px-2 py-0.5 rounded text-xs">
                Okul Genelindeki Tüm Sınıflar
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium">Silinecek Toplam Öğrenci:</span>
              <span className="font-mono font-bold text-red-600 text-sm bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
                {totalStudents} Öğrenci {totalClasses ? `(${totalClasses} Sınıf)` : ''}
              </span>
            </div>
            {activeClassName && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>Bilgilendirme:</strong> Şu anda ekranda <strong>{activeClassName}</strong> sınıf sekmesi açık olsa dahi, bu işlem yalnızca {activeClassName} sınıfını değil; <strong>okul genelindeki tüm sınıfları ve tüm öğrencileri ({totalStudents} kayıt)</strong> kapsar.
              </div>
            )}
            <div className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Silinecek Bağlı Veriler:</strong> Öğrenci profilleri, veli eşleştirmeleri, WhatsApp iletişim izinleri, devamsızlık mektupları, yazılı uyarılar, ihlal ve başarısızlık riski bildirimleri.
            </div>
          </div>

          {/* Tehlike Uyarı Kutusu */}
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold text-red-900 block">
                DİKKAT: Bu işlem kesinlikle geri alınamaz!
              </strong>
              <p className="text-[11px] leading-relaxed text-red-800">
                Tüm veriler veritabanından kalıcı olarak silinecek ve sonradan geri getirilemeyecektir. İşleme devam etmek istediğinizden kesin olarak eminseniz aşağıdaki adımları onaylayınız.
              </p>
            </div>
          </div>

          {/* Onay Kelimesi Girişi */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              İşlemi onaylamak için kutucuğa{' '}
              <span className="font-bold text-red-800 bg-red-100 px-1.5 py-0.5 rounded font-mono tracking-wider">
                {CONFIRMATION_KEYWORD}
              </span>{' '}
              yazınız:
            </label>
            <div className="relative">
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={CONFIRMATION_KEYWORD}
                disabled={loading}
                autoFocus
                className={`w-full px-3.5 py-2.5 border-2 rounded-lg text-sm font-mono uppercase tracking-wider focus:outline-none transition-all ${
                  isKeywordMatched
                    ? 'border-emerald-500 bg-emerald-50/30 text-emerald-900 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-slate-300 focus:border-red-500 text-slate-900 focus:ring-2 focus:ring-red-500/20'
                }`}
              />
              {isKeywordMatched && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
              )}
            </div>
          </div>

          {/* Checkbox Onayı */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none hover:bg-slate-100/60 transition-colors">
            <input
              type="checkbox"
              checked={isAcknowledged}
              onChange={(e) => setIsAcknowledged(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <span className="text-xs text-slate-700 leading-snug">
              Tüm öğrenci verilerinin ve geçmiş kayıtların kalıcı olarak silineceğini, bu işlemin geri dönüşü olmadığını anladım ve onaylıyorum.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900"
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={onConfirm}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              canSubmit
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Siliniyor...</span>
              </>
            ) : (
              <span>Tüm Öğrencileri Kalıcı Olarak Sil</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
