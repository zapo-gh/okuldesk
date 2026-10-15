import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { 
  ShieldCheck, 
  Globe, 
  Users, 
  Download, 
  Printer, 
  Search, 
  Send, 
  Edit3, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Copy, 
  RefreshCw, 
  Check, 
  X, 
  MessageCircle,
  GraduationCap,
  ArrowRight,
  Filter,
  AlertTriangle,
  CloudUpload
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ManualConsentModal, ConsentContactData } from './whatsapp/ManualConsentModal';
import { DigitalConsentLogModal } from './whatsapp/DigitalConsentLogModal';
import { printPdfBlob } from '../../utils/printPdf';
import toast from 'react-hot-toast';

interface ConsentStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
}

export default function WhatsAppConsentPage() {
  const { confirm, confirmModal } = useConfirm();

  // İstatistikler
  const [stats, setStats] = useState<ConsentStats>({
    total: 0,
    accepted: 0,
    declined: 0,
    pending: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Firebase Bulut Senkronizasyon State
  const [syncingFirebase, setSyncingFirebase] = useState(false);
  const [uploadingFirebase, setUploadingFirebase] = useState(false);

  // Veli Listesi State
  const [consentList, setConsentList] = useState<ConsentContactData[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACCEPTED' | 'DECLINED' | 'PENDING'>('ALL');

  // Manuel Düzenleme Modalı
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ConsentContactData | null>(null);

  // Dijital Güvenlik ve IP Log Kaydı Modalı
  const [viewingLogContact, setViewingLogContact] = useState<ConsentContactData | null>(null);

  // Toplu PDF ve Gönderim Durumları
  const [downloadingClassPdf, setDownloadingClassPdf] = useState(false);
  const [batchSending, setBatchSending] = useState(false);

  // Sayfa yüklendiğinde verileri çek ve periyodik canlı senkronize et
  useEffect(() => {
    fetchStats();
    fetchConsentList();
    handleSyncFromFirebase(true);

    // Sayfa açık kaldığı sürece her 2 saatte bir (günde 3-4 kez) sessizce kontrol et
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const interval = setInterval(() => {
      fetchStats(true);
      fetchConsentList(true);
      handleSyncFromFirebase(true);
    }, TWO_HOURS);
    return () => clearInterval(interval);
  }, []);

  const handleSyncFromFirebase = async (silent = false) => {
    if (!silent) setSyncingFirebase(true);
    try {
      const res = await api.post('/whatsapp/firebase/sync');
      if (res.data?.success) {
        if (!silent) {
          toast.success(res.data.message || 'Bulut onayları senkronize edildi.');
        }
        fetchStats(true);
        fetchConsentList(true);
      }
    } catch (err: any) {
      if (!silent) toast.error(err.response?.data?.message || 'Bulut senkronizasyonu başarısız.');
    } finally {
      if (!silent) setSyncingFirebase(false);
    }
  };

  const handleUploadClassToFirebase = async () => {
    if (!selectedClass) return;
    setUploadingFirebase(true);
    try {
      const res = await api.post('/whatsapp/firebase/upload', { className: selectedClass });
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchConsentList(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Buluta yükleme başarısız.');
    } finally {
      setUploadingFirebase(false);
    }
  };

  const fetchStats = async (silent = false) => {
    if (!silent) setLoadingStats(true);
    try {
      const res = await api.get('/whatsapp/consents/stats');
      if (res.data?.success) setStats(res.data.data);
    } catch {
      // sessizce geç
    } finally {
      if (!silent) setLoadingStats(false);
    }
  };

  const fetchConsentList = async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const res = await api.get('/whatsapp/consents/list');
      if (res.data?.success) {
        setConsentList(res.data.data || []);
      }
    } catch {
      if (!silent) toast.error('Veli listesi yüklenemedi.');
    } finally {
      if (!silent) setLoadingList(false);
    }
  };


  const handlePrintSinglePdf = async (contact: ConsentContactData) => {
    try {
      const toastId = toast.loading('Resmi onay formu hazırlanıyor...');
      const res = await api.get(`/whatsapp/consents/pdf/contact/${contact.contactId}`, {
        responseType: 'blob',
      });
      printPdfBlob(res.data as Blob, {
        title: `${contact.studentName || 'Öğrenci'} - Veli KVKK ve Onay Formu`,
        subtitle: `${contact.className || ''} • No: ${contact.schoolNumber || ''} • Veli: ${contact.parentName || 'Veli'} (${contact.phone})`,
        fileName: `KVKK_Onay_${(contact.studentName || 'Ogrenci').replace(/\s+/g, '_')}.pdf`,
      });
      toast.success('Yazdırma ve önizleme ekranı açıldı.', { id: toastId });
    } catch {
      toast.error('PDF formu hazırlanırken bir hata oluştu.');
    }
  };

  const handlePrintClassPdf = async () => {
    if (!selectedClass) {
      toast.error('Lütfen önce bir sınıf seçiniz.');
      return;
    }

    setDownloadingClassPdf(true);
    try {
      const res = await api.get(`/whatsapp/consents/pdf/class/${encodeURIComponent(selectedClass)}`, {
        responseType: 'blob',
      });
      printPdfBlob(res.data as Blob, {
        title: `${selectedClass} Sınıfı - Tüm Veli Onay Formları`,
        subtitle: `${selectedClass} sınıfında kayıtlı tüm öğrencilerin resmi MEB onay formları birleştirildi.`,
        fileName: `${selectedClass}_Sinifi_Veli_Onay_Formlari.pdf`,
      });
      toast.success(`${selectedClass} sınıfının tüm formları yazdırma ve önizleme ekranına aktarıldı.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sınıf PDF formu oluşturulamadı.');
    } finally {
      setDownloadingClassPdf(false);
    }
  };

  const handleSendConsentFromTable = async (contact: ConsentContactData) => {
    if (!contact.parentId) {
      toast.error('Veli sistem kaydı bulunamadı.');
      return;
    }

    try {
      const toastId = toast.loading('WhatsApp onay isteği ve web bağlantısı gönderiliyor...');
      const res = await api.post('/whatsapp/send-consent', { parentId: contact.parentId });
      toast.success(res.data.message || 'Onay isteği gönderildi.', { id: toastId });
      fetchConsentList(true);
      fetchStats(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Onay isteği gönderilemedi.');
    }
  };

  // Sınıftaki tüm bekleyen velilere toplu onay isteği gönder
  const handleBatchSendToPendingInClass = async () => {
    if (!selectedClass) return;

    const pendingInClass = consentList.filter(
      (c) => c.student?.className === selectedClass && c.waConsentStatus === 'PENDING' && c.parentId
    );

    if (pendingInClass.length === 0) {
      toast.success('Bu sınıfta onay bekleyen veli bulunmuyor.');
      return;
    }

    const ok = await confirm(
      `${selectedClass} sınıfındaki onay bekleyen ${pendingInClass.length} veliye WhatsApp üzerinden onay isteği ve güvenli web linki (alizmtal-wp-onay.web.app) gönderilecektir. Devam etmek istiyor musunuz?`
    );
    if (!ok) return;

    setBatchSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const contact of pendingInClass) {
      try {
        await api.post('/whatsapp/send-consent', { parentId: contact.parentId });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBatchSending(false);
    toast.success(`Toplu gönderim tamamlandı: ${successCount} başarılı, ${failCount} başarısız.`);
    fetchConsentList(true);
    fetchStats(true);
  };


  // Sınıf Bilgilerini ve İstatistiklerini Hesapla
  const allClasses = Array.from(
    new Set(consentList.map((c) => c.student?.className).filter((cls): cls is string => Boolean(cls)))
  ).sort((a, b) => a.localeCompare(b, 'tr-TR', { numeric: true }));

  // Her sınıf için istatistikler
  const classBreakdownMap: Record<string, { total: number; accepted: number; declined: number; pending: number }> = {};
  allClasses.forEach((cls) => {
    const studentsInClass = consentList.filter((c) => c.student?.className === cls);
    classBreakdownMap[cls] = {
      total: studentsInClass.length,
      accepted: studentsInClass.filter((c) => c.waConsentStatus === 'ACCEPTED').length,
      declined: studentsInClass.filter((c) => c.waConsentStatus === 'DECLINED').length,
      pending: studentsInClass.filter((c) => c.waConsentStatus === 'PENDING').length,
    };
  });

  // Filtrelenmiş ve Öğrenci Bazında Gruplanmış Liste
  const isSearchActive = searchTerm.trim().length >= 2;
  const showTable = Boolean(selectedClass) || isSearchActive;

  // 1. Öğrenci bazında grupla
  interface StudentConsentGroup {
    studentKey: string;
    student: {
      id?: string;
      fullName: string;
      className: string;
      schoolNumber: string;
    } | null;
    contacts: ConsentContactData[];
  }

  const studentGroupMap = new Map<string, StudentConsentGroup>();
  for (const c of consentList) {
    const key = c.student?.id || (c.student?.fullName ? `${c.student.fullName}-${c.student.className}-${c.student.schoolNumber}` : `contact-${c.contactId}`);
    if (!studentGroupMap.has(key)) {
      studentGroupMap.set(key, {
        studentKey: key,
        student: c.student || null,
        contacts: [],
      });
    }
    studentGroupMap.get(key)!.contacts.push(c);
  }

  // 2. Grupları Öğrenci Okul Numarasına göre (sayısal) ve sonra Öğrenci Adına göre sırala
  const allStudentGroups = Array.from(studentGroupMap.values()).sort((a, b) => {
    if (!a.student && b.student) return 1;
    if (a.student && !b.student) return -1;
    if (!a.student && !b.student) return 0;

    // Okul numarasına göre sayısal karşılaştırma
    const numA = parseInt(a.student!.schoolNumber || '', 10);
    const numB = parseInt(b.student!.schoolNumber || '', 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }

    const noComp = (a.student!.schoolNumber || '').localeCompare(b.student!.schoolNumber || '', 'tr-TR', { numeric: true });
    if (noComp !== 0) return noComp;

    return (a.student!.fullName || '').localeCompare(b.student!.fullName || '', 'tr-TR');
  });

  // 3. Filtreleme uygulama
  const filteredStudentGroups = allStudentGroups
    .map((group) => {
      // Sınıf filtresi
      if (selectedClass && group.student?.className !== selectedClass) return null;

      // Arama filtresi
      if (isSearchActive) {
        const q = searchTerm.toLocaleLowerCase('tr-TR');
        const matchesStudent =
          (group.student?.fullName && group.student.fullName.toLocaleLowerCase('tr-TR').includes(q)) ||
          (group.student?.schoolNumber && group.student.schoolNumber.includes(q)) ||
          (group.student?.className && group.student.className.toLocaleLowerCase('tr-TR').includes(q));

        const matchesParent = group.contacts.some(
          (c) =>
            c.parentName.toLocaleLowerCase('tr-TR').includes(q) ||
            c.phone.includes(q) ||
            (c.relation && c.relation.toLocaleLowerCase('tr-TR').includes(q))
        );

        if (!matchesStudent && !matchesParent) return null;
      }

      // Durum filtresi
      let matchedContacts = group.contacts;
      if (statusFilter !== 'ALL') {
        matchedContacts = group.contacts.filter((c) => c.waConsentStatus === statusFilter);
        if (matchedContacts.length === 0) return null;
      }

      return {
        ...group,
        contacts: matchedContacts,
      };
    })
    .filter((g): g is StudentConsentGroup => Boolean(g));

  const totalFilteredContacts = filteredStudentGroups.reduce((acc, g) => acc + g.contacts.length, 0);

  return (
    <div className="space-y-3.5">
      {confirmModal}

      <PageHeader
        title="Veli KVKK ve Onay Yönetimi"
        description="Velilerin WhatsApp iletişim ve veri işleme açık rıza takibi"
        icon={<ShieldCheck size={28} className="text-white" />}
        actions={
          <Link
            to="/admin/whatsapp"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition shadow-2xs"
            title="WhatsApp bağlantı durumunu ve QR kodunu yönetin"
          >
            <MessageCircle size={15} />
            <span>WhatsApp Bağlantısı</span>
          </Link>
        }
      />

      {/* ── 1. BÖLÜM: GOOGLE BULUT ONAY PORTALI ── */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 border border-blue-200">
            <Globe size={18} />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold text-slate-800">Google Bulut Portalı</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              7/24 Kesintisiz Aktif
            </span>
            <span
              className="text-xs font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-200 text-slate-700 select-all"
              title="Resmi Google Hosting Web Onay Alan Adı"
            >
              alizmtal-wp-onay.web.app
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSyncFromFirebase(false)}
            disabled={syncingFirebase}
            leftIcon={syncingFirebase ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            className="text-xs h-8 font-semibold text-slate-700 hover:text-slate-900"
            title="Velilerin telefondan verdikleri onayları anında programa aktarır"
          >
            {syncingFirebase ? 'Çekiliyor...' : 'Buluttan Onayları Çek'}
          </Button>

          {selectedClass && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClassToFirebase}
              disabled={uploadingFirebase}
              leftIcon={uploadingFirebase ? <Loader2 size={13} className="animate-spin" /> : <CloudUpload size={13} />}
              className="text-xs h-8 font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
              title={`${selectedClass} sınıfındaki velileri Firebase bulutuna önceden yükler`}
            >
              {uploadingFirebase ? 'Yükleniyor...' : `${selectedClass} Buluta Yükle`}
            </Button>
          )}

          <a
            href="https://alizmtal-wp-onay.web.app/?t=demo"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg font-medium transition"
            title="Velilere açılacak 2 sayfalık formu tarayıcıda canlı görün"
          >
            <span>Form Önizleme</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* ── 2. BÖLÜM: GENEL İSTATİSTİK ŞERİDİ (MİNİMAL) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Toplam Veli</span>
          <span className="text-sm font-bold text-slate-800">{stats.total}</span>
        </div>

        <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200/70 bg-emerald-50/30 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-emerald-800 truncate">Açık Rıza Veren</span>
          </div>
          <span className="text-sm font-bold text-emerald-700 ml-2">{stats.accepted}</span>
        </div>

        <div className="bg-white px-3 py-1.5 rounded-lg border border-rose-200/70 bg-rose-50/30 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <XCircle size={13} className="text-rose-600 shrink-0" />
            <span className="text-xs font-semibold text-rose-800 truncate">Reddeden</span>
          </div>
          <span className="text-sm font-bold text-rose-700 ml-2">{stats.declined}</span>
        </div>

        <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200/70 bg-amber-50/30 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock size={13} className="text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-amber-800 truncate">Onay Bekleyen</span>
          </div>
          <span className="text-sm font-bold text-amber-700 ml-2">{stats.pending}</span>
        </div>
      </div>

      {/* ── 3. BÖLÜM: SINIF BAZLI & ARAMA ODAKLI YAKLAŞIM ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Kontrol Çubuğu */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Users size={15} />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Veli Onay Listesi
            </h3>
          </div>

          {/* Sınıf Dropdown + Arama Input */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Arama Input */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Öğrenci, veli adı, no veya tel ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sınıf Seçim Dropdown */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
            >
              <option value="">Tüm Sınıflar (Seçim Yapılmadı)</option>
              {allClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls} Sınıfı ({classBreakdownMap[cls]?.total || 0} Veli)
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => { fetchStats(); fetchConsentList(); }}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer bg-white"
              title="Yenile"
            >
              <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── DURUM A: SINIF SEÇİLMEMİŞ VE ARAMA YAPILMAMIŞSA (KOMPAKT SINIF KARTLARI) ── */}
        {!showTable && (
          <div className="p-3.5 sm:p-4">
            {loadingList ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 size={20} className="animate-spin text-indigo-600" />
                Sınıflar yükleniyor...
              </div>
            ) : allClasses.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Sistemde kayıtlı sınıf veya veli bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {allClasses.map((cls) => {
                  const b = classBreakdownMap[cls] || { total: 0, accepted: 0, declined: 0, pending: 0 };
                  const percent = b.total > 0 ? Math.round((b.accepted / b.total) * 100) : 0;

                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className="group flex flex-col justify-between p-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/20 hover:shadow-xs transition text-left cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 truncate">
                          {cls}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                          {b.total} Veli
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className={percent > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400 font-medium'}>
                          %{percent} Onay
                        </span>
                        {/* Mini Onay Çubuğu */}
                        <div className="w-10 bg-slate-100 rounded-full h-1 overflow-hidden flex shrink-0">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${(b.accepted / (b.total || 1)) * 100}%` }}
                            title={`${b.accepted} Onaylı`}
                          />
                          <div
                            className="bg-rose-500 h-full"
                            style={{ width: `${(b.declined / (b.total || 1)) * 100}%` }}
                            title={`${b.declined} Reddedildi`}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── DURUM B: BİR SINIF SEÇİLDİĞİNDE VEYA ARAMA YAPILDIĞINDA (TABLO GÖRÜNÜMÜ) ── */}
        {showTable && (
          <div>
            {/* Sınıf / Arama Eylem ve Özet Başlığı */}
            <div className="p-4 bg-indigo-50/50 border-b border-indigo-100/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-indigo-900 bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <GraduationCap size={15} />
                  {selectedClass ? `${selectedClass} Sınıfı` : 'Arama Sonuçları'}
                </span>
                <span className="text-xs text-slate-600 font-semibold">
                  Toplam {filteredStudentGroups.length} Öğrenci ({totalFilteredContacts} Veli) Gösteriliyor
                </span>
              </div>

              {/* Sınıf Eylem Butonları */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedClass && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePrintClassPdf}
                      disabled={downloadingClassPdf}
                      leftIcon={downloadingClassPdf ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
                      className="text-xs h-8 text-indigo-700 border-indigo-200 bg-white hover:bg-indigo-50 font-bold"
                    >
                      {downloadingClassPdf ? 'Hazırlanıyor...' : 'Sınıf Formlarını Yazdır (PDF)'}
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleBatchSendToPendingInClass}
                      disabled={batchSending}
                      leftIcon={batchSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 font-bold"
                      title={`${selectedClass} sınıfındaki onay bekleyen velilere WhatsApp ve web linki gönderir`}
                    >
                      {batchSending ? 'Gönderiliyor...' : 'Bekleyenlere Onay İste'}
                    </Button>
                  </>
                )}

                {/* Filtre Butonları */}
                <div className="flex items-center gap-1 text-xs bg-white p-1 rounded-lg border border-slate-200">
                  {(['ALL', 'ACCEPTED', 'DECLINED', 'PENDING'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
                        statusFilter === st
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'ALL' && 'Tümü'}
                      {st === 'ACCEPTED' && 'Onaylılar'}
                      {st === 'DECLINED' && 'Reddedenler'}
                      {st === 'PENDING' && 'Bekleyenler'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => { setSelectedClass(''); setSearchTerm(''); }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                  title="Sınıf seçiminden çıkıp sınıf kartlarına dön"
                >
                  ✖️ Sınıf Değiştir
                </button>
              </div>
            </div>

            {/* Öğrenci Tablosu */}
            <div className="overflow-x-auto max-h-[600px]">
              {filteredStudentGroups.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Bu filtre kriterine uygun öğrenci veya veli bulunamadı.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 w-[26%]">Öğrenci</th>
                      <th className="px-4 py-3 w-[26%]">Veli Bilgileri</th>
                      <th className="px-3 py-3 text-center w-[16%]">WhatsApp İletişim İzni</th>
                      <th className="px-3 py-3 text-center w-[12%]">Kaynak</th>
                      <th className="px-4 py-3 text-right w-[20%]">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {filteredStudentGroups.map((group, groupIdx) => {
                      const contacts = group.contacts;
                      const isMulti = contacts.length > 1;

                      return contacts.map((contact, contactIdx) => {
                        const isFirst = contactIdx === 0;

                        return (
                          <tr
                            key={contact.contactId}
                            className={`hover:bg-slate-50/70 transition ${
                              isFirst && groupIdx > 0
                                ? 'border-t-2 border-slate-200/90'
                                : isFirst
                                  ? ''
                                  : 'border-t border-dashed border-slate-200/80 bg-slate-50/20'
                            }`}
                          >
                            {/* Öğrenci Hücresi - İki velisi olsa bile TEK görünür */}
                            {isFirst && (
                              <td
                                rowSpan={contacts.length}
                                className="px-4 py-3 align-top bg-white border-r border-slate-100"
                              >
                                <div>
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                    {group.student ? group.student.fullName : 'Öğrenci eşleşmedi'}
                                  </div>
                                  {group.student && (
                                    <div className="text-[11px] text-slate-500 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                                      <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-bold">
                                        {group.student.className}
                                      </span>
                                      <span className="font-mono text-slate-700">
                                        No: {group.student.schoolNumber}
                                      </span>
                                      {isMulti && (
                                        <span className="text-[10px] text-indigo-700 bg-indigo-50/90 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                                          {contacts.length} Veli
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Veli Bilgileri */}
                            <td className="px-4 py-2.5">
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <span>{contact.parentName}</span>
                                {contact.relation && contact.relation !== 'Veli' && !contact.relation.includes('İçe Aktarıldı') && (
                                  <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-1.5 py-0.5 rounded">
                                    {contact.relation}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                {contact.phone}
                              </div>
                            </td>

                            {/* WhatsApp İletişim İzni */}
                            <td className="px-3 py-2.5 text-center">
                              {contact.waConsentStatus === 'ACCEPTED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✅ Onaylı
                                </span>
                              )}
                              {contact.waConsentStatus === 'DECLINED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  ❌ Reddedildi
                                </span>
                              )}
                              {contact.waConsentStatus === 'PENDING' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  ⏳ Bekliyor
                                </span>
                              )}
                            </td>

                            {/* Kaynak */}
                            <td className="px-3 py-2.5 text-center text-[11px]">
                              {contact.consentSource === 'WEB' ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingLogContact(contact)}
                                  className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition cursor-pointer shadow-2xs"
                                  title="İşlem tarihi, IP ve cihaz güvenlik kaydını görüntüle"
                                >
                                  <ShieldCheck size={12} className="text-indigo-600" />
                                  <span>WEB (E-Onay)</span>
                                </button>
                              ) : contact.consentSource ? (
                                <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {contact.consentSource}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* İşlemler */}
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Manuel Düzenle */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedContact({
                                      ...contact,
                                      studentName: group.student?.fullName,
                                      className: group.student?.className,
                                      schoolNumber: group.student?.schoolNumber,
                                    });
                                    setIsModalOpen(true);
                                  }}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer flex items-center gap-1"
                                  title="Onay durumunu elle değiştir"
                                >
                                  <Edit3 size={13} className="text-slate-500" />
                                  <span>Düzenle</span>
                                </button>

                                {/* 2 Sayfalık Form Yazdır */}
                                <button
                                  type="button"
                                  onClick={() => handlePrintSinglePdf(contact)}
                                  className="px-2 py-1 text-xs font-semibold rounded border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1"
                                  title="Resmi KVKK Onay Formunu Yazdır"
                                >
                                  <Printer size={13} />
                                  <span>Yazdır</span>
                                </button>

                                {/* WhatsApp'tan Onay İste (Web linkli) */}
                                {contact.waConsentStatus !== 'ACCEPTED' && contact.parentId && (
                                  <button
                                    type="button"
                                    onClick={() => handleSendConsentFromTable(contact)}
                                    className="px-2 py-1 text-xs font-semibold rounded transition flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                    title="WhatsApp ve Web Onay Linki Gönder (alizmtal-wp-onay.web.app)"
                                  >
                                    <Send size={13} />
                                    <span>Onay İste</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manuel Onay Modalı */}
      <ManualConsentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedContact(null); }}
        contact={selectedContact}
        onSuccess={() => { fetchConsentList(); fetchStats(); }}
      />

      {/* Dijital Onay ve Güvenlik Log Modalı */}
      <DigitalConsentLogModal
        isOpen={Boolean(viewingLogContact)}
        onClose={() => setViewingLogContact(null)}
        contact={viewingLogContact}
        onPrintPdf={handlePrintSinglePdf}
      />


    </div>
  );
}
