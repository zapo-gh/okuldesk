import React, { useState, useEffect } from 'react';
import { FileText, Edit2, Check, Plus, Eye, EyeOff } from 'lucide-react';

export const DEFAULT_PRINT_NOTES = `1. Nöbetçi öğretmenler boş geçen derslere zamanında girmekle yükümlüdür.
2. Sınıf defteri ve yoklama fişleri ilgili ders saatinde nöbetçi öğretmen tarafından doldurulup imzalanacaktır.
3. Görevli öğretmenler okul idaresinin bilgisi dışında görev yerini terk edemezler.`;

interface PrintNotesCardProps {
  notes: string;
  notesEnabled: boolean;
  onNotesChange: (notes: string) => void;
  onNotesEnabledChange: (enabled: boolean) => void;
}

export const PrintNotesCard: React.FC<PrintNotesCardProps> = ({
  notes,
  notesEnabled,
  onNotesChange,
  onNotesEnabledChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(notes || DEFAULT_PRINT_NOTES);

  useEffect(() => {
    setText(notes || DEFAULT_PRINT_NOTES);
  }, [notes]);

  const handleSave = () => {
    onNotesChange(text);
    setIsEditing(false);
  };

  const addSnippet = (snippet: string) => {
    setText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n${snippet}` : snippet;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 shadow-xs">
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Resmi Çıktı Notları & Açıklamalar</h3>
            <p className="text-xs text-slate-500">Yazdırılan çizelge ve listenin altındaki resmi tebliğ maddeleri</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={notesEnabled}
              onChange={(e) => onNotesEnabledChange(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            {notesEnabled ? (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <Eye size={14} /> Çıktıda Görünür
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <EyeOff size={14} /> Çıktıda Gizli
              </span>
            )}
          </label>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition"
            >
              <Edit2 size={13} /> Düzenle
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition shadow-xs"
            >
              <Check size={14} /> Kaydet
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed bg-slate-50/50"
            placeholder="Çıktı altında yer alacak maddeleri buraya yazın..."
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Hızlı Kural Ekle:</span>
            <button
              type="button"
              onClick={() => addSnippet('Nöbetçi öğretmenler boş geçen derslere zamanında girmekle yükümlüdür.')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
            >
              <Plus size={12} /> Boş Ders Kuralı
            </button>
            <button
              type="button"
              onClick={() => addSnippet('Sınıf defteri ve yoklama fişleri ilgili ders saatinde nöbetçi öğretmen tarafından doldurulup imzalanacaktır.')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
            >
              <Plus size={12} /> Defter & Yoklama
            </button>
            <button
              type="button"
              onClick={() => addSnippet('Görevli öğretmenler okul idaresinin bilgisi dışında görev yerini terk edemezler.')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
            >
              <Plus size={12} /> Görev Yeri Terk
            </button>
            <button
              type="button"
              onClick={() => addSnippet('Olası acil durumlarda derhal nöbetçi müdür yardımcısına bilgi verilecektir.')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
            >
              <Plus size={12} /> İdare Bilgilendirme
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 font-sans whitespace-pre-line leading-relaxed">
          {notes || <span className="text-slate-400 italic">Resmi açıklama metni girilmemiş.</span>}
        </div>
      )}
    </div>
  );
};
