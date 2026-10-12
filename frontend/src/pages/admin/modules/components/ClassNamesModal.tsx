import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, RotateCcw, Save, Search, CheckCircle2, Tag, BookOpen } from 'lucide-react';
import { ActionModal } from '../../../../components/ui/ActionModal';
import { Button } from '../../../../components/ui/Button';
import {
  parseAndStandardizeClass,
  generateAutoClassDisplayMap,
  ClassMeta
} from '../../../../utils/classNameFormatter';

interface ClassNamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawClassNames: string[];
  currentMap: Record<string, string>;
  onSave: (newMap: Record<string, string>) => Promise<void>;
}

export const ClassNamesModal: React.FC<ClassNamesModalProps> = ({
  isOpen,
  onClose,
  rawClassNames,
  currentMap,
  onSave
}) => {
  const [localMap, setLocalMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeTab, setSelectedGradeTab] = useState<string>('ALL');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalMap({ ...currentMap });
      setSearchQuery('');
      setSelectedGradeTab('ALL');
    }
  }, [isOpen, currentMap]);

  // Tüm sınıfların analiz edilmiş meta listesi
  const metaList = useMemo(() => {
    return rawClassNames.map(raw => {
      const meta = parseAndStandardizeClass(raw);
      const customValue = localMap[raw] !== undefined ? localMap[raw] : meta.displayName;
      return {
        ...meta,
        currentDisplay: customValue
      };
    });
  }, [rawClassNames, localMap]);

  // Kademe sayıları
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: metaList.length };
    metaList.forEach(m => {
      counts[m.grade] = (counts[m.grade] || 0) + 1;
    });
    return counts;
  }, [metaList]);

  // Filtrelenmiş liste
  const filteredList = useMemo(() => {
    return metaList.filter(m => {
      if (selectedGradeTab !== 'ALL' && m.grade !== selectedGradeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase('tr-TR');
        return (
          m.raw.toLocaleLowerCase('tr-TR').includes(q) ||
          m.currentDisplay.toLocaleLowerCase('tr-TR').includes(q) ||
          Boolean(m.branch && m.branch.toLocaleLowerCase('tr-TR').includes(q))
        );
      }
      return true;
    });
  }, [metaList, selectedGradeTab, searchQuery]);

  const handleInputChange = (raw: string, value: string) => {
    setLocalMap(prev => ({
      ...prev,
      [raw]: value
    }));
  };

  // ⚡ Otomatik Standartlaştır Butonu
  const handleAutoStandardize = () => {
    const autoMap = generateAutoClassDisplayMap(rawClassNames);
    setLocalMap(autoMap);
    toast.success('Tüm sınıflar akıllı kurallarla (AMP/ATP) otomatik standartlaştırıldı!');
  };

  // Varsayılana Dön (Excel Ham İsimleri)
  const handleResetToRaw = () => {
    const rawMap: Record<string, string> = {};
    rawClassNames.forEach(c => {
      rawMap[c] = c;
    });
    setLocalMap(rawMap);
    toast('Sınıf isimleri Excel ham hallerine sıfırlandı.', { icon: 'ℹ️' });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSave(localMap);
      toast.success('Sınıf isimleri başarıyla kaydedildi ve uygulandı.');
      onClose();
    } catch {
      toast.error('Kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Sınıf İsimlerini Düzenleme ve Standartlaştırma"
      width="xl"
      hideFooter
    >
      <div className="space-y-4">
        {/* Üst Bilgi ve Aksiyonlar */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Tag size={15} className="text-indigo-600" />
              Akıllı İsim Eşleştirme
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Excel programından gelen karmaşık ve bitişik sınıf isimlerini tek tıkla düzenleyin veya okulunuza özel yeniden adlandırın.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToRaw}
              className="text-xs text-slate-600 border-slate-300 hover:bg-slate-100 gap-1.5"
              title="Tümünü Excel'deki ham haline döndürür"
            >
              <RotateCcw size={13} /> Ham İsimler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAutoStandardize}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm"
              title="Eksik AMP'leri ekler, bitişik kelimeleri ve şubeleri akıllıca ayırır"
            >
              <Sparkles size={14} className="text-amber-300" /> ⚡ Otomatik Standartlaştır
            </Button>
          </div>
        </div>

        {/* Filtre ve Arama Çubuğu */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Kademe Sekmeleri */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs gap-1 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedGradeTab('ALL')}
              className={`px-3 py-1.5 rounded-md font-bold transition whitespace-nowrap ${
                selectedGradeTab === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tümü ({gradeCounts['ALL'] || 0})
            </button>
            {['9', '10', '11', '12', 'Özel'].map(grade => {
              const count = gradeCounts[grade] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGradeTab(grade)}
                  className={`px-3 py-1.5 rounded-md font-bold transition whitespace-nowrap ${
                    selectedGradeTab === grade
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {grade === 'Özel' ? 'Özel Eğitim' : `${grade}. Sınıf`} ({count})
                </button>
              );
            })}
          </div>

          {/* Arama Kutusu */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Sınıf veya alan ara..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Tablo */}
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 font-bold text-slate-700 w-12 text-center">#</th>
                <th className="py-2.5 px-3 font-bold text-slate-700 w-48">Ham İsim (Excel / aSc)</th>
                <th className="py-2.5 px-3 font-bold text-slate-700 w-28">Tür / Kademe</th>
                <th className="py-2.5 px-3 font-bold text-slate-700">Görünen İsim (Düzenlenebilir)</th>
                <th className="py-2.5 px-3 font-bold text-slate-700 w-44 text-right">Önizleme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    Eşleşen sınıf bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.raw} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-700 bg-slate-50/50">
                      {item.raw}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.program === 'ATP'
                            ? 'bg-amber-100 text-amber-800'
                            : item.program === 'ÖZEL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {item.program} {item.grade !== 'Özel' && item.grade !== 'Diğer' ? `${item.grade}` : ''}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={item.currentDisplay}
                        onChange={e => handleInputChange(item.raw, e.target.value)}
                        className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white font-medium"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                        {item.currentDisplay || item.raw}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Alt Butonlar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[11px] text-slate-500">
            Toplam <b className="text-slate-800">{rawClassNames.length}</b> sınıf tanımlı
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              İptal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5 shadow-sm"
            >
              <Save size={14} /> {saving ? 'Kaydediliyor...' : 'Kaydet ve Uygula'}
            </Button>
          </div>
        </div>
      </div>
    </ActionModal>
  );
};
