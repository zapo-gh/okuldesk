import React, { useState, useMemo } from 'react';
import { BarChart3, Users, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

interface AssignmentInsightsCardProps {
  summaryStat: {
    total: number;
    assigned: number;
    empty: number;
    conflict: number;
  } | null;
  dailyDutyStaff: any[];
  displayCovers: any[];
}

export const AssignmentInsightsCard: React.FC<AssignmentInsightsCardProps> = ({
  summaryStat,
  dailyDutyStaff,
  displayCovers,
}) => {
  const [filter, setFilter] = useState<'all' | 'assigned' | 'idle'>('all');

  // Her nöbetçi öğretmenin bugün aldığı görevler ve saatleri
  const teacherWorkloads = useMemo(() => {
    return dailyDutyStaff.map(duty => {
      const staffId = String(duty.staff?.id || '');
      const staffName = duty.staff?.name || 'İsimsiz';
      const stationName = duty.station?.name || 'Genel';

      const assignedCovers = displayCovers.filter(c => {
        const subId = c.substituteStaffId || c.substituteStaff?.id || c.suggestedSubstitute?.staff?.id;
        return String(subId) === staffId && !c.isCancelled;
      }).sort((a, b) => a.period - b.period);

      return {
        staffId,
        staffName,
        stationName,
        assignedCount: assignedCovers.length,
        assignedCovers: assignedCovers.map(c => ({
          period: c.period,
          className: c.className,
          subject: c.subject,
        })),
      };
    });
  }, [dailyDutyStaff, displayCovers]);

  const assignedCount = teacherWorkloads.filter(t => t.assignedCount > 0).length;
  const idleCount = teacherWorkloads.filter(t => t.assignedCount === 0).length;

  const filteredTeachers = useMemo(() => {
    let list = [...teacherWorkloads];
    if (filter === 'assigned') {
      list = list.filter(t => t.assignedCount > 0);
    } else if (filter === 'idle') {
      list = list.filter(t => t.assignedCount === 0);
    }
    // Önce en çok görev alanlar, sonra isim sırası
    return list.sort((a, b) => {
      if (b.assignedCount !== a.assignedCount) return b.assignedCount - a.assignedCount;
      return a.staffName.localeCompare(b.staffName, 'tr');
    });
  }, [teacherWorkloads, filter]);

  if (!summaryStat && dailyDutyStaff.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
      {/* Üst Başlık & İstatistik Hapları */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-xs">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Planlama Analizi & Nöbetçi Yükü</h3>
            <p className="text-xs text-slate-500">Bugünkü nöbetçilerin görev dağılım dengesi</p>
          </div>
        </div>

        {summaryStat && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              {summaryStat.total} Toplam Boş Ders
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <CheckCircle2 size={13} className="text-emerald-600" />
              {summaryStat.assigned} Atandı
            </span>
            {summaryStat.empty > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                <AlertCircle size={13} className="text-amber-600" />
                {summaryStat.empty} Atanmadı
              </span>
            )}
            {summaryStat.conflict > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200/60">
                <ShieldAlert size={13} className="text-orange-600" />
                {summaryStat.conflict} Çakışmalı
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filtreleme Butonları */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tümü ({teacherWorkloads.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('assigned')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'assigned' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Görevde ({assignedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('idle')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'idle' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Boşta ({idleCount})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {assignedCount} / {teacherWorkloads.length} Nöbetçi Görevlendirildi
        </div>
      </div>

      {/* Nöbetçi Öğretmen Kartları Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2">
        {filteredTeachers.map(t => {
          const isBusy = t.assignedCount > 0;
          return (
            <div
              key={t.staffId}
              className={`rounded-xl p-3 border transition-all ${
                isBusy
                  ? 'bg-slate-50/60 border-slate-200/90 shadow-xs hover:border-indigo-200 hover:bg-indigo-50/20'
                  : 'bg-white border-dashed border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-800 truncate" title={t.staffName}>
                    {t.staffName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    📍 {t.stationName}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    t.assignedCount >= 3
                      ? 'bg-red-100 text-red-700'
                      : t.assignedCount >= 2
                      ? 'bg-indigo-100 text-indigo-700'
                      : t.assignedCount === 1
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.assignedCount} Görev
                </span>
              </div>

              {/* Atanan Dersler Listesi */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                {t.assignedCovers.length > 0 ? (
                  t.assignedCovers.map((ac, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 shadow-2xs"
                    >
                      <span className="text-indigo-600 font-bold">{ac.period}.S:</span> {ac.className}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Henüz boş ders görevi yok (Boşta)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
