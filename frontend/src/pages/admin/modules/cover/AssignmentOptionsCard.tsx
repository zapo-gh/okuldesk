import React from 'react';
import { RefreshCw, BookOpen, Calendar } from 'lucide-react';

interface AssignmentOptionsCardProps {
  rulePreventConsecutive: boolean;
  onPreventConsecutiveChange: (val: boolean) => void;
  ruleMaxPerHour: number;
  onMaxPerHourChange: (val: number) => void;
  ruleMaxPerDay: number;
  onMaxPerDayChange: (val: number) => void;
}

export const AssignmentOptionsCard: React.FC<AssignmentOptionsCardProps> = ({
  rulePreventConsecutive,
  onPreventConsecutiveChange,
  ruleMaxPerHour,
  onMaxPerHourChange,
  ruleMaxPerDay,
  onMaxPerDayChange,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
      {/* 1. Ardışık Görevi Engelle */}
      <div className="flex items-center justify-between gap-3 pt-2 md:pt-0 md:px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-xs">
            <RefreshCw size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 leading-tight">Ardışık Görevi Engelle</div>
            <div className="text-xs text-slate-500 mt-0.5 leading-snug">Üst üste 2 saat nöbeti önler</div>
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

      {/* 2. Aynı Saatte Max Görev */}
      <div className="flex items-center justify-between gap-3 pt-3 md:pt-0 md:px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 leading-tight">Saatte Max Görev</div>
            <div className="text-xs text-slate-500 mt-0.5 leading-snug">Aynı saatte atanabilir sınıf</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-1">
          <input
            type="number"
            min={1}
            max={5}
            value={ruleMaxPerHour}
            onChange={(e) => onMaxPerHourChange(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
            className="w-12 text-center text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          <span className="text-xs text-slate-500 font-medium pr-1">sınıf</span>
        </div>
      </div>

      {/* 3. Günlük Max Görev */}
      <div className="flex items-center justify-between gap-3 pt-3 md:pt-0 md:px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-xs">
            <Calendar size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 leading-tight">Günlük Max Görev</div>
            <div className="text-xs text-slate-500 mt-0.5 leading-snug">Tüm nöbetçilerin günlük üst limiti</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-1">
          <input
            type="number"
            min={1}
            max={10}
            value={ruleMaxPerDay}
            onChange={(e) => onMaxPerDayChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="w-12 text-center text-sm font-bold text-slate-800 bg-white border border-slate-300 rounded px-1.5 py-1 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          <span className="text-xs text-slate-500 font-medium pr-1">saat</span>
        </div>
      </div>
    </div>
  );
};
