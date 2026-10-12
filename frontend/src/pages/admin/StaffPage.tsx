import toast from 'react-hot-toast';
import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ActionModal } from '../../components/ui/ActionModal';
import { Users, Plus, Edit, Trash2, Shield, Compass, BookOpen, Upload, AlertCircle, Building2, Search, X, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../../components/ui/Button';

export type StaffRole = 'KURUM_PERSONELI' | 'MUDUR_YARDIMCISI' | 'REHBER_OGRETMEN' | 'SINIF_REHBER_OGRETMEN';

interface StaffMember {
  id: string;
  name: string;
  title: StaffRole;
  className?: string | null;
  clubName?: string | null;
  tcKimlikNo?: string | null;
  brans?: string | null;
  kurumSicilNo?: string | null;
  emekliSicilNo?: string | null;
  unvan?: string | null;
  gorev?: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  KURUM_PERSONELI: 'Kurum Personeli (Öğretmen vb.)',
  MUDUR_YARDIMCISI: 'Müdür Yardımcısı',
  REHBER_OGRETMEN: 'Okul Rehber Öğretmeni',
  SINIF_REHBER_OGRETMEN: 'Sınıf Rehber Öğretmeni',
};

const ROLE_ICONS: Record<StaffRole, React.ReactNode> = {
  KURUM_PERSONELI: <Building2 size={18} className="text-blue-600" />,
  MUDUR_YARDIMCISI: <Shield size={18} className="text-indigo-600" />,
  REHBER_OGRETMEN: <Compass size={18} className="text-teal-600" />,
  SINIF_REHBER_OGRETMEN: <BookOpen size={18} className="text-amber-600" />,
};

const emptyForm = { 
  name: '', title: 'KURUM_PERSONELI' as StaffRole, className: '',
  tcKimlikNo: '', brans: '', kurumSicilNo: '', emekliSicilNo: '', unvan: '', gorev: ''
};

export default function StaffPage() {
  const { confirm, alert, confirmModal } = useConfirm();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  

  // Normal Form Modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'deleted'>('active');
  
  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Search and Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Excel Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get(viewMode === 'active' ? '/staff' : '/staff/deleted');
      setStaff(res.data.data.staff);
      setSelectedIds(new Set());
    } catch {
      toast.error('Personel listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, [viewMode]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditTarget(s);
    setForm({ 
      name: s.name, 
      title: s.title, 
      className: s.className || '',
      tcKimlikNo: s.tcKimlikNo || '',
      brans: s.brans || '',
      kurumSicilNo: s.kurumSicilNo || '',
      emekliSicilNo: s.emekliSicilNo || '',
      unvan: s.unvan || '',
      gorev: s.gorev || ''
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Ad zorunludur.'); return; }
    
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        title: form.title,
        className: form.className?.trim() || undefined,
        tcKimlikNo: form.tcKimlikNo || undefined,
        brans: form.brans || undefined,
        kurumSicilNo: form.kurumSicilNo || undefined,
        emekliSicilNo: form.emekliSicilNo || undefined,
        unvan: form.unvan || undefined,
        gorev: form.gorev || undefined,
      };

      if (editTarget) {
        await api.put(`/staff/${editTarget.id}`, payload);
      } else {
        await api.post('/staff', payload);
      }
      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Bu personeli silmek istediğinizden emin misiniz?')) return;
    setDeleteId(id);
    try {
      await api.delete(`/staff/${id}`);
      fetchStaff();
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Silme işlemi başarısız.');
    } finally {
      setDeleteId('');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!await confirm(`Seçili ${selectedIds.size} personeli silmek istediğinize emin misiniz?`)) return;
    setBulkDeleting(true);
    try {
      await api.post('/staff/bulk-delete', { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} personel başarıyla silindi.`);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Toplu silme başarısız.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleRestore = async (id: string) => {
    if (!await confirm('Bu personeli geri yüklemek istediğinize emin misiniz?')) return;
    try {
      await api.put(`/staff/${id}/restore`);
      toast.success('Personel başarıyla geri yüklendi.');
      fetchStaff();
    } catch (err: any) {
      toast.error('Geri alma işlemi başarısız.');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    if (!await confirm(`Seçili ${selectedIds.size} personeli geri yüklemek istediğinize emin misiniz?`)) return;
    try {
      await api.post('/staff/bulk-restore', { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} personel başarıyla geri yüklendi.`);
      fetchStaff();
    } catch (err: any) {
      toast.error('Toplu geri alma başarısız.');
    }
  };

  const branches = Array.from(new Set(staff.map(s => s.brans).filter(Boolean))) as string[];
  const roles = Array.from(new Set(staff.map(s => s.unvan || ROLE_LABELS[s.title]).filter(Boolean))) as string[];

  const filteredStaff = staff.filter(s => {
    if (selectedBranch && s.brans !== selectedBranch) return false;
    if (selectedRole && (s.unvan !== selectedRole && ROLE_LABELS[s.title] !== selectedRole)) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLocaleLowerCase('tr-TR');
      const matchName = s.name.toLocaleLowerCase('tr-TR').includes(q);
      const matchTc = s.tcKimlikNo?.includes(q);
      const matchBrans = s.brans?.toLocaleLowerCase('tr-TR').includes(q);
      const matchUnvan = s.unvan?.toLocaleLowerCase('tr-TR').includes(q);
      const matchClass = s.className?.toLocaleLowerCase('tr-TR').includes(q);
      if (!matchName && !matchTc && !matchBrans && !matchUnvan && !matchClass) return false;
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStaff.length && filteredStaff.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStaff.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const columns: Column<StaffMember>[] = [
    {
      header: (
        <input 
          type="checkbox" 
          checked={filteredStaff.length > 0 && selectedIds.size === filteredStaff.length}
          onChange={toggleSelectAll}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          aria-label="Tümünü seç"
        />
      ),
      className: 'w-12 text-center',
      render: (s) => (
        <input 
          type="checkbox" 
          checked={selectedIds.has(s.id)}
          onChange={() => toggleSelect(s.id)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          aria-label={`${s.name} seç`}
        />
      ),
    },
    {
      header: 'Ad Soyad',
      render: (s) => (
        <div>
          <span className="font-semibold text-gray-900">{s.name}</span>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            {s.tcKimlikNo && <span>TC: {s.tcKimlikNo}</span>}
            {s.kurumSicilNo && <span>• Sicil: {s.kurumSicilNo}</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Unvan & Görev',
      className: 'hidden md:table-cell',
      render: (s) => (
        <div>
          <div className="font-medium text-gray-800">{s.unvan || ROLE_LABELS[s.title] || '-'}</div>
          {s.gorev && <div className="text-xs text-gray-500">{s.gorev}</div>}
        </div>
      ),
    },
    {
      header: 'Branş',
      className: 'hidden lg:table-cell',
      render: (s) => (
        <span className="text-gray-700 font-medium">{s.brans || '-'}</span>
      ),
    },
    {
      header: 'Sınıf / Kulüp',
      render: (s) => (
        <div className="flex flex-col gap-1 items-start">
          {s.className && (
            <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-semibold border border-amber-200">
              Sınıf: {s.className}
            </span>
          )}
          {s.clubName && (
            <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-semibold border border-emerald-200">
              Kulüp: {s.clubName}
            </span>
          )}
          {!s.className && !s.clubName && (
            <span className="text-gray-400 text-xs italic">- Yok -</span>
          )}
        </div>
      ),
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-1.5">
          {viewMode === 'active' ? (
            <>
              <Button 
                variant="ghost" 
                onClick={() => openEdit(s)} 
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 h-8 w-8 rounded-lg" 
                title="Düzenle"
              >
                <Edit size={16} />
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => handleDelete(s.id)} 
                disabled={deleteId === s.id} 
                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 h-8 w-8 rounded-lg disabled:opacity-50" 
                title="Sil"
              >
                <Trash2 size={16} />
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => handleRestore(s.id)} 
              className="text-indigo-600 border-indigo-300 hover:bg-indigo-50 px-2.5 py-1 text-xs" 
              title="Geri Al"
            >
              Geri Al
            </Button>
          )}
        </div>
      ),
    },
  ];

  // EXCEL İÇE AKTAR LOGIC (GELİŞMİŞ SMART MAPPER)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      const jsonData = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];

      const parsedStaff: any[] = [];
      let currentStaff: any = null;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        let foundInThisRow = false;

        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          
          if (typeof cell === 'string') {
            const cellStr = cell.trim();
            // Yeni personel satırını algıla: İSİM SOYİSİM (11 Haneli TC)
            const nameTcMatch = cellStr.match(/([^\(]+?)\s*\((\d{11})\)/);
            
            if (nameTcMatch) {
              const namePart = nameTcMatch[1].trim();
              if (namePart.length < 3 || namePart.toLowerCase().includes('ad soyad')) continue;

              currentStaff = {
                name: namePart,
                tcKimlikNo: nameTcMatch[2],
                unvan: '',
                gorev: '',
                brans: '',
                kurumSicilNo: '',
                emekliSicilNo: '',
                extraData: '{}'
              };
              parsedStaff.push(currentStaff);
              foundInThisRow = true;

              // Aynı satırdaki (row) diğer dolu hücreleri topla (Unvan ve Branş için)
              const stringCellsAfter = [];
              for (let k = j + 1; k < row.length; k++) {
                if (row[k] && typeof row[k] === 'string' && row[k].trim() !== '') {
                  stringCellsAfter.push(row[k].trim());
                }
              }
              
              if (stringCellsAfter.length >= 1) {
                const ug = stringCellsAfter[0]; // Örn: 'Öğretmen/Müdür Başyardımcısı'
                const parts = ug.split('/');
                currentStaff.unvan = parts[0]?.trim() || '';
                currentStaff.gorev = parts[1]?.trim() || '';
              }
              
              if (stringCellsAfter.length >= 2) {
                const br = stringCellsAfter[1]; // Örn: 'Türk Dili ve Edebiyatı / Uzman Öğretmen'
                currentStaff.brans = br.split('/')[0]?.trim() || '';
              }
            } else if (currentStaff && !foundInThisRow) {
              // Önceki personelin devam eden satırı ise 6-8 haneli sayılar Sicil Numarası olabilir.
              if (/^\d{6,8}$/.test(cellStr)) {
                if (!currentStaff.emekliSicilNo) currentStaff.emekliSicilNo = cellStr;
                else if (!currentStaff.kurumSicilNo) currentStaff.kurumSicilNo = cellStr;
              }
            }
          } else if (typeof cell === 'number' && currentStaff && !foundInThisRow) {
            const numStr = cell.toString();
            if (/^\d{6,8}$/.test(numStr)) {
              if (!currentStaff.emekliSicilNo) currentStaff.emekliSicilNo = numStr;
              else if (!currentStaff.kurumSicilNo) currentStaff.kurumSicilNo = numStr;
            }
          }
        }
      }

      // Eğer MEBBİS formatında kimse bulunamadıysa, standart Tablo (Sütun/Satır) Excel'dir.
      if (parsedStaff.length === 0 && jsonData.length > 0) {
        for (const row of jsonData) {
          const tc = row['T.C. Kimlik No'] || row['TC Kimlik No'] || row['TC'] || row['tcKimlikNo'] || row['TC KİMLİK NO'];
          const name = row['Adı Soyadı'] || row['Ad Soyad'] || row['ADI SOYADI'] || row['name'];
          
          if (name) {
            parsedStaff.push({
               name: String(name).trim(),
               tcKimlikNo: tc ? String(tc).trim() : '',
               unvan: row['Unvan'] || row['Unvanı'] || row['UNVAN'] || '',
               gorev: row['Görev'] || row['Görevi'] || row['GÖREV'] || '',
               brans: row['Branş'] || row['Branşı'] || row['BRANŞ'] || '',
               kurumSicilNo: row['Kurum Sicil No'] || row['Sicil No'] || '',
               emekliSicilNo: row['Emekli Sicil No'] || '',
               extraData: JSON.stringify(row) // Bütün sütunları kaydet
            });
          }
        }
      }

      setImportData(parsedStaff);
      setShowImportModal(true);
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; // reset
  };

  const handleBulkSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (importData.length === 0) return;
    setImporting(true);
    try {
      const payload = importData.map(s => ({
        name: s.name,
        role: 'KURUM_PERSONELI',
        tcKimlikNo: s.tcKimlikNo,
        brans: s.brans,
        kurumSicilNo: s.kurumSicilNo,
        emekliSicilNo: s.emekliSicilNo,
        unvan: s.unvan,
        gorev: s.gorev,
        extraData: s.extraData || '{}',
      }));

      const res = await api.post('/staff/bulk', { staff: payload });
      toast.success(`${res.data.count} personel başarıyla havuza eklendi.`);
      setShowImportModal(false);
      setImportData([]);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İçe aktarma başarısız oldu.');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Merkezi Personel Havuzu"
        description="Okuldaki tüm öğretmen, idareci ve personelleri tek bir merkezden yönetin."
        icon={<Users size={28} />}
        actions={
          <>
            <input
              type="file"
              accept=".xls,.xlsx"
              ref={fileInputRef}
              className="hidden w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
              onChange={handleFileUpload}
            />
            
            {selectedIds.size > 0 && viewMode === 'active' && (
              <Button variant="danger" onClick={handleBulkDelete} disabled={bulkDeleting} className="px-3 py-2 flex items-center gap-2" title="Seçilenleri Sil">
                <Trash2 size={18} />
                {bulkDeleting ? 'Siliniyor...' : `Seçilenleri Sil (${selectedIds.size})`}
              </Button>
            )}

            {selectedIds.size > 0 && viewMode === 'deleted' && (
              <Button variant="outline" onClick={handleBulkRestore} className="px-3 py-2 flex items-center gap-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50" title="Seçilenleri Geri Al">
                {`Seçilenleri Geri Yükle (${selectedIds.size})`}
              </Button>
            )}

            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2">
              <Upload size={18} />
              Excel'den Aktar
            </Button>
            
            <Button
              onClick={openAdd}
              variant="primary"
            >
              <Plus size={20} />
              Personel Ekle
            </Button>
          </>
        }
      />

      

      {/* TÜM PERSONEL LİSTESİ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* TAB SWITCHER */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button 
            onClick={() => { setViewMode('active'); setSelectedIds(new Set()); }} 
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${viewMode === 'active' ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Aktif Personeller
          </button>
          <button 
            onClick={() => { setViewMode('deleted'); setSelectedIds(new Set()); }} 
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${viewMode === 'deleted' ? 'border-rose-600 text-rose-600 bg-white shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Silinmiş Personeller (Çöp Kutusu)
          </button>
        </div>

        {/* SEARCH & FILTER TOOLBAR */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Ad, TC, unvan, branş veya sınıf ile ara..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                title="Temizle"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Tüm Branşlar ({branches.length})</option>
                {branches.sort().map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            {roles.length > 0 && (
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Tüm Unvanlar ({roles.length})</option>
                {roles.sort().map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}

            <div className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg self-center">
              {filteredStaff.length} / {staff.length} Kişi
            </div>
          </div>
        </div>

        <DataTable
          data={filteredStaff}
          columns={columns}
          loading={loading}
          exportable={true}
          exportFilename="Personel_Listesi"
          emptyMessage={searchTerm || selectedBranch || selectedRole ? "Arama veya filtre kriterlerine uygun personel bulunamadı." : "Henüz personel kaydı bulunmuyor."}
          rowClassName={(s) => selectedIds.has(s.id) ? 'bg-indigo-50/40' : ''}
        />
      </div>

      {/* NORMAL ADD/EDIT MODAL */}
      <ActionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
        onSubmit={handleSave}
        submitDisabled={saving}
        width="lg"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sistem Rolü</label>
              <select
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value as StaffRole })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="KURUM_PERSONELI">Kurum Personeli (Havuz)</option>
                <option value="MUDUR_YARDIMCISI">Müdür Yardımcısı</option>
                <option value="REHBER_OGRETMEN">Okul Rehber Öğretmeni</option>
                <option value="SINIF_REHBER_OGRETMEN">Sınıf Rehber Öğretmeni</option>
              </select>
            </div>
            {form.title === 'SINIF_REHBER_OGRETMEN' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sorumlu Olduğu Sınıf</label>
                <input
                  type="text"
                  value={form.className}
                  onChange={(e) => setForm({ ...form, className: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-indigo-500"
                  placeholder="Örn: 9-A"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">T.C. Kimlik No</label>
              <input type="text" value={form.tcKimlikNo} onChange={e => setForm({...form, tcKimlikNo: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branş / Atama Alanı</label>
              <input type="text" value={form.brans} onChange={e => setForm({...form, brans: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unvan</label>
              <input type="text" value={form.unvan} onChange={e => setForm({...form, unvan: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Öğretmen, Memur" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Görev</label>
              <input type="text" value={form.gorev} onChange={e => setForm({...form, gorev: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Sınıf Öğretmeni" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kurum Sicil No</label>
              <input type="text" value={form.kurumSicilNo} onChange={e => setForm({...form, kurumSicilNo: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emekli Sicil No</label>
              <input type="text" value={form.emekliSicilNo} onChange={e => setForm({...form, emekliSicilNo: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
      </ActionModal>

      {/* EXCEL IMPORT MODAL */}
      <ActionModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Excel'den İçe Aktar (Akıllı Eşleştirme)"
        onSubmit={handleBulkSave}
        submitDisabled={importing}
        submitText={importing ? `⏳ Kaydediliyor... (${importData.length} kişi)` : 'Tümünü Havuza Kaydet'}
        width="full"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 p-3 rounded-lg border border-blue-200">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm">
              Sistem bu tablodaki <strong>{importData.length}</strong> personeli buldu. Tüm personeller varsayılan olarak <strong>Kurum Personeli</strong> havuzuna kaydedilecektir. Sonrasında Sınıf Rehberliği veya diğer görevleri atayabilirsiniz.
            </p>
          </div>

          <div className="max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-left text-sm text-gray-600">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-gray-200 shadow-sm z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Ad Soyad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">TC No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Unvan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Görev</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Branş</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Kurum Sicil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {importData.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{d.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{d.tcKimlikNo}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{d.unvan}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{d.gorev}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{d.brans}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{d.kurumSicilNo}</td>
                  </tr>
                ))}
                {importData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400 bg-gray-50">
                      Excel dosyasında tanınabilir başlıklar bulunamadı. Sütunlarınızda "Ad Soyad", "TC", "Unvan" gibi ibareler olduğundan emin olun.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ActionModal>
      {confirmModal}
    </div>
  );
}
