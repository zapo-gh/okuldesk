import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ActionModal } from '../../components/ui/ActionModal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Users, Upload, FileSpreadsheet, Trash2, Plus, Edit, ShieldAlert, Search, X, Printer, Download, ShieldCheck } from 'lucide-react';
import { Student, ParsedStudent, ImportResult, ParentPreviewRow, ParentImportResult } from './students/types';
import { StudentNewModal } from './students/StudentNewModal';
import { StudentEditModal } from './students/StudentEditModal';
import { StudentImportModal } from './students/StudentImportModal';
import { ParentImportModal } from './students/ParentImportModal';
import { DeleteAllSecurityModal } from './students/DeleteAllSecurityModal';
import { useReactToPrint } from 'react-to-print';
import { useSettings } from '../../context/SettingsContext';
import StudentListPrintTemplate from './students/StudentListPrintTemplate';
import { formatPhoneNumber } from '../../utils/formatters';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StudentListPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const { settings } = useSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Print State
  const printRef = useRef<HTMLDivElement>(null);
  const [printStudents, setPrintStudents] = useState<Student[]>([]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Ogrenci_Veli_Listesi',
    pageStyle: `
      @page { size: A4 portrait !important; margin: 10mm !important; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    `
  });

  // Excel import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importDone, setImportDone] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parent import state
  const [showParentModal, setShowParentModal] = useState(false);
  const [parentFile, setParentFile] = useState<File | null>(null);
  const [parentPreview, setParentPreview] = useState<ParentImportResult | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState('');
  const [parentDone, setParentDone] = useState<ParentImportResult | null>(null);
  const parentFileRef = useRef<HTMLInputElement>(null);

  // WhatsApp Onay Export
  const [exportingConsents, setExportingConsents] = useState(false);
  const handleExportConsents = async () => {
    setExportingConsents(true);
    try {
      const res = await api.get('/whatsapp/consents/export', { responseType: 'blob' });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WhatsApp_Iletisim_Onay_Listesi_${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('WhatsApp onay listesi Excel olarak indirildi.');
    } catch (err: any) {
      toast.error('Onay listesi indirilirken bir hata oluştu.');
    } finally {
      setExportingConsents(false);
    }
  };

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', className: '', status: 'ACTIVE', schoolNumber: '' });
  const [editParents, setEditParents] = useState<{ id: string; fullName: string; phone: string }[]>([]);
  const [newEditParents, setNewEditParents] = useState<{ tempId: string; fullName: string; phone: string }[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // New student modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ schoolNumber: '', fullName: '', className: '' });
  const [newParents, setNewParents] = useState<{ fullName: string; phone: string }[]>([{ fullName: '', phone: '' }]);
  const [newLoading, setNewLoading] = useState(false);
  const [newError, setNewError] = useState('');

  // Tab state
  const [classes, setClasses] = useState<{name: string, count: number}[]>([]);
  const [activeClass, setActiveClass] = useState<string>('');

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Delete all security modal state
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [totalSystemStudents, setTotalSystemStudents] = useState<number>(0);

  const displayClasses = search 
    ? Array.from(new Set(students.map(s => s.className)))
        .map(name => ({ name, count: students.filter(s => s.className === name).length }))
        .sort((a, b) => {
          const parse = (cls: string) => {
            const isA = cls.toUpperCase().startsWith('A-') || cls.toUpperCase().startsWith('A ');
            const stripped = isA ? cls.substring(2).trim() : cls;
            const parts = stripped.split(/[/\s-]+/);
            const grade = parseInt(parts[0], 10) || 99;
            const section = (parts[1] || '').toUpperCase();
            return { isA, grade, section };
          };
          const pa = parse(a.name), pb = parse(b.name);
          if (pa.isA !== pb.isA) return pa.isA ? 1 : -1;
          if (pa.grade !== pb.grade) return pa.grade - pb.grade;
          return pa.section.localeCompare(pb.section, 'tr', { numeric: true });
        })
    : classes;

  let filteredStudents = students;
  if (search) {
    const hasActiveClassInResults = displayClasses.some(c => c.name === activeClass);
    if (hasActiveClassInResults) {
      filteredStudents = students.filter(s => s.className === activeClass);
    }
  }

  filteredStudents = filteredStudents.sort((a, b) =>
    a.schoolNumber.localeCompare(b.schoolNumber, undefined, { numeric: true })
  );

  // Grade filter & Compact chips helpers
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');

  const getGradeCategory = (className: string) => {
    const isA = className.toUpperCase().startsWith('A-') || className.toUpperCase().startsWith('A ');
    if (isA) return 'A';
    const match = className.match(/^(\d+)/);
    if (match) return match[1];
    return 'OTHER';
  };

  const availableGrades = React.useMemo(() => {
    const grades = new Set<string>();
    displayClasses.forEach(c => {
      grades.add(getGradeCategory(c.name));
    });
    const list: { key: string; label: string }[] = [];
    ['9', '10', '11', '12'].forEach(g => {
      if (grades.has(g)) list.push({ key: g, label: `${g}. Sınıf` });
    });
    if (grades.has('A')) list.push({ key: 'A', label: 'Açık Lise' });
    if (grades.has('OTHER')) list.push({ key: 'OTHER', label: 'Diğer' });
    return list;
  }, [displayClasses]);

  const visibleClasses = React.useMemo(() => {
    if (selectedGrade === 'ALL') return displayClasses;
    return displayClasses.filter(c => getGradeCategory(c.name) === selectedGrade);
  }, [displayClasses, selectedGrade]);

  const handlePrintStudents = () => {
    const toPrint = selectedIds.size > 0
      ? filteredStudents.filter(s => selectedIds.has(s.id))
      : filteredStudents;

    if (toPrint.length === 0) {
      toast.error('Yazdırılacak öğrenci bulunamadı.');
      return;
    }

    setPrintStudents(toPrint);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/students/classes');
      const classList = res.data.data || [];
      setClasses(classList);
      const totalFromClasses = classList.reduce((sum: number, c: any) => sum + (c.count || 0), 0);
      setTotalSystemStudents(totalFromClasses);
      if (classList.length > 0 && !activeClass) {
        setActiveClass(classList[0].name);
      }
    } catch (err) {
      console.error('Failed to load classes', err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeClass || search) {
      loadStudents();
    }
  }, [activeClass, search, page]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '500' });
      if (search) {
        params.set('search', search);
      } else if (activeClass) {
        params.set('className', activeClass);
      }

      const res = await api.get(`/students?${params}`);
      setStudents(res.data.data.students);
      setPagination(res.data.data.pagination);
      await fetchClasses();
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!await confirm(`${name} adlı öğrenciyi silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/students/${id}`);
      loadStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Öğrenci silinemedi.');
    }
  };

  const handleSendConsent = async (parentId: string) => {
    try {
      await api.post('/whatsapp/send-consent', { parentId });
      toast('Onay isteği veliye WhatsApp üzerinden gönderildi.');
      loadStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Onay isteği gönderilemedi.');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = filteredStudents.map((s) => s.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!await confirm(`Seçili ${selectedIds.size} öğrenciyi silmek istediğinize emin misiniz?`)) return;

    setBulkDeleting(true);
    try {
      await api.post('/students/bulk-delete', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      loadStudents();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast('Toplu silme başarısız oldu.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteAllClick = async () => {
    let total = classes.reduce((sum, c) => sum + (c.count || 0), 0);
    try {
      const countRes = await api.get('/students?limit=1&status=ALL');
      const totalFromApi = countRes.data?.data?.pagination?.total;
      if (typeof totalFromApi === 'number') {
        total = totalFromApi;
      }
    } catch {
      // fallback to classes sum
    }

    setTotalSystemStudents(total);

    if (total === 0) {
      toast('Sistemde silinecek öğrenci kaydı bulunamadı.');
      return;
    }
    setShowDeleteAllModal(true);
  };

  const handleConfirmDeleteAll = async () => {
    setDeleteAllLoading(true);
    try {
      const res = await api.delete('/students/bulk/delete-all');
      const deletedCount = res.data?.data?.deletedCount ?? totalSystemStudents;
      toast.success(`Okul genelindeki tüm öğrenciler (${deletedCount} kayıt) başarıyla silindi.`);
      setShowDeleteAllModal(false);
      setSelectedIds(new Set());
      setPage(1);
      setActiveClass('');
      loadStudents();
      const classRes = await api.get('/students/classes');
      setClasses(classRes.data.data || []);
      setTotalSystemStudents(0);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Silme işlemi başarısız oldu.');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const resetImportModal = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportError('');
    setImportDone(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportError('');
    setImportDone(null);
    setImportLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/students/import-excel?mode=preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportPreview(res.data.data);
    } catch (err: any) {
      setImportError(err?.response?.data?.message || 'Excel dosyası okunamadı.');
      setImportPreview(null);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post('/students/import-excel?mode=import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportDone(res.data.data);
      setImportPreview(null);
      loadStudents();
    } catch (err: any) {
      setImportError(err?.response?.data?.message || 'İçe aktarma başarısız.');
    } finally {
      setImportLoading(false);
    }
  };

  const resetParentModal = () => {
    setParentFile(null);
    setParentPreview(null);
    setParentError('');
    setParentDone(null);
    if (parentFileRef.current) parentFileRef.current.value = '';
  };

  const handleParentFileSelect = async (file: File) => {
    setParentFile(file);
    setParentError('');
    setParentDone(null);
    setParentLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/students/import-parents?mode=preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParentPreview(res.data.data);
    } catch (err: any) {
      setParentError(err?.response?.data?.message || 'Excel dosyası okunamadı.');
      setParentPreview(null);
    } finally {
      setParentLoading(false);
    }
  };

  const handleParentImportConfirm = async () => {
    if (!parentFile) return;
    setParentLoading(true);
    setParentError('');

    try {
      const formData = new FormData();
      formData.append('file', parentFile);
      const res = await api.post('/students/import-parents?mode=import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParentDone(res.data.data);
      setParentPreview(null);
      loadStudents();
    } catch (err: any) {
      setParentError(err?.response?.data?.message || 'İçe aktarma başarısız.');
    } finally {
      setParentLoading(false);
    }
  };

  const openEditModal = (student: Student) => {
    setEditStudent(student);
    setEditForm({
      fullName: student.fullName,
      className: student.className,
      status: student.status,
      schoolNumber: student.schoolNumber,
    });
    setEditParents(student.parents.map((p) => ({ ...p })));
    setNewEditParents([]);
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setEditLoading(true);
    setEditError('');

    try {
      const trimmedNumber = editForm.schoolNumber.trim();
      const trimmedName = editForm.fullName.trim();
      const trimmedClass = editForm.className.trim();

      await api.put(`/students/${editStudent.id}`, {
        schoolNumber: trimmedNumber,
        fullName: trimmedName,
        className: trimmedClass,
        status: editForm.status,
      });

      // Optimistik güncelleme ile arayüz anında güncellensin
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editStudent.id
            ? {
                ...s,
                schoolNumber: trimmedNumber,
                fullName: trimmedName,
                className: trimmedClass,
                status: editForm.status,
              }
            : s
        )
      );

      for (const p of editParents) {
        if (p.id) {
          await api.put(`/students/parents/${p.id}`, {
            fullName: p.fullName.trim(),
            phone: p.phone.trim(),
          });
        }
      }

      // Yeni eklenen tüm velileri sırayla kaydet
      for (const np of newEditParents) {
        if (np.fullName.trim() && np.phone.trim()) {
          const response = await api.post(`/students/${editStudent.id}/parents`, {
            fullName: np.fullName.trim(),
            phone: np.phone.trim(),
          });

          if (response.data?.data?.generatedPassword) {
            toast(`✅ ${np.fullName.trim()} için yeni veli hesabı oluşturuldu.\n\nGeçici Şifre: ${response.data.data.generatedPassword}\n\nLütfen bu şifreyi veliye iletin. Veli ilk girişinde şifresini değiştirmek zorundadır.`);
          } else if (response.data?.data?.isExistingUser) {
            toast(`ℹ️ ${np.fullName.trim()} (${np.phone.trim()}) zaten kayıtlı.\nVeli mevcut hesabıyla bağlandı. Şifre değiştirilmedi.`);
          }
        }
      }

      const isNumberChanged = trimmedNumber !== editStudent.schoolNumber;
      toast.success(
        isNumberChanged
          ? `Öğrenci okul numarası (${trimmedNumber}) ve bilgileri başarıyla güncellendi.`
          : 'Öğrenci bilgileri güncellendi.'
      );

      if (trimmedClass !== editStudent.className) {
        fetchClasses();
      }

      setShowEditModal(false);
      loadStudents();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Güncelleme başarısız.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveParent = async (parentId: string) => {
    if (!editStudent) return;
    if (!await confirm('Bu veliyi öğrenciden kaldırmak istediğinize emin misiniz?')) return;

    try {
      await api.delete(`/students/${editStudent.id}/parents/${parentId}`);
      setEditParents((prev) => prev.filter((p) => p.id !== parentId));
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Veli kaldırma başarısız.');
    }
  };

  const columns: Column<Student>[] = [
    {
      header: (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id))}
          onChange={toggleSelectAll}
          title="Tümünü seç/kaldır"
        />
      ),
      align: 'center',
      render: (s) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={selectedIds.has(s.id)}
          onChange={() => toggleSelect(s.id)}
        />
      )
    },
    {
      header: 'Okul No',
      className: 'w-24',
      render: (s) => <span className="font-semibold text-gray-700">{s.schoolNumber}</span>
    },
    {
      header: 'Ad Soyad',
      className: 'w-48',
      render: (s) => <span className="font-bold text-gray-900">{s.fullName}</span>
    },
    {
      header: 'Durum',
      className: 'w-28',
      render: (s) => <StatusBadge status={s.status} />
    },
    {
      header: 'Veli Bilgileri',
      className: 'min-w-[460px]',
      render: (s) => (
        <div className="flex items-center gap-2 flex-nowrap">
          {s.parents.length > 0 ? (
            s.parents.map((p, pi) => (
              <div key={pi} className="text-xs bg-gray-50 border border-gray-200/80 rounded-lg p-2 shrink-0 min-w-[210px] max-w-[260px]">
                <div className="flex items-center justify-between gap-2 mb-1.5 whitespace-nowrap">
                  <span className="font-semibold text-gray-800 text-xs truncate max-w-[130px]" title={p.fullName}>{p.fullName}</span>
                  {p.phone && <span className="text-gray-500 text-xs font-mono shrink-0">{formatPhoneNumber(p.phone)}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {p.waConsentStatus === 'ACCEPTED' && <StatusBadge status="ACTIVE" customText="Onaylı" />}
                  {p.waConsentStatus === 'DECLINED' && <StatusBadge status="REJECTED" customText="Reddedildi" />}
                  {p.waConsentStatus === 'PENDING' && (
                    <>
                      <StatusBadge status="PENDING" customText="Bekliyor" />
                      <Button variant="ghost" onClick={() => handleSendConsent(p.id)} className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 px-1.5 py-0.5 h-5 text-[11px] transition-colors rounded" title="Onay İste">
                        Onay İste
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-400 italic text-sm">-</span>
          )}
        </div>
      )
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => openEditModal(s)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Düzenle">
            <Edit size={16} />
          </Button>
          <Button variant="ghost" onClick={() => handleDelete(s.id, s.fullName)} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Sil">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Öğrenciler"
        description="Öğrenci listesini yönetin ve veli bilgilerini güncelleyin"
        icon={<Users size={28} />}
        actions={
          <>
            <Button 
              onClick={handleDeleteAllClick}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 size={16} /> Tümünü Sil
            </Button>
            <Button 
              onClick={handleExportConsents}
              disabled={exportingConsents}
              variant="outline"
              title="Velilerden alınan WhatsApp onay durumlarını Excel listesi olarak indirir"
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
            >
              <Download size={16} /> Onayları İndir
            </Button>
            <Button 
              onClick={() => { resetParentModal(); setShowParentModal(true); }}
              variant="outline"
            >
              <Users size={16} /> Veli Bilgisi Aktar
            </Button>
            <Button 
              onClick={() => { resetImportModal(); setShowImportModal(true); }}
              variant="outline"
            >
              <FileSpreadsheet size={16} /> Excel'den Aktar
            </Button>
            <Button 
              onClick={() => { setNewForm({ schoolNumber: '', fullName: '', className: '' }); setNewParents([{ fullName: '', phone: '' }]); setNewError(''); setShowNewModal(true); }}
              variant="primary"
            >
              <Plus size={16} /> Yeni Öğrenci
            </Button>
          </>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search & Tabs */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          {/* Arama ve Yazdır Çubuğu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Öğrenci ara (ad, numara, sınıf)..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-white text-slate-900 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Aramayı Temizle"
                >
                  <span className="p-1 rounded-full hover:bg-slate-100 flex items-center justify-center">
                    <X size={15} />
                  </span>
                </button>
              )}
            </div>

            {/* Veli Bilgileriyle Yazdır Butonu (Arama satırının en sağında) */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={handlePrintStudents}
                variant="outline"
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs h-9 px-3.5 text-xs font-semibold"
                title="Seçili veya görüntülenen öğrenci listesini veli bilgileriyle beraber yazdır"
              >
                <Printer size={15} className="text-indigo-600" />
                <span>
                  {selectedIds.size > 0
                    ? `Seçiliyi Yazdır (${selectedIds.size})`
                    : `Listeyi Yazdır (${filteredStudents.length})`}
                </span>
              </Button>
            </div>
          </div>

          {!loading && displayClasses.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {/* Kademe Filtre Çubuğu */}
              {availableGrades.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Kademe:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedGrade('ALL')}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      selectedGrade === 'ALL'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    Tümü ({displayClasses.length})
                  </button>
                  {availableGrades.map((g) => {
                    const gradeCount = displayClasses.filter(c => getGradeCategory(c.name) === g.key).length;
                    return (
                      <button
                        type="button"
                        key={g.key}
                        onClick={() => {
                          setSelectedGrade(g.key);
                          const firstInGrade = displayClasses.find(c => getGradeCategory(c.name) === g.key);
                          if (firstInGrade && getGradeCategory(activeClass) !== g.key) {
                            setActiveClass(firstInGrade.name);
                            setSelectedIds(new Set());
                            setPage(1);
                          }
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                          selectedGrade === g.key
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                        }`}
                      >
                        {g.label} ({gradeCount})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Kompakt Sınıf Chipleri */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {visibleClasses.map((cls) => {
                  const isHighlighted = activeClass === cls.name;

                  return (
                    <button
                      type="button"
                      key={cls.name}
                      onClick={() => { 
                        setActiveClass(cls.name); 
                        setSelectedIds(new Set()); 
                        setPage(1); 
                      }}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer outline-none focus:outline-none select-none border ${
                        isHighlighted
                          ? 'bg-indigo-600 text-white shadow-2xs border-indigo-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span>{cls.name}</span>
                      <span className={`ml-1 text-[10px] px-1 py-0 rounded font-semibold ${
                        isHighlighted ? 'bg-indigo-700/70 text-indigo-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {cls.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Bar (Delete / Summary) */}
        {!loading && displayClasses.length > 0 && (
          <div className="flex justify-between items-center px-6 py-3 bg-indigo-50/50 border-b border-indigo-100/50 text-sm">
            <div className="font-medium text-gray-700">
              <span className="text-indigo-700 font-bold mr-2">
                {search ? (displayClasses.some(c => c.name === activeClass) ? `Arama: "${search}" (${activeClass})` : `Arama: "${search}" (Tümü)`) : `Sınıf ${activeClass}`}
              </span> 
              ({filteredStudents.length} öğrenci)
              
              {selectedIds.size > 0 && (
                <span className="ml-3 text-indigo-600 font-bold">
                  {selectedIds.size} Seçili
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {selectedIds.size > 0 && (
                <Button 
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded flex items-center gap-1 font-medium transition disabled:opacity-50"
                >
                  {bulkDeleting ? 'Siliniyor...' : <><Trash2 size={14}/> {selectedIds.size} Öğrenciyi Sil</>}
                </Button>
              )}
              <span className="text-gray-500">Toplam {students.length} Kayıt</span>
            </div>
          </div>
        )}

        {/* Data Table */}
        <DataTable
          data={filteredStudents}
          columns={columns}
          loading={loading}
          emptyMessage="Bu sınıfta öğrenci bulunamadı veya hiç öğrenci kaydı yok."
          rowClassName={(s) => selectedIds.has(s.id) ? 'bg-indigo-50/30' : ''}
        />
      </div>

      {/* ─── MODALS ─── */}

      {/* New Student Modal */}
      <StudentNewModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSubmit={async (e) => {
          e.preventDefault();
          setNewLoading(true);
          setNewError('');
          try {
            const validParents = newParents.filter(p => p.fullName.trim() && p.phone.trim());
            await api.post('/students', {
              schoolNumber: newForm.schoolNumber,
              fullName: newForm.fullName,
              className: newForm.className,
              ...(validParents.length > 0 ? { parents: validParents } : {}),
            });
            setShowNewModal(false);
            loadStudents();
          } catch (err: any) {
            setNewError(err?.response?.data?.message || 'Öğrenci eklenemedi.');
          } finally {
            setNewLoading(false);
          }
        }}
        newLoading={newLoading}
        newError={newError}
        newForm={newForm}
        setNewForm={setNewForm}
        newParents={newParents}
        setNewParents={setNewParents}
      />

      {/* Edit Student Modal */}
      <StudentEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSubmit}
        editError={editError}
        editForm={editForm}
        setEditForm={setEditForm}
        editParents={editParents}
        setEditParents={setEditParents}
        newEditParents={newEditParents}
        setNewEditParents={setNewEditParents}
        handleRemoveParent={handleRemoveParent}
        originalSchoolNumber={editStudent?.schoolNumber || ''}
      />

      {/* Excel Import Modal */}
      <StudentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        importError={importError}
        importPreview={importPreview}
        importDone={importDone}
        importLoading={importLoading}
        fileInputRef={fileInputRef}
        importFile={importFile}
        handleFileSelect={handleFileSelect}
        resetImportModal={resetImportModal}
        handleImportConfirm={handleImportConfirm}
      />

      {/* Parent Import Modal */}
      <ParentImportModal
        isOpen={showParentModal}
        onClose={() => setShowParentModal(false)}
        parentError={parentError}
        parentPreview={parentPreview}
        parentDone={parentDone}
        parentLoading={parentLoading}
        parentFileRef={parentFileRef}
        handleParentFileSelect={handleParentFileSelect}
        resetParentModal={resetParentModal}
        handleParentImportConfirm={handleParentImportConfirm}
      />

      {/* Delete All Security Modal */}
      <DeleteAllSecurityModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleConfirmDeleteAll}
        loading={deleteAllLoading}
        totalStudents={totalSystemStudents || classes.reduce((sum, c) => sum + (c.count || 0), 0)}
        totalClasses={classes.length}
        activeClassName={activeClass}
      />

      {/* Hidden Print Container */}
      <div className="hidden">
        <div ref={printRef}>
          {printStudents.length > 0 && (
            <StudentListPrintTemplate
              students={printStudents}
              activeClass={activeClass}
              searchQuery={search}
              settings={settings}
            />
          )}
        </div>
      </div>

      {confirmModal}
    </div>
  );
}
