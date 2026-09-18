import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { useReactToPrint } from 'react-to-print';
import {
  CalendarDays, UploadCloud, AlertTriangle, CheckCircle,
  Trash2, History, Printer, RefreshCw, BookOpen, Users,
  BarChart2, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ActionModal } from '../../../components/ui/ActionModal';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import TimetableGrid from '../../../components/ui/TimetableGrid';
import {
  GroupedTimetableEntry,
  TimetableEntry,
  TimetableLoadSummary,
  TimetableRecord,
  TimetableStaffSummary,
  TimetableTeacherDetails,
  TimetableUploadResult,
} from '../../../types/timetable';

export default function TimetablePage() {
  const { settings } = useSettings();
  const { confirm, confirmModal } = useConfirm();
  const academicYear = settings?.academicYear || '2025-2026';
  const schoolName = settings?.schoolName || 'Okul Adı';
  const periodTimes = useMemo<Record<string, string>>(() => {
    if (!settings?.lessonPeriodsJson) return {};
    try {
      const parsed = JSON.parse(settings.lessonPeriodsJson) as Record<string, string>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, [settings?.lessonPeriodsJson]);

  const todayDow = useMemo(() => { const d = new Date().getDay(); return d === 0 ? 7 : d; }, []);

  const [activeTimetable, setActiveTimetable] = useState<TimetableRecord | null>(null);
  const [history, setHistory] = useState<TimetableRecord[]>([]);
  const [staffList, setStaffList] = useState<TimetableStaffSummary[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'teacher' | 'class'>('teacher');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [viewEntries, setViewEntries] = useState<TimetableEntry[]>([]);
  const [viewTeacherDetails, setViewTeacherDetails] = useState<TimetableTeacherDetails | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewTitle, setViewTitle] = useState('');

  const [crossEntries, setCrossEntries] = useState<TimetableEntry[]>([]);
  const [crossTitle, setCrossTitle] = useState('');
  const [crossMode, setCrossMode] = useState<'teacher' | 'class'>('class');
  const [isCrossOpen, setIsCrossOpen] = useState(false);
  const [crossLoading, setCrossLoading] = useState(false);

  const [loadSummary, setLoadSummary] = useState<TimetableLoadSummary[]>([]);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [loadLoading, setLoadLoading] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<TimetableUploadResult | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: viewTitle || 'Ders_Programi' });

  const getPeriodTime = useCallback((period: number): string | null => periodTimes[String(period)] || null, [periodTimes]);

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
      setStaffList(allStaff.filter((s: TimetableStaffSummary) => {
        const g = (s.gorev || '').toLowerCase();
        return !g.includes('öğrenci') && !g.includes('veli');
      }));
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
        const staff = staffList.find((s) => s.id === staffId);
        setViewTitle(`${staff?.name || ''} — Haftalık Ders Programı`);
      } else {
        const encoded = encodeURIComponent(className);
        const res = await api.get(`/timetable/class/${encoded}?academicYear=${academicYear}`);
        setViewEntries(res.data.data || []);
        setViewTeacherDetails(null);
        setViewTitle(`${className} Sınıfı — Haftalık Ders Programı`);
      }
    } catch { toast.error('Ders programı yüklenemedi.'); }
    finally { setViewLoading(false); }
  }, [viewMode, selectedStaffId, selectedClass, academicYear, staffList]);

  useEffect(() => { if (viewMode === 'teacher' && selectedStaffId) handleView(selectedStaffId); }, [selectedStaffId, handleView, viewMode]);
  useEffect(() => { if (viewMode === 'class' && selectedClass) handleView(undefined, selectedClass); }, [selectedClass, handleView, viewMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleView(); };

  const handleCellClick = useCallback(async (group: GroupedTimetableEntry) => {
    setCrossLoading(true);
    setIsCrossOpen(true);
    try {
      if (viewMode === 'teacher' && group.classNames?.[0]) {
        const encoded = encodeURIComponent(group.classNames[0]);
        const res = await api.get(`/timetable/class/${encoded}?academicYear=${academicYear}`);
        setCrossEntries(res.data.data || []);
        setCrossTitle(`${group.classNames[0]} Sınıfı — Haftalık Program`);
        setCrossMode('class');
      } else if (viewMode === 'class' && (group.staffIds?.[0] || group.staffNames?.[0])) {
        const staff = group.staffIds?.[0]
          ? staffList.find((s) => s.id === group.staffIds[0])
          : staffList.find((s) => s.name === group.staffNames[0]);
        if (!staff) { toast.error('Öğretmen bulunamadı.'); setIsCrossOpen(false); return; }
        const res = await api.get(`/timetable/teacher/${staff.id}?academicYear=${academicYear}`);
        setCrossEntries(res.data.data?.entries || res.data.data || []);
        setCrossTitle(`${group.staffNames[0]} — Haftalık Program`);
        setCrossMode('teacher');
      } else { setIsCrossOpen(false); }
    } catch { toast.error('Program yüklenemedi.'); setIsCrossOpen(false); }
    finally { setCrossLoading(false); }
  }, [viewMode, academicYear, staffList]);

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
    return {
      total: viewEntries.length,
      activeDays: new Set(viewEntries.map((e) => e.dayOfWeek)).size,
      minP: Math.min(...viewEntries.map((e) => e.period)),
      maxP: Math.max(...viewEntries.map((e) => e.period)),
    };
  }, [viewEntries]);

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

  const closeUploadModal = () => { setIsUploadModalOpen(false); setSelectedFile(null); setUploadResult(null); };

  const handleDelete = async (id: string) => {
    const ok = await confirm('Bu ders programını silmek istediğinize emin misiniz?');
    if (!ok) return;
    try { await api.delete(`/timetable/${id}`); toast.success('Program silindi.'); fetchBase(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Silinemedi.'); }
  };

  const handleActivate = async (id: string) => {
    try { await api.put(`/timetable/${id}/activate`, { academicYear }); toast.success('Program aktif olarak ayarlandı.'); fetchBase(); }
    catch { toast.error('Aktif ayarlanamadı.'); }
  };

  const isViewDisabled = viewLoading || (viewMode === 'teacher' ? !selectedStaffId : !selectedClass);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ders Programı Yönetimi"
        description="Öğretmen ve sınıf ders programlarını görüntüleyin, yazdırın ve yönetin."
        icon={<CalendarDays size={24} />}
        actions={
          <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2">
            <UploadCloud size={18} /> Yeni Program Yükle (Excel)
          </Button>
        }
      />

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
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
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <CheckCircle size={20} /> Aktif Program: <span className="text-slate-800">{activeTimetable.name}</span>
          </div>
          <div className="text-slate-500 text-sm">{activeTimetable._count?.entries || 0} ders ataması</div>
          <div className="text-slate-400 text-xs">Yüklenme: {new Date(activeTimetable.createdAt).toLocaleDateString('tr-TR')}</div>
          <button onClick={toggleLoadPanel} className="ml-auto flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition">
            <BarChart2 size={16} /> Öğretmen Yük Özeti {showLoadPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      )}

      {showLoadPanel && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <BarChart2 size={18} className="text-indigo-500" />
            <h3 className="font-bold text-slate-800">Öğretmen Haftalık Ders Yükü</h3>
            <span className="text-xs text-slate-400 ml-1">({academicYear} aktif program)</span>
          </div>
          {loadLoading ? (
            <div className="p-6 flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {loadSummary.map((s, i) => (
                <div key={s.staffId ?? i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                    {s.brans && <p className="text-[10px] text-slate-400 truncate">{s.brans}</p>}
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${Math.round((s.count / maxLoadCount) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 shrink-0">{s.count}</span>
                  {s.staffId && (
                    <button onClick={() => { setViewMode('teacher'); setSelectedStaffId(s.staffId ?? ''); setShowLoadPanel(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="shrink-0 p-1 text-slate-300 hover:text-indigo-500 transition" title="Programını Görüntüle">
                      <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTimetable && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:items-end" onKeyDown={handleKeyDown}>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden w-full sm:w-auto">
              <button onClick={() => setViewMode('teacher')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${viewMode === 'teacher' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Users size={16} /> Öğretmen
              </button>
              <button onClick={() => setViewMode('class')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${viewMode === 'class' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <BookOpen size={16} /> Sınıf
              </button>
            </div>
            <div className="flex-1 min-w-0 sm:min-w-[250px] w-full">
              {viewMode === 'teacher' ? (
                <SearchableSelect options={staffList.map((s) => ({ value: s.id, label: s.name }))} value={selectedStaffId} onChange={(val) => setSelectedStaffId(val)} placeholder="Öğretmen ara ve seç..." />
              ) : (
                <SearchableSelect options={classNames.map((c) => ({ value: c, label: c }))} value={selectedClass} onChange={(val) => setSelectedClass(val)} placeholder="Sınıf ara ve seç..." />
              )}
            </div>
            <Button onClick={() => handleView()} disabled={isViewDisabled} className="gap-2 w-full sm:w-auto justify-center">
              <RefreshCw size={16} className={viewLoading ? 'animate-spin' : ''} /> Yenile
            </Button>
            {viewEntries.length > 0 && (
              <Button variant="outline" onClick={() => handlePrint()} className="gap-2 w-full sm:w-auto justify-center">
                <Printer size={16} /> Yazdır
              </Button>
            )}
          </div>

          {summaryStats && (
            <div className="mt-3 flex flex-wrap gap-3 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 text-sm min-w-fit"><span className="text-slate-400">📚</span><span className="font-semibold text-slate-700">{summaryStats.total}</span><span className="text-slate-400 text-xs">ders saati</span></div>
              
              {viewMode === 'teacher' && viewTeacherDetails ? (
                <>
                  {viewTeacherDetails.duty && (
                    <>
                      <div className="hidden sm:block w-px bg-slate-200 self-stretch" />
                      <div className="flex items-center gap-1.5 text-sm min-w-fit"><span className="text-slate-400">🛡️</span><span className="text-slate-500 text-xs">Nöbet:</span><span className="font-semibold text-slate-700 ml-1">{viewTeacherDetails.duty}</span></div>
                    </>
                  )}
                  {viewTeacherDetails.homeroomClass && (
                    <>
                      <div className="hidden sm:block w-px bg-slate-200 self-stretch" />
                      <div className="flex items-center gap-1.5 text-sm min-w-fit"><span className="text-slate-400">🏫</span><span className="text-slate-500 text-xs">Rehberlik:</span><span className="font-semibold text-slate-700 ml-1">{viewTeacherDetails.homeroomClass}</span></div>
                    </>
                  )}
                  {viewTeacherDetails.clubs && (
                    <>
                      <div className="hidden sm:block w-px bg-slate-200 self-stretch" />
                      <div className="flex items-center gap-1.5 text-sm min-w-fit"><span className="text-slate-400">🎯</span><span className="text-slate-500 text-xs">Kulüp:</span><span className="font-semibold text-slate-700 ml-1">{viewTeacherDetails.clubs}</span></div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="hidden sm:block w-px bg-slate-200 self-stretch" />
                  <div className="flex items-center gap-1.5 text-sm min-w-fit"><span className="text-slate-400">🗓</span><span className="font-semibold text-slate-700">{summaryStats.activeDays}</span><span className="text-slate-400 text-xs">gün derse giriyor</span></div>
                  <div className="hidden sm:block w-px bg-slate-200 self-stretch" />
                  <div className="flex items-center gap-1.5 text-sm min-w-fit"><span className="text-slate-400">🕗</span><span className="font-semibold text-slate-700">{summaryStats.minP}. ders</span><span className="text-slate-400 text-xs">en erken</span></div>
                  <div className="hidden sm:block w-px bg-slate-200 self-stretch" />
                  <div className="flex items-center gap-1.5 text-sm min-w-fit"><span className="text-slate-400">🕔</span><span className="font-semibold text-slate-700">{summaryStats.maxP}. ders</span><span className="text-slate-400 text-xs">en geç</span></div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {viewEntries.length > 0 && (
        <div ref={printRef} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between print:hidden">
            <h3 className="font-bold text-slate-800 text-sm">{viewTitle}</h3>
            <p className="text-xs text-slate-400">💡 Bir kutucuğa tıklayarak {viewMode === 'teacher' ? 'sınıfın' : 'öğretmenin'} programını görüntüleyin</p>
          </div>
          <div className="hidden print:block text-center py-6 border-b border-slate-200">
            <h1 className="text-xl font-bold">{schoolName}</h1>
            <h2 className="text-lg font-semibold mt-1">{viewTitle}</h2>
            <p className="text-slate-500 text-sm mt-1">{academicYear} — Yazdır: {new Date().toLocaleDateString('tr-TR')}</p>
          </div>
          <TimetableGrid entries={viewEntries} viewMode={viewMode} todayDow={todayDow} getPeriodTime={getPeriodTime} onCellClick={handleCellClick} />
        </div>
      )}

      {viewLoading && viewEntries.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      )}

      <ActionModal isOpen={isCrossOpen} onClose={() => setIsCrossOpen(false)} title={crossTitle} width="full" hideFooter>
        {crossLoading ? (
          <div className="p-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>
        ) : (
          <TimetableGrid entries={crossEntries} viewMode={crossMode} todayDow={todayDow} getPeriodTime={getPeriodTime} />
        )}
      </ActionModal>

      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <History size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800">Program Geçmişi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Program Adı</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Ders Sayısı</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Yükleme Tarihi</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Durum</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{h.name}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{h._count?.entries ?? 0}</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-xs">{new Date(h.createdAt).toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3 text-center">
                      {h.isActive ? (
                        <span className="bg-green-100 text-green-700 border border-green-200 text-xs font-semibold px-2 py-0.5 rounded-full">Aktif</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-xs font-medium px-2 py-0.5 rounded-full">Pasif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!h.isActive && (
                          <button onClick={() => handleActivate(h.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition">
                            Aktif Yap
                          </button>
                        )}
                        <button onClick={() => handleDelete(h.id)} disabled={h.isActive}
                          className={`p-1.5 rounded transition ${h.isActive ? 'text-slate-300 cursor-not-allowed opacity-70' : 'text-slate-500 hover:text-red-500 hover:bg-red-50'}`}
                          title={h.isActive ? 'Aktif program silinemez' : 'Sil'}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {confirmModal}
    </div>
  );
}
