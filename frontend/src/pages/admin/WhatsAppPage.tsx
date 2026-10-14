import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { 
  MessageCircle, 
  Link as LinkIcon, 
  Unlink, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  Info, 
  Loader2, 
  AlertTriangle,
  Save,
  RotateCcw,
  Eye,
  ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'reconnecting' | 'connected';

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  error: string | null;
}

const STATUS_LABELS: Record<WAStatus, string> = {
  disconnected: 'Bağlı Değil',
  connecting: 'Bağlanıyor...',
  reconnecting: 'Yeniden Bağlanıyor...',
  qr: 'QR Kod Bekleniyor',
  connected: 'Bağlı (Aktif)',
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

  `🚨 *ÖĞRENCİ DEVAMSIZLIK SON ÇAĞRI VE BİLGİLENDİRME*
_(3. Yasal Eşik Bildirimi)_

Sayın Velimiz,

Öğrencimiz *{{ogrenciAdi}}*'nın devamsızlık durumu yönetmelikte belirtilen nihai sınır seviyesine ulaşmıştır:

▫️ *Özürsüz Devamsızlık:* {{ozursuzGun}} Gün
▫️ *Özürlü (İzin/Rapor):* {{ozurluGun}} Gün
▫️ *Toplam Devamsızlık:* {{toplamGun}} Gün

🔴 *Önemli Bilgilendirme:* Öğrencimizin başarısız sayılmaması için okul idaremiz ile derhal irtibata geçmeniz, varsa geçerli mazeret ve sağlık raporlarını ivedilikle idareye ulaştırmanız gerekmektedir.

Gereğini önemle rica ederiz.

Saygılarımızla,
*{{okulAdi}} MÜDÜRLÜĞÜ*`
];

const TEMPLATE_META = [
  { level: 1, title: '1. Seviye Uyarı Şablonu', defaultDays: '5 Gün' },
  { level: 2, title: '2. Seviye Uyarı Şablonu', defaultDays: '15 Gün' },
  { level: 3, title: '3. Seviye Uyarı Şablonu', defaultDays: '25 Gün' },
];

export default function WhatsAppPage() {
  const { confirm, confirmModal } = useConfirm();
  const [waState, setWaState] = useState<WAState>({
    status: 'disconnected',
    qrBase64: null,
    error: null,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  // Şablon yönetimi state'leri
  const [templates, setTemplates] = useState<string[]>(['', '', '']);
  const [activeTemplateTab, setActiveTemplateTab] = useState<number>(0);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [schoolName, setSchoolName] = useState('Okul');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaState(res.data?.data || { status: 'disconnected', qrBase64: null, error: null });
    } catch {
      // sessizce geç
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/settings');
      const d = res.data?.data;
      if (d) {
        setTemplates([
          d.waTemplate1 || DEFAULT_TEMPLATES[0],
          d.waTemplate2 || DEFAULT_TEMPLATES[1],
          d.waTemplate3 || DEFAULT_TEMPLATES[2]
        ]);
        if (d.schoolName) setSchoolName(d.schoolName);
      }
    } catch {
      // sessizce geç
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchTemplates();
    const iv = setInterval(fetchStatus, 3000);
    pollIntervalRef.current = iv;
    return () => clearInterval(iv);
  }, []);

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      await api.post('/whatsapp/connect');
      toast.success('Bağlantı başlatılıyor, QR kod bekleniyor...');
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
      toast.success('WhatsApp bağlantısı kesildi.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bağlantı kesilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

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

  const handleResetToDefault = (idx: number) => {
    const next = [...templates];
    next[idx] = DEFAULT_TEMPLATES[idx];
    setTemplates(next);
    toast.success('MEB standart mesaj metni şablona aktarıldı.');
  };

  const handleInsertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = templates[activeTemplateTab];
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const next = [...templates];
    next[activeTemplateTab] = before + tag + after;
    setTemplates(next);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Dinamik etiket butonları
  const TAG_BUTTONS = [
    { tag: '{{ogrenciAdi}}', label: 'Öğrenci Adı Soyadı' },
    { tag: '{{ozursuzGun}}', label: 'Özürsüz Gün' },
    { tag: '{{ozurluGun}}', label: 'Özürlü Gün' },
    { tag: '{{toplamGun}}', label: 'Toplam Gün' },
    { tag: '{{okulAdi}}', label: 'Okul Adı' },
  ];

  // Canlı WhatsApp önizlemesi simülasyonu
  const currentTemplate = templates[activeTemplateTab] || DEFAULT_TEMPLATES[activeTemplateTab];
  const livePreview = currentTemplate
    .replace(/\{\{ogrenciAdi\}\}/g, 'Ahmet YILMAZ')
    .replace(/\{\{ozursuzGun\}\}/g, '4.5')
    .replace(/\{\{ozurluGun\}\}/g, '2.0')
    .replace(/\{\{toplamGun\}\}/g, '6.5')
    .replace(/\{\{okulAdi\}\}\s*(?:Müdürlüğü|MÜDÜRLÜĞÜ|müdürlüğü)/gi, `${schoolName} MÜDÜRLÜĞÜ`)
    .replace(/\{\{okulAdi\}\}/g, schoolName);

  const statusColors = {
    disconnected: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: <MessageCircle size={24} className="text-slate-400"/> },
    connecting:   { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <Loader2 size={24} className="text-amber-500 animate-spin"/> },
    reconnecting: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <Loader2 size={24} className="text-blue-500 animate-spin"/> },
    qr:           { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: <QrCode size={24} className="text-indigo-600"/> },
    connected:    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 size={24} className="text-emerald-600"/> },
  };

  const currentTheme = statusColors[waState.status];

  return (
    <div className="space-y-6">
      {confirmModal}

      <PageHeader
        title="WhatsApp Bağlantısı ve Mesaj Yönetimi"
        description="Kurumsal WhatsApp hesabınızı bağlayarak velilere anlık devamsızlık uyarıları ve resmi okul bildirimleri gönderin."
        icon={<MessageCircle size={28} className="text-emerald-600" />}
      />

      {/* ── BAĞLANTI DURUM KARTI ── */}
      <div className={`rounded-xl border ${currentTheme.border} ${currentTheme.bg} p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors duration-300`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-2xs border border-slate-100">
            {currentTheme.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black ${currentTheme.text}`}>{STATUS_LABELS[waState.status]}</span>
              {waState.status === 'connected' && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {waState.status === 'connected'
                ? 'Okul kurumsal hattı devrede. Devamsızlık ve uyarı mektuplarını tek tıkla velilere gönderebilirsiniz.'
                : waState.status === 'qr'
                ? 'Lütfen aşağıdaki QR kodu WhatsApp uygulamanızla okutun.'
                : 'WhatsApp bildirimlerini gönderebilmek için kurumsal hattınızı bağlayın.'}
            </p>
            {waState.error && (
              <div className="text-rose-600 text-xs mt-1.5 font-semibold flex items-center gap-1">
                <AlertTriangle size={14}/> {waState.error}
              </div>
            )}
          </div>
        </div>
        
        <div className="shrink-0">
          {waState.status === 'disconnected' && (
            <Button 
              variant="primary"
              onClick={handleConnect}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs h-10 px-5 shadow-sm"
            >
              {actionLoading ? <><Loader2 size={16} className="animate-spin"/> Başlatılıyor...</> : <><LinkIcon size={16}/> WhatsApp'a Bağlan</>}
            </Button>
          )}
          {waState.status !== 'disconnected' && (
            <Button 
              variant="danger"
              onClick={handleDisconnect}
              disabled={actionLoading}
              className="font-bold text-xs h-10 px-5 shadow-sm"
            >
              {actionLoading ? <><Loader2 size={16} className="animate-spin"/> Bekleyin...</> : <><Unlink size={16}/> Bağlantıyı Kes</>}
            </Button>
          )}
        </div>
      </div>

      {/* ── QR KOD EKRANI (Bekleniyorsa) ── */}
      {waState.status === 'qr' && waState.qrBase64 && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-indigo-100 shrink-0">
            <img 
              className="w-64 h-64 object-contain" 
              src={waState.qrBase64}
              alt="WhatsApp QR Kodu"
            />
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <Loader2 size={13} className="animate-spin text-indigo-600"/> QR kod otomatik yenilenir
            </div>
          </div>

          <div className="max-w-md space-y-3.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <QrCode size={14} /> Eşleştirme Adımları
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Telefonunuzdan WhatsApp QR Kodunu Okutun
            </h3>
            <ol className="space-y-2.5 text-xs text-slate-600 list-decimal list-inside leading-relaxed">
              <li>Telefonunuzda WhatsApp uygulamasını açın.</li>
              <li>Menüden veya Ayarlardan <strong>Bağlı Cihazlar</strong> seçeneğine dokunun.</li>
              <li><strong>Cihaz Bağla</strong> butonuna basıp kameranızı soldaki karekoda yöneltin.</li>
              <li>Eşleşme tamamlandığında bu ekran otomatik olarak <strong>Bağlı</strong> durumuna geçecektir.</li>
            </ol>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex gap-2">
              <Smartphone size={16} className="shrink-0 mt-0.5 text-amber-600"/>
              <span>Oturum bilgisi bilgisayarınızda güvenle saklanır. Uygulamayı yeniden açtığınızda otomatik bağlanır.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MESAJ ŞABLONLARI PANELİ ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <MessageCircle size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                WhatsApp Devamsızlık Bildirim Şablonları
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Velilere iletilen devamsızlık uyarı ve bilgilendirme metinlerini kurumunuza uygun şekilde özelleştirin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleResetToDefault(activeTemplateTab)}
              leftIcon={<RotateCcw size={13} />}
              className="text-xs h-8 bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              title="Bu seviye için MEB resmi standart metnini yükle"
            >
              Önerilen Metni Getir
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={templateSaving}
              onClick={handleSaveTemplates}
              leftIcon={templateSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              className="text-xs font-bold h-8 px-4 bg-emerald-600 hover:bg-emerald-700"
            >
              {templateSaving ? 'Kaydediliyor...' : 'Şablonları Kaydet'}
            </Button>
          </div>
        </div>

        {/* Şablon Sekmeleri */}
        <div className="border-b border-slate-200 bg-slate-100/50 px-4 pt-3 flex flex-wrap gap-2">
          {TEMPLATE_META.map((meta, idx) => {
            const isActive = activeTemplateTab === idx;
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
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {meta.defaultDays}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Dinamik Değişken Butonları */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚡</span> Metne Eklenebilir Dinamik Alanlar (Tıklayarak Ekleyin):
              </span>
              <span className="text-[11px] text-slate-500">
                Gönderim sırasında öğrencinin gerçek verileriyle otomatik doldurulur.
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TAG_BUTTONS.map((p) => (
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* Sol: Metin Düzenleyici */}
            <div className="lg:col-span-7 flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Şablon Metni Düzenleyici
                </span>
                <span className="text-[11px] text-slate-400">
                  {currentTemplate.length} karakter
                </span>
              </div>
              <textarea
                ref={textareaRef}
                rows={14}
                value={templates[activeTemplateTab]}
                onChange={e => {
                  const next = [...templates];
                  next[activeTemplateTab] = e.target.value;
                  setTemplates(next);
                }}
                placeholder="Şablon metnini buraya yazın..."
                className="w-full p-3.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition leading-relaxed resize-y placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-500">
                * *Kalın yazı* için kelimenin başına ve sonuna yıldız ekleyin. _İtalik_ için alt çizgi ekleyin.
              </p>
            </div>

            {/* Sağ: Canlı WhatsApp Mesaj Balonu Önizlemesi */}
            <div className="lg:col-span-5 flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Eye size={13} className="text-emerald-600" /> Veli Ekranı Canlı Önizlemesi
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  WhatsApp Görünümü
                </span>
              </div>

              {/* WhatsApp Sohbet Balonu Tasarımı */}
              <div className="flex-1 min-h-[300px] bg-[#EFEAE2] rounded-xl p-4 border border-slate-200 flex flex-col justify-start relative overflow-hidden shadow-inner">
                <div className="bg-white rounded-lg rounded-tl-none p-3.5 shadow-sm max-w-full text-xs text-slate-900 border border-emerald-100 relative whitespace-pre-wrap leading-relaxed font-sans">
                  {livePreview}

                  <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                    <span>10:30</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 text-center">
                  <span className="text-[10px] text-slate-500 bg-white/90 px-3 py-1 rounded-full shadow-2xs border border-slate-200">
                    🔒 Uçtan uca şifreli resmi okul bildirimi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── NASIL ÇALIŞIR & SİSTEM REHBERİ ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase">
            <Info size={16} /> Devamsızlık Mektubu Gönderimi
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Devamsızlık Mektubu</strong> menüsünden veli seçip "📱 WhatsApp Gönder" butonuna bastığınızda, sistem öğrenciye ait mektubu renkli ve mühürlü <strong>PDF belgesi</strong> olarak oluşturup velinin WhatsApp hattına anında iletir.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase">
            <CheckCircle2 size={16} /> KVKK Onay Güvencesi
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            WhatsApp mesajları yalnızca açık rızası bulunan velilere gönderilebilir. Onay durumu <strong>"Bekliyor"</strong> veya <strong>"Reddedildi"</strong> olan velilere sistem üzerinden kazaen mesaj gönderimi otomatik olarak engellenir.
          </p>
        </div>
      </div>
    </div>
  );
}
