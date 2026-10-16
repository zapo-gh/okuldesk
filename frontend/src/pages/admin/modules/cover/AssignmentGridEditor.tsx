import React, { useState, useMemo } from 'react';
import {
  Clock, Lock, Unlock, Search, Shield, X, AlertTriangle,
  MapPin, CheckCircle2, ChevronDown, Check, User
} from 'lucide-react';
import { parseAndStandardizeClass } from '../../../../utils/classNameFormatter';
import { getZoneDistance, getProximityBadge } from './zoneDistanceHelper';

interface AssignmentGridEditorProps {
  displayCovers: any[];
  absences: any[];
  dailyDutyStaff: any[];
  lockedKeys: Set<string>;
  onToggleLock: (coverKey: string) => void;
  onSelectSubstitute: (coverIndex: number, substituteId: string, extraData?: any) => void;
  classDisplayMap?: Record<string, string>;
  isShowingSaved?: boolean;
}

export const AssignmentGridEditor: React.FC<AssignmentGridEditorProps> = ({
  displayCovers,
  absences,
  dailyDutyStaff,
  lockedKeys,
  onToggleLock,
  onSelectSubstitute,
  classDisplayMap = {},
  isShowingSaved = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned' | 'admin'>('all');
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [teacherSearch, setTeacherSearch] = useState('');

  // Nöbetçi öğretmen haritası (id -> station name)
  const stationMap = useMemo(() => {
    const map = new Map<string, string>();
    dailyDutyStaff.forEach(d => {
      if (d.staff?.id) map.set(String(d.staff.id), d.station?.name || '');
    });
    return map;
  }, [dailyDutyStaff]);

  // Devamsızlık nedeni haritası
  const reasonMap = useMemo(() => {
    const map = new Map<string, string>();
    absences.forEach(a => {
      const r = a.reason || 'İzinli';
      const t = a.absenceTime === 'SABAH' ? ' (Sabah)' : a.absenceTime === 'OGLEDEN_SONRA' ? ' (Öğleden Sonra)' : '';
      map.set(String(a.staffId), r + t);
    });
    return map;
  }, [absences]);

  // Filtrelenmiş görevler
  const filteredIndexedCovers = useMemo(() => {
    return displayCovers.map((c, originalIndex) => ({ c, originalIndex })).filter(({ c }) => {
      const subId = c.substituteStaffId || c.substituteStaff?.id || c.suggestedSubstitute?.staff?.id;
      const isCancelled = c.isCancelled || c.substituteStaffId === 'CANCEL';
      const isAdmin = c.substituteStaffId === 'ADMIN';
      const isAssigned = Boolean(subId && !isCancelled && !isAdmin);
      const isUnassigned = !subId && !isCancelled && !isAdmin;

      // Status filter
      if (statusFilter === 'assigned' && !isAssigned) return false;
      if (statusFilter === 'unassigned' && !isUnassigned) return false;
      if (statusFilter === 'admin' && (!isAdmin && !isCancelled)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
        const clsName = (c.className || '').toLocaleLowerCase('tr-TR');
        const absName = (c.absentStaff?.name || '').toLocaleLowerCase('tr-TR');
        const subName = (c.substituteStaff?.name || c.suggestedSubstitute?.staff?.name || '').toLocaleLowerCase('tr-TR');
        if (!clsName.includes(q) && !absName.includes(q) && !subName.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [displayCovers, statusFilter, searchQuery]);

  // Saate göre grupla
  const groupedByPeriod = useMemo(() => {
    const map = new Map<number, { c: any; originalIndex: number }[]>();
    filteredIndexedCovers.forEach(item => {
      const p = item.c.period;
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(item);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredIndexedCovers]);

  // Sınıf rengi rozeti
  const getClassBadgeStyle = (clsName = '') => {
    const match = clsName.match(/(\d+)/);
    const grade = match ? match[1] : '';
    if (grade === '9') return 'bg-orange-50 text-orange-700 border-orange-200';
    if (grade === '10') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (grade === '11') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (grade === '12') return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-4">
      {/* Arama & Filtreleme Barı */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Sınıf veya öğretmen ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none bg-slate-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tümü ({displayCovers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('assigned')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'assigned' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Atananlar
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unassigned')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'unassigned' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Atanmayan (Boş)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('admin')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'admin' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            İdarede / İptal
          </button>
        </div>
      </div>

      {/* Boş Sonuç Uyarısı */}
      {groupedByPeriod.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Clock size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-sm">Filtrelere uygun boş ders kaydı bulunamadı.</p>
        </div>
      )}

      {/* Saat Grupları */}
      {groupedByPeriod.map(([period, items]) => {
        return (
          <div
            key={period}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all"
          >
            {/* Saat Başlığı */}
            <div className="bg-slate-50/80 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  {period}
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {period}. Ders Saati
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  ({items.length} boş ders)
                </span>
              </div>
            </div>

            {/* Sınıf Kartları Grid */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {items.map(({ c, originalIndex }) => {
                const coverKey = `${c.absentStaff?.id || c.absentStaffId}_${c.period}`;
                const isLocked = lockedKeys.has(coverKey);
                const absentName = c.absentStaff?.name || 'Öğretmen';
                const reason = reasonMap.get(String(c.absentStaff?.id || c.absentStaffId)) || 'İzinli';
                const subId = c.substituteStaffId || c.substituteStaff?.id || c.suggestedSubstitute?.staff?.id;
                const subName = c.substituteStaff?.name || c.suggestedSubstitute?.staff?.name;
                const isCancelled = c.isCancelled || c.substituteStaffId === 'CANCEL';
                const isAdmin = c.substituteStaffId === 'ADMIN';
                const isCombined = Boolean(c.isCombined || c.isMerged);
                const mergedName = c.mergedWithStaff?.name || c.presentCoTeachers?.[0]?.name;
                const isConflict = Boolean(c.suggestedSubstitute?.isConflict);
                const isOpen = openDropdownIdx === originalIndex;

                const stationName = stationMap.get(String(subId));
                const proximity = getZoneDistance(c.room || c.className, stationName);
                const proximityBadge = c.suggestedSubstitute?.proximityLabel
                  ? {
                      label: c.suggestedSubstitute.proximityLabel,
                      color: c.suggestedSubstitute.matchTier === 1
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : c.suggestedSubstitute.matchTier === 2
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : c.suggestedSubstitute.matchTier === 3
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }
                  : getProximityBadge(proximity);

                return (
                  <div
                    key={originalIndex}
                    className={`rounded-xl border p-4 transition-all relative ${
                      isLocked
                        ? 'border-indigo-300 bg-indigo-50/20'
                        : isCombined
                        ? 'border-purple-300 bg-purple-50/40 shadow-2xs'
                        : isAdmin
                        ? 'border-purple-200 bg-purple-50/20'
                        : isCancelled
                        ? 'border-slate-200 bg-slate-50/50 opacity-70'
                        : subName
                        ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                        : 'border-amber-200 bg-amber-50/20'
                    }`}
                  >
                    {/* Kart Başlığı: Sınıf & Kilit Butonu */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-lg border shadow-2xs ${getClassBadgeStyle(
                            c.className
                          )}`}
                        >
                          {parseAndStandardizeClass(c.className, classDisplayMap).displayName}
                        </span>
                        {c.subject && (
                          <span className="text-xs font-semibold text-slate-600 truncate max-w-[130px]" title={c.subject}>
                            {c.subject}
                          </span>
                        )}
                        {c.room && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {c.room}
                          </span>
                        )}
                      </div>

                      {/* Kilit Butonu */}
                      {!isShowingSaved && (
                        <button
                          type="button"
                          onClick={() => onToggleLock(coverKey)}
                          title={isLocked ? 'Atama kilitli (Öneri ile değişmez)' : 'Atamayı kilitle'}
                          className={`p-1.5 rounded-lg transition ${
                            isLocked
                              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                          }`}
                        >
                          {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                        </button>
                      )}
                    </div>

                    {/* Gelmeyen Öğretmen Bilgisi */}
                    <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1 font-medium text-slate-700 truncate" title={absentName}>
                        <User size={12} className="text-slate-400 shrink-0" />
                        {absentName}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-full shrink-0">
                        {reason}
                      </span>
                    </div>

                    {/* Atanan Nöbetçi Alanı / Dropdown Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDropdownIdx(isOpen ? null : originalIndex);
                          setTeacherSearch('');
                        }}
                        disabled={isLocked}
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                          isLocked
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                            : isCombined
                            ? 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100/60'
                            : isAdmin
                            ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100/60'
                            : isCancelled
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : isConflict
                            ? 'bg-orange-50 text-orange-800 border-orange-300'
                            : subName
                            ? 'bg-indigo-50/60 text-indigo-900 border-indigo-200 hover:bg-indigo-100/60'
                            : 'bg-white text-slate-400 border-amber-300 hover:border-amber-400'
                        }`}
                      >
                        <div className="min-w-0">
                          {isCombined ? (
                            <div className="flex items-center gap-1.5 font-bold text-purple-800">
                              <span>📚</span> Birleştirildi: {mergedName || subName}
                            </div>
                          ) : isAdmin ? (
                            <div className="flex items-center gap-1.5 font-bold text-purple-700">
                              <Shield size={14} /> İdare Kontrolünde
                            </div>
                          ) : isCancelled ? (
                            <div className="text-slate-500 italic">Ders İptal / Boş</div>
                          ) : subName ? (
                            <div>
                              <div className="font-bold truncate flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-indigo-600 shrink-0" />
                                <span>{subName}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                {stationName && <span>📍 {stationName}</span>}
                                {proximityBadge && (
                                  <span
                                    className={`px-1 rounded border text-[9px] font-bold ${proximityBadge.color}`}
                                  >
                                    {proximityBadge.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="font-medium text-amber-700">Nöbetçi Ata...</span>
                          )}
                        </div>

                        {!isLocked && (
                          <ChevronDown size={14} className="text-slate-400 shrink-0" />
                        )}
                      </button>

                      {/* Dropdown Popover */}
                      {isOpen && (
                        <div
                          className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                          style={{ minWidth: '260px' }}
                        >
                          <div className="p-1 mb-1 border-b border-slate-100">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Öğretmen ara..."
                              value={teacherSearch}
                              onChange={(e) => setTeacherSearch(e.target.value)}
                              className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                            />
                          </div>

                          {/* Hızlı Seçenekler */}
                          <div className="space-y-0.5 border-b border-slate-100 pb-1 mb-1">
                            {c.presentCoTeachers && c.presentCoTeachers.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectSubstitute(originalIndex, c.presentCoTeachers[0].id, {
                                    isMerged: true,
                                    isCombined: true,
                                    mergedWithStaff: c.presentCoTeachers[0],
                                  });
                                  setOpenDropdownIdx(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-purple-50 text-purple-800 font-bold flex items-center justify-between"
                              >
                                <span>📚 Grubu Birleştir ({c.presentCoTeachers[0].name})</span>
                                {isCombined && <Check size={13} className="text-purple-600" />}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSubstitute(originalIndex, '', {
                                  isMerged: false,
                                  isCombined: false,
                                  mergedWithStaff: null,
                                });
                                setOpenDropdownIdx(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-600 font-medium flex items-center justify-between"
                            >
                              <span>⚪ Boş Bırak (Atanmadı)</span>
                              {!subId && !isAdmin && !isCancelled && !isCombined && <Check size={13} className="text-indigo-600" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSubstitute(originalIndex, 'ADMIN', {
                                  isMerged: false,
                                  isCombined: false,
                                  mergedWithStaff: null,
                                });
                                setOpenDropdownIdx(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-purple-50 text-purple-700 font-bold flex items-center justify-between"
                            >
                              <span>🏢 İdareye Bırak</span>
                              {isAdmin && <Check size={13} className="text-purple-600" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSubstitute(originalIndex, 'CANCEL', {
                                  isMerged: false,
                                  isCombined: false,
                                  mergedWithStaff: null,
                                });
                                setOpenDropdownIdx(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-red-50 text-red-600 font-medium flex items-center justify-between"
                            >
                              <span>❌ İptal Et</span>
                              {isCancelled && <Check size={13} className="text-red-600" />}
                            </button>
                          </div>

                          {/* Nöbetçi Öğretmenler Listesi */}
                          <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-0.5">
                            Nöbetçi Öğretmenler
                          </div>
                          <div className="space-y-0.5 mt-0.5">
                            {(c.availableDutyStaff || []).map((staff: any) => {
                              const staffStation = staff.station?.name || stationMap.get(String(staff.id)) || '';
                              const dist = staff.floorDistance ?? getZoneDistance(c.room || c.className, staffStation);
                              const pBadge = staff.proximityLabel
                                ? {
                                    label: staff.proximityLabel,
                                    color: staff.matchTier === 1
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : staff.matchTier === 2
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : staff.matchTier === 3
                                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                                      : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }
                                : getProximityBadge(dist);
                              const isSelected = String(subId) === String(staff.id) && !isAdmin && !isCancelled;

                              if (teacherSearch.trim()) {
                                const q = teacherSearch.toLocaleLowerCase('tr-TR');
                                if (!staff.name.toLocaleLowerCase('tr-TR').includes(q)) return null;
                              }

                              return (
                                <button
                                  key={staff.id}
                                  type="button"
                                  onClick={() => {
                                    onSelectSubstitute(originalIndex, staff.id, {
                                      isMerged: false,
                                      isCombined: false,
                                      mergedWithStaff: null,
                                    });
                                    setOpenDropdownIdx(null);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                                    isSelected
                                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                                      : !staff.isFree
                                      ? 'text-slate-400 hover:bg-slate-50'
                                      : 'hover:bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span>{staff.name}</span>
                                      {pBadge && (
                                        <span className={`px-1 py-0.2 rounded border text-[9px] font-bold ${pBadge.color}`}>
                                          {pBadge.label}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                      {staffStation && <span>📍 {staffStation}</span>}
                                      <span>{staff.coverCount || 0} Görev</span>
                                      {!staff.isFree && (
                                        <span className="text-red-500 font-medium">(Dersi Var)</span>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && <Check size={14} className="text-indigo-600" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
