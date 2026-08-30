import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FileText, Search, Plus, Filter, RefreshCw, Send, History, Trash2, Smartphone, ShieldAlert, CheckCircle2, Clock, MapPin, Printer, Mail } from 'lucide-react';
import { printPdfBlob } from '../../utils/printPdf';
import { PageHeader } from '../../components/ui/PageHeader';
import { Student, AbsenteeismRecord } from './absenteeism/types';
import { AbsenteeismTable } from './absenteeism/AbsenteeismTable';
import { AbsenteeismUploadModal } from './absenteeism/AbsenteeismUploadModal';
import { AbsenteeismWhatsAppModal } from './absenteeism/AbsenteeismWhatsAppModal';
import { Button } from '../../components/ui/Button';

export default function AbsenteeismPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [records, setRecords] = useState<AbsenteeismRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);

  // List Search
  const [listSearch, setListSearch] = useState('');
  const prevSearchRef = useRef('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);

  // Upload Form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [warningNumber, setWarningNumber] = useState(1);
  const [warningLoading, setWarningLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isBep, setIsBep] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp 
  const [waConnected, setWaConnected] = useState(false);
  const [waSendLoading, setWaSendLoading] = useState('');
  const [waRecord, setWaRecord] = useState<AbsenteeismRecord | null>(null);
  const [waExcusedDays, setWaExcusedDays] = useState('');
  const [waUnexcusedDays, setWaUnexcusedDays] = useState('');
  const [waPreviewData, setWaPreviewData] = useState<{
    messages: { parent: string; phone: string; message: string }[];
    hasPreviewImage: boolean;
  } | null>(null);
  const [waPreviewLoading, setWaPreviewLoading] = useState(false);
  const [waPreviewError, setWaPreviewError] = useState('');
  const [waSelectedParents, setWaSelectedParents] = useState<Set<string>>(new Set());

  // Crop
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(50);
  const [fullPageImage, setFullPageImage] = useState<string | null>(null);
  const [fullPageLoading, setFullPageLoading] = useState(false);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const cropDragRef = useRef<'top' | 'bottom' | null>(null);
  const cropTopRef = useRef(0);
  const cropBottomRef = useRef(50);

  useEffect(() => {
    if (listSearch !== prevSearchRef.current) {
      prevSearchRef.current = listSearch;
      setPage(1);
    }
  }, [listSearch]);

  useEffect(() => {
    loadData();
    api.get('/whatsapp/status').then(r => setWaConnected(r.data.data.status === 'connected')).catch(() => {});
  }, [page, listSearch]);

  useEffect(() => {
    if (showUploadModal && students.length === 0) {
      api.get('/students?limit=2000').then(r => setStudents(r.data.data.students)).catch(() => {});
    }
  }, [showUploadModal]);

  const loadData = async () => {
    setLoading(true);
    try {
      const isSearch = !!listSearch.trim();
      const searchParam = isSearch
        ? `&search=${encodeURIComponent(listSearch.trim())}&limit=1000`
        : `&limit=20&page=${page}`;
      const recordsRes = await api.get(`/absenteeism?${searchParam}`);
      setRecords(recordsRes.data.data.records);
      if (isSearch) setPagination(null);
      else setPagination(recordsRes.data.data.pagination);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedStudentId('');
    setStudentSearch('');
    setWarningNumber(1);
    setPdfFile(null);
    setIsBep(false);
    setUploadError('');
  };

  const fetchWarningCount = async (studentId: string) => {
    setWarningLoading(true);
    try {
      const res = await api.get(`/absenteeism/warning-count/${studentId}`);
      setWarningNumber(res.data.data.nextWarning);
    } catch {
      setWarningNumber(1);
    } finally {
      setWarningLoading(false);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !selectedStudentId) return;
    setUploadError('');
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('studentId', selectedStudentId);
      formData.append('warningNumber', String(warningNumber));
      formData.append('isBep', String(isBep));
      await api.post('/absenteeism', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      setShowUploadModal(false);
      resetUploadForm();
      loadData();
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Yükleme başarısız.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Devamsızlık kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/absenteeism/${id}`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Silme işlemi başarısız.');
    }
  };

  const handleWaPreviewOpen = async (record: AbsenteeismRecord) => {
    setWaRecord(record);
    setWaExcusedDays(record.excusedDays != null ? String(record.excusedDays) : '');
    setWaUnexcusedDays(record.unexcusedDays != null ? String(record.unexcusedDays) : '');
    setWaPreviewData(null);
    setWaPreviewError('');
    setShowWaModal(true);
    
    setCropTop(0); setCropBottom(50);
    cropTopRef.current = 0; cropBottomRef.current = 50;
    setFullPageImage(null);
    
    try {
      setWaPreviewLoading(true);
      const res = await api.post(`/whatsapp/preview/absenteeism/${record.id}`, {
        excusedDays: record.excusedDays != null ? record.excusedDays : '',
        unexcusedDays: record.unexcusedDays != null ? record.unexcusedDays : '',
      });
      setWaPreviewData(res.data.data);
      setWaSelectedParents(new Set((res.data.data.messages as { phone: string }[]).map((m) => m.phone)));
      
      if (res.data.data.hasPreviewImage) {
        setFullPageLoading(true);
        api.get(`/whatsapp/full-image/absenteeism/${record.id}`)
          .then(imgRes => setFullPageImage(imgRes.data.data.image))
          .catch(() => {})
          .finally(() => setFullPageLoading(false));
      }
    } catch (err: any) {
      setWaPreviewError(err.response?.data?.message || 'Önizleme yüklenemedi.');
    } finally {
      setWaPreviewLoading(false);
    }
  };

  const handleWaPreviewRefresh = async () => {
    if (!waRecord) return;
    setWaPreviewLoading(true);
    setWaPreviewError('');
    try {
      const res = await api.post(`/whatsapp/preview/absenteeism/${waRecord.id}`, {
        excusedDays: waExcusedDays,
        unexcusedDays: waUnexcusedDays,
      });
      setWaPreviewData(res.data.data);
      setWaSelectedParents(new Set((res.data.data.messages as { phone: string }[]).map((m) => m.phone)));
    } catch (err: any) {
      setWaPreviewError(err.response?.data?.message || 'Önizleme yüklenemedi.');
    } finally {
      setWaPreviewLoading(false);
    }
  };

  const handleCropMouseDown = (type: 'top' | 'bottom') => (e: React.MouseEvent) => {
    e.preventDefault();
    cropDragRef.current = type;
    const onMove = (me: MouseEvent) => {
      if (!cropContainerRef.current || !cropDragRef.current) return;
      const rect = cropContainerRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, (me.clientY - rect.top) / rect.height * 100));
      if (cropDragRef.current === 'top') {
        const newTop = Math.min(pct, cropBottomRef.current - 5);
        cropTopRef.current = newTop;
        setCropTop(newTop);
      } else {
        const newBottom = Math.max(pct, cropTopRef.current + 5);
        cropBottomRef.current = newBottom;
        setCropBottom(newBottom);
      }
    };
    const onUp = () => {
      cropDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleWaSend = async () => {
    if (!waRecord) return;
    const recordId = waRecord.id;
    setWaSendLoading(recordId);
    try {
      const res = await api.post(`/whatsapp/send/absenteeism/${waRecord.id}`, {
        excusedDays: waExcusedDays,
        unexcusedDays: waUnexcusedDays,
        selectedPhones: Array.from(waSelectedParents),
        cropTop: waPreviewData?.hasPreviewImage ? cropTop : undefined,
        cropBottom: waPreviewData?.hasPreviewImage ? cropBottom : undefined,
      });
      const results = res.data.data.results as { parent: string; phone: string; ok: boolean; error?: string }[];
      const failed = results.filter(r => !r.ok);
      setShowWaModal(false);
      
      if (results.some(r => r.ok)) {
        setRecords(prev => prev.map(rec => rec.id === recordId ? { ...rec, waSentAt: new Date().toISOString() } : rec));
      }
      
      if (failed.length === 0) {
        toast(`✅ Mesaj ve dosya ${results.length} veliye başarıyla gönderildi.`);
      } else {
        const msg = failed.map(r => `${r.parent}: ${r.error}`).join('\n');
        toast(`⚠️ ${results.length - failed.length} gönderildi, ${failed.length} başarısız:\n${msg}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gönderim başarısız.');
    } finally {
      setWaSendLoading('');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const unsent = records.filter(r => !r.waSentAt);
  const sent = records.filter(r => r.waSentAt);

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Devamsızlık Mektubu Gönderimi"
        description="Öğrenci devamsızlık mektuplarını PDF olarak yükleyin ve WhatsApp üzerinden velilere otomatik gönderin."
        icon={<Mail size={28} className="text-indigo-600" />}
        actions={
          <Button onClick={() => { resetUploadForm(); setShowUploadModal(true); }} variant="primary" leftIcon={<Plus size={18} />}>
            Mektup Yükle
          </Button>
        }
      />

      {/* 2. Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Search */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Öğrenci ara (ad, numara, sınıf)..."
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Data List (Custom Grouping Table) */}
        {loading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Kayıtlar Yükleniyor...</div>
        ) : (
          <AbsenteeismTable
            records={records}
            listSearch={listSearch}
            waConnected={waConnected}
            waSendLoading={waSendLoading}
            formatDate={formatDate}
            onPreview={handleWaPreviewOpen}
            onDelete={handleDelete}
          />
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-3">
            <Button disabled={page === 1} onClick={() => setPage(page - 1)} variant="outline">Geri</Button>
            <span className="text-sm text-gray-600 font-medium">Sayfa {page} / {pagination.totalPages}</span>
            <Button disabled={page === pagination.totalPages} onClick={() => setPage(page + 1)} variant="outline">İleri</Button>
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* 1. Upload Modal */}
      <AbsenteeismUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUpload}
        uploadError={uploadError}
        studentSearch={studentSearch}
        setStudentSearch={setStudentSearch}
        showStudentDropdown={showStudentDropdown}
        setShowStudentDropdown={setShowStudentDropdown}
        selectedStudentId={selectedStudentId}
        setSelectedStudentId={setSelectedStudentId}
        students={students}
        fetchWarningCount={fetchWarningCount}
        warningLoading={warningLoading}
        warningNumber={warningNumber}
        setWarningNumber={setWarningNumber}
        pdfFile={pdfFile}
        setPdfFile={setPdfFile}
        isBep={isBep}
        setIsBep={setIsBep}
      />

      {/* 2. WhatsApp Preview Modal */}
      <AbsenteeismWhatsAppModal
        isOpen={showWaModal}
        onClose={() => setShowWaModal(false)}
        onSubmit={handleWaSend}
        waSendLoading={waSendLoading}
        waRecord={waRecord}
        waExcusedDays={waExcusedDays}
        setWaExcusedDays={setWaExcusedDays}
        waUnexcusedDays={waUnexcusedDays}
        setWaUnexcusedDays={setWaUnexcusedDays}
        onPreviewRefresh={handleWaPreviewRefresh}
        waPreviewLoading={waPreviewLoading}
        waPreviewError={waPreviewError}
        waPreviewData={waPreviewData}
        fullPageLoading={fullPageLoading}
        fullPageImage={fullPageImage}
        cropContainerRef={cropContainerRef}
        cropTop={cropTop}
        cropBottom={cropBottom}
        handleCropMouseDown={handleCropMouseDown}
        waSelectedParents={waSelectedParents}
        setWaSelectedParents={setWaSelectedParents}
      />
      
      {confirmModal}
    </div>
  );
}


