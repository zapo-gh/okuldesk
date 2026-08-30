import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { ActionModal } from '../../components/ui/ActionModal';
import { ViolationsManualAddModal } from './ViolationsManualAddModal';
import { AlertTriangle, ClipboardList, Search, Eye, FileText, Smartphone, Trash2, Camera, UserPlus, FileSearch, ShieldAlert, ChevronRight, ChevronDown } from 'lucide-react';

// Alt bilesenler ve tip tanimlari ayri dosyalara tasindi
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
      if (errors.length === 0) toast(`✅ ${success} öğrenci için yazılı uyarı oluşturuldu.`);
      else toast.error(`✅ ${success} başarılı, ${errors.length} başarısız:\n${errors.join('\n')}`);
    } else if (errors.length > 0) {
      toast.error(errors[0]);
    } else {
      toast(`${warningModalTargets[0].studentName} için yazılı uyarı oluşturuldu!`);
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
    } catch (err: any) {
      if (err.response?.status === 404) setHistory(prev => prev.filter(h => h.id !== uploadId));
      else toast.error(err.response?.data?.message || 'Silme işlemi başarısız.');
    } finally { setDeletingUploadId(null); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); setResult(null); setConfirmed(false); void 0; }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true); void 0; setResult(null); setConfirmed(false); setSelectedIds(new Set());
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
    if (errors.length === 0) toast(`✅ ${success} öğrenci için yazılı uyarı oluşturuldu.`);
    else toast.error(`✅ ${success} başarılı, ${errors.length} başarısız:\n${errors.join('\n')}`);
  };

  const handleCreateWarning = async (student: MatchedStudent) => {
    if (!result) return;
    setCreatingWarning(student.studentId);
    try {
      await api.post('/warnings', { studentId: student.studentId, behaviorCode: BEHAVIOR_MAP[result.type] || 'M164_1_B', description: `${getTypeLabel(result.type)} - Tekrarlanan ihlal (${student.previousViolations + 1}. kez)` });
      const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
      setCreatedWarnings(prev => new Set(prev).add(`${student.studentId}_${bCode}`));
      toast(`${student.student.fullName} için yazılı uyarı oluşturuldu!`);
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
      setShowManualAdd(false); setManualSearch('');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Ekleme başarısız.'); } finally { setManualLoading(false); }
  };

  const handleReset = () => {
    setSelectedFile(null); setPreviewUrl(''); setResult(null); setConfirmed(false); void 0; setSelectedIds(new Set()); setDescription(''); setManualText(''); setEntryMethod(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcessManualText = async () => {
    if (!manualText.trim()) return;
    setManualProcessing(true); void 0; setResult(null); setConfirmed(false); setSelectedIds(new Set());
    try {
      const res = await api.post('/violations/process-text', { text: manualText, type: type, violationDate: violationDate, description: manualDesc || undefined });
      const data: UploadResult = res.data.data;
      setResult(data);
      setSelectedIds(new Set(data.matched.map(m => m.id)));
      loadStats();
    } catch (err: any) { toast.error(err.response?.data?.message || 'İşlem başarısız. Lütfen tekrar deneyin.'); } finally { setManualProcessing(false); }
  };

  const handleStudentSearch = async (student: StudentOption) => {
    setStuSelected(student); setStuLoading(true); setStuHistory(null);
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
      toast(`${stuHistory.student.fullName} için yazılı uyarı oluşturuldu!`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Uyarı oluşturulamadı.'); } finally { setStuWarningLoading(''); }
  };

  const filteredManualStudents = allStudents.filter(s => {
    if (result?.matched.some(m => m.studentId === s.id)) return false;
    if (!manualSearch) return false;
    return s.fullName.toLocaleLowerCase('tr-TR').includes(manualSearch.toLocaleLowerCase('tr-TR')) || s.schoolNumber.includes(manualSearch) || s.className.toLocaleLowerCase('tr-TR').includes(manualSearch.toLocaleLowerCase('tr-TR'));
  });
  const filteredStuSearch = allStudents.filter(s => {
    if (!stuSearch) return false;
    return s.fullName.toLocaleLowerCase('tr-TR').includes(stuSearch.toLocaleLowerCase('tr-TR')) || s.schoolNumber.includes(stuSearch) || s.className.toLocaleLowerCase('tr-TR').includes(stuSearch.toLocaleLowerCase('tr-TR'));
  });
  const filteredHistory = history.filter(h => {
    if (hFilterType && h.type !== hFilterType) return false;
    if (hFilterFrom && new Date(h.violationDate) < new Date(hFilterFrom)) return false;
    if (hFilterTo && new Date(h.violationDate) > new Date(hFilterTo + 'T23:59:59')) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="İhlal Takip Sistemi"
        description="Öğrenci ihlallerini OCR ile otomatik veya numara listesiyle manuel kaydedin, takip edin ve gerektiğinde tutanak oluşturun."
        icon={<ClipboardList size={28} className="text-indigo-600" />}
        actions={<ViolationStatsHeader stats={stats} />}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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

        <div className="p-6">
          {tab === 'entry' && (
            <div className="space-y-6">
              {!result && (
                <>
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">1</span> 
                      İhlal Bilgileri
                    </h3>
                    <div className="flex border-b border-slate-200 mb-6 shrink-0 space-x-8 overflow-x-auto">
                      {VIOLATION_TYPES.map(vt => (
                        <button
                          key={vt.value}
                          onClick={() => setType(vt.value)}
                          className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors focus:outline-none whitespace-nowrap ${
                            type === vt.value ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {vt.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">İhlal Tarihi</label>
                        <input type="date" value={violationDate} onChange={e => setViolationDate(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (Opsiyonel)</label>
                        <input type="text" placeholder="Örn: Sabah bahçe kontrolü..." value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">2</span> 
                      Öğrenci Listesi Giriş Yöntemi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <Button
                        variant="ghost"
                        onClick={() => setEntryMethod('photo')}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${entryMethod === 'photo' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <Camera size={32} className={entryMethod === 'photo' ? 'text-indigo-600' : 'text-gray-400'} />
                        <span className={`font-bold ${entryMethod === 'photo' ? 'text-indigo-700' : 'text-gray-700'}`}>Fotoğraf ile Tara</span>
                        <span className="text-xs text-gray-500">OCR ile otomatik öğrenci tanıma</span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setEntryMethod('manual')}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${entryMethod === 'manual' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <FileText size={32} className={entryMethod === 'manual' ? 'text-indigo-600' : 'text-gray-400'} />
                        <span className={`font-bold ${entryMethod === 'manual' ? 'text-indigo-700' : 'text-gray-700'}`}>Numara ile Gir</span>
                        <span className="text-xs text-gray-500">Okul numaralarını manuel girin</span>
                      </Button>
                    </div>

                    {entryMethod === 'photo' && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${selectedFile ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'}`}
                        >
                          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
                          {selectedFile ? (
                            <div className="flex items-center gap-6 justify-center">
                              {previewUrl && <img src={previewUrl} alt="Önizleme" className="h-24 object-contain rounded-lg shadow-sm" />}
                              <div className="text-left">
                                <p className="font-bold text-gray-800">{selectedFile.name}</p>
                                <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                <Button className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700" onClick={e => { e.stopPropagation(); handleReset(); }}>Değiştir</Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Camera size={48} className="mx-auto text-gray-400 mb-3" />
                              <p className="font-bold text-gray-700 mb-1">Fotoğrafı buraya sürükleyin veya tıklayın</p>
                              <p className="text-xs text-gray-500">JPG, PNG veya WebP — Maks. 15MB</p>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          onClick={handleUpload} 
                          disabled={!selectedFile || uploading} 
                          variant="primary"
                        >
                          {uploading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> OCR ile analiz ediliyor...</> : 'Fotoğrafı Analiz Et'}
                        </Button>
                      </div>
                    )}

                    {entryMethod === 'manual' && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 text-sm text-blue-800">
                          <span className="font-bold">İpucu:</span> Okul numaralarını virgülle, boşlukla veya her satıra bir numara gelecek şekilde girebilirsiniz.
                        </div>
                        <textarea 
                          rows={6} 
                          placeholder="Okul numaralarını girin..." 
                          value={manualText} 
                          onChange={e => setManualText(e.target.value)} 
                          className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-y"
                        />
                        {manualText.trim() && <p className="mt-2 text-xs text-gray-500 font-medium">Algılanan giriş sayısı: {manualText.split(/[\n,;]+/).filter(s => s.trim()).length}</p>}
                        
                        <Button 
                          onClick={handleProcessManualText} 
                          disabled={!manualText.trim() || manualProcessing} 
                          variant="primary"
                        >
                          {manualProcessing ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> Eşleştiriliyor...</> : 'Numaraları Eşleştir'}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {result && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  {/* Özet Kartı */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">Sonuçlar — {result.typeLabel}</h3>
                        <p className="text-sm text-gray-500 mt-1">Tarih: {formatDate(result.violationDate)} | {result.ocrLines.length} giriş işlendi</p>
                      </div>
                      <Button onClick={handleReset} variant="secondary">
                        Yeni Kayıt
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-100">
                        <div className="text-3xl font-bold text-indigo-600">{result.summary.matchedCount}</div>
                        <div className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mt-1">Eşleşen</div>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-xl text-center border border-amber-100">
                        <div className="text-3xl font-bold text-amber-600">{result.summary.unmatchedCount}</div>
                        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider mt-1">Eşleşemeyen</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
                        <div className="text-3xl font-bold text-red-600">{result.summary.repeatOffenders}</div>
                        <div className="text-xs font-semibold text-red-800 uppercase tracking-wider mt-1">Tekrar Eden</div>
                      </div>
                      {(result.summary.disciplineRequired ?? 0) > 0 && (
                        <div className="bg-red-100 p-4 rounded-xl text-center border-2 border-red-300">
                          <div className="text-3xl font-bold text-red-700">{result.summary.disciplineRequired}</div>
                          <div className="text-xs font-bold text-red-800 uppercase tracking-wider mt-1">Disiplin Süreci</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(result.summary.disciplineRequired ?? 0) > 0 && (
                    <div className="bg-red-50 border-2 border-red-400 p-4 rounded-xl flex items-start gap-4">
                      <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={28} />
                      <div>
                        <h4 className="font-bold text-red-800">Disiplin İşlemi Gerekiyor!</h4>
                        <p className="text-sm text-red-700 mt-1">{result.summary.disciplineRequired} öğrenci daha önce bu ihlal nedeniyle yazılı uyarı almış ve tekrar aynı ihlali yapmıştır. Bu öğrenciler için disiplin işlemleri başlatılmalıdır.</p>
                      </div>
                    </div>
                  )}

                  {confirmed ? (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xl">✓</div>
                        <div>
                          <h4 className="font-bold text-green-800">İhlaller Onaylandı!</h4>
                          <p className="text-sm text-green-700">Seçilen {selectedIds.size} ihlal kaydedildi.</p>
                        </div>
                      </div>
                      {(() => {
                        const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
                        const pendingCount = result.matched.filter(m => m.suggestWarning && selectedIds.has(m.id) && !createdWarnings.has(`${m.studentId}_${bCode}`)).length;
                        return pendingCount > 0 ? (
                          <Button onClick={handleBulkCreateWarnings} disabled={bulkWarningLoading} variant="danger">
                            {bulkWarningLoading ? 'Oluşturuluyor...' : `⚠️ ${pendingCount} Öğrenciye Toplu Yazılı Uyarı`}
                          </Button>
                        ) : null;
                      })()}
                    </div>
                  ) : result.summary.unmatchedCount > result.summary.matchedCount && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4">
                      <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={24} />
                      <div>
                        <h4 className="font-bold text-amber-800">OCR sonuçları düşük doğrulukta</h4>
                        <p className="text-sm text-amber-700 mt-1">El yazısı düzgün okunamadı. <Button onClick={() => { handleReset(); setEntryMethod('manual'); }} className="font-semibold underline hover:text-amber-900">Manuel numara girişi ile devam edin</Button></p>
                      </div>
                    </div>
                  )}

                  {result.matched.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800">✅ Eşleşen Öğrenciler ({result.matched.length})</h3>
                        <div className="flex gap-2">
                          <Button onClick={() => setShowManualAdd(true)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 flex items-center gap-1.5 transition">
                            <UserPlus size={16} /> Manuel Ekle
                          </Button>
                          {!confirmed && (
                            <Button onClick={handleConfirm} disabled={selectedIds.size === 0 || confirming} variant="primary">
                              {confirming ? 'Onaylanıyor...' : `Seçilenleri Onayla (${selectedIds.size})`}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50/50">
                            <tr>
                              {!confirmed && <th className="px-4 py-3"><input type="checkbox" checked={selectedIds.size === result.matched.length} onChange={() => selectedIds.size === result.matched.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(result.matched.map(m => m.id)))} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></th>}
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Öğrenci</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sınıf/No</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Eşleşme</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Geçmiş</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">İşlem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {result.matched.map(m => (
                              <tr key={m.id} className={m.requiresDiscipline ? 'bg-red-50' : m.suggestWarning ? 'bg-orange-50/50' : 'bg-white hover:bg-gray-50'}>
                                {!confirmed && <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelection(m.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></td>}
                                <td className="px-4 py-3 font-bold text-gray-900">{m.student.fullName}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{m.student.className} <span className="text-gray-400 mx-1">|</span> {m.student.schoolNumber}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded font-bold ${m.confidence >= 90 ? 'bg-green-100 text-green-700' : m.confidence >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>%{m.confidence}</span>
                                    <span className="truncate max-w-[120px]" title={m.matchedText}>{m.matchedBy === 'MANUAL' ? '✋ Manuel' : m.matchedText}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  {m.previousViolations > 0 ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">{m.previousViolations} kez ⚠️</span> : <span className="text-xs text-gray-400">İlk Kez</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    {m.requiresDiscipline && confirmed && <span className="px-2 py-1 bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold">🔴 Disiplin</span>}
                                    {!m.requiresDiscipline && m.suggestWarning && confirmed && (() => {
                                      const bCode = BEHAVIOR_MAP[result.type] || 'M164_1_B';
                                      const alreadyWarned = createdWarnings.has(`${m.studentId}_${bCode}`);
                                      return alreadyWarned
                                        ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">✓ Uyarı Verildi</span>
                                        : <Button onClick={() => handleCreateWarning(m)} disabled={creatingWarning === m.studentId} className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-bold transition">⚠️ Uyarı</Button>;
                                    })()}
                                    {!confirmed && <Button onClick={() => handleRemoveViolation(m.id)} variant="ghost" size="icon" className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></Button>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {result.unmatched.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-800">⚠️ Eşleşemeyen Satırlar ({result.unmatched.length})</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {result.unmatched.map((u, i) => (
                          <div key={i} className="p-3 flex justify-between items-center text-sm">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">"{u.text}"</span>
                            <span className="text-gray-500">{u.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-6">
              <div className="flex border-b border-slate-200 mb-6 shrink-0 space-x-8 overflow-x-auto">
                <button
                  onClick={() => setHistoryView('uploads')}
                  className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors focus:outline-none whitespace-nowrap ${
                    historyView === 'uploads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Yükleme Geçmişi
                </button>
                <button
                  onClick={() => setHistoryView('student')}
                  className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors focus:outline-none whitespace-nowrap flex items-center gap-2 ${
                    historyView === 'student' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Search size={16}/> Öğrenci Sorgula
                </button>
              </div>

              {historyView === 'uploads' && (
                <>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-end gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">İhlal Tipi</label>
                      <select value={hFilterType} onChange={e => setHFilterType(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500">
                        <option value="">Tümü</option>
                        {VIOLATION_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Tarihten</label>
                      <input type="date" value={hFilterFrom} onChange={e => setHFilterFrom(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Tarihe</label>
                      <input type="date" value={hFilterTo} onChange={e => setHFilterTo(e.target.value)} className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500" />
                    </div>
                    {(hFilterType || hFilterFrom || hFilterTo) && (
                      <Button onClick={() => { setHFilterType(''); setHFilterFrom(''); setHFilterTo(''); }} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">Temizle</Button>
                    )}
                  </div>

                  {historyLoading ? (
                    <div className="p-12 text-center text-gray-500 animate-pulse font-medium">Kayıtlar Yükleniyor...</div>
                  ) : (
                    <div className="space-y-4">
                      {filteredHistory.map(h => {
                        const confirmedCount = h.records?.filter(r => r.isConfirmed).length ?? 0;
                        const pendingCount = (h.records?.length ?? h.studentCount) - confirmedCount;
                        const isExpanded = expandedUploadId === h.id;
                        
                        return (
                          <div key={h.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow">
                            <div 
                              onClick={() => handleToggleExpand(h.id)} 
                              className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}><ChevronRight size={20} /></div>
                                <div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-900">{formatDate(h.violationDate)}</span>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">{getTypeLabel(h.type)}</span>
                                    <span className="text-xs font-semibold text-gray-500">{h.studentCount} Öğrenci</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    {confirmedCount > 0 && <span className="text-xs font-semibold text-green-600">✓ {confirmedCount} onaylı</span>}
                                    {pendingCount > 0 && <span className="text-xs font-semibold text-amber-600">⏳ {pendingCount} beklemede</span>}
                                  </div>
                                </div>
                              </div>
                              <Button 
                                onClick={e => { e.stopPropagation(); handleDeleteUpload(h.id); }}
                                disabled={deletingUploadId === h.id}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 size={18} />
                              </Button>
                            </div>

                            {isExpanded && (() => {
                              const detail = expandedDetails[h.id];
                              const records = detail?.records ?? h.records;
                              const pendingConfirmCount = records?.filter(r => !r.isConfirmed).length ?? 0;
                              const pendingWarningCount = records?.filter(r => r.suggestWarning && r.isConfirmed && !r.hasWarning).length ?? 0;

                              return (
                                <div className="border-t border-gray-200">
                                  {pendingConfirmCount > 0 && (
                                    <div className="bg-blue-50 px-4 py-3 flex justify-between items-center border-b border-blue-100">
                                      <span className="text-sm text-blue-800 font-medium">⏳ {pendingConfirmCount} öğrenci onay bekliyor</span>
                                      <Button onClick={() => handleHistoryConfirm(h.id, (records ?? []).filter(r => !r.isConfirmed).map(r => r.id))} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700 transition">Tümünü Onayla</Button>
                                    </div>
                                  )}
                                  {pendingWarningCount > 0 && (
                                    <div className="bg-orange-50 px-4 py-3 flex justify-between items-center border-b border-orange-200">
                                      <span className="text-sm text-orange-800 font-medium">⚠️ {pendingWarningCount} öğrenci için yazılı uyarı öneriliyor</span>
                                      <Button onClick={() => handleHistoryBulkWarning(h)} variant="danger">Toplu Yazılı Uyarı Oluştur</Button>
                                    </div>
                                  )}
                                  
                                  {expandDetailLoading === h.id ? (
                                    <div className="p-8 text-center text-gray-500 animate-pulse text-sm">Detaylar Yükleniyor...</div>
                                  ) : (
                                    <table className="min-w-full divide-y divide-gray-100">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Öğrenci</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Sınıf/No</th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Durum</th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">İşlem</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {records?.map(r => (
                                          <tr key={r.id} className={r.requiresDiscipline && r.isConfirmed ? 'bg-red-50' : r.suggestWarning && r.isConfirmed ? (r.hasWarning ? 'bg-green-50/30' : 'bg-orange-50/30') : 'hover:bg-gray-50'}>
                                            <td className="px-4 py-2 text-sm font-bold text-gray-900">{r.student.fullName}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{r.student.className} - {r.student.schoolNumber}</td>
                                            <td className="px-4 py-2">
                                              {r.isConfirmed ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Onaylı</span> : <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Beklemede</span>}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              {r.requiresDiscipline && r.isConfirmed ? (
                                                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">🔴 Disiplin</span>
                                              ) : r.suggestWarning && r.isConfirmed ? (
                                                r.hasWarning ? <span className="text-xs font-bold text-green-600">✓ Uyarıldı</span> : <Button onClick={() => handleHistoryCreateWarning(h.id, h.type, r.studentId, r.student.fullName, r.student.className, r.previousViolations ?? 0)} className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition">⚠️ Uyarı</Button>
                                              ) : null}
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

              {historyView === 'student' && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><FileSearch className="text-indigo-600"/> Öğrenci İhlal Sorgula</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Öğrenci adı, okul numarası veya sınıfı..." 
                        value={stuSearch} 
                        onChange={e => { setStuSearch(e.target.value); setStuSelected(null); setStuHistory(null); }}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      {stuSearch && !stuSelected && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-10">
                          {allStudents.filter(s => s.fullName.toLowerCase().includes(stuSearch.toLowerCase()) || s.schoolNumber.includes(stuSearch)).slice(0, 15).map(s => (
                            <div key={s.id} onClick={() => { setStuSearch(s.fullName); handleStudentSearch(s); }} className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 transition">
                              <div className="font-bold text-gray-900">{s.fullName}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{s.className} - No: {s.schoolNumber}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {stuLoading && <div className="text-center p-10 text-gray-500 animate-pulse">Öğrenci geçmişi yükleniyor...</div>}

                  {stuHistory && stuSelected && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-wrap justify-between items-center gap-6">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{stuHistory.student.fullName}</h2>
                          <p className="text-gray-500 mt-1">{stuHistory.student.className} • Okul No: {stuHistory.student.schoolNumber}</p>
                        </div>
                        <div className="flex gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-black text-red-600">{stuHistory.total}</div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Toplam</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-green-600">{stuHistory.confirmed}</div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Onaylı</div>
                          </div>
                        </div>
                      </div>

                      {stuHistory.warningSuggestions.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-orange-100/50 px-4 py-3 border-b border-orange-200 font-bold text-orange-800">
                            Yazılı Uyarı Durumu
                          </div>
                          <div className="p-4 space-y-3">
                            {stuHistory.warningSuggestions.map((s: WarningSuggestion) => (
                              <div key={s.type} className={`p-3 rounded-lg border flex justify-between items-center ${s.hasWarning ? 'bg-red-50 border-red-200' : 'bg-white border-orange-200'}`}>
                                <div>
                                  <div className="font-bold text-gray-800">{getTypeLabel(s.type)}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">Onaylı ihlal: <span className="font-bold text-red-600">{s.confirmedCount}</span></div>
                                </div>
                                {s.hasWarning ? (
                                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200">🔴 Disiplin Süreci</span>
                                ) : (
                                  <Button onClick={() => handleStuCreateWarning(s)} disabled={stuWarningLoading === s.type} variant="danger">⚠️ Uyarı Oluştur</Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 font-bold text-gray-800">İhlal Kayıtları</div>
                        {stuHistory.violations.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">İhlal kaydı bulunmuyor.</div>
                        ) : (
                          <table className="min-w-full divide-y divide-gray-100">
                            <tbody className="divide-y divide-gray-100">
                              {stuHistory.violations.map((v: StudentViolation) => (
                                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatDate(v.upload.violationDate)}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">{getTypeLabel(v.type)}</td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{v.upload.description || '-'}</td>
                                  <td className="px-4 py-3 text-right">
                                    {v.isConfirmed ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Onaylı</span> : <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded">Beklemede</span>}
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

      {/* MODALS */}
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
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 mb-4">
            <span className="font-bold">{warningModalTargets.length} öğrenci</span> için otomatik olarak yazılı uyarı tutanağı oluşturulacaktır.
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf Rehber Öğretmeni</label>
              {classTeachers.length > 0 ? (
                <select value={wClassTeacherName} onChange={e => setWClassTeacherName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">— Seçilmedi —</option>
                  {classTeachers.map(t => <option key={t.id} value={t.name}>{t.name} ({t.className})</option>)}
                </select>
              ) : (
                <input type="text" value={wClassTeacherName} onChange={e => setWClassTeacherName(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Okul Rehber Öğretmeni</label>
              {counselors.length > 0 ? (
                <select value={wCounselorName} onChange={e => setWCounselorName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">— Seçilmedi —</option>
                  {counselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input type="text" value={wCounselorName} onChange={e => setWCounselorName(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Düzenleyen (Müdür Yardımcısı)</label>
            {assistantPrincipals.length > 0 ? (
              <select value={wIssuedBy} onChange={e => setWIssuedBy(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm">
                <option value="">— Okul Yönetimi —</option>
                {assistantPrincipals.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            ) : (
              <input type="text" value={wIssuedBy} onChange={e => setWIssuedBy(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2 border border-gray-300 rounded-lg text-sm" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rehberlik Notu (Opsiyonel)</label>
            <textarea value={wGuidanceNote} onChange={e => setWGuidanceNote(e.target.value)} rows={2} className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-y" placeholder="Not..." />
          </div>
        </div>
      </ActionModal>
      
      {confirmModal}
    </div>
  );
}
