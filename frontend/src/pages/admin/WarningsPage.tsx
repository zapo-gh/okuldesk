import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ActionModal } from '../../components/ui/ActionModal';
import { AlertTriangle, Plus, Search, Eye, FileText, Smartphone, Trash2, ShieldAlert, Printer, ChevronDown, X, CheckCircle2, Clock, Check } from 'lucide-react';
import { printPdfBlob } from '../../utils/printPdf';
import { Button } from '../../components/ui/Button';
import { formatPhoneNumber } from '../../utils/formatters';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  className?: string | null;
}

interface Student {
  id: string;
  schoolNumber: string;
  fullName: string;
  className: string;
}

interface WarningBehavior {
  code: string;
  category: string;
  text: string;
  article: string;
}

interface WarningRecord {
  id: string;
  studentId: string;
  warningNumber: number;
  behaviorCode: string;
  behaviorText: string;
  description: string | null;
  guidanceNote: string | null;
  issuedBy: string;
  issuedAt: string;
  createdAt: string;
  waSentAt?: string | null;
  student: {
    fullName: string;
    className: string;
    schoolNumber: string;
    parents?: {
      id?: string;
      fullName: string;
      relation?: string;
      phone: string;
      isPrimary?: boolean;
      waConsentStatus?: string;
    }[];
  };
}

export default function WarningsPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [records, setRecords] = useState<WarningRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviors, setBehaviors] = useState<Record<string, WarningBehavior[]>>({});
  const [allBehaviors, setAllBehaviors] = useState<WarningBehavior[]>([]);
  const [loading, setLoading] = useState(true);

  // Staff
  const [assistantPrincipals, setAssistantPrincipals] = useState<StaffMember[]>([]);
  const [counselors, setCounselors] = useState<StaffMember[]>([]);
  const [classTeachers, setClassTeachers] = useState<StaffMember[]>([]);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WarningRecord | null>(null);

  // Create form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBehaviorCode, setSelectedBehaviorCode] = useState('');
  const [description, setDescription] = useState('');
  const [guidanceNote, setGuidanceNote] = useState('');
  const [issuedBy, setIssuedBy] = useState('');
  const [classTeacherName, setClassTeacherName] = useState('');
  const [schoolCounselorName, setSchoolCounselorName] = useState('');
  const [warningCount, setWarningCount] = useState(0);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // List search + pagination
  const [listSearch, setListSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);
  const prevSearchRef = useRef('');
  useEffect(() => {
    if (listSearch !== prevSearchRef.current) {
      prevSearchRef.current = listSearch;
      setPage(1);
    }
  }, [listSearch]);

  // Delete
  const [deleteId, setDeleteId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // WA
  const [waConnected, setWaConnected] = useState(false);
  const [waSendLoading, setWaSendLoading] = useState('');

  // WhatsApp önizleme modal
  const [showWaModal, setShowWaModal] = useState(false);
  const [waRecord, setWaRecord] = useState<WarningRecord | null>(null);
  const [waPreviewData, setWaPreviewData] = useState<{
    messages: {
      parent: string;
      relation?: string;
      phone: string;
      isPrimary?: boolean;
      waConsentStatus?: string;
      message: string;
    }[];
    studentName: string;
    className?: string;
    warningNumber?: number;
    behaviorText?: string;
    description?: string | null;
  } | null>(null);
  const [waPreviewLoading, setWaPreviewLoading] = useState(false);
  const [waPreviewError, setWaPreviewError] = useState('');
  const [waSelectedPhones, setWaSelectedPhones] = useState<Set<string>>(new Set());
  const [sendAsPdf, setSendAsPdf] = useState(true);
  
  const [isBehaviorDropdownOpen, setIsBehaviorDropdownOpen] = useState(false);
  const [behaviorSearchTerm, setBehaviorSearchTerm] = useState('');

  useEffect(() => {
    loadData();
    api.get('/whatsapp/status').then(r => setWaConnected(r.data.data.status === 'connected')).catch(() => {});
  }, [page, listSearch]);

  const loadData = async () => {
    setLoading(true);
    try {
      const isSearch = !!listSearch.trim();
      const searchParam = isSearch
        ? `&search=${encodeURIComponent(listSearch.trim())}&limit=1000`
        : `&limit=20&page=${page}`;
      const [recordsRes, studentsRes, behaviorsRes, staffRes] = await Promise.all([
        api.get(`/warnings?${searchParam}`),
        api.get('/students?limit=2000'),
        api.get('/warnings/behaviors'),
        api.get('/staff'),
      ]);
      setRecords(recordsRes.data.data.records);
      if (isSearch) setPagination(null);
      else setPagination(recordsRes.data.data.pagination);
      
      setStudents(studentsRes.data.data.students);
      setBehaviors(behaviorsRes.data.data.byCategory);
      setAllBehaviors(behaviorsRes.data.data.all);
      const allStaff: StaffMember[] = staffRes.data.data.staff;
      setAssistantPrincipals(allStaff.filter((s) => s.role === 'MUDUR_YARDIMCISI'));
      setCounselors(allStaff.filter((s) => s.role === 'REHBER_OGRETMEN'));
      setClassTeachers(allStaff.filter((s) => s.role === 'SINIF_REHBER_OGRETMEN'));
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLocaleLowerCase('tr-TR').includes(studentSearch.toLocaleLowerCase('tr-TR')) ||
      s.schoolNumber.includes(studentSearch) ||
      s.className.toLocaleLowerCase('tr-TR').includes(studentSearch.toLocaleLowerCase('tr-TR'))
  );

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudentId(student.id);
    setStudentSearch(`${student.fullName} - ${student.className} (${student.schoolNumber})`);
    setShowStudentDropdown(false);

    const ct = classTeachers.find(
      (t) => t.className?.toLocaleLowerCase('tr-TR').trim() === student.className?.toLocaleLowerCase('tr-TR').trim()
    );
    setClassTeacherName(ct ? ct.name : '');

    if (counselors.length === 1) {
      setSchoolCounselorName(counselors[0].name);
    }

    try {
      const res = await api.get(`/warnings/warning-count/${student.id}`);
      setWarningCount(res.data.data.count);
    } catch {
      setWarningCount(0);
    }
  };

  const resetCreateForm = () => {
    setSelectedStudentId('');
    setStudentSearch('');
    setSelectedCategory('');
    setSelectedBehaviorCode('');
    setDescription('');
    setGuidanceNote('');
    setIssuedBy('');
    setClassTeacherName('');
    setSchoolCounselorName('');
    setWarningCount(0);
    setCreateError('');
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedBehaviorCode) return;
    setCreateError('');
    setCreateLoading(true);
    try {
      await api.post('/warnings', {
        studentId: selectedStudentId,
        behaviorCode: selectedBehaviorCode,
        description: description || undefined,
        guidanceNote: guidanceNote || undefined,
        issuedBy: issuedBy || undefined,
        classTeacherName: classTeacherName || undefined,
        schoolCounselorName: schoolCounselorName || undefined,
      });
      setShowCreateModal(false);
      resetCreateForm();
      loadData();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Uyarı oluşturma başarısız.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Bu yazılı uyarı kaydını silmek istediğinize emin misiniz?')) return;
    setDeleteId(id);
    setDeleteLoading(true);
    try {
      await api.delete(`/warnings/${id}`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Silme işlemi başarısız.');
    } finally {
      setDeleteLoading(false);
      setDeleteId('');
    }
  };

  const handleViewPdf = async (id: string) => {
    try {
      const response = await api.get(`/warnings/${id}/pdf`, { responseType: 'blob' });
      printPdfBlob(new Blob([response.data], { type: 'application/pdf' }));
    } catch {
      toast('PDF görüntüleme başarısız.');
    }
  };

  const handleWaPreviewOpen = async (record: WarningRecord) => {
    setWaRecord(record);
    setWaPreviewData(null);
    setWaPreviewError('');
    setShowWaModal(true);
    setWaPreviewLoading(true);
    setSendAsPdf(true);
    try {
      const res = await api.post(`/whatsapp/preview/warning/${record.id}`);
      const data = res.data.data;
      setWaPreviewData(data);
      const messages = (data.messages as any[]) || [];
      const nonDeclined = messages.filter(m => m.waConsentStatus !== 'DECLINED').map(m => m.phone);
      const initialSelection = nonDeclined.length > 0 ? nonDeclined : messages.map(m => m.phone);
      setWaSelectedPhones(new Set(initialSelection));
    } catch (err: any) {
      setWaPreviewError(err.response?.data?.message || 'Önizleme yüklenemedi.');
    } finally {
      setWaPreviewLoading(false);
    }
  };

  const handleWaSend = async () => {
    if (!waRecord || waSelectedPhones.size === 0) return;
    setWaSendLoading(waRecord.id);
    try {
      const res = await api.post(`/whatsapp/send/warning/${waRecord.id}`, {
        selectedPhones: Array.from(waSelectedPhones),
        sendAsPdf,
      });
      const results = res.data.data.results as { parent: string; phone: string; ok: boolean; error?: string }[];
      const failed = results.filter(r => !r.ok);
      if (results.some(r => r.ok)) {
        setRecords(prev => prev.map(rec => rec.id === waRecord.id ? { ...rec, waSentAt: new Date().toISOString() } : rec));
      }
      setShowWaModal(false);
      if (failed.length === 0) {
        toast.success(`✅ Mesaj ${results.length} veliye başarıyla gönderildi.`);
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
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const behaviorsByArticle = allBehaviors.reduce<Record<string, WarningBehavior[]>>((acc, b) => {
    const key = b.article || 'Diğer';
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const articleKeys = Object.keys(behaviorsByArticle).sort((a, b) => {
    const order = 'aAbBcCçÇdDeEfFgGğĞhHıIiİjJkKlLmMnNoOöÖpPrRsStTuUüÜvVyYzZ';
    const extract = (s: string) => {
      const m = s.match(/Madde\s+(\d+)(?:\/(\d+))?(?:-(.))?/);
      if (!m) return [0, 0, 999];
      const main = parseInt(m[1]) || 0;
      const sub = parseInt(m[2]) || 0;
      const letter = m[3] || '';
      const li = letter ? order.indexOf(letter) : -1;
      return [main, sub, li >= 0 ? li : 999];
    };
    const [a1, a2, a3] = extract(a);
    const [b1, b2, b3] = extract(b);
    if (a1 !== b1) return a1 - b1;
    if (a2 !== b2) return a2 - b2;
    return a3 - b3;
  });

  const columns: Column<WarningRecord>[] = [
    {
      header: 'Öğrenci',
      render: (r) => (
        <div>
          <div className="font-bold text-gray-900">{r.student.fullName}</div>
          <div className="text-xs text-gray-500 font-medium">No: {r.student.schoolNumber}</div>
        </div>
      )
    },
    {
      header: 'Sınıf',
      render: (r) => <span className="text-sm font-medium text-gray-700">{r.student.className}</span>
    },
    {
      header: 'Veli / İletişim & WhatsApp',
      render: (r) => {
        const parents = r.student?.parents || [];
        if (parents.length === 0) {
          return <span className="text-xs text-rose-500 font-medium italic">Veli kaydı yok</span>;
        }
        return (
          <div className="flex flex-col gap-1.5 max-w-xs">
            {parents.map((p, idx) => (
              <div key={p.id || idx} className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-800 text-xs">
                  {p.fullName}
                </span>
                {p.relation && p.relation !== 'Veli' && (
                  <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded font-medium">
                    {p.relation}
                  </span>
                )}
                {p.isPrimary && (
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded">
                    1. Veli
                  </span>
                )}
                <span className="font-mono text-slate-600 text-[11px]">
                  {p.phone || 'Tel yok'}
                </span>

                {p.waConsentStatus === 'ACCEPTED' ? (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    title="WhatsApp KVKK İzni Onaylı"
                  >
                    ✅ Onaylı
                  </span>
                ) : p.waConsentStatus === 'DECLINED' ? (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                    title="WhatsApp İletişim İzni Reddedildi!"
                  >
                    ❌ Reddedildi
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                    title="WhatsApp Onayı Bekliyor / Alınmadı"
                  >
                    ⏳ Onaysız
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      header: 'Uyarı No',
      render: (r) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border
          ${r.warningNumber >= 3 ? "bg-red-50 text-red-700 border-red-200" : 
            r.warningNumber === 2 ? "bg-amber-50 text-amber-700 border-amber-200" : 
            "bg-blue-50 text-blue-700 border-blue-200"}
        `}>
          {r.warningNumber}. Uyarı
        </span>
      )
    },
    {
      header: 'Davranış',
      render: (r) => (
        <div className="max-w-xs md:max-w-md truncate text-sm text-gray-600 font-medium" title={r.behaviorText}>
          {r.behaviorText}
        </div>
      )
    },
    {
      header: 'Tarih',
      render: (r) => <span className="text-sm text-gray-500">{formatDate(r.issuedAt)}</span>
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={() => { setSelectedRecord(r); setShowDetailModal(true); }} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Detay">
            <Eye size={16}/>
          </Button>
          <Button variant="ghost" onClick={() => handleViewPdf(r.id)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="PDF Görüntüle">
            <Printer size={16}/>
          </Button>
          {r.waSentAt ? (
            <Button
              variant="ghost"
              onClick={() => handleWaPreviewOpen(r)}
              className="p-1.5 text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title={`Gönderildi: ${formatDate(r.waSentAt)} - Tekrar Gönder`}
            >
              <Smartphone size={13} className="text-emerald-600" />
              <span>Tekrar Gönder</span>
            </Button>
          ) : (
            <Button 
              onClick={() => handleWaPreviewOpen(r)}
              disabled={waSendLoading === r.id}
              className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 rounded text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
              title={waConnected ? "Veliye WhatsApp Mesajı Gönder" : "Veliye WhatsApp Mesajı Gönder (Bağlantı Gerekli)"}
            >
              {waSendLoading === r.id ? <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"/> : <Smartphone size={13}/>}
              <span>Gönder</span>
            </Button>
          )}
          <Button 
            variant="ghost"
            onClick={() => handleDelete(r.id)}
            disabled={deleteLoading && deleteId === r.id}
            className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors"
            title="Sil"
          >
            {deleteLoading && deleteId === r.id ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"/> : <Trash2 size={16}/>}
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yazılı Uyarılar"
        description="Öğrencilere verilen yazılı uyarı (tutanak) belgelerini yönetin"
        icon={<AlertTriangle size={28} />}
        actionText="Yeni Uyarı"
        onAction={() => setShowCreateModal(true)}
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Öğrenci adı, numarası veya sınıf ile ara..."
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
            {listSearch && (
              <button
                type="button"
                onClick={() => setListSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                title="Temizle"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <DataTable
          data={records}
          columns={columns}
          loading={loading}
          emptyMessage={listSearch ? "Arama sonucu bulunamadı." : "Henüz yazılı uyarı kaydı bulunmuyor. Yeni bir yazılı uyarı oluşturmak için 'Yeni Uyarı' butonunu kullanın."}
        />

        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-3">
            <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)} variant="outline">Geri</Button>
            <span className="text-sm text-gray-600 font-medium">Sayfa {page} / {pagination.totalPages}</span>
            <Button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} variant="outline">İleri</Button>
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* 1. Create Modal */}
      <ActionModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreateForm(); }}
        title="Yeni Yazılı Uyarı"
        submitText={createLoading ? 'Oluşturuluyor...' : 'Uyarı Oluştur & PDF Üret'}
        onSubmit={handleCreate}
        submitDisabled={!selectedStudentId || !selectedBehaviorCode || createLoading}
        width="lg"
      >
        <div className="space-y-5">
          {createError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2"><ShieldAlert size={16}/> {createError}</div>}
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">1. Öğrenci Seçin</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Öğrenci adı, numarası veya sınıfı ile arayın..."
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setShowStudentDropdown(true);
                  setSelectedStudentId('');
                }}
                onFocus={() => setShowStudentDropdown(true)}
                className="w-full pl-3 pr-9 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              {studentSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setStudentSearch('');
                    setSelectedStudentId('');
                    setShowStudentDropdown(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                  title="Temizle"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            {showStudentDropdown && studentSearch && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <div className="p-3 text-gray-500 text-sm text-center">Öğrenci bulunamadı</div>
                ) : (
                  filteredStudents.slice(0, 20).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleStudentSelect(s)}
                      className="px-4 py-2.5 text-sm hover:bg-indigo-50 cursor-pointer transition flex items-center justify-between"
                    >
                      <strong className="text-gray-900">{s.fullName}</strong>
                      <span className="text-gray-500 text-xs bg-slate-100 px-2 py-0.5 rounded-md">{s.className} - No: {s.schoolNumber}</span>
                    </div>
                  ))
                )}
              </div>
            )}
            {selectedStudentId && (
              <p className="text-xs text-green-600 font-medium mt-1">✓ Öğrenci seçildi — Bu öğrencinin mevcut uyarı sayısı: <strong className="text-green-700">{warningCount}</strong> (Sıradaki: {warningCount + 1}. uyarı)</p>
            )}
          </div>

          <div className="relative" style={{ zIndex: isBehaviorDropdownOpen ? 50 : 1 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">2. Davranış Seçin</label>
            <div className="relative">
              {isBehaviorDropdownOpen ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Madde no veya davranış ara..."
                    value={behaviorSearchTerm}
                    onChange={e => setBehaviorSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 p-2.5 border border-indigo-500 ring-2 ring-indigo-500/20 rounded-lg text-sm bg-white outline-none transition-all"
                    autoFocus
                  />
                  {behaviorSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setBehaviorSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                      title="Temizle"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsBehaviorDropdownOpen(true);
                    setBehaviorSearchTerm('');
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-left text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex justify-between items-center"
                >
                  <span className="truncate pr-4">
                    {selectedBehaviorCode 
                      ? allBehaviors.find(b => b.code === selectedBehaviorCode)?.text || "Davranış seçin..."
                      : "Davranış seçin..."}
                  </span>
                  <ChevronDown size={16} className="text-gray-500 shrink-0" />
                </button>
              )}

              {isBehaviorDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsBehaviorDropdownOpen(false)}></div>
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">

                    <div className="max-h-[250px] overflow-y-auto p-1">
                      {(() => {
                        const searchLower = behaviorSearchTerm.toLowerCase();
                        const filteredKeys = articleKeys.filter(article => 
                          article.toLowerCase().includes(searchLower) || 
                          behaviorsByArticle[article].some(b => b.text.toLowerCase().includes(searchLower))
                        );

                        if (filteredKeys.length === 0) {
                          return <div className="p-4 text-center text-sm text-gray-500">Sonuç bulunamadı</div>;
                        }

                        return filteredKeys.map((article) => {
                          const matchingBehaviors = behaviorsByArticle[article].filter(b => 
                            article.toLowerCase().includes(searchLower) || 
                            b.text.toLowerCase().includes(searchLower)
                          );
                          return (
                            <div key={article} className="mb-2">
                              <div className="px-3 py-2 text-xs font-bold text-gray-900 bg-gray-50/90 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-100">
                                {article}
                              </div>
                              {matchingBehaviors.map((b) => (
                                <button
                                  key={b.code}
                                  type="button"
                                  className={`w-full text-left px-3 py-2.5 text-sm rounded-md transition-colors border-b border-gray-50 last:border-0 ${selectedBehaviorCode === b.code ? 'bg-indigo-50 text-indigo-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                  onClick={() => {
                                    setSelectedBehaviorCode(b.code);
                                    setSelectedCategory(b.category);
                                    setIsBehaviorDropdownOpen(false);
                                  }}
                                >
                                  <div className="whitespace-normal leading-snug">{b.text}</div>
                                </button>
                              ))}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">3. Sınıf Rehber Öğretmeni</label>
              {classTeachers.length > 0 ? (
                <select value={classTeacherName} onChange={e => setClassTeacherName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">— Seçilmedi —</option>
                  {classTeachers.map(t => <option key={t.id} value={t.name}>{t.name} ({t.className})</option>)}
                </select>
              ) : (
                <input type="text" value={classTeacherName} onChange={e => setClassTeacherName(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">4. Okul Rehber Öğretmeni</label>
              {counselors.length > 0 ? (
                <select value={schoolCounselorName} onChange={e => setSchoolCounselorName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">— Seçilmedi —</option>
                  {counselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input type="text" value={schoolCounselorName} onChange={e => setSchoolCounselorName(e.target.value)} placeholder="Ad Soyad..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">5. Düzenleyen (Müdür Yardımcısı)</label>
            {assistantPrincipals.length > 0 ? (
              <select value={issuedBy} onChange={e => setIssuedBy(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm">
                <option value="">— Okul Yönetimi —</option>
                {assistantPrincipals.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            ) : (
              <input type="text" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} placeholder="Müdür yardımcısının adını yazın..." className="w-full p-2.5 border border-gray-300 rounded-lg text-sm" />
            )}
            <p className="text-xs text-gray-500 mt-1">Boş bırakılırsa "Okul Yönetimi" olarak kaydedilir.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (Opsiyonel)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="İhlalin detayını buraya yazabilirsiniz..." className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-y" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rehberlik Notu (Opsiyonel)</label>
            <textarea value={guidanceNote} onChange={e => setGuidanceNote(e.target.value)} rows={2} placeholder="Rehberlik servisi notu..." className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm resize-y" />
          </div>
        </div>
      </ActionModal>

      {/* 2. Detail Modal */}
      <ActionModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Uyarı Detayı"
        hideSubmit
        cancelText="Kapat"
      >
        {selectedRecord && (
          <div className="space-y-4 text-sm text-gray-700">
            <div className="grid grid-cols-[120px_1fr] gap-y-3">
              <strong className="text-gray-900">Öğrenci:</strong>
              <div>{selectedRecord.student.fullName}</div>
              
              <strong className="text-gray-900">Sınıf / No:</strong>
              <div>{selectedRecord.student.className} - {selectedRecord.student.schoolNumber}</div>
              
              <strong className="text-gray-900">Uyarı No:</strong>
              <div><span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{selectedRecord.warningNumber}. Uyarı</span></div>
              
              <strong className="text-gray-900">Tarih:</strong>
              <div>{formatDate(selectedRecord.issuedAt)}</div>
              
              <strong className="text-gray-900 mt-2">Davranış:</strong>
              <div className="mt-2 text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">{selectedRecord.behaviorText}</div>
              
              {selectedRecord.description && (
                <>
                  <strong className="text-gray-900 mt-2">Açıklama:</strong>
                  <div className="mt-2 text-gray-800 bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">{selectedRecord.description}</div>
                </>
              )}
              
              {selectedRecord.guidanceNote && (
                <>
                  <strong className="text-gray-900 mt-2">Rehberlik Notu:</strong>
                  <div className="mt-2 text-gray-800 bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">{selectedRecord.guidanceNote}</div>
                </>
              )}
              
              <strong className="text-gray-900 mt-2">Düzenleyen:</strong>
              <div className="mt-2">{selectedRecord.issuedBy}</div>
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <Button 
                onClick={() => { setShowDetailModal(false); handleWaPreviewOpen(selectedRecord); }}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer"
                title="Veliye WhatsApp Bildirimi Gönder"
              >
                <Smartphone size={16}/> WhatsApp Gönder
              </Button>
              <Button 
                onClick={() => handleViewPdf(selectedRecord.id)}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer"
              >
                <Printer size={16}/> Yazdır
              </Button>
            </div>
          </div>
        )}
      </ActionModal>

      {/* 3. WhatsApp Preview Modal */}
      <ActionModal
        isOpen={showWaModal}
        onClose={() => setShowWaModal(false)}
        title="WhatsApp Yazılı Uyarı Bildirimi"
        submitText={
          !waConnected
            ? '⚠️ WhatsApp Bağlantısı Gerekli'
            : waSendLoading
            ? 'Gönderiliyor...'
            : waSelectedPhones.size === 0
            ? 'Veli Seçilmedi'
            : `📱 Seçili (${waSelectedPhones.size}) Veliye Gönder`
        }
        onSubmit={async (e) => { e.preventDefault(); await handleWaSend(); }}
        submitDisabled={!waConnected || waPreviewLoading || !!waPreviewError || waSelectedPhones.size === 0 || !!waSendLoading}
        width="lg"
      >
        {waRecord && (
          <div className="space-y-4">
            {/* WhatsApp Bağlantı Uyarısı */}
            {!waConnected && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-amber-900 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-950 text-sm">WhatsApp Bağlantısı Bulunamadı</div>
                    <p className="mt-0.5 text-amber-800 leading-relaxed">
                      Veliye WhatsApp üzerinden bildirim gönderebilmek için sol menüdeki <strong>WhatsApp İletişim</strong> bölümünden telefonunuzun kamerasıyla QR kodu taratıp bağlantı kurmalısınız.
                    </p>
                  </div>
                </div>
                <a
                  href="/admin/whatsapp"
                  className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-xs"
                >
                  WhatsApp'a Git
                </a>
              </div>
            )}

            {/* Öğrenci & Uyarı Bilgi Kartı */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-base shadow-xs">
                  {waRecord.warningNumber}
                </div>
                <div>
                  <div className="font-bold text-indigo-950 text-base flex items-center gap-2">
                    {waRecord.student.fullName}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {waRecord.student.className}
                    </span>
                    <span className="text-xs text-indigo-600 font-mono">
                      No: {waRecord.student.schoolNumber}
                    </span>
                  </div>
                  <div className="text-indigo-800 text-xs mt-0.5 font-medium">
                    {waRecord.warningNumber}. Tutanak & Yazılı Uyarı Bildirimi
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-lg">
                  {formatDate(waRecord.issuedAt)}
                </span>
              </div>
            </div>

            {/* Davranış Özeti */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
              <div className="font-bold text-slate-900 mb-0.5">İlgili Davranış / Tutanak Konusu:</div>
              <div className="text-slate-800">{waRecord.behaviorText}</div>
              {waRecord.description && (
                <div className="mt-1 text-slate-600 italic">Açıklama: {waRecord.description}</div>
              )}
            </div>

            {waPreviewError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                <ShieldAlert size={16} className="shrink-0 text-red-600"/>
                <span>{waPreviewError}</span>
              </div>
            )}
            
            {waPreviewLoading && !waPreviewData && (
              <div className="p-8 text-center text-gray-500 animate-pulse font-medium">
                Önizleme ve veli bilgileri hazırlanıyor...
              </div>
            )}

            {waPreviewData && (
              <div className="space-y-3.5">
                {/* Gönderim Seçenekleri ve Hızlı Filtre Barı */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const approved = waPreviewData.messages
                          .filter(m => m.waConsentStatus === 'ACCEPTED')
                          .map(m => m.phone);
                        setWaSelectedPhones(new Set(approved));
                      }}
                      className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Yalnızca WhatsApp KVKK izni onaylı olan velileri seçer"
                    >
                      <Check size={13} />
                      <span>Yalnızca Onaylı Velileri Seç</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (waSelectedPhones.size === waPreviewData.messages.length) {
                          setWaSelectedPhones(new Set());
                        } else {
                          setWaSelectedPhones(new Set(waPreviewData.messages.map(m => m.phone)));
                        }
                      }}
                      className="text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {waSelectedPhones.size === waPreviewData.messages.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
                    </button>
                  </div>

                  {/* PDF Ek Olarak Gönder Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-indigo-50/70 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100/70 transition">
                    <input
                      type="checkbox"
                      checked={sendAsPdf}
                      onChange={e => setSendAsPdf(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>📄 Yazılı Uyarı Belgesini (PDF) Ek Olarak Gönder</span>
                  </label>
                </div>

                {/* Veli Kartları Listesi */}
                <div className="space-y-3.5">
                  {waPreviewData.messages.map((m, i) => {
                    const isChecked = waSelectedPhones.has(m.phone);
                    const isDeclined = m.waConsentStatus === 'DECLINED';
                    const isAccepted = m.waConsentStatus === 'ACCEPTED';

                    return (
                      <div
                        key={i}
                        className={`rounded-xl border transition-all overflow-hidden ${
                          isChecked
                            ? 'border-indigo-400 ring-2 ring-indigo-100 bg-white'
                            : 'border-gray-200 bg-gray-50/70 opacity-80'
                        }`}
                      >
                        {/* Veli Başlığı ve Seçim */}
                        <label className="flex items-center gap-3 p-3 bg-white border-b border-gray-100 cursor-pointer hover:bg-slate-50/70 transition">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setWaSelectedPhones((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(m.phone);
                                else next.delete(m.phone);
                                return next;
                              });
                            }}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900">{m.parent}</span>
                                {m.relation && m.relation !== 'Veli' && (
                                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                                    {m.relation}
                                  </span>
                                )}
                                {m.isPrimary && (
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                                    1. Veli
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">
                                {formatPhoneNumber(m.phone)}
                              </div>
                            </div>

                            {/* WhatsApp Onay Rozeti */}
                            <div>
                              {isAccepted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                  <CheckCircle2 size={13} className="text-emerald-600" />
                                  <span>WhatsApp Onaylı</span>
                                </span>
                              ) : isDeclined ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                  <AlertTriangle size={13} className="text-rose-600" />
                                  <span>İzin Reddedildi</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                  <Clock size={13} className="text-amber-600" />
                                  <span>Onay Bekliyor</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </label>

                        {/* Reddedilmiş Veli Uyarısı */}
                        {isDeclined && (
                          <div className="px-3 py-2 bg-rose-50/90 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                            <span>
                              <strong>KVKK Uyarısı:</strong> Bu veli WhatsApp iletişimini reddetmiştir. Resmi bilgilendirmenin SMS veya matbu tebligat ile yapılması önerilir.
                            </span>
                          </div>
                        )}

                        {/* Mesaj Önizlemesi */}
                        <div className="p-3 bg-[#e6f4ea]/30">
                          <pre className="text-[12.5px] font-sans text-gray-800 whitespace-pre-wrap break-words m-0 leading-relaxed">
                            {m.message}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {waSelectedPhones.size === 0 && (
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200 mt-2 font-medium">
                    ⚠️ Gönderim için en az bir veli seçin.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ActionModal>
      
      {confirmModal}
    </div>
  );
}
