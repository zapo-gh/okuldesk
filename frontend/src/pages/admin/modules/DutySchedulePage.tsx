import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../services/api';
import { useConfirm } from '../../../hooks/useConfirm';
import { useSettings } from '../../../context/SettingsContext';
import {
  CalendarRange, Save, Trash2, MapPin, Users, BarChart2,
  Settings, Printer, Zap, Plus, Edit, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { DutySchedulePrintTemplate } from './print/DutySchedulePrintTemplate';
import { Button } from '../../../components/ui/Button';

// ──────────────────────────────────────────────
// Sabitler
// ──────────────────────────────────────────────
const DAYS = [
  { val: 1, label: 'Pazartesi' },
  { val: 2, label: 'Salı' },
  { val: 3, label: 'Çarşamba' },
  { val: 4, label: 'Perşembe' },
  { val: 5, label: 'Cuma' },
];

const MONTHS = [
  { val: 9,  label: 'Eylül' },
  { val: 10, label: 'Ekim' },
  { val: 11, label: 'Kasım' },
  { val: 12, label: 'Aralık' },
  { val: 1,  label: 'Ocak' },
  { val: 2,  label: 'Şubat' },
  { val: 3,  label: 'Mart' },
  { val: 4,  label: 'Nisan' },
  { val: 5,  label: 'Mayıs' },
  { val: 6,  label: 'Haziran' },
];

const SHIFT_OPTIONS = [
  { val: 'tum',        label: 'Tüm Gün / Ortak Alan' },
  { val: 'sabah',      label: 'Sabah Devresi (İlkokul/Ortaokul)' },
  { val: 'oglen',      label: 'Öğle Devresi (İlkokul/Ortaokul)' },
  { val: 'okuloncesi', label: 'Okul Öncesi / Anasınıfı Özel Alanı' },
];

// Aylık iş günlerini döndürür
function getWorkDays(year: number, month: number) {
  const days: { date: Date; dayOfWeek: number; dayNum: number; weekNum: number; monthName?: string }[] = [];
  
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const startOfWeek = new Date(firstDay);
  const dow = startOfWeek.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);

  let current = new Date(startOfWeek);
  let weekNum = 0;

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  while (current.getTime() <= lastDay.getTime()) {
    for (let i = 0; i < 5; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() + i);
      
      const mName = new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(d);
      
      days.push({
        date: d,
        dayOfWeek: d.getDay(),
        dayNum: d.getDate(),
        weekNum: weekNum,
        monthName: capitalize(mName)
      });
    }
    
    current.setDate(current.getDate() + 7);
    weekNum++;
  }

  return days;
}

// ──────────────────────────────────────────────
// Ana Bileşen
// ──────────────────────────────────────────────
export default function DutySchedulePage() {
  const { confirm, confirmModal } = useConfirm();
  const { settings, refreshSettings } = useSettings();
  const academicYear = settings?.academicYear || '2025-2026';

  // Ay/Yıl seçimi
  const now = new Date();
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(MONTHS.find(m => m.val === now.getMonth() + 1) ? now.getMonth() + 1 : 9);
  const [selectedWeek, setSelectedWeek] = useState(0);

  const [activeTab, setActiveTab] = useState<'cizelge' | 'istatistik' | 'personel' | 'yerler' | 'ayarlar'>('cizelge');

  // Data state
  const [stations,    setStations]    = useState<any[]>([]);
  const [staffList,   setStaffList]   = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [staffConfigs, setStaffConfigs] = useState<any[]>([]);
  const [stats,       setStats]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);

  // Station form
  const [showStationModal, setShowStationModal] = useState(false);
  const [stationForm, setStationForm] = useState<any>({ name: '', sortOrder: 1, shift: 'tum', capacity: 1 });

  // Print
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'Nobet_Cizelgesi' });

  // ── Veri Yükle ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stRes, staffRes, assignRes, configRes] = await Promise.all([
        api.get('/duty-schedule/stations'),
        api.get('/staff'),
        api.get(`/duty-schedule/assignments?academicYear=${academicYear}`),
        api.get(`/duty-schedule/staff-config?academicYear=${academicYear}`),
      ]);
      setStations(stRes.data.data || []);
      
      const allStaff = staffRes.data.data?.staff || staffRes.data.data || [];
      const teachersAndAdmins = allStaff.filter((s: any) => {
        const g = (s.gorev || '').toLowerCase();
        if (g === 'müdür' || g === 'müdür başyardımcısı') return false;
        return g.includes('öğretmen') || g.includes('müdür yardımcısı');
      });
      setStaffList(teachersAndAdmins);
      
      setAssignments(assignRes.data.data || []);
      setStaffConfigs(configRes.data.data || []);
    } catch {
      toast.error('Nöbet verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [academicYear, selectedYear, selectedMonth]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get(`/duty-schedule/stats?year=${selectedYear}&month=${selectedMonth}&academicYear=${academicYear}`);
      setStats(res.data.data || []);
    } catch {}
  }, [academicYear, selectedYear, selectedMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (activeTab === 'istatistik') fetchStats(); }, [activeTab, fetchStats]);

  // ── Ay Gezinme ──
  const navigateMonth = (dir: 1 | -1) => {
    const idx = MONTHS.findIndex(m => m.val === selectedMonth);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= MONTHS.length) return;
    const newMonth = MONTHS[newIdx].val;
    const newYear = newMonth === 1 && selectedMonth === 12 ? selectedYear + 1
                  : newMonth === 12 && selectedMonth === 1 ? selectedYear - 1
                  : newMonth < 9 ? selectedYear + 1 : selectedYear;
    setSelectedMonth(newMonth);
    setSelectedYear(newYear < 8 ? selectedYear : newYear);
  };

  // ── Atama değiştir ──
  const handleAssignmentChange = (stationId: string, dayOfWeek: number, weekNum: number, slotIdx: number, staffId: string) => {
    setAssignments(prev => {
      // Find all assignments for this cell
      const cellAsgns = prev.filter(a => a.stationId === stationId && a.dayOfWeek === dayOfWeek && a.weekNumber === weekNum);
      const otherAsgns = prev.filter(a => !(a.stationId === stationId && a.dayOfWeek === dayOfWeek && a.weekNumber === weekNum));
      
      // Update the specific slot
      if (staffId) {
        cellAsgns[slotIdx] = { stationId, dayOfWeek, weekNumber: weekNum, staffId, year: selectedYear, month: selectedMonth, academicYear };
      } else {
        cellAsgns.splice(slotIdx, 1); // Remove if empty
      }
      
      // Filter out empty items just in case (if there was no assignment there yet but we tried to clear it)
      return [...otherAsgns, ...cellAsgns.filter(Boolean)];
    });
  };

  const getAssignment = (stationId: string, dayOfWeek: number, weekNum: number) =>
    assignments.find(a => a.stationId === stationId && a.dayOfWeek === dayOfWeek && a.weekNumber === weekNum);

  // ── Kaydet ──
  const handleSaveAssignments = async () => {
    try {
      await api.post('/duty-schedule/assignments', {
        academicYear,
        year: selectedYear,
        month: selectedMonth,
        assignments: assignments.filter(a => a.year === selectedYear && a.month === selectedMonth).map(a => ({
          staffId: a.staffId,
          stationId: a.stationId,
          dayOfWeek: a.dayOfWeek,
          weekNumber: a.weekNumber ?? 0,
        }))
      });
      toast.success('Nöbet çizelgesi kaydedildi!');
      fetchAll();
    } catch {
      toast.error('Çizelge kaydedilemedi.');
    }
  };

  // ── Çizelgeyi Temizle ──
  const handleClearSchedule = async () => {
    const ok = await confirm(`${MONTHS.find(m => m.val === selectedMonth)?.label} ${selectedYear} ayına ait tüm nöbet atamalarını silmek istediğinize emin misiniz?`);
    if (!ok) return;
    try {
      await api.post('/duty-schedule/assignments', {
        academicYear,
        year: selectedYear,
        month: selectedMonth,
        assignments: []
      });
      toast.success('Çizelge başarıyla temizlendi.');
      fetchAll();
    } catch {
      toast.error('Çizelge temizlenemedi.');
    }
  };

  // ── Rotasyon Yap ──
  const getPrevWeekAssignments = () => {
    if (currAbsWeekNum === undefined) return [];
    const prevAbsWeekNum = currAbsWeekNum - 1;
    return assignments.filter(a => {
       const startIdx = monthStartWeekIndices[`${a.year}-${a.month}`];
       if (startIdx !== undefined) {
         return (startIdx + a.weekNumber) === prevAbsWeekNum;
       }
       return false;
    });
  };

  const handleRotate = async () => {
    if (currAbsWeekNum === undefined || currAbsWeekNum === 0) {
      toast.error('En başa dönülemez. Önceki hafta verisi yok.');
      return;
    }
    const freq = settings?.dutyRotationFreq || 'weekly';
    if (freq === 'none') {
      toast.error('Rotasyon "Sabit" olarak seçilmiş.');
      return;
    }
    
    const ok = await confirm(`${selectedWeek + 1}. Hafta için rotasyon yapılacak. Bir önceki haftanın atamaları 1 sıra kaydırılarak bu haftaya kopyalanacak. Onaylıyor musunuz?`);
    if (!ok) return;

    const prevAssignments = getPrevWeekAssignments();
    if (prevAssignments.length === 0) {
      toast.error('Önceki haftaya ait atama bulunamadı!');
      return;
    }
    
    const currWeekNumLocal = weekList[selectedWeek][0].weekNum;
    
    const filtered = assignments.filter(a => !(a.year === selectedYear && a.month === selectedMonth && a.weekNumber === currWeekNumLocal));
    
    prevAssignments.forEach(a => {
      const currentStationIdx = stations.findIndex(s => s.id === a.stationId);
      if (currentStationIdx === -1) return;
      const nextStationIdx = (currentStationIdx + 1) % stations.length;
      filtered.push({ ...a, stationId: stations[nextStationIdx].id, weekNumber: currWeekNumLocal, year: selectedYear, month: selectedMonth, academicYear });
    });
    
    setAssignments(filtered);
    toast.success('Rotasyon uygulandı. Lütfen "Kaydet" butonuna basın.');
  };

  const performCopyPrev = () => {
    const prevAssignments = getPrevWeekAssignments();
    const currWeekNumLocal = weekList[selectedWeek][0].weekNum;
    
    const filtered = assignments.filter(a => !(a.year === selectedYear && a.month === selectedMonth && a.weekNumber === currWeekNumLocal));
    
    prevAssignments.forEach(a => {
      filtered.push({ ...a, weekNumber: currWeekNumLocal, year: selectedYear, month: selectedMonth, academicYear });
    });
    
    setAssignments(filtered);
    toast.success('Kopyalandı. Lütfen "Kaydet" butonuna basın.');
  };

  // ── Önceki Haftadan Kopyala ──
  const handleCopyPrev = async () => {
    if (currAbsWeekNum === undefined || currAbsWeekNum === 0) return toast.error('Önceki hafta verisi yok.');
    if (!await confirm(`Önceki haftanın atamaları birebir kopyalanacak. Onaylıyor musunuz?`)) return;
    performCopyPrev();
  };

  // ── Otomatik Dağıt ──
  const handleAutoDistribute = async () => {
    const ok = await confirm(`${MONTHS.find(m => m.val === selectedMonth)?.label} ${selectedYear} ayı, ${selectedWeek + 1}. Hafta için kura ile nöbet dağıtımı yapılacak. Seçili haftadaki mevcut atamaların üzerine yazılacak. Devam?`);
    if (!ok) return;
    try {
      const targetWeekNum = weekList[selectedWeek]?.[0]?.weekNum;
      if (targetWeekNum === undefined) return toast.error('Hafta bulunamadı.');

      const res = await api.post('/duty-schedule/auto-distribute', {
        academicYear, year: selectedYear, month: selectedMonth, overwriteExisting: true, targetWeekNum
      });
      toast.success(`Otomatik dağıtım tamamlandı — ${res.data.data?.distributed ?? 0} atama yapıldı.`);
      fetchAll();
    } catch {
      toast.error('Otomatik dağıtım başarısız.');
    }
  };

  // ── Station CRUD ──
  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (stationForm.id) {
        await api.put(`/duty-schedule/stations/${stationForm.id}`, stationForm);
        toast.success('Nöbet yeri güncellendi');
      } else {
        await api.post('/duty-schedule/stations', stationForm);
        toast.success('Nöbet yeri eklendi');
      }
      setStationForm({ name: '', sortOrder: stations.length + 1, shift: 'tum', capacity: 1 });
      setShowStationModal(false);
      fetchAll();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Kaydedilemedi.'); }
  };

  const handleDeleteStation = async (id: string) => {
    if (!await confirm('Bu nöbet yerini silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/duty-schedule/stations/${id}`);
      toast.success('Silindi');
      fetchAll();
    } catch { toast.error('Silinemedi.'); }
  };

  // ── Personel Konfigürasyonu ──
  const getConfig = (staffId: string) =>
    staffConfigs.find(c => c.staffId === staffId) || {
      staffId, availableDays: '1,2,3,4,5', maxPerMonth: 0, maxPerWeek: 0, isAdmin: false
    };

  const updateConfig = (staffId: string, field: string, value: any) => {
    setStaffConfigs(prev => {
      const existing = prev.find(c => c.staffId === staffId);
      if (existing) {
        return prev.map(c => c.staffId === staffId ? { ...c, [field]: value } : c);
      }
      return [...prev, { staffId, availableDays: '1,2,3,4,5', maxPerMonth: 0, maxPerWeek: 0, isAdmin: false, [field]: value }];
    });
  };

  const handleSaveStaffConfigs = async () => {
    try {
      await api.post('/duty-schedule/staff-config', {
        academicYear,
        configs: staffList.map(s => {
          const c = getConfig(s.id);
          return {
            staffId: s.id,
            availableDays: c.availableDays || '1,2,3,4,5',
            maxPerMonth: Number(c.maxPerMonth) || 0,
            maxPerWeek: Number(c.maxPerWeek) || 0,
            isAdmin: !!c.isAdmin,
            isFixedDay: !!c.isFixedDay,
            fixedDayOfWeek: c.fixedDayOfWeek || null,
            isFixedStation: !!c.isFixedStation,
            fixedStationId: c.fixedStationId || null,
          };
        })
      });
      toast.success('Personel ayarları kaydedildi!');
      fetchAll();
    } catch { toast.error('Kaydedilemedi.'); }
  };

  // ── Yardımcılar ──
  const workDays = getWorkDays(selectedYear, selectedMonth);
  const monthName = MONTHS.find(m => m.val === selectedMonth)?.label || '';

  // Haftalara böl
  const weeks: typeof workDays[] = [];
  workDays.forEach(d => {
    if (!weeks[d.weekNum]) weeks[d.weekNum] = [];
    weeks[d.weekNum].push(d);
  });
  const weekList = weeks.filter(Boolean);

  // ── Yeni Rotasyon Mantığı ──
  const dutyRotationFreq = settings?.dutyRotationFreq || 'weekly';
  const rotationWeeks = dutyRotationFreq === 'weekly' ? 1 :
                        dutyRotationFreq === 'biweekly' ? 2 :
                        dutyRotationFreq === 'monthly' ? 4 : 0; 
  
  const monthStartWeekIndices = React.useMemo(() => {
    const map: Record<string, number> = {};
    let currentAbsoluteWeek = 0;
    const months = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
    for (const m of months) {
        const parts = academicYear.split('-');
        const y = m >= 9 ? Number(parts[0]) : (parts[1] ? Number(parts[1]) : Number(parts[0]) + 1);
        map[`${y}-${m}`] = currentAbsoluteWeek;
        const w = getWorkDays(y, m);
        const maxWeekNum = w.length > 0 ? Math.max(...w.map(d => d.weekNum)) : 0;
        currentAbsoluteWeek += (maxWeekNum + 1);
    }
    return map;
  }, [academicYear]);

  const absoluteBaseWeekNum = React.useMemo(() => {
    let min = 9999;
    assignments.forEach(a => {
       const startIdx = monthStartWeekIndices[`${a.year}-${a.month}`];
       if (startIdx !== undefined) {
         const absW = startIdx + a.weekNumber;
         if (absW < min) min = absW;
       }
    });
    return min === 9999 ? undefined : min;
  }, [assignments, monthStartWeekIndices]);

  const currWeekNum = weekList[selectedWeek]?.[0]?.weekNum;
  const currAbsWeekNum = currWeekNum !== undefined ? monthStartWeekIndices[`${selectedYear}-${selectedMonth}`] + currWeekNum : undefined;

  let isNewCycle = false;
  let isCopyCycle = false;
  
  if (absoluteBaseWeekNum !== undefined && currAbsWeekNum !== undefined && rotationWeeks > 0) {
    const diff = currAbsWeekNum - absoluteBaseWeekNum;
    if (diff > 0) {
      if (diff % rotationWeeks === 0) {
        isNewCycle = true;
      } else {
        isCopyCycle = true;
      }
    }
  }

  const thisMonthAssignments = assignments.filter(a => a.year === selectedYear && a.month === selectedMonth);
  const thisWeekAssignments = currWeekNum !== undefined ? thisMonthAssignments.filter(a => a.weekNumber === currWeekNum) : [];
  const thisWeekIsEmpty = thisWeekAssignments.length === 0;

  const hasPromptedCopyRef = useRef<Record<number, boolean>>({});
  
  useEffect(() => {
     if (activeTab === 'cizelge' && thisWeekIsEmpty && isCopyCycle && absoluteBaseWeekNum !== undefined) {
         if (!hasPromptedCopyRef.current[currAbsWeekNum || 0]) {
             hasPromptedCopyRef.current[currAbsWeekNum || 0] = true;
             setTimeout(async () => {
                 const ok = await confirm(`Sistem Notu: Seçili rotasyon kuralına göre (${rotationWeeks} haftalık), bu haftanın çizelgesi önceki hafta ile BİREBİR AYNI olmalıdır. Otomatik olarak kopyalansın mı?`);
                 if (ok) performCopyPrev();
             }, 300);
         }
     }
  }, [currAbsWeekNum, thisWeekIsEmpty, isCopyCycle, absoluteBaseWeekNum, activeTab]);

  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Personel Nöbet Çizelgesi"
        description="Aylık nöbet dağıtımı, personel ayarları ve eşitlik raporu."
        icon={<CalendarRange size={24} />}
        actions={
          <Button variant="ghost" onClick={() => handlePrint()} className="text-slate-600 px-3 py-1.5 flex items-center gap-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            <Printer size={16} /> Yazdır
          </Button>
        }
      />

      {/* Ay Seçici */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigateMonth(-1)}
            disabled={MONTHS.findIndex(m => m.val === selectedMonth) === 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => navigateMonth(1)}
            disabled={MONTHS.findIndex(m => m.val === selectedMonth) === MONTHS.length - 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <ChevronRight size={18} />
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {weekList.map((_, i) => <option key={i} value={i}>{i + 1}. Hafta</option>)}
          </select>
        </div>

      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'cizelge',    label: 'Çizelge',          icon: <CalendarRange size={15}/> },
          { key: 'istatistik', label: 'İstatistik',        icon: <BarChart2 size={15}/> },
          { key: 'personel',   label: 'Personel Ayarları', icon: <Users size={15}/> },
          { key: 'yerler',     label: 'Nöbet Yerleri',     icon: <MapPin size={15}/> },
          { key: 'ayarlar',    label: 'Ayarlar',           icon: <Settings size={15}/> },
        ] as { key: typeof activeTab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              activeTab === tab.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400 animate-pulse">Yükleniyor...</div>
      ) : (
        <>
          {/* ── ÇİZELGE ── */}
          {activeTab === 'cizelge' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {stations.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  <MapPin className="mx-auto mb-2 text-slate-300" size={32} />
                  <p className="font-medium">Henüz nöbet yeri tanımlanmamış.</p>
                  <p className="text-sm mt-1">"Nöbet Yerleri" sekmesinden ekleyin.</p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-4">
                  {weekList[selectedWeek] && (
                    <div className="border-b border-slate-100 last:border-b-0">
                      <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-4">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                          {(() => {
                            const firstDay = weekList[selectedWeek][0];
                            const lastDay = weekList[selectedWeek][weekList[selectedWeek].length - 1];
                            const mNameFirst = firstDay.monthName || monthName;
                            const mNameLast = lastDay.monthName || monthName;
                            if (mNameFirst !== mNameLast) {
                              return `${selectedWeek + 1}. Hafta — ${firstDay.dayNum} ${mNameFirst} - ${lastDay.dayNum} ${mNameLast}`;
                            }
                            return `${selectedWeek + 1}. Hafta — ${firstDay.dayNum}-${lastDay.dayNum} ${mNameFirst}`;
                          })()}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(currAbsWeekNum !== undefined && currAbsWeekNum > 0) && isCopyCycle && (
                            <button
                              onClick={handleCopyPrev}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition border border-slate-200"
                            >
                              Önceki Haftayı Kopyala
                            </button>
                          )}
                          {(currAbsWeekNum !== undefined && currAbsWeekNum > 0) && isNewCycle && (
                            <button
                              onClick={handleRotate}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg text-sm font-semibold transition border border-sky-200"
                            >
                              <Zap size={16} /> Rotasyon Yap
                            </button>
                          )}
                          <button
                            onClick={handleClearSchedule}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition border border-red-200"
                          >
                            <Trash2 size={16} /> Temizle
                          </button>
                          {absoluteBaseWeekNum === undefined && (
                            <button
                              onClick={handleAutoDistribute}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition"
                            >
                              <Zap size={16} /> Otomatik Dağıt
                            </button>
                          )}
                          <button
                            onClick={handleSaveAssignments}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition"
                          >
                            <Save size={16} /> Değişiklikleri Kaydet
                          </button>
                        </div>
                      </div>
                      <table className="min-w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">
                              Nöbet Yeri
                            </th>
                            {DAYS.map(day => {
                              const d = weekList[selectedWeek]?.find(w => w.dayOfWeek === day.val);
                              return (
                                <th key={`header-${day.val}`} className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                  <div>{day.label}</div>
                                  <div className="text-indigo-500 font-bold">{d ? d.dayNum : '-'}</div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stations.flatMap((station: any) => 
                            Array.from({ length: station.capacity || 1 }).map((_, slotIdx) => (
                              <tr key={`${station.id}-${slotIdx}`} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 border-r border-slate-100">
                                  <div className="font-semibold text-sm text-slate-800">
                                    {station.name} {(station.capacity || 1) > 1 && <span className="text-slate-400 text-xs ml-1">({slotIdx + 1})</span>}
                                  </div>
                                  <div className="text-xs text-slate-400">{SHIFT_OPTIONS.find(s => s.val === station.shift)?.label?.split(' ')[0] || 'Tüm Gün'}</div>
                                </td>
                                {DAYS.map(day => {
                                  const d = weekList[selectedWeek]?.find(w => w.dayOfWeek === day.val);
                                  
                                  if (!d) {
                                    return (
                                      <td key={`empty-${day.val}-${slotIdx}`} className="px-2 py-2 border-r border-slate-100 last:border-r-0 bg-slate-50/50">
                                        <div className="text-center text-xs text-slate-300">—</div>
                                      </td>
                                    );
                                  }

                                  // Get all assignments for this station today
                                  const asgns = assignments.filter(a => a.stationId === station.id && a.dayOfWeek === d.dayOfWeek && a.weekNumber === d.weekNum);
                                  const asgn = asgns[slotIdx]; // Pick the assignment for this specific slot
                                  
                                  return (
                                    <td key={`${d.dayOfWeek}-${d.weekNum}-${slotIdx}`} className="px-2 py-2 border-r border-slate-100 last:border-r-0">
                                    <select
                                      value={asgn?.staffId || ''}
                                      onChange={e => handleAssignmentChange(station.id, d.dayOfWeek, d.weekNum, slotIdx, e.target.value)}
                                      className={`w-full text-xs rounded-lg border px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition ${
                                        asgn?.staffId
                                          ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-semibold'
                                          : 'bg-white border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      <option value="">— Boş —</option>
                                      {staffList.filter(s => {
                                        const isTeacher = s.unvan?.toLowerCase().includes('öğretmen');
                                        const isAdminStation = station.name.toLowerCase().includes('idare') || station.name.toLowerCase().includes('müdür');
                                        return isAdminStation ? !isTeacher : isTeacher;
                                      }).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                    </select>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── İSTATİSTİK ── */}
          {activeTab === 'istatistik' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">{monthName} {selectedYear} — Nöbet Eşitlik Raporu</h3>
                <button onClick={fetchStats} className="text-xs text-indigo-600 hover:underline">Yenile</button>
              </div>
              {stats.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Bu ay henüz nöbet ataması yok.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase text-xs tracking-wide">Personel</th>
                        <th className="px-5 py-3 text-left font-semibold text-slate-500 uppercase text-xs tracking-wide">Unvan</th>
                        <th className="px-5 py-3 text-center font-semibold text-slate-500 uppercase text-xs tracking-wide">Nöbet Sayısı</th>
                        <th className="px-5 py-3 text-center font-semibold text-slate-500 uppercase text-xs tracking-wide">Dağılım</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.map((s, i) => {
                        const maxCount = stats[0]?.count || 1;
                        const pct = Math.round((s.count / maxCount) * 100);
                        return (
                          <tr key={s.staffId} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                            <td className="px-5 py-3 font-semibold text-slate-800">{s.staffName}</td>
                            <td className="px-5 py-3 text-slate-500">{s.title || '—'}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                s.count >= 5 ? 'bg-red-100 text-red-700' :
                                s.count >= 3 ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                              }`}>{s.count}</span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full bg-indigo-500 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── PERSONEL AYARLARI ── */}
          {activeTab === 'personel' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800">
                Öğretmenler haftada 1 gün nöbet tutmaktadır. İlgili öğretmene sabit bir nöbet günü ve nöbet yeri atayabilirsiniz.
              </div>
              {(() => {
                const renderTable = (title: string, list: any[]) => (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6 last:mb-0">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                      <button
                        onClick={handleSaveStaffConfigs}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition"
                      >
                        <Save size={15} /> Kaydet
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-500 uppercase text-xs tracking-wide">Personel</th>
                            <th className="px-3 py-3 text-center font-semibold text-slate-500 uppercase text-xs tracking-wide">Sabit Nöbet Günü</th>
                            <th className="px-3 py-3 text-center font-semibold text-slate-500 uppercase text-xs tracking-wide">Sabit Nöbet Yeri</th>
                            <th className="px-3 py-3 text-center font-semibold text-slate-500 uppercase text-xs tracking-wide">Muaf</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {list.map((s, i) => {
                            const cfg = getConfig(s.id);
                            return (
                              <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                <td className="px-4 py-2.5 font-semibold text-slate-800">{s.name}</td>
                                <td className="px-3 py-2.5 text-center">
                                  <select
                                    value={cfg.isFixedDay ? (cfg.fixedDayOfWeek || '') : ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (val) {
                                        updateConfig(s.id, 'isFixedDay', true);
                                        updateConfig(s.id, 'fixedDayOfWeek', Number(val));
                                      } else {
                                        updateConfig(s.id, 'isFixedDay', false);
                                        updateConfig(s.id, 'fixedDayOfWeek', null);
                                      }
                                    }}
                                    className="w-32 text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  >
                                    <option value="">— Yok —</option>
                                    {DAYS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <select
                                    value={cfg.isFixedStation ? (cfg.fixedStationId || '') : ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (val) {
                                        updateConfig(s.id, 'isFixedStation', true);
                                        updateConfig(s.id, 'fixedStationId', val);
                                      } else {
                                        updateConfig(s.id, 'isFixedStation', false);
                                        updateConfig(s.id, 'fixedStationId', null);
                                      }
                                    }}
                                    className="w-32 text-xs border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  >
                                    <option value="">— Yok —</option>
                                    {stations.map((st: any) => <option key={st.id} value={st.id}>{st.name}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <label className="inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={cfg.isExempt || false}
                                      onChange={e => updateConfig(s.id, 'isExempt', e.target.checked)}
                                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                  </label>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );

                const teachers = staffList.filter(s => s.gorev?.toLowerCase().includes('öğretmen'));
                const admins = staffList.filter(s => !s.gorev?.toLowerCase().includes('öğretmen'));

                return (
                  <>
                    {renderTable('Öğretmen Nöbet Ayarları', teachers)}
                    {admins.length > 0 && renderTable('İdareci Nöbet Ayarları', admins)}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── NÖBET YERLERİ ── */}
          {activeTab === 'yerler' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Form */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 h-fit">
                <h3 className="font-bold text-sm text-slate-800 border-b pb-3 flex items-center gap-2">
                  <MapPin size={16} className="text-indigo-600" />
                  {stationForm.id ? 'Nöbet Yerini Düzenle' : 'Yeni Nöbet Yeri Ekle'}
                </h3>
                <form onSubmit={handleSaveStation} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nöbet Yeri Adı *</label>
                    <input
                      required
                      type="text"
                      value={stationForm.name || ''}
                      onChange={e => setStationForm({ ...stationForm, name: e.target.value })}
                      placeholder="Örn: Bahçe, 1. Kat, Anasınıfı"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Devre / Kapsam</label>
                    <select
                      value={stationForm.shift || 'tum'}
                      onChange={e => setStationForm({ ...stationForm, shift: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {SHIFT_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Kapasite (Görevli Sayısı)</label>
                    <input
                      type="number" min={1} max={10}
                      value={stationForm.capacity || 1}
                      onChange={e => setStationForm({ ...stationForm, capacity: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sıralama No</label>
                    <input
                      type="number" min={1}
                      value={stationForm.sortOrder || 1}
                      onChange={e => setStationForm({ ...stationForm, sortOrder: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-bold transition">
                      {stationForm.id ? 'Güncelle' : 'Ekle'}
                    </button>
                    {stationForm.id && (
                      <button type="button" onClick={() => setStationForm({ name: '', sortOrder: stations.length + 1, shift: 'tum', capacity: 1 })} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg text-sm font-semibold transition">
                        İptal
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Liste */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800">Tanımlı Nöbet Yerleri</h3>
                  <span className="text-xs text-slate-500">{stations.length} yer</span>
                </div>
                {stations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">Henüz nöbet yeri eklenmemiş.</div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nöbet Yeri</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Kapasite</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Devre</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stations.map(st => (
                        <tr key={st.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{st.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                              {st.capacity || 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                              {SHIFT_OPTIONS.find(s => s.val === st.shift)?.label?.split(' ')[0] || 'Tüm Gün'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" onClick={() => setStationForm(st)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors">
                                <Edit size={16} />
                              </Button>
                              <Button variant="ghost" onClick={() => handleDeleteStation(st.id)} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors">
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── AYARLAR ── */}
          {activeTab === 'ayarlar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-800 border-b pb-3 flex items-center gap-2">
                  <Settings size={16} className="text-indigo-600" /> Dağıtım ve Rotasyon Ayarları
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nöbet Yeri Rotasyon Sıklığı</label>
                    <select
                      value={settings?.dutyRotationFreq || 'weekly'}
                      onChange={async (e) => {
                        try {
                          await api.put('/settings', { dutyRotationFreq: e.target.value });
                          toast.success('Rotasyon ayarı başarıyla güncellendi.');
                          refreshSettings();
                        } catch (err) {
                          toast.error('Ayarlar kaydedilemedi.');
                          console.error('Ayarlar kaydedilemedi:', err);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="none">Rotasyon Yok (Sabit)</option>
                      <option value="weekly">Haftalık Rotasyon</option>
                      <option value="biweekly">2 Haftalık Rotasyon</option>
                      <option value="monthly">Aylık Rotasyon</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Öğretmenler seçilen sıklıkta bir sonraki nöbet yerine kaydırılır.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-800 border-b pb-3 flex items-center gap-2">
                  <Settings size={16} className="text-indigo-600" /> Yazdırma ve Resmi Belge Ayarları
                </h3>
                <p className="text-sm text-slate-500">
                  Bu ayarlar <strong>Genel Ayarlar</strong> üzerinden yapılmaktadır.
                  Okul adı, müdür adı ve ilçe bilgisi gibi alanları Ayarlar sayfasından güncelleyebilirsiniz.
                </p>
                <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Okul Adı:</span>
                    <span className="font-semibold text-slate-800">{settings?.schoolName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Okul Müdürü:</span>
                    <span className="font-semibold text-slate-800">{settings?.principalName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Eğitim Yılı:</span>
                    <span className="font-semibold text-slate-800">{academicYear}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      <div className="hidden">
        <DutySchedulePrintTemplate
          ref={printRef}
          stations={stations}
          staffList={staffList}
          assignments={assignments}
          monthName={monthName}
          year={selectedYear}
          workDays={workDays}
        />
      </div>

      {confirmModal}
    </div>
  );
}
