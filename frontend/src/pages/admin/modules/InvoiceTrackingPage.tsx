import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useSettings } from '../../../context/SettingsContext';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import api from '../../../services/api';
import { Receipt, Plus, Trash2, Edit, AlertCircle, ArrowRightCircle, CheckCircle2, FileUp, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useConfirm } from '../../../hooks/useConfirm';

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  BEKLEYEN_ODENEK_TALEBI: { label: 'Ödenek Talep Edilecek', color: 'bg-yellow-100 text-yellow-800' },
  ODENEK_TALEP_EDILDI: { label: 'MEBBİS Ödenek Bekliyor', color: 'bg-blue-100 text-blue-800' },
  ODENEK_GELDI_MYS_BEKLIYOR: { label: 'MYS ÖEB Bekliyor', color: 'bg-purple-100 text-purple-800' },
  ODENDI: { label: 'Ödendi / Tamamlandı', color: 'bg-green-100 text-green-800' }
};

export default function InvoiceTrackingPage() {
  const { confirm, confirmModal } = useConfirm();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const groupedInvoices = useMemo(() => {
    const groups: Record<string, any[]> = {};
    invoices.forEach(inv => {
      let monthYear = 'Bilinmeyen Tarih';
      if (inv.invoiceDate) {
        const d = new Date(inv.invoiceDate);
        monthYear = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
      }
      if (!groups[monthYear]) groups[monthYear] = [];
      groups[monthYear].push(inv);
    });
    
    return Object.keys(groups).map(key => {
      const firstDate = groups[key][0]?.invoiceDate;
      const sortKey = firstDate ? new Date(firstDate.substring(0,7) + '-01').getTime() : 0;
      return { title: key, invoices: groups[key], sortKey };
    }).sort((a, b) => b.sortKey - a.sortKey);
  }, [invoices]);

  // Expand the first group by default
  useEffect(() => {
    if (groupedInvoices.length > 0 && Object.keys(expandedGroups).length === 0) {
      setExpandedGroups({ [groupedInvoices[0].title]: true });
    }
  }, [groupedInvoices, expandedGroups]);

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2025-2026';

  const [formData, setFormData] = useState({
    companyName: '',
    type: 'Elektrik',
    invoiceNumber: '',
    amount: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    academicYear
  });

  useEffect(() => {
    fetchData();
  }, [academicYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/invoice?academicYear=${academicYear}`);
      setInvoices(res.data.data || []);
    } catch (err: any) {
      toast.error('Faturalar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.companyName) {
        toast.error('Kurum Adı zorunludur.');
        return;
      }

      if (editingId) {
        await api.put(`/invoice/${editingId}`, formData);
        toast.success('Fatura güncellendi.');
      } else {
        await api.post('/invoice', formData);
        toast.success('Fatura eklendi.');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Faturayı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/invoice/${id}`);
      toast.success('Fatura silindi.');
      fetchData();
    } catch (err: any) {
      toast.error('Silme işlemi başarısız.');
    }
  };

  const advanceStatus = async (invoice: any) => {
    let newStatus = '';
    let mebbisNo, mysNo;
    
    if (invoice.status === 'BEKLEYEN_ODENEK_TALEBI') {
      mebbisNo = window.prompt('MEBBİS Ödenek Takip Modülü Talep Numarasını Giriniz (Opsiyonel):', '');
      if (mebbisNo === null) return; 
      newStatus = 'ODENEK_TALEP_EDILDI';
    } else if (invoice.status === 'ODENEK_TALEP_EDILDI') {
      if (!await confirm('Ödeneğin okula ulaştığını onaylıyor musunuz?')) return;
      newStatus = 'ODENEK_GELDI_MYS_BEKLIYOR';
    } else if (invoice.status === 'ODENEK_GELDI_MYS_BEKLIYOR') {
      mysNo = window.prompt('MYS (HYS) Ödeme Emri Belgesi (ÖEB) Numarasını Giriniz (Opsiyonel):', '');
      if (mysNo === null) return;
      newStatus = 'ODENDI';
    } else {
      return;
    }

    try {
      await api.put(`/invoice/${invoice.id}/status`, { status: newStatus, mebbisNo, mysNo });
      toast.success('Fatura durumu güncellendi.');
      fetchData();
    } catch {
      toast.error('Durum güncellenemedi.');
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      companyName: '',
      type: 'Elektrik',
      invoiceNumber: '',
      amount: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      notes: '',
      academicYear
    });
    setIsModalOpen(true);
  };

  const openEdit = (inv: any) => {
    setEditingId(inv.id);
    setFormData({
      companyName: inv.companyName,
      type: inv.type,
      invoiceNumber: inv.invoiceNumber || '',
      amount: inv.amount.toString(),
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      notes: inv.notes || '',
      academicYear
    });
    setIsModalOpen(true);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && file.type !== 'text/xml' && !file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Lütfen geçerli bir PDF veya XML dosyası seçin.');
      return;
    }

    const formDataToUpload = new FormData();
    formDataToUpload.append('file', file);

    try {
      setParsing(true);
      const res = await api.post('/invoice/parse-pdf', formDataToUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const parsed = res.data.data;
      if (parsed) {
        setFormData(prev => ({
          ...prev,
          companyName: parsed.companyName || prev.companyName,
          type: parsed.type || prev.type,
          invoiceNumber: parsed.invoiceNumber || prev.invoiceNumber,
          amount: parsed.amount || prev.amount,
          invoiceDate: parsed.invoiceDate || prev.invoiceDate,
          dueDate: parsed.dueDate || prev.dueDate,
          notes: parsed.notes 
            ? (prev.notes 
                ? `${prev.notes.replace(/^(Telefon\/GSM No|Hizmet No|Abone\/Tesisat No|Abone\/Sözleşme No|Hesap\/Abone No|Hizmet\/Hesap No):\s*.*$/gm, '').trim()}\n${parsed.notes}`.trim() 
                : parsed.notes) 
            : prev.notes
        }));
        toast.success('Fatura başarıyla tarandı ve veriler dolduruldu!');
      }
    } catch (err) {
      toast.error('Fatura taranırken bir hata oluştu.');
    } finally {
      setParsing(false);
      // reset file input
      e.target.value = '';
    }
  };

  const isLate = (dueDate: string, status: string) => {
    if (status === 'ODENDI' || !dueDate) return false;
    const due = new Date(dueDate).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((due - now) / (1000 * 3600 * 24));
    return diffDays <= 3; // 3 gün veya daha az kaldıysa / geçtiyse
  };

  const columns: Column<any>[] = [
    { 
      header: 'Fatura Türü', 
      accessor: 'type', 
      render: (row: any) => (
        <div>
          <div className="font-semibold">{row.type}</div>
          <div className="text-xs text-gray-500">{row.companyName}</div>
        </div>
      ) 
    },
    { 
      header: 'Tutar / Tarih', 
      accessor: 'amount', 
      render: (row: any) => (
        <div>
          <div className="font-medium text-slate-800">₺{row.amount.toLocaleString('tr-TR')}</div>
          <div className="text-xs text-gray-500">F.No: {row.invoiceNumber || '-'}</div>
        </div>
      ) 
    },
    { 
      header: 'Son Ödeme T.', 
      accessor: 'dueDate',
      render: (row: any) => {
        const late = isLate(row.dueDate, row.status);
        return (
          <div className={`flex items-center gap-1 font-medium ${late ? 'text-red-600' : 'text-slate-600'}`}>
            {late && <AlertCircle size={14} />}
            {row.dueDate ? new Date(row.dueDate).toLocaleDateString('tr-TR') : '-'}
          </div>
        );
      }
    },
    {
      header: 'Açıklama / Not',
      accessor: 'notes',
      render: (row: any) => (
        <div className="text-xs text-gray-500 whitespace-pre-wrap max-w-[200px]">
          {row.notes || '-'}
        </div>
      )
    },
    { 
      header: 'Durum', 
      accessor: 'status',
      render: (row: any) => {
        const state = STATUS_MAP[row.status] || { label: row.status, color: 'bg-gray-100 text-gray-800' };
        return (
          <div className="flex flex-col items-start gap-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${state.color}`}>
              {state.label}
            </span>
            {row.mebbisNo && <span className="text-[10px] text-gray-500">MEBBİS: {row.mebbisNo}</span>}
            {row.mysNo && <span className="text-[10px] text-gray-500">MYS: {row.mysNo}</span>}
          </div>
        );
      }
    },
    { 
      header: 'İşlemler',
      align: 'right',
      render: (row: any) => (
        <div className="flex items-center justify-end space-x-1">
          {row.status !== 'ODENDI' && (
            <Button variant="ghost" onClick={() => advanceStatus(row)} className="text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 px-2 py-1 transition-colors" title="Sonraki Aşamaya Geçir">
              <ArrowRightCircle size={18} />
            </Button>
          )}
          {row.status === 'ODENDI' && (
            <div className="px-2 py-1 text-emerald-500" title="Tamamlandı"><CheckCircle2 size={18} /></div>
          )}
          <Button variant="ghost" onClick={() => openEdit(row)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Düzenle">
            <Edit size={18} />
          </Button>
          <Button variant="ghost" onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Sil">
            <Trash2 size={18} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fatura & Ödenek Takibi" 
        description="Elektrik, su, doğalgaz vb. faturaların MEBBİS ödenek taleplerini ve MYS ödeme süreçlerini takip edin."
        icon={<Receipt size={24} />}
        actions={
          <Button onClick={openAdd} variant="primary" className="flex items-center gap-2">
            <Plus size={18} /> Yeni Fatura Kaydı
          </Button>
        }
      />

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <DataTable columns={columns} data={[]} loading={loading} emptyMessage="Yükleniyor..." />
          </div>
        ) : groupedInvoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <DataTable columns={columns} data={[]} loading={false} emptyMessage="Kayıtlı fatura bulunamadı." />
          </div>
        ) : (
          groupedInvoices.map(group => (
            <div key={group.title} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div 
                className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setExpandedGroups(prev => ({ ...prev, [group.title]: !prev[group.title] }))}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{group.title}</span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    {group.invoices.length} Fatura
                  </span>
                </div>
                <div className="text-slate-400">
                  {expandedGroups[group.title] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>
              {expandedGroups[group.title] && (
                <div className="border-t border-slate-100">
                  <DataTable columns={columns} data={group.invoices} loading={false} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Fatura Düzenle' : 'Yeni Fatura Ekle'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto max-h-[70vh]">
              {!editingId && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-900">Otomatik Doldur (Akıllı Tarama)</h3>
                    <p className="text-xs text-indigo-700 mt-1">Fatura PDF'ini veya UBL XML dosyasını yükleyerek formu doldurabilirsiniz.</p>
                  </div>
                  <div>
                    <input type="file" id="pdfUpload" accept=".pdf,.xml,application/pdf,text/xml" className="hidden" onChange={handlePdfUpload} disabled={parsing} />
                    <label htmlFor="pdfUpload" className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors ${parsing ? 'opacity-70 pointer-events-none' : ''}`}>
                      {parsing ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                      {parsing ? 'Taranıyor...' : 'PDF/XML Yükle'}
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fatura Türü</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                      <option value="Elektrik">Elektrik</option>
                      <option value="Su">Su</option>
                      <option value="Doğalgaz">Doğalgaz</option>
                      <option value="İnternet">İnternet</option>
                      <option value="Telefon">Telefon</option>
                      <option value="Kırtasiye">Kırtasiye</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Kurum/Firma Adı</label>
                    <input type="text" required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="TEDAŞ, ASKİ vb." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fatura Numarası</label>
                    <input type="text" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tutar (₺)</label>
                    <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fatura Tarihi</label>
                    <input type="date" value={formData.invoiceDate} onChange={e => setFormData({...formData, invoiceDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Son Ödeme Tarihi</label>
                    <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notlar / Açıklama</label>
                  <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"></textarea>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>İptal</Button>
                <Button type="submit" variant="primary">Kaydet</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {confirmModal}
    </div>
  );
}
