import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Users, Check, X, Search, AlertCircle, Sparkles } from 'lucide-react';
import { parseAndStandardizeClass } from '../../../../utils/classNameFormatter';

interface CommonLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (teacherId: string, teacherName: string) => void;
  cover: any;
  detectedCoTeachers?: { id: string; name: string }[];
  staffList?: { id: string; name: string; brans?: string; gorev?: string }[];
  classDisplayMap?: Record<string, string>;
}

export const CommonLessonModal: React.FC<CommonLessonModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  cover,
  detectedCoTeachers = [],
  staffList = [],
  classDisplayMap = {},
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const primaryDetected = detectedCoTeachers.length > 0 ? detectedCoTeachers[0] : null;

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSearchQuery('');
      if (primaryDetected) {
        setSelectedTeacherId(primaryDetected.id);
        setShowManualSelect(false);
      } else {
        setSelectedTeacherId('');
        setShowManualSelect(true);
      }
    }
  }, [isOpen, primaryDetected]);

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLocaleLowerCase('tr-TR');
    return staffList.filter((s) =>
      (s.name || '').toLocaleLowerCase('tr-TR').includes(q) ||
      (s.brans || '').toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [staffList, searchQuery]);

  if (!isOpen || !cover) return null;

  const displayClass = parseAndStandardizeClass(cover.className || '', classDisplayMap).displayName;
  const absentTeacherName = cover.absentStaff?.name || 'İzinli Öğretmen';

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      setError('Lütfen birleştirilecek öğretmeni seçin.');
      return;
    }

    const teacher = staffList.find((t) => t.id === selectedTeacherId) ||
      detectedCoTeachers.find((t) => t.id === selectedTeacherId);

    const teacherName = teacher?.name || 'Öğretmen';
    onSubmit(selectedTeacherId, teacherName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Ortak Ders / Grup Birleştirme</h3>
              <p className="text-purple-200 text-xs mt-0.5">
                Aynı sınıftaki diğer grup ile dersleri birleştirin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {/* Sınıf & Ders Bağlamı Kartı */}
          <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <div className="font-extrabold text-purple-900 text-sm">
                {displayClass} — {cover.period}. Ders Saati
              </div>
              <div className="text-purple-700 mt-0.5 flex items-center gap-1.5 font-medium">
                <span>Ders: {cover.subject || 'Atölye / Ortak Ders'}</span>
                {cover.room && <span className="text-purple-400">•</span>}
                {cover.room && <span>Derslik: {cover.room}</span>}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-purple-500 block">Gelmeyen Öğretmen</span>
              <span className="font-bold text-slate-800 text-xs">{absentTeacherName}</span>
            </div>
          </div>

          {/* Programdan Tespit Edilen Öğretmen Kartı (Var ise) */}
          {primaryDetected && !showManualSelect ? (
            <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Sparkles size={11} className="text-emerald-600" />
                  Diğer Grubun Öğretmeni (Tespit Edildi)
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  Okulda / Görevde
                </span>
              </div>

              <div>
                <div className="text-base font-extrabold text-emerald-950 flex items-center gap-2">
                  <Users size={18} className="text-emerald-600" />
                  {primaryDetected.name}
                </div>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  Ders programına göre bu saatte aynı sınıfta diğer grubu okutan öğretmen tespit edildi.
                  Bu öğretmen ile grup birleştirmesi yapılacaktır.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-emerald-200/80">
                <button
                  type="button"
                  onClick={() => setShowManualSelect(true)}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                >
                  Farklı bir öğretmen seçmek istiyorum →
                </button>
              </div>
            </div>
          ) : (
            /* Manuel Öğretmen Seçici */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Birleştirilecek Öğretmeni Seçin:
                </label>
                {primaryDetected && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualSelect(false);
                      setSelectedTeacherId(primaryDetected.id);
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    ← Tespit edilen öğretmene dön ({primaryDetected.name})
                  </button>
                )}
              </div>

              {/* Arama */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Öğretmen veya branş ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
              </div>

              {/* Liste */}
              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl p-1.5 space-y-1">
                {filteredTeachers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Eşleşen öğretmen bulunamadı.
                  </div>
                ) : (
                  filteredTeachers.map((t) => {
                    const isSelected = selectedTeacherId === t.id;
                    const isDetected = primaryDetected?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTeacherId(t.id)}
                        className={`w-full p-2 rounded-lg flex items-center justify-between text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white font-bold shadow-xs'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users size={14} className={isSelected ? 'text-white' : 'text-slate-400'} />
                          <span>{t.name}</span>
                          {t.brans && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded ${
                                isSelected ? 'bg-purple-700 text-purple-100' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {t.brans}
                            </span>
                          )}
                          {isDetected && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              Programdaki Eş
                            </span>
                          )}
                        </div>
                        {isSelected && <Check size={14} className="text-white shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Bilgilendirme Notu */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed">
            ℹ️ <span className="font-semibold text-slate-700">Grup Birleştirme Mantığı:</span> Dersi birleştirilen öğretmen, bu ders saatinde kendi grubuna ek olarak devamsız öğretmenin grubunu da okutacaktır. Nöbetçi öğretmen harcanmaz.
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Butonlar */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-sm transition flex items-center gap-1.5"
            >
              <Check size={14} />
              Grubu Birleştir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
