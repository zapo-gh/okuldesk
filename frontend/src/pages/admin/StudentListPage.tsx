import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ActionModal } from '../../components/ui/ActionModal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Users, Upload, FileSpreadsheet, Trash2, Plus, Edit, ShieldAlert } from 'lucide-react';
import { Student, ParsedStudent, ImportResult, ParentPreviewRow, ParentImportResult } from './students/types';
import { StudentNewModal } from './students/StudentNewModal';
import { StudentEditModal } from './students/StudentEditModal';
import { StudentImportModal } from './students/StudentImportModal';
import { ParentImportModal } from './students/ParentImportModal';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StudentListPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

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

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', className: '', status: 'ACTIVE', schoolNumber: '' });
  const [editParents, setEditParents] = useState<{ id: string; fullName: string; phone: string }[]>([]);
  const [newEditParent, setNewEditParent] = useState<{ fullName: string; phone: string } | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // New student modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ schoolNumber: '', fullName: '', className: '' });
  const [newParents, setNewParents] = useState<{ fullName: string; phone: string }[]>([{ fullName: '', phone: '' }]);
  const [newLoading, setNewLoading] = useState(false);
  const [newError, setNewError] = useState('');

  // Tab state
  const [activeClass, setActiveClass] = useState<string>('');

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Derive sorted class names and grouped data
  const grouped: Record<string, Student[]> = {};
  students.forEach((s) => {
    if (!grouped[s.className]) grouped[s.className] = [];
    grouped[s.className].push(s);
  });

  const sortedClassNames = Object.keys(grouped).sort((a, b) => {
    const parse = (cls: string) => {
      const parts = cls.split(/[/\s-]+/);
      const grade = parseInt(parts[0], 10) || 99;
      const section = (parts[1] || '').toUpperCase();
      return { grade, section };
    };
    const pa = parse(a), pb = parse(b);
    if (pa.grade !== pb.grade) return pa.grade - pb.grade;
    return pa.section.localeCompare(pb.section, 'tr');
  });

  const effectiveClass = activeClass && grouped[activeClass] ? activeClass : sortedClassNames[0] || '';
  const filteredStudents = (grouped[effectiveClass] || []).sort((a, b) =>
    a.schoolNumber.localeCompare(b.schoolNumber, undefined, { numeric: true })
  );

  useEffect(() => {
    loadStudents();
  }, [page, search]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '500' });
      if (search) params.set('search', search);

      const res = await api.get(`/students?${params}`);
      setStudents(res.data.data.students);
      setPagination(res.data.data.pagination);
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
    setNewEditParent(null);
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setEditLoading(true);
    setEditError('');

    try {
      await api.put(`/students/${editStudent.id}`, {
        fullName: editForm.fullName,
        className: editForm.className,
        status: editForm.status,
      });

      for (const p of editParents) {
        if (p.id) {
          await api.put(`/students/parents/${p.id}`, {
            fullName: p.fullName,
            phone: p.phone,
          });
        }
      }

      if (newEditParent && newEditParent.fullName.trim() && newEditParent.phone.trim()) {
        const response = await api.post(`/students/${editStudent.id}/parents`, {
          fullName: newEditParent.fullName.trim(),
          phone: newEditParent.phone.trim(),
        });

        if (response.data?.data?.generatedPassword) {
          toast(`✅ Yeni veli hesabı oluşturuldu.\n\nGeçici Şifre: ${response.data.data.generatedPassword}\n\nLütfen bu şifreyi veliye iletin. Veli ilk girişinde şifresini değiştirmek zorundadır.`);
        } else if (response.data?.data?.isExistingUser) {
          toast(`ℹ️ Bu telefon numarası zaten sistemde kayıtlı.\n\nVeli mevcut hesabıyla bağlandı. Şifre değiştirilmedi.`);
        }
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
      render: (s) => <span className="font-semibold text-gray-700">{s.schoolNumber}</span>
    },
    {
      header: 'Ad Soyad',
      render: (s) => <span className="font-bold text-gray-900">{s.fullName}</span>
    },
    {
      header: 'Durum',
      render: (s) => <StatusBadge status={s.status} />
    },
    {
      header: 'Veli Bilgileri',
      render: (s) => (
        <div className="space-y-2">
          {s.parents.length > 0 ? (
            s.parents.map((p, pi) => (
              <div key={pi} className="text-sm border-b border-gray-50 pb-1 last:border-0 last:pb-0">
                <div>
                  <span className="font-medium text-gray-800">{p.fullName}</span>
                  {p.phone && <span className="text-gray-500 ml-2">{p.phone}</span>}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {p.waConsentStatus === 'ACCEPTED' && <StatusBadge status="ACTIVE" customText="Onaylı" />}
                  {p.waConsentStatus === 'DECLINED' && <StatusBadge status="REJECTED" customText="Reddedildi" />}
                  {p.waConsentStatus === 'PENDING' && (
                    <>
                      <StatusBadge status="PENDING" customText="Bekliyor" />
                      <Button variant="ghost" onClick={() => handleSendConsent(p.id)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Düzenle">
                        Onay İste
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-400">-</span>
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
        icon={<Users size={28} className="text-indigo-600" />}
        actions={
          <>
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search & Tabs */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="max-w-md mb-4">
            <input
              type="text"
              placeholder="Öğrenci ara (ad, numara, sınıf)..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          {!loading && sortedClassNames.length > 0 && (
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 px-1 pt-1 -mx-1 -mt-1">
              {sortedClassNames.map((cls) => (
                <Button
                  key={cls}
                  variant={effectiveClass === cls ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => { setActiveClass(cls); setSelectedIds(new Set()); }}
                  className="rounded-full shrink-0"
                >
                  {cls}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${effectiveClass === cls ? 'bg-indigo-700/50 text-indigo-50' : 'bg-gray-100 text-gray-500'}`}>
                    {grouped[cls].length}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Action Bar (Delete / Summary) */}
        {!loading && sortedClassNames.length > 0 && (
          <div className="flex justify-between items-center px-6 py-3 bg-indigo-50/50 border-b border-indigo-100/50 text-sm">
            <div className="font-medium text-gray-700">
              <span className="text-indigo-700 font-bold mr-2">Sınıf {effectiveClass}</span> 
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-center gap-3">
            <Button 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              variant="outline"
            >
              Geri
            </Button>
            <span className="text-sm text-gray-600 font-medium">Sayfa {page} / {pagination.totalPages}</span>
            <Button 
              disabled={page === pagination.totalPages}
              onClick={() => setPage(page + 1)}
              variant="outline"
            >
              İleri
            </Button>
          </div>
        )}
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
        newEditParent={newEditParent}
        setNewEditParent={setNewEditParent}
        handleRemoveParent={handleRemoveParent}
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
      
      {confirmModal}
    </div>
  );
}
