import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar, Search, Clock, Users, BookOpen, Filter,
  Printer, Sparkles, ChevronRight, X, AlertCircle, Eye
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { parseAndStandardizeClass } from '../../../../utils/classNameFormatter';
import {
  shortenSubjectName,
  getSubjectGradient,
  getGradeBadgeColor,
  getTeacherInitials,
  getTeacherAvatarGradient,
} from './subjectColors';
import { getCurrentPeriodInfo, getPeriodTimes } from './periodTimesHelper';

interface ClassDailyMatrixViewProps {
  classNames: string[];
  allEntries: any[];
  classDisplayMap?: Record<string, string>;
  onCellClick?: (group: any) => void;
  schoolName?: string;
  academicYear?: string;
}

const DAYS = [
  { val: 1, label: 'Pazartesi', short: 'Pzt' },
  { val: 2, label: 'Salı', short: 'Sal' },
  { val: 3, label: 'Çarşamba', short: 'Çar' },
  { val: 4, label: 'Perşembe', short: 'Per' },
  { val: 5, label: 'Cuma', short: 'Cum' },
];

export const ClassDailyMatrixView: React.FC<ClassDailyMatrixViewProps> = ({
  classNames,
  allEntries,
  classDisplayMap = {},
  onCellClick,
  schoolName = 'Okul Adı',
  academicYear = '2025-2026',
}) => {
  // Varsayılan gün olarak bugünü seç (hafta sonuysa Pazartesi)
  const todayDow = useMemo(() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 5 ? d : 1;
  }, []);

  const [selectedDay, setSelectedDay] = useState<number>(todayDow);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_lesson' | 'has_gap'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const periodTimes = useMemo(() => getPeriodTimes(), []);
  const currentPeriodInfo = useMemo(() => getCurrentPeriodInfo(periodTimes), [periodTimes]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Gunluk_Sinif_Matrisi_${DAYS.find(d => d.val === selectedDay)?.label || ''}`,
  });

  // Seçili güne ait entry haritası: [className][period] -> entry
  const dayMatrixMap = useMemo(() => {
    const map = new Map<string, Map<number, any>>();

    allEntries.forEach((e) => {
      if (e.dayOfWeek !== selectedDay || !e.className) return;
      const raw = e.className.replace(/\s+SEÇ\.?$/i, '').trim();

      let classPeriods = map.get(raw);
      if (!classPeriods) {
        // Check case-insensitive
        for (const [k, v] of map.entries()) {
          if (k.toLowerCase() === raw.toLowerCase()) {
            classPeriods = v;
            break;
          }
        }
      }

      if (!classPeriods) {
        classPeriods = new Map<number, any>();
        map.set(raw, classPeriods);
      }

      classPeriods.set(e.period, e);
    });

    return map;
  }, [allEntries, selectedDay]);

  // Sınıf metası listesi
  const classMetas = useMemo(() => {
    const gradeOrder: Record<string, number> = {
      '9': 9,
      '10': 10,
      '11': 11,
      '12': 12,
      'Özel': 90,
      'Diğer': 99,
    };

    return classNames
      .map((c) => parseAndStandardizeClass(c, classDisplayMap))
      .sort((a, b) => {
        const orderA = gradeOrder[a.grade] ?? (parseInt(a.grade, 10) || 99);
        const orderB = gradeOrder[b.grade] ?? (parseInt(b.grade, 10) || 99);
        if (orderA !== orderB) return orderA - orderB;
        return a.displayName.localeCompare(b.displayName, 'tr-TR', { numeric: true, sensitivity: 'base' });
      });
  }, [classNames, classDisplayMap]);

  // Kademe sayıları
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: classMetas.length };
    classMetas.forEach((m) => {
      counts[m.grade] = (counts[m.grade] || 0) + 1;
    });
    return counts;
  }, [classMetas]);

  // Ders saatleri listesi (standart 1..10)
  const maxPeriod = useMemo(() => {
    let maxP = 10;
    allEntries.forEach((e) => {
      if (e.period > maxP) maxP = e.period;
    });
    return Math.max(maxP, 10);
  }, [allEntries]);

  const morningPeriods = useMemo(() => [1, 2, 3, 4, 5], []);
  const afternoonPeriods = useMemo(() => {
    const list: number[] = [];
    for (let i = 6; i <= maxPeriod; i++) list.push(i);
    return list;
  }, [maxPeriod]);

  // Filtreleme
  const filteredClassMetas = useMemo(() => {
    return classMetas.filter((meta) => {
      if (selectedGrade !== 'ALL' && meta.grade !== selectedGrade) return false;

      const pMap = dayMatrixMap.get(meta.raw);
      const lessonCount = pMap ? pMap.size : 0;

      if (statusFilter === 'has_lesson' && lessonCount === 0) return false;
      if (statusFilter === 'has_gap') {
        if (lessonCount === 0) return false;
        // Check if there is an empty period between min and max period
        const periods = Array.from(pMap?.keys() || []).sort((a, b) => a - b);
        if (periods.length <= 1) return false;
        let hasGap = false;
        for (let p = periods[0]; p <= periods[periods.length - 1]; p++) {
          if (!pMap?.has(p)) {
            hasGap = true;
            break;
          }
        }
        if (!hasGap) return false;
      }

      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLocaleLowerCase('tr-TR');
      if (meta.displayName.toLocaleLowerCase('tr-TR').includes(q)) return true;
      if (meta.raw.toLocaleLowerCase('tr-TR').includes(q)) return true;

      // Check if any lesson or teacher matches query
      if (pMap) {
        for (const entry of pMap.values()) {
          if ((entry.subject || '').toLocaleLowerCase('tr-TR').includes(q)) return true;
          if ((entry.staff?.name || '').toLocaleLowerCase('tr-TR').includes(q)) return true;
          if ((entry.room || '').toLocaleLowerCase('tr-TR').includes(q)) return true;
        }
      }

      return false;
    });
  }, [classMetas, selectedGrade, statusFilter, searchTerm, dayMatrixMap]);

  const isToday = selectedDay === todayDow;

  return (
    <div className="space-y-3">
      {/* Top Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 space-y-2.5 print:hidden">
        {/* Row 1: Day Selector & Search & Print */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Day Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            {DAYS.map((d) => {
              const isSelected = selectedDay === d.val;
              const isCurrent = d.val === todayDow;
              return (
                <button
                  key={d.val}
                  type="button"
                  onClick={() => setSelectedDay(d.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {isCurrent && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-300 animate-ping' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>

          {/* Canlı Gösterge / Saat Özeti */}
          {isToday && currentPeriodInfo.isWeekday && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs font-bold text-emerald-800 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{currentPeriodInfo.badgeText}</span>
            </div>
          )}

          {/* Sağ Taraf: Arama & Yazdır */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative min-w-[180px] max-w-xs flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Sınıf, ders veya öğretmen ara..."
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handlePrint()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              title="A4 Yatay Çıktı Al"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Yazdır</span>
            </button>
          </div>
        </div>

        {/* Row 2: Kademe ve Durum Filtreleri */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {/* Kademe Filtreleri */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Kademe:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGrade('ALL')}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition ${
                selectedGrade === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tümü ({gradeCounts['ALL'] || 0})
            </button>
            {['9', '10', '11', '12', 'Özel'].map((grade) => {
              const count = gradeCounts[grade] || 0;
              if (count === 0) return null;
              const isSelected = selectedGrade === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGrade(isSelected ? 'ALL' : grade)}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {grade === 'Özel' ? 'Özel Eğitim' : `${grade}. Sınıf`} ({count})
                </button>
              );
            })}
          </div>

          {/* Durum Filtresi */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Durum:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-md font-semibold ${
                statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tümü
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('has_lesson')}
              className={`px-2 py-0.5 rounded-md font-semibold ${
                statusFilter === 'has_lesson' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Dersi Olanlar
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('has_gap')}
              className={`px-2 py-0.5 rounded-md font-semibold ${
                statusFilter === 'has_gap' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Dersleri arasında boş ders saati bulunan sınıflar"
            >
              Boş Saati Olanlar
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Matrix */}
      <div
        ref={printRef}
        className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden print:border-none print:shadow-none w-full min-w-0"
      >
        <style type="text/css" media="print">
          {`
            @page { size: A4 landscape; margin: 8mm; }
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              zoom: 0.80;
            }
          `}
        </style>

        {/* Print Header */}
        <div className="hidden print:block text-center py-3 mb-3 border-b-2 border-black">
          <h1 className="text-lg font-black uppercase text-black">{schoolName}</h1>
          <h2 className="text-base font-bold text-black mt-0.5">
            {DAYS.find((d) => d.val === selectedDay)?.label} Günü Tüm Sınıflar Ders Çizelgesi
          </h2>
          <p className="text-xs text-black mt-0.5 font-medium">
            {academicYear} EĞİTİM ÖĞRETİM YILI • Yazdırılma Tarihi: {new Date().toLocaleDateString('tr-TR')}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse print:border print:border-black min-w-[950px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 print:bg-slate-100 print:text-black">
                {/* Sınıf Sütunu */}
                <th className="px-3 py-2.5 text-left font-bold border-r border-slate-200 w-32 shrink-0">
                  Sınıf
                </th>

                {/* Sabah Dersleri (1 - 5) */}
                {morningPeriods.map((p) => {
                  const isCurrent = isToday && currentPeriodInfo.currentPeriod === p;
                  return (
                    <th
                      key={p}
                      className={`px-1.5 py-2 text-center font-bold border-r border-slate-200 transition-colors ${
                        isCurrent
                          ? 'bg-emerald-100/90 text-emerald-950 font-black ring-2 ring-emerald-500/50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{p}. Ders</span>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                        )}
                      </div>
                      <div className="text-[10px] font-normal text-slate-400 font-mono mt-0.5">
                        {periodTimes[p] || ''}
                      </div>
                    </th>
                  );
                })}

                {/* Öğle Arası Ayracı */}
                <th className="px-2 py-2 text-center font-bold bg-amber-50/70 text-amber-800 border-r border-slate-200 w-16 text-[11px]">
                  <div>Öğle</div>
                  <div className="text-[9px] text-amber-600 font-normal">Arası</div>
                </th>

                {/* Öğleden Sonra Dersleri (6 - 10) */}
                {afternoonPeriods.map((p) => {
                  const isCurrent = isToday && currentPeriodInfo.currentPeriod === p;
                  return (
                    <th
                      key={p}
                      className={`px-1.5 py-2 text-center font-bold border-r border-slate-200 transition-colors ${
                        isCurrent
                          ? 'bg-emerald-100/90 text-emerald-950 font-black ring-2 ring-emerald-500/50'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{p}. Ders</span>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                        )}
                      </div>
                      <div className="text-[10px] font-normal text-slate-400 font-mono mt-0.5">
                        {periodTimes[p] || ''}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {filteredClassMetas.map((meta) => {
                const pMap = dayMatrixMap.get(meta.raw);
                const dailyTotal = pMap ? pMap.size : 0;

                return (
                  <tr key={meta.raw} className="hover:bg-slate-50/60 transition-colors">
                    {/* Sınıf Bilgisi */}
                    <td className="px-2.5 py-2 border-r border-slate-200 bg-slate-50/40">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs"
                          style={{ background: getGradeBadgeColor(meta.grade) }}
                        >
                          {meta.grade}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-xs truncate">
                            {meta.displayName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {dailyTotal} Ders Saati
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sabah Dersleri (1 - 5) */}
                    {morningPeriods.map((p) => {
                      const entry = pMap?.get(p);
                      const isCurrent = isToday && currentPeriodInfo.currentPeriod === p;
                      return (
                        <td
                          key={p}
                          className={`p-1 border-r border-slate-200 text-center align-middle ${
                            isCurrent ? 'bg-emerald-50/40' : ''
                          }`}
                        >
                          {entry ? (
                            <div
                              onClick={() => onCellClick && onCellClick(entry)}
                              className="group p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs hover:shadow-xs hover:border-indigo-400 transition-all cursor-pointer text-left relative overflow-hidden"
                              title={`${entry.subject || ''} — ${entry.staff?.name || ''} ${entry.room ? `(${entry.room})` : ''}`}
                            >
                              {/* Ders Kısaltması Rozeti */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span
                                  className="text-[10px] font-black text-white px-1.5 py-0.2 rounded shadow-2xs truncate"
                                  style={{ background: getSubjectGradient(entry.subject || '') }}
                                >
                                  {shortenSubjectName(entry.subject || '')}
                                </span>
                                {entry.room && (
                                  <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 rounded truncate">
                                    {entry.room}
                                  </span>
                                )}
                              </div>

                              {/* Öğretmen Adı */}
                              <div className="text-[11px] font-semibold text-slate-800 truncate">
                                {entry.staff?.name || '—'}
                              </div>
                            </div>
                          ) : (
                            <div className="h-10 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-[10px] text-slate-300 font-medium">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Öğle Arası */}
                    <td className="bg-amber-50/40 border-r border-slate-200 text-center text-slate-300 text-[10px]">
                      ☕
                    </td>

                    {/* Öğleden Sonra Dersleri (6 - 10) */}
                    {afternoonPeriods.map((p) => {
                      const entry = pMap?.get(p);
                      const isCurrent = isToday && currentPeriodInfo.currentPeriod === p;
                      return (
                        <td
                          key={p}
                          className={`p-1 border-r border-slate-200 text-center align-middle ${
                            isCurrent ? 'bg-emerald-50/40' : ''
                          }`}
                        >
                          {entry ? (
                            <div
                              onClick={() => onCellClick && onCellClick(entry)}
                              className="group p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs hover:shadow-xs hover:border-indigo-400 transition-all cursor-pointer text-left relative overflow-hidden"
                              title={`${entry.subject || ''} — ${entry.staff?.name || ''} ${entry.room ? `(${entry.room})` : ''}`}
                            >
                              {/* Ders Kısaltması Rozeti */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span
                                  className="text-[10px] font-black text-white px-1.5 py-0.2 rounded shadow-2xs truncate"
                                  style={{ background: getSubjectGradient(entry.subject || '') }}
                                >
                                  {shortenSubjectName(entry.subject || '')}
                                </span>
                                {entry.room && (
                                  <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 rounded truncate">
                                    {entry.room}
                                  </span>
                                )}
                              </div>

                              {/* Öğretmen Adı */}
                              <div className="text-[11px] font-semibold text-slate-800 truncate">
                                {entry.staff?.name || '—'}
                              </div>
                            </div>
                          ) : (
                            <div className="h-10 flex items-center justify-center border border-dashed border-slate-200 rounded-lg text-[10px] text-slate-300 font-medium">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
