import toast from 'react-hot-toast';
import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { printPdfBlob } from '../../utils/printPdf';
import { ActionModal } from '../../components/ui/ActionModal';
import { LineChart, UploadCloud, Archive, ClipboardList, Trash2, FileText, Check, AlertTriangle, Eye, Download, Search, Loader2, Printer } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface FailedSubject { subject: string; grade: number; }
interface StudentRecord { id: string; fullName: string; className: string; schoolNumber?: string; tcKimlikNo?: string; failedSubjects: FailedSubject[]; dbStudentName?: string; matched: boolean; pdfPath?: string; }
interface AnalyzeResult { reportId: string; className: string; studentCount: number; students: StudentRecord[]; existingReportId?: string | null; }
interface ReportListItem { id: string; className: string; schoolYear: string; meetingDate: string; uploadedAt: string; _count: { students: number }; }
type GenResult = { id: string; name: string; pdfPath: string | null; error?: string };

export default function GradeReportPage() {
  const { confirm, confirmModal } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);

  const [schoolYear,      setSchoolYear]      = useState('2025 / 2026');
  const [meetingDate,     setMeetingDate]      = useState(new Date().toISOString().slice(0, 10));
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Eşleştirme başarısız.');
    }
  };

  // ── Analiz
  const handleAnalyze = async () => {
    void 0; setResult(null); setGenResults([]); setSelectedIds(new Set());
    const file = fileRef.current?.files?.[0];
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
    void 0; setGenerating(true);
    try {
      const res = await api.post<{ success: boolean; data: GenResult[] }>(
        `/grade-reports/${result.reportId}/generate-pdfs`, {},
        { timeout: 300000 },
      );
      setGenResults(res.data.data);
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
    } catch (err: any) { toast.error(err.response?.data?.message || err.message); }
    finally { setConflictInfo(null); }
  };
  // ── Tek PDF görüntüle
  const handleDownload = async (studentId: string, studentName: string) => {
    try {
      const res = await api.get(`/grade-reports/students/${studentId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      printPdfBlob(blob);
    } catch { toast.error('PDF görüntüleme başarısız.'); }
  };

  // ── Toplu PDF birleştir ve indir
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0 || !result) return;
    setBulkDownloading(true);
    void 0;
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
    <div className="space-y-6">
      <PageHeader
        title="Başarısızlık Riski Bildirimi"
        description="Not listesi yükleyin — 4 veya daha fazla zayıfı olan öğrenciler için veli bildirim formu oluşturun."
        icon={<LineChart size={28} className="text-indigo-600" />}
        actions={
          <div className="flex gap-2">
            <Button 
              onClick={() => activePanel === 'reports' ? setActivePanel('none') : handleLoadReports}
              disabled={loadingList}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activePanel === 'reports' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              <ClipboardList size={18} />
              {activePanel === 'reports' ? 'Analize Dön' : 'Kayıtlı Raporlar'}
              {reports && activePanel !== 'reports' && (
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">{reports.length}</span>
              )}
            </Button>
            <Button 
              onClick={() => { activePanel === 'archived' ? setActivePanel('none') : handleLoadArchived(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activePanel === 'archived' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
            >
              <Archive size={18} />
              {activePanel === 'archived' ? 'Arşivi Kapat' : 'Arşiv'}
            </Button>
          </div>
        }
      />

      

      {/* ── Yükleme formu ── */}
      {activePanel === 'none' && !result && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><UploadCloud size={20} /></div>
            Not Listesi Yükle
          </h2>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mb-6">
            <div className="flex gap-3">
              <FileText className="text-amber-600 shrink-0" size={24} />
              <div>
                <p className="font-bold text-amber-800 text-sm mb-1">Yüklenecek rapor: OOK07003R035</p>
                <p className="text-amber-700 text-sm">e-Okul &gt; Raporlar bölümünden <strong className="font-semibold">«Öğrenci Dönem Sonu Ders Notu Ortalamaları»</strong> raporunu Excel (.xlsx) olarak indirip yükleyin.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Komisyon Toplantı Tarihi</label>
              <input
                type="date"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-shadow text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dosya (Excel / PDF)</label>
              <div className="relative">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf"
                  className="w-full p-2.5 border border-dashed border-gray-300 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer bg-gray-50/50"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleAnalyze}
            disabled={uploading}
            variant="primary"
          >
            {uploading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> Analiz Ediliyor...</> : <><Search size={20} /> Analiz Et</>}
          </Button>
        </div>
      )}

      {/* ── Raporlar paneli ── */}
      {activePanel === 'reports' && reports && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><ClipboardList size={20} /></div>
              Kayıtlı Raporlar
            </h2>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{reports.length} Rapor</span>
          </div>

          {reports.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">Henüz kayıtlı rapor bulunmuyor.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sınıf</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Eğitim Yılı</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Toplantı</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Öğrenci</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Yüklenme</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {reports.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{r.className || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.schoolYear}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.meetingDate).toLocaleDateString('tr-TR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r._count.students}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.uploadedAt).toLocaleDateString('tr-TR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button onClick={() => handleLoadReport(r.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Görüntüle"><Eye size={18}/></Button>
                          <Button onClick={() => handleDeleteReport(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sil"><Trash2 size={18}/></Button>
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

      {/* ── Arşiv paneli ── */}
      {activePanel === 'archived' && archivedReports && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <div className="p-2 bg-white text-amber-600 rounded-lg shadow-sm"><Archive size={20} /></div>
              Arşivlenmiş Raporlar
            </h2>
            <span className="px-3 py-1 bg-white text-amber-700 rounded-full text-xs font-bold shadow-sm">{archivedReports.length} Rapor</span>
          </div>

          {archivedReports.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">Arşivlenmiş rapor bulunmuyor.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sınıf</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Eğitim Yılı</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Toplantı</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Öğrenci</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Yüklenme</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {archivedReports.map(r => (
                    <tr key={r.id} className="hover:bg-amber-50/30 transition-colors group opacity-80 hover:opacity-100">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{r.className || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.schoolYear}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.meetingDate).toLocaleDateString('tr-TR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r._count.students}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.uploadedAt).toLocaleDateString('tr-TR')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" onClick={() => handleLoadReport(r.id)} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Sil"><Eye size={18}/></Button>
                          <Button onClick={async () => {
                            if (!await confirm('Bu arşiv raporunu kalıcı olarak silmek istiyor musunuz?')) return;
                            try {
                              await api.delete(`/grade-reports/${r.id}`);
                              setArchivedReports(prev => prev?.filter(x => x.id !== r.id) ?? null);
                            } catch (err: any) { toast.error(err.response?.data?.message || err.message); }
                          }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Kalıcı Olarak Sil"><Trash2 size={18}/></Button>
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

      {/* ── Analiz sonuçları ── */}
      {result && activePanel === 'none' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900">Analiz Sonuçları</h2>
                {result.className && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-full">
                    {result.className}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className="font-semibold text-gray-700">{result.studentCount}</span> öğrencide 4 veya daha fazla zayıf tespit edildi.
                {successCount > 0 && (
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <Check size={14}/> {successCount}/{genResults.length} PDF oluşturuldu.
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={() => { setResult(null); setGenResults([]); setSelectedIds(new Set()); }} variant="outline">
                Yeni Analiz
              </Button>
              <Button onClick={handleGenerate} disabled={generating} variant="primary">
                {generating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Oluşturuluyor...</> : <><FileText size={16}/> Tüm PDF'leri Oluştur</>}
              </Button>
            </div>
          </div>

          {result.students.some(s => !s.matched) && (
            <div className="bg-red-50 px-6 py-3 border-b border-red-100 flex items-center gap-4 text-red-800 text-sm">
              <AlertTriangle size={18} className="text-red-600" />
              <span><strong>Uyarı:</strong> Veritabanında eşleştirilemeyen {result.students.filter(s => !s.matched).length} öğrenci var. Öğrencilerin yanındaki "Eşleştir" butonuna tıklayarak manuel eşleştirme yapabilirsiniz.</span>
            </div>
          )}

          {someSelected && (
            <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex items-center gap-4 animate-in fade-in">
              <span className="text-sm font-bold text-blue-800">✓ {selectedIds.size} öğrenci seçildi</span>
              {selectedHavePdfs && (
                <Button
                  onClick={handleBulkDownload}
                  disabled={bulkDownloading}
                  variant="primary"
                >
                  {bulkDownloading ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                  {bulkDownloading ? 'Birleştiriliyor...' : 'Seçilenleri Yazdır'}
                </Button>
              )}
              <Button onClick={() => setSelectedIds(new Set())} className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline underline-offset-2">Seçimi Temizle</Button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center w-12"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Öğrenci Adı</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sınıf</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Veritabanı Eşleşmesi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-1/3">Zayıf Dersler</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">PDF</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {result.students.map((stu, idx) => {
                  const genRes   = genResults.find(g => g.id === stu.id);
                  const hasPdf   = genRes?.pdfPath || stu.pdfPath;
                  const isSelected = selectedIds.has(stu.id);
                  
                  return (
                    <tr key={stu.id} className={`${isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50'} transition-colors`}>
                      <td className="px-4 py-3 text-center"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(stu.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></td>
                      <td className="px-4 py-3 text-sm text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">{stu.fullName}</td>
                      <td className="px-4 py-3">
                        {stu.className ? <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-xs font-bold">{stu.className}</span> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {stu.matched ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            <Check size={12}/> {stu.dbStudentName || 'Eşleşti'}
                          </span>
                        ) : (
                          <Button
                            onClick={() => { setSelectedStudentToMatch(stu); setMatchModalOpen(true); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                            title="Manuel eşleştirmek için tıklayın"
                          >
                            ✗ Eşleşme yok (Eşleştir)
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {stu.failedSubjects.map((f, fi) => (
                            <span key={fi} className="px-2 py-1 bg-red-50 border border-red-100 rounded text-xs font-semibold text-red-700">
                              {f.subject} ({f.grade})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasPdf ? (
                          <Button
                            onClick={() => handleDownload(stu.id, stu.fullName)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Yazdır"
                          >
                            <Printer size={18} />
                          </Button>
                        ) : genRes?.error ? (
                          <span title={genRes.error} className="text-red-500"><AlertTriangle size={18}/></span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {genResults.length > 0 && (
            <div className={`p-4 flex items-center gap-3 border-t ${successCount === genResults.length ? 'bg-green-50 border-green-100 text-green-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
              <div className="p-1.5 rounded-full bg-white shadow-sm shrink-0">
                {successCount === genResults.length ? <Check size={20} className="text-green-600"/> : <AlertTriangle size={20} className="text-amber-600"/>}
              </div>
              <p className="text-sm font-medium">
                <strong className="font-bold">{successCount}/{genResults.length} PDF başarıyla oluşturuldu.</strong> 
                {successCount > 0 && " PDF'leri indirmek için tablo satırlarındaki butonu kullanın veya satırları seçip 'Tek PDF'e İndir' yapın."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Çakışma modali ── */}
      <ActionModal
        isOpen={!!conflictInfo}
        onClose={() => setConflictInfo(null)}
        title="Mevcut Rapor Bulundu"
        hideSubmit
        cancelText="Şimdilik kalsın"
      >
        <div className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <p className="text-sm text-gray-600 mb-6 px-4">
            <strong className="font-bold text-gray-900">{conflictInfo?.className}</strong> sınıfına ait kayıtlı bir rapor zaten var.
            Yeni analiz kaydedildi. Eski raporu ne yapmak istersiniz?
          </p>
          <div className="space-y-3">
            <Button onClick={handleConflictArchive} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition flex justify-center items-center gap-2">
              <Archive size={18}/> Eski raporu arşivle
            </Button>
            <Button onClick={handleConflictDelete} variant="danger">
              <Trash2 size={18}/> Eski raporu sil
            </Button>
          </div>
        </div>
      </ActionModal>

      {confirmModal}
      {/* ── Manuel Eşleştirme Modalı ── */}
      <ActionModal
        isOpen={matchModalOpen}
        onClose={() => { setMatchModalOpen(false); setStudentSearchQuery(''); setStudentSearchResults([]); }}
        title="Öğrenciyi Veritabanı ile Eşleştir"
        hideSubmit
        width="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Karnedeki <strong className="text-gray-900">{selectedStudentToMatch?.fullName}</strong> ({selectedStudentToMatch?.className}) öğrencisi veritabanında bulunamadı. Lütfen aşağıdan arama yaparak doğru öğrenciyi seçin.
          </p>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Öğrenci adı veya numarası ara..."
              value={studentSearchQuery}
              onChange={(e) => handleSearchStudents(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
            {isSearchingStudents ? (
              <div className="p-4 flex items-center justify-center text-sm text-gray-500 gap-2">
                <Loader2 size={16} className="animate-spin" /> Aranıyor...
              </div>
            ) : studentSearchResults.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {studentSearchResults.map(stu => (
                  <li key={stu.id} className="p-3 hover:bg-gray-50 flex items-center justify-between transition-colors">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{stu.fullName}</div>
                      <div className="text-xs text-gray-500">{stu.schoolNumber} • {stu.className}</div>
                    </div>
                    <Button
                      onClick={() => handleConfirmMatch(stu.id, stu.fullName)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                    >
                      Seç
                    </Button>
                  </li>
                ))}
              </ul>
            ) : studentSearchQuery.length >= 2 ? (
              <div className="p-4 text-center text-sm text-gray-500">Sonuç bulunamadı.</div>
            ) : null}
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
