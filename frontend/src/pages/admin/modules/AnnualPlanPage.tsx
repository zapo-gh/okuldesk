import toast from 'react-hot-toast';
import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { CalendarDays, Edit, Trash2, Plus, Printer } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { useReactToPrint } from 'react-to-print';
import { AnnualPlanPrintTemplate } from './print/AnnualPlanPrintTemplate';
import { Button } from '../../../components/ui/Button';
import { ActionModal } from '../../../components/ui/ActionModal';

interface AnnualPlanItem {
  id: string;
  academicYear: string;
  month: number;
  title: string;
  description?: string;
  category: string;
  sortOrder: number;
}

const MONTHS = [
  { val: 9, label: 'Eylül' },
  { val: 10, label: 'Ekim' },
  { val: 11, label: 'Kasım' },
  { val: 12, label: 'Aralık' },
  { val: 1, label: 'Ocak' },
  { val: 2, label: 'Şubat' },
  { val: 3, label: 'Mart' },
  { val: 4, label: 'Nisan' },
  { val: 5, label: 'Mayıs' },
  { val: 6, label: 'Haziran' },
  { val: 7, label: 'Temmuz' },
  { val: 8, label: 'Ağustos' },
];

const CATEGORIES = [
  { val: 'IDARI', label: 'İdari İşler', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { val: 'EGITIM', label: 'Eğitim Öğretim', color: 'bg-green-100 text-green-800 border-green-200' },
  { val: 'SOSYAL', label: 'Sosyal & Kültürel', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { val: 'DIGER', label: 'Diğer', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export default function AnnualPlanPage() {
  const { confirm, confirmModal } = useConfirm();
  const [items, setItems] = useState<AnnualPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<AnnualPlanItem>>({});

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Yillik_Calisma_Plani'
  });

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/annual-plan?academicYear=${academicYear}`);
      // Ay (Eylül-Ağustos sıralaması) ve sortOrder'a göre frontend sıralaması
      const sorted = (res.data.data || []).sort((a: AnnualPlanItem, b: AnnualPlanItem) => {
        const getMonthWeight = (m: number) => m >= 9 ? m - 9 : m + 3;
        const wA = getMonthWeight(a.month);
        const wB = getMonthWeight(b.month);
        if (wA === wB) return a.sortOrder - b.sortOrder;
        return wA - wB;
      });
      setItems(sorted);
    } catch {
      toast('Planlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!form.title) {
        toast.error('Çalışma / Konu başlığı zorunludur.');
        return;
      }
      
      const payload = { ...form, academicYear };
      if (form.id) {
        await api.put(`/annual-plan/${form.id}`, payload);
      } else {
        await api.post('/annual-plan', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      toast.error('Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Bu çalışma maddesini silmek istediğinize emin misiniz?')) {
      try {
        await api.delete(`/annual-plan/${id}`);
        fetchData();
      } catch {
        toast.error('Silinemedi.');
      }
    }
  };

  const openAddModal = () => {
    setForm({ month: new Date().getMonth() + 1, category: 'IDARI', sortOrder: items.length + 1, title: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (i: AnnualPlanItem) => {
    setForm(i);
    setIsModalOpen(true);
  };



  const columns: Column<AnnualPlanItem>[] = [
    {
      header: 'Ay',
      render: (i) => <div className="font-bold text-slate-800 w-16">{MONTHS.find(m => m.val === i.month)?.label || '-'}</div>
    },
    {
      header: 'Kategori',
      render: (i) => {
        const cat = CATEGORIES.find(c => c.val === i.category);
        return <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${cat?.color || 'bg-gray-100'}`}>{cat?.label || i.category}</span>
      }
    },
    {
      header: 'Çalışma / Konu',
      render: (i) => (
        <div>
          <div className="font-bold text-slate-800">{i.title}</div>
          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-md">{i.description || 'Açıklama yok'}</div>
        </div>
      )
    },
    {
      header: 'Sıra',
      render: (i) => <span className="text-sm font-medium text-slate-500">{i.sortOrder}</span>
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (i) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => openEditModal(i)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Düzenle">
            <Edit size={20} />
          </Button>
          <Button variant="ghost" onClick={() => handleDelete(i.id)} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Sil">
            <Trash2 size={20} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4 relative">
      <PageHeader 
        title="Yıllık Çalışma Planı" 
        description="Eğitim-öğretim yılı boyunca yapılacak idari, sosyal ve akademik çalışmaların takvimi" 
        icon={<CalendarDays size={24} />}
        actions={
          <>
                    <div className="flex space-x-3">
                      <Button
                        onClick={handlePrint}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
                      >
                        <Printer className="w-5 h-5" />
                        <span>Yazdır</span>
                      </Button>
                      <Button
                        onClick={openAddModal}
                        variant="primary"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Yeni Madde Ekle</span>
                      </Button>
                    </div>
          </>
        }
      />

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable data={items} columns={columns} emptyMessage="Kayıtlı çalışma maddesi bulunamadı." />
      </div>

      <ActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={form.id ? 'Maddeyi Düzeyle' : 'Yeni Plan Maddesi'}
        onSubmit={handleSave}
        submitText="Kaydet"
        width="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Planlanan Ay</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={form.month || 9}
                onChange={e => setForm({ ...form, month: parseInt(e.target.value) })}
              >
                {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={form.category || 'IDARI'}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Çalışma / Konu Başlığı</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={form.title || ''}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (Opsiyonel)</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={form.description || ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama (Ay içindeki sıra)</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={form.sortOrder || 1}
              onChange={e => setForm({ ...form, sortOrder: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </ActionModal>

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      <div className="hidden">
        <AnnualPlanPrintTemplate ref={printRef} items={items} academicYear={academicYear} />
      </div>

    
      {confirmModal}
    </div>
  );
}





