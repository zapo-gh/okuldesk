import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { ActionModal } from '../../../../components/ui/ActionModal';
import { Button } from '../../../../components/ui/Button';
import { DEFAULT_PERIOD_TIMES, getPeriodTimes, savePeriodTimes } from './periodTimesHelper';
import toast from 'react-hot-toast';

interface PeriodTimesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const PeriodTimesModal: React.FC<PeriodTimesModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [times, setTimes] = useState<Record<number, string>>({ ...DEFAULT_PERIOD_TIMES });

  useEffect(() => {
    if (isOpen) {
      setTimes(getPeriodTimes());
    }
  }, [isOpen]);

  const handleTimeChange = (period: number, value: string) => {
    setTimes(prev => ({ ...prev, [period]: value }));
  };

  const handleSave = () => {
    savePeriodTimes(times);
    toast.success('Ders saatleri başarıyla kaydedildi!');
    if (onUpdated) onUpdated();
    onClose();
  };

  const handleReset = () => {
    setTimes({ ...DEFAULT_PERIOD_TIMES });
    toast.success('Varsayılan ders saatlerine sıfırlandı.');
  };

  const periodKeys = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Ders Başlama ve Bitiş Saatleri Ayarı"
      width="lg"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      submitText="Kaydet"
      cancelText="İptal"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900">
          <div className="flex items-start gap-2.5 flex-1 min-w-[200px]">
            <Clock size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Canlı Ders Takibi:</span> Okulunuzun zil saatlerini girin. Sistem otomatik olarak o anki dersi yeşil rozetle gösterir.
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleReset}
            className="gap-1.5 text-xs text-slate-600 hover:text-slate-800 shrink-0"
          >
            <RotateCcw size={13} />
            <span>Varsayılana Dön</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {periodKeys.map((p) => {
            const isLunchAfter = p === 5;
            return (
              <React.Fragment key={p}>
                <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100/70 transition">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {p}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      {p}. Ders Saati
                    </label>
                    <input
                      type="text"
                      value={times[p] || ''}
                      onChange={(e) => handleTimeChange(p, e.target.value)}
                      placeholder="08:30 - 09:10"
                      className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {isLunchAfter && (
                  <div className="sm:col-span-2 py-1 px-3 bg-amber-50 border border-amber-200/70 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold text-amber-800">
                    <span>🍽️</span>
                    <span>Öğle Arası (12:30 - 13:40)</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </ActionModal>
  );
};
