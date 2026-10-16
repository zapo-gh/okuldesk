import React, { useState, useMemo } from 'react';
import {
  Search, Users, BookOpen, Clock, Calendar, ChevronRight,
  Filter, Sparkles, X, ExternalLink
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import {
  getTeacherAvatarGradient,
  getTeacherInitials,
} from './subjectColors';

interface TeacherCardsViewProps {
  staffList: any[];
  allEntries: any[];
  onSelectTeacher: (staffId: string) => void;
  classDisplayMap?: Record<string, string>;
}

const DAYS = [
  { val: 1, short: 'Pzt' },
  { val: 2, short: 'Sal' },
  { val: 3, short: 'Çar' },
  { val: 4, short: 'Per' },
  { val: 5, short: 'Cum' },
];

export const TeacherCardsView: React.FC<TeacherCardsViewProps> = ({
  staffList,
  allEntries,
  onSelectTeacher,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  // Öğretmen bazında entry haritası
  const teacherStatsMap = useMemo(() => {
    const map = new Map<string, {
      totalHours: number;
      activeDays: Set<number>;
      dayCounts: Record<number, number>;
      classes: Set<string>;
      subjects: Set<string>;
    }>();

    staffList.forEach((s) => {
      map.set(s.id, {
        totalHours: 0,
        activeDays: new Set(),
        dayCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
        classes: new Set(),
        subjects: new Set(),
      });
    });

    allEntries.forEach((e) => {
      if (!e.staffId) return;
      let stat = map.get(e.staffId);
      if (!stat) {
        stat = {
          totalHours: 0,
          activeDays: new Set(),
          dayCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
          classes: new Set(),
          subjects: new Set(),
        };
        map.set(e.staffId, stat);
      }
      stat.totalHours += 1;
      stat.activeDays.add(e.dayOfWeek);
      stat.dayCounts[e.dayOfWeek] = (stat.dayCounts[e.dayOfWeek] || 0) + 1;
      if (e.className) stat.classes.add(e.className);
      if (e.subject) stat.subjects.add(e.subject);
    });

    return map;
  }, [staffList, allEntries]);

  // Branş listesi
  const branches = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.brans) set.add(s.brans);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [staffList]);

  // Filtreleme
  const filteredTeachers = useMemo(() => {
    return staffList.filter((s) => {
      if (selectedBranch !== 'ALL' && s.brans !== selectedBranch) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLocaleLowerCase('tr-TR');
      const nameMatch = (s.name || '').toLocaleLowerCase('tr-TR').includes(q);
      const bransMatch = (s.brans || '').toLocaleLowerCase('tr-TR').includes(q);
      return nameMatch || bransMatch;
    });
  }, [staffList, selectedBranch, searchTerm]);

  // İstatistikler
  const totalSchoolHours = useMemo(() => {
    return allEntries.length;
  }, [allEntries]);

  const avgHours = useMemo(() => {
    if (staffList.length === 0) return 0;
    return Math.round(totalSchoolHours / staffList.length);
  }, [totalSchoolHours, staffList]);

  return (
    <div className="space-y-3">
      {/* Top Controls Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 space-y-2.5">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Arama Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Öğretmen adı veya branş ile ara..."
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

          {/* İstatistik Rozetleri */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-600">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100 flex items-center gap-1">
              <Users size={13} />
              <span>{filteredTeachers.length} / {staffList.length} Öğretmen</span>
            </span>
            <span className="hidden md:inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200/80 items-center gap-1">
              <Clock size={13} />
              <span>Ort: {avgHours} sa/öğrt</span>
            </span>
          </div>
        </div>

        {/* Branş Filtre Çipleri */}
        {branches.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Branş:
            </span>
            <button
              type="button"
              onClick={() => setSelectedBranch('ALL')}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition whitespace-nowrap shrink-0 ${
                selectedBranch === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tümü ({staffList.length})
            </button>
            {branches.map((b) => {
              const count = staffList.filter((s) => s.brans === b).length;
              const isSelected = selectedBranch === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBranch(isSelected ? 'ALL' : b)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {b} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cards Grid */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 text-center">
          <Users size={32} className="mx-auto text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-700">Aramaya Uygun Öğretmen Bulunamadı</h4>
          <p className="text-xs text-slate-400 mt-1">Filtre kriterlerini temizleyip tekrar deneyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTeachers.map((staff) => {
            const stats = teacherStatsMap.get(staff.id) || {
              totalHours: 0,
              activeDays: new Set(),
              dayCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              classes: new Set(),
              subjects: new Set(),
            };
            const activeDaysCount = stats.activeDays.size;

            return (
              <div
                key={staff.id}
                onClick={() => onSelectTeacher(staff.id)}
                className="group bg-white rounded-xl shadow-xs hover:shadow-md border border-slate-200/90 hover:border-indigo-400/80 p-3.5 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
              >
                {/* Sol Üst İnce Vurgu Çizgisi */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 opacity-80 group-hover:opacity-100 transition"
                  style={{ background: getTeacherAvatarGradient(staff.name) }}
                />

                <div>
                  {/* Avatar + Başlık */}
                  <div className="flex items-start gap-2.5 mt-0.5 mb-2.5">
                    <div
                      className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                      style={{ background: getTeacherAvatarGradient(staff.name) }}
                    >
                      {getTeacherInitials(staff.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {staff.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate font-medium">
                        {staff.brans || staff.gorev || 'Öğretmen'}
                      </p>
                    </div>
                  </div>

                  {/* Ders Yükü Özeti */}
                  <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-50 rounded-lg border border-slate-100 mb-2.5">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Clock size={12} className="text-indigo-500" />
                      <span>{stats.totalHours} Saat Ders</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {activeDaysCount} Gün
                    </span>
                  </div>

                  {/* Gün Dağılım Kapsülleri (Pzt, Sal, Çar, Per, Cum) */}
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
                    {stats.classes.size > 0 ? `${stats.classes.size} Sınıf` : 'Atama Yok'}
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
