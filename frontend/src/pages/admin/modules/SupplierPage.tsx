import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { ActionModal } from '../../../components/ui/ActionModal';
import api from '../../../services/api';
import { Building2, Plus, Trash2, Edit, AlertCircle, Loader2, Search, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useConfirm } from '../../../hooks/useConfirm';

export default function SupplierPage() {
  const { confirm, confirmModal } = useConfirm();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    taxNumber: '',
    taxOffice: '',
    address: '',
    phone: '',
    email: '',
    iban: '',
    contactPerson: '',
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/supplier');
      setSuppliers(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Firmalar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name) {
        toast.error('Firma/Tedarikçi Adı zorunludur.');
        return;
      }

      if (editingSupplier) {
        await api.put(`/supplier/${editingSupplier.id}`, formData);
      } else {
        await api.post('/supplier', formData);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Bu firmayı silmek istediğinize emin misiniz? (Bağlı doğrudan temin kayıtları etkilenebilir)')) return;
    try {
      await api.delete(`/supplier/${id}`);
      fetchData();
    } catch (err: any) {
      toast.error('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '', taxNumber: '', taxOffice: '', address: '', phone: '', email: '', iban: '', contactPerson: '', isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingSupplier(t);
    setFormData({
      name: t.name || '',
      taxNumber: t.taxNumber || '',
      taxOffice: t.taxOffice || '',
      address: t.address || '',
      phone: t.phone || '',
      email: t.email || '',
      iban: t.iban || '',
      contactPerson: t.contactPerson || '',
      isActive: t.isActive !== undefined ? t.isActive : true
    });
    setIsModalOpen(true);
  };

  const columns: Column<any>[] = [
    { header: 'Firma / Tedarikçi Adı', accessor: 'name', render: (row: any) => <span className="font-semibold">{row.name}</span> },
    { header: 'Vergi No / T.C.', accessor: 'taxNumber', render: (row: any) => row.taxNumber || '-' },
    { header: 'İletişim', accessor: 'phone', render: (row: any) => (
      <div>
        <div>{row.phone || '-'}</div>
        <div className="text-xs text-slate-500">{row.contactPerson || ''}</div>
      </div>
    )},
    { header: 'Durum', accessor: 'isActive', render: (row: any) => (
      <span className={`px-2 py-1 rounded-full text-xs ${row.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
        {row.isActive ? 'Aktif' : 'Pasif'}
      </span>
    )},
    { 
      header: 'İşlemler',
      align: 'right',
      render: (row: any) => (
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Düzenle">
            <Edit className="w-5 h-5" />
          </Button>
          <Button variant="ghost" onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Sil">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const filteredSuppliers = suppliers.filter(s => {
    if (statusFilter === 'ACTIVE' && !s.isActive) return false;
    if (statusFilter === 'INACTIVE' && s.isActive) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.taxNumber?.includes(q) ||
      s.phone?.includes(q) ||
      s.contactPerson?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Firma & Tedarikçi Rehberi" 
        description="Doğrudan Temin işlemleri için fiyat/teklif alınan firmalar" 
        icon={<Building2 size={24} />}
        actions={
          <>
            <Button
              onClick={openAddModal}
              variant="primary"
            >
              <Plus className="w-5 h-5" />
              <span>Yeni Firma</span>
            </Button>
          </>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Arama & Durum Filtre Çubuğu */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Firma adı, vergi no, kişi veya telefon ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                title="Temizle"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-200/80 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tümü ({suppliers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aktif ({suppliers.filter(s => s.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pasif ({suppliers.filter(s => !s.isActive).length})
            </button>
          </div>
        </div>

        <DataTable columns={columns} data={filteredSuppliers} emptyMessage="Arama kriterine uygun firma bulunamadı." />
      </div>

      <ActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Firma Bilgilerini Düzenle' : 'Yeni Firma Ekle'}
        onSubmit={handleSave}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Firma / Kişi Adı</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vergi No / T.C.</label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vergi Dairesi</label>
              <input
                type="text"
                value={formData.taxOffice}
                onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-Posta</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">IBAN</label>
            <input
              type="text"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm uppercase"
              placeholder="TR..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">İlgili Kişi (Yetkili)</label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-slate-900">
              Firma Aktif (Yeni teminlerde listelensin)
            </label>
          </div>
        </div>
      </ActionModal>
    
      {confirmModal}
    </div>
  );
}



