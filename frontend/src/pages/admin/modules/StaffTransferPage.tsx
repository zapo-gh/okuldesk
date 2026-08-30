import toast from 'react-hot-toast';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { ActionModal } from '../../../components/ui/ActionModal';
import api from '../../../services/api';
import { FileText, Plus, Trash2, Edit, AlertCircle, Loader2, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { StaffTransferPrintTemplate } from './print/StaffTransferPrintTemplate';
import { Button } from '../../../components/ui/Button';

const defaultExtraData = {
  emekliSicilNo: '', saymanlikKisiNo: '', eskiGorevi: '', yeniGorevi: '',
  eskiGorevYeri: '', yeniGorevYeri: '', goreveBaslamaTarihi: '',
  eskiDerece: '', yeniDerece: '', terfiTarihi: '', ogrenimDurumu: '',
  aileDurumu: '', yillikIzinDurumu: '', kidemHizmetSuresi: '',
  atamaTarihi: '', tebligTarihi: '', ayrilisTarihi: '', ayligaHakKazanmaTarihi: '',
  gecikmeNedeni: '', yollukDurumu: 'Almamıştır', yollukTutari: '',
  giyecekYardimi: 'Yoktur', giyecekTutari: '',
  bankaPromosyonu: 'Yoktur', bankaPromosyonTarihTutar: '',
  egitimeHazirlikOdenegi: 'Yoktur', egitimeHazirlikTarihTutar: '',
  borcDurumu: 'Yoktur', borcMetin: 'BİLİNEN BORCU YOKTUR', icraNafaka: 'Yoktur',
  saglikRaporuHeyet: 'Yok', saglikRaporuNormal: 'Yok',
  gelirVergisiMatrahi: 'Muhasebe Say2000i Sisteminde Kayıtlı.',
  yabanciDilTazminati: 'Yararlanmıyor', zimmetDurumu: 'Yoktur', zimmetMetin: 'YOKTUR',
  sendikaBilgisi: '-',
  mudurYardimcisiAd: '', mudurYardimcisiUnvan: 'Müdür Yardımcısı',
  okulMuduruAd: '', 
  tahakkukMemuruAd: '', tahakkukMemuruUnvan: 'Gerçekleştirme Görevlisi',
  personelBirimYetkilisiAd: '', personelBirimYetkilisiUnvan: 'Personel Birim Yetkilisi'
};

export default function StaffTransferPage() {
  const { confirm, confirmModal } = useConfirm();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<any | null>(null);
  const [printingTransfer, setPrintingTransfer] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const [formData, setFormData] = useState({
    staffName: '', staffTitle: '', tcKimlikNo: '', sicilNo: '',
    currentSchool: '', newSchool: '', transferDate: '', transferReason: '', notes: '',
    ...defaultExtraData
  });

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, staffRes] = await Promise.all([
        api.get(`/staff-transfer?academicYear=${academicYear}`),
        api.get('/staff')
      ]);
      setTransfers(res.data.data || []);
      setStaffList(staffRes.data.data?.staff || staffRes.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kayıtlar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.staffName || !formData.transferDate) {
        toast.error('Personel Adı ve Nakil Tarihi zorunludur.');
        return;
      }

      const { staffName, staffTitle, tcKimlikNo, sicilNo, currentSchool, newSchool, transferDate, transferReason, notes, ...extra } = formData;
      const payload = {
        staffName, staffTitle, tcKimlikNo, sicilNo, currentSchool, newSchool, transferDate, transferReason, notes,
        academicYear,
        extraData: JSON.stringify(extra)
      };

      if (editingTransfer) {
        await api.put(`/staff-transfer/${editingTransfer.id}`, payload);
      } else {
        await api.post('/staff-transfer', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/staff-transfer/${id}`);
      fetchData();
    } catch (err: any) {
      toast.error('Silinemedi.');
    }
  };

  const openAddModal = () => {
    setEditingTransfer(null);
    setFormData({
      staffName: '', staffTitle: '', tcKimlikNo: '', sicilNo: '', 
      currentSchool: '', newSchool: '', transferDate: '', transferReason: '', notes: '',
      ...defaultExtraData,
      okulMuduruAd: settings?.principalName || ''
    });
    setActiveTab(0);
    setIsModalOpen(true);
  };

  const openEditModal = (t: any) => {
    setEditingTransfer(t);
    let parsedExtra: any = {};
    try {
      if (t.extraData) parsedExtra = JSON.parse(t.extraData);
    } catch (e) {}
    
    setFormData({
      staffName: t.staffName || '', staffTitle: t.staffTitle || '',
      tcKimlikNo: t.tcKimlikNo || '', sicilNo: t.sicilNo || '',
      currentSchool: t.currentSchool || '', newSchool: t.newSchool || '',
      transferDate: t.transferDate || '', transferReason: t.transferReason || '',
      notes: t.notes || '',
      ...defaultExtraData,
      okulMuduruAd: settings?.principalName || '',
      ...parsedExtra
    });
    setActiveTab(0);
    setIsModalOpen(true);
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Personel_Nakil_Bildirimi',
  });

  const triggerPrint = (row: any) => {
    setPrintingTransfer(row);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const updateForm = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const columns: Column<any>[] = [
    { header: 'Adı Soyadı', accessor: 'staffName' },
    { header: 'Eski Kurum', accessor: 'currentSchool' },
    { header: 'Yeni Kurum', accessor: 'newSchool' },
    { header: 'Tarih', accessor: 'transferDate' },
    { 
      header: 'İşlemler',
      align: 'right',
      render: (row: any) => (
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={() => triggerPrint(row)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Düzenle">
            <Printer className="w-5 h-5" />
          </Button>
          <Button onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-900" title="Düzenle">
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

  const ex = printingTransfer?.extra || defaultExtraData;
  const pt = printingTransfer || {};

  return (
    <>
      <div className="space-y-6 print:hidden">
        <PageHeader 
        title="Personel Nakil Bildirimi" 
        description="Nakil giden personellerin kayıtlarını ve bildirimlerini yönetin" 
        icon={<FileText size={24} />}
        actions={
          <>
                      <Button
                        onClick={openAddModal}
                        variant="primary"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Yeni Kayıt</span>
                      </Button>
          </>
        }
      />

        

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <DataTable columns={columns} data={transfers} emptyMessage="Kayıtlı nakil işlemi bulunamadı." />
        </div>

        <ActionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingTransfer ? 'Nakil Kaydını Düzenle' : 'Yeni Nakil Bildirimi'}
          onSubmit={handleSave}
          width="full"
        >
          <div className="border-b border-slate-200 mb-4 flex space-x-4">
            {['Kişisel & Görev', 'Derece & Tarihler', 'Mali Haklar', 'Rapor & Diğer', 'İmza'].map((tab, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors focus:outline-none ${activeTab === idx ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-4 h-[60vh] overflow-y-auto px-1 pb-4">
            {/* TAB 0: Kişisel & Görev */}
            <div className={activeTab === 0 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adı Soyadı</label>
                  <select value={formData.staffName} onChange={(e) => {
                    const val = e.target.value;
                    const s = staffList.find(st => st.name === val);
                    if (s) {
                      let ex: any = {};
                      try {
                        if (s.extraData) ex = JSON.parse(s.extraData);
                      } catch (e) {}

                      updateForm('staffName', val);
                      updateForm('staffTitle', s.unvan || s.title || s.position || 'Öğretmen');
                      updateForm('tcKimlikNo', s.tcKimlikNo || ex.tcKimlikNo || ex['T.C. Kimlik No'] || '');
                      
                      const emekli = s.emekliSicilNo || ex.emekliSicilNo || ex['Emekli Sicil No'] || '';
                      updateForm('emekliSicilNo', emekli);
                      
                      const kurum = s.kurumSicilNo || ex.kurumSicilNo || ex['Kurum Sicil No'] || ex['Sicil No'] || '';
                      updateForm('sicilNo', kurum);

                      updateForm('saymanlikKisiNo', ex.saymanlikKisiNo || ex['Saymanlık Kişi No'] || '');
                      updateForm('eskiGorevi', s.gorev || ex.eskiGorevi || ex['Görev'] || ex['Görevi'] || '');
                      updateForm('eskiGorevYeri', ex.eskiGorevYeri || ex['Görev Yeri'] || '');
                      updateForm('eskiDerece', ex.eskiDerece || ex['Derece'] || ex['Derecesi'] || '');
                      updateForm('ogrenimDurumu', ex.ogrenimDurumu || ex['Öğrenim Durumu'] || ex['Öğrenim'] || '');
                      updateForm('aileDurumu', ex.aileDurumu || ex['Aile Durumu'] || '');
                      updateForm('yillikIzinDurumu', ex.yillikIzinDurumu || ex['İzin Durumu'] || ex['Yıllık İzin'] || '');
                      updateForm('kidemHizmetSuresi', ex.kidemHizmetSuresi || ex['Kıdem'] || ex['Hizmet Süresi'] || '');
                      updateForm('sendikaBilgisi', ex.sendikaBilgisi || ex['Sendika'] || '-');
                    } else {
                      updateForm('staffName', val);
                    }
                  }} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="">-- Personel Seçiniz --</option>
                    {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Unvanı</label><input type="text" value={formData.staffTitle} onChange={(e) => updateForm('staffTitle', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">T.C. Kimlik No</label><input type="text" value={formData.tcKimlikNo} onChange={(e) => updateForm('tcKimlikNo', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Emekli Sicil No</label><input type="text" value={formData.emekliSicilNo} onChange={(e) => updateForm('emekliSicilNo', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Saymanlık Kişi No</label><input type="text" value={formData.saymanlikKisiNo} onChange={(e) => updateForm('saymanlikKisiNo', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Öğrenim Durumu</label><input type="text" value={formData.ogrenimDurumu} onChange={(e) => updateForm('ogrenimDurumu', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                
                {/* Görev Eşleşmeleri Yan Yana */}
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Eski Görevi</label><input type="text" value={formData.eskiGorevi} onChange={(e) => updateForm('eskiGorevi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Yeni Görevi</label><input type="text" value={formData.yeniGorevi} onChange={(e) => updateForm('yeniGorevi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Eski Görev Yeri</label><input type="text" value={formData.currentSchool} onChange={(e) => updateForm('currentSchool', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Yeni Görev Yeri</label><input type="text" value={formData.newSchool} onChange={(e) => updateForm('newSchool', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Aile Durumu (Eş çalışıyor mu?)</label><input type="text" value={formData.aileDurumu} onChange={(e) => updateForm('aileDurumu', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Notlar / Ek Bilgi</label><textarea value={formData.notes} onChange={(e) => updateForm('notes', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" rows={2} /></div>
              </div>
            </div>

            {/* TAB 1: Derece & Tarihler */}
            <div className={activeTab === 1 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Eski Derece / Kademesi</label><input type="text" value={formData.eskiDerece} onChange={(e) => updateForm('eskiDerece', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Yeni Derece / Kademesi</label><input type="text" value={formData.yeniDerece} onChange={(e) => updateForm('yeniDerece', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Göreve İlk Başlama Tarihi</label><input type="text" value={formData.goreveBaslamaTarihi} onChange={(e) => updateForm('goreveBaslamaTarihi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Terfi Tarihi</label><input type="text" value={formData.terfiTarihi} onChange={(e) => updateForm('terfiTarihi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Kıdem Aylığına Esas Hizmet Süresi</label><input type="text" value={formData.kidemHizmetSuresi} onChange={(e) => updateForm('kidemHizmetSuresi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Atama Tarihi</label><input type="text" value={formData.atamaTarihi} onChange={(e) => updateForm('atamaTarihi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Tebliğ Tarihi</label><input type="text" value={formData.tebligTarihi} onChange={(e) => updateForm('tebligTarihi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Eski Memuriyetinden Ayrılış Tarihi (Yazıdaki)</label><input type="text" value={formData.ayrilisTarihi} onChange={(e) => updateForm('ayrilisTarihi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sistemdeki Nakil Tarihi</label><input type="date" value={formData.transferDate} onChange={(e) => updateForm('transferDate', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Ayrılış Sebebi</label><input type="text" value={formData.transferReason} onChange={(e) => updateForm('transferReason', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Yeni Görevde Aylığa Hak Kazandığı Tarih</label><input type="text" value={formData.ayligaHakKazanmaTarihi} onChange={(e) => updateForm('ayligaHakKazanmaTarihi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">15 Gün İçinde Gecikme Nedeni</label><input type="text" value={formData.gecikmeNedeni} onChange={(e) => updateForm('gecikmeNedeni', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
              </div>
            </div>

            {/* TAB 2: Mali Haklar */}
            <div className={activeTab === 2 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Şahsi ve Aile Yolluğu</label>
                  <select value={formData.yollukDurumu} onChange={(e) => updateForm('yollukDurumu', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2">
                    <option value="Almıştır">Almıştır</option>
                    <option value="Almamıştır">Almamıştır</option>
                  </select>
                  {formData.yollukDurumu === 'Almıştır' && <input type="text" placeholder="Tutar / Açıklama" value={formData.yollukTutari} onChange={(e) => updateForm('yollukTutari', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giyecek Yardımı</label>
                  <select value={formData.giyecekYardimi} onChange={(e) => updateForm('giyecekYardimi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2">
                    <option value="Almıştır">Almıştır</option>
                    <option value="Yoktur">Yoktur</option>
                  </select>
                  {formData.giyecekYardimi === 'Almıştır' && <input type="text" placeholder="Tutar / Açıklama" value={formData.giyecekTutari} onChange={(e) => updateForm('giyecekTutari', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Banka Promosyonu</label>
                  <select value={formData.bankaPromosyonu} onChange={(e) => updateForm('bankaPromosyonu', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2">
                    <option value="Almıştır">Almıştır</option>
                    <option value="Yoktur">Yoktur</option>
                  </select>
                  {formData.bankaPromosyonu === 'Almıştır' && <input type="text" placeholder="Tarih ve Tutar" value={formData.bankaPromosyonTarihTutar} onChange={(e) => updateForm('bankaPromosyonTarihTutar', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Eğitime Hazırlık Ödeneği</label>
                  <select value={formData.egitimeHazirlikOdenegi} onChange={(e) => updateForm('egitimeHazirlikOdenegi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2">
                    <option value="Almıştır">Almıştır</option>
                    <option value="Yoktur">Yoktur</option>
                  </select>
                  {formData.egitimeHazirlikOdenegi === 'Almıştır' && <input type="text" placeholder="Tarih ve Tutar" value={formData.egitimeHazirlikTarihTutar} onChange={(e) => updateForm('egitimeHazirlikTarihTutar', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Borç Durumu</label>
                  <select value={formData.borcDurumu} onChange={(e) => updateForm('borcDurumu', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2">
                    <option value="Yoktur">Yoktur</option>
                    <option value="Var">Var</option>
                  </select>
                  {formData.borcDurumu === 'Var' && <input type="text" placeholder="Borçlarına Ait Bilgiler" value={formData.borcMetin} onChange={(e) => updateForm('borcMetin', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />}
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">İcra veya Nafaka Kesintisi</label><input type="text" value={formData.icraNafaka} onChange={(e) => updateForm('icraNafaka', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Gelir Vergisi Matrahı</label><input type="text" value={formData.gelirVergisiMatrahi} onChange={(e) => updateForm('gelirVergisiMatrahi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Yabancı Dil Tazminatı</label><input type="text" value={formData.yabanciDilTazminati} onChange={(e) => updateForm('yabanciDilTazminati', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
              </div>
            </div>

            {/* TAB 3: Rapor & Diğer */}
            <div className={activeTab === 3 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Yıllık İzin Durumu</label><input type="text" value={formData.yillikIzinDurumu} onChange={(e) => updateForm('yillikIzinDurumu', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sendika Bilgileri</label><input type="text" value={formData.sendikaBilgisi} onChange={(e) => updateForm('sendikaBilgisi', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sağlık Raporu (Heyet)</label><input type="text" value={formData.saglikRaporuHeyet} onChange={(e) => updateForm('saglikRaporuHeyet', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sağlık Raporu (Normal)</label><input type="text" value={formData.saglikRaporuNormal} onChange={(e) => updateForm('saglikRaporuNormal', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Zimmet Kaydı</label>
                  <select value={formData.zimmetDurumu} onChange={(e) => updateForm('zimmetDurumu', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2">
                    <option value="Yoktur">Yoktur</option>
                    <option value="Var">Var</option>
                  </select>
                  {formData.zimmetDurumu === 'Var' && <input type="text" placeholder="Zimmet Detayı" value={formData.zimmetMetin} onChange={(e) => updateForm('zimmetMetin', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />}
                </div>
              </div>
            </div>

            {/* TAB 4: İmza */}
            <div className={activeTab === 4 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Müdür Yardımcısı Adı</label>
                  <select value={formData.mudurYardimcisiAd} onChange={(e) => updateForm('mudurYardimcisiAd', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="">-- Seçiniz --</option>
                    {staffList.filter(s => 
                      s.role === 'MUDUR_YARDIMCISI' || 
                      (s.unvan || '').toLocaleLowerCase('tr-TR').includes('müdür') || 
                      (s.gorev || '').toLocaleLowerCase('tr-TR').includes('müdür') ||
                      (s.title || s.position || '').toLocaleLowerCase('tr-TR').includes('müdür')
                    ).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Okul Müdürü Adı</label>
                  <input type="text" value={formData.okulMuduruAd} onChange={(e) => updateForm('okulMuduruAd', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Tahakkuk Memuru Adı</label><select value={formData.tahakkukMemuruAd} onChange={(e) => updateForm('tahakkukMemuruAd', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">-- Seçiniz --</option>{staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Tahakkuk Memuru Unvanı</label><input type="text" value={formData.tahakkukMemuruUnvan} onChange={(e) => updateForm('tahakkukMemuruUnvan', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Personel Birim Yetkilisi Adı</label><select value={formData.personelBirimYetkilisiAd} onChange={(e) => updateForm('personelBirimYetkilisiAd', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg"><option value="">-- Seçiniz --</option>{staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Personel Birim Yetkilisi Unvanı</label><input type="text" value={formData.personelBirimYetkilisiUnvan} onChange={(e) => updateForm('personelBirimYetkilisiUnvan', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></div>
              </div>
            </div>
          </div>
        </ActionModal>
      </div>

      <div className="hidden">
        <StaffTransferPrintTemplate ref={printRef} transfer={printingTransfer} />
      </div>
      {confirmModal}
    </>
  );
}




