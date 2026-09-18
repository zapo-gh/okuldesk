import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import {
  UserCheck, Calendar, UserX, Save, Printer, AlertTriangle,
  ExternalLink, RefreshCw, Trash2, Zap, CheckCircle, Info, Check, Copy,
  ChevronLeft, ChevronRight, BookOpen, Clock
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ActionModal } from '../../../components/ui/ActionModal';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

// ─── Yazdırma Şablonu ───────────────────────────────────────────────────────
const CoverPrintTemplate = React.forwardRef<
  HTMLDivElement,
  { date: string; covers: any[]; absences: any[]; schoolName: string }
>(({ date, covers, absences, schoolName }, ref) => (
  <div ref={ref} className="p-8 bg-white font-sans text-sm print:text-xs">
    <div className="text-center mb-6 border-b pb-4">
      <h1 className="text-lg font-bold">{schoolName}</h1>
      <h2 className="text-base font-semibold mt-1">Günlük Boş Ders Görevlendirme Listesi</h2>
      <p className="text-slate-500 text-sm">
        {new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
    {absences.length > 0 && (
      <div className="mb-4">
        <p className="font-semibold text-sm mb-1">İzinli Öğretmenler:</p>
        <p className="text-slate-600 text-xs">{absences.map(a => `${a.staff?.name} (${a.reason || 'İzinli'})`).join(', ')}</p>
      </div>
    )}
    <table className="w-full border-collapse border border-slate-300 text-xs">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-300 p-2 text-left">Gelmeyen Öğretmen</th>
          <th className="border border-slate-300 p-2 text-center">Saat</th>
          <th className="border border-slate-300 p-2 text-center">Ders</th>
          <th className="border border-slate-300 p-2 text-center">Sınıf</th>
          <th className="border border-slate-300 p-2 text-left">Görevlendirilen Nöbetçi</th>
        </tr>
      </thead>
      <tbody>
        {covers.map((c, i) => (
          <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
            <td className="border border-slate-300 p-2">
              {c.absentStaff?.name}
              <span className="text-slate-500 text-[10px] ml-1">
                ({absences.find(a => a.staffId === c.absentStaff?.id)?.reason || 'İzinli'})
              </span>
            </td>
            <td className="border border-slate-300 p-2 text-center">{c.period}. Ders</td>
            <td className="border border-slate-300 p-2 text-center">{c.subject || '—'}</td>
            <td className="border border-slate-300 p-2 text-center">{c.className}</td>
            <td className="border border-slate-300 p-2">{c.substituteStaff?.name || c.suggestedSubstitute?.staff?.name || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-6 text-xs text-slate-400 text-right">Yazdırma: {new Date().toLocaleString('tr-TR')}</p>
  </div>
));
CoverPrintTemplate.displayName = 'CoverPrintTemplate';

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function CoverAssignmentPage() {
  const { settings } = useSettings();
  const { confirm, confirmModal } = useConfirm();
  const academicYear = settings?.academicYear || '2025-2026';
  const schoolName = settings?.schoolName || 'Okul Adı';
  const printRef = useRef<HTMLDivElement>(null);

  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Tabs
  type TabType = 'absences' | 'planning' | 'print';
  const [activeTab, setActiveTab] = useState<TabType>('absences');

  // Rules
  const [rulePreventConsecutive, setRulePreventConsecutive] = useState(true);
  const [ruleMaxPerHour, setRuleMaxPerHour] = useState(1);
  const [ruleMaxPerDay, setRuleMaxPerDay] = useState(6);

  // Veriler
  const [absences, setAbsences] = useState<any[]>([]);
  const [savedCovers, setSavedCovers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [hasTimetable, setHasTimetable] = useState<boolean | null>(null);
  const [suggestStatus, setSuggestStatus] = useState<{ status: string; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  // B1: Her devamsız öğretmenin günlük ders listesi: { [staffId]: TimetableEntry[] }
  const [absentTeacherSchedules, setAbsentTeacherSchedules] = useState<Record<string, any[]>>({});
  // Devamsız öğretmen detay modalı
  const [scheduleModalAbs, setScheduleModalAbs] = useState<any | null>(null);

  // Modal
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({ staffId: '', startDate: dateStr, endDate: dateStr, reason: 'Raporlu' });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `BosDesDoldurma_${dateStr}`
  });

  // ─── Veri Yükleme ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setSuggestions([]);
    setSuggestStatus(null);
    setAbsentTeacherSchedules({});
    try {
      const [absRes, coversRes, staffRes, timetableRes] = await Promise.all([
        api.get(`/duty-schedule/absences?date=${dateStr}&academicYear=${academicYear}`),
        api.get(`/duty-schedule/covers?date=${dateStr}&academicYear=${academicYear}`),
        api.get('/staff'),
        api.get(`/timetable/active?academicYear=${academicYear}`).catch(() => ({ data: { data: null } }))
      ]);
      const fetchedAbsences: any[] = absRes.data.data || [];
      setAbsences(fetchedAbsences);
      setSavedCovers(coversRes.data.data || []);
      setStaffList(staffRes.data.data?.staff || staffRes.data.data || []);
      setHasTimetable(!!timetableRes.data.data);

      // B1: activeTimetable.entries artık gelmiyor — her devamsız öğretmenin programını ayrıca çek
      if (fetchedAbsences.length > 0 && timetableRes.data.data) {
        const staffIds = fetchedAbsences.map((a: any) => a.staffId).filter(Boolean);
        const schedRes = await api.get(`/timetable/teachers?academicYear=${academicYear}&staffIds=${encodeURIComponent(staffIds.join(','))}`);
        setAbsentTeacherSchedules(schedRes.data.data || {});
      }
    } catch {
      toast.error('Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [dateStr, academicYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Öneri Oluştur ─────────────────────────────────────────
  const handleSuggest = async () => {
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const res = await api.get(
        `/duty-schedule/covers/suggest?date=${dateStr}&academicYear=${academicYear}&preventConsecutive=${rulePreventConsecutive}&maxCoversPerHour=${ruleMaxPerHour}&maxCoversPerDay=${ruleMaxPerDay}`
      );
      const { status, message, suggestions: sugs } = res.data.data;
      setSuggestions(sugs || []);
      setSuggestStatus({ status, message });
      if (status !== 'success') toast(message || 'Öneri oluşturulamadı.', { icon: '⚠️' });
    } catch {
      toast.error('Öneri oluşturulamadı.');
    } finally {
      setSuggestLoading(false);
    }
  };

  const updateSuggestion = (index: number, substituteStaffId: string) => {
    setSuggestions(prev =>
      prev.map((s, i) => i === index ? { ...s, substituteStaffId } : s)
    );
  };

  // ─── İzin Ekle ──────────────────────────────────────────────────────────
  const handleSaveAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/duty-schedule/absences', { ...absenceForm, academicYear });
      toast.success('İzin/Devamsızlık kaydedildi.');
      setIsAbsenceModalOpen(false);
      // B3: reason boş string yerine default değere sıfırlanıyor
      setAbsenceForm({ staffId: '', startDate: dateStr, endDate: dateStr, reason: 'Raporlu' });
      fetchData();
    } catch {
      toast.error('Kaydedilemedi.');
    }
  };

  const handleDeleteAbsence = async (id: string, name: string) => {
    if (await confirm(`${name} adlı öğretmenin izni/devamsızlığı silinecek. Emin misiniz?`)) {
      try {
        await api.delete(`/duty-schedule/absences/${id}`);
        toast.success('İzin silindi.');
        fetchData();
      } catch {
        toast.error('Silinemedi.');
      }
    }
  };

  // ─── Kaydet ve Sil ───────────────────────────────────────────────────────
  const handleSaveCovers = async () => {
    try {
      const coversToSave = suggestions.map(s => ({
        absenceId: s.absenceId,
        absentStaffId: s.absentStaff?.id,
        substituteStaffId: s.substituteStaffId,
        period: s.period,
        className: s.className,
        subject: s.subject
      }));
      await api.post('/duty-schedule/covers', { date: dateStr, academicYear, covers: coversToSave });
      toast.success('Atamalar başarıyla kaydedildi.');
      fetchData();
    } catch {
      toast.error('Kaydedilemedi.');
    }
  };

  const handleDeleteCover = async (id: string) => {
    try {
      await api.delete(`/duty-schedule/covers/${id}`);
      toast.success('Görevlendirme silindi.');
      fetchData();
    } catch {
      toast.error('Silinemedi.');
    }
  };

  const handleDateChange = (days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    setDateStr(d.toISOString().split('T')[0]);
  };

  // WhatsApp metni kaldırıldı

  // ─── Dinamik Hesaplama (Kullanıcı seçim yaptıkça güncellenir) ────────────
  const derivedSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];

    // Backend öneri üretirken seçilen öğretmenin sayısını sonraki satırlarda +1 artırıyor.
    // Bu nedenle MAX değil MIN kullanılmalı: her öğretmenin ilk göründüğü satırdaki sayı
    // = sadece DB'deki (oturum öncesi) cover sayısı. Phase 1 yeni oturum seçimlerini üstüne ekler.
    const currentCoverCounts = new Map<string, number>();
    suggestions.forEach(sug => {
      sug.availableDutyStaff?.forEach((st: any) => {
        const existing = currentCoverCounts.get(st.id);
        if (existing === undefined || st.coverCount < existing) {
          currentCoverCounts.set(st.id, st.coverCount);
        }
      });
    });

    const assignedPeriods = new Map<string, Set<number>>();

    // 1. Aşama: Şu anki tüm seçimleri say ve saatleri kaydet
    suggestions.forEach(sug => {
      if (sug.substituteStaffId) {
        currentCoverCounts.set(sug.substituteStaffId, (currentCoverCounts.get(sug.substituteStaffId) || 0) + 1);
        if (!assignedPeriods.has(sug.substituteStaffId)) {
          assignedPeriods.set(sug.substituteStaffId, new Set());
        }
        assignedPeriods.get(sug.substituteStaffId)!.add(sug.period);
      }
    });

    // 2. Aşama: Her satır için kuralları yeniden değerlendir
    return suggestions.map(sug => {
      const updatedAvailableStaff = sug.availableDutyStaff?.map((st: any) => {
        let isEligible = true;
        let conflictReason = '';

        const periods = assignedPeriods.get(st.id) || new Set();
        
        let assignedCountThisPeriod = 0;
        suggestions.forEach((s: any) => {
          if (s.period === sug.period && s.substituteStaffId === st.id) {
            assignedCountThisPeriod++;
          }
        });
        
        const isSelectedHere = sug.substituteStaffId === st.id;
        const hasOtherAssignmentThisPeriod = isSelectedHere ? assignedCountThisPeriod > 1 : assignedCountThisPeriod > 0;

        if (hasOtherAssignmentThisPeriod) {
          isEligible = false;
          conflictReason = 'Bu saatte dolu';
        }

        if (rulePreventConsecutive && isEligible) {
           const hasPrev = periods.has(sug.period - 1);
           const hasNext = periods.has(sug.period + 1);
           // Eğer bu öğretmeni BU satırda seçmişsek, ardışık kontrolünde kendisiyle çakışmasın
           // (Zaten periods.has() tüm atandığı saatleri döndürüyor)
           if (hasPrev || hasNext) {
             isEligible = false;
             conflictReason = 'Ardışık görev';
           }
        }

        const currentCount = currentCoverCounts.get(st.id) || 0;
        const projectedCount = isSelectedHere ? currentCount : currentCount + 1;
        if (ruleMaxPerDay && projectedCount > ruleMaxPerDay) {
          isEligible = false;
          conflictReason = 'Günlük max limit';
        }

        if (!st.isFree && isEligible) {
          isEligible = false;
          conflictReason = 'Derste (Çakışma)';
        }

        return {
          ...st,
          isEligible,
          conflictReason,
          coverCount: currentCount
        };
      });

      let isConflict = false;
      if (sug.substituteStaffId) {
        const selectedOption = updatedAvailableStaff?.find((s: any) => s.id === sug.substituteStaffId);
        if (selectedOption && (!selectedOption.isEligible || !selectedOption.isFree)) {
          isConflict = true;
        }
      }

      return {
        ...sug,
        availableDutyStaff: updatedAvailableStaff,
        suggestedSubstitute: {
          ...sug.suggestedSubstitute,
          isConflict
        }
      };
    });
  }, [suggestions, rulePreventConsecutive, ruleMaxPerDay]);

  // Görevlendirme tablosu için birleşik veri
  const displayCovers = suggestions.length > 0 ? derivedSuggestions : savedCovers;
  const isShowingSaved = savedCovers.length > 0 && suggestions.length === 0;

  // B5: Günlük özet istatistikleri
  const summaryStat = useMemo(() => {
    if (displayCovers.length === 0) return null;
    const total    = displayCovers.length;
    const assigned = displayCovers.filter((c: any) => c.substituteStaffId || c.substituteStaff).length;
    const conflict = displayCovers.filter((c: any) => c.suggestedSubstitute?.isConflict).length;
    const empty    = total - assigned;
    return { total, assigned, empty, conflict };
  }, [displayCovers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boş Ders Doldurma"
        description="İzinli öğretmenlerin derslerine nöbetçi öğretmen atayın. Atamalar veritabanına kaydedilir."
        icon={<UserCheck size={24} />}
      />
      {confirmModal}

      {/* Aktif Ders Programı Uyarısı */}
      {hasTimetable === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-bold text-amber-800">Aktif Ders Programı Yok</h3>
            <p className="text-amber-700 text-sm mt-1">
              Bu modül, hangi öğretmenin hangi saatte hangi sınıfa girdiğini tespit etmek için aktif bir ders programına ihtiyaç duyar.
              Ders programı olmadan izinli öğretmen eklenemez ve boş ders ataması yapılamaz.
            </p>
          </div>
          <Link to="/admin/timetable">
            <Button variant="outline" className="gap-1.5 shrink-0 text-amber-800 border-amber-300 hover:bg-amber-100">
              <ExternalLink size={14} /> Ders Programı
            </Button>
          </Link>
        </div>
      )}

      {/* Tarih Seçici */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
        <label className="font-semibold text-slate-700 flex items-center gap-2">
          <Calendar size={18} /> Tarih:
        </label>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="px-2" onClick={() => handleDateChange(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <input
            type="date"
            value={dateStr}
            onChange={e => setDateStr(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <Button variant="outline" className="px-2" onClick={() => handleDateChange(1)}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <Button variant="ghost" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Yükleniyor' : 'Yenile'}
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-6 pb-2 sm:pb-0">
        {[
          { id: 'absences', label: 'Okula Gelemeyenler' },
          { id: 'planning', label: 'Planlama' },
          { id: 'print', label: 'Yazdırma Önizlemesi' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 sm:px-6 py-2.5 text-sm font-medium border-b-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT: ABSENCES ─── */}
      {activeTab === 'absences' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-slate-800">
              Okula Gelemeyen Öğretmenler
              {absences.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{absences.length} kişi</span>
              )}
            </h3>
            <Button
              onClick={() => { setAbsenceForm({ staffId: '', startDate: dateStr, endDate: dateStr, reason: 'Raporlu' }); setIsAbsenceModalOpen(true); }}
              className="gap-2 bg-slate-800 hover:bg-slate-900"
              disabled={!hasTimetable}
            >
              <UserX size={16} /> İzinli Öğretmen Ekle
            </Button>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-slate-400 border-t-transparent" />
              </div>
            ) : absences.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">
                Bu tarihte kayıtlı devamsız öğretmen yok. Yeni eklemek için sağ üstteki butonu kullanın.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {absences.map(abs => {
                  const targetDayOfWeek = (() => {
                    const d = new Date(dateStr).getDay();
                    return d === 0 ? 7 : d;
                  })();
                  const staffClasses = (absentTeacherSchedules[abs.staffId] || [])
                    .filter((e: any) => e.dayOfWeek === targetDayOfWeek)
                    .sort((a: any, b: any) => a.period - b.period);

                  const reasonColor: Record<string, string> = {
                    'Raporlu':       'bg-red-50 text-red-700 border-red-200',
                    'Sevkli':        'bg-orange-50 text-orange-700 border-orange-200',
                    'Görevli İzinli':'bg-blue-50 text-blue-700 border-blue-200',
                    'İdari İzinli':  'bg-purple-50 text-purple-700 border-purple-200',
                    'Mazeret İzni': 'bg-amber-50 text-amber-700 border-amber-200',
                  };
                  const reasonCls = reasonColor[abs.reason || ''] || 'bg-slate-100 text-slate-600 border-slate-200';

                  return (
                    <div
                      key={abs.id}
                      className="group relative flex items-center gap-3 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl px-4 py-3 cursor-pointer transition-all duration-200 select-none min-w-0 w-full"
                      onClick={() => setScheduleModalAbs({ abs, staffClasses })}
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                        {abs.staff?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      {/* Bilgi */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm leading-tight truncate">{abs.staff?.name}</p>
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${reasonCls}`}>
                          {abs.reason || 'İzinli'}
                        </span>
                      </div>
                      {/* Sağ köşe: normal → ders sayısı, kart hover'da → sil butonu */}
                      <div className="shrink-0 flex flex-col items-center justify-center w-10">
                        {/* Ders sayısı — kart hover'da kaybolur */}
                        <div className="flex flex-col items-center group-hover:hidden">
                          {staffClasses.length > 0 ? (
                            <>
                              <span className="text-lg font-extrabold text-indigo-600 leading-none">{staffClasses.length}</span>
                              <span className="text-[9px] text-slate-400 font-medium uppercase">ders</span>
                            </>
                          ) : (
                            <span className="text-[9px] text-slate-300 uppercase">ders yok</span>
                          )}
                        </div>
                        {/* Sil butonu — kart hover'da görünür */}
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteAbsence(abs.id, abs.staff?.name); }}
                          className="hidden group-hover:flex items-center justify-center p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="İzni Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DEVAMSIZ ÖĞRETMEN PROGRAM DETAY MODALİ ─── */}
      {scheduleModalAbs && (() => {
        const { abs, staffClasses } = scheduleModalAbs;
        const dayLabel = new Date(dateStr).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
        return (
          <ActionModal
            isOpen={!!scheduleModalAbs}
            onClose={() => setScheduleModalAbs(null)}
            title=""
            hideFooter
          >
            <div className="px-1 pb-2">
              {/* Başlık */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                  {abs.staff?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">{abs.staff?.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold bg-red-100 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full">
                      {abs.reason || 'İzinli'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(abs.startDate).toLocaleDateString('tr-TR')}
                      {abs.startDate !== abs.endDate && ` – ${new Date(abs.endDate).toLocaleDateString('tr-TR')}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gün bantı */}
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={15} className="text-indigo-400" />
                <span className="text-sm font-bold text-slate-700 capitalize">{dayLabel} Günü Dersleri</span>
                {staffClasses.length > 0 && (
                  <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {staffClasses.length} ders
                  </span>
                )}
              </div>

              {staffClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <BookOpen size={36} className="mb-3 opacity-30" />
                  <p className="text-sm">Bu gün için ders programı bulunamadı.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {staffClasses.map((c: any, idx: number) => (
                    <div
                      key={c.id || idx}
                      className="flex items-center gap-4 bg-gradient-to-r from-slate-50 to-white border border-slate-100 rounded-xl px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                    >
                      {/* Saat numarası */}
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                        {c.period}
                      </div>
                      {/* Sınıf + Ders */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{c.className}</p>
                        {c.subject && (
                          <p className="text-xs text-slate-500 mt-0.5">{c.subject}</p>
                        )}
                      </div>
                      {/* Ders saati etiketi */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
                        <Clock size={12} />
                        <span>{c.period}. Ders</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Alt alan: sil butonu */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <button
                  onClick={() => { setScheduleModalAbs(null); handleDeleteAbsence(abs.id, abs.staff?.name); }}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition"
                >
                  <Trash2 size={14} /> İzni Sil
                </button>
                <Button onClick={() => setScheduleModalAbs(null)}>Kapat</Button>
              </div>
            </div>
          </ActionModal>
        );
      })()}

      {/* ─── TAB CONTENT: PLANNING ─── */}
      {activeTab === 'planning' && (
        <div className="space-y-6">
          {/* Rules Engine */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
            <div className="flex-1 lg:border-r border-slate-100 lg:pr-6">
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Atama Kuralları</h4>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                  rulePreventConsecutive ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-slate-400 bg-white'
                }`}>
                  {rulePreventConsecutive && <Check size={14} className="text-white" />}
                </div>
                <input type="checkbox" checked={rulePreventConsecutive} onChange={e => setRulePreventConsecutive(e.target.checked)} className="hidden" />
                <div>
                  <span className="block text-sm font-semibold text-slate-800">Ardışık Görevi Engelle</span>
                  <span className="text-xs text-slate-500">Öğretmene art arda saatlerde görev verilmesini önler.</span>
                </div>
              </label>
            </div>
            <div className="flex-1 flex gap-6">
              <div>
                <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Aynı Saatte Max Görev</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={ruleMaxPerHour}
                    onChange={e => setRuleMaxPerHour(parseInt(e.target.value) || 1)}
                    className="w-16 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-center text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="text-xs text-slate-500">Bir öğretmene aynı saatte<br/>en fazla kaç görev verilebileceği.</span>
                </div>
              </div>
              <div>
                <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">Günlük Max Görev</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={ruleMaxPerDay}
                    onChange={e => setRuleMaxPerDay(parseInt(e.target.value) || 6)}
                    className="w-16 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-center text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="text-xs text-slate-500">Tüm öğretmenlerin günlük<br/>görev limitini topluca günceller.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Planning Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                <Calendar size={16} />
                {isShowingSaved ? (
                  <span className="flex items-center gap-2">
                    Kaydedilmiş Atamalar
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={11} /> {savedCovers.length} kayıt
                    </span>
                  </span>
                ) : suggestions.length > 0 ? (
                  <span className="flex items-center gap-2">
                    Öneri Tablosu
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      Kaydedilmedi
                    </span>
                  </span>
                ) : 'Ders Bazlı Görevlendirme'}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSuggest}
                  disabled={suggestLoading || !hasTimetable || absences.length === 0}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs py-1.5"
                >
                  {suggestLoading
                    ? <RefreshCw size={14} className="animate-spin" />
                    : <Zap size={14} />
                  }
                  Öneri Oluştur
                </Button>
                {suggestions.length > 0 && (
                  <Button onClick={handleSaveCovers} className="gap-2 bg-green-600 hover:bg-green-700 text-xs py-1.5">
                    <Save size={14} /> Atamaları Kaydet
                  </Button>
                )}
              </div>
            </div>

            {/* B5: Günlük özet satırı */}
            {summaryStat && (
              <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2 flex flex-wrap gap-4 text-xs">
                <span className="text-slate-500">Toplam: <span className="font-bold text-slate-700">{summaryStat.total} ders</span></span>
                <span className="text-green-600">Atanan: <span className="font-bold">{summaryStat.assigned}</span></span>
                {summaryStat.empty > 0 && (
                  <span className="text-amber-600">Atanmayan: <span className="font-bold">{summaryStat.empty}</span></span>
                )}
                {summaryStat.conflict > 0 && (
                  <span className="text-orange-600">Çakışmalı: <span className="font-bold">{summaryStat.conflict}</span></span>
                )}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Gelmeyen</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Saat</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Ders</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Sınıf</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Atanan Nöbetçi</th>
                    {isShowingSaved && <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">İşlem</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayCovers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-slate-400">
                        {absences.length === 0
                          ? 'Bu tarihte izinli öğretmen yok. "Okula Gelemeyenler" sekmesinden ekleyin.'
                          : !hasTimetable
                          ? 'Aktif ders programı gereklidir.'
                          : (
                            <div className="flex flex-col items-center gap-3">
                              <Zap size={32} className="text-slate-300" />
                              <span className="text-base">Görevlendirme önerisi oluşturmak için "Öneri Oluştur" butonuna basın.</span>
                            </div>
                          )
                        }
                      </td>
                    </tr>
                  ) : isShowingSaved ? (
                    // Kaydedilmiş atamalar — salt okunur
                    savedCovers.map((c, i) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800 text-sm">
                          {c.absentStaff?.name}
                          <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                            ({absences.find(a => a.staffId === c.absentStaff?.id)?.reason || 'İzinli'})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-600">{c.period}. Ders</td>
                        <td className="px-4 py-3 text-center">
                          {c.subject
                            ? <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2 py-0.5 rounded">{c.subject}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">{c.className}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-emerald-700">{c.substituteStaff?.name}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDeleteCover(c.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                            title="Atamayı Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Öneri tablosu — düzenlenebilir
                    displayCovers.map((sug, i) => (
                      <tr key={i} className={`hover:bg-slate-50 transition-colors ${sug.suggestedSubstitute?.isConflict ? 'bg-orange-50/40' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-800 text-sm">
                          {sug.absentStaff?.name}
                          <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                            ({absences.find(a => a.staffId === sug.absentStaff?.id)?.reason || 'İzinli'})
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-600">{sug.period}. Ders</td>
                        <td className="px-4 py-3 text-center">
                          {sug.subject
                            ? <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2 py-0.5 rounded">{sug.subject}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">{sug.className}</span>
                        </td>
                        <td className="px-4 py-3 min-w-[250px]">
                          {/* B4: SearchableSelect ile prefix tabanlı gruplama (B seçeneği) */}
                          <SearchableSelect
                            options={[
                              { value: '', label: '— Seçin —' },
                              ...(sug.availableDutyStaff?.filter((s: any) => s.isEligible).map((st: any) => ({
                                value: st.id,
                                label: `✓ ${st.name} (${st.coverCount} Görev)`
                              })) || []),
                              ...(sug.availableDutyStaff?.filter((s: any) => !s.isEligible).map((st: any) => ({
                                value: st.id,
                                label: `⚠ ${st.name} (${st.coverCount} Görev) — ${st.conflictReason}`
                              })) || [])
                            ]}
                            value={sug.substituteStaffId || ''}
                            onChange={val => updateSuggestion(i, val)}
                            placeholder="Nöbetçi ara..."
                          />
                          {sug.suggestedSubstitute?.isConflict && sug.substituteStaffId && (
                            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                              <Info size={11} /> Bu saatte dersi var veya kural ihlali
                            </p>
                          )}
                          {!sug.substituteStaffId && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <Info size={11} /> Uygun nöbetçi bulunamadı — listeden manuel seçin
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Öneri durum mesajı */}
            {suggestStatus && suggestStatus.status !== 'success' && (
              <div className="bg-amber-50 border-t border-amber-200 px-4 py-3 flex gap-2 text-amber-800 text-sm">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{suggestStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: PRINT ─── */}
      {activeTab === 'print' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">Yazdırma Önizlemesi</h3>
              <Button variant="outline" onClick={() => handlePrint()} className="gap-2" disabled={displayCovers.length === 0}>
                <Printer size={16} /> Yazdır
              </Button>
            </div>
            <div className="p-6 overflow-hidden">
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <CoverPrintTemplate
                  ref={printRef}
                  date={dateStr}
                  covers={displayCovers}
                  absences={absences}
                  schoolName={schoolName}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* İzin Ekleme Modal */}
      <ActionModal
        isOpen={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        title="İzin / Devamsızlık Ekle"
      >
        <form onSubmit={handleSaveAbsence} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Personel *</label>
            <SearchableSelect
              options={staffList.map((s: any) => ({ value: s.id, label: s.name }))}
              value={absenceForm.staffId}
              onChange={val => setAbsenceForm({ ...absenceForm, staffId: val })}
              placeholder="Personel ara ve seç..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç *</label>
              <input
                type="date"
                required
                value={absenceForm.startDate}
                onChange={e => setAbsenceForm({ ...absenceForm, startDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş *</label>
              <input
                type="date"
                required
                value={absenceForm.endDate}
                min={absenceForm.startDate}
                onChange={e => setAbsenceForm({ ...absenceForm, endDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">İzin Türü (Neden) *</label>
            <select
              required
              value={absenceForm.reason}
              onChange={e => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
            >
              <option value="Raporlu">Raporlu</option>
              <option value="Sevkli">Sevkli</option>
              <option value="Görevli İzinli">Görevli İzinli</option>
              <option value="İdari İzinli">İdari İzinli</option>
              <option value="Mazeret İzni">Mazeret İzni</option>
              <option value="Ücretsiz İzin">Ücretsiz İzin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsAbsenceModalOpen(false)}>İptal</Button>
            <Button type="submit">Ekle</Button>
          </div>
        </form>
      </ActionModal>
    </div>
  );
}
