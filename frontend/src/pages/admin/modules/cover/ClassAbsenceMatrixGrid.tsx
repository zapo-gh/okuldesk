import React, { useState, useMemo } from 'react';
import {
  Search, AlertTriangle, UserX, Clock, MapPin, X,
  Check, Users, BookOpen, Trash2, Plus
} from 'lucide-react';
import { parseAndStandardizeClass } from '../../../../utils/classNameFormatter';

interface ClassAbsenceMatrixGridProps {
  covers: any[];
  absences: any[];
  classDisplayMap?: Record<string, string>;
  onRemoveAbsence?: (absenceId: string) => void;
  manualCoverOverrides?: Record<string, any>;
  onToggleCellEmpty?: (className: string, period: number, isCurrentlyEmpty: boolean, room?: string) => void;
  onClearClassOverrides?: (className: string) => void;
  allClassNames?: string[];
  maxPeriod?: number;
}

const GRADE_GRADIENTS: Record<string, string> = {
  '9': 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  '10': 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
  '11': 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
  '12': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
};

function getGradeBadgeColor(grade: string = '') {
  return GRADE_GRADIENTS[grade] || 'linear-gradient(135deg, #334155 0%, #64748b 100%)';
}

function getReasonBadgeClass(reason: string = '') {
  const r = reason.toLowerCase();
  if (r.includes('rapor')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (r.includes('sevk')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (r.includes('görev') || r.includes('gorev')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (r.includes('manuel')) return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

export const ClassAbsenceMatrixGrid: React.FC<ClassAbsenceMatrixGridProps> = ({
  covers,
  absences,
  classDisplayMap = {},
  manualCoverOverrides = {},
  onToggleCellEmpty,
  onClearClassOverrides,
  allClassNames = [],
  maxPeriod = 11,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'has_empty' | 'full'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newPeriod, setNewPeriod] = useState(1);
  const [newRoom, setNewRoom] = useState('');

  const periods = useMemo(() => {
    const list: number[] = [];
    for (let i = 1; i <= Math.max(maxPeriod, 10); i++) list.push(i);
    return list;
  }, [maxPeriod]);

  const morningPeriods = useMemo(() => periods.filter((p) => p <= 5), [periods]);
  const afternoonPeriods = useMemo(() => periods.filter((p) => p > 5), [periods]);

  // Devamsızlık haritası (staffId -> reason)
  const reasonMap = useMemo(() => {
    const map = new Map<string, string>();
    absences.forEach((a) => {
      const r = a.reason || 'İzinli';
      const timeStr = a.absenceTime === 'SABAH' ? ' (Sabah)' : a.absenceTime === 'OGLEDEN_SONRA' ? ' (Öğleden Sonra)' : '';
      map.set(String(a.staffId), r + timeStr);
    });
    return map;
  }, [absences]);

  // Sınıflara göre gruplama: [className] -> { room, periods: [period -> cover] }
  const classRows = useMemo(() => {
    const map = new Map<string, {
      rawClassName: string;
      meta: any;
      room: string;
      periodsMap: Map<number, any>;
    }>();

    covers.forEach((c) => {
      const raw = (c.className || '').trim();
      if (!raw) return;

      let row = map.get(raw);
      if (!row) {
        row = {
          rawClassName: raw,
          meta: parseAndStandardizeClass(raw, classDisplayMap),
          room: c.room || '',
          periodsMap: new Map<number, any>(),
        };
        map.set(raw, row);
      }
      if (c.room && !row.room) row.room = c.room;
      row.periodsMap.set(c.period, c);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.meta.displayName.localeCompare(b.meta.displayName, 'tr-TR', { numeric: true })
    );
  }, [covers, classDisplayMap]);

  // Saat bazında kaç boş ders olduğu (örn: 1 boş, 2 boş, 0 boş)
  const periodEmptyCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    periods.forEach((p) => {
      let count = 0;
      classRows.forEach((row) => {
        if (row.periodsMap.has(p)) count++;
      });
      counts[p] = count;
    });
    return counts;
  }, [classRows, periods]);

  // Filtreleme
  const filteredRows = useMemo(() => {
    return classRows.filter((row) => {
      const emptyCount = row.periodsMap.size;
      if (filterType === 'has_empty' && emptyCount === 0) return false;
      if (filterType === 'full' && emptyCount > 0) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLocaleLowerCase('tr-TR');
      return (
        row.meta.displayName.toLocaleLowerCase('tr-TR').includes(q) ||
        row.rawClassName.toLocaleLowerCase('tr-TR').includes(q) ||
        row.room.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [classRows, filterType, searchTerm]);

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    onToggleCellEmpty?.(newClassName.trim(), newPeriod, false, newRoom.trim());
    setIsAddModalOpen(false);
    setNewClassName('');
    setNewRoom('');
  };

  return (
    <div className="space-y-3">
      {/* Top Toolbar (Matching Görsel 2) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Arama Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sınıf veya derslik ara (örn: 9-A, B-03)..."
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Durum Filtre Çipleri ve Ekle Butonu */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü ({classRows.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('has_empty')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  filterType === 'has_empty'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Boş Dersi Olanlar ({classRows.filter(r => r.periodsMap.size > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('full')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  filterType === 'full'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dolu Sınıflar ({classRows.filter(r => r.periodsMap.size === 0).length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition"
              title="Manuel olarak bir sınıfa boş ders ekleyin"
            >
              <Plus size={14} /> Boş Ders Ekle
            </button>
          </div>
        </div>

        {/* Bilgilendirme İpucu */}
        <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 flex items-center justify-between">
          <span>
            💡 <strong>İpucu:</strong> Boş dersler ders programına göre otomatik işaretlenir. İstediğiniz saat hücresine tıklayarak <strong>manuel boş ders açabilir</strong> veya mevcut boş ders işaretini kaldırabilirsiniz.
          </span>
        </div>
      </div>

      {/* Main Class Absence Grid Table (Matching Görsel 2) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1000px]">
            <thead>
              {/* Üst Kategori Başlıkları: Sabah / Öğleden Sonra */}
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 text-xs font-bold">
                <th className="px-3 py-2 text-left border-r border-slate-200 w-72 min-w-[18rem] max-w-[18rem] bg-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="uppercase text-[11px] font-extrabold text-slate-800 tracking-wider">
                      Sınıf Bilgisi & Derslik ({filteredRows.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Sınıf & Konum</span>
                  </div>
                </th>

                {/* Öğleden Önce */}
                <th
                  colSpan={morningPeriods.length}
                  className="px-2 py-1.5 text-center bg-amber-50/70 text-amber-900 border-r border-slate-200 font-extrabold text-[11px]"
                >
                  ☀️ ÖĞLEDEN ÖNCE
                </th>

                {/* Öğleden Sonra */}
                <th
                  colSpan={afternoonPeriods.length}
                  className="px-2 py-1.5 text-center bg-sky-50/70 text-sky-900 border-r border-slate-200 last:border-r-0 font-extrabold text-[11px]"
                >
                  🌤️ ÖĞLEDEN SONRA
                </th>
              </tr>

              {/* Saat Numaraları ve Boş Sayısı */}
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-center">
                <th className="px-3 py-1.5 text-left border-r border-slate-200 bg-slate-50 text-[10px] text-slate-400 w-72 min-w-[18rem] max-w-[18rem]">
                  Ders Saatleri
                </th>
                {periods.map((p) => {
                  const emptyCount = periodEmptyCounts[p] || 0;
                  return (
                    <th
                      key={p}
                      className="px-1.5 py-1.5 border-r border-slate-200 last:border-r-0 min-w-[70px]"
                    >
                      <div className="font-extrabold text-slate-800 text-[11px]">{p}</div>
                      <div className="text-[10px] font-medium text-slate-400">
                        {emptyCount} boş
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={periods.length + 1} className="py-12 text-center text-slate-400 text-xs">
                    <AlertTriangle size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">Boş dersi olan sınıf bulunamadı.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Yukarıdaki <strong>"+ Boş Ders Ekle"</strong> butonunu kullanarak veya devamsız öğretmen ekleyerek başlayabilirsiniz.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const emptyTotal = row.periodsMap.size;

                  return (
                    <tr key={row.rawClassName} className="hover:bg-slate-50/70 transition-colors group/row">
                      {/* Sol: Sınıf Rozeti, İsim, Derslik, Boş Sayısı */}
                      <td className="px-3 py-2.5 border-r border-slate-200 bg-slate-50/30 w-72 min-w-[18rem] max-w-[18rem]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ background: getGradeBadgeColor(row.meta.grade) }}
                          >
                            {row.meta.grade}
                            {row.meta.section || ''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-slate-800 text-xs truncate" title={row.meta.displayName}>
                              {row.meta.displayName}
                            </div>
                            {row.room && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium truncate mt-0.5">
                                <MapPin size={10} className="text-red-500 shrink-0" />
                                <span>{row.room}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200/80 rounded-full font-bold text-[10px] whitespace-nowrap">
                              {emptyTotal} boş
                            </span>
                            {onClearClassOverrides && (
                              <button
                                type="button"
                                onClick={() => onClearClassOverrides(row.rawClassName)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-opacity opacity-0 group-hover/row:opacity-100 focus:opacity-100 cursor-pointer"
                                title="Bu sınıfın manuel boş ders işaretlerini sıfırla"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Saatlik Boş Ders Hücreleri (Matching Görsel 2) */}
                      {periods.map((p) => {
                        const cover = row.periodsMap.get(p);

                        if (!cover) {
                          // Bu saat dolu -> Tıklayarak Boş Ders Yapabilir
                          return (
                            <td
                              key={p}
                              className="p-1 text-center align-middle border-r border-slate-200 last:border-r-0"
                            >
                              <button
                                type="button"
                                onClick={() => onToggleCellEmpty?.(row.rawClassName, p, false, row.room)}
                                className="w-9 h-8 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl flex items-center justify-center text-[10px] text-slate-300 hover:text-indigo-600 font-medium mx-auto transition cursor-pointer group/cell"
                                title={`${row.meta.displayName} - ${p}. Saati Boş Ders Olarak İşaretle`}
                              >
                                <span className="group-hover/cell:hidden">{p}</span>
                                <span className="hidden group-hover/cell:inline font-bold text-xs text-indigo-600">+</span>
                              </button>
                            </td>
                          );
                        }

                        // Bu saatte öğretmen gelmediği için veya manuel olarak boş
                        const absentName = cover.absentStaff?.name || 'İzinli Öğretmen';
                        const reason = cover.reason || reasonMap.get(String(cover.absentStaffId)) || 'İzinli';

                        return (
                          <td
                            key={p}
                            className="p-1 text-center align-middle border-r border-slate-200 last:border-r-0"
                          >
                            <div className="flex flex-col items-center gap-1 group/item">
                              {/* Mor Dolu Saat Rozeti - Tıklanınca kaldırabilir */}
                              <button
                                type="button"
                                onClick={() => onToggleCellEmpty?.(row.rawClassName, p, true, row.room)}
                                className="w-9 h-8 bg-indigo-600 group-hover/item:bg-rose-600 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-0.5 shadow-xs transition-colors cursor-pointer"
                                title={`${row.meta.displayName} - ${p}. Ders boş işaretini kaldır`}
                              >
                                <span className="group-hover/item:hidden">{p}</span>
                                <Check size={11} strokeWidth={3} className="group-hover/item:hidden" />
                                <X size={13} strokeWidth={3} className="hidden group-hover/item:inline" />
                              </button>

                              {/* Devamsız Öğretmen Kartı ve Mazeret Rozeti */}
                              <div className="bg-white border border-slate-200 rounded-lg p-1 shadow-2xs text-left max-w-[95px] w-full">
                                <div className="text-[10px] font-bold text-slate-800 truncate" title={absentName}>
                                  {absentName}
                                </div>
                                <span
                                  className={`inline-block text-[8px] font-semibold px-1 py-0.2 rounded border mt-0.5 truncate max-w-full ${getReasonBadgeClass(
                                    reason
                                  )}`}
                                >
                                  {reason}
                                </span>
                                {(cover.isCombined || cover.isMerged) && (
                                  <div
                                    className="text-[8px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1 py-0.2 mt-0.5 truncate"
                                    title={`Grup Birleştirildi: ${cover.mergedWithStaff?.name || cover.presentCoTeachers?.[0]?.name || ''}`}
                                  >
                                    📚 {cover.mergedWithStaff?.name || cover.presentCoTeachers?.[0]?.name ? `Birleşti: ${cover.mergedWithStaff?.name || cover.presentCoTeachers?.[0]?.name}` : 'Birleştirildi'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manuel Boş Ders Ekleme Modalı */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" />
                Manuel Boş Ders Ekle
              </h4>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Sınıf Adı:</label>
                {allClassNames && allClassNames.length > 0 ? (
                  <select
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  >
                    <option value="">Sınıf Seçin...</option>
                    {allClassNames.map(cn => (
                      <option key={cn} value={cn}>
                        {parseAndStandardizeClass(cn, classDisplayMap).displayName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Örn: 9-A veya AMP 10-A"
                    required
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ders Saati:</label>
                  <select
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  >
                    {periods.map(p => (
                      <option key={p} value={p}>{p}. Saat</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Derslik / Konum:</label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="Örn: B-03"
                    className="w-full p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs"
                >
                  Boş Ders Olarak Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
