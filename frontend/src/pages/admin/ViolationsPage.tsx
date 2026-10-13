import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { ActionModal } from '../../components/ui/ActionModal';
import { ViolationsManualAddModal } from './ViolationsManualAddModal';
import { 
  AlertTriangle, 
  ClipboardList, 
  Search, 
  Eye, 
  FileText, 
  Smartphone, 
  Trash2, 
  Camera, 
  UserPlus, 
  FileSearch, 
  ShieldAlert, 
  ChevronRight, 
  ChevronDown,
  UploadCloud,
  CheckCircle2,
  Calendar,
  X,
  Loader2,
  Info,
  Hash,
  Users
} from 'lucide-react';

import {
  MatchedStudent, UnmatchedLine, UploadResult, UploadRecord,
  StudentOption, ViolationStats, StudentViolation, WarningSuggestion,
  ExistingWarning, StaffMember,
  VIOLATION_TYPES, BEHAVIOR_MAP, getTypeLabel, getTypeColor, formatDate,
} from './violations/types';
import { ViolationStatsHeader } from './violations/ViolationStatsHeader';
import { ViolationTabBar } from './violations/ViolationTabBar';
import { Button } from '../../components/ui/Button';

export default function ViolationsPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [tab, setTab] = useState<'entry' | 'history'>('entry');
  const [entryMethod, setEntryMethod] = useState<'photo' | 'manual' | null>(null);
  const [historyView, setHistoryView] = useState<'uploads' | 'student'>('uploads');
  const [stats, setStats] = useState<ViolationStats | null>(null);

  // Upload
  const [uploading, setUploading]   = useState(false);
  const [result, setResult]         = useState<UploadResult | null>(null);
  
  const [type, setType]             = useState('KIYAFET');
  const [description, setDescription] = useState('');
  const [violationDate, setViolationDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed]   = useState(false);
  const [bulkWarningLoading, setBulkWarningLoading] = useState(false);
  const [creatingWarning, setCreatingWarning] = useState('');

  // Manual add in results
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualSearch, setManualSearch]   = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [allStudents, setAllStudents]     = useState<StudentOption[]>([]);

  // Manual text tab
  const [manualText, setManualText]       = useState('');
  const [manualType, setManualType]       = useState('KIYAFET');
  const [manualDate, setManualDate]       = useState(new Date().toISOString().slice(0, 10));
  const [manualDesc, setManualDesc]       = useState('');
  const [manualProcessing, setManualProcessing] = useState(false);

  // History tab
  const [history, setHistory]           = useState<UploadRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedUploadId, setExpandedUploadId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, UploadRecord | null>>({});
  const [expandDetailLoading, setExpandDetailLoading] = useState<string | null>(null);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
  const [historyWarningLoading, setHistoryWarningLoading] = useState('');
  const [historyBulkWarningLoading, setHistoryBulkWarningLoading] = useState('');
  const [historyConfirmLoading, setHistoryConfirmLoading] = useState('');
  const [hFilterType, setHFilterType]   = useState('');
  const [hFilterFrom, setHFilterFrom]   = useState('');
  const [hFilterTo, setHFilterTo]       = useState('');

  // Student history tab
  const [stuSearch, setStuSearch]       = useState('');
  const [stuSelected, setStuSelected]   = useState<StudentOption | null>(null);
  const [stuHistory, setStuHistory]     = useState<any>(null);
  const [stuLoading, setStuLoading]     = useState(false);
  const [stuWarningLoading, setStuWarningLoading] = useState('');

  const [createdWarnings, setCreatedWarnings] = useState<Set<string>>(new Set());

  // Staff
  const [assistantPrincipals, setAssistantPrincipals] = useState<StaffMember[]>([]);
  const [counselors, setCounselors] = useState<StaffMember[]>([]);
  const [classTeachers, setClassTeachers] = useState<StaffMember[]>([]);

  // Warning modal 
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningModalTargets, setWarningModalTargets] = useState<any[]>([]);
  const [wIssuedBy, setWIssuedBy] = useState('');
  const [wClassTeacherName, setWClassTeacherName] = useState('');
  const [wCounselorName, setWCounselorName] = useState('');
  const [wGuidanceNote, setWGuidanceNote] = useState('');
  const [wLoading, setWLoading] = useState(false);

  useEffect(() => {
    loadStudents();
    loadStaff();
    loadStats();
  }, []);

  useEffect(() => {
    if (tab === 'history') {
      loadHistory();
      setExpandedDetails({});
      setExpandedUploadId(null);
    }
  }, [tab]);

  const loadStats = async () => { try { const res = await api.get('/violations/stats'); setStats(res.data.data); } catch {} };
  const loadStudents = async () => { try { const res = await api.get('/students?limit=2000'); setAllStudents(res.data.data.students); } catch {} };
  const loadStaff = async () => {
    try {
      const res = await api.get('/staff');
      const all: StaffMember[] = res.data.data.staff;
      setAssistantPrincipals(all.filter(s => s.role === 'MUDUR_YARDIMCISI'));
      setCounselors(all.filter(s => s.role === 'REHBER_OGRETMEN'));
      setClassTeachers(all.filter(s => s.role === 'SINIF_REHBER_OGRETMEN'));
    } catch {}
  };
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/violations/uploads?limit=100');
      setHistory(res.data.data.records);
    } catch {} finally { setHistoryLoading(false); }
  };

  const handleToggleExpand = async (uploadId: string) => {
    if (expandedUploadId === uploadId) { setExpandedUploadId(null); return; }
    setExpandedUploadId(uploadId);
    if (expandedDetails[uploadId]) return; 
    setExpandDetailLoading(uploadId);
    try {
      const res = await api.get(`/violations/uploads/${uploadId}`);
      setExpandedDetails(prev => ({ ...prev, [uploadId]: res.data.data }));
    } catch {
      setExpandedDetails(prev => ({ ...prev, [uploadId]: null }));
    } finally { setExpandDetailLoading(null); }
  };

  const handleHistoryCreateWarning = (uploadId: string, uploadType: string, studentId: string, studentName: string, studentClassName: string, prevViolations: number) => {
    setWarningModalTargets([{ uploadId, uploadType, studentId, studentName, studentClassName, prevViolations }]);
    const ct = classTeachers.find(t => t.className?.toLocaleLowerCase('tr-TR').trim() === studentClassName?.toLocaleLowerCase('tr-TR').trim());
    setWClassTeacherName(ct ? ct.name : '');
    if (counselors.length === 1) setWCounselorName(counselors[0].name); else setWCounselorName('');
    setWIssuedBy(''); setWGuidanceNote(''); setShowWarningModal(true);
  };

  const handleHistoryBulkWarning = async (upload: UploadRecord) => {
    const detail = expandedDetails[upload.id];
    if (!detail?.records) return;
    const targets = detail.records.filter(r => r.suggestWarning && r.isConfirmed && !r.hasWarning);
    if (targets.length === 0) { toast('Uyarı önerilen ve henüz uyarı almamış onaylı öğrenci yok.'); return; }
    if (!await confirm(`${targets.length} öğrenci için toplu yazılı uyarı oluşturulacak. Devam etmek için personel seçimi yapılacak.`)) return;
    setWarningModalTargets(targets.map(r => ({ uploadId: upload.id, uploadType: upload.type, studentId: r.studentId, studentName: r.student.fullName, studentClassName: r.student.className, prevViolations: r.previousViolations ?? 0 })));
    setWClassTeacherName('');
    if (counselors.length === 1) setWCounselorName(counselors[0].name); else setWCounselorName('');
    setWIssuedBy(''); setWGuidanceNote(''); setShowWarningModal(true);
  };

  const handleConfirmWarningModal = async () => {
    if (warningModalTargets.length === 0) return;
    setWLoading(true);
    const isBulk = warningModalTargets.length > 1;
    let success = 0; const errors: string[] = [];
    for (const t of warningModalTargets) {
      const bCode = BEHAVIOR_MAP[t.uploadType] || 'M164_1_B';
      try {
        await api.post('/warnings', { studentId: t.studentId, behaviorCode: bCode, description: `${getTypeLabel(t.uploadType)} - Tekrarlanan ihlal (${t.prevViolations + 1}. kez)`, issuedBy: wIssuedBy || undefined, classTeacherName: wClassTeacherName || undefined, schoolCounselorName: wCounselorName || undefined, guidanceNote: wGuidanceNote || undefined });
        success++;
        if (!isBulk) {
          setExpandedDetails(prev => {
            const detail = prev[t.uploadId];
            if (!detail?.records) return prev;
            return { ...prev, [t.uploadId]: { ...detail, records: detail.records.map(r => r.studentId === t.studentId ? { ...r, hasWarning: true } : r) } };
          });
        }
      } catch (err: any) { errors.push(`${t.studentName}: ${err.response?.data?.message || 'Hata'}`); }
    }
    setWLoading(false); setShowWarningModal(false);
    if (isBulk) {
      const uploadId = warningModalTargets[0].uploadId;
      setExpandedDetails(prev => { const n = { ...prev }; delete n[uploadId]; return n; });
      if (errors.length === 0) toast.success(`✅ ${success} öğrenci için yazılı uyarı oluşturuldu.`);
      else toast.error(`✅ ${success} başarılı, ${errors.length} başarısız:\n${errors.join('\n')}`);
    } else if (errors.length > 0) {
      toast.error(errors[0]);
    } else {
      toast.success(`${warningModalTargets[0].studentName} için yazılı uyarı oluşturuldu!`);
    }
  };

  const handleHistoryConfirm = async (uploadId: string, pendingIds: string[]) => {
    if (pendingIds.length === 0) return;
    setHistoryConfirmLoading(uploadId);
    try {
      await api.post(`/violations/${uploadId}/confirm`, { violationIds: pendingIds });
      setExpandedDetails(prev => {
        const detail = prev[uploadId];
        if (!detail?.records) return prev;
        return { ...prev, [uploadId]: { ...detail, records: detail.records.map(r => pendingIds.includes(r.id) ? { ...r, isConfirmed: true } : r) } };
      });
      setHistory(prev => prev.map(h => {
        if (h.id !== uploadId || !h.records) return h;
        return { ...h, records: h.records.map(r => pendingIds.includes(r.id) ? { ...r, isConfirmed: true } : r) };
      }));
      loadStats();
      toast.success('İhlaller onaylandı.');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Onaylama başarısız.'); } finally { setHistoryConfirmLoading(''); }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!await confirm('Bu yükleme ve ilişkili tüm ihlal kayıtları silinecek. Emin misiniz?')) return;
    setDeletingUploadId(uploadId);
    try {
      await api.delete(`/violations/uploads/${uploadId}`);
      setHistory(prev => prev.filter(h => h.id !== uploadId));
      if (expandedUploadId === uploadId) setExpandedUploadId(null);
      loadStats();
      toast.success('Yükleme kaydı silindi.');
    } catch (err: any) {
      if (err.response?.status === 404) setHistory(prev => prev.filter(h => h.id !== uploadId));
      else toast.error(err.response?.data?.message || 'Silme işlemi başarısız.');
    } finally { setDeletingUploadId(null); }
  };

  const handleHistoryRemoveViolation = async (uploadId: string, violationId: string, studentName: string) => {
    if (!await confirm(`${studentName} isimli öğrencinin bu ihlal kaydı silinecek. Emin misiniz?`)) return;
    try {
      await api.delete(`/violations/record/${violationId}`);
      setExpandedDetails(prev => {
        const detail = prev[uploadId];
        if (!detail?.records) return prev;
        const newRecords = detail.records.filter(r => r.id !== violationId);
        return { ...prev, [uploadId]: { ...detail, records: newRecords } };
      });
      setHistory(prev => prev.map(h => {
        if (h.id !== uploadId || !h.records) return h;
        return { ...h, records: h.records.filter(r => r.id !== violationId), studentCount: Math.max(0, h.studentCount - 1) };
      }));
      toast.success(`${studentName} kaydı başarıyla silindi.`);
      loadStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Silme işlemi başarısız.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { 
      setSelectedFile(file); 
      setPreviewUrl(URL.createObjectURL(file)); 
      setResult(null); 
      setConfirmed(false); 
    }
  };

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
      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setConfirmed(false);
      } else {
        toast.error('Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, WebP).');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true); 
    setResult(null); 
    setConfirmed(false); 
    setSelectedIds(new Set());
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('type', type);
    formData.append('violationDate', violationDate);
    if (description) formData.append('description', description);
    try {
      const res = await api.post('/violations/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
      const data: UploadResult = res.data.data;
      setResult(data);
      setSelectedIds(new Set(data.matched.map(m => m.id)));
      loadStats();
      toast.success('Fotoğraf başarıyla analiz edildi.');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Yükleme başarısız. Lütfen tekrar deneyin.'); } finally { setUploading(false); }
  };

  const toggleSelection = (id: string) => { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const handleConfirm = async () => {
    if (!result || selectedIds.size === 0) return;
    setConfirming(true);
    try {
      await api.post(`/violations/${result.uploadId}/confirm`, { violationIds: Array.from(selectedIds) });
      setConfirmed(true);
      loadStats();
      toast.success('Seçilen ihlaller onaylandı ve kaydedildi.');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Onaylama başarısız.'); } finally { setConfirming(false); }
  };

  const handleBulkCreateWarnings = async () => {
    if (!result) return;
    const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
    const targets = result.matched.filter(m => m.suggestWarning && selectedIds.has(m.id) && !createdWarnings.has(`${m.studentId}_${bCode}`));
    if (targets.length === 0) { toast('Uyarı önerilen tekrar ihlalci öğrenci yok.'); return; }
    if (!await confirm(`${targets.length} öğrenci için toplu yazılı uyarı oluşturulacak. Onaylıyor musunuz?`)) return;
    setBulkWarningLoading(true);
    let success = 0; const errors: string[] = [];
    for (const s of targets) {
      try {
        await api.post('/warnings', { studentId: s.studentId, behaviorCode: bCode, description: `${getTypeLabel(result.type)} - Tekrarlanan ihlal (${s.previousViolations + 1}. kez)` });
        success++;
        setCreatedWarnings(prev => new Set(prev).add(`${s.studentId}_${bCode}`));
      } catch (err: any) { errors.push(`${s.student.fullName}: ${err.response?.data?.message || 'Hata'}`); }
    }
    setBulkWarningLoading(false);
    if (errors.length === 0) toast.success(`✅ ${success} öğrenci için yazılı uyarı oluşturuldu.`);
    else toast.error(`✅ ${success} başarılı, ${errors.length} başarısız:\n${errors.join('\n')}`);
  };

  const handleCreateWarning = async (student: MatchedStudent) => {
    if (!result) return;
    setCreatingWarning(student.studentId);
    try {
      await api.post('/warnings', { studentId: student.studentId, behaviorCode: BEHAVIOR_MAP[result.type] || 'M164_1_B', description: `${getTypeLabel(result.type)} - Tekrarlanan ihlal (${student.previousViolations + 1}. kez)` });
      const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
      setCreatedWarnings(prev => new Set(prev).add(`${student.studentId}_${bCode}`));
      toast.success(`${student.student.fullName} için yazılı uyarı oluşturuldu!`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Uyarı oluşturulamadı.'); } finally { setCreatingWarning(''); }
  };

  const handleRemoveViolation = async (violationId: string) => {
    if (!result) return;
    try {
      await api.delete(`/violations/record/${violationId}`);
      setResult({ ...result, matched: result.matched.filter(m => m.id !== violationId), summary: { ...result.summary, matchedCount: result.summary.matchedCount - 1 } });
      setSelectedIds(prev => { const n = new Set(prev); n.delete(violationId); return n; });
    } catch {}
  };

  const handleManualAdd = async (studentId: string) => {
    if (!result) return;
    setManualLoading(true);
    try {
      const res = await api.post(`/violations/${result.uploadId}/manual`, { studentId, type: result.type, violationDate: result.violationDate });
      const nr = res.data.data;
      setResult({ ...result, matched: [...result.matched, { id: nr.id, studentId: nr.studentId, student: nr.student, matchedText: '(Manuel eklendi)', matchedBy: 'MANUAL', confidence: 100, previousViolations: nr.previousViolations, suggestWarning: nr.suggestWarning }], summary: { ...result.summary, matchedCount: result.summary.matchedCount + 1 } });
      setSelectedIds(prev => new Set(prev).add(nr.id));
      setShowManualAdd(false); 
      setManualSearch('');
      toast.success('Öğrenci listeye eklendi.');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Ekleme başarısız.'); } finally { setManualLoading(false); }
  };

  const handleReset = () => {
    setSelectedFile(null); 
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setResult(null); 
    setConfirmed(false); 
    setSelectedIds(new Set()); 
    setDescription(''); 
    setManualText(''); 
    setEntryMethod(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcessManualText = async () => {
    if (!manualText.trim()) return;
    setManualProcessing(true); 
    setResult(null); 
    setConfirmed(false); 
    setSelectedIds(new Set());
    try {
      const res = await api.post('/violations/process-text', { text: manualText, type: type, violationDate: violationDate, description: manualDesc || undefined });
      const data: UploadResult = res.data.data;
      setResult(data);
      setSelectedIds(new Set(data.matched.map(m => m.id)));
      loadStats();
      toast.success('Numaralar başarıyla eşleştirildi.');
    } catch (err: any) { toast.error(err.response?.data?.message || 'İşlem başarısız. Lütfen tekrar deneyin.'); } finally { setManualProcessing(false); }
  };

  const handleStudentSearch = async (student: StudentOption) => {
    setStuSelected(student); 
    setStuLoading(true); 
    setStuHistory(null);
    try { const res = await api.get(`/violations/student/${student.id}`); setStuHistory(res.data.data); } catch (err: any) { toast.error(err.response?.data?.message || 'Sorgu başarısız.'); } finally { setStuLoading(false); }
  };

  const reloadStudentHistory = async () => {
    if (!stuSelected) return;
    try { const res = await api.get(`/violations/student/${stuSelected.id}`); setStuHistory(res.data.data); } catch {}
  };

  const handleStuCreateWarning = async (suggestion: WarningSuggestion) => {
    if (!stuSelected || !stuHistory) return;
    setStuWarningLoading(suggestion.type);
    try {
      await api.post('/warnings', { studentId: stuSelected.id, behaviorCode: suggestion.behaviorCode, description: `${getTypeLabel(suggestion.type)} - Tekrarlanan ihlal (${suggestion.confirmedCount}. kez)` });
      setCreatedWarnings(prev => new Set(prev).add(`${stuSelected.id}_${suggestion.behaviorCode}`));
      await reloadStudentHistory();
      toast.success(`${stuHistory.student.fullName} için yazılı uyarı oluşturuldu!`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Uyarı oluşturulamadı.'); } finally { setStuWarningLoading(''); }
  };

  const filteredHistory = history.filter(h => {
    if (hFilterType && h.type !== hFilterType) return false;
    if (hFilterFrom && new Date(h.violationDate) < new Date(hFilterFrom)) return false;
    if (hFilterTo && new Date(h.violationDate) > new Date(hFilterTo + 'T23:59:59')) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <PageHeader
        title="İhlal Takip Sistemi"
        description="Öğrenci kılık-kıyafet ve okul kuralı ihlallerini fotoğraf (OCR) veya okul numarasıyla kaydedin, takip edin ve gerektiğinde tutanak oluşturun."
        icon={<ShieldAlert size={24} />}
        actions={<ViolationStatsHeader stats={stats} />}
      />

      {/* 2. Main Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <ViolationTabBar
          activeTab={tab}
          onTabChange={(newTab) => {
            setTab(newTab);
            if (newTab === 'history') {
              loadHistory();
              setExpandedDetails({});
              setExpandedUploadId(null);
            }
          }}
        />

        <div className="p-4 sm:p-5">
          {tab === 'entry' && (
            <div className="space-y-4">
              {!result && (
                <>
                  {/* ADIM 1: İhlal Parametreleri */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        1
                      </span> 
                      <h3 className="text-sm font-bold text-slate-900">
                        İhlal Türü ve Tarih Bilgisi
                      </h3>
                    </div>

                    {/* İhlal Tipi Seçimi (Hap / Chip Düğmeleri) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        İhlal Kategorisi
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {VIOLATION_TYPES.map(vt => {
                          const isSelected = type === vt.value;
                          return (
                            <button
                              key={vt.value}
                              type="button"
                              onClick={() => setType(vt.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-500/20 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              {vt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tarih & Açıklama */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Calendar size={13} className="text-indigo-600" />
                          İhlal / Denetim Tarihi
                        </label>
                        <input 
                          type="date" 
                          value={violationDate} 
                          onChange={e => setViolationDate(e.target.value)} 
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 transition" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Açıklama / Denetim Yeri (Opsiyonel)
                        </label>
                        <input 
                          type="text" 
                          placeholder="Örn: Sabah bahçe kontrolü, tören öncesi denetim..." 
                          value={description} 
                          onChange={e => setDescription(e.target.value)} 
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 transition" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* ADIM 2: Giriş Yöntemi */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        2
                      </span> 
                      <h3 className="text-sm font-bold text-slate-900">
                        Öğrenci Listesi Giriş Yöntemi
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEntryMethod('photo')}
                        className={`p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 text-left cursor-pointer ${
                          entryMethod === 'photo' 
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-2xs ring-2 ring-indigo-500/10' 
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          entryMethod === 'photo' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-slate-500 border border-slate-200'
                        }`}>
                          <Camera size={20} />
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${entryMethod === 'photo' ? 'text-indigo-950' : 'text-slate-800'}`}>
                            Fotoğraf ile Tara (OCR)
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Çekilen nöbet kağıdını yükleyin, numaralar otomatik algılanır
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEntryMethod('manual')}
                        className={`p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 text-left cursor-pointer ${
                          entryMethod === 'manual' 
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-2xs ring-2 ring-indigo-500/10' 
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          entryMethod === 'manual' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white text-slate-500 border border-slate-200'
                        }`}>
                          <Hash size={20} />
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${entryMethod === 'manual' ? 'text-indigo-950' : 'text-slate-800'}`}>
                            Okul Numarası ile Gir
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Öğrenci numaralarını liste veya virgülle ayırarak manuel yapıştırın
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* FOTOĞRAF İLE GİRİŞ */}
                    {entryMethod === 'photo' && (
                      <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Nöbet / İhlal Listesi Fotoğrafı
                        </label>

                        {!selectedFile ? (
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all cursor-pointer relative group ${
                              isDragging
                                ? 'border-indigo-500 bg-indigo-50/60 ring-4 ring-indigo-500/10'
                                : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                            }`}
                          >
                            <input 
                              ref={fileInputRef} 
                              type="file" 
                              accept="image/jpeg,image/png,image/webp" 
                              onChange={handleFileSelect} 
                              className="hidden" 
                            />
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-2.5 group-hover:scale-105 group-hover:bg-indigo-100 transition-all shadow-2xs">
                              <Camera size={24} />
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800 mb-1">
                              Fotoğrafı buraya sürükleyin veya <span className="text-indigo-600 underline underline-offset-2">seçin</span>
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Desteklenen formatlar: <strong className="text-slate-700">JPG, PNG, WebP</strong> (Maks. 15 MB)
                            </p>
                          </div>
                        ) : (
                          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {previewUrl ? (
                                <img 
                                  src={previewUrl} 
                                  alt="Önizleme" 
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0 shadow-2xs" 
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                                  <Camera size={20} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {selectedFile.name}
                                  </p>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                    Fotoğraf Hazır
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Görsel'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <input 
                                ref={fileInputRef} 
                                type="file" 
                                accept="image/jpeg,image/png,image/webp" 
                                onChange={handleFileSelect} 
                                className="hidden" 
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-8 px-2.5 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
                              >
                                Değiştir
                              </Button>
                              <button
                                type="button"
                                onClick={handleReset}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                                title="Fotoğrafı kaldır"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end pt-2">
                          <Button 
                            onClick={handleUpload} 
                            disabled={!selectedFile || uploading} 
                            variant="primary"
                            size="sm"
                            leftIcon={uploading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            className="text-xs font-semibold"
                          >
                            {uploading ? 'OCR ile Analiz Ediliyor...' : 'Fotoğrafı Analiz Et'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* MANUEL NUMARA İLE GİRİŞ */}
                    {entryMethod === 'manual' && (
                      <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                        <div className="bg-indigo-50/60 border border-indigo-200/70 p-3 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900 leading-relaxed">
                          <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Giriş Kolaylığı:</span> Okul numaralarını her satıra bir numara gelecek şekilde veya virgül / boşluk ile ayırarak yapıştırabilirsiniz.
                          </div>
                        </div>

                        <textarea 
                          rows={5} 
                          placeholder="Örn:&#10;124&#10;589&#10;1042&#10;veya 124, 589, 1042..." 
                          value={manualText} 
                          onChange={e => setManualText(e.target.value)} 
                          className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs text-slate-800 resize-y bg-white"
                        />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <span className="text-xs text-slate-500 font-medium">
                            {manualText.trim() ? (
                              <span>Algılanan numara sayısı: <strong className="text-indigo-600 font-bold">{manualText.split(/[\n,;]+/).filter(s => s.trim()).length}</strong></span>
                            ) : (
                              'Henüz numara girilmedi'
                            )}
                          </span>

                          <Button 
                            onClick={handleProcessManualText} 
                            disabled={!manualText.trim() || manualProcessing} 
                            variant="primary"
                            size="sm"
                            leftIcon={manualProcessing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            className="text-xs font-semibold"
                          >
                            {manualProcessing ? 'Eşleştiriliyor...' : 'Numaraları Eşleştir ve Getir'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* SONUÇLAR VE ONAY PANELİ */}
              {result && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Özet Kartı */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900">
                            Analiz Sonuçları — {result.typeLabel}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {formatDate(result.violationDate)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Toplam {result.ocrLines.length} satır işlendi. Eşleşen öğrencileri kontrol edip onaylayabilirsiniz.
                        </p>
                      </div>
                      <Button 
                        onClick={handleReset} 
                        variant="outline"
                        size="sm"
                        className="text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50 self-start sm:self-auto"
                      >
                        Yeni Kayıt Başlat
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-indigo-50/70 p-3 rounded-xl text-center border border-indigo-200/80">
                        <div className="text-2xl font-black text-indigo-600">{result.summary.matchedCount}</div>
                        <div className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider mt-0.5">Eşleşen</div>
                      </div>
                      <div className="bg-amber-50/70 p-3 rounded-xl text-center border border-amber-200/80">
                        <div className="text-2xl font-black text-amber-600">{result.summary.unmatchedCount}</div>
                        <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mt-0.5">Eşleşemeyen</div>
                      </div>
                      <div className="bg-orange-50/70 p-3 rounded-xl text-center border border-orange-200/80">
                        <div className="text-2xl font-black text-orange-600">{result.summary.repeatOffenders}</div>
                        <div className="text-[11px] font-bold text-orange-800 uppercase tracking-wider mt-0.5">Tekrar Eden</div>
                      </div>
                      {(result.summary.disciplineRequired ?? 0) > 0 && (
                        <div className="bg-red-50/80 p-3 rounded-xl text-center border border-red-300">
                          <div className="text-2xl font-black text-red-600">{result.summary.disciplineRequired}</div>
                          <div className="text-[11px] font-bold text-red-800 uppercase tracking-wider mt-0.5">Disiplin Süreci</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(result.summary.disciplineRequired ?? 0) > 0 && (
                    <div className="bg-red-50/80 border border-red-300 p-3.5 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                      <div className="text-xs text-red-900 leading-relaxed">
                        <h4 className="font-bold text-red-950">Disiplin İşlemi Gerekiyor!</h4>
                        <p className="mt-0.5">{result.summary.disciplineRequired} öğrenci daha önce bu ihlal nedeniyle yazılı uyarı almış ve tekrar aynı ihlali yapmıştır. Bu öğrenciler için disiplin süreci değerlendirilmelidir.</p>
                      </div>
                    </div>
                  )}

                  {confirmed ? (
                    <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                          ✓
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-emerald-950">İhlaller Başarıyla Onaylandı!</h4>
                          <p className="text-[11px] text-emerald-700 font-medium">Seçilen {selectedIds.size} ihlal kaydı veri tabanına işlendi.</p>
                        </div>
                      </div>
                      {(() => {
                        const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
                        const pendingCount = result.matched.filter(m => m.suggestWarning && selectedIds.has(m.id) && !createdWarnings.has(`${m.studentId}_${bCode}`)).length;
                        return pendingCount > 0 ? (
                          <Button 
                            onClick={handleBulkCreateWarnings} 
                            disabled={bulkWarningLoading} 
                            variant="danger"
                            size="sm"
                            className="text-xs"
                          >
                            {bulkWarningLoading ? 'Oluşturuluyor...' : `⚠️ ${pendingCount} Öğrenciye Toplu Yazılı Uyarı`}
                          </Button>
                        ) : null;
                      })()}
                    </div>
                  ) : result.summary.unmatchedCount > result.summary.matchedCount && (
                    <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                      <div className="text-xs text-amber-900 leading-relaxed">
                        <h4 className="font-bold text-amber-950">OCR Sonuçları Düşük Doğrulukta</h4>
                        <p className="mt-0.5">El yazısı düzgün okunamadı. İsterseniz <button type="button" onClick={() => { handleReset(); setEntryMethod('manual'); }} className="font-bold underline text-amber-950 hover:text-amber-700 cursor-pointer">Manuel numara girişi</button> ile devam edebilirsiniz.</p>
                      </div>
                    </div>
                  )}

                  {/* Eşleşen Öğrenciler Tablosu */}
                  {result.matched.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span>Eşleşen Öğrenciler ({result.matched.length})</span>
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setShowManualAdd(true)} 
                            leftIcon={<UserPlus size={14} />}
                            className="text-xs bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                          >
                            Manuel Öğrenci Ekle
                          </Button>
                          {!confirmed && (
                            <Button 
                              onClick={handleConfirm} 
                              disabled={selectedIds.size === 0 || confirming} 
                              variant="primary"
                              size="sm"
                              className="text-xs"
                            >
                              {confirming ? 'Onaylanıyor...' : `Seçilenleri Onayla (${selectedIds.size})`}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                          <thead className="bg-slate-50">
                            <tr>
                              {!confirmed && (
                                <th className="text-center w-10 px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedIds.size === result.matched.length} 
                                    onChange={() => selectedIds.size === result.matched.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(result.matched.map(m => m.id)))} 
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                                  />
                                </th>
                              )}
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Öğrenci</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Sınıf / No</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Eşleşme Güveni</th>
                              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Önceki İhlaller</th>
                              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">İşlem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {result.matched.map(m => (
                              <tr key={m.id} className={m.requiresDiscipline ? 'bg-red-50/50' : m.suggestWarning ? 'bg-orange-50/40' : 'bg-white hover:bg-slate-50/70 transition-colors'}>
                                {!confirmed && (
                                  <td className="px-3 py-2.5 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedIds.has(m.id)} 
                                      onChange={() => toggleSelection(m.id)} 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                                    />
                                  </td>
                                )}
                                <td className="px-4 py-2.5 text-xs font-bold text-slate-900">{m.student.fullName}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-600 font-medium">
                                  {m.student.className} <span className="text-slate-300 mx-1">•</span> No: {m.student.schoolNumber}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      m.confidence >= 90 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                                      m.confidence >= 70 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                                      'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                      %{m.confidence}
                                    </span>
                                    <span className="truncate max-w-[120px] text-[11px]" title={m.matchedText}>
                                      {m.matchedBy === 'MANUAL' ? '✋ Manuel' : m.matchedText}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  {m.previousViolations > 0 ? (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded text-[11px] font-bold">
                                      {m.previousViolations} kez ⚠️
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 font-medium">İlk Kez</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    {m.requiresDiscipline && confirmed && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded text-[11px] font-bold">
                                        🔴 Disiplin
                                      </span>
                                    )}
                                    {!m.requiresDiscipline && m.suggestWarning && confirmed && (() => {
                                      const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
                                      const alreadyWarned = createdWarnings.has(`${m.studentId}_${bCode}`);
                                      return alreadyWarned ? (
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold">
                                          ✓ Uyarı Verildi
                                        </span>
                                      ) : (
                                        <Button 
                                          onClick={() => handleCreateWarning(m)} 
                                          disabled={creatingWarning === m.studentId} 
                                          variant="danger"
                                          size="sm"
                                          className="h-6 text-[11px] px-2"
                                        >
                                          ⚠️ Uyarı
                                        </Button>
                                      );
                                    })()}
                                    {!confirmed && (
                                      <button 
                                        type="button"
                                        onClick={() => handleRemoveViolation(m.id)} 
                                        className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                                        title="Kayıttan Çıkar"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Eşleşemeyen Satırlar */}
                  {result.unmatched.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-3.5 border-b border-slate-100 bg-slate-50/60">
                        <h3 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle size={15} className="text-amber-600" />
                          <span>Eşleşemeyen Satırlar ({result.unmatched.length})</span>
                        </h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {result.unmatched.map((u, i) => (
                          <div key={i} className="p-2.5 px-4 flex justify-between items-center text-xs">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono font-medium">"{u.text}"</span>
                            <span className="text-slate-500">{u.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GEÇMİŞ VE SORGULAMA SEKMESİ */}
          {tab === 'history' && (
            <div className="space-y-4">
              <div className="flex border-b border-slate-200 mb-4 shrink-0 space-x-6 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setHistoryView('uploads')}
                  className={`py-2.5 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    historyView === 'uploads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Yükleme Geçmişi
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryView('student')}
                  className={`py-2.5 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    historyView === 'student' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Search size={14}/> 
                  <span>Öğrenci Sorgula</span>
                </button>
              </div>

              {historyView === 'uploads' && (
                <>
                  {/* Filtre Çubuğu */}
                  <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-wrap items-end gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">İhlal Tipi</label>
                      <select 
                        value={hFilterType} 
                        onChange={e => setHFilterType(e.target.value)} 
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Tümü</option>
                        {VIOLATION_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tarihten</label>
                      <input 
                        type="date" 
                        value={hFilterFrom} 
                        onChange={e => setHFilterFrom(e.target.value)} 
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tarihe</label>
                      <input 
                        type="date" 
                        value={hFilterTo} 
                        onChange={e => setHFilterTo(e.target.value)} 
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                      />
                    </div>
                    {(hFilterType || hFilterFrom || hFilterTo) && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => { setHFilterType(''); setHFilterFrom(''); setHFilterTo(''); }} 
                        className="h-8 text-xs bg-white text-slate-600"
                      >
                        Temizle
                      </Button>
                    )}
                  </div>

                  {historyLoading ? (
                    <div className="p-10 text-center text-slate-500 animate-pulse font-medium text-xs">Kayıtlar Yükleniyor...</div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 text-xs">Henüz kayıtlı ihlal geçmişi bulunmuyor.</div>
                  ) : (
                    <div className="space-y-3">
                      {filteredHistory.map(h => {
                        const confirmedCount = h.records?.filter(r => r.isConfirmed).length ?? 0;
                        const pendingCount = (h.records?.length ?? h.studentCount) - confirmedCount;
                        const isExpanded = expandedUploadId === h.id;
                        
                        return (
                          <div key={h.id} className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden hover:border-slate-300 transition-all">
                            <div 
                              onClick={() => handleToggleExpand(h.id)} 
                              className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                  <ChevronRight size={18} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs text-slate-900">{formatDate(h.violationDate)}</span>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-bold">
                                      {getTypeLabel(h.type)}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500">
                                      {h.studentCount} Öğrenci
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {confirmedCount > 0 && <span className="text-[11px] font-semibold text-emerald-600">✓ {confirmedCount} onaylı</span>}
                                    {pendingCount > 0 && <span className="text-[11px] font-semibold text-amber-600">⏳ {pendingCount} beklemede</span>}
                                  </div>
                                </div>
                              </div>
                              <Button 
                                variant="ghost"
                                size="sm"
                                onClick={e => { e.stopPropagation(); handleDeleteUpload(h.id); }}
                                disabled={deletingUploadId === h.id}
                                leftIcon={<Trash2 size={14} />}
                                className="text-xs font-semibold text-slate-400 hover:text-red-700 hover:bg-red-50"
                                title="Tüm Yüklemeyi ve Kayıtları Sil"
                              >
                                Sil
                              </Button>
                            </div>

                            {isExpanded && (() => {
                              const detail = expandedDetails[h.id];
                              const records = detail?.records ?? h.records;
                              const pendingConfirmCount = records?.filter(r => !r.isConfirmed).length ?? 0;
                              const pendingWarningCount = records?.filter(r => r.suggestWarning && r.isConfirmed && !r.hasWarning).length ?? 0;

                              return (
                                <div className="border-t border-slate-200">
                                  {pendingConfirmCount > 0 && (
                                    <div className="bg-indigo-50/70 px-4 py-2.5 flex justify-between items-center border-b border-indigo-100 text-xs">
                                      <span className="text-indigo-900 font-medium">⏳ {pendingConfirmCount} öğrenci onay bekliyor</span>
                                      <Button 
                                        size="sm"
                                        onClick={() => handleHistoryConfirm(h.id, (records ?? []).filter(r => !r.isConfirmed).map(r => r.id))} 
                                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                      >
                                        Tümünü Onayla
                                      </Button>
                                    </div>
                                  )}
                                  {pendingWarningCount > 0 && (
                                    <div className="bg-orange-50/70 px-4 py-2.5 flex justify-between items-center border-b border-orange-200 text-xs">
                                      <span className="text-orange-900 font-medium">⚠️ {pendingWarningCount} öğrenci için yazılı uyarı öneriliyor</span>
                                      <Button 
                                        size="sm"
                                        onClick={() => handleHistoryBulkWarning(h)} 
                                        variant="danger"
                                        className="h-7 text-xs"
                                      >
                                        Toplu Yazılı Uyarı Oluştur
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {expandDetailLoading === h.id ? (
                                    <div className="p-6 text-center text-slate-500 animate-pulse text-xs">Detaylar Yükleniyor...</div>
                                  ) : (
                                    <table className="min-w-full divide-y divide-slate-100">
                                      <thead className="bg-slate-50">
                                        <tr>
                                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Öğrenci</th>
                                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Sınıf / No</th>
                                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Durum</th>
                                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">İşlem</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {records?.map(r => (
                                          <tr key={r.id} className={r.requiresDiscipline && r.isConfirmed ? 'bg-red-50/50' : r.suggestWarning && r.isConfirmed ? (r.hasWarning ? 'bg-emerald-50/30' : 'bg-orange-50/30') : 'hover:bg-slate-50/60'}>
                                            <td className="px-4 py-2 text-xs font-bold text-slate-900">{r.student.fullName}</td>
                                            <td className="px-4 py-2 text-xs text-slate-500">{r.student.className} • {r.student.schoolNumber}</td>
                                            <td className="px-4 py-2">
                                              {r.isConfirmed ? (
                                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Onaylı</span>
                                              ) : (
                                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Beklemede</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              <div className="flex items-center justify-end gap-1.5">
                                                {r.requiresDiscipline && r.isConfirmed ? (
                                                  <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">🔴 Disiplin</span>
                                                ) : r.suggestWarning && r.isConfirmed ? (
                                                  r.hasWarning ? (
                                                    <span className="text-[11px] font-bold text-emerald-700">✓ Uyarıldı</span>
                                                  ) : (
                                                    <Button 
                                                      size="sm"
                                                      onClick={() => handleHistoryCreateWarning(h.id, h.type, r.studentId, r.student.fullName, r.student.className, r.previousViolations ?? 0)} 
                                                      className="text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded transition"
                                                    >
                                                      ⚠️ Uyarı
                                                    </Button>
                                                  )
                                                ) : null}
                                                <button 
                                                  type="button"
                                                  onClick={() => handleHistoryRemoveViolation(h.id, r.id, r.student.fullName)} 
                                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                                  title="Öğrencinin İhlal Kaydını Sil"
                                                >
                                                  <Trash2 size={15} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ÖĞRENCİ SORGULAMA GÖRÜNÜMÜ */}
              {historyView === 'student' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <FileSearch size={16} className="text-indigo-600" />
                      Öğrenci İhlal Geçmişi Sorgula
                    </h3>
                    <div className="relative max-w-xl">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Öğrenci adı, okul numarası veya sınıfı ara..." 
                        value={stuSearch} 
                        onChange={e => { setStuSearch(e.target.value); setStuSelected(null); setStuHistory(null); }}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs bg-white"
                      />
                      {stuSearch && !stuSelected && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                          {allStudents.filter(s => s.fullName.toLowerCase().includes(stuSearch.toLowerCase()) || s.schoolNumber.includes(stuSearch)).slice(0, 15).map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => { setStuSearch(s.fullName); handleStudentSearch(s); }} 
                              className="px-3.5 py-2 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0 transition text-xs"
                            >
                              <div className="font-bold text-slate-900">{s.fullName}</div>
                              <div className="text-[11px] text-slate-500">{s.className} • No: {s.schoolNumber}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {stuLoading && <div className="text-center p-8 text-slate-500 animate-pulse text-xs">Öğrenci geçmişi yükleniyor...</div>}

                  {stuHistory && stuSelected && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 shadow-2xs">
                        <div>
                          <h2 className="text-base font-bold text-slate-900">{stuHistory.student.fullName}</h2>
                          <p className="text-xs text-slate-500 mt-0.5">{stuHistory.student.className} • Okul No: {stuHistory.student.schoolNumber}</p>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-center">
                            <div className="text-xl font-black text-red-600">{stuHistory.total}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Toplam</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-black text-emerald-600">{stuHistory.confirmed}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Onaylı</div>
                          </div>
                        </div>
                      </div>

                      {stuHistory.warningSuggestions.length > 0 && (
                        <div className="bg-orange-50/70 border border-orange-200 rounded-xl overflow-hidden shadow-2xs">
                          <div className="bg-orange-100/60 px-4 py-2.5 border-b border-orange-200 text-xs font-bold text-orange-950">
                            Yazılı Uyarı Durumu
                          </div>
                          <div className="p-3.5 space-y-2">
                            {stuHistory.warningSuggestions.map((s: WarningSuggestion) => (
                              <div key={s.type} className={`p-3 rounded-lg border flex justify-between items-center ${s.hasWarning ? 'bg-red-50 border-red-200' : 'bg-white border-orange-200'}`}>
                                <div>
                                  <div className="text-xs font-bold text-slate-900">{getTypeLabel(s.type)}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">Onaylı ihlal: <strong className="text-red-600 font-bold">{s.confirmedCount}</strong></div>
                                </div>
                                {s.hasWarning ? (
                                  <span className="px-2.5 py-1 bg-red-100 text-red-800 text-[11px] font-bold rounded-lg border border-red-200">🔴 Disiplin Süreci</span>
                                ) : (
                                  <Button onClick={() => handleStuCreateWarning(s)} disabled={stuWarningLoading === s.type} variant="danger" size="sm" className="text-xs">⚠️ Uyarı Oluştur</Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 text-xs font-bold text-slate-900">
                          İhlal Kayıtları
                        </div>
                        {stuHistory.violations.length === 0 ? (
                          <div className="p-6 text-center text-slate-500 text-xs">İhlal kaydı bulunmuyor.</div>
                        ) : (
                          <table className="min-w-full divide-y divide-slate-100">
                            <tbody className="divide-y divide-slate-100">
                              {stuHistory.violations.map((v: StudentViolation) => (
                                <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-4 py-2.5 text-xs font-semibold text-slate-900">{formatDate(v.upload.violationDate)}</td>
                                  <td className="px-4 py-2.5 text-xs text-slate-700 font-medium">{getTypeLabel(v.type)}</td>
                                  <td className="px-4 py-2.5 text-xs text-slate-500">{v.upload.description || '-'}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    {v.isConfirmed ? (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded">Onaylı</span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded">Beklemede</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Modallar */}
      <ViolationsManualAddModal 
        isOpen={showManualAdd}
        onClose={() => setShowManualAdd(false)}
        manualSearch={manualSearch}
        setManualSearch={setManualSearch}
        allStudents={allStudents}
        result={result}
        manualLoading={manualLoading}
        handleManualAdd={handleManualAdd}
      />

      <ActionModal
        isOpen={showWarningModal}
        onClose={() => { if (!wLoading) setShowWarningModal(false); }}
        title="Yazılı Uyarı Oluştur"
        submitText={wLoading ? 'Oluşturuluyor...' : 'Onayla ve PDF Üret'}
        onSubmit={async (e) => { e.preventDefault(); await handleConfirmWarningModal(); }}
        submitDisabled={wLoading}
      >
        <div className="space-y-3.5">
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-xs text-indigo-900">
            <span className="font-bold">{warningModalTargets.length} öğrenci</span> için otomatik olarak yazılı uyarı tutanağı oluşturulacaktır.
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sınıf Rehber Öğretmeni</label>
              {classTeachers.length > 0 ? (
                <select value={wClassTeacherName} onChange={e => setWClassTeacherName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800">
                  <option value="">— Seçilmedi —</option>
                  {classTeachers.map(t => <option key={t.id} value={t.name}>{t.name} ({t.className})</option>)}
                </select>
              ) : (
                <input type="text" value={wClassTeacherName} onChange={e => setWClassTeacherName(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white" />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Okul Rehber Öğretmeni</label>
              {counselors.length > 0 ? (
                <select value={wCounselorName} onChange={e => setWCounselorName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800">
                  <option value="">— Seçilmedi —</option>
                  {counselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input type="text" value={wCounselorName} onChange={e => setWCounselorName(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white" />
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Düzenleyen (Müdür Yardımcısı)</label>
            {assistantPrincipals.length > 0 ? (
              <select value={wIssuedBy} onChange={e => setWIssuedBy(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800">
                <option value="">— Okul Yönetimi —</option>
                {assistantPrincipals.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            ) : (
              <input type="text" value={wIssuedBy} onChange={e => setWIssuedBy(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white" />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rehberlik Notu (Opsiyonel)</label>
            <textarea value={wGuidanceNote} onChange={e => setWGuidanceNote(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 rounded-lg text-xs resize-y bg-white text-slate-800" placeholder="Not..." />
          </div>
        </div>
      </ActionModal>
      
      {confirmModal}
    </div>
  );
}
