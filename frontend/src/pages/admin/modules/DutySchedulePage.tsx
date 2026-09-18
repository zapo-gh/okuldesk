import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../../services/api';
import { useConfirm } from '../../../hooks/useConfirm';
import { useSettings } from '../../../context/SettingsContext';
import {
  CalendarRange, Save, Trash2, MapPin, Users, BarChart2,
  Settings, Printer, Zap, Plus, Edit, ChevronLeft, ChevronRight, X, Shield, UploadCloud
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
    const weekDays = [];
    
    // Perşembe gününü bul (Pzt + 3 gün = Perşembe)
    const thursday = new Date(current);
    thursday.setDate(current.getDate() + 3);
    
    // Eğer Perşembe günü bu aya aitse, haftayı bu aya dahil et
    if (thursday.getMonth() === month - 1) {
      for (let i = 0; i < 5; i++) {
        const d = new Date(current);
        d.setDate(current.getDate() + i);
        
        const mName = new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(d);
        weekDays.push({
          date: d,
          dayOfWeek: d.getDay(),
          dayNum: d.getDate(),
          weekNum: weekNum,
          monthName: capitalize(mName)
        });
      }
      
      days.push(...weekDays);
      weekNum++;
    }
    
    current.setDate(current.getDate() + 7);
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
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const m = new Date().getMonth() + 1;
    return MONTHS.find(x => x.val === m) ? m : 9;
  });
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (!MONTHS.find(m => m.val === currentMonth)) return 0;
    
    const days = getWorkDays(currentYear, currentMonth);
    const activeDay = days.find(d => d.date >= now);
    return activeDay ? activeDay.weekNum : (days.length > 0 ? days[days.length - 1].weekNum : 0);
  });

  const [activeTab, setActiveTab] = useState<'cizelge' | 'istatistik' | 'personel' | 'idareci' | 'yerler' | 'ayarlar'>('cizelge');

  // Data state
  const [stations,    setStations]    = useState<any[]>([]);
  const [staffList,   setStaffList]   = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [staffConfigs, setStaffConfigs] = useState<any[]>([]);
  const [stats,       setStats]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // Station form
  const [showStationModal, setShowStationModal] = useState(false);
  const [stationForm, setStationForm] = useState<any>({ name: '', sortOrder: 1, shift: 'tum', capacity: 1 });

  const [newRotationDate, setNewRotationDate] = useState('');
  // Özel rotasyon tarihleri — local state (context yavaş olduğunda anında güncellemek için)
  const [rotationDates, setRotationDates] = useState<string[]>([]);

  // Print
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: 'Nobet_Cizelgesi_Aylik' });
  const printRefAll = useRef<HTMLDivElement>(null);
  const handlePrintAll = useReactToPrint({ contentRef: printRefAll, documentTitle: 'Nobet_Cizelgesi_TumAylar' });

  // Upload Excel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!await confirm(`"${file.name}" dosyası yüklenecek. Mevcut nöbet yerleri ve nöbet atamaları silinip, bu dosyaya göre sıfırdan oluşturulacak. Onaylıyor musunuz?`)) {
       if (fileInputRef.current) fileInputRef.current.value = '';
       return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('academicYear', academicYear);
    
    try {
      setLoading(true);
      const res = await api.post('/duty-schedule/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.data.message || 'Çizelge başarıyla aktarıldı!');
      if (res.data.data.warnings && res.data.data.warnings.length > 0) {
        toast.error('Bazı satırlar veya personeller tam eşleştirilemedi. Lütfen çizelgeyi gözden geçirin.', { duration: 5000 });
        console.warn('Nöbet Çizelgesi Aktarım Uyarıları:', res.data.data.warnings);
      }
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Yükleme başarısız.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      
      // Normalize: backend may return assignments with year=0 or month=0 for old records.
      // Keep them in state but they won't match any valid (year, month) filter — so they're harmless.
      setAssignments(assignRes.data.data || []);
      setStaffConfigs(configRes.data.data || []);
    } catch {
      toast.error('Nöbet verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get(`/duty-schedule/stats?year=${selectedYear}&month=${selectedMonth}&academicYear=${academicYear}`);
      setStats(res.data.data || []);
    } catch {}
  }, [academicYear, selectedYear, selectedMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (activeTab === 'istatistik') fetchStats(); }, [activeTab, fetchStats]);

  // Özel rotasyon tarihlerini settings context'ten yerel state'e senkronize et
  useEffect(() => {
    try {
      const parsed: string[] = JSON.parse(settings?.dutyRotationDates || '[]');
      setRotationDates(parsed);
    } catch {
      setRotationDates([]);
    }
  }, [settings?.dutyRotationDates]);

  // ── Ay Gezinme ──
  const navigateMonth = (dir: 1 | -1, autoSelectWeek?: 'first' | 'last') => {
    const idx = MONTHS.findIndex(m => m.val === selectedMonth);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= MONTHS.length) return;
    const newMonth = MONTHS[newIdx].val;
    const newYear = newMonth === 1 && selectedMonth === 12 ? selectedYear + 1
                  : newMonth === 12 && selectedMonth === 1 ? selectedYear - 1
                  : selectedYear;
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);

    if (autoSelectWeek === 'first') {
      setSelectedWeek(0);
    } else if (autoSelectWeek === 'last') {
      const days = getWorkDays(newYear, newMonth);
      let maxW = 0;
      days.forEach(d => { if (d.weekNum > maxW) maxW = d.weekNum; });
      setSelectedWeek(maxW);
    }
  };

  const handlePrevWeek = () => {
    if (selectedWeek > 0) {
      setSelectedWeek(selectedWeek - 1);
    } else {
      navigateMonth(-1, 'last');
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek < weekList.length - 1) {
      setSelectedWeek(selectedWeek + 1);
    } else {
      navigateMonth(1, 'first');
    }
  };

  // ── Atama değiştir ──
  const handleAssignmentChange = (stationId: string, dayOfWeek: number, weekNum: number, slotIdx: number, staffId: string) => {
    setAssignments(prev => {
      // Find all assignments for this cell — must include year+month to avoid cross-month contamination
      const cellAsgns = prev.filter(a =>
        a.stationId === stationId &&
        a.dayOfWeek === dayOfWeek &&
        a.weekNumber === weekNum &&
        a.year === selectedYear &&
        a.month === selectedMonth
      );
      const otherAsgns = prev.filter(a => !(
        a.stationId === stationId &&
        a.dayOfWeek === dayOfWeek &&
        a.weekNumber === weekNum &&
        a.year === selectedYear &&
        a.month === selectedMonth
      ));
      
      // Update the specific slot
      if (staffId) {
        cellAsgns[slotIdx] = { stationId, dayOfWeek, weekNumber: weekNum, staffId, year: selectedYear, month: selectedMonth, academicYear };
      } else {
        cellAsgns.splice(slotIdx, 1); // Remove if empty
      }
      
      // Filter out empty items just in case (if there was no assignment there yet but we tried to clear it)
      return [...otherAsgns, ...cellAsgns.filter(Boolean)];
    });
    setIsDirty(true);
  };


  // ── Kaydet ──
  const handleSaveAssignments = async () => {
    try {
      // Normalize: ensure every assignment has year/month (backend responses may not include them)
      const monthAssignments = assignments.map(a => ({
        staffId: a.staffId,
        stationId: a.stationId,
        dayOfWeek: a.dayOfWeek,
        weekNumber: a.weekNumber ?? 0,
        year: a.year,
        month: a.month
      }));

      await api.post('/duty-schedule/assignments', {
        academicYear,
        year: selectedYear,
        month: selectedMonth,
        assignments: monthAssignments
      });
      toast.success('Nöbet çizelgesi kaydedildi!');
      setIsDirty(false);
      fetchAll();
    } catch {
      toast.error('Çizelge kaydedilemedi.');
    }
  };

  // ── Tüm Ayı Temizle ──
  const handleClearSchedule = async () => {
    const ok = await confirm(`${MONTHS.find(m => m.val === selectedMonth)?.label} ${selectedYear} ayına ait tüm nöbet atamalarını silmek istediğinize emin misiniz?`);
    if (!ok) return;

    // Anında ekrandan sil (Optimistic Update)
    setAssignments(prev => prev.filter(a => !(a.year === selectedYear && a.month === selectedMonth)));

    try {
      await api.post('/duty-schedule/assignments', {
        academicYear,
        year: selectedYear,
        month: selectedMonth,
        assignments: []
      });
      toast.success('Çizelge başarıyla temizlendi.');
      setIsDirty(false);
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error('Çizelge temizlenemedi.');
      fetchAll();
    }
  };

  // ── Sadece Seçili Haftayı Temizle ──
  const handleClearWeek = async () => {
    if (!weekList[selectedWeek]) return;
    const currWeekNumLocal = weekList[selectedWeek][0].weekNum;
    const ok = await confirm(`${selectedWeek + 1}. Haftaya ait nöbet atamaları silinecek. Onaylıyor musunuz?`);
    if (!ok) return;

    // Optimistic: sadece bu haftayı sil
    setAssignments(prev => prev.filter(a => !(
      a.year === selectedYear && a.month === selectedMonth && a.weekNumber === currWeekNumLocal
    )));

    try {
      // Diğer haftaların verilerini koru, sadece bu haftayı boş göndererek backend'i sıfırla
      const otherWeeks = assignments
        .filter(a => a.year === selectedYear && a.month === selectedMonth && a.weekNumber !== currWeekNumLocal)
        .map(a => ({ staffId: a.staffId, stationId: a.stationId, dayOfWeek: a.dayOfWeek, weekNumber: a.weekNumber ?? 0 }));

      await api.post('/duty-schedule/assignments', {
        academicYear, year: selectedYear, month: selectedMonth,
        assignments: otherWeeks
      });
      toast.success(`${selectedWeek + 1}. Hafta temizlendi.`);
      setIsDirty(false);
      fetchAll();
    } catch {
      toast.error('Hafta temizlenemedi.');
      fetchAll();
    }
  };

  // Follower haftalara kopyalama (UI tabanlı manuel işlemler için)
  const replicateToFollowerWeeks = (currentAssignments: any[], baseWeekNum: number, baseNewAssignments: any[]) => {
    let result = [...currentAssignments];
    const numWeeks = rotationWeeks || 1;
    if (numWeeks <= 1) return result;
    
    const academicMonths = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
    const parts = academicYear.split('-');
    const allAcademicWeeks: { year: number; month: number; weekNum: number; days: any[] }[] = [];
    
    for (const m of academicMonths) {
      const y = m >= 9 ? Number(parts[0]) : (parts[1] ? Number(parts[1]) : Number(parts[0]) + 1);
      const mDays = getWorkDays(y, m);
      const weekNums = [...new Set(mDays.map(d => d.weekNum))].sort((a, b) => a - b);
      for (const wn of weekNums) {
        allAcademicWeeks.push({ year: y, month: m, weekNum: wn, days: mDays.filter(d => d.weekNum === wn) });
      }
    }
    
    const baseIdx = allAcademicWeeks.findIndex(w => w.year === selectedYear && w.month === selectedMonth && w.weekNum === baseWeekNum);
    
    if (baseIdx !== -1) {
      for (let i = 1; i < numWeeks; i++) {
        const followerIdx = baseIdx + i;
        if (followerIdx >= allAcademicWeeks.length) break;
        const fw = allAcademicWeeks[followerIdx];
        
        // Remove existing for this follower week
        result = result.filter(a => !(a.year === fw.year && a.month === fw.month && a.weekNumber === fw.weekNum));
        
        const fWeekDayNums = fw.days.map(d => d.dayOfWeek);
        
        for (const baseA of baseNewAssignments) {
           if (fWeekDayNums.includes(baseA.dayOfWeek)) {
             result.push({
               ...baseA,
               year: fw.year,
               month: fw.month,
               weekNumber: fw.weekNum
             });
           }
        }
      }
    }
    return result;
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
    
    let filtered = assignments.filter(a => !(a.year === selectedYear && a.month === selectedMonth && a.weekNumber === currWeekNumLocal));
    
    const newBaseAssignments: any[] = [];
    prevAssignments.forEach(a => {
      const staff = staffList.find(s => s.id === a.staffId);
      const isTeacher = (staff?.gorev || '').toLowerCase().includes('öğretmen');

      // Her personel tipi için uygun nöbet yerleri
      const eligibleStations = stations.filter((st: any) => {
        const isAdminStation = st.name.toLowerCase().includes('idare') || st.name.toLowerCase().includes('müdür');
        return isTeacher ? !isAdminStation : isAdminStation;
      });

      if (eligibleStations.length === 0) return; // Bu tip için yer yok, atla

      const currentIdx = eligibleStations.findIndex((s: any) => s.id === a.stationId);
      // Uygun listede bulunamazsa (başka tipten geliyorsa) 0'dan başla
      const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % eligibleStations.length;
      newBaseAssignments.push({
        ...a,
        stationId: eligibleStations[nextIdx].id,
        weekNumber: currWeekNumLocal,
        year: selectedYear,
        month: selectedMonth,
        academicYear
      });
    });
    
    filtered.push(...newBaseAssignments);
    filtered = replicateToFollowerWeeks(filtered, currWeekNumLocal, newBaseAssignments);
    
    setAssignments(filtered);
    toast.success('Rotasyon uygulandı. Lütfen "Kaydet" butonuna basın.');
  };

  const performCopyPrev = () => {
    const prevAssignments = getPrevWeekAssignments();
    const currWeekNumLocal = weekList[selectedWeek][0].weekNum;
    
    let filtered = assignments.filter(a => !(a.year === selectedYear && a.month === selectedMonth && a.weekNumber === currWeekNumLocal));
    
    const newBaseAssignments: any[] = [];
    prevAssignments.forEach(a => {
      newBaseAssignments.push({ ...a, weekNumber: currWeekNumLocal, year: selectedYear, month: selectedMonth, academicYear });
    });
    
    filtered.push(...newBaseAssignments);
    // NOT: performCopyPrev bir "kopyalama" işlemidir — sadece bu haftayı doldurur.
    // replicateToFollowerWeeks burada çağrılmamalı: bir sonraki döngü başlangıcının üzerine yazabilir.
    
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

      console.log('[FE-DEBUG] about to send month:', selectedMonth, 'year:', selectedYear, 'week:', targetWeekNum);
      const res = await api.post('/duty-schedule/auto-distribute', {
        academicYear, year: selectedYear, month: selectedMonth, overwriteExisting: true, targetWeekNum,
        dutyStartDate: settings?.dutyStartDate || undefined
      });
      toast.success(`Otomatik dağıtım tamamlandı — ${res.data.data?.distributed ?? 0} atama yapıldı.`);
      setIsDirty(false);
      fetchAll();
    } catch {
      toast.error('Otomatik dağıtım başarısız.');
    }
  };

  const handleAddRotationDate = async () => {
    if (!newRotationDate) return toast.error('Lütfen bir tarih seçin.');
    if (rotationDates.includes(newRotationDate)) return toast.error('Bu tarih zaten ekli.');
    try {
      const updatedDates = [...rotationDates, newRotationDate].sort();
      // Optimistic: anında güncelle
      setRotationDates(updatedDates);
      setNewRotationDate('');
      await api.put('/settings', { dutyRotationDates: JSON.stringify(updatedDates) });
      toast.success('Geçiş tarihi eklendi.');
      refreshSettings(); // arka planda context senkronizasyonu
    } catch (err) {
      // Hata durumunda geri al
      setRotationDates(rotationDates);
      toast.error('Tarih eklenemedi.');
    }
  };

  const handleDeleteRotationDate = async (dateStr: string) => {
    const updatedDates = rotationDates.filter(d => d !== dateStr);
    try {
      // Optimistic: anında güncelle
      setRotationDates(updatedDates);
      await api.put('/settings', { dutyRotationDates: JSON.stringify(updatedDates) });
      toast.success('Geçiş tarihi silindi.');
      refreshSettings(); // arka planda context senkronizasyonu
    } catch (err) {
      // Hata durumunda geri al
      setRotationDates(rotationDates);
      toast.error('Tarih silinemedi.');
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
            isExempt: !!c.isExempt,
            exemptionReason: c.isExempt ? (c.exemptionReason || null) : null,
            exemptionNote: c.isExempt ? (c.exemptionNote || null) : null,
            exemptionEndDate: c.isExempt ? (c.exemptionEndDate || null) : null,
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

  // Boş slot sayacı (seçili hafta için)
  const emptySlots = (() => {
    if (!weekList[selectedWeek]) return 0;
    let count = 0;
    for (const station of stations) {
      const capacity = station.capacity || 1;
      for (const day of weekList[selectedWeek]) {
        const filled = assignments.filter(a =>
          a.stationId === station.id &&
          a.dayOfWeek === day.dayOfWeek &&
          a.weekNumber === day.weekNum &&
          a.year === selectedYear &&
          a.month === selectedMonth
        ).length;
        count += Math.max(0, capacity - filled);
      }
    }
    return count;
  })();

  // ── Yeni Rotasyon Mantığı ──
  const dutyRotationFreq = settings?.dutyRotationFreq || 'weekly';
  const rotationWeeks = dutyRotationFreq === 'weekly' ? 1 :
                        dutyRotationFreq === 'biweekly' ? 2 :
                        dutyRotationFreq === 'fourweekly' ? 4 :
                        dutyRotationFreq === 'monthly' ? 4 :
                        dutyRotationFreq === 'custom' ? 1 : 0;
  
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

  // Rotasyon sıfır noktası: dutyStartDate varsa o tarihın hıftasi, yoksa Eylül 1. haftası
  const absoluteBaseWeekNum = React.useMemo(() => {
    const dutyStartDate = settings?.dutyStartDate;
    if (dutyStartDate) {
      // Başlangıç tarihinin düştüğü (yıl, ay, weekNum) ülçgeni bul
      const sd = new Date(dutyStartDate); sd.setHours(0, 0, 0, 0);
      const sdYear = sd.getFullYear();
      const sdMonth = sd.getMonth() + 1;
      const monthDays = getWorkDays(sdYear, sdMonth);
      // Başlangıç tarihinin o aydaki hafta numarasını bul
      const startDayEntry = monthDays.find(d => d.date >= sd);
      const startWeekNum = startDayEntry?.weekNum ?? 0;
      return (monthStartWeekIndices[`${sdYear}-${sdMonth}`] ?? 0) + startWeekNum;
    }
    // Varsayılan: Eylül 1. haftası (her zaman 0)
    const parts = academicYear.split('-');
    const startYear = Number(parts[0]);
    return monthStartWeekIndices[`${startYear}-9`] ?? 0;
  }, [academicYear, monthStartWeekIndices, settings?.dutyStartDate]);

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

  // Seçili haftanın nöbet başlangıç tarihinden önce olup olmadığını kontrol et
  const isBeforeStartDate = React.useMemo(() => {
    const dutyStartDate = settings?.dutyStartDate;
    if (!dutyStartDate || !weekList[selectedWeek]) return false;
    const sd = new Date(dutyStartDate); sd.setHours(0, 0, 0, 0);
    // Haftanın son gününü al — haftanın herhangi bir günü başlangıçtan önce mi?
    const lastDayOfWeek = weekList[selectedWeek][weekList[selectedWeek].length - 1];
    return lastDayOfWeek.date < sd;
  }, [settings?.dutyStartDate, weekList, selectedWeek]);



  // ──────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Personel Nöbet Çizelgesi"
        description="Aylık nöbet dağıtımı, personel ayarları ve eşitlik raporu."
        icon={<CalendarRange size={24} />}
        actions={
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 flex items-center gap-1.5 text-sm rounded-lg">
              <UploadCloud size={16} /> Excel'den Aktar
            </Button>
            <Button variant="ghost" onClick={() => handlePrint()} className="text-slate-600 px-3 py-1.5 flex items-center gap-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
              <Printer size={16} /> Bu Ayı Yazdır
            </Button>
            <Button variant="ghost" onClick={() => handlePrintAll()} className="text-slate-600 px-3 py-1.5 flex items-center gap-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
              <Printer size={16} /> Tüm Ayları Yazdır
            </Button>
          </div>
        }
      />

      {/* Ay Seçici */}
      <div className="px-5 py-3 flex flex-wrap items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
          <button
            onClick={handlePrevWeek}
            disabled={selectedWeek === 0 && MONTHS.findIndex(m => m.val === selectedMonth) === 0}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(Number(e.target.value))}
            className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {weekList.map((week, i) => {
              const dutySD = settings?.dutyStartDate ? new Date(settings.dutyStartDate) : null;
              const lastDayOfWeek = week[week.length - 1];
              const isBefore = dutySD && lastDayOfWeek.date < dutySD;
              return (
                <option key={i} value={i}>
                  {isBefore ? '🔒 ' : ''}{i + 1}. Hafta
                </option>
              );
            })}
          </select>
          <button
            onClick={handleNextWeek}
            disabled={selectedWeek === weekList.length - 1 && MONTHS.findIndex(m => m.val === selectedMonth) === MONTHS.length - 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>

      </div>

      {/* Sekmeler */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        {([
          { key: 'cizelge',    label: 'Çizelge',          icon: <CalendarRange size={15}/> },
          { key: 'istatistik', label: 'İstatistik',        icon: <BarChart2 size={15}/> },
          { key: 'personel',   label: 'Öğretmen Nöbetleri', icon: <Users size={15}/> },
          { key: 'idareci',    label: 'İdareci Nöbetleri', icon: <Shield size={15}/> },
          { key: 'yerler',     label: 'Nöbet Yerleri',     icon: <MapPin size={15}/> },
          { key: 'ayarlar',    label: 'Ayarlar',           icon: <Settings size={15}/> },
        ] as { key: typeof activeTab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                      <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
                        {/* Sol: Hafta başlığı + göstergeler */}
                        <div className="flex items-center gap-2 flex-wrap">
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
                          {stations.length > 0 && (
                            emptySlots > 0 ? (
                              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                {emptySlots} boş slot
                              </span>
                            ) : !thisWeekIsEmpty ? (
                              <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                ✓ Tümü dolu
                              </span>
                            ) : null
                          )}
                          {isDirty && (
                            <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                              ● Kaydedilmemiş değişiklik
                            </span>
                          )}
                        </div>
                        {/* Sağ: Eylem butonları — mantıksal gruplandırma */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Doldur grubu */}
                          <button
                            onClick={handleAutoDistribute}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                              thisWeekIsEmpty
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <Zap size={15} /> {thisWeekIsEmpty ? 'Otomatik Dağıt' : 'Yeniden Dağıt'}
                          </button>
                          {(currAbsWeekNum !== undefined && currAbsWeekNum > 0) && isNewCycle && (
                            <button
                              onClick={handleRotate}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg text-sm font-semibold transition border border-sky-200"
                            >
                              <Zap size={15} /> Rotasyon Yap
                            </button>
                          )}
                          {/* Ayırıcı */}
                          <div className="h-5 w-px bg-slate-300" />
                          {/* Temizle grubu */}
                          {!thisWeekIsEmpty && (
                            <button
                              onClick={handleClearWeek}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-semibold transition border border-orange-200"
                            >
                              <Trash2 size={13} /> Haftayı Temizle
                            </button>
                          )}
                          <button
                            onClick={handleClearSchedule}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition border border-red-200"
                          >
                            <Trash2 size={13} /> Tüm Ayı Temizle
                          </button>
                          {/* Kaydet - Sadece değişiklik varsa görünür */}
                          {isDirty && (
                            <>
                              <div className="h-5 w-px bg-slate-300" />
                              <button
                                onClick={handleSaveAssignments}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-sm font-semibold transition bg-indigo-600 hover:bg-indigo-700 ring-2 ring-indigo-300 ring-offset-1"
                              >
                                <Save size={15} /> Kaydet
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Nöbet başlamadan önceki hafta uyarı banner'ı */}
                      {isBeforeStartDate && (
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-sm text-slate-500">
                          <span className="text-lg">🔒</span>
                          <span>
                            Bu hafta nöbet başlangıç tarihinden önce —{' '}
                            <strong className="text-slate-700">
                              {settings?.dutyStartDate ? new Date(settings.dutyStartDate).toLocaleDateString('tr-TR') : ''}
                            </strong>{' '}
                            tarihinden itibaren nöbet başlayacak.
                          </span>
                        </div>
                      )}
                      {/* Kopyalama öneri banner'ı — useEffect confirm yerine pasif banner */}
                      {!isBeforeStartDate && isCopyCycle && thisWeekIsEmpty && currAbsWeekNum !== undefined && currAbsWeekNum > 0 && (
                        <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-100 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-sm text-sky-700">
                            <Zap size={14} className="text-sky-500 flex-shrink-0" />
                            <span>Rotasyon kuralına göre bu haftanın çizelgesi önceki haftanın <strong>aynısı</strong> olmalıdır.</span>
                          </div>
                          <button
                            onClick={handleCopyPrev}
                            className="flex-shrink-0 px-3 py-1 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-lg font-semibold transition text-xs border border-sky-200"
                          >
                            Önceki Haftadan Kopyala
                          </button>
                        </div>
                      )}
                      <table className="min-w-full">

                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left w-44 text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                              Nöbet Yeri
                            </th>
                            {DAYS.map(day => {
                              const d = weekList[selectedWeek]?.find(w => w.dayOfWeek === day.val);
                              return (
                                <th key={day.val} className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                                  <div>{day.label}</div>
                                  <div className="text-indigo-500 font-bold">{d ? d.dayNum : '-'}</div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stations.map((station: any, index: number) => (
                              <tr key={station.id} className={`hover:bg-indigo-50/30 transition-colors border-b border-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                <td className="px-4 py-2.5 border-r border-slate-100">
                                  <div className="font-semibold text-sm text-slate-800">
                                    {station.name}
                                  </div>
                                  <div className="text-xs text-slate-400">{SHIFT_OPTIONS.find(s => s.val === station.shift)?.label?.split(' ')[0] || 'Tüm Gün'}</div>
                                </td>
                                {DAYS.map(day => {
                                  const d = weekList[selectedWeek]?.find(w => w.dayOfWeek === day.val);
                                  
                                  if (!d) {
                                    return (
                                      <td key={`empty-${day.val}`} className="px-2 py-2 border-r border-slate-100 last:border-r-0 bg-slate-50/50">
                                        <div className="text-center text-xs text-slate-300">—</div>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={`${d.dayOfWeek}-${d.weekNum}`} className="px-2 py-2 border-r border-slate-100 last:border-r-0 align-top">
                                      <div className="flex flex-col gap-1.5 h-full justify-center">
                                        {Array.from({ length: station.capacity || 1 }).map((_, slotIdx) => {
                                          // Get all assignments for this station+day+week
                                          const asgns = assignments.filter(a =>
                                            a.stationId === station.id &&
                                            a.dayOfWeek === d.dayOfWeek &&
                                            a.weekNumber === d.weekNum &&
                                            a.year === selectedYear &&
                                            a.month === selectedMonth
                                          );
                                          const asgn = asgns[slotIdx]; // Pick the assignment for this specific slot
                                          
                                          return (
                                            <select
                                              key={slotIdx}
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
                                                const g = (s.gorev || '').toLowerCase();
                                                const isTeacher = g.includes('öğretmen');
                                                const isAdminStation = station.name.toLowerCase().includes('idare') || station.name.toLowerCase().includes('müdür');
                                                return isAdminStation ? !isTeacher : isTeacher;
                                              }).map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                              ))}
                                            </select>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                          ))}
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
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
                        <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Personel</th>
                        <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Unvan</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Nöbet Sayısı</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Dağılım</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.map((s, i) => {
                        const nonExemptStats = stats.filter((x: any) => !x.isExempt);
                        const maxCount = nonExemptStats[0]?.count || 1;
                        const pct = s.isExempt ? 0 : Math.round((s.count / maxCount) * 100);
                        return (
                          <tr key={s.staffId} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${s.isExempt ? 'opacity-60' : ''}`}>
                            <td className="px-5 py-3 font-semibold text-slate-800">
                              {s.staffName}
                              {s.isExempt && (
                                <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">Muaf</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-slate-500">{s.title || '—'}</td>
                            <td className="px-5 py-3 text-center">
                              {s.isExempt ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold bg-slate-100 text-slate-400">—</span>
                              ) : (
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                  s.count >= 5 ? 'bg-red-100 text-red-700' :
                                  s.count >= 3 ? 'bg-amber-100 text-amber-700' :
                                  'bg-green-100 text-green-700'
                                }`}>{s.count}</span>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${s.isExempt ? 'bg-slate-300' : 'bg-indigo-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-400 w-8 text-right">{s.isExempt ? '—' : `${pct}%`}</span>
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
                  const renderTable = (title: string, list: any[], hideStation?: boolean) => (
                  <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                            <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Personel</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Sabit Nöbet Günü</th>
                            {!hideStation && <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Sabit Nöbet Yeri</th>}
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Muaf</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Muafiyet Gerekçesi</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Bitiş Tarihi</th>
                            <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Not</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {list.map((s, i) => {
                            const cfg = getConfig(s.id);
                            const isExempt = !!cfg.isExempt;
                            return (
                              <tr key={s.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${isExempt ? 'bg-amber-50/40' : ''}`}>
                                <td className="px-4 py-2.5 font-semibold text-slate-800">
                                  {s.name}
                                  {isExempt && (
                                    <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">Muaf</span>
                                  )}
                                </td>
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
                                {!hideStation && (
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
                                )}
                                {/* Muaf checkbox */}
                                <td className="px-3 py-2.5 text-center">
                                  <label className="inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isExempt}
                                      onChange={e => {
                                        updateConfig(s.id, 'isExempt', e.target.checked);
                                        if (!e.target.checked) {
                                          updateConfig(s.id, 'exemptionReason', null);
                                          updateConfig(s.id, 'exemptionNote', null);
                                          updateConfig(s.id, 'exemptionEndDate', null);
                                        }
                                      }}
                                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                  </label>
                                </td>
                                {/* Muafiyet Gerekçesi dropdown — MEB Yönetmeliği maddeleri */}
                                <td className="px-3 py-2.5 text-center">
                                  <select
                                    value={cfg.exemptionReason || ''}
                                    disabled={!isExempt}
                                    onChange={e => updateConfig(s.id, 'exemptionReason', e.target.value || null)}
                                    className={`w-44 text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                                      isExempt ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                  >
                                    <option value="">— Seçiniz —</option>
                                    <option value="HAMILE">🤰 Hamile (24. Hafta+)</option>
                                    <option value="DOGUM_SONRASI">👶 Doğum Sonrası (Analık İzni+1 Yıl)</option>
                                    <option value="HIZMET_YILI_KADIN">👩 20+ Yıl Hizmet (Kadın)</option>
                                    <option value="HIZMET_YILI_ERKEK">👨 25+ Yıl Hizmet (Erkek)</option>
                                    <option value="ENGELLI">♿ Engelli Öğretmen</option>
                                    <option value="ENGELLI_BAKIM">🏠 Engelli Birey/Çocuk Bakımı</option>
                                    <option value="OZEL_EGITIM">📚 Özel Eğitim Sınıfı Öğretmeni</option>
                                    <option value="DIGER">📝 Diğer (Not alanına giriniz)</option>
                                  </select>
                                </td>
                                {/* Bitiş Tarihi */}
                                <td className="px-3 py-2.5 text-center">
                                  <input
                                    type="date"
                                    value={cfg.exemptionEndDate || ''}
                                    disabled={!isExempt}
                                    onChange={e => updateConfig(s.id, 'exemptionEndDate', e.target.value || null)}
                                    className={`text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                                      isExempt ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                    style={{ width: '130px' }}
                                  />
                                </td>
                                {/* Not alanı */}
                                <td className="px-3 py-2.5">
                                  <input
                                    type="text"
                                    value={cfg.exemptionNote || ''}
                                    disabled={!isExempt}
                                    placeholder={isExempt ? 'Açıklama...' : '—'}
                                    onChange={e => updateConfig(s.id, 'exemptionNote', e.target.value || null)}
                                    className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                                      isExempt ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                  />
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

                return (
                  <>
                    {renderTable('Öğretmen Nöbet Ayarları', teachers)}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── İDARECİ AYARLARI ── */}
          {activeTab === 'idareci' && (
            <div className="space-y-6">
              {(() => {
                  const renderTable = (title: string, list: any[], hideStation?: boolean) => (
                  <div className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                            <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Personel</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Sabit Nöbet Günü</th>
                            {!hideStation && <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Sabit Nöbet Yeri</th>}
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Muaf</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Muafiyet Gerekçesi</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Bitiş Tarihi</th>
                            <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Not</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {list.map((s, i) => {
                            const cfg = getConfig(s.id);
                            const isExempt = !!cfg.isExempt;
                            return (
                              <tr key={s.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${isExempt ? 'bg-amber-50/40' : ''}`}>
                                <td className="px-4 py-2.5 font-semibold text-slate-800">
                                  {s.name}
                                  {isExempt && (
                                    <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">Muaf</span>
                                  )}
                                </td>
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
                                {!hideStation && (
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
                                )}
                                {/* Muaf checkbox */}
                                <td className="px-3 py-2.5 text-center">
                                  <label className="inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isExempt}
                                      onChange={e => {
                                        updateConfig(s.id, 'isExempt', e.target.checked);
                                        if (!e.target.checked) {
                                          updateConfig(s.id, 'exemptionReason', null);
                                          updateConfig(s.id, 'exemptionNote', null);
                                          updateConfig(s.id, 'exemptionEndDate', null);
                                        }
                                      }}
                                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                  </label>
                                </td>
                                {/* Muafiyet Gerekçesi dropdown — MEB Yönetmeliği maddeleri */}
                                <td className="px-3 py-2.5 text-center">
                                  <select
                                    value={cfg.exemptionReason || ''}
                                    disabled={!isExempt}
                                    onChange={e => updateConfig(s.id, 'exemptionReason', e.target.value || null)}
                                    className={`w-44 text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                                      isExempt ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                  >
                                    <option value="">— Seçiniz —</option>
                                    <option value="HAMILE">🤰 Hamile (24. Hafta+)</option>
                                    <option value="DOGUM_SONRASI">👶 Doğum Sonrası (Analık İzni+1 Yıl)</option>
                                    <option value="HIZMET_YILI_KADIN">👩 20+ Yıl Hizmet (Kadın)</option>
                                    <option value="HIZMET_YILI_ERKEK">👨 25+ Yıl Hizmet (Erkek)</option>
                                    <option value="ENGELLI">♿ Engelli Öğretmen</option>
                                    <option value="ENGELLI_BAKIM">🏠 Engelli Birey/Çocuk Bakımı</option>
                                    <option value="OZEL_EGITIM">📚 Özel Eğitim Sınıfı Öğretmeni</option>
                                    <option value="DIGER">📝 Diğer (Not alanına giriniz)</option>
                                  </select>
                                </td>
                                {/* Bitiş Tarihi */}
                                <td className="px-3 py-2.5 text-center">
                                  <input
                                    type="date"
                                    value={cfg.exemptionEndDate || ''}
                                    disabled={!isExempt}
                                    onChange={e => updateConfig(s.id, 'exemptionEndDate', e.target.value || null)}
                                    className={`text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                                      isExempt ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                    style={{ width: '130px' }}
                                  />
                                </td>
                                {/* Not alanı */}
                                <td className="px-3 py-2.5">
                                  <input
                                    type="text"
                                    value={cfg.exemptionNote || ''}
                                    disabled={!isExempt}
                                    placeholder={isExempt ? 'Açıklama...' : '—'}
                                    onChange={e => updateConfig(s.id, 'exemptionNote', e.target.value || null)}
                                    className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                                      isExempt ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );

                const admins = staffList.filter(s => !s.gorev?.toLowerCase().includes('öğretmen'));

                return (
                  <>
                    {admins.length > 0 && renderTable('İdareci Nöbet Ayarları', admins, true)}
                  </>
                );
              })()}
            </div>
          )}

          {/* ── NÖBET YERLERİ ── */}
          {activeTab === 'yerler' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Form */}
              <div className="p-5 space-y-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                        <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Nöbet Yeri</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Kapasite</th>
                        <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Devre</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">İşlemler</th>
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
              <div className="p-5 space-y-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                      <option value="fourweekly">4 Haftalık Rotasyon</option>
                      <option value="monthly">Aylık Rotasyon</option>
                      <option value="custom">Özel Tarihler (Manuel Rotasyon)</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Öğretmenler seçilen sıklıkta bir sonraki nöbet yerine kaydırılır.
                    </p>
                  </div>

                  {/* Nöbet Başlangıç Tarihi */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nöbet Başlangıç Tarihi
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={settings?.dutyStartDate || ''}
                        onChange={async (e) => {
                          try {
                            await api.put('/settings', { dutyStartDate: e.target.value || null });
                            toast.success('Nöbet başlangıç tarihi güncellendi.');
                            refreshSettings();
                          } catch {
                            toast.error('Ayar kaydedilemedi.');
                          }
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                      {settings?.dutyStartDate && (
                        <button
                          onClick={async () => {
                            try {
                              await api.put('/settings', { dutyStartDate: null });
                              toast.success('Başlangıç tarihi kaldırıldı.');
                              refreshSettings();
                            } catch {
                              toast.error('Ayar kaydedilemedi.');
                            }
                          }}
                          className="px-2 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Başlangıç tarihini kaldır"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Bu tarihten önce nöbet atanmaz ve rotasyon bu haftadan başlar.
                      {settings?.dutyStartDate && (
                        <span className="ml-1 font-semibold text-indigo-600">
                          (Rotasyon sıfırı: {new Date(settings.dutyStartDate).toLocaleDateString('tr-TR')})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {settings?.dutyRotationFreq === 'custom' && (
                <div className="p-5 space-y-4 bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden md:col-span-2">
                  <h3 className="font-bold text-sm text-slate-800 border-b pb-3 flex items-center gap-2">
                    <CalendarRange size={16} className="text-amber-600" /> Rotasyon Geçiş Tarihleri
                    {(() => {
                      try {
                        const count = rotationDates.length;
                        if (count > 0) return (
                          <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            {count} tarih kayıtlı
                          </span>
                        );
                      } catch { return null; }
                    })()}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Öğretmenler, eklediğiniz geçiş tarihlerinden itibaren bir sonraki nöbet yerine topluca kaydırılır. 
                    (Örneğin, 2. dönemin başlama tarihini ekleyerek tam o gün herkesi 1 tur döndürebilirsiniz).
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newRotationDate}
                      onChange={e => setNewRotationDate(e.target.value)}
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <button
                      onClick={handleAddRotationDate}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Geçiş Tarihi Ekle
                    </button>
                  </div>

                  {/* Kayıtlı tarihler listesi — local state üzerinden render */}
                  {rotationDates.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700 flex items-center gap-2">
                      <CalendarRange size={16} className="flex-shrink-0" />
                      <span>Henüz geçiş tarihi eklenmemiş. Yukarıdan tarih ekleyin.</span>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        Kayıtlı Rotasyon Tarihleri
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {rotationDates.map((dateStr, idx) => {
                          const [y, m, d] = dateStr.split('-').map(Number);
                          const localDate = new Date(y, m - 1, d);
                          return (
                            <li key={dateStr} className="flex justify-between items-center px-4 py-3 bg-white hover:bg-slate-50 transition text-sm">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex-shrink-0">{idx + 1}</span>
                                <span className="font-semibold text-slate-800">
                                  {localDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteRotationDate(dateStr)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition flex-shrink-0"
                                title="Tarihi Sil"
                              >
                                <Trash2 size={15} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

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
          assignments={assignments.filter(a => a.year === selectedYear && a.month === selectedMonth)}
          staffConfigs={staffConfigs}
          monthName={monthName}
          year={selectedYear}
          workDays={workDays}
        />

        <div ref={printRefAll}>
          {(() => {
            const monthsMap = new Map<string, { year: number, month: number, assignments: any[] }>();
            assignments.forEach(a => {
              const key = `${a.year}-${a.month}`;
              if (!monthsMap.has(key)) {
                monthsMap.set(key, { year: a.year, month: a.month, assignments: [] });
              }
              monthsMap.get(key)!.assignments.push(a);
            });
            const allMonths = Array.from(monthsMap.values()).sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              return a.month - b.month;
            });
            
            return allMonths.map((m, idx) => (
              <div key={`${m.year}-${m.month}`} style={{ pageBreakAfter: idx < allMonths.length - 1 ? 'always' : 'auto' }}>
                <DutySchedulePrintTemplate
                  stations={stations}
                  staffList={staffList}
                  assignments={m.assignments}
                  staffConfigs={staffConfigs}
                  monthName={MONTHS.find(mon => mon.val === m.month)?.label || ''}
                  year={m.year}
                  workDays={getWorkDays(m.year, m.month)}
                />
              </div>
            ));
          })()}
        </div>
      </div>

      {confirmModal}
    </div>
  );
}
