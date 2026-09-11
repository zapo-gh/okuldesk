import toast from 'react-hot-toast';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { ActionModal } from '../../../components/ui/ActionModal';
import api from '../../../services/api';
import { FileText, Plus, Trash2, Edit, Loader2, Printer } from 'lucide-react';
import { printPdfBlob } from '../../../utils/printPdf';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Label } from '../../../components/ui/Label';
import { Textarea } from '../../../components/ui/Textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const transferSchema = z.object({
  staffName: z.string().min(1, 'Personel adı zorunludur'),
  staffTitle: z.string().optional(),
  tcKimlikNo: z.string().optional(),
  sicilNo: z.string().optional(),
  currentSchool: z.string().optional(),
  newSchool: z.string().optional(),
  transferDate: z.string().min(1, 'Nakil tarihi zorunludur'),
  transferReason: z.string().optional(),
  notes: z.string().optional(),
  
  emekliSicilNo: z.string().optional(), saymanlikKisiNo: z.string().optional(), eskiGorevi: z.string().optional(), yeniGorevi: z.string().optional(),
  eskiGorevYeri: z.string().optional(), yeniGorevYeri: z.string().optional(), goreveBaslamaTarihi: z.string().optional(),
  eskiDerece: z.string().optional(), yeniDerece: z.string().optional(), terfiTarihi: z.string().optional(), ogrenimDurumu: z.string().optional(),
  aileDurumu: z.string().optional(), yillikIzinDurumu: z.string().optional(), kidemHizmetSuresi: z.string().optional(),
  atamaTarihi: z.string().optional(), tebligTarihi: z.string().optional(), ayrilisTarihi: z.string().optional(), ayligaHakKazanmaTarihi: z.string().optional(),
  gecikmeNedeni: z.string().optional(), yollukDurumu: z.string().optional(), yollukTutari: z.string().optional(),
  giyecekYardimi: z.string().optional(), giyecekTutari: z.string().optional(),
  bankaPromosyonu: z.string().optional(), bankaPromosyonTarihTutar: z.string().optional(),
  egitimeHazirlikOdenegi: z.string().optional(), egitimeHazirlikTarihTutar: z.string().optional(),
  borcDurumu: z.string().optional(), borcMetin: z.string().optional(), icraNafaka: z.string().optional(),
  saglikRaporuHeyet: z.string().optional(), saglikRaporuNormal: z.string().optional(),
  gelirVergisiMatrahi: z.string().optional(),
  yabanciDilTazminati: z.string().optional(), zimmetDurumu: z.string().optional(), zimmetMetin: z.string().optional(),
  sendikaBilgisi: z.string().optional(),
  mudurYardimcisiAd: z.string().optional(), mudurYardimcisiUnvan: z.string().optional(),
  okulMuduruAd: z.string().optional(), 
  tahakkukMemuruAd: z.string().optional(), tahakkukMemuruUnvan: z.string().optional(),
  personelBirimYetkilisiAd: z.string().optional(), personelBirimYetkilisiUnvan: z.string().optional(),
  
  spouseEmployed: z.string().optional(),
  spouseWorkplace: z.string().optional(),
  childrenCount: z.string().optional(),
  yollukDistanceKm: z.string().optional(),
  yollukTransportType: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

const defaultExtraData: Partial<TransferFormValues> = {
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
  personelBirimYetkilisiAd: '', personelBirimYetkilisiUnvan: 'Personel Birim Yetkilisi',
  spouseEmployed: '', spouseWorkplace: '', childrenCount: '',
  yollukDistanceKm: '', yollukTransportType: ''
};

export default function StaffTransferPage() {
  const { confirm, confirmModal } = useConfirm();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<any | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      staffName: '', staffTitle: '', tcKimlikNo: '', sicilNo: '',
      currentSchool: '', newSchool: '', transferDate: '', transferReason: '', notes: '',
      ...defaultExtraData
    }
  });

  const watchYollukDurumu = watch('yollukDurumu');
  const watchGiyecek = watch('giyecekYardimi');
  const watchBanka = watch('bankaPromosyonu');
  const watchEgitim = watch('egitimeHazirlikOdenegi');
  const watchBorc = watch('borcDurumu');
  const watchZimmet = watch('zimmetDurumu');

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

  const handleSave = async (data: TransferFormValues) => {
    try {
      const { staffName, staffTitle, tcKimlikNo, sicilNo, currentSchool, newSchool, transferDate, transferReason, notes, ...extra } = data;
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
      toast.success('Başarıyla kaydedildi');
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
    reset({
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
    
    reset({
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

  const triggerPrint = async (row: any) => {
    try {
      setGeneratingPdfId(row.id);
      const res = await api.post('/staff-transfer/generate-pdf', row, { responseType: 'blob' });
      printPdfBlob(res.data);
    } catch (err: any) {
      toast.error('PDF üretilirken hata oluştu.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const onStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setValue('staffName', val);
    
    const s = staffList.find(st => st.name === val);
    if (s) {
      let ex: any = {};
      try {
        if (s.extraData) ex = JSON.parse(s.extraData);
      } catch (e) {}

      setValue('staffTitle', s.unvan || s.title || s.position || 'Öğretmen');
      setValue('tcKimlikNo', s.tcKimlikNo || ex.tcKimlikNo || ex['T.C. Kimlik No'] || '');
      
      const emekli = s.emekliSicilNo || ex.emekliSicilNo || ex['Emekli Sicil No'] || '';
      setValue('emekliSicilNo', emekli);
      
      const kurum = s.kurumSicilNo || ex.kurumSicilNo || ex['Kurum Sicil No'] || ex['Sicil No'] || '';
      setValue('sicilNo', kurum);

      setValue('saymanlikKisiNo', ex.saymanlikKisiNo || ex['Saymanlık Kişi No'] || '');
      setValue('eskiGorevi', s.gorev || ex.eskiGorevi || ex['Görev'] || ex['Görevi'] || '');
      setValue('eskiGorevYeri', ex.eskiGorevYeri || ex['Görev Yeri'] || '');
      setValue('eskiDerece', ex.eskiDerece || ex['Derece'] || ex['Derecesi'] || '');
      setValue('ogrenimDurumu', ex.ogrenimDurumu || ex['Öğrenim Durumu'] || ex['Öğrenim'] || '');
      setValue('aileDurumu', ex.aileDurumu || ex['Aile Durumu'] || '');
      setValue('yillikIzinDurumu', ex.yillikIzinDurumu || ex['İzin Durumu'] || ex['Yıllık İzin'] || '');
      setValue('kidemHizmetSuresi', ex.kidemHizmetSuresi || ex['Kıdem'] || ex['Hizmet Süresi'] || '');
      setValue('sendikaBilgisi', ex.sendikaBilgisi || ex['Sendika'] || '-');
    }
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
          <Button 
            variant="ghost" 
            onClick={() => triggerPrint(row)} 
            disabled={generatingPdfId === row.id}
            className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" 
            title="Yazdır"
          >
            {generatingPdfId === row.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Printer className="w-5 h-5" />
            )}
          </Button>
          <Button variant="ghost" onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-900" title="Düzenle">
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

  return (
    <>
      <div className="space-y-6 print:hidden">
        <PageHeader 
          title="Personel Nakil Bildirimi" 
          description="Nakil giden personellerin kayıtlarını ve bildirimlerini yönetin" 
          icon={<FileText size={24} />}
          actions={
            <Button onClick={openAddModal} variant="primary">
              <Plus className="w-5 h-5" />
              <span>Yeni Kayıt</span>
            </Button>
          }
        />

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <DataTable columns={columns} data={transfers} emptyMessage="Kayıtlı nakil işlemi bulunamadı." />
        </div>

        <ActionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingTransfer ? 'Nakil Kaydını Düzenle' : 'Yeni Nakil Bildirimi'}
          onSubmit={handleSubmit(handleSave)}
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
                  <Label>Adı Soyadı</Label>
                  <Select {...register('staffName')} onChange={onStaffChange} error={errors.staffName?.message}>
                    <option value="">-- Personel Seçiniz --</option>
                    {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </Select>
                </div>
                <div><Label>Unvanı</Label><Input {...register('staffTitle')} /></div>
                <div><Label>T.C. Kimlik No</Label><Input {...register('tcKimlikNo')} /></div>
                <div><Label>Emekli Sicil No</Label><Input {...register('emekliSicilNo')} /></div>
                <div><Label>Saymanlık Kişi No</Label><Input {...register('saymanlikKisiNo')} /></div>
                <div><Label>Öğrenim Durumu</Label><Input {...register('ogrenimDurumu')} /></div>
                
                <div><Label>Eski Görevi</Label><Input {...register('eskiGorevi')} /></div>
                <div><Label>Yeni Görevi</Label><Input {...register('yeniGorevi')} /></div>
                
                <div><Label>Eski Görev Yeri</Label><Input {...register('currentSchool')} /></div>
                <div><Label>Yeni Görev Yeri</Label><Input {...register('newSchool')} /></div>
                
                <div className="col-span-2">
                  <Label>Aile Durumu (DMK 657 SK)</Label>
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div>
                      <Label>Eş Çalışıyor mu?</Label>
                      <Select {...register('spouseEmployed')}>
                        <option value="">— Seçiniz —</option>
                        <option value="EVET">Evet, Kamu Görevlisi</option>
                        <option value="HAYIR">Hayır</option>
                        <option value="OZEL">Evet, Özel Sektör</option>
                        <option value="EMEKLI">Emekli</option>
                      </Select>
                    </div>
                    <div><Label>Eşin Çalıştığı Kurum / Yer</Label><Input {...register('spouseWorkplace')} placeholder="Örn: Aydın MEM" /></div>
                    <div><Label>Çocuk Sayısı</Label><Input type="number" min="0" max="20" {...register('childrenCount')} placeholder="0" /></div>
                    <div className="col-span-3">
                      <Label>Aile Durumu Ek Notu (Tutanak için)</Label>
                      <Input {...register('aileDurumu')} placeholder="Örn: Evli, 2 çocuklu" />
                    </div>
                  </div>
                </div>
                <div className="col-span-2"><Label>Notlar / Ek Bilgi</Label><Textarea {...register('notes')} rows={2} /></div>
              </div>
            </div>

            {/* TAB 1: Derece & Tarihler */}
            <div className={activeTab === 1 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Eski Derece / Kademesi</Label><Input {...register('eskiDerece')} /></div>
                <div><Label>Yeni Derece / Kademesi</Label><Input {...register('yeniDerece')} /></div>
                <div><Label>Göreve İlk Başlama Tarihi</Label><Input {...register('goreveBaslamaTarihi')} /></div>
                <div><Label>Terfi Tarihi</Label><Input {...register('terfiTarihi')} /></div>
                <div><Label>Kıdem Aylığına Esas Hizmet Süresi</Label><Input {...register('kidemHizmetSuresi')} /></div>
                <div><Label>Atama Tarihi</Label><Input {...register('atamaTarihi')} /></div>
                <div><Label>Tebliğ Tarihi</Label><Input {...register('tebligTarihi')} /></div>
                <div><Label>Eski Memuriyetinden Ayrılış Tarihi (Yazıdaki)</Label><Input {...register('ayrilisTarihi')} /></div>
                <div><Label>Sistemdeki Nakil Tarihi</Label><Input type="date" {...register('transferDate')} error={errors.transferDate?.message} /></div>
                <div><Label>Ayrılış Sebebi</Label><Input {...register('transferReason')} /></div>
                <div><Label>Yeni Görevde Aylığa Hak Kazandığı Tarih</Label><Input {...register('ayligaHakKazanmaTarihi')} /></div>
                <div><Label>15 Gün İçinde Gecikme Nedeni</Label><Input {...register('gecikmeNedeni')} /></div>
              </div>
            </div>

            {/* TAB 2: Mali Haklar */}
            <div className={activeTab === 2 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Şahsi ve Aile Yolluğu (Sürekli Görev)</Label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Yolluk Durumu</Label>
                        <Select {...register('yollukDurumu')}>
                          <option value="Almıştır">Almıştır</option>
                          <option value="Almamıştır">Almamıştır</option>
                        </Select>
                      </div>
                      <div><Label>Mesafe (km)</Label><Input type="number" min="0" {...register('yollukDistanceKm')} placeholder="0" /></div>
                      <div>
                        <Label>Ulaşım Türü</Label>
                        <Select {...register('yollukTransportType')}>
                          <option value="">— Seçiniz —</option>
                          <option value="kara">Karayolu</option>
                          <option value="demir">Demiryolu</option>
                          <option value="hava">Havayolu</option>
                          <option value="deniz">Denizyolu</option>
                        </Select>
                      </div>
                    </div>
                    {watchYollukDurumu === 'Almıştır' && (
                      <div><Label>Tutar / Açıklama</Label><Input {...register('yollukTutari')} placeholder="Tutar / Açıklama" /></div>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Giyecek Yardımı</Label>
                  <Select {...register('giyecekYardimi')} className="mb-2">
                    <option value="Almıştır">Almıştır</option>
                    <option value="Yoktur">Yoktur</option>
                  </Select>
                  {watchGiyecek === 'Almıştır' && <Input {...register('giyecekTutari')} placeholder="Tutar / Açıklama" />}
                </div>
                <div>
                  <Label>Banka Promosyonu</Label>
                  <Select {...register('bankaPromosyonu')} className="mb-2">
                    <option value="Almıştır">Almıştır</option>
                    <option value="Yoktur">Yoktur</option>
                  </Select>
                  {watchBanka === 'Almıştır' && <Input {...register('bankaPromosyonTarihTutar')} placeholder="Tarih ve Tutar" />}
                </div>
                <div>
                  <Label>Eğitime Hazırlık Ödeneği</Label>
                  <Select {...register('egitimeHazirlikOdenegi')} className="mb-2">
                    <option value="Almıştır">Almıştır</option>
                    <option value="Yoktur">Yoktur</option>
                  </Select>
                  {watchEgitim === 'Almıştır' && <Input {...register('egitimeHazirlikTarihTutar')} placeholder="Tarih ve Tutar" />}
                </div>
                <div>
                  <Label>Borç Durumu</Label>
                  <Select {...register('borcDurumu')} className="mb-2">
                    <option value="Yoktur">Yoktur</option>
                    <option value="Var">Var</option>
                  </Select>
                  {watchBorc === 'Var' && <Input {...register('borcMetin')} placeholder="Borçlarına Ait Bilgiler" />}
                </div>
                <div><Label>İcra veya Nafaka Kesintisi</Label><Input {...register('icraNafaka')} /></div>
                <div><Label>Gelir Vergisi Matrahı</Label><Input {...register('gelirVergisiMatrahi')} /></div>
                <div><Label>Yabancı Dil Tazminatı</Label><Input {...register('yabanciDilTazminati')} /></div>
              </div>
            </div>

            {/* TAB 3: Rapor & Diğer */}
            <div className={activeTab === 3 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Yıllık İzin Durumu</Label><Input {...register('yillikIzinDurumu')} /></div>
                <div><Label>Sendika Bilgileri</Label><Input {...register('sendikaBilgisi')} /></div>
                <div><Label>Sağlık Raporu (Heyet)</Label><Input {...register('saglikRaporuHeyet')} /></div>
                <div><Label>Sağlık Raporu (Normal)</Label><Input {...register('saglikRaporuNormal')} /></div>
                <div className="col-span-2">
                  <Label>Zimmet Kaydı</Label>
                  <Select {...register('zimmetDurumu')} className="mb-2">
                    <option value="Yoktur">Yoktur</option>
                    <option value="Var">Var</option>
                  </Select>
                  {watchZimmet === 'Var' && <Input {...register('zimmetMetin')} placeholder="Zimmet Detayı" />}
                </div>
              </div>
            </div>

            {/* TAB 4: İmza */}
            <div className={activeTab === 4 ? 'block' : 'hidden'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Müdür Yardımcısı Adı</Label>
                  <Select {...register('mudurYardimcisiAd')}>
                    <option value="">-- Seçiniz --</option>
                    {staffList.filter(s => 
                      s.role === 'MUDUR_YARDIMCISI' || 
                      (s.unvan || '').toLocaleLowerCase('tr-TR').includes('müdür') || 
                      (s.gorev || '').toLocaleLowerCase('tr-TR').includes('müdür') ||
                      (s.title || s.position || '').toLocaleLowerCase('tr-TR').includes('müdür')
                    ).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Okul Müdürü Adı</Label>
                  <Input {...register('okulMuduruAd')} />
                </div>
                <div>
                  <Label>Tahakkuk Memuru Adı</Label>
                  <Select {...register('tahakkukMemuruAd')}>
                    <option value="">-- Seçiniz --</option>
                    {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </Select>
                </div>
                <div><Label>Tahakkuk Memuru Unvanı</Label><Input {...register('tahakkukMemuruUnvan')} /></div>
                <div>
                  <Label>Personel Birim Yetkilisi Adı</Label>
                  <Select {...register('personelBirimYetkilisiAd')}>
                    <option value="">-- Seçiniz --</option>
                    {staffList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </Select>
                </div>
                <div><Label>Personel Birim Yetkilisi Unvanı</Label><Input {...register('personelBirimYetkilisiUnvan')} /></div>
              </div>
            </div>
          </div>
        </ActionModal>
      </div>


      {confirmModal}
    </>
  );
}



