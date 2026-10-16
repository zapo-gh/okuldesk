import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, RefreshCw, Calendar, Undo2, Redo2, Edit3,
  MapPin, Check, X, Shield, BookOpen, AlertTriangle,
  Building, ChevronDown, CheckCircle2, User, Layers, Users
} from 'lucide-react';
import { parseAndStandardizeClass } from '../../../../utils/classNameFormatter';
import { CommonLessonModal } from './CommonLessonModal';

interface AssignmentPlanMatrixGridProps {
  displayCovers: any[];
  absences: any[];
  dailyDutyStaff: any[];
  lockedKeys: Set<string>;
  onToggleLock: (coverKey: string) => void;
  onSelectSubstitute: (coverIndex: number, substituteId: string, extraData?: any) => void;
  classDisplayMap?: Record<string, string>;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  maxPeriod?: number;
  staffList?: any[];
  allTimetableEntries?: any[];

  // Kural seçenekleri
  rulePreventConsecutive: boolean;
  onPreventConsecutiveChange: (val: boolean) => void;
  ruleMaxPerHour: number;
  onMaxPerHourChange: (val: number) => void;
  ruleMaxPerDay: number;
  onMaxPerDayChange: (val: number) => void;
}

const GRADE_GRADIENTS: Record<string, string> = {
  '9': 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
  '10': 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
  '11': 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
  '12': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #059669 0%, #10b981 100%)', // Emerald
  'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', // Indigo
  'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', // Violet
  'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', // Sky
  'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', // Amber
  'linear-gradient(135deg, #db2777 0%, #ec4899 100%)', // Pink
  'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', // Cyan
];

function getGradeBadgeColor(grade: string = '') {
  return GRADE_GRADIENTS[grade] || 'linear-gradient(135deg, #334155 0%, #64748b 100%)';
}

function getAvatarGradient(name: string = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] || '').slice(0, 2).toLocaleUpperCase('tr-TR');
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  return ((first[0] || '') + (last[0] || '')).toLocaleUpperCase('tr-TR');
}

export const AssignmentPlanMatrixGrid: React.FC<AssignmentPlanMatrixGridProps> = ({
  displayCovers,
  absences,
  dailyDutyStaff,
  lockedKeys,
  onToggleLock,
  onSelectSubstitute,
  classDisplayMap = {},
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  maxPeriod = 11,
  staffList = [],
  allTimetableEntries = [],
  rulePreventConsecutive,
  onPreventConsecutiveChange,
  ruleMaxPerHour,
  onMaxPerHourChange,
  ruleMaxPerDay,
  onMaxPerDayChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'has_duty' | 'no_duty' | 'merged'>('all');
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [isCommonLessonModalOpen, setIsCommonLessonModalOpen] = useState(false);
  const [commonLessonTargetCover, setCommonLessonTargetCover] = useState<{ cover: any; originalIndex: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close edit popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveEditIndex(null);
      }
    };
    if (activeEditIndex !== null) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeEditIndex]);

  const periods = useMemo(() => {
    const list: number[] = [];
    for (let i = 1; i <= Math.max(maxPeriod, 10); i++) list.push(i);
    return list;
  }, [maxPeriod]);

  // Nöbetçi öğretmen haritası (id -> station name)
  const stationMap = useMemo(() => {
    const map = new Map<string, string>();
    dailyDutyStaff.forEach(d => {
      if (d.staff?.id) map.set(String(d.staff.id), d.station?.name || 'Nöbetçi');
    });
    return map;
  }, [dailyDutyStaff]);

  // Sınıflara göre grupla
  const classRows = useMemo(() => {
    const map = new Map<string, {
      rawClassName: string;
      meta: any;
      room: string;
      dutyCount: number;
      combinedCount: number;
      periodsMap: Map<number, { cover: any; originalIndex: number }>;
    }>();

    displayCovers.forEach((c, idx) => {
      const raw = (c.className || '').trim();
      if (!raw) return;

      let row = map.get(raw);
      if (!row) {
        row = {
          rawClassName: raw,
          meta: parseAndStandardizeClass(raw, classDisplayMap),
          room: c.room || '',
          dutyCount: 0,
          combinedCount: 0,
          periodsMap: new Map(),
        };
        map.set(raw, row);
      }
      if (c.room && !row.room) row.room = c.room;

      const subId = c.substituteStaffId || c.substituteStaff?.id || c.suggestedSubstitute?.staff?.id;
      const isCancelled = c.isCancelled || c.substituteStaffId === 'CANCEL';
      const isCombined = c.isCombined || (c.coAbsentStaffs && c.coAbsentStaffs.length > 0 && !subId);

      if (isCombined) {
        row.combinedCount++;
      } else if (subId && !isCancelled) {
        row.dutyCount++;
      }

      row.periodsMap.set(c.period, { cover: c, originalIndex: idx });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.meta.displayName.localeCompare(b.meta.displayName, 'tr-TR', { numeric: true })
    );
  }, [displayCovers, classDisplayMap]);

  // Saat bazında kaç görev planlandığı
  const periodDutyCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    periods.forEach(p => {
      let count = 0;
      displayCovers.forEach(c => {
        if (c.period === p) {
          const subId = c.substituteStaffId || c.substituteStaff?.id || c.suggestedSubstitute?.staff?.id;
          const isCancelled = c.isCancelled || c.substituteStaffId === 'CANCEL';
          if (subId && !isCancelled) count++;
        }
      });
      counts[p] = count;
    });
    return counts;
  }, [displayCovers, periods]);

  // Toplam planlanan görev sayısı
  const totalPlannedDuties = useMemo(() => {
    return displayCovers.filter(c => {
      const subId = c.substituteStaffId || c.substituteStaff?.id || c.suggestedSubstitute?.staff?.id;
      const isCancelled = c.isCancelled || c.substituteStaffId === 'CANCEL';
      return Boolean(subId && !isCancelled);
    }).length;
  }, [displayCovers]);

  // Filtreleme
  const filteredRows = useMemo(() => {
    return classRows.filter(r => {
      const hasDuty = r.dutyCount > 0 || r.combinedCount > 0;

      // Filter type
      if (filterType === 'has_duty' && !hasDuty) return false;
      if (filterType === 'no_duty' && hasDuty) return false;
      if (filterType === 'merged' && r.combinedCount === 0) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLocaleLowerCase('tr-TR');
      if (r.meta.displayName.toLocaleLowerCase('tr-TR').includes(q)) return true;
      if (r.rawClassName.toLocaleLowerCase('tr-TR').includes(q)) return true;
      if (r.room.toLocaleLowerCase('tr-TR').includes(q)) return true;

      // Check if any duty teacher in this class matches search
      for (const item of r.periodsMap.values()) {
        const subName = item.cover.substituteStaff?.name || item.cover.suggestedSubstitute?.staff?.name || '';
        if (subName.toLocaleLowerCase('tr-TR').includes(q)) return true;
      }

      return false;
    });
  }, [classRows, filterType, searchTerm]);

  const activeEditCover = activeEditIndex !== null ? displayCovers[activeEditIndex] : null;

  return (
    <div className="space-y-4">
      {/* ─── 1. Kural Seçenekleri Kartı (Image 3 Üst Panel) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {/* Kural 1: Ardışık Görevi Engelle */}
        <div className="flex items-center justify-between gap-3 pt-2 md:pt-0 md:px-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-xs">
              <RefreshCw size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 leading-tight">Ardışık Görevi Engelle</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Aynı öğretmene üst üste 2 saat nöbet verilmesini önler
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={rulePreventConsecutive}
              onChange={(e) => onPreventConsecutiveChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Kural 2: Aynı Saatte Max Görev */}
        <div className="flex items-center justify-between gap-3 pt-3 md:pt-0 md:px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 leading-tight">Aynı Saatte Max Görev</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Bir öğretmene aynı ders saatinde atanabilecek sınıf
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <input
              type="number"
              min={1}
              max={5}
              value={ruleMaxPerHour}
              onChange={(e) => onMaxPerHourChange(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
              className="w-10 text-center text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
            <span className="text-xs text-slate-500 font-medium pr-1">sınıf</span>
          </div>
        </div>

        {/* Kural 3: Günlük Max Görev (Toplu) */}
        <div className="flex items-center justify-between gap-3 pt-3 md:pt-0 md:px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-xs">
              <Calendar size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 leading-tight">Günlük Max Görev (Toplu)</div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Tüm öğretmenlerin günlük üst görev limiti
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <input
              type="number"
              min={1}
              max={10}
              value={ruleMaxPerDay}
              onChange={(e) => onMaxPerDayChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className="w-10 text-center text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            />
            <span className="text-xs text-slate-500 font-medium pr-1">saat</span>
          </div>
        </div>
      </div>

      {/* ─── 2. Arama & Filtreleme & Eylem Çubuğu (Image 3 Orta Bar) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Sol: Arama Çubuğu */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Sınıf, derslik veya görevli öğretmen ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Orta: Filtreleme Butonları */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tümü ({classRows.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('has_duty')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filterType === 'has_duty'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Görevi Olanlar ({classRows.filter(r => r.dutyCount > 0 || r.combinedCount > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('no_duty')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filterType === 'no_duty'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Boş Sınıflar ({classRows.filter(r => r.dutyCount === 0 && r.combinedCount === 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('merged')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              filterType === 'merged'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            📚 Birleştirilenler ({classRows.filter(r => r.combinedCount > 0).length})
          </button>
        </div>

        {/* Sağ: Geri Al, İleri Al ve Toplam Görev Rozeti */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border-r border-slate-200 pr-3">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Geri Al (Undo)"
            >
              <Undo2 size={14} /> Geri Al
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="İleri Al (Redo)"
            >
              <Redo2 size={14} /> İleri Al
            </button>
          </div>

          <div className="text-xs font-bold text-slate-700 bg-indigo-50/80 text-indigo-800 border border-indigo-200/80 px-3 py-1.5 rounded-xl shadow-2xs">
            Toplam {totalPlannedDuties} Görev Planlandı
          </div>
        </div>
      </div>

      {/* ─── 3. Ana Matris Tablosu (Image 3 Grid Çizelgesi) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs">
                {/* 1. Sütun: Sınıf & Derslik Bilgisi */}
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-slate-700 border-r border-slate-200 min-w-[240px] sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  Sınıf & Derslik <span className="text-slate-400 font-semibold">({filteredRows.length})</span>
                </th>

                {/* Saat Sütunları (1 .. 11) */}
                {periods.map(p => (
                  <th
                    key={p}
                    className="py-2.5 px-3 text-center border-r border-slate-200 last:border-r-0 min-w-[155px] font-bold"
                  >
                    <div className="text-slate-800 text-xs font-bold">{p}. Saat</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {periodDutyCounts[p] || 0} görev
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={periods.length + 1} className="py-16 text-center text-slate-400">
                    <AlertTriangle size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">Eşleşen sınıf veya görev bulunamadı</p>
                    <p className="text-xs text-slate-400 mt-1">Arama terimini veya filtreleri temizlemeyi deneyin.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const grade = row.meta.grade || '';
                  const shortGradeSec = `${grade}${row.meta.section || ''}`;

                  return (
                    <tr key={row.rawClassName} className="hover:bg-slate-50/60 transition-colors">
                      {/* Sol Sütun: Sınıf Rozeti, İsim, Konum ve Görev Sayısı */}
                      <td className="py-3 px-4 border-r border-slate-200 sticky left-0 bg-white hover:bg-slate-50/60 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Sınıf Simgesi */}
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shrink-0 shadow-xs"
                              style={{ background: getGradeBadgeColor(grade) }}
                            >
                              {shortGradeSec || 'S'}
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-xs leading-tight truncate" title={row.meta.displayName}>
                                {row.meta.displayName}
                              </p>
                              {row.room && (
                                <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-[10px] text-slate-600 font-medium">
                                  <MapPin size={10} className="text-rose-500 shrink-0" />
                                  <span className="truncate max-w-[110px]">{row.room}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Görev Sayısı Rozeti */}
                          <div className="shrink-0">
                            {row.combinedCount > 0 ? (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
                                {row.combinedCount} birleştirildi
                              </span>
                            ) : row.dutyCount > 0 ? (
                              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                {row.dutyCount} görev
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Saatlik Hücreler (1..11) */}
                      {periods.map(p => {
                        const cellItem = row.periodsMap.get(p);

                        if (!cellItem) {
                          // Görev veya boş ders yok -> "—"
                          return (
                            <td key={p} className="p-2 border-r border-slate-200 last:border-r-0 text-center align-middle">
                              <div className="w-9 h-7 mx-auto flex items-center justify-center text-slate-300 font-bold bg-slate-50/70 border border-dashed border-slate-200 rounded-lg">
                                —
                              </div>
                            </td>
                          );
                        }

                        const { cover, originalIndex } = cellItem;
                        const subId = cover.substituteStaffId || cover.substituteStaff?.id || cover.suggestedSubstitute?.staff?.id;
                        const subName = cover.substituteStaff?.name || cover.suggestedSubstitute?.staff?.name || '';
                        const isCancelled = cover.isCancelled || cover.substituteStaffId === 'CANCEL';
                        const isAdmin = cover.substituteStaffId === 'ADMIN';
                        const isCombined = Boolean(cover.isCombined || cover.isMerged);
                        const mergedTeacherName = cover.mergedWithStaff?.name || cover.presentCoTeachers?.[0]?.name || subName || 'Öğretmen';

                        // 1. Durum: Grup Birleştirildi
                        if (isCombined) {
                          return (
                            <td key={p} className="p-2 border-r border-slate-200 last:border-r-0 align-middle">
                              <div className="bg-purple-50/90 border border-purple-200/90 rounded-xl p-2 text-center shadow-2xs">
                                <div className="text-[10px] font-bold text-purple-700 flex items-center justify-center gap-1">
                                  <span>📚</span> Birleştirildi
                                </div>
                                <div className="font-bold text-[10px] text-slate-800 uppercase mt-0.5 truncate" title={mergedTeacherName}>
                                  {mergedTeacherName}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveEditIndex(originalIndex)}
                                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-white/90 border border-purple-200 px-2 py-0.5 rounded-md transition shadow-2xs cursor-pointer"
                                  title="Birleştirmeyi değiştir veya nöbetçi ata"
                                >
                                  <Edit3 size={10} /> Düzenle
                                </button>
                              </div>
                            </td>
                          );
                        }

                        // 2. Durum: İdare Kontrolünde
                        if (isAdmin) {
                          return (
                            <td key={p} className="p-2 border-r border-slate-200 last:border-r-0 align-middle">
                              <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-2 text-center shadow-2xs">
                                <div className="text-[10px] font-bold text-amber-800 flex items-center justify-center gap-1">
                                  <Building size={11} className="text-amber-600" /> İdare Kontrolü
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveEditIndex(originalIndex)}
                                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-white/80 border border-amber-200 px-2 py-0.5 rounded-md transition shadow-2xs"
                                >
                                  <Edit3 size={10} /> Düzenle
                                </button>
                              </div>
                            </td>
                          );
                        }

                        // 3. Durum: İptal Edildi
                        if (isCancelled) {
                          return (
                            <td key={p} className="p-2 border-r border-slate-200 last:border-r-0 align-middle">
                              <div className="bg-slate-100 border border-slate-200/90 rounded-xl p-2 text-center">
                                <div className="text-[10px] font-bold text-slate-400 italic">
                                  İptal Edildi
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveEditIndex(originalIndex)}
                                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md transition shadow-2xs"
                                >
                                  <Edit3 size={10} /> Düzenle
                                </button>
                              </div>
                            </td>
                          );
                        }

                        // 4. Durum: Atanmış Nöbetçi Öğretmen (Image 3 formatı)
                        if (subId && subName) {
                          const dutyLocation = stationMap.get(String(subId)) || 'NÖBET YERİ';
                          const initials = getInitials(subName);

                          return (
                            <td key={p} className="p-2 border-r border-slate-200 last:border-r-0 align-middle">
                              <div className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-2 shadow-2xs flex flex-col items-center gap-1 transition-all">
                                {/* Üst: Avatar + İsim */}
                                <div className="flex items-center gap-1.5 w-full justify-center">
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-extrabold text-[9px] shrink-0 shadow-2xs"
                                    style={{ background: getAvatarGradient(subName) }}
                                  >
                                    {initials}
                                  </div>
                                  <span className="font-bold text-slate-800 text-[11px] leading-tight truncate max-w-[95px]" title={subName}>
                                    {subName}
                                  </span>
                                </div>

                                {/* Orta: Nöbet Yeri Rozeti */}
                                <div className="inline-flex items-center gap-1 bg-indigo-50/80 border border-indigo-100/90 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-semibold max-w-full">
                                  <MapPin size={9} className="shrink-0 text-indigo-500" />
                                  <span className="truncate max-w-[85px]" title={dutyLocation}>
                                    {dutyLocation}
                                  </span>
                                </div>

                                {/* Alt: Düzenle Butonu */}
                                <button
                                  type="button"
                                  onClick={() => setActiveEditIndex(originalIndex)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/90 rounded-md px-2 py-0.5 transition shadow-2xs mt-0.5"
                                >
                                  <Edit3 size={10} className="text-slate-400 group-hover:text-indigo-600" /> Düzenle
                                </button>
                              </div>
                            </td>
                          );
                        }

                        // 5. Durum: Boş Ders var ama henüz nöbetçi atanmamış
                        return (
                          <td key={p} className="p-2 border-r border-slate-200 last:border-r-0 align-middle">
                            <div className="bg-amber-50/50 border border-dashed border-amber-300 rounded-xl p-2 text-center">
                              <div className="text-[10px] font-bold text-amber-700 flex items-center justify-center gap-1">
                                <span>⚠️</span> Boş Ders
                              </div>
                              <div className="text-[9px] text-slate-500 truncate mt-0.5" title={cover.absentStaff?.name}>
                                {cover.absentStaff?.name || 'Öğretmen'}
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveEditIndex(originalIndex)}
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 rounded-md px-2 py-0.5 transition shadow-2xs"
                              >
                                + Ata
                              </button>
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

      {/* ─── 4. Nöbetçi Seçim / Düzenleme Modal Popover'ı ─── */}
      {activeEditIndex !== null && activeEditCover && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            ref={popoverRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Edit3 size={16} className="text-indigo-600" />
                  Görevlendirilecek Nöbetçiyi Seç
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {parseAndStandardizeClass(activeEditCover.className, classDisplayMap).displayName} — {activeEditCover.period}. Ders ({activeEditCover.subject || 'Ders'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveEditIndex(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Devamsız Öğretmen Bilgisi */}
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Gelmeyen: </span>
                  <span className="font-bold text-slate-800">{activeEditCover.absentStaff?.name || 'Öğretmen'}</span>
                </div>
                {activeEditCover.room && (
                  <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 border border-rose-200">
                    📍 {activeEditCover.room}
                  </span>
                )}
              </div>

              {/* Ortak Ders / Grup Birleştirme Bloğu */}
              {(() => {
                const isEditCombined = Boolean(activeEditCover.isCombined || activeEditCover.isMerged);
                const hasEditCoTeacher = Boolean(
                  activeEditCover.hasPresentCoTeacher ||
                  (activeEditCover.presentCoTeachers && activeEditCover.presentCoTeachers.length > 0)
                );
                const editPrimaryCoTeacher = activeEditCover.presentCoTeachers?.[0] || activeEditCover.mergedWithStaff;
                const isEditBothAbsent = !hasEditCoTeacher && activeEditCover.coAbsentStaffs && activeEditCover.coAbsentStaffs.length > 0;

                if (hasEditCoTeacher) {
                  return (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                          <span>📚</span> Ortak Ders (Eş Öğretmen)
                        </span>
                        {isEditCombined ? (
                          <span className="text-[10px] font-bold text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">
                            ✓ Birleştirildi
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Okulda / Derste
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs text-purple-950 truncate">
                            {editPrimaryCoTeacher?.name}
                          </div>
                          <p className="text-[10px] text-purple-700 mt-0.5 leading-tight">
                            {isEditCombined
                              ? 'Bu sınıf şu anda diğer grup öğretmeni ile birleştirilmiş durumda.'
                              : 'Programdaki diğer grup öğretmeni ile birleştirilebilir.'}
                          </p>
                        </div>

                        {!isEditCombined ? (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSubstitute(activeEditIndex, editPrimaryCoTeacher.id, {
                                isMerged: true,
                                isCombined: true,
                                mergedWithStaff: editPrimaryCoTeacher,
                              });
                              setActiveEditIndex(null);
                            }}
                            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer flex items-center gap-1"
                          >
                            <span>📚</span> Birleştir
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSubstitute(activeEditIndex, '', {
                                isMerged: false,
                                isCombined: false,
                                mergedWithStaff: null,
                              });
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] rounded-lg shadow-2xs transition shrink-0 cursor-pointer"
                            title="Birleştirmeyi kaldır ve nöbetçi atanmaya hazır hale getir"
                          >
                            Birleştirmeyi Kaldır
                          </button>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-purple-100 flex items-center justify-between text-[10px]">
                        <span className="text-purple-600">İsterseniz aşağıdan nöbetçi atayabilirsiniz:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCommonLessonTargetCover({ cover: activeEditCover, originalIndex: activeEditIndex });
                            setIsCommonLessonModalOpen(true);
                          }}
                          className="font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                        >
                          Farklı Öğretmenle Birleştir...
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isEditBothAbsent) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        Ortak derse giren diğer öğretmen de izinli!
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        Diğer grup öğretmeni ({activeEditCover.coAbsentStaffs?.map((s: any) => s.name).join(', ')}) de izinli olduğu için grup birleştirilemez.
                        Aşağıdaki nöbetçi öğretmenlerden biri görevlendirilmelidir.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCommonLessonTargetCover({ cover: activeEditCover, originalIndex: activeEditIndex });
                        setIsCommonLessonModalOpen(true);
                      }}
                      className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>📚</span> Ortak Ders / Grup Birleştirmesi Yap...
                    </button>
                  </div>
                );
              })()}

              {/* Nöbetçi Arama */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nöbetçi öğretmen ara..."
                  value={dropdownSearch}
                  onChange={(e) => setDropdownSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-slate-50/50"
                />
              </div>

              {/* Özel Seçenekler (İdare, İptal, Temizle) */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectSubstitute(activeEditIndex, '', { isMerged: false, isCombined: false, mergedWithStaff: null });
                    setActiveEditIndex(null);
                  }}
                  className="p-2 rounded-xl text-center border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  ⚪ Boş Bırak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectSubstitute(activeEditIndex, 'ADMIN', { isMerged: false, isCombined: false, mergedWithStaff: null });
                    setActiveEditIndex(null);
                  }}
                  className="p-2 rounded-xl text-center border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-amber-800 text-xs font-bold transition"
                >
                  🏢 İdareye Bırak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectSubstitute(activeEditIndex, 'CANCEL', { isMerged: false, isCombined: false, mergedWithStaff: null });
                    setActiveEditIndex(null);
                  }}
                  className="p-2 rounded-xl text-center border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 text-rose-800 text-xs font-bold transition"
                >
                  ❌ İptal Et
                </button>
              </div>

              {/* Nöbetçi Listesi */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Nöbetçi Öğretmenler ({dailyDutyStaff.length})
                </p>

                {dailyDutyStaff
                  .filter((st) => {
                    if (!dropdownSearch.trim()) return true;
                    const q = dropdownSearch.toLocaleLowerCase('tr-TR');
                    return (
                      (st.staff?.name || '').toLocaleLowerCase('tr-TR').includes(q) ||
                      (st.station?.name || '').toLocaleLowerCase('tr-TR').includes(q)
                    );
                  })
                  .map((st) => {
                    const sid = String(st.staff?.id || st.staffId || '');
                    const sname = st.staff?.name || 'Öğretmen';
                    const sstation = st.station?.name || 'Nöbet Yeri';
                    const isSelected = activeEditCover.substituteStaffId === sid ||
                      activeEditCover.substituteStaff?.id === sid ||
                      activeEditCover.suggestedSubstitute?.staff?.id === sid;

                    // Bu saatte başka bir derse atanmış mı?
                    const otherAssignment = displayCovers.find(
                      (c, cIdx) => cIdx !== activeEditIndex &&
                        c.period === activeEditCover.period &&
                        (c.substituteStaffId === sid || c.substituteStaff?.id === sid)
                    );

                    return (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => {
                          onSelectSubstitute(activeEditIndex, sid, {
                            isMerged: false,
                            isCombined: false,
                            mergedWithStaff: null
                          });
                          setActiveEditIndex(null);
                        }}
                        className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-extrabold text-[10px] shrink-0"
                            style={{ background: getAvatarGradient(sname) }}
                          >
                            {getInitials(sname)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate leading-tight">{sname}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={9} className="text-slate-400" />
                              <span className="truncate">{sstation}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {otherAssignment && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Bu saatte dolu
                            </span>
                          )}
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check size={12} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 text-right">
              <button
                type="button"
                onClick={() => setActiveEditIndex(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ortak Ders / Grup Birleştirme Modalı */}
      {isCommonLessonModalOpen && commonLessonTargetCover && (
        <CommonLessonModal
          isOpen={isCommonLessonModalOpen}
          onClose={() => {
            setIsCommonLessonModalOpen(false);
            setCommonLessonTargetCover(null);
          }}
          onSubmit={(teacherId, teacherName) => {
            const teacherObj = staffList.find(s => s.id === teacherId) || { id: teacherId, name: teacherName };
            onSelectSubstitute(commonLessonTargetCover.originalIndex, teacherId, {
              isMerged: true,
              isCombined: true,
              mergedWithStaff: teacherObj,
            });
            setIsCommonLessonModalOpen(false);
            setCommonLessonTargetCover(null);
            setActiveEditIndex(null);
          }}
          cover={commonLessonTargetCover.cover}
          detectedCoTeachers={commonLessonTargetCover.cover.presentCoTeachers || []}
          staffList={staffList}
          classDisplayMap={classDisplayMap}
        />
      )}
    </div>
  );
};
