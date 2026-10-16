import React, { useState, useMemo } from 'react';
import {
  Search, Shield, Check, RotateCcw, CheckCheck, X,
  MapPin, Clock, Users, GripVertical
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

interface DutyTeacherAvailabilityGridProps {
  dailyDutyStaff: any[];
  availabilityMap: Record<string, Set<number>>;
  onTogglePeriod: (staffId: string, period: number) => void;
  onSetAllDay: (staffId: string) => void;
  onClearAll: (staffId: string) => void;
  onSetGlobalAllDay: () => void;
  onClearGlobalAll: () => void;
  maxPeriod?: number;
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', // Indigo - Violet
  'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', // Sky - Blue
  'linear-gradient(135deg, #059669 0%, #0d9488 100%)', // Emerald - Teal
  'linear-gradient(135deg, #d97706 0%, #ea580c 100%)', // Amber - Orange
  'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)', // Pink - Purple
  'linear-gradient(135deg, #0891b2 0%, #0284c7 100%)', // Cyan - Blue
  'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', // Rose
];

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

export const DutyTeacherAvailabilityGrid: React.FC<DutyTeacherAvailabilityGridProps> = ({
  dailyDutyStaff,
  availabilityMap,
  onTogglePeriod,
  onSetAllDay,
  onClearAll,
  onSetGlobalAllDay,
  onClearGlobalAll,
  maxPeriod = 11,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'full' | 'partial' | 'none'>('all');

  const periods = useMemo(() => {
    const list: number[] = [];
    for (let i = 1; i <= Math.max(maxPeriod, 10); i++) list.push(i);
    return list;
  }, [maxPeriod]);

  // Saat bazında kaç nöbetçinin müsait olduğu (örn. 6/13)
  const periodAvailableCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    periods.forEach((p) => {
      let count = 0;
      dailyDutyStaff.forEach((d) => {
        const sid = String(d.staff?.id || '');
        if (availabilityMap[sid]?.has(p)) count++;
      });
      counts[p] = count;
    });
    return counts;
  }, [dailyDutyStaff, availabilityMap, periods]);

  // Filtreleme
  const filteredStaff = useMemo(() => {
    return dailyDutyStaff.filter((d) => {
      const name = d.staff?.name || '';
      const station = d.station?.name || '';
      const sid = String(d.staff?.id || '');
      const availableSet = availabilityMap[sid] || new Set();
      const count = availableSet.size;

      // Filter type
      if (filterType === 'full' && count < periods.length) return false;
      if (filterType === 'partial' && (count === 0 || count === periods.length)) return false;
      if (filterType === 'none' && count > 0) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLocaleLowerCase('tr-TR');
      return (
        name.toLocaleLowerCase('tr-TR').includes(q) ||
        station.toLocaleLowerCase('tr-TR').includes(q)
      );
    });
  }, [dailyDutyStaff, availabilityMap, filterType, searchTerm, periods.length]);

  // Filter counts
  const filterCounts = useMemo(() => {
    let full = 0;
    let partial = 0;
    let none = 0;
    dailyDutyStaff.forEach((d) => {
      const sid = String(d.staff?.id || '');
      const count = availabilityMap[sid]?.size || 0;
      if (count === periods.length) full++;
      else if (count === 0) none++;
      else partial++;
    });
    return { all: dailyDutyStaff.length, full, partial, none };
  }, [dailyDutyStaff, availabilityMap, periods.length]);

  return (
    <div className="space-y-3">
      {/* Top Filter and Actions Toolbar (Matching Görsel 1) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Arama Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Öğretmen adı veya nöbet yeri ile ara..."
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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

          {/* Durum Filtre Çipleri */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tümü ({filterCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterType === 'full'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tam Gün ({filterCounts.full})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('partial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterType === 'partial'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Kısmi ({filterCounts.partial})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('none')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterType === 'none'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Seçilmemiş ({filterCounts.none})
            </button>
          </div>

          {/* Global Hızlı Butonlar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={onSetGlobalAllDay}
              className="gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <CheckCheck size={14} />
              <span>Tümünü Tam Gün Yap</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClearGlobalAll}
              className="gap-1.5 text-xs text-slate-600 hover:text-red-600 hover:border-red-300"
            >
              <RotateCcw size={13} />
              <span>Tümünü Temizle</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Availability Grid Table (Matching Görsel 1) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold">
                {/* Nöbetçi Öğretmen Başlığı */}
                <th className="px-3 py-3 text-left w-72 border-r border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="uppercase text-[11px] font-extrabold text-slate-800 tracking-wider">
                      Nöbetçi Öğretmen ({filteredStaff.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">İsim & Nöbet Yeri</span>
                  </div>
                </th>

                {/* Saat Sütunları */}
                {periods.map((p) => {
                  const availableCount = periodAvailableCounts[p] || 0;
                  const total = dailyDutyStaff.length;
                  return (
                    <th
                      key={p}
                      className="px-1.5 py-2 text-center border-r border-slate-200 last:border-r-0 min-w-[58px]"
                    >
                      <div className="font-extrabold text-slate-800 text-[11px]">{p}</div>
                      <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                        {availableCount}/{total}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={periods.length + 1} className="py-8 text-center text-slate-400 text-xs">
                    Nöbetçi öğretmen bulunamadı veya arama kriteriyle eşleşmedi.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((d) => {
                  const sid = String(d.staff?.id || '');
                  const staffName = d.staff?.name || 'İsimsiz Öğretmen';
                  const stationName = d.station?.name || 'Nöbet Yeri Belirtilmemiş';
                  const availableSet = availabilityMap[sid] || new Set();

                  return (
                    <tr key={sid} className="hover:bg-slate-50/70 transition-colors">
                      {/* Sol: Avatar, İsim, Nöbet Yeri */}
                      <td className="px-3 py-2 border-r border-slate-200 bg-slate-50/30">
                        <div className="flex items-center gap-2.5">
                          <GripVertical size={14} className="text-slate-300 shrink-0" />
                          <div
                            className="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ background: getAvatarGradient(staffName) }}
                          >
                            {getInitials(staffName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 text-xs truncate">
                              {staffName}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium truncate mt-0.5">
                              <MapPin size={10} className="text-slate-400 shrink-0" />
                              <span className="truncate">{stationName}</span>
                            </div>
                          </div>
                          {/* Tekil Hızlı Temizle / Doldur */}
                          <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onSetAllDay(sid)}
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Bu öğretmeni tüm saatler için müsait yap"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onClearAll(sid)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="Bu öğretmenin tüm saatlerini temizle"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Saatlik Müsaitlik Butonları (Pills) */}
                      {periods.map((p) => {
                        const isAvailable = availableSet.has(p);
                        return (
                          <td
                            key={p}
                            className="p-1.5 text-center align-middle border-r border-slate-200 last:border-r-0"
                          >
                            <button
                              type="button"
                              onClick={() => onTogglePeriod(sid, p)}
                              className={`w-10 h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-1 mx-auto transition-all shadow-2xs ${
                                isAvailable
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs scale-102'
                                  : 'border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30'
                              }`}
                              title={`${staffName} - ${p}. Saat: ${isAvailable ? 'Müsait (Görev verilebilir)' : 'Müsait Değil'}`}
                            >
                              <span>{p}</span>
                              {isAvailable && <Check size={11} strokeWidth={3} />}
                            </button>
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
    </div>
  );
};
