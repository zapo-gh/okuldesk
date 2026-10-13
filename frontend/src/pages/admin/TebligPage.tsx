import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { useSettings } from '../../context/SettingsContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { printPdfBlob } from '../../utils/printPdf';
import { 
  FileSignature, 
  User, 
  FileText, 
  Calendar, 
  Clock, 
  CheckSquare, 
  Loader2, 
  CheckCircle2, 
  Printer, 
  History, 
  Trash2, 
  Eye, 
  Search, 
  X, 
  RotateCcw, 
  Download, 
  PenTool, 
  Check, 
  ShieldCheck, 
  Building2,
  FileCheck
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

function formatToTurkishDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

const getCurrentTimeString = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

type EvrakTuru = 'YAZI_KARAR' | 'SERTIFIKA' | 'BASARI_BELGESI' | 'ATAMA_GOREVLENDIRME' | 'DIGER';

const EVRAK_TURLERI: { id: EvrakTuru; label: string }[] = [
  { id: 'YAZI_KARAR', label: 'Yazı / Karar' },
  { id: 'SERTIFIKA', label: 'Sertifika' },
  { id: 'BASARI_BELGESI', label: 'Başarı Belgesi' },
  { id: 'ATAMA_GOREVLENDIRME', label: 'Atama / Görevlendirme' },
];

export default function TebligPage() {
  const { confirm, confirmModal } = useConfirm();
  const { settings } = useSettings();

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Form alanları
  const [schoolName,               setSchoolName]               = useState('');
  const [selectedStaffId,          setSelectedStaffId]          = useState('');
  const [adiSoyadi,                setAdiSoyadi]                = useState('');
  const [tcKimlikNo,               setTcKimlikNo]               = useState('');
  const [unvani,                   setUnvani]                   = useState('');
  const [gorevYeri,                setGorevYeri]                = useState('');
  const [tebligTarihSayi,          setTebligTarihSayi]          = useState('');
  const [tebligatinKonusu,         setTebligatinKonusu]         = useState('');
  const [selectedEvrakTuru,        setSelectedEvrakTuru]        = useState<EvrakTuru>('YAZI_KARAR');
  const [evrakDiger,               setEvrakDiger]               = useState('');
  const [tebligatTarihi,           setTebligatTarihi]           = useState(new Date().toISOString().slice(0, 10));
  const [tebligatSaati,            setTebligatSaati]            = useState(getCurrentTimeString());
  
  // Tebliğ Eden
  const [tebligEdenAdSoyad,        setTebligEdenAdSoyad]        = useState('');
  const [tebligEdenUnvani,         setTebligEdenUnvani]         = useState('Okul Müdürü');
  const [tebligEdenTarih,          setTebligEdenTarih]          = useState(new Date().toISOString().slice(0, 10));

  // Tebellüğ Eden
  const [tebellugEdenAdSoyad,      setTebellugEdenAdSoyad]      = useState('');
  const [tebellugEdenUnvani,       setTebellugEdenUnvani]       = useState('');
  const [tebellugEdenTarih,        setTebellugEdenTarih]        = useState(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  // Geçmiş Belgeler
  const [pastDocs, setPastDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // PDF Önizleme Modalı
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewPdfBlobUrl, setPreviewPdfBlobUrl] = useState<string | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (settings?.schoolName) {
      setSchoolName(settings.schoolName);
      setGorevYeri(settings.schoolName);
    }
    if (settings?.principalName) {
      setTebligEdenAdSoyad(settings.principalName);
      setTebligEdenUnvani('Okul Müdürü');
    }
  }, [settings]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingDocs(true);
    try {
      const [settingsRes, staffRes, docsRes] = await Promise.all([
        api.get('/settings').catch(() => null),
        api.get('/staff').catch(() => null),
        api.get('/teblig').catch(() => null)
      ]);
      
      if (settingsRes?.data?.data?.schoolName) {
        setSchoolName(settingsRes.data.data.schoolName);
        setGorevYeri(prev => prev || settingsRes.data.data.schoolName);
      }
      if (settingsRes?.data?.data?.principalName) {
        setTebligEdenAdSoyad(prev => prev || settingsRes.data.data.principalName);
      }
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
      setAdiSoyadi(''); 
      setTcKimlikNo(''); 
      setUnvani(''); 
      setTebellugEdenAdSoyad(''); 
      setTebellugEdenUnvani('');
      return;
    }
    const found = staffList.find(s => s.id === staffId);
    if (found) {
      setAdiSoyadi(found.name);
      if (found.tcKimlikNo) setTcKimlikNo(found.tcKimlikNo);
      
      const parts = [];
      if (found.unvan) parts.push(found.unvan);
      if (found.brans) parts.push(found.brans);
      const unvanStr = parts.length > 0 ? parts.join(' / ') : (found.title || 'Öğretmen');
      
      setUnvani(unvanStr);
      setTebellugEdenAdSoyad(found.name);
      setTebellugEdenUnvani(unvanStr);
      if (schoolName) setGorevYeri(schoolName);
    }
  };

  const handleTebligEdenStaffSelect = (staffId: string) => {
    if (!staffId) {
      if (settings?.principalName) {
        setTebligEdenAdSoyad(settings.principalName);
        setTebligEdenUnvani('Okul Müdürü');
      }
      return;
    }
    const found = staffList.find(s => s.id === staffId);
    if (found) {
      setTebligEdenAdSoyad(found.name);
      setTebligEdenUnvani(found.unvan || found.title || 'Müdür Yardımcısı');
    }
  };

  const handleResetForm = () => {
    setSelectedStaffId('');
    setAdiSoyadi('');
    setTcKimlikNo('');
    setUnvani('');
    setGorevYeri(schoolName);
    setTebligTarihSayi('');
    setTebligatinKonusu('');
    setSelectedEvrakTuru('YAZI_KARAR');
    setEvrakDiger('');
    setTebligatTarihi(new Date().toISOString().slice(0, 10));
    setTebligatSaati(getCurrentTimeString());
    setTebellugEdenAdSoyad('');
    setTebellugEdenUnvani('');
    setTebellugEdenTarih(new Date().toISOString().slice(0, 10));
    if (settings?.principalName) {
      setTebligEdenAdSoyad(settings.principalName);
      setTebligEdenUnvani('Okul Müdürü');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Bu tebliğ belgesi kaydını silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/teblig/${id}`);
      toast.success('Belge kaydı silindi.');
      setPastDocs(prev => prev.filter(d => d.id !== id));
    } catch (e: any) {
      toast.error('Belge silinirken bir hata oluştu.');
    }
  };

  const handleGenerate = async () => {
    if (!adiSoyadi.trim()) {
      toast.error('Tebellüğ eden personelin Adı Soyadı zorunludur.');
      return;
    }
    if (!tebligEdenAdSoyad.trim()) {
      toast.error('Tebliğ eden yetkilinin Adı Soyadı zorunludur.');
      return;
    }

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
        evrakYaziKarar:          selectedEvrakTuru === 'YAZI_KARAR',
        evrakSertifika:          selectedEvrakTuru === 'SERTIFIKA',
        evrakBasariBelgesi:      selectedEvrakTuru === 'BASARI_BELGESI',
        evrakAtamaGorevlendirme: selectedEvrakTuru === 'ATAMA_GOREVLENDIRME',
        evrakDiger:              selectedEvrakTuru === 'DIGER' ? (evrakDiger.trim() || 'Diğer') : '',
        tebligatTarihi: formatToTurkishDate(tebligatTarihi),
        tebligatSaati,
        tebligEdenAdSoyad,
        tebligEdenUnvani,
        tebligEdenTarih:   formatToTurkishDate(tebligEdenTarih),
        tebellugEdenAdSoyad: tebellugEdenAdSoyad || adiSoyadi,
        tebellugEdenUnvani:  tebellugEdenUnvani || unvani,
        tebellugEdenTarih: formatToTurkishDate(tebellugEdenTarih),
        academicYear: settings?.academicYear || '2025-2026'
      }, { responseType: 'blob' });

      printPdfBlob(res.data);
      toast.success('Tebliğ belgesi oluşturuldu ve yazdırma başlatıldı.');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Belge oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Geçmiş belgeyi doğrudan yazdırma
  const handlePrintPastDoc = async (doc: any) => {
    const tId = toast.loading('Belge hazırlanıyor...');
    try {
      const res = await api.get(`/teblig/${doc.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      printPdfBlob(blob);
      toast.success('Yazdırma penceresi açıldı.', { id: tId });
    } catch (e) {
      toast.error('Belge PDF dosyası açılamadı.', { id: tId });
    }
  };

  // Geçmiş belgeyi modalda önizleme
  const handleOpenPdfPreview = async (doc: any) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    try {
      const res = await api.get(`/teblig/${doc.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewPdfBlob(blob);
      setPreviewPdfBlobUrl(url);
    } catch (e) {
      toast.error('Belge önizlemesi yüklenemedi.');
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePdfPreview = () => {
    if (previewPdfBlobUrl) {
      URL.revokeObjectURL(previewPdfBlobUrl);
      setPreviewPdfBlobUrl(null);
    }
    setPreviewPdfBlob(null);
    setPreviewDoc(null);
  };

  const filteredPastDocs = pastDocs.filter(d => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return (
      (d.personnelName || '').toLowerCase().includes(q) ||
      (d.documentSubject || '').toLowerCase().includes(q) ||
      (d.documentDateNum || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <PageHeader
        title="Tebliğ – Tebellüğ Belgesi"
        description="Personele yapılan resmi tebligatı belgeleyen formu oluşturun, anında yazdırın ve geçmiş kayıtları yönetin."
        icon={<FileSignature size={24} />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab(activeTab === 'create' ? 'history' : 'create')}
              leftIcon={activeTab === 'create' ? <History size={16} /> : <FileSignature size={16} />}
              className={`text-xs ${
                activeTab === 'history'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {activeTab === 'create' ? 'Geçmiş Belgeler' : 'Yeni Belge Formu'}
              {pastDocs.length > 0 && activeTab === 'create' && (
                <span className="ml-1.5 px-2 py-0.2 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {pastDocs.length}
                </span>
              )}
            </Button>
          </div>
        }
      />

      {/* 2. TAB: YENİ BELGE OLUŞTURMA FORMU */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* SOL KOLON: Personel ve Yetkili Bilgileri */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Kart 1: Tebellüğ Eden (Personel) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <User size={16} />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Tebellüğ Eden Personel Bilgileri
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">Tebligatın yapılacağı öğretmen veya memur</p>
                    </div>
                  </div>
                </div>

                {/* Hızlı Personel Seçimi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Personel Listesinden Seç
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                    value={selectedStaffId}
                    onChange={e => handleStaffSelect(e.target.value)}
                  >
                    <option value="">-- Listeden Seçerek Otomatik Doldur --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.unvan || s.brans || s.title || 'Personel'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Adı Soyadı <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                      value={adiSoyadi}
                      onChange={e => {
                        setAdiSoyadi(e.target.value);
                        setTebellugEdenAdSoyad(e.target.value);
                      }}
                      placeholder="Personelin adı ve soyadı"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      T.C. Kimlik No
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition font-mono"
                      value={tcKimlikNo}
                      onChange={e => setTcKimlikNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="11 haneli T.C. No"
                      maxLength={11}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Unvanı / Branşı
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                      value={unvani}
                      onChange={e => {
                        setUnvani(e.target.value);
                        setTebellugEdenUnvani(e.target.value);
                      }}
                      placeholder="Örn: Öğretmen / Matematik"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Görev Yeri (Okul / Kurum)
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                      value={gorevYeri}
                      onChange={e => setGorevYeri(e.target.value)}
                      placeholder="Okul adı"
                    />
                  </div>
                </div>
              </div>

              {/* Kart 2: Tebliğ Eden (Yetkili) ve İmza Tarihleri */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Tebliğ Eden Yetkili Bilgileri
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">Tebligatı imzalayan ve bildiren idareci</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tebliğ Eden Adı Soyadı <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                      value={tebligEdenAdSoyad}
                      onChange={e => setTebligEdenAdSoyad(e.target.value)}
                      placeholder="Örn: Okul Müdürü Adı Soyadı"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Yetkili Unvanı
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                      value={tebligEdenUnvani}
                      onChange={e => setTebligEdenUnvani(e.target.value)}
                      placeholder="Örn: Okul Müdürü"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-600" />
                      Tebliğ İmza Tarihi
                    </label>
                    <input 
                      type="date"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                      value={tebligEdenTarih}
                      onChange={e => setTebligEdenTarih(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-600" />
                      Tebellüğ İmza Tarihi
                    </label>
                    <input 
                      type="date"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                      value={tebellugEdenTarih}
                      onChange={e => setTebellugEdenTarih(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SAĞ KOLON: Belge & Tebligat Bilgileri */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Tebliğ Edilen Belge Detayları
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">Yazı/karar bilgileri, tebligat saati ve evrak türleri</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tebliğ Edilen Yazı, Onay veya Kararın Tarih ve Sayısı
                  </label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                    value={tebligTarihSayi}
                    onChange={e => setTebligTarihSayi(e.target.value)}
                    placeholder="Örn: 13.10.2026 tarih, E-98234 sayılı yazı"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tebligatın Konusu
                  </label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                    value={tebligatinKonusu}
                    onChange={e => setTebligatinKonusu(e.target.value)}
                    placeholder="Örn: Nöbet görevi talimatı / Disiplin süreci bilgilendirmesi"
                  />
                </div>

                {/* Evrak Türü Seçimi */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tebliğ Edilen Evrak Türü
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Sadece biri seçilebilir</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {EVRAK_TURLERI.map((item) => {
                      const isSelected = selectedEvrakTuru === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedEvrakTuru(item.id)}
                          className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer text-left ${
                            isSelected 
                              ? 'bg-indigo-50/90 text-indigo-700 border-indigo-400 shadow-xs ring-1 ring-indigo-400/30' 
                              : 'bg-slate-50/70 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Diğer Evrak Seçeneği */}
                  <div 
                    onClick={() => setSelectedEvrakTuru('DIGER')}
                    className={`mt-2 p-2 rounded-lg border text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                      selectedEvrakTuru === 'DIGER'
                        ? 'bg-indigo-50/90 text-indigo-700 border-indigo-400 shadow-xs ring-1 ring-indigo-400/30'
                        : 'bg-slate-50/70 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                      selectedEvrakTuru === 'DIGER' ? 'bg-indigo-600 border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-300 bg-white'
                    }`}>
                      {selectedEvrakTuru === 'DIGER' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="shrink-0 text-slate-700">Diğer:</span>
                    <input 
                      type="text"
                      className="flex-1 px-2.5 py-1 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition placeholder:text-slate-400 font-normal"
                      value={evrakDiger}
                      onFocus={() => setSelectedEvrakTuru('DIGER')}
                      onChange={e => {
                        setSelectedEvrakTuru('DIGER');
                        setEvrakDiger(e.target.value);
                      }}
                      placeholder="Farklı bir evrak türü varsa yazın..."
                    />
                  </div>
                </div>

                {/* Tarih ve Saat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-600" />
                      Tebligat Tarihi
                    </label>
                    <input 
                      type="date"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                      value={tebligatTarihi}
                      onChange={e => setTebligatTarihi(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      Tebligat Saati
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="time"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition"
                        value={tebligatSaati}
                        onChange={e => setTebligatSaati(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setTebligatSaati(getCurrentTimeString())}
                        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition shrink-0 cursor-pointer"
                        title="Şimdiki saati ayarla"
                      >
                        Şimdi
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetForm}
                  leftIcon={<RotateCcw size={14} />}
                  className="text-xs text-slate-600 w-full sm:w-auto"
                >
                  Formu Temizle
                </Button>

                <Button 
                  type="button"
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={loading}
                  leftIcon={loading ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                  className="w-full sm:w-auto text-xs font-bold px-6"
                >
                  {loading ? 'Belge Hazırlanıyor...' : 'Tebliğ Belgesini Oluştur & Yazdır'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: GEÇMİŞ TEBLİĞ BELGELERİ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-0">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-indigo-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Geçmiş Tebliğ – Tebellüğ Belgeleri
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {pastDocs.length} Belge
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder="Personel veya konu ara..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchData} 
                leftIcon={<Loader2 size={13} className={loadingDocs ? 'animate-spin' : ''} />}
                className="h-8 text-xs bg-white text-slate-700"
              >
                Yenile
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Personel Adı</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Tebligat Konusu</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Evrak Tarih / Sayı</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Oluşturulma Tarihi</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loadingDocs ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500 animate-pulse text-xs">
                      Belgeler yükleniyor...
                    </td>
                  </tr>
                ) : filteredPastDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500 text-xs">
                      {historySearch ? 'Aramanıza uygun tebliğ belgesi bulunamadı.' : 'Henüz kayıtlı bir tebliğ belgesi bulunmuyor.'}
                    </td>
                  </tr>
                ) : (
                  filteredPastDocs.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-slate-900">
                        {doc.personnelName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title={doc.documentSubject}>
                        {doc.documentSubject || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {doc.documentDateNum || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(doc.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrintPastDoc(doc)}
                            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer"
                            title="Doğrudan Yazdır"
                          >
                            <Printer size={15} />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleOpenPdfPreview(doc)}
                            className="p-1.5 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                            title="Önizle ve İncele"
                          >
                            <Eye size={15} />
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                            title="Belgeyi Sil"
                          >
                            <Trash2 size={15} />
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
      )}

      {/* 4. PDF Önizleme Modalı (In-App WebView) */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleClosePdfPreview}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {previewDoc.personnelName} — Tebliğ Belgesi
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {previewDoc.documentSubject || 'Konu belirtilmemiş'} • {new Date(previewDoc.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewPdfBlob && printPdfBlob(previewPdfBlob)}
                  disabled={!previewPdfBlob}
                  leftIcon={<Printer size={14} />}
                  className="h-8 text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                >
                  Yazdır
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!previewPdfBlobUrl) return;
                    const a = document.createElement('a');
                    a.href = previewPdfBlobUrl;
                    a.download = `Teblig_${(previewDoc.personnelName || 'Belge').replace(/\s+/g, '_')}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  disabled={!previewPdfBlobUrl}
                  leftIcon={<Download size={14} />}
                  className="h-8 px-2.5 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
                  title="PDF İndir"
                >
                  İndir
                </Button>

                <button
                  type="button"
                  onClick={handleClosePdfPreview}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition ml-1"
                  title="Kapat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-2 sm:p-4 bg-slate-100 min-h-[420px] flex items-center justify-center overflow-hidden">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center text-slate-500 py-16">
                  <Loader2 size={32} className="animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs font-semibold">Tebliğ belgesi yükleniyor...</p>
                </div>
              ) : previewPdfBlobUrl ? (
                <iframe 
                  src={previewPdfBlobUrl} 
                  className="w-full h-[70vh] rounded-xl border border-slate-300 bg-white shadow-inner"
                  title="Tebliğ Belgesi Önizleme"
                />
              ) : (
                <div className="text-center text-slate-400 py-16 text-xs">
                  Belge görüntülenemedi.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  );
}
