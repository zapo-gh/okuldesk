import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { printPdfBlob } from '../../utils/printPdf';
import { FileSignature, User, FileText, Calendar, Clock, PenTool, CheckSquare, Loader2, CheckCircle2, Printer, History, Trash2, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export default function TebligPage() {
  const [schoolName,               setSchoolName]               = useState('');
  const [selectedStaffId,          setSelectedStaffId]          = useState('');
  const [adiSoyadi,                setAdiSoyadi]                = useState('');
  const [tcKimlikNo,               setTcKimlikNo]               = useState('');
  const [unvani,                   setUnvani]                   = useState('');
  const [gorevYeri,                setGorevYeri]                = useState('');
  const [tebligTarihSayi,          setTebligTarihSayi]          = useState('');
  const [tebligatinKonusu,         setTebligatinKonusu]         = useState('');
  const [evrakYaziKarar,           setEvrakYaziKarar]           = useState(false);
  const [evrakSertifika,           setEvrakSertifika]           = useState(false);
  const [evrakBasariBelgesi,       setEvrakBasariBelgesi]       = useState(false);
  const [evrakAtamaGorevlendirme,  setEvrakAtamaGorevlendirme]  = useState(false);
  const [evrakDiger,               setEvrakDiger]               = useState('');
  const [tebligatTarihi,           setTebligatTarihi]           = useState(new Date().toISOString().slice(0, 10));
  const [tebligatSaati,            setTebligatSaati]            = useState('');
  const [tebligEdenAdSoyad,        setTebligEdenAdSoyad]        = useState('');
  const [tebligEdenUnvani,         setTebligEdenUnvani]         = useState('');
  const [tebligEdenTarih,          setTebligEdenTarih]          = useState(new Date().toISOString().slice(0, 10));
  const [tebellugEdenAdSoyad,      setTebellugEdenAdSoyad]      = useState('');
  const [tebellugEdenUnvani,       setTebellugEdenUnvani]       = useState('');
  const [tebellugEdenTarih,        setTebellugEdenTarih]        = useState(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  
  const [pastDocs, setPastDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, staffRes, docsRes] = await Promise.all([
        api.get('/settings').catch(() => null),
        api.get('/staff').catch(() => null),
        api.get('/teblig').catch(() => null)
      ]);
      
      if (settingsRes?.data?.data?.schoolName) setSchoolName(settingsRes.data.data.schoolName);
      if (staffRes?.data?.data?.staff) setStaffList(staffRes.data.data.staff);
      if (docsRes?.data?.data) setPastDocs(docsRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (!staffId) {
      setAdiSoyadi(''); setTcKimlikNo(''); setUnvani(''); setTebellugEdenAdSoyad(''); setTebellugEdenUnvani('');
      return;
    }
    const found = staffList.find(s => s.id === staffId);
    if (found) {
      setAdiSoyadi(found.name);
      if (found.tcKimlikNo) setTcKimlikNo(found.tcKimlikNo);
      
      const parts = [];
      if (found.unvan) parts.push(found.unvan);
      if (found.brans) parts.push(found.brans);
      const unvanStr = parts.length > 0 ? parts.join(' / ') : '';
      if (unvanStr) {
        setUnvani(unvanStr);
        setTebellugEdenUnvani(unvanStr);
      }
      setTebellugEdenAdSoyad(found.name);
      if (schoolName) setGorevYeri(schoolName);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/teblig/${id}`);
      toast.success('Belge silindi.');
      fetchData();
    } catch (e: any) {
      toast.error('Silinirken hata oluştu.');
    }
  };

  const handleGenerate = async () => {
    if (!adiSoyadi.trim()) {
      toast.error('Adı Soyadı zorunludur.');
      return;
    }
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.post('/teblig/generate-pdf', {
        staffId: selectedStaffId || undefined,
        schoolName,
        adiSoyadi,
        tcKimlikNo,
        unvani,
        gorevYeri,
        tebligTarihSayi,
        tebligatinKonusu,
        evrakYaziKarar,
        evrakSertifika,
        evrakBasariBelgesi,
        evrakAtamaGorevlendirme,
        evrakDiger,
        tebligatTarihi: formatDate(tebligatTarihi),
        tebligatSaati,
        tebligEdenAdSoyad,
        tebligEdenUnvani,
        tebligEdenTarih:   formatDate(tebligEdenTarih),
        tebellugEdenAdSoyad,
        tebellugEdenUnvani,
        tebellugEdenTarih: formatDate(tebellugEdenTarih),
      }, { responseType: 'blob' });

      printPdfBlob(res.data);
      setSuccess('Belge başarıyla oluşturuldu, yazdırılıyor...');
      fetchData(); // refresh past docs
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Bilinmeyen hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const CheckboxItem = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label: string }) => (
    <label className={`
      flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none flex-1 min-w-[200px]
      ${checked ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'}
    `}>
      <div className={`
        w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors
        ${checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}
      `}>
        {checked && <CheckSquare size={14} className="text-white fill-current" />}
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tebliğ – Tebellüğ Belgesi"
        description="Personele yapılan tebligatı belgeleyen resmi formu PDF olarak oluşturun ve geçmiş kayıtları yönetin."
        icon={<FileSignature size={28} />}
      />

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 text-sm flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={18} className="shrink-0"/> <span className="font-bold">Başarılı:</span> {success}
        </div>
      )}

      {/* Personel Bilgileri */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={20} /></div>
            Personel Seçimi ve Bilgiler
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Personel Seçin
              </label>
              <select 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                value={selectedStaffId}
                onChange={e => handleStaffSelect(e.target.value)}
              >
                <option value="">-- Listeden Seçin --</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.unvan || s.title || 'Personel'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Adı Soyadı <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                value={adiSoyadi}
                onChange={e => setAdiSoyadi(e.target.value)}
                placeholder="Personelin adı ve soyadı"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">T.C. Kimlik No</label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50"
                value={tcKimlikNo}
                onChange={e => setTcKimlikNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="00000000000"
                maxLength={11}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Unvanı / Branşı</label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50"
                value={unvani}
                onChange={e => setUnvani(e.target.value)}
                placeholder="Ör: Öğretmen / Matematik"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Görev Yeri</label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50"
                value={gorevYeri}
                onChange={e => setGorevYeri(e.target.value)}
                placeholder="Ör: Okul adı"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Belge Bilgileri */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText size={20} /></div>
            Belge Bilgileri
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tebliğ Edilen Yazı, Onay veya Kararın Tarih ve Sayısı</label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                value={tebligTarihSayi}
                onChange={e => setTebligTarihSayi(e.target.value)}
                placeholder="Ör: 01.05.2026 tarih, 2026/123 sayılı yazı"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tebligatın Konusu</label>
              <input 
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                value={tebligatinKonusu}
                onChange={e => setTebligatinKonusu(e.target.value)}
                placeholder="Ör: Disiplin soruşturması başlatılması hk."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Tebliğ Edilen Evrak</label>
            <div className="flex flex-wrap gap-3">
              <CheckboxItem checked={evrakYaziKarar} onChange={setEvrakYaziKarar} label="Yazı/Karar" />
              <CheckboxItem checked={evrakSertifika} onChange={setEvrakSertifika} label="Sertifika" />
              <CheckboxItem checked={evrakBasariBelgesi} onChange={setEvrakBasariBelgesi} label="Başarı Belgesi" />
              <CheckboxItem checked={evrakAtamaGorevlendirme} onChange={setEvrakAtamaGorevlendirme} label="Atama/Görevlendirme" />
            </div>
            
            <div className="flex items-center gap-3 mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-gray-700 shrink-0">
                <div className={`
                  w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors
                  ${evrakDiger ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}
                `}>
                  {!!evrakDiger && <CheckSquare size={14} className="text-white fill-current" />}
                </div>
                <input
                  type="checkbox"
                  checked={!!evrakDiger}
                  onChange={e => { if (!e.target.checked) setEvrakDiger(''); }}
                  className="hidden"
                />
                Diğer:
              </label>
              <input 
                className="w-full md:max-w-md px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                value={evrakDiger}
                onChange={e => setEvrakDiger(e.target.value)}
                placeholder="Belge adını yazın..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Calendar size={16} className="text-gray-400"/> Tebligat Tarihi</label>
              <input 
                type="date"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                value={tebligatTarihi}
                onChange={e => setTebligatTarihi(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Clock size={16} className="text-gray-400"/> Tebligat Saati</label>
              <input 
                type="time"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                value={tebligatSaati}
                onChange={e => setTebligatSaati(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 pb-4">
        <Button 
          variant="primary"
          onClick={handleGenerate}
          disabled={loading}
          leftIcon={loading ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}
        >
          {loading ? 'Hazırlanıyor...' : 'Yeni Belge Oluştur & Yazdır'}
        </Button>
      </div>

      {/* Geçmiş Belgeler Tablosu */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><History size={20} /></div>
            Geçmiş Tebliğ Belgeleri
          </h2>
          <Button variant="outline" size="sm" onClick={fetchData} leftIcon={<Loader2 size={16} className={loadingDocs ? 'animate-spin' : ''} />} className="w-full lg:w-auto justify-center">
            Yenile
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Personel Adı</th>
                <th className="px-4 py-3">Konu</th>
                <th className="px-4 py-3">Evrak Tarih/Sayı</th>
                <th className="px-4 py-3">Oluşturulma Tarihi</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pastDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Geçmişte oluşturulmuş bir tebliğ belgesi bulunmuyor.
                  </td>
                </tr>
              ) : (
                pastDocs.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{doc.personnelName}</td>
                    <td className="px-4 py-3 text-slate-600">{doc.documentSubject || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{doc.documentDateNum || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(doc.createdAt).toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {doc.pdfPath && (
                          <a 
                            href={api.defaults.baseURL?.replace('/api', '') + doc.pdfPath} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                          >
                            <Eye size={16} /> Görüntüle
                          </a>
                        )}
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
