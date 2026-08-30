import toast from 'react-hot-toast';
import React, { useEffect, useState, useRef } from 'react';
import api from '../../../services/api';
import { useSettings } from '../../../context/SettingsContext';
import { useConfirm } from '../../../hooks/useConfirm';
import { Flag, Edit, Trash2, Plus, Printer, Save, X } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useReactToPrint } from 'react-to-print';
import { CommemorativeDaysPrintTemplate } from './print/CommemorativeDaysPrintTemplate';
import { Button } from '../../../components/ui/Button';

interface Staff {
  id: string;
  name: string;
}

interface CommemorativeDay {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  academicYear: string;
  description?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  status: string;
}

export default function CommemorativeDaysPage() {
  const { confirm, confirmModal } = useConfirm();
  const [days, setDays] = useState<CommemorativeDay[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info'|'print'>('info');
  const [form, setForm] = useState<Partial<CommemorativeDay>>({});
  const [printMode, setPrintMode] = useState<'none'|'single'|'all'>('none');

  const { settings } = useSettings();
  const academicYear = settings?.academicYear || '2024-2025';

  const DEFAULT_MEB_DAYS = [
    { name: 'İlköğretim Haftası', date: 'Eylül ayının 3. haftası', desc: 'Eğitim öğretim yılının başlangıcı kutlamaları' },
    { name: '15 Temmuz Demokrasi ve Millî Birlik Günü', date: 'Eylül ayının 2. haftası', desc: 'Demokrasi bilincinin geliştirilmesi' },
    { name: '29 Ekim Cumhuriyet Bayramı', date: '29 Ekim', desc: 'Cumhuriyetin ilanı kutlamaları' },
    { name: 'Kızılay Haftası', date: '29 Ekim - 4 Kasım', desc: 'Yardımlaşma ve dayanışma bilinci' },
    { name: '10 Kasım Atatürk\'ü Anma Günü', date: '10 Kasım', desc: 'Atatürk\'ü anma programı' },
    { name: '24 Kasım Öğretmenler Günü', date: '24 Kasım', desc: 'Öğretmenler günü kutlama programı' },
    { name: 'İnsan Hakları ve Demokrasi Haftası', date: '10 Aralık gününü içine alan hafta', desc: 'İnsan hakları bilincinin geliştirilmesi' },
    { name: 'Tutum, Yatırım ve Türk Malları Haftası', date: '12-18 Aralık', desc: 'Yerli malı kullanımı teşviki' },
    { name: 'Sivil Savunma Günü', date: '28 Şubat', desc: 'Afet bilinci eğitimi' },
    { name: 'Yeşilay Haftası', date: 'Mart ayının ilk haftası', desc: 'Bağımlılıkla mücadele' },
    { name: '12 Mart İstiklâl Marşı\'nın Kabulü', date: '12 Mart', desc: 'Mehmet Akif Ersoy\'u anma' },
    { name: '18 Mart Çanakkale Zaferi', date: '18 Mart', desc: 'Şehitleri anma günü' },
    { name: 'Orman Haftası', date: '21-26 Mart', desc: 'Çevre ve doğa bilinci' },
    { name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', date: '23 Nisan', desc: 'Çocuk bayramı kutlamaları' },
    { name: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı', date: '19 Mayıs', desc: 'Gençlik haftası kutlamaları' }
  ];

  const loadDefaults = async () => {
    if (!await confirm('Önemli Belirli Gün ve Haftalar (MEB) sisteme otomatik eklenecektir. Onaylıyor musunuz?')) return;
    
    setLoading(true);
    try {
      const yearStr = new Date().getFullYear().toString();
      for (const day of DEFAULT_MEB_DAYS) {
        await api.post('/commemorative-days', {
          name: day.name,
          academicYear,
          status: 'BEKLIYOR',
          description: day.desc,
          startDate: `${yearStr}-09-15`, 
          endDate: `${yearStr}-09-15`
        });
      }
      toast.success('Şablon listesi başarıyla eklendi.');
      await fetchData();
    } catch (e) {
      toast.error('Eklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAll = () => {
    setPrintMode('all');
    setTimeout(() => window.print(), 100);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [daysRes, staffRes] = await Promise.all([
        api.get(`/commemorative-days?academicYear=${academicYear}`),
        api.get('/staff')
      ]);
      setDays(daysRes.data.data || []);
      setStaffList(staffRes.data.data?.staff || []);
    } catch {
      toast('Veriler yüklenemedi');
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
      if (!form.name || !form.startDate) {
        toast.error('Etkinlik Adı ve Başlangıç Tarihi zorunludur.');
        return;
      }
      
      const payload = { ...form, academicYear };
      if (form.id) {
        await api.put(`/commemorative-days/${form.id}`, payload);
      } else {
        await api.post('/commemorative-days', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      toast.error('Kaydedilirken hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      try {
        await api.delete(`/commemorative-days/${id}`);
        fetchData();
      } catch {
        toast.error('Silinemedi.');
      }
    }
  };

  const openAddModal = () => {
    setActiveTab('info');
    setForm({ 
      name: '29 Ekim Cumhuriyet Bayramı', description: 'Cumhuriyetin ilanı kutlama programı ve panosu', 
      status: 'BEKLIYOR',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      assignedStaffId: '', assignedStaffName: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (d: CommemorativeDay) => {
    setActiveTab('info');
    setForm(d);
    setIsModalOpen(true);
  };

  const printRef = useRef<HTMLDivElement>(null);
  const _handleReactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Gorevlendirme_Yazisi'
  });

  const handlePrintSingleWrapper = () => {
    setPrintMode('single');
    setTimeout(() => {
      _handleReactToPrint();
    }, 100);
  };

  const columns: Column<CommemorativeDay>[] = [
    {
      header: 'Program / Etkinlik Adı',
      render: (d) => (
        <div>
          <div className="font-bold text-slate-800">{d.name}</div>
          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs" title={d.description}>{d.description || 'Açıklama yok'}</div>
        </div>
      )
    },
    {
      header: 'Tarih',
      render: (d) => (
        <div className="font-medium text-slate-700">
          {new Date(d.startDate).toLocaleDateString('tr-TR')} 
          {d.endDate && d.endDate !== d.startDate && ` - ${new Date(d.endDate).toLocaleDateString('tr-TR')}`}
        </div>
      )
    },
    {
      header: 'Görevli Öğretmen',
      render: (d) => <span className="font-medium text-slate-700">{d.assignedStaffName || '-'}</span>
    },
    {
      header: 'Durum',
      render: (d) => (
        <StatusBadge 
          status={d.status} 
          colorMap={{
            'BEKLIYOR': 'yellow',
            'HAZIRLIK_ASAMASINDA': 'blue',
            'TAMAMLANDI': 'green',
            'IPTAL': 'red'
          }} 
        />
      )
    },
    {
      header: 'İşlemler',
      align: 'right',
      render: (d) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => openEditModal(d)} className="text-blue-600 hover:text-blue-900 px-2 py-1 transition-colors" title="Düzenle">
            <Edit size={20} />
          </Button>
          <Button variant="ghost" onClick={() => handleDelete(d.id)} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Sil">
            <Trash2 size={20} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 relative">
      <PageHeader 
        title="Belirli Gün ve Haftalar" 
        description="Eğitim yılı içerisindeki belirli gün ve haftaların kutlama ve anma programları"
        icon={<Flag size={24} />}
        actions={
          <div className="flex gap-2">
            <Button onClick={loadDefaults} variant="outline" className="text-emerald-700 hover:text-emerald-800 border-emerald-200 bg-emerald-50">
              <span>MEB Listesi Yükle</span>
            </Button>
            <Button onClick={handlePrintAll} variant="outline" className="text-slate-700">
              <Printer className="w-5 h-5 mr-2" />
              <span>EK-8 Çizelgesi Yazdır</span>
            </Button>
            <Button
              onClick={openAddModal}
              variant="primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span>Yeni Gün/Hafta</span>
            </Button>
          </div>
        }
      />

      <div className="print:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <DataTable data={days} columns={columns} loading={loading} emptyMessage="Henüz belirli gün/hafta planlaması yapılmamış." />
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 transition-opacity p-4 sm:p-6">
          <div className="bg-slate-50 w-full max-w-4xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Flag className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  {form.id ? 'Program Düzenle' : 'Yeni Kutlama/Anma Programı'}
                </h2>
              </div>
              <Button variant="ghost"  onClick={() => setIsModalOpen(false)}  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 space-x-8">
              {[
                { id: 'info', label: 'Görevlendirme Bilgileri' },
                { id: 'print', label: 'Görevlendirme Yazısı (Çıktı)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
                    activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Gün / Hafta Adı</label>
                        <input type="text" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Örn: 10 Kasım Atatürk'ü Anma Günü" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama / İçerik</label>
                        <textarea rows={2} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Program içeriği..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Başlangıç Tarihi</label>
                        <input type="date" value={form.startDate?.split('T')[0] || ''} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bitiş Tarihi</label>
                        <input type="date" value={form.endDate?.split('T')[0] || ''} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sorumlu / Görevli Öğretmen</label>
                        <select 
                          value={form.assignedStaffId || ''} 
                          onChange={(e) => {
                            const staffId = e.target.value;
                            const staffObj = staffList.find(s => s.id === staffId);
                            setForm({...form, assignedStaffId: staffId, assignedStaffName: staffObj ? staffObj.name : ''});
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Öğretmen Seçiniz --</option>
                          {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hazırlık Durumu</label>
                        <select value={form.status || 'BEKLIYOR'} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                          <option value="BEKLIYOR">Bekliyor (Atanmadı)</option>
                          <option value="HAZIRLIK_ASAMASINDA">Hazırlık Aşamasında</option>
                          <option value="TAMAMLANDI">Program Tamamlandı / Sunuldu</option>
                          <option value="IPTAL">İptal Edildi</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'print' && (
                <div className="flex flex-col items-center space-y-4 pt-10">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4 hover:border-indigo-300">
                     <Printer className="w-12 h-12 text-indigo-500 mx-auto" />
                     <div>
                       <h3 className="font-bold text-slate-800">Görevlendirme Yazısı</h3>
                       <p className="text-sm text-slate-500 mt-1">İlgili öğretmene tebliğ edilecek resmi görevlendirme evrakı.</p>
                     </div>
                      <Button variant="primary" onClick={handlePrintSingleWrapper} className="w-full justify-center">
                        <Printer className="w-4 h-4" />
                        <span>Yazdır</span>
                      </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 shrink-0">
              <Button variant="ghost"  onClick={() => setIsModalOpen(false)} >
                İptal Et
              </Button>
              <Button onClick={handleSave} variant="primary">
                <Save className="w-5 h-5" />
                <span>Kaydet</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GİZLİ YAZDIRMA ŞABLONU */}
      {isModalOpen && (
        <div className="hidden">
           <CommemorativeDaysPrintTemplate ref={printRef} form={form} />
        </div>
      )}

      {/* YAZDIRMA (PRINT) ALANI - TOPLU EK-8 ÇİZELGESİ */}
      {printMode === 'all' && (
        <div className="hidden print:block font-serif bg-white text-black" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
          <style>{`
            @media print {
              @page { size: A4 landscape; margin: 15mm; }
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; line-height: 1.4; font-size: 13px; }
            }
            .ek8-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .ek8-table th, .ek8-table td { border: 1px solid #000; padding: 8px; vertical-align: middle; text-align: left; }
            .ek8-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          `}</style>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>{academicYear} EĞİTİM ÖĞRETİM YILI</h3>
            <h2 style={{ fontWeight: 'bold', fontSize: '16px' }}>BELİRLİ GÜN VE HAFTALAR ÇİZELGESİ (EK-8)</h2>
          </div>

          <table className="ek8-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>SIRA</th>
                <th style={{ width: '35%' }}>BELİRLİ GÜN VE HAFTA ADI</th>
                <th style={{ width: '30%' }}>TARİH / ZAMAN</th>
                <th style={{ width: '30%' }}>SORUMLU KULÜP / SINIF / ÖĞRETMEN</th>
              </tr>
            </thead>
            <tbody>
              {days.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Kayıtlı belirli gün ve hafta bulunmamaktadır.</td>
                </tr>
              ) : (
                days.map((d, idx) => (
                  <tr key={d.id}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>{d.name}</td>
                    <td>
                      {d.startDate ? new Date(d.startDate).toLocaleDateString('tr-TR') : 'Belirtilmedi'}
                      {d.endDate && d.endDate !== d.startDate && ` - ${new Date(d.endDate).toLocaleDateString('tr-TR')}`}
                    </td>
                    <td>{d.assignedStaffName || 'Görevlendirme Yapılmadı'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '50px', paddingRight: '50px' }}>
             <div style={{ textAlign: 'center' }}>
                <p>UYGUNDUR</p>
                <p>.../.../20...</p>
                <p className="font-bold">{settings?.principalName || 'Okul Müdürü'}</p>
             </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  );
}





