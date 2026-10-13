import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { useReactToPrint } from 'react-to-print';
import {
  CalendarDays, UploadCloud, AlertTriangle, CheckCircle,
  Trash2, History, Printer, RefreshCw, BookOpen, Users,
  BarChart2, ChevronDown, ChevronUp, ExternalLink, Tag
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ActionModal } from '../../../components/ui/ActionModal';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import TimetableGrid from '../../../components/ui/TimetableGrid';
import { ClassNamesModal } from './components/ClassNamesModal';
import { parseAndStandardizeClass, groupClassesByGrade } from '../../../utils/classNameFormatter';

export default function TimetablePage() {
  const { settings, refreshSettings } = useSettings();
  const { confirm, confirmModal } = useConfirm();
  const academicYear = settings?.academicYear || '2025-2026';
  const schoolName = settings?.schoolName || 'Okul Adı';

  const todayDow = useMemo(() => { const d = new Date().getDay(); return d === 0 ? 7 : d; }, []);

  const [activeTimetable, setActiveTimetable] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClassNamesModalOpen, setIsClassNamesModalOpen] = useState(false);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');

  const teacherBranches = useMemo(() => {
    return Array.from(new Set(staffList.map((s: any) => s.brans).filter(Boolean))).sort((a: any, b: any) => a.localeCompare(b, 'tr-TR')) as string[];
  }, [staffList]);

  const filteredStaffList = useMemo(() => {
    if (selectedBranchFilter === 'ALL') return staffList;
    return staffList.filter((s: any) => s.brans === selectedBranchFilter);
  }, [staffList, selectedBranchFilter]);

  const classDisplayMap = useMemo<Record<string, string>>(() => {
    try {
      return JSON.parse(settings?.classDisplayMap || '{}');
    } catch {
      return {};
    }
  }, [settings?.classDisplayMap]);

  // Tüm sınıfların meta listesi (9'dan 12'ye doğru kademe ve şube sırasıyla)
  const allClassMetas = useMemo(() => {
    const gradeOrder: Record<string, number> = {
      '9': 9,
      '10': 10,
      '11': 11,
      '12': 12,
      'Özel': 90,
      'Diğer': 99,
    };
    return classNames
      .map(c => parseAndStandardizeClass(c, classDisplayMap))
      .sort((a, b) => {
        const orderA = gradeOrder[a.grade] ?? (parseInt(a.grade, 10) || 99);
        const orderB = gradeOrder[b.grade] ?? (parseInt(b.grade, 10) || 99);
        if (orderA !== orderB) return orderA - orderB;
        return a.displayName.localeCompare(b.displayName, 'tr-TR', { numeric: true, sensitivity: 'base' });
      });
  }, [classNames, classDisplayMap]);

  // Seçili kademeye göre filtrelenmiş sınıflar
  const filteredClassMetas = useMemo(() => {
    if (selectedGradeFilter === 'ALL') return allClassMetas;
    return allClassMetas.filter(m => m.grade === selectedGradeFilter);
  }, [allClassMetas, selectedGradeFilter]);

  // Kademe sayıları
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allClassMetas.length };
    allClassMetas.forEach(m => {
      counts[m.grade] = (counts[m.grade] || 0) + 1;
    });
    return counts;
  }, [allClassMetas]);

  const [viewMode, setViewMode] = useState<'teacher' | 'class'>('teacher');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [viewEntries, setViewEntries] = useState<any[]>([]);
  const [viewTeacherDetails, setViewTeacherDetails] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewTitle, setViewTitle] = useState('');

  const [showSubjectSummary, setShowSubjectSummary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [crossEntries, setCrossEntries] = useState<any[]>([]);
  const [crossTitle, setCrossTitle] = useState('');
  const [crossMode, setCrossMode] = useState<'teacher' | 'class'>('class');
  const [isCrossOpen, setIsCrossOpen] = useState(false);
  const [crossLoading, setCrossLoading] = useState(false);

  const [loadSummary, setLoadSummary] = useState<any[]>([]);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [loadLoading, setLoadLoading] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const [isClassUploadModalOpen, setIsClassUploadModalOpen] = useState(false);
  const [classSelectedFile, setClassSelectedFile] = useState<File | null>(null);
  const [classUploading, setClassUploading] = useState(false);
  const [classUploadResult, setClassUploadResult] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: viewTitle || 'Ders_Programi' });

  const getPeriodTime = useCallback((_period: number): string | null => null, []);

  const fetchBase = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, histRes, staffRes, classRes] = await Promise.all([
        api.get(`/timetable/active?academicYear=${academicYear}`),
        api.get(`/timetable/history?academicYear=${academicYear}`),
        api.get('/staff'),
        api.get(`/timetable/classes?academicYear=${academicYear}`),
      ]);
      setActiveTimetable(activeRes.data.data);
      setHistory(histRes.data.data || []);
      const allStaff = staffRes.data.data?.staff || staffRes.data.data || [];
      setStaffList(
        allStaff
          .filter((s: any) => {
            const g = (s.gorev || '').toLowerCase();
            return !g.includes('öğrenci') && !g.includes('veli');
          })
          .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'tr-TR'))
      );
      setClassNames(classRes.data.data || []);
    } catch { toast.error('Veriler yüklenemedi.'); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { fetchBase(); }, [fetchBase]);
  useEffect(() => { setSelectedStaffId(''); setSelectedClass(''); setViewEntries([]); setViewTeacherDetails(null); setViewTitle(''); }, [viewMode]);

  const handleView = useCallback(async (sid?: string, cls?: string) => {
    const staffId = sid ?? selectedStaffId;
    const className = cls ?? selectedClass;
    if (viewMode === 'teacher' && !staffId) return;
    if (viewMode === 'class' && !className) return;
    setViewLoading(true);
    try {
      if (viewMode === 'teacher') {
        const res = await api.get(`/timetable/teacher/${staffId}?academicYear=${academicYear}`);
        setViewEntries(res.data.data?.entries || []);
        setViewTeacherDetails(res.data.data?.details || null);
        const staff = staffList.find((s: any) => s.id === staffId);
        setViewTitle(`${staff?.name || ''} — Haftalık Ders Programı`);
      } else {
        const encoded = encodeURIComponent(className);
        const res = await api.get(`/timetable/class/${encoded}?academicYear=${academicYear}`);
        setViewEntries(res.data.data || []);
        setViewTeacherDetails(null);
        const displayCls = parseAndStandardizeClass(className, classDisplayMap).displayName;
        setViewTitle(`${displayCls} Sınıfı — Haftalık Ders Programı`);
      }
    } catch { toast.error('Ders programı yüklenemedi.'); }
    finally { setViewLoading(false); }
  }, [viewMode, selectedStaffId, selectedClass, academicYear, staffList, classDisplayMap]);

  useEffect(() => { if (viewMode === 'teacher' && selectedStaffId) handleView(selectedStaffId); }, [selectedStaffId, handleView, viewMode]);
  useEffect(() => { if (viewMode === 'class' && selectedClass) handleView(undefined, selectedClass); }, [selectedClass, handleView, viewMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleView(); };

  const handleCellClick = useCallback(async (group: any) => {
    setCrossLoading(true);
    setIsCrossOpen(true);
    try {
      if (viewMode === 'teacher' && group.classNames?.[0]) {
        const encoded = encodeURIComponent(group.classNames[0]);
        const res = await api.get(`/timetable/class/${encoded}?academicYear=${academicYear}`);
        setCrossEntries(res.data.data || []);
        const displayCls = parseAndStandardizeClass(group.classNames[0], classDisplayMap).displayName;
        setCrossTitle(`${displayCls} Sınıfı — Haftalık Program`);
        setCrossMode('class');
      } else if (viewMode === 'class' && group.staffNames?.[0]) {
        const staff = staffList.find((s: any) => s.name === group.staffNames[0]);
        if (!staff) { toast.error('Öğretmen bulunamadı.'); setIsCrossOpen(false); return; }
        const res = await api.get(`/timetable/teacher/${staff.id}?academicYear=${academicYear}`);
        setCrossEntries(res.data.data?.entries || res.data.data || []);
        setCrossTitle(`${group.staffNames[0]} — Haftalık Program`);
        setCrossMode('teacher');
      } else { setIsCrossOpen(false); }
    } catch { toast.error('Program yüklenemedi.'); setIsCrossOpen(false); }
    finally { setCrossLoading(false); }
  }, [viewMode, academicYear, staffList, classDisplayMap]);

  const toggleLoadPanel = useCallback(async () => {
    if (!showLoadPanel && loadSummary.length === 0) {
      setLoadLoading(true);
      try {
        const res = await api.get(`/timetable/load-summary?academicYear=${academicYear}`);
        setLoadSummary(res.data.data || []);
      } catch { toast.error('Yük özeti yüklenemedi.'); }
      finally { setLoadLoading(false); }
    }
    setShowLoadPanel((prev) => !prev);
  }, [showLoadPanel, loadSummary.length, academicYear]);

  const maxLoadCount = useMemo(() => Math.max(...loadSummary.map((s) => s.count), 1), [loadSummary]);

  const summaryStats = useMemo(() => {
    if (!viewEntries.length) return null;
    const distinctSlots = new Set(viewEntries.map((e) => `${e.dayOfWeek}-${e.period}`)).size;
    return {
      total: viewMode === 'teacher' ? viewEntries.length : distinctSlots,
      rawAssignments: viewEntries.length,
      activeDays: new Set(viewEntries.map((e) => e.dayOfWeek)).size,
      minP: Math.min(...viewEntries.map((e) => e.period)),
      maxP: Math.max(...viewEntries.map((e) => e.period)),
    };
  }, [viewEntries, viewMode]);

  const subjectSummaryList = useMemo(() => {
    if (!viewEntries.length) return [];
    const map = new Map<string, any>();
    viewEntries.forEach(e => {
      const key = viewMode === 'teacher' 
        ? `${e.className || ''}-${e.subject || ''}`
        : `${e.subject || ''}-${e.staff?.name || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          subject: e.subject || '',
          subjectName: (e as any).subjectName || e.subject || '',
          className: e.className || '',
          staffName: e.staff?.name || '',
          rooms: [e.room].filter(Boolean),
          count: 1
        });
      } else {
        const item = map.get(key)!;
        item.count++;
        if (e.room) item.rooms.push(e.room);
      }
    });
    return Array.from(map.values())
      .map(item => ({ ...item, roomStr: Array.from(new Set(item.rooms)).join(' - ') }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [viewEntries, viewMode]);

  const handleUpload = async () => {
    if (!selectedFile) return toast.error('Lütfen bir Excel dosyası seçin.');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('academicYear', academicYear);
    formData.append('name', `${academicYear} Ders Programı`);
    try {
      const res = await api.post('/timetable/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadResult(res.data.data);
      toast.success('Ders programı başarıyla yüklendi!');
      setLoadSummary([]);
      fetchBase();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Yükleme başarısız oldu.'); }
    finally { setUploading(false); }
  };

  const handleClassUpload = async () => {
    if (!classSelectedFile) return toast.error('Lütfen Sınıf El Programı Excel dosyasını seçin.');
    if (!activeTimetable) return toast.error('Lütfen önce Aktif Ders Programı yükleyin.');
    setClassUploading(true);
    const formData = new FormData();
    formData.append('file', classSelectedFile);
    try {
      const res = await api.post(`/timetable/${activeTimetable.id}/upload-class-schedule`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setClassUploadResult(res.data.data);
      toast.success('Sınıf el programından derslik bilgileri başarıyla eşleştirildi!');
      fetchBase();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Eşleştirme başarısız oldu.'); }
    finally { setClassUploading(false); }
  };

  const closeUploadModal = () => { setIsUploadModalOpen(false); setSelectedFile(null); setUploadResult(null); };
  const closeClassUploadModal = () => { setIsClassUploadModalOpen(false); setClassSelectedFile(null); setClassUploadResult(null); };

  const handleDelete = async (id: string, isActive = false) => {
    const ok = await confirm(isActive
      ? 'Bu program AKTİF durumda. Silerseniz aktif ders programı kalmayacak (Boş Ders Doldurma vb. etkilenir). Yine de silmek istiyor musunuz?'
      : 'Bu ders programını silmek istediğinize emin misiniz?');
    if (!ok) return;
    try { await api.delete(`/timetable/${id}`); toast.success('Program silindi.'); setLoadSummary([]); setViewEntries([]); fetchBase(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Silinemedi.'); }
  };

  const handleActivate = async (id: string) => {
    try { await api.put(`/timetable/${id}/activate`, { academicYear }); toast.success('Program aktif olarak ayarlandı.'); fetchBase(); }
    catch { toast.error('Aktif ayarlanamadı.'); }
  };

  const isViewDisabled = viewLoading || (viewMode === 'teacher' ? !selectedStaffId : !selectedClass);

  return (
    <div className="space-y-3 w-full min-w-0 max-w-full">
      <PageHeader
        title="Ders Programı Yönetimi"
        description={
          activeTimetable
            ? `🟢 Aktif Program: ${activeTimetable.name} • ${activeTimetable._count?.entries || 0} ders ataması • Yüklenme: ${new Date(activeTimetable.createdAt).toLocaleDateString('tr-TR')}`
            : `${academicYear} dönemi için ders programlarını görüntüleyin, yazdırın ve yönetin.`
        }
        icon={<CalendarDays size={22} />}
        actions={
          <div className="flex items-center gap-1.5">
            {activeTimetable && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleLoadPanel}
                  className="gap-1.5 text-xs text-white border-white/20 hover:bg-white/10 shrink-0"
                  title="Öğretmen haftalık ders yükü dağılımı"
                >
                  <BarChart2 size={14} />
                  <span className="hidden sm:inline">Öğretmen Yük Özeti</span>
                  {showLoadPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsClassUploadModalOpen(true)}
                  className="gap-1.5 text-xs text-white border-white/20 hover:bg-white/10 shrink-0"
                  title="Sınıf el programından derslik bilgilerini eşleştir"
                >
                  <UploadCloud size={14} />
                  <span className="hidden md:inline">Derslikleri Eşleştir</span>
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="gap-1.5 text-xs font-bold shrink-0 bg-white text-indigo-700 hover:bg-indigo-50 shadow-xs"
            >
              <UploadCloud size={14} />
              <span>Yeni Program Yükle</span>
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : !activeTimetable ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4 items-start">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold text-amber-800">Aktif Ders Programı Bulunamadı</h3>
            <p className="text-amber-700 text-sm mt-1">{academicYear} dönemi için henüz program yüklenmemiş.</p>
            <Button onClick={() => setIsUploadModalOpen(true)} className="mt-3 gap-2">
              <UploadCloud size={16} /> Şimdi Yükle
            </Button>
          </div>
        </div>
      ) : null}

      {showLoadPanel && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Öğretmen Haftalık Ders Yükü</h3>
              <span className="text-[11px] text-slate-400">({academicYear} aktif program)</span>
            </div>
            <button onClick={() => setShowLoadPanel(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <ChevronUp size={16} />
            </button>
          </div>
          {loadLoading ? (
            <div className="p-6 flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>
          ) : (
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {loadSummary.map((s, i) => (
                <div key={s.staffId ?? i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                    {s.brans && <p className="text-[10px] text-slate-400 truncate">{s.brans}</p>}
                    <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.round((s.count / maxLoadCount) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 shrink-0">{s.count} sa</span>
                  {s.staffId && (
                    <button onClick={() => { setViewMode('teacher'); setSelectedStaffId(s.staffId); setShowLoadPanel(false); }}
                      className="shrink-0 p-1 text-slate-300 hover:text-indigo-600 transition" title="Programını Görüntüle">
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTimetable && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2.5 sm:p-3 space-y-2 w-full min-w-0 max-w-full relative z-20">
          {/* Row 1: Mode Switcher + Searchable Select + Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full min-w-0" onKeyDown={handleKeyDown}>
            {/* Mode Switcher */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 shrink-0 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode('teacher')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'teacher'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Users size={14} />
                <span>Öğretmen</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${viewMode === 'teacher' ? 'bg-indigo-700/80 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {staffList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('class')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  viewMode === 'class'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <BookOpen size={14} />
                <span>Sınıf</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${viewMode === 'class' ? 'bg-indigo-700/80 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {allClassMetas.length}
                </span>
              </button>
            </div>

            {/* Searchable Select Input */}
            <div className="flex-1 min-w-[200px]">
              {viewMode === 'teacher' ? (
                <SearchableSelect
                  options={filteredStaffList.map((s: any) => ({ 
                    value: s.id, 
                    label: s.brans ? `${s.name} (${s.brans})` : s.name 
                  }))}
                  value={selectedStaffId}
                  onChange={(val) => setSelectedStaffId(val)}
                  placeholder={selectedBranchFilter !== 'ALL' ? `${selectedBranchFilter} öğretmeni seç...` : "Öğretmen ara ve seç..."}
                />
              ) : (
                <SearchableSelect
                  options={filteredClassMetas.map((c) => ({ value: c.raw, label: c.displayName }))}
                  value={selectedClass}
                  onChange={(val) => setSelectedClass(val)}
                  placeholder={selectedGradeFilter !== 'ALL' ? `${selectedGradeFilter}. Sınıf ara ve seç...` : "Sınıf ara ve seç..."}
                />
              )}
            </div>

            {/* Sınıf İsimlerini Düzenle (Class Mode only) */}
            {viewMode === 'class' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsClassNamesModalOpen(true)}
                className="gap-1.5 text-xs text-slate-700 hover:text-indigo-600 hover:border-indigo-300 shrink-0 h-[38px] px-2.5"
                title="Sınıf isimlerini standartlaştır ve düzenle"
              >
                <Tag size={13} className="text-indigo-500" />
                <span className="hidden md:inline">Sınıf İsimleri</span>
              </Button>
            )}

            {/* Yenile Button */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleView()}
              disabled={isViewDisabled}
              className="gap-1.5 shrink-0 h-[38px] px-2.5 text-xs text-slate-700"
              title="Programı Yenile"
            >
              <RefreshCw size={13} className={viewLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Yenile</span>
            </Button>

            {/* Yazdır Button */}
            {viewEntries.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() => handlePrint()}
                className="gap-1.5 shrink-0 h-[38px] px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold"
                title="Ders Programını Yazdır"
              >
                <Printer size={14} />
                <span>Yazdır</span>
              </Button>
            )}
          </div>

          {/* Row 2: Compact Filter Chips */}
          {/* Teacher Mode: Branch Chips */}
          {viewMode === 'teacher' && teacherBranches.length > 0 && (
            <div className="pt-1.5 border-t border-slate-100 w-full min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin w-full min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Branş:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBranchFilter('ALL')}
                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition whitespace-nowrap shrink-0 ${
                    selectedBranchFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tümü ({staffList.length})
                </button>
                {teacherBranches.map(brans => {
                  const count = staffList.filter((s: any) => s.brans === brans).length;
                  const isSelected = selectedBranchFilter === brans;
                  return (
                    <button
                      key={brans}
                      type="button"
                      onClick={() => setSelectedBranchFilter(isSelected ? 'ALL' : brans)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {brans} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Class Mode: Kademe & Quick Class Chips */}
          {viewMode === 'class' && (
            <div className="pt-1.5 border-t border-slate-100 space-y-1.5 w-full min-w-0 max-w-full overflow-hidden">
              {/* Kademe Filter Chips */}
              <div className="w-full min-w-0 max-w-full overflow-hidden">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin w-full min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Kademe:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedGradeFilter('ALL')}
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition whitespace-nowrap shrink-0 ${
                      selectedGradeFilter === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tümü ({gradeCounts['ALL'] || 0})
                  </button>
                  {['9', '10', '11', '12', 'Özel'].map(grade => {
                    const count = gradeCounts[grade] || 0;
                    if (count === 0) return null;
                    const isSelected = selectedGradeFilter === grade;
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => setSelectedGradeFilter(grade)}
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

              {/* Quick Class Selection (Single row horizontal scroll) */}
              {filteredClassMetas.length > 0 && (
                <div className="w-full min-w-0 max-w-full overflow-hidden">
                  <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 bg-slate-50/70 rounded-lg border border-slate-200/60 scrollbar-thin w-full min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 px-1">
                      Hızlı Seçim:
                    </span>
                    {filteredClassMetas.map(meta => {
                      const isSelected = selectedClass === meta.raw;
                      return (
                        <button
                          key={meta.raw}
                          type="button"
                          onClick={() => setSelectedClass(meta.raw)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1 border shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200/80 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
                          }`}
                          title={`Ham Ad: ${meta.raw}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isSelected ? 'bg-amber-300' : meta.program === 'ATP' ? 'bg-amber-400' : 'bg-indigo-400'
                            }`}
                          />
                          <span>{meta.displayName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Timetable View */}
      {viewEntries.length > 0 && (
        <div ref={printRef} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:overflow-visible w-full min-w-0 max-w-full">
          <style type="text/css" media="print">
            {`
              @page { size: A4 portrait; margin: 8mm; }
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                zoom: 0.75;
              }
            `}
          </style>

          {/* Screen Card Header */}
          <div className="px-3.5 py-2 bg-gradient-to-r from-slate-50 via-indigo-50/15 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden w-full min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">{viewTitle}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {viewMode === 'teacher' ? 'Öğretmen' : 'Sınıf'}
              </span>
            </div>

            {summaryStats && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                  <span>📚</span>
                  <span>{summaryStats.total} ders saati</span>
                  {viewMode === 'class' && summaryStats.rawAssignments > summaryStats.total && (
                    <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                      ({summaryStats.rawAssignments} atama)
                    </span>
                  )}
                </div>
                {viewMode === 'teacher' && viewTeacherDetails ? (
                  <>
                    {viewTeacherDetails.duty && (
                      <div className="flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                        <span>🛡️</span>
                        <span className="text-slate-400 text-[10px]">Nöbet:</span>
                        <span className="font-medium text-slate-700">{viewTeacherDetails.duty}</span>
                      </div>
                    )}
                    {viewTeacherDetails.homeroomClass && (
                      <div className="flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                        <span>🏫</span>
                        <span className="text-slate-400 text-[10px]">Rehberlik:</span>
                        <span className="font-medium text-slate-700">{viewTeacherDetails.homeroomClass}</span>
                      </div>
                    )}
                    {viewTeacherDetails.clubs && (
                      <div className="flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                        <span>🎯</span>
                        <span className="text-slate-400 text-[10px]">Kulüp:</span>
                        <span className="font-medium text-slate-700">{viewTeacherDetails.clubs}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                      <span>🗓️</span>
                      <span>{summaryStats.activeDays} gün</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                      <span>⏰</span>
                      <span>{summaryStats.minP}. - {summaryStats.maxP}. ders</span>
                    </div>
                  </>
                )}
                <span className="text-[11px] text-slate-400 hidden xl:inline ml-1">
                  💡 Kutucuğa tıklayarak çapraz programı gör
                </span>
              </div>
            )}
          </div>

          {/* Print Header */}
          <div className="hidden print:block text-center py-4 mb-4 border-b-2 border-black">
            <h1 className="text-xl font-black uppercase text-black">{schoolName}</h1>
            <h2 className="text-lg font-bold mt-1 text-black">{viewTitle}</h2>
            <p className="text-black text-sm mt-1 font-medium">{academicYear} EĞİTİM ÖĞRETİM YILI — Yazdır: {new Date().toLocaleDateString('tr-TR')}</p>
          </div>

          {/* Grid */}
          <TimetableGrid
            entries={viewEntries}
            viewMode={viewMode}
            todayDow={todayDow}
            getPeriodTime={getPeriodTime}
            onCellClick={handleCellClick}
            classDisplayMap={classDisplayMap}
          />
          
          {/* Ders Dağılım Listesi Özeti (Collapsible on screen, always visible in print) */}
          {subjectSummaryList.length > 0 && (
            <div className="border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowSubjectSummary(prev => !prev)}
                className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-600 flex items-center justify-between transition print:hidden"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 size={14} className="text-indigo-600" />
                  <span>Ders Dağılım Listesi</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    ({subjectSummaryList.length} ders türü, {summaryStats?.total || 0} saat)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                  <span>{showSubjectSummary ? 'Listeyi Gizle' : 'Listeyi Göster'}</span>
                  {showSubjectSummary ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </div>
              </button>

              <div className={`${showSubjectSummary ? 'block' : 'hidden'} print:block p-3 print:p-0 print:mt-4`}>
                <table className="w-full text-[11px] border-collapse print:border-2 print:border-black print:text-black">
                  <thead>
                    <tr className="bg-slate-100 print:bg-transparent text-slate-700 print:text-black font-bold">
                      <th className="border border-slate-300 print:border-black px-1.5 py-1 w-8 text-center">Sr</th>
                      <th className="border border-slate-300 print:border-black px-1.5 py-1 w-24 text-left">Ders Kodu</th>
                      <th className="border border-slate-300 print:border-black px-1.5 py-1 text-left">Ders Adı</th>
                      <th className="border border-slate-300 print:border-black px-1.5 py-1 w-14 text-center">Süre</th>
                      <th className="border border-slate-300 print:border-black px-1.5 py-1 text-left">{viewMode === 'teacher' ? 'Sınıf' : 'Öğretmen'}</th>
                      <th className="border border-slate-300 print:border-black px-1.5 py-1 w-28 text-left">Derslik</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white print:bg-transparent divide-y divide-slate-100 print:divide-black">
                    {subjectSummaryList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 print:hover:bg-transparent print:border-b print:border-black">
                        <td className="border border-slate-200 print:border-black px-1.5 py-1 text-center font-semibold text-slate-600 print:text-black">{idx + 1}</td>
                        <td className="border border-slate-200 print:border-black px-1.5 py-1 uppercase text-slate-800 print:text-black font-semibold">{item.subject.substring(0, 10)}</td>
                        <td className="border border-slate-200 print:border-black px-1.5 py-1 uppercase text-slate-800 print:text-black font-medium">{item.subjectName}</td>
                        <td className="border border-slate-200 print:border-black px-1.5 py-1 text-center font-bold text-indigo-700 print:text-black">{item.count}</td>
                        <td className="border border-slate-200 print:border-black px-1.5 py-1 uppercase text-slate-800 print:text-black font-medium">
                          {viewMode === 'teacher' ? parseAndStandardizeClass(item.className, classDisplayMap).displayName : item.staffName}
                        </td>
                        <td className="border border-slate-200 print:border-black px-1.5 py-1 text-slate-600 print:text-black">{item.roomStr || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state for timetable view */}
      {viewLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {/* Empty State Banner when no selection is made */}
      {activeTimetable && !viewLoading && viewEntries.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center w-full max-w-lg mx-auto my-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CalendarDays size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Ders Programı Seçimi</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Haftalık ders programını ekranda görüntülemek için yukarıdan bir öğretmen veya sınıf seçin.
          </p>
        </div>
      )}

      {/* Program Geçmişi (Always visible when no selection, collapsible when selection is active) */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {viewEntries.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 transition"
            >
              <div className="flex items-center gap-2">
                <History size={14} className="text-slate-400" />
                <span>Program Geçmişi ({history.length} Kayıt)</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>{showHistory ? 'Gizle' : 'Göster'}</span>
                {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </div>
            </button>
          ) : (
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
              <History size={16} className="text-slate-500" />
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Program Geçmişi</h3>
            </div>
          )}

          {(viewEntries.length === 0 || showHistory) && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase">Program Adı</th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase">Ders Sayısı</th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase">Yükleme Tarihi</th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase">Durum</th>
                    <th className="px-3.5 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2 font-medium text-slate-800">{h.name}</td>
                      <td className="px-3.5 py-2 text-center text-slate-600">{h._count?.entries ?? 0}</td>
                      <td className="px-3.5 py-2 text-center text-slate-500 text-[11px]">{new Date(h.createdAt).toLocaleString('tr-TR')}</td>
                      <td className="px-3.5 py-2 text-center">
                        {h.isActive ? (
                          <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full">Aktif</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded-full">Pasif</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!h.isActive && (
                            <button onClick={() => handleActivate(h.id)} className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-0.5 rounded hover:bg-indigo-50 transition">
                              Aktif Yap
                            </button>
                          )}
                          <button onClick={() => handleDelete(h.id, h.isActive)}
                            className="p-1 rounded transition text-slate-400 hover:text-red-500 hover:bg-red-50"
                            title={h.isActive ? 'Aktif programı sil' : 'Sil'}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ActionModal isOpen={isCrossOpen} onClose={() => setIsCrossOpen(false)} title={crossTitle} width="full" hideFooter>
        {crossLoading ? (
          <div className="p-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>
        ) : (
          <TimetableGrid
            entries={crossEntries}
            viewMode={crossMode}
            todayDow={todayDow}
            getPeriodTime={getPeriodTime}
            classDisplayMap={classDisplayMap}
          />
        )}
      </ActionModal>

      <ActionModal isOpen={isUploadModalOpen} onClose={closeUploadModal} title="Yeni Ders Programı Yükle">
        <div className="space-y-4">
          {!uploadResult ? (
            <>
              <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center relative hover:bg-slate-100 transition cursor-pointer">
                <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <UploadCloud className="mx-auto text-indigo-400 mb-2" size={36} />
                <p className="text-slate-700 font-medium">Excel Dosyasını Seçin veya Sürükleyin</p>
                <p className="text-slate-400 text-sm mt-1">Yabil çıktısı (.xlsx, .xls) — Maks. 10 MB</p>
                {selectedFile && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm border border-indigo-100">
                    <CheckCircle size={16} /> {selectedFile.name}
                  </div>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-amber-800 text-sm">
                <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={16} />
                <p>Yeni yükleme mevcut aktif programı pasife çekecektir. İşlem atomiktir; hata durumunda geri alınır.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeUploadModal}>İptal</Button>
                <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                  {uploading ? <><RefreshCw size={16} className="animate-spin" /> Yükleniyor...</> : 'Yükle ve Ayrıştır'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle size={28} /></div>
                <h3 className="text-lg font-bold text-slate-800">Yükleme Başarılı!</h3>
                <p className="text-slate-500 mt-1">{uploadResult.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <div className="text-2xl font-bold text-slate-800">{uploadResult.totalTeachersFoundInExcel}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Bulunan Öğretmen</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <div className="text-2xl font-bold text-slate-800">{uploadResult.totalEntriesCreated}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Aktarılan Ders Saati</div>
                </div>
              </div>
              {uploadResult.warnings?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-2 text-sm"><AlertTriangle size={16} className="text-amber-500" /> Eşleşmeyenler ({uploadResult.warnings.length})</h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-h-40 overflow-y-auto text-sm text-amber-800 space-y-1">
                    {uploadResult.warnings.map((w: string, i: number) => <div key={i} className="border-b border-amber-100/50 pb-1 last:border-0">{w}</div>)}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2"><Button onClick={closeUploadModal}>Kapat</Button></div>
            </div>
          )}
        </div>
      </ActionModal>

      <ActionModal isOpen={isClassUploadModalOpen} onClose={closeClassUploadModal} title="Sınıf El Programından Derslik Eşleştir">
        <div className="space-y-4">
          {!classUploadResult ? (
            <>
              <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center relative hover:bg-slate-100 transition cursor-pointer">
                <input type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && setClassSelectedFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <UploadCloud className="mx-auto text-indigo-400 mb-2" size={36} />
                <p className="text-slate-700 font-medium">Sınıf El Programı Excel Dosyasını Seçin</p>
                <p className="text-slate-400 text-sm mt-1">SinifElProgrami.xlsx (Maks. 10 MB)</p>
                {classSelectedFile && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm border border-indigo-100">
                    <CheckCircle size={16} /> {classSelectedFile.name}
                  </div>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3 text-blue-800 text-sm">
                <AlertTriangle className="shrink-0 mt-0.5 text-blue-600" size={16} />
                <p>Bu işlem, isimsiz Sınıf Programındaki verileri Öğretmen Programı ile karşılaştırır ve derslik numaralarını (örn. A-02/D-01) aktif programa işler.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeClassUploadModal}>İptal</Button>
                <Button onClick={handleClassUpload} disabled={!classSelectedFile || classUploading}>
                  {classUploading ? <><RefreshCw size={16} className="animate-spin" /> Eşleştiriliyor...</> : 'Eşleştir'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle size={28} /></div>
                <h3 className="text-lg font-bold text-slate-800">Eşleştirme Başarılı!</h3>
                <p className="text-slate-500 mt-1">{classUploadResult.message}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                <div className="text-3xl font-bold text-slate-800">{classUploadResult.count}</div>
                <div className="text-sm text-slate-500 uppercase tracking-wide mt-1">Derslik Ataması Yapıldı</div>
              </div>
              <div className="flex justify-end pt-2"><Button onClick={closeClassUploadModal}>Kapat</Button></div>
            </div>
          )}
        </div>
      </ActionModal>

      <ClassNamesModal
        isOpen={isClassNamesModalOpen}
        onClose={() => setIsClassNamesModalOpen(false)}
        rawClassNames={classNames}
        currentMap={classDisplayMap}
        onSave={async (newMap) => {
          await api.put('/settings', { classDisplayMap: JSON.stringify(newMap) });
          await refreshSettings();
        }}
      />

      {confirmModal}
    </div>
  );
}
