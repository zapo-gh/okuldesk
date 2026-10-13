import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { 
  MessageCircle, 
  Link, 
  Unlink, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  Info, 
  Loader2, 
  AlertTriangle,
  Download,
  Upload,
  FileSpreadsheet,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  Users,
  RotateCcw,
  Save,
  Copy,
  Eye
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'reconnecting' | 'connected';

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  error: string | null;
}

interface ConsentStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
}

interface ConsentPreviewItem {
  rowNum: number;
  phone: string;
  parentName?: string;
  studentName?: string;
  matched: boolean;
  oldStatus: string;
  newStatus: 'ACCEPTED' | 'DECLINED' | 'PENDING';
}

const STATUS_LABELS: Record<WAStatus, string> = {
  disconnected: 'Bağlı Değil',
  connecting: 'Bağlanıyor...',
  reconnecting: 'Yeniden Bağlanıyor...',
  qr: 'QR Kod Bekleniyor',
  connected: 'Bağlı',
};

// Projenin ruhuna ve MEB mevzuatına uygun zengin şablonlar
const DEFAULT_TEMPLATES = [
  `📩 *ÖĞRENCİ DEVAMSIZLIK BİLGİLENDİRMESİ*
_(1. Uyarı Bildirimi)_

Sayın Velimiz,

Okulumuz *{{okulAdi}}* bünyesinde öğrenim gören öğrencimiz *{{ogrenciAdi}}*'nın güncel devamsızlık durumu aşağıda bilgilerinize sunulmuştur:

▫️ *Özürsüz Devamsızlık:* {{ozursuzGun}} Gün
▫️ *Özürlü (İzin/Rapor):* {{ozurluGun}} Gün
▫️ *Toplam Devamsızlık:* {{toplamGun}} Gün

Milli Eğitim Bakanlığı mevzuatı gereği öğrencimizin devamsızlık sınırlarını aşmaması ve ders başarısının olumsuz etkilenmemesi adına okula düzenli devamının sağlanmasını önemle rica ederiz.

📌 *Not:* Detaylı devamsızlık mektubu ve ilgili belgeler okul idaremiz tarafından resmi kayıt altına alınmıştır.

Saygılarımızla,
*{{okulAdi}} MÜDÜRLÜĞÜ*`,

  `⚠️ *ÖĞRENCİ DEVAMSIZLIK UYARISI*
_(2. Kritik Seviye Uyarısı)_

Sayın Velimiz,

Öğrencimiz *{{ogrenciAdi}}*'nın devamsızlık süresi yasal sınır eşiğine yaklaşmış bulunmaktadır:

▫️ *Özürsüz Devamsızlık:* {{ozursuzGun}} Gün
▫️ *Özürlü (İzin/Rapor):* {{ozurluGun}} Gün
▫️ *Toplam Devamsızlık:* {{toplamGun}} Gün

⚠️ *Yasal Hatırlatma:* MEB Ortaöğretim Kurumları Yönetmeliği uyarınca; özürsüz devamsızlığı 10 günü veya toplam devamsızlığı 30 günü aşan öğrenciler, ders puanlarına bakılmaksızın başarısız sayılarak sınıf tekrarına kalmaktadır.

Öğrencimizin eğitim hakkının kesintiye uğramaması adına devamsızlık durumunun ivedilikle takip edilmesini ve mazeret belgelerinin (varsa sevk/rapor) süresi içerisinde okul idaremize teslim edilmesini rica ederiz.

Saygılarımızla,
*{{okulAdi}} MÜDÜRLÜĞÜ*`,

  `🚨 *ÖNEMLİ VE ACİL: DEVAMSIZLIK SON UYARISI*
_(3. Uyarı - Yasal Sınır Eşiği Bildirimi)_

Sayın Velimiz,

Öğrencimiz *{{ogrenciAdi}}*'nın devamsızlığı kritik yasal sınır aşamasına ulaşmıştır:

▫️ *Özürsüz Devamsızlık:* {{ozursuzGun}} Gün
▫️ *Özürlü (İzin/Rapor):* {{ozurluGun}} Gün
▫️ *Toplam Devamsızlık:* {{toplamGun}} Gün

🛑 *DİKKAT:* MEB mevzuatına göre özürsüz 10 gün veya toplam 30 gün devamsızlık sınırının aşılması durumunda öğrencinin doğrudan sınıf tekrarına kalacağını, daha önce sınıf tekrarı yapmış olması hâlinde ise örgün eğitim dışına çıkarılacağını önemle hatırlatırız.

Öğrencimizin durumunu görüşmek ve gerekli yasal süreçleri tamamlamak üzere en kısa sürede okulumuz ilgili müdür yardımcılığı ile görüşmeniz gerekmektedir.

Saygılarımızla,
*{{okulAdi}} MÜDÜRLÜĞÜ*`
];

const TEMPLATE_META = [
  { level: 1, title: '1. Uyarı Şablonu', badge: 'Bilgilendirme Seviyesi', color: 'indigo' },
  { level: 2, title: '2. Uyarı Şablonu', badge: 'Kritik Eşik Uyarısı', color: 'amber' },
  { level: 3, title: '3. Uyarı Şablonu', badge: 'Son Çağrı / Yasal Sınır', color: 'rose' },
];

const PLACEHOLDERS = [
  { tag: '{{ogrenciAdi}}', label: 'Öğrenci Adı Soyadı' },
  { tag: '{{ozursuzGun}}', label: 'Özürsüz Gün' },
  { tag: '{{ozurluGun}}', label: 'Özürlü Gün' },
  { tag: '{{toplamGun}}', label: 'Toplam Gün' },
  { tag: '{{okulAdi}}', label: 'Okul Adı' },
  { tag: '{{uyariNo}}', label: 'Uyarı Numarası' },
];

export default function WhatsAppPage() {
  const { confirm, confirmModal } = useConfirm();
  const [waState, setWaState] = useState<WAState>({ status: 'disconnected', qrBase64: null, error: null });
  const [actionLoading, setActionLoading] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Onay İstatistikleri ve Excel İşlemleri
  const [stats, setStats] = useState<ConsentStats>({ total: 0, accepted: 0, declined: 0, pending: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [exporting, setExporting] = useState(false);

  // İçe Aktarma Modalı Durumu
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    totalParsed: number;
    matched: number;
    unmatched: number;
    preview: ConsentPreviewItem[];
  } | null>(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── WhatsApp Mesaj Şablonları Durumu ──
  const [activeTemplateTab, setActiveTemplateTab] = useState<number>(0);
  const [templates, setTemplates] = useState<string[]>(['', '', '']);
  const [schoolName, setSchoolName] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaState(res.data.data);
    } catch { /* ignore */ }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/whatsapp/consents/stats');
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch {
      // sessizce geç
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/settings');
      const d = res.data?.data;
      if (d) {
        setTemplates([d.waTemplate1 || '', d.waTemplate2 || '', d.waTemplate3 || '']);
        if (d.schoolName) setSchoolName(d.schoolName);
      }
    } catch {
      // sessizce geç
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchStats();
    fetchTemplates();
    const iv = setInterval(fetchStatus, 3000);
    pollIntervalRef.current = iv;
    return () => clearInterval(iv);
  }, []);

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      await api.post('/whatsapp/connect');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bağlantı başlatılamadı.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!await confirm('WhatsApp oturumunu kapatmak istediğinize emin misiniz? Yeniden bağlanmak için QR kodu tekrar okutmanız gerekir.')) return;
    setActionLoading(true);
    try {
      await api.post('/whatsapp/disconnect');
      setWaState({ status: 'disconnected', qrBase64: null, error: null });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bağlantı kesilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportConsents = async () => {
    setExporting(true);
    try {
      const res = await api.get('/whatsapp/consents/export', { responseType: 'blob' });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WhatsApp_Iletisim_Onay_Listesi_${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('WhatsApp onay listesi Excel olarak indirildi.');
    } catch (err: any) {
      toast.error('Onay listesi indirilirken bir hata oluştu.');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError('');
    setImportPreview(null);
    setImportLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/whatsapp/consents/import?mode=preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportPreview(res.data?.data);
    } catch (err: any) {
      setImportError(err?.response?.data?.message || 'Excel dosyası okunamadı.');
      setImportPreview(null);
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportError('');

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post('/whatsapp/consents/import?mode=import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data?.data;
      toast.success(`Onaylar güncellendi: ${data?.updated || 0} veli onay durumu başarıyla işlendi.`);
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
      fetchStats();
    } catch (err: any) {
      setImportError(err?.response?.data?.message || 'İçe aktarma işlemi başarısız oldu.');
    } finally {
      setImportLoading(false);
    }
  };

  // ── Şablon Kaydetme ve Yönetim Fonksiyonları ──
  const handleSaveTemplates = async () => {
    setTemplateSaving(true);
    try {
      await api.put('/settings', {
        waTemplate1: templates[0],
        waTemplate2: templates[1],
        waTemplate3: templates[2],
      });
      toast.success('WhatsApp mesaj şablonları başarıyla kaydedildi.');
    } catch {
      toast.error('Şablonlar kaydedilirken bir hata oluştu.');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    const currentText = templates[activeTemplateTab] || '';
    if (!textarea) {
      const next = [...templates];
      next[activeTemplateTab] = currentText + tag;
      setTemplates(next);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const updated = currentText.substring(0, start) + tag + currentText.substring(end);
    const next = [...templates];
    next[activeTemplateTab] = updated;
    setTemplates(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleLoadDefaultTemplate = () => {
    const next = [...templates];
    next[activeTemplateTab] = DEFAULT_TEMPLATES[activeTemplateTab];
    setTemplates(next);
    toast.success(`${activeTemplateTab + 1}. Uyarı için önerilen varsayılan metin yüklendi.`);
  };

  const handleClearTemplate = () => {
    const next = [...templates];
    next[activeTemplateTab] = '';
    setTemplates(next);
    toast('Şablon temizlendi. Sistem otomatik varsayılan metni kullanacaktır.');
  };

  const formatSchoolClosing = (name: string) => {
    const clean = (name || '').trim();
    if (!clean) return 'Okul Müdürlüğü';
    if (/müdürlüğü$/i.test(clean)) return clean;
    const isUpper = clean === clean.toLocaleUpperCase('tr-TR');
    return isUpper ? `${clean} MÜDÜRLÜĞÜ` : `${clean} Müdürlüğü`;
  };

  // Canlı WhatsApp önizleme metni oluştur
  const currentDisplayText = templates[activeTemplateTab] || DEFAULT_TEMPLATES[activeTemplateTab];
  const effectiveSchool = schoolName || 'Atatürk Anadolu Lisesi';
  const closingName = formatSchoolClosing(effectiveSchool);

  const livePreview = currentDisplayText
    .replace(/\{\{ogrenciAdi\}\}/g, 'Ali YILMAZ')
    .replace(/\{\{ozursuzGun\}\}/g, activeTemplateTab === 0 ? '5.5' : activeTemplateTab === 1 ? '8.5' : '10.5')
    .replace(/\{\{ozurluGun\}\}/g, '3.0')
    .replace(/\{\{toplamGun\}\}/g, activeTemplateTab === 0 ? '8.5' : activeTemplateTab === 1 ? '11.5' : '13.5')
    .replace(/\{\{okulAdi\}\}\s*(?:Müdürlüğü|MÜDÜRLÜĞÜ|müdürlüğü)/gi, closingName)
    .replace(/\{\{okulAdi\}\}/g, effectiveSchool)
    .replace(/\{\{uyariNo\}\}/g, String(activeTemplateTab + 1));

  const statusColors: Record<WAStatus, { bg: string, border: string, text: string, icon: React.ReactNode }> = {
    disconnected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: <Unlink size={24} className="text-red-500"/> },
    connecting:   { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <Loader2 size={24} className="text-amber-500 animate-spin"/> },
    reconnecting: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <Loader2 size={24} className="text-blue-500 animate-spin"/> },
    qr:           { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <QrCode size={24} className="text-blue-500"/> },
    connected:    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: <CheckCircle2 size={24} className="text-green-500"/> },
  };

  const currentTheme = statusColors[waState.status];

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Entegrasyonu"
        description="Okul WhatsApp hesabını bağlayarak velilere otomatik PDF belge, mesaj ve yasal uyarılar gönderin."
        icon={<MessageCircle size={28} />}
      />

      {/* Durum Kartı */}
      <div className={`rounded-xl border ${currentTheme.border} ${currentTheme.bg} p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors duration-300`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-full shadow-sm">
            {currentTheme.icon}
          </div>
          <div>
            <div className={`text-xl font-bold ${currentTheme.text}`}>{STATUS_LABELS[waState.status]}</div>
            {waState.error && <div className="text-red-500 text-sm mt-1 font-semibold flex items-center gap-1"><AlertTriangle size={14}/> {waState.error}</div>}
          </div>
        </div>
        
        <div>
          {(waState.status === 'disconnected') && (
            <Button 
              variant="primary"
              onClick={handleConnect}
              disabled={actionLoading}
            >
              {actionLoading ? <><Loader2 size={18} className="animate-spin"/> Başlatılıyor...</> : <><Link size={18}/> Bağlan</>}
            </Button>
          )}
          {(waState.status !== 'disconnected') && (
            <Button 
              variant="danger"
              onClick={handleDisconnect}
              disabled={actionLoading}
            >
              {actionLoading ? <><Loader2 size={18} className="animate-spin"/> Bekleyin...</> : <><Unlink size={18}/> İptal / Kapat</>}
            </Button>
          )}
        </div>
      </div>

      {/* ── 1. BÖLÜM: WHATSAPP MESAJ ŞABLONLARI ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <MessageCircle size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                WhatsApp Mesaj Şablonları
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Velilere iletilen devamsızlık uyarı ve bilgilendirme metinlerini kurumunuza uygun şekilde özelleştirin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={templateSaving}
              onClick={handleSaveTemplates}
              leftIcon={templateSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              className="text-xs font-bold h-8 px-4"
            >
              {templateSaving ? 'Kaydediliyor...' : 'Şablonları Kaydet'}
            </Button>
          </div>
        </div>

        {/* Şablon Sekmeleri */}
        <div className="border-b border-slate-200 bg-slate-100/50 px-4 pt-3 flex flex-wrap gap-2">
          {TEMPLATE_META.map((meta, idx) => {
            const isActive = activeTemplateTab === idx;
            const hasCustom = !!templates[idx]?.trim();
            return (
              <button
                key={meta.level}
                type="button"
                onClick={() => setActiveTemplateTab(idx)}
                className={`px-3.5 py-2 rounded-t-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer border-t border-x ${
                  isActive
                    ? 'bg-white text-indigo-700 border-slate-200 border-b-white -mb-px shadow-2xs'
                    : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>{meta.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {hasCustom ? 'Özelleştirilmiş' : 'Varsayılan'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Seviye Bilgisi & Hızlı Aksiyonlar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {TEMPLATE_META[activeTemplateTab].title}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-white border border-slate-200 text-slate-600">
                {TEMPLATE_META[activeTemplateTab].badge}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadDefaultTemplate}
                leftIcon={<Copy size={13} />}
                className="text-xs h-7 bg-white text-slate-700 hover:bg-slate-100"
                title="Projenin önerilen resmi MEB mevzuat şablonunu yükler"
              >
                Önerilen Metni Getir
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearTemplate}
                leftIcon={<RotateCcw size={13} />}
                className="text-xs h-7 bg-white text-slate-700 hover:bg-slate-100"
                title="Kutuyu temizler, sistem arka plandaki varsayılan metni kullanır"
              >
                Temizle
              </Button>
            </div>
          </div>

          {/* Dinamik Yer Tutucular (Etiketler) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Info size={13} className="text-indigo-600" /> Kullanılabilir Değişkenler
              </label>
              <span className="text-[11px] text-slate-400">Tıklayarak metne ekleyebilirsiniz</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map(p => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => handleInsertTag(p.tag)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-indigo-700 border border-slate-200 rounded-md font-mono text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
                  title={`${p.label} eklemek için tıklayın`}
                >
                  <span>{p.tag}</span>
                  <span className="text-[10px] text-slate-400 font-sans font-normal">({p.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Editör ve Canlı WhatsApp Önizlemesi (2 Kolon) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Sol: Metin Düzenleyici */}
            <div className="lg:col-span-7 flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Şablon Metni Düzenleyici
                </span>
                <span className="text-[11px] text-slate-400">
                  {templates[activeTemplateTab].length} karakter
                </span>
              </div>
              <textarea
                ref={textareaRef}
                rows={13}
                value={templates[activeTemplateTab]}
                onChange={e => {
                  const next = [...templates];
                  next[activeTemplateTab] = e.target.value;
                  setTemplates(next);
                }}
                placeholder="Bu uyarı seviyesi için sistemin varsayılan resmi metni kullanılacaktır (Metni özelleştirmek için buraya yazabilir veya 'Önerilen Metni Getir' butonuna tıklayabilirsiniz)..."
                className="w-full p-3.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition leading-relaxed resize-y placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-500">
                * *Kalın yazı* için kelimenin başına ve sonuna yıldız ekleyin.
              </p>
            </div>

            {/* Sağ: Canlı WhatsApp Mesaj Balonu Önizlemesi */}
            <div className="lg:col-span-5 flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Eye size={13} className="text-emerald-600" /> Veli Ekranı Önizlemesi
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  WhatsApp Görünümü
                </span>
              </div>

              {/* WhatsApp Sohbet Balonu Tasarımı */}
              <div className="flex-1 min-h-[300px] bg-[#EFEAE2] rounded-xl p-4 border border-slate-200 flex flex-col justify-start relative overflow-hidden shadow-inner">
                {/* Arka plan hafif desen efekti */}
                <div className="bg-white rounded-lg rounded-tl-none p-3.5 shadow-sm max-w-full text-xs text-slate-900 border border-emerald-100 relative whitespace-pre-wrap leading-relaxed font-sans">
                  {livePreview}

                  <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                    <span>12:00</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>

                <div className="mt-auto pt-3 text-center">
                  <span className="text-[10px] text-slate-500 bg-white/80 px-2.5 py-1 rounded-full shadow-2xs">
                    🔒 Uçtan uca şifreli okul bildirimi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. BÖLÜM: VELİ WHATSAPP İLETİŞİM ONAY YÖNETİMİ ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Veli WhatsApp İletişim Onay Yönetimi
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Velilerden alınan onay/ret durumlarını görüntüleyin, Excel olarak yedekleyin veya geri yükleyin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportConsents}
              disabled={exporting}
              leftIcon={exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              className="text-xs h-8 bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              title="Mevcut tüm onayları Excel listesi olarak indirir"
            >
              {exporting ? 'İndiriliyor...' : 'Onay Listesini İndir (Excel)'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setImportFile(null);
                setImportPreview(null);
                setImportError('');
                setShowImportModal(true);
              }}
              leftIcon={<Upload size={14} />}
              className="text-xs h-8 font-semibold"
              title="Önceden yedeklenen veya hazırlanan Excel'den onayları geri yükler"
            >
              Excel'den Geri Yükle
            </Button>

            <button
              type="button"
              onClick={fetchStats}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="İstatistikleri Yenile"
            >
              <RefreshCw size={14} className={loadingStats ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Toplam Veli</span>
                <Users size={14} className="text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.total}</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">Sistemdeki kayıtlı veliler</div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
                <span>Onay Veren</span>
                <CheckCircle2 size={14} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{stats.accepted}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">WhatsApp mesajı alabilir</div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-800 mb-1">
                <span>Reddeden</span>
                <X size={14} className="text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-700">{stats.declined}</div>
              <div className="text-[11px] text-rose-600 font-medium mt-0.5">Mesaj gönderimi kapalı</div>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-800 mb-1">
                <span>Bekleyen</span>
                <AlertTriangle size={14} className="text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700">{stats.pending}</div>
              <div className="text-[11px] text-amber-600 font-medium mt-0.5">Onay isteği bekliyor</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. BÖLÜM: NASIL ÇALIŞIR & QR KOD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Kolon: Bilgi ve Talimatlar */}
        <div className="space-y-6">
          {waState.status === 'disconnected' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Info size={20} className="text-indigo-600" /> Nasıl Çalışır?
                </h3>
              </div>
              <div className="p-6 text-sm text-gray-700">
                <ol className="space-y-4 list-decimal list-inside">
                  <li><strong className="text-gray-900 font-semibold">Bağlan</strong> butonuna tıklayın.</li>
                  <li>QR kod görüntülendiğinde telefonda WhatsApp'ı açın.</li>
                  <li><span className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">Ayarlar → Bağlı Cihazlar → Cihaz Bağla</span> menüsünden ekrandaki QR kodu okutun.</li>
                  <li>Bağlantı kurulduktan sonra <strong className="text-gray-900">Devamsızlık</strong> ve <strong className="text-gray-900">Yazılı Uyarılar</strong> sayfalarında "📱 WhatsApp Gönder" butonları aktif olur.</li>
                  <li>Butona basınca ilgili belge veya mesaj <strong className="text-indigo-600 font-bold">otomatik olarak</strong> velinin telefonuna gönderilir.</li>
                </ol>
                <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 text-xs font-medium flex gap-2">
                  <Smartphone size={16} className="shrink-0"/>
                  Oturum bilgisi kaydedilir. Programı kapatıp açtığınızda otomatik olarak tekrar bağlanır.
                </div>
              </div>
            </div>
          )}

          {waState.status === 'connected' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-green-100 bg-green-50">
                <h3 className="font-bold text-green-900 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-600" /> Bağlantı Aktif
                </h3>
              </div>
              <div className="p-6">
                <p className="text-gray-800 text-sm mb-4 leading-relaxed">
                  WhatsApp hesabınız başarıyla bağlandı. <strong className="font-bold">Devamsızlık</strong> ve <strong className="font-bold">Yazılı Uyarılar</strong> sayfalarındaki
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold text-xs mx-1">
                    <MessageCircle size={12}/> WhatsApp Gönder
                  </span>
                  butonunu kullanarak velilere otomatik mesaj gönderebilirsiniz.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="font-bold text-gray-900 text-xs uppercase mb-1">Devamsızlık Mektupları</div>
                    <div className="text-gray-500 text-xs">Mektup PDF dosyası olarak belge halinde gönderilir.</div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="font-bold text-gray-900 text-xs uppercase mb-1">Yazılı Uyarılar</div>
                    <div className="text-gray-500 text-xs">Şablon dahilinde standart metin mesajı olarak gönderilir.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Kolon: QR Kod (Sadece bekleniyorsa gösterilir) */}
        {waState.status === 'qr' && waState.qrBase64 && (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-4">
              <QrCode size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">QR Kodu Okutun</h3>
            <p className="text-gray-500 text-sm text-center mb-6 max-w-xs">
              Telefonunuzda WhatsApp'ı açın <br/> 
              <strong className="text-gray-700">Ayarlar → Bağlı Cihazlar → Cihaz Bağla</strong>
            </p>
            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <img 
                className="w-64 h-64 object-contain" 
                src={waState.qrBase64}
                alt="WhatsApp QR Kodu"
              />
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-gray-400">
              <Loader2 size={14} className="animate-spin"/> QR kod 60 saniyede bir yenilenir
            </div>
          </div>
        )}
      </div>

      {/* ── ONAY LİSTESİ İÇE AKTARMA (GERİ YÜKLEME) MODALI ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Excel'den WhatsApp Onaylarını Geri Yükle
                  </h3>
                  <p className="text-xs text-slate-500">
                    Önceden indirilen veya hazırlanan onay listesi Excel dosyasını seçin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-400 transition bg-slate-50/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="consent-file-upload"
                />
                <label htmlFor="consent-file-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload size={32} className="text-indigo-600 mb-2" />
                  <span className="text-xs font-bold text-slate-800">
                    {importFile ? importFile.name : 'Excel Dosyası Seçin veya Buraya Sürükleyin'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">.xlsx veya .xls formatı</span>
                </label>
              </div>

              {importError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-600">
                  <Loader2 size={18} className="animate-spin text-indigo-600" />
                  <span>Dosya işleniyor...</span>
                </div>
              )}

              {importPreview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
                    <span>Toplam Okunan: {importPreview.totalParsed}</span>
                    <span className="text-emerald-600">Eşleşen Veli: {importPreview.matched}</span>
                    <span className="text-amber-600">Bulunamayan: {importPreview.unmatched}</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-[11px]">
                      <thead className="bg-slate-50 font-bold text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Telefon</th>
                          <th className="px-3 py-2 text-left">Veli Adı</th>
                          <th className="px-3 py-2 text-center">Eski Durum</th>
                          <th className="px-3 py-2 text-center">Yeni Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {importPreview.preview.map((p, idx) => (
                          <tr key={idx} className={p.matched ? 'hover:bg-slate-50' : 'bg-amber-50/40'}>
                            <td className="px-3 py-1.5 font-mono">{p.phone}</td>
                            <td className="px-3 py-1.5">{p.parentName || p.studentName || '—'}</td>
                            <td className="px-3 py-1.5 text-center text-slate-500">{p.oldStatus}</td>
                            <td className="px-3 py-1.5 text-center font-bold">
                              {p.newStatus === 'ACCEPTED' && <span className="text-emerald-600">ONAYLI</span>}
                              {p.newStatus === 'DECLINED' && <span className="text-rose-600">REDDEDİLDİ</span>}
                              {p.newStatus === 'PENDING' && <span className="text-amber-600">BEKLİYOR</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportModal(false)}
                className="text-xs"
              >
                İptal
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!importPreview || importLoading || importPreview.matched === 0}
                onClick={handleImportConfirm}
                leftIcon={importLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                className="text-xs font-bold"
              >
                Onayları Uygula ({importPreview?.matched || 0} Veli)
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  );
}
