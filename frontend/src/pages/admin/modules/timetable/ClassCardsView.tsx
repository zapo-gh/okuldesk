import React, { useState, useMemo } from 'react';
import {
  Search, BookOpen, Clock, Users, ChevronRight,
  Filter, Layers, X
} from 'lucide-react';
import { parseAndStandardizeClass } from '../../../../utils/classNameFormatter';
import { getGradeBadgeColor } from './subjectColors';

interface ClassCardsViewProps {
  classNames: string[];
  allEntries: any[];
  classDisplayMap?: Record<string, string>;
  onSelectClass: (rawClassName: string) => void;
}

const DAYS = [
  { val: 1, short: 'Pzt' },
  { val: 2, short: 'Sal' },
  { val: 3, short: 'Çar' },
  { val: 4, short: 'Per' },
  { val: 5, short: 'Cum' },
];

export const ClassCardsView: React.FC<ClassCardsViewProps> = ({
  classNames,
  allEntries,
  classDisplayMap = {},
  onSelectClass,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');

  // Sınıf bazında istatistik hesaplama
  const classStatsMap = useMemo(() => {
    const map = new Map<string, {
      totalHours: number;
      dayCounts: Record<number, number>;
      teachers: Set<string>;
      subjects: Set<string>;
      rooms: Set<string>;
    }>();

    classNames.forEach((raw) => {
      map.set(raw, {
        totalHours: 0,
        dayCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        teachers: new Set(),
        subjects: new Set(),
        rooms: new Set(),
      });
    });

    allEntries.forEach((e) => {
      if (!e.className) return;
      const raw = e.className.replace(/\s+SEÇ\.?$/i, '').trim();
      let stat = map.get(raw);
      if (!stat) {
        // Find if any key starts with this
        for (const [k, v] of map.entries()) {
          if (k.toLowerCase() === raw.toLowerCase()) {
            stat = v;
            break;
          }
        }
      }
      if (!stat) {
        stat = {
          totalHours: 0,
          dayCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          teachers: new Set(),
          subjects: new Set(),
          rooms: new Set(),
        };
        map.set(raw, stat);
      }
      stat.totalHours += 1;
      stat.dayCounts[e.dayOfWeek] = (stat.dayCounts[e.dayOfWeek] || 0) + 1;
      if (e.staff?.name) stat.teachers.add(e.staff.name);
      if (e.subject) stat.subjects.add(e.subject);
      if (e.room) stat.rooms.add(e.room);
    });

    return map;
  }, [classNames, allEntries]);

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

  // Filtrelenmiş liste
  const filteredClassMetas = useMemo(() => {
    return classMetas.filter((m) => {
      if (selectedGrade !== 'ALL' && m.grade !== selectedGrade) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLocaleLowerCase('tr-TR');
      return (
        m.displayName.toLocaleLowerCase('tr-TR').includes(q) ||
        m.raw.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [classMetas, selectedGrade, searchTerm]);

  return (
    <div className="space-y-3">
      {/* Top Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 space-y-2.5">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Arama Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sınıf adı ile ara (örn: 9-A, 11-B)..."
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* İstatistik Rozeti */}
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-100 flex items-center gap-1 shrink-0">
            <BookOpen size={13} />
            <span>{filteredClassMetas.length} / {classNames.length} Sınıf</span>
          </span>
        </div>

        {/* Kademe Filtre Çipleri */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Kademe:
          </span>
          <button
            type="button"
            onClick={() => setSelectedGrade('ALL')}
            className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition whitespace-nowrap shrink-0 ${
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
                className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition whitespace-nowrap shrink-0 ${
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
      </div>

      {/* Cards Grid */}
      {filteredClassMetas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 text-center">
          <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-700">Aramaya Uygun Sınıf Bulunamadı</h4>
          <p className="text-xs text-slate-400 mt-1">Filtre kriterlerini temizleyip tekrar deneyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredClassMetas.map((meta) => {
            const stats = classStatsMap.get(meta.raw) || {
              totalHours: 0,
              dayCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              teachers: new Set(),
              subjects: new Set(),
              rooms: new Set(),
            };

            return (
              <div
                key={meta.raw}
                onClick={() => onSelectClass(meta.raw)}
                className="group bg-white rounded-xl shadow-xs hover:shadow-md border border-slate-200/90 hover:border-indigo-400/80 p-3.5 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
              >
                {/* Sol Üst İnce Vurgu Çizgisi */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 opacity-80 group-hover:opacity-100 transition"
                  style={{ background: getGradeBadgeColor(meta.grade) }}
                />

                <div>
                  {/* Sınıf Rozeti + Adı */}
                  <div className="flex items-start gap-2.5 mt-0.5 mb-2.5">
                    <div
                      className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                      style={{ background: getGradeBadgeColor(meta.grade) }}
                    >
                      {meta.grade}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {meta.displayName}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {meta.program ? `${meta.program} Programı` : 'Sınıf'}
                      </p>
                    </div>
                  </div>

                  {/* İstatistik Metrikleri */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2.5 text-xs">
                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <div className="font-bold text-slate-800">{stats.totalHours} Saat</div>
                      <div className="text-[9px] text-slate-400">Haftalık Ders</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <div className="font-bold text-slate-800">{stats.teachers.size} Öğretmen</div>
                      <div className="text-[9px] text-slate-400">Giren Kadro</div>
                    </div>
                  </div>

                  {/* Gün Dağılım Kapsülleri */}
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {DAYS.map((d) => {
                      const count = stats.dayCounts[d.val] || 0;
                      const hasLesson = count > 0;
                      return (
                        <div
                          key={d.val}
                          className={`text-center py-1 rounded-md text-[10px] font-semibold transition ${
                            hasLesson
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-bold'
                              : 'bg-slate-50 text-slate-400 border border-slate-100'
                          }`}
                        >
                          <div className="text-[9px] text-slate-400">{d.short}</div>
                          <div className="mt-0.5">{hasLesson ? `${count}h` : '—'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Alt Kısım: Detay Gör Butonu */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-indigo-600 transition">
                  <span className="truncate">
                    {stats.subjects.size > 0 ? `${stats.subjects.size} Ders Türü` : 'Ders Yok'}
                  </span>
                  <div className="flex items-center gap-0.5 font-bold text-indigo-600">
                    <span>Programı Aç</span>
                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
