import toast from 'react-hot-toast';
import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { useSettings } from '../../context/SettingsContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { printPdfBlob } from '../../utils/printPdf';
import { ActionModal } from '../../components/ui/ActionModal';
import { 
  LineChart, 
  UploadCloud, 
  Archive, 
  ClipboardList, 
  Trash2, 
  FileText, 
  Check, 
  AlertTriangle, 
  Eye, 
  Download, 
  Search, 
  Loader2, 
  Printer,
  FileSpreadsheet,
  X,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface FailedSubject { subject: string; grade: number; }
interface StudentRecord { id: string; fullName: string; className: string; schoolNumber?: string; tcKimlikNo?: string; failedSubjects: FailedSubject[]; dbStudentName?: string; matched: boolean; pdfPath?: string; }
interface AnalyzeResult { reportId: string; className: string; studentCount: number; students: StudentRecord[]; existingReportId?: string | null; }
interface ReportListItem { id: string; className: string; schoolYear: string; meetingDate: string; uploadedAt: string; _count: { students: number }; }
type GenResult = { id: string; name: string; pdfPath: string | null; error?: string };

export default function GradeReportPage() {
  const { confirm, confirmModal } = useConfirm();
  const { settings } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const [schoolYear,      setSchoolYear]      = useState(settings?.academicYear || '2025-2026');
  const [meetingDate,     setMeetingDate]      = useState(new Date().toISOString().slice(0, 10));
  const [selectedFile,    setSelectedFile]     = useState<File | null>(null);
  const [isDragging,      setIsDragging]       = useState(false);

  const [uploading,       setUploading]        = useState(false);
  const [generating,      setGenerating]       = useState(false);
  const [bulkDownloading, setBulkDownloading]  = useState(false);
  const [result,          setResult]           = useState<AnalyzeResult | null>(null);
  const [reports,         setReports]          = useState<ReportListItem[] | null>(null);
  const [archivedReports, setArchivedReports]  = useState<ReportListItem[] | null>(null);
  const [loadingList,     setLoadingList]      = useState(false);
  
  const [genResults,      setGenResults]       = useState<GenResult[]>([]);
  const [selectedIds,     setSelectedIds]      = useState<Set<string>>(new Set());
  const [activePanel,     setActivePanel]      = useState<'none' | 'reports' | 'archived'>('none');

  // Conflict modal state
  const [conflictInfo, setConflictInfo] = useState<{ existingId: string; className: string } | null>(null);

  // Match modal state
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedStudentToMatch, setSelectedStudentToMatch] = useState<StudentRecord | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  useEffect(() => {
    if (settings?.academicYear) {
      setSchoolYear(settings.academicYear);
    }
  }, [settings?.academicYear]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'xls', 'pdf'].includes(ext || '')) {
        setSelectedFile(file);
      } else {
        toast.error('Lütfen geçerli bir Excel (.xlsx, .xls) veya PDF dosyası seçin.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSearchStudents = async (query: string) => {
    setStudentSearchQuery(query);
    if (query.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }
    setIsSearchingStudents(true);
    try {
      const res = await api.get<{ data: { students: any[] } }>(`/students?search=${query}&limit=10`);
      setStudentSearchResults(res.data.data.students || []);
    } catch { /* skip */ }
    finally { setIsSearchingStudents(false); }
  };

  const handleConfirmMatch = async (dbStudentId: string, dbStudentName: string) => {
    if (!selectedStudentToMatch) return;
    try {
      await api.patch(`/grade-reports/students/${selectedStudentToMatch.id}/match`, { studentId: dbStudentId });
      setResult(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map(s => 
            s.id === selectedStudentToMatch.id 
              ? { ...s, matched: true, dbStudentName } 
              : s
          )
        };
      });
      setMatchModalOpen(false);
      setStudentSearchQuery('');
      setStudentSearchResults([]);
      toast.success('Öğrenci veritabanı ile eşleştirildi.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Eşleştirme başarısız.');
    }
  };

  // ── Analiz
  const handleAnalyze = async () => {
    setResult(null); setGenResults([]); setSelectedIds(new Set());
    const file = selectedFile || fileRef.current?.files?.[0];
    if (!file) { toast.error('Lütfen bir Excel veya PDF dosyası seçin.'); return; }

    const formData = new FormData();
    formData.append('karne', file);
    formData.append('schoolYear', schoolYear);
    formData.append('meetingDate', meetingDate);

    setUploading(true);
    try {
      const res = await api.post<{ success: boolean; data: AnalyzeResult }>(
        '/grade-reports/analyze', formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 },
      );
      const data = res.data.data;
      setResult(data);
      setActivePanel('none');
      if (data.existingReportId) {
        setConflictInfo({ existingId: data.existingReportId, className: data.className });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Analiz hatası');
    } finally { setUploading(false); }
  };

  // ── PDF Oluştur
  const handleGenerate = async () => {
    if (!result) return;
    setGenerating(true);
    try {
      const res = await api.post<{ success: boolean; data: GenResult[] }>(
        `/grade-reports/${result.reportId}/generate-pdfs`, {},
        { timeout: 300000 },
      );
      setGenResults(res.data.data);
      toast.success('Tüm bildirim PDF belgeleri oluşturuldu.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'PDF oluşturma hatası');
    } finally { setGenerating(false); }
  };

  // ── Raporları listele
  const handleLoadReports = async () => {
    setLoadingList(true);
    try {
      const res = await api.get<{ success: boolean; data: ReportListItem[] }>('/grade-reports');
      setReports(res.data.data);
      setActivePanel('reports');
    } catch (err: any) { toast.error(err.response?.data?.message || err.message); }
    finally { setLoadingList(false); }
  };

  // ── Arşivlenmiş raporları yükle
  const handleLoadArchived = async () => {
    try {
      const res = await api.get<{ success: boolean; data: ReportListItem[] }>('/grade-reports/archived');
      setArchivedReports(res.data.data);
      setActivePanel('archived');
    } catch (err: any) { toast.error(err.response?.data?.message || err.message); }
  };

  // ── Conflict: eski raporu sil
  const handleConflictDelete = async () => {
    if (!conflictInfo) return;
    try {
      await api.delete(`/grade-reports/${conflictInfo.existingId}`);
      setReports(prev => prev?.filter(r => r.id !== conflictInfo.existingId) ?? null);
      toast.success('Eski rapor silindi.');
    } catch (err: any) { toast.error(err.response?.data?.message || err.message); }
    finally { setConflictInfo(null); }
  };

  // ── Conflict: eski raporu arşivle
  const handleConflictArchive = async () => {
    if (!conflictInfo) return;
    try {
      await api.patch(`/grade-reports/${conflictInfo.existingId}/archive`);
      setReports(prev => prev?.filter(r => r.id !== conflictInfo.existingId) ?? null);
      setArchivedReports(null);
      toast.success('Eski rapor arşive taşındı.');
    } catch (err: any) { toast.error(err.response?.data?.message || err.message); }
    finally { setConflictInfo(null); }
  };

  // ── Tek PDF görüntüle / yazdır
  const handleDownload = async (studentId: string, studentName: string) => {
    try {
      const res = await api.get(`/grade-reports/students/${studentId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      printPdfBlob(blob);
    } catch { toast.error('PDF görüntüleme başarısız.'); }
  };

  // ── Toplu PDF birleştir ve yazdır
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0 || !result) return;
    setBulkDownloading(true);
    try {
      const mergedPdf = await PDFDocument.create();
      const orderedIds = result.students.filter(s => selectedIds.has(s.id)).map(s => s.id);

      for (const id of orderedIds) {
        try {
          const r = await api.get(`/grade-reports/students/${id}/pdf`, { responseType: 'arraybuffer' });
          const srcPdf = await PDFDocument.load(r.data);
          const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          pages.forEach(p => mergedPdf.addPage(p));
        } catch { /* skip */ }
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      printPdfBlob(blob);
    } catch { toast.error('Toplu PDF birleştirme başarısız.'); }
    finally { setBulkDownloading(false); }
  };

  // ── Rapor sil
  const handleDeleteReport = async (id: string) => {
    if (!await confirm('Bu raporu silmek istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/grade-reports/${id}`);
      setReports(prev => prev?.filter(r => r.id !== id) ?? null);
      if (result?.reportId === id) { setResult(null); setGenResults([]); setSelectedIds(new Set()); }
      toast.success('Rapor silindi.');
    } catch (err: any) { toast.error(err.response?.data?.message || err.message); }
  };

  // ── Raporu yükle
  const handleLoadReport = async (id: string) => {
    try {
      const res = await api.get<{ success: boolean; data: any }>(`/grade-reports/${id}`);
      const d = res.data.data;
      setResult({
        reportId: d.id, className: d.className,
        studentCount: d.students.length,
        students: d.students.map((s: any) => ({
          id: s.id, fullName: s.fullName, className: s.className,
          schoolNumber: s.schoolNumber, tcKimlikNo: s.tcKimlikNo,
          failedSubjects: s.failedSubjects,
          dbStudentName: s.student?.fullName, matched: !!s.studentId, pdfPath: s.pdfPath,
        })),
      });
      setGenResults([]); setSelectedIds(new Set()); setActivePanel('none');
    } catch (err: any) { toast.error(err.response?.data?.message || err.message); }
  };

  // ── Seçim yönetimi
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!result) return;
    if (selectedIds.size === result.students.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(result.students.map(s => s.id)));
  };

  const successCount      = genResults.filter(g => g.pdfPath).length;
  const selectedHavePdfs  = result?.students.some(s => selectedIds.has(s.id) && (genResults.find(g => g.id === s.id)?.pdfPath || s.pdfPath));
  const allSelected       = result ? selectedIds.size === result.students.length : false;
  const someSelected      = selectedIds.size > 0;

  return (
    <div className="space-y-4">
      {/* ── 1. Page Header ── */}
      <PageHeader
        title="Başarısızlık Riski Bildirimi"
        description="Not listesi yükleyin — 4 veya daha fazla zayıfı olan öğrenciler için veli bildirim formu oluşturun."
        icon={<LineChart size={24} />}
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                if (activePanel === 'reports') {
                  setActivePanel('none');
                } else {
                  handleLoadReports();
                }
              }}
              disabled={loadingList}
              leftIcon={<ClipboardList size={16} />}
              className={activePanel === 'reports' ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}
            >
              {activePanel === 'reports' ? 'Analize Dön' : 'Kayıtlı Raporlar'}
              {reports && activePanel !== 'reports' && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {reports.length}
                </span>
              )}
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => { 
                if (activePanel === 'archived') {
                  setActivePanel('none');
                } else {
                  handleLoadArchived();
                }
              }}
              leftIcon={<Archive size={16} />}
              className={activePanel === 'archived' ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}
            >
              {activePanel === 'archived' ? 'Arşivi Kapat' : 'Arşiv'}
              {archivedReports && activePanel !== 'archived' && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                  {archivedReports.length}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* ── 2. Yükleme Formu ── */}
      {activePanel === 'none' && !result && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Kart Başlığı */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <UploadCloud size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Not Listesi Yükleme & Analiz</h2>
                <p className="text-xs text-slate-500 font-medium">e-Okul ders notu ortalamaları raporunu yükleyerek 4 ve üzeri zayıfı olan öğrencileri listeleyin.</p>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-lg text-xs font-semibold self-start sm:self-auto">
              <FileSpreadsheet size={14} className="text-amber-600" />
              <span>Rapor Kodu: <strong>OOK07003R035</strong></span>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {/* Açıklama Banner'ı */}
            <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                <Info size={16} />
              </div>
              <div className="text-xs text-amber-900/90 leading-relaxed">
                <p className="font-bold text-amber-950 mb-0.5">Rapor İndirme Adımı:</p>
                <p>
                  <strong>e-Okul &gt; Raporlar</strong> menüsünden <strong className="text-amber-950">«Öğrenci Dönem Sonu Ders Notu Ortalamaları»</strong> (OOK07003R035) raporunu <strong>Excel (.xlsx)</strong> olarak indirip aşağıdaki alana yükleyin.
                </p>
              </div>
            </div>

            {/* Parametre Alanları */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-600" />
                  Komisyon Toplantı Tarihi
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Eğitim Öğretim Yılı
                </label>
                <input
                  type="text"
                  placeholder="2025-2026"
                  value={schoolYear}
                  onChange={e => setSchoolYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 transition"
                />
              </div>
            </div>

            {/* Modern Dosya Seçici / Sürükle-Bırak Alanı */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Rapor Dosyası (Excel / PDF)
              </label>

              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all cursor-pointer relative group ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/60 ring-4 ring-indigo-500/10'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-2.5 group-hover:scale-105 group-hover:bg-indigo-100 transition-all shadow-2xs">
                    <UploadCloud size={24} />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 mb-1">
                    Excel veya PDF dosyasını buraya sürükleyin veya <span className="text-indigo-600 underline underline-offset-2">seçin</span>
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Desteklenen formatlar: <strong className="text-slate-700">.xlsx, .xls, .pdf</strong> (Maks. 25 MB)
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                      {selectedFile.name.endsWith('.pdf') ? (
                        <FileText size={20} className="text-red-500" />
                      ) : (
                        <FileSpreadsheet size={20} className="text-emerald-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {selectedFile.name}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          Hazır
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Belge'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileRef.current?.click()}
                      className="h-8 px-2.5 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
                    >
                      Değiştir
                    </Button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      title="Dosyayı kaldır"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Alt Buton Alanı */}
            <div className="pt-2 flex justify-end">
              <Button 
                onClick={handleAnalyze}
                disabled={!selectedFile || uploading}
                variant="primary"
                leftIcon={uploading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                className="w-full sm:w-auto px-5 text-xs font-semibold"
              >
                {uploading ? 'Not Listesi Analiz Ediliyor...' : 'Listeyi Analiz Et'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Raporlar Paneli ── */}
      {activePanel === 'reports' && reports && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList size={18} className="text-indigo-600" />
              <span>Kayıtlı Raporlar</span>
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold">
              {reports.length} Rapor
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">Henüz kayıtlı rapor bulunmuyor.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Sınıf</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Eğitim Yılı</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Toplantı Tarihi</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Öğrenci Sayısı</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Yüklenme Tarihi</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">İşlem</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {reports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-slate-900">{r.className || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{r.schoolYear}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{new Date(r.meetingDate).toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-900">{r._count.students}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.uploadedAt).toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleLoadReport(r.id)} 
                            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition" 
                            title="Raporu Görüntüle"
                          >
                            <Eye size={15}/>
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteReport(r.id)} 
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition" 
                            title="Raporu Sil"
                          >
                            <Trash2 size={15}/>
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

      {/* ── 4. Arşiv Paneli ── */}
      {activePanel === 'archived' && archivedReports && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-amber-100 bg-amber-50/60 flex items-center justify-between">
            <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <Archive size={18} className="text-amber-700" />
              <span>Arşivlenmiş Raporlar</span>
            </h2>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
              {archivedReports.length} Rapor
            </span>
          </div>

          {archivedReports.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">Arşivlenmiş rapor bulunmuyor.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Sınıf</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Eğitim Yılı</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Toplantı Tarihi</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Öğrenci Sayısı</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Yüklenme Tarihi</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">İşlem</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {archivedReports.map(r => (
                    <tr key={r.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-slate-900">{r.className || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{r.schoolYear}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{new Date(r.meetingDate).toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-900">{r._count.students}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(r.uploadedAt).toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleLoadReport(r.id)} 
                            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition" 
                            title="Raporu Aç"
                          >
                            <Eye size={15}/>
                          </button>
                          <button 
                            type="button"
                            onClick={async () => {
                              if (!await confirm('Bu arşiv raporunu kalıcı olarak silmek istiyor musunuz?')) return;
                              try {
                                await api.delete(`/grade-reports/${r.id}`);
                                setArchivedReports(prev => prev?.filter(x => x.id !== r.id) ?? null);
                                toast.success('Arşiv raporu kalıcı olarak silindi.');
                              } catch (err: any) { toast.error(err.response?.data?.message || err.message); }
                            }} 
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition" 
                            title="Kalıcı Olarak Sil"
                          >
                            <Trash2 size={15}/>
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

      {/* ── 5. Analiz Sonuçları ── */}
      {result && activePanel === 'none' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Analiz Sonuçları</h2>
                {result.className && (
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-full">
                    {result.className}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                <span>
                  <strong className="text-slate-800">{result.studentCount}</strong> öğrencide 4 veya daha fazla zayıf tespit edildi.
                </span>
                {successCount > 0 && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Check size={13} className="text-emerald-600"/> {successCount}/{genResults.length} PDF oluşturuldu
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => { setResult(null); setGenResults([]); setSelectedIds(new Set()); }} 
                variant="outline"
                size="sm"
                className="text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
              >
                Yeni Analiz
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={generating} 
                variant="primary"
                size="sm"
                leftIcon={generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                className="text-xs"
              >
                {generating ? 'Oluşturuluyor...' : 'Tüm PDF\'leri Oluştur'}
              </Button>
            </div>
          </div>

          {result.students.some(s => !s.matched) && (
            <div className="bg-red-50/80 px-4 py-2.5 border-b border-red-100 flex items-center gap-2.5 text-red-800 text-xs">
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
              <span>
                <strong>Uyarı:</strong> Veritabanında eşleştirilemeyen <strong>{result.students.filter(s => !s.matched).length}</strong> öğrenci var. Öğrencilerin yanındaki "Eşleştir" butonuna tıklayarak manuel eşleştirme yapabilirsiniz.
              </span>
            </div>
          )}

          {someSelected && (
            <div className="bg-indigo-50/70 px-4 py-2.5 border-b border-indigo-100 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-indigo-900">✓ {selectedIds.size} öğrenci seçildi</span>
                {selectedHavePdfs && (
                  <Button
                    onClick={handleBulkDownload}
                    disabled={bulkDownloading}
                    variant="primary"
                    size="sm"
                    leftIcon={bulkDownloading ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                    className="h-7 text-xs"
                  >
                    {bulkDownloading ? 'Birleştiriliyor...' : 'Seçilenleri Yazdır'}
                  </Button>
                )}
              </div>
              <button 
                type="button"
                onClick={() => setSelectedIds(new Set())} 
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
              >
                Seçimi Temizle
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-center w-10 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <input 
                      type="checkbox" 
                      checked={allSelected} 
                      onChange={toggleAll} 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                    />
                  </th>
                  <th className="text-left w-10 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">#</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Öğrenci Adı</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Sınıf</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Veritabanı Eşleşmesi</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Zayıf Dersler</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">PDF</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {result.students.map((stu, idx) => {
                  const genRes     = genResults.find(g => g.id === stu.id);
                  const hasPdf     = genRes?.pdfPath || stu.pdfPath;
                  const isSelected = selectedIds.has(stu.id);
                  
                  return (
                    <tr key={stu.id} className={`${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'} transition-colors`}>
                      <td className="px-3 py-2.5 text-center">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => toggleSelect(stu.id)} 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-bold text-slate-900">{stu.fullName}</div>
                        {stu.schoolNumber && (
                          <div className="text-[11px] text-slate-500 font-medium">No: {stu.schoolNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {stu.className ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded text-[11px] font-bold">
                            {stu.className}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {stu.matched ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check size={11} className="text-emerald-600"/> {stu.dbStudentName || 'Eşleşti'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setSelectedStudentToMatch(stu); setMatchModalOpen(true); }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                            title="Manuel eşleştirmek için tıklayın"
                          >
                            ✗ Eşleşme yok (Eşleştir)
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {stu.failedSubjects.map((f, fi) => (
                            <span key={fi} className="px-2 py-0.5 bg-red-50 border border-red-100/90 rounded text-[11px] font-semibold text-red-700">
                              {f.subject} ({f.grade})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {hasPdf ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(stu.id, stu.fullName)}
                            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
                            title="Yazdır"
                          >
                            <Printer size={15} />
                          </button>
                        ) : genRes?.error ? (
                          <span title={genRes.error} className="text-red-500 inline-block"><AlertTriangle size={16}/></span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {genResults.length > 0 && (
            <div className={`p-3.5 flex items-center gap-3 border-t ${successCount === genResults.length ? 'bg-emerald-50/70 border-emerald-100 text-emerald-800' : 'bg-amber-50/70 border-amber-100 text-amber-800'}`}>
              <div className="p-1 rounded-full bg-white shadow-2xs shrink-0">
                {successCount === genResults.length ? <Check size={16} className="text-emerald-600"/> : <AlertTriangle size={16} className="text-amber-600"/>}
              </div>
              <p className="text-xs font-medium">
                <strong className="font-bold">{successCount}/{genResults.length} PDF başarıyla oluşturuldu.</strong> 
                {successCount > 0 && " PDF'leri yazdırmak için satırlardaki butonları kullanabilir veya sol kutucukları işaretleyip 'Seçilenleri Yazdır' yapabilirsiniz."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 6. Çakışma Modalı ── */}
      <ActionModal
        isOpen={!!conflictInfo}
        onClose={() => setConflictInfo(null)}
        title="Mevcut Rapor Bulundu"
        hideSubmit
        cancelText="Şimdilik kalsın"
      >
        <div className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
            <AlertTriangle size={24} />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mb-5 px-3">
            <strong className="font-bold text-slate-900">{conflictInfo?.className}</strong> sınıfına ait kayıtlı bir rapor zaten var.
            Yeni analiz kaydedildi. Eski raporu ne yapmak istersiniz?
          </p>
          <div className="space-y-2.5">
            <Button onClick={handleConflictArchive} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition flex justify-center items-center gap-2 text-xs">
              <Archive size={16}/> Eski raporu arşivle
            </Button>
            <Button onClick={handleConflictDelete} variant="danger" className="w-full py-2.5 text-xs">
              <Trash2 size={16}/> Eski raporu sil
            </Button>
          </div>
        </div>
      </ActionModal>

      {confirmModal}

      {/* ── 7. Manuel Eşleştirme Modalı ── */}
      <ActionModal
        isOpen={matchModalOpen}
        onClose={() => { setMatchModalOpen(false); setStudentSearchQuery(''); setStudentSearchResults([]); }}
        title="Öğrenciyi Veritabanı ile Eşleştir"
        hideSubmit
        width="lg"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-slate-600">
            Karnedeki <strong className="text-slate-900">{selectedStudentToMatch?.fullName}</strong> ({selectedStudentToMatch?.className}) öğrencisi veritabanında bulunamadı. Lütfen aşağıdan arama yaparak doğru öğrenciyi seçin:
          </p>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Öğrenci adı veya numarası ara..."
              value={studentSearchQuery}
              onChange={(e) => handleSearchStudents(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs bg-white"
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
            {isSearchingStudents ? (
              <div className="p-4 flex items-center justify-center text-xs text-slate-500 gap-2">
                <Loader2 size={14} className="animate-spin text-indigo-500" /> Aranıyor...
              </div>
            ) : studentSearchResults.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {studentSearchResults.map(stu => (
                  <li key={stu.id} className="p-2.5 hover:bg-indigo-50/50 flex items-center justify-between transition-colors">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{stu.fullName}</div>
                      <div className="text-[11px] text-slate-500">{stu.schoolNumber} • {stu.className}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleConfirmMatch(stu.id, stu.fullName)}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors border border-indigo-200"
                    >
                      Seç
                    </Button>
                  </li>
                ))}
              </ul>
            ) : studentSearchQuery.length >= 2 ? (
              <div className="p-4 text-center text-xs text-slate-500">Sonuç bulunamadı.</div>
            ) : null}
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
