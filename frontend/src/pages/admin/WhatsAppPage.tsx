import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useConfirm } from '../../hooks/useConfirm';
import { useSettings } from '../../context/SettingsContext';
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
  FileText,
  Clock,
  ShieldCheck,
  Scale,
  Sparkles,
  Layers
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { NetworkSettingsCard } from '../../components/NetworkSettingsCard';

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

// ── Varsayılan MEB ve Proje Şablonları ─────────────────────────────────────────

const DEFAULTS = {
  waTemplate1: `📩 *ÖĞRENCİ DEVAMSIZLIK BİLGİLENDİRMESİ*
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

  waTemplate2: `⚠️ *ÖĞRENCİ DEVAMSIZLIK UYARISI*
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

  waTemplate3: `🚨 *ÖNEMLİ VE ACİL: DEVAMSIZLIK SON UYARISI*
_(3. Uyarı - Yasal Sınır Eşiği Bildirimi)_

Sayın Velimiz,

Öğrencimiz *{{ogrenciAdi}}*'nın devamsızlığı kritik yasal sınır aşamasına ulaşmıştır:

▫️ *Özürsüz Devamsızlık:* {{ozursuzGun}} Gün
▫️ *Özürlü (İzin/Rapor):* {{ozurluGun}} Gün
▫️ *Toplam Devamsızlık:* {{toplamGun}} Gün

🛑 *DİKKAT:* MEB mevzuatına göre özürsüz 10 gün veya toplam 30 gün devamsızlık sınırının aşılması durumunda öğrencinin doğrudan sınıf tekrarına kalacağını, daha önce sınıf tekrarı yapmış olması hâlinde ise örgün eğitim dışına çıkarılacağını önemle hatırlatırız.

Öğrencimizin durumunu görüşmek ve gerekli yasal süreçleri tamamlamak üzere en kısa sürede okulumuz ilgili müdür yardımcılığı ile görüşmeniz gerekmektedir.

Saygılarımızla,
*{{okulAdi}} MÜDÜRLÜĞÜ*`,

  waTemplateBep: `*Devamsızlık Mektubu – {{uyariNo}}. Uyarı*

Sayın Velimiz,

Milli Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği'ne göre; tam zamanlı kaynaştırma/bütünleştirme (BEP) yoluyla eğitim alan öğrenciler için özürsüz devamsızlık sınırı 20 gün, toplam devamsızlık sınırı ise 70 gündür.

Öğrenciniz *{{ogrenciAdi}}*'nın devamsızlığı; *{{ozurluGun}} gün özürlü, {{ozursuzGun}} gün özürsüz* olmak üzere *toplam {{toplamGun}} gündür.*

*Özürsüz devamsızlığı 20 günü veya toplam devamsızlığı 70 günü aşan BEP kapsamındaki öğrenciler, ders puanlarına bakılmaksızın başarısız sayılmakta ve sınıf tekrarına kalmaktadır.*

Öğrencinizin okula devamının sağlanması hususunda gereğini rica ederiz.

{{okulAdi}} MÜDÜRLÜĞÜ`,

  waTemplateDaily: `Sayın Velimiz,

{okul_adi} idaresi olarak; {sinif} sınıfı {numara} numaralı öğrencimiz {ogrenci_adi}'in {tarih} tarihinde ({oturum}) okulda bulunmadığı tespit edilmiştir.

Öğrencimizin güvenliği ve eğitim sürecinin aksamaması adına durumu bilgilerinize sunarız.

İletişim: {okul_telefonu}`,

  waTemplateWarningNotice: `📩 *ÖĞRENCİ YAZILI UYARI BİLGİLENDİRMESİ*
_({{uyariNo}}. Yazılı Uyarı / Tutanak)_

Sayın {{veliAdi}},

Okulumuz *{{okulAdi}}* bünyesinde öğrenim gören öğrencimiz *{{ogrenciAdi}}* ({{sinif}} sınıfı, No: {{numara}}) hakkında okul içi kurallar doğrultusunda *{{uyariNo}}. yazılı uyarı tutanağı* düzenlenmiştir.

▫️ *İlgili Davranış:* {{davranis}}
{{aciklama}}
Öğrencimizin okul kurallarına uyumu ve olumlu davranış gelişiminin desteklenmesi adına konunun takibini rica ederiz.

Saygılarımızla,
*{{okulAdi}}*`,

  waTemplateConsentRequest: `🏛️ *T.C. MİLLÎ EĞİTİM BAKANLIĞI*
*{{okulAdi}} MÜDÜRLÜĞÜ*
_Resmi Veli Bilgilendirme ve KVKK Açık Rıza Hattı_

Sayın Velimiz,

Okulumuz, öğrencimizin eğitim-öğretim sürecine ilişkin *devamsızlık bildirimleri, yazılı uyarılar ve resmi okul duyurularını* WhatsApp iletişim hattı üzerinden sizlere doğrudan ve hızlı şekilde iletmek istemektedir.

6698 sayılı KVKK kapsamındaki Aydınlatma Metnini incelemek ve WhatsApp iletişim onay tercihinizi belirlemek için lütfen aşağıdaki güvenli bağlantıyı açınız:

🔗 *Güvenli Mobil Onay Bağlantısı:*
{{onayLinki}}

📌 *Bilgilendirme:* Yukarıdaki bağlantı, okulumuz tarafından öğrenciniz adına üretilmiş şifreli ve güvenli web onay formudur.

Tercihinizi ayrıca dilediğiniz takdirde okul idaremizden temin edebileceğiniz 2 sayfalık matbu formu elden imzalayarak da iletebilirsiniz.

{{okulTelefon}}Saygılarımızla,
*{{okulAdi}} MÜDÜRLÜĞÜ*`
};

type TemplateKey = keyof typeof DEFAULTS;

type MainTab = 'connection' | 'templates';
type TemplateCategory = 'absenteeism' | 'daily' | 'warning' | 'consent';

interface TemplateItemDef {
  key: TemplateKey;
  title: string;
  badge?: string;
  description: string;
  tags: { tag: string; label: string }[];
}

const CATEGORIES: Record<TemplateCategory, {
  title: string;
  shortTitle: string;
  icon: any;
  description: string;
  badge: string;
  items: TemplateItemDef[];
}> = {
  absenteeism: {
    title: 'Devamsızlık Mektupları (MEB Resmi Tebliğleri)',
    shortTitle: 'Devamsızlık Mektubu',
    icon: FileText,
    badge: '4 Şablon',
    description: 'Öğrencinin devamsızlığı 5, 15, 25 güne ulaştığında veya BEP kapsamında olduğunda mektupla birlikte gönderilen metinler.',
    items: [
      {
        key: 'waTemplate1',
        title: '1. Seviye Uyarı',
        badge: '5 Gün Eşiği',
        description: 'Öğrenci 5 gün devamsızlığa ulaştığında veliye iletilen ilk resmi tebliğ metni.',
        tags: [
          { tag: '{{ogrenciAdi}}', label: 'Öğrenci Adı Soyadı' },
          { tag: '{{ozursuzGun}}', label: 'Özürsüz Gün' },
          { tag: '{{ozurluGun}}', label: 'Özürlü Gün' },
          { tag: '{{toplamGun}}', label: 'Toplam Gün' },
          { tag: '{{okulAdi}}', label: 'Okul Adı' },
          { tag: '{{uyariNo}}', label: 'Uyarı No' },
        ],
      },
      {
        key: 'waTemplate2',
        title: '2. Seviye Uyarı',
        badge: '15 Gün Eşiği',
        description: 'Öğrenci 15 gün devamsızlığa ulaştığında kritik yasal sınır uyarısı metni.',
        tags: [
          { tag: '{{ogrenciAdi}}', label: 'Öğrenci Adı Soyadı' },
          { tag: '{{ozursuzGun}}', label: 'Özürsüz Gün' },
          { tag: '{{ozurluGun}}', label: 'Özürlü Gün' },
          { tag: '{{toplamGun}}', label: 'Toplam Gün' },
          { tag: '{{okulAdi}}', label: 'Okul Adı' },
          { tag: '{{uyariNo}}', label: 'Uyarı No' },
        ],
      },
      {
        key: 'waTemplate3',
        title: '3. Seviye Uyarı',
        badge: '25 Gün Eşiği',
        description: 'Öğrenci 25 gün devamsızlığa ulaştığında sınıf tekrarı ve son çağrı bildirimi.',
        tags: [
          { tag: '{{ogrenciAdi}}', label: 'Öğrenci Adı Soyadı' },
          { tag: '{{ozursuzGun}}', label: 'Özürsüz Gün' },
          { tag: '{{ozurluGun}}', label: 'Özürlü Gün' },
          { tag: '{{toplamGun}}', label: 'Toplam Gün' },
          { tag: '{{okulAdi}}', label: 'Okul Adı' },
          { tag: '{{uyariNo}}', label: 'Uyarı No' },
        ],
      },
      {
        key: 'waTemplateBep',
        title: 'BEP / Kaynaştırma',
        badge: 'Özel Eğitim',
        description: 'Bireyselleştirilmiş Eğitim Planı (BEP) kapsamındaki öğrenciler için özel devamsızlık bildirimi.',
        tags: [
          { tag: '{{ogrenciAdi}}', label: 'Öğrenci Adı Soyadı' },
          { tag: '{{ozursuzGun}}', label: 'Özürsüz Gün' },
          { tag: '{{ozurluGun}}', label: 'Özürlü Gün' },
          { tag: '{{toplamGun}}', label: 'Toplam Gün' },
          { tag: '{{okulAdi}}', label: 'Okul Adı' },
          { tag: '{{uyariNo}}', label: 'Uyarı No' },
        ],
      },
    ],
  },
  daily: {
    title: 'Günlük Anlık Devamsızlık Bildirimi',
    shortTitle: 'Günlük Devamsızlık',
    icon: Clock,
    badge: '1 Şablon',
    description: 'Sabah, öğleden sonra veya tam gün yoklama listelerinden derse gelmeyen öğrencilerin velilerine anında gönderilen bildirim.',
    items: [
      {
        key: 'waTemplateDaily',
        title: 'Anlık Bildirim Şablonu',
        badge: 'Yoklama / SMS',
        description: 'Günlük yoklamalarda gelmeyen öğrencinin velisine anında giden mesaj.',
        tags: [
          { tag: '{ogrenci_adi}', label: 'Öğrenci Adı' },
          { tag: '{sinif}', label: 'Sınıf / Şube' },
          { tag: '{numara}', label: 'Okul Numarası' },
          { tag: '{tarih}', label: 'Devamsızlık Tarihi' },
          { tag: '{oturum}', label: 'Zaman (sabah ilk derste / vb.)' },
          { tag: '{okul_adi}', label: 'Okul Adı' },
          { tag: '{okul_telefonu}', label: 'Okul Telefonu' },
        ],
      },
    ],
  },
  warning: {
    title: 'Yazılı Uyarı Tutanağı (Disiplin / Davranış)',
    shortTitle: 'Yazılı Uyarı',
    icon: Scale,
    badge: '1 Şablon',
    description: 'Okul içi kurallara aykırı davranış gösteren öğrenciler için düzenlenen yazılı uyarı tutanağının veliye iletildiği şablon.',
    items: [
      {
        key: 'waTemplateWarningNotice',
        title: 'Yazılı Uyarı Şablonu',
        badge: 'Tutanak & PDF',
        description: 'Yazılı uyarı tutanağı kaydı oluşturulduğunda veliye gönderilen bilgilendirme ve PDF mesajı.',
        tags: [
          { tag: '{ogrenciAdi}', label: 'Öğrenci Adı Soyadı' },
          { tag: '{sinif}', label: 'Sınıfı' },
          { tag: '{numara}', label: 'Okul No' },
          { tag: '{uyariNo}', label: 'Uyarı No (1, 2...)' },
          { tag: '{davranis}', label: 'İhlal Edilen Kural' },
          { tag: '{aciklama}', label: 'Açıklama / Detay' },
          { tag: '{veliAdi}', label: 'Veli Adı' },
          { tag: '{okulAdi}', label: 'Okul Adı' },
        ],
      },
    ],
  },
  consent: {
    title: 'KVKK Veli Açık Rıza ve Onay Linki Daveti',
    shortTitle: 'KVKK Onay Linki',
    icon: ShieldCheck,
    badge: '1 Şablon',
    description: 'Velilerin mobil cihazlarından 6698 sayılı KVKK kapsamında WhatsApp iletişim iznini online imzalamaları için iletilen davet mesajı.',
    items: [
      {
        key: 'waTemplateConsentRequest',
        title: 'KVKK Onay Davet Mesajı',
        badge: 'Resmi Mobil Form',
        description: 'Veliye şifreli mobil web onay formu bağlantısıyla birlikte iletilen davet metni.',
        tags: [
          { tag: '{okulAdi}', label: 'Okul Adı' },
          { tag: '{onayLinki}', label: 'Güvenli Onay Linki' },
          { tag: '{okulTelefon}', label: 'Okul Teyit Telefonu' },
        ],
      },
    ],
  },
};

export default function WhatsAppPage() {
  const { confirm, confirmModal } = useConfirm();
  const { refreshSettings } = useSettings();

  // ── Ana Sayfa Sekmeleri ──
  const [mainTab, setMainTab] = useState<MainTab>('connection');

  // ── WhatsApp Bağlantı Durumu ──
  const [waState, setWaState] = useState<WAState>({
    status: 'disconnected',
    qrBase64: null,
    error: null,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  // ── Şablon Yönetimi State'leri ──
  const [templates, setTemplates] = useState<Record<TemplateKey, string>>({ ...DEFAULTS });
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('absenteeism');
  const [activeItemKey, setActiveItemKey] = useState<TemplateKey>('waTemplate1');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [schoolName, setSchoolName] = useState('Okul Yönetimi');
  const [schoolPhone, setSchoolPhone] = useState('0212 000 00 00');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Anti-Spam State'leri ──
  const [antiSpamEnabled, setAntiSpamEnabled] = useState(true);
  const [antiSpamMinDelay, setAntiSpamMinDelay] = useState(4);
  const [antiSpamMaxDelay, setAntiSpamMaxDelay] = useState(7);
  const [antiSpamSaving, setAntiSpamSaving] = useState(false);

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
        setTemplates({
          waTemplate1: d.waTemplate1 || DEFAULTS.waTemplate1,
          waTemplate2: d.waTemplate2 || DEFAULTS.waTemplate2,
          waTemplate3: d.waTemplate3 || DEFAULTS.waTemplate3,
          waTemplateBep: d.waTemplateBep || DEFAULTS.waTemplateBep,
          waTemplateDaily: d.waTemplateDaily || DEFAULTS.waTemplateDaily,
          waTemplateWarningNotice: d.waTemplateWarningNotice || DEFAULTS.waTemplateWarningNotice,
          waTemplateConsentRequest: d.waTemplateConsentRequest || DEFAULTS.waTemplateConsentRequest,
        });
        if (d.schoolName) setSchoolName(d.schoolName);
        if (d.schoolPhone) setSchoolPhone(d.schoolPhone);
        if (d.waAntiSpamEnabled !== undefined) setAntiSpamEnabled(d.waAntiSpamEnabled);
        if (d.waAntiSpamMinDelay !== undefined) setAntiSpamMinDelay(d.waAntiSpamMinDelay);
        if (d.waAntiSpamMaxDelay !== undefined) setAntiSpamMaxDelay(d.waAntiSpamMaxDelay);
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

  // Kategori değiştiğinde ilk alt şablonu aktif yap
  const handleSelectCategory = (cat: TemplateCategory) => {
    setActiveCategory(cat);
    const firstItem = CATEGORIES[cat].items[0];
    if (firstItem) {
      setActiveItemKey(firstItem.key);
    }
  };

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

  const handleSaveAllTemplates = async () => {
    setTemplateSaving(true);
    try {
      await api.put('/settings', {
        waTemplate1: templates.waTemplate1,
        waTemplate2: templates.waTemplate2,
        waTemplate3: templates.waTemplate3,
        waTemplateBep: templates.waTemplateBep,
        waTemplateDaily: templates.waTemplateDaily,
        waTemplateWarningNotice: templates.waTemplateWarningNotice,
        waTemplateConsentRequest: templates.waTemplateConsentRequest,
      });
      await refreshSettings();
      toast.success('Tüm WhatsApp mesaj şablonları başarıyla kaydedildi.');
    } catch {
      toast.error('Şablonlar kaydedilirken bir hata oluştu.');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleSaveAntiSpam = async () => {
    setAntiSpamSaving(true);
    try {
      await api.put('/settings', {
        waAntiSpamEnabled: antiSpamEnabled,
        waAntiSpamMinDelay: antiSpamMinDelay,
        waAntiSpamMaxDelay: antiSpamMaxDelay,
      });
      await refreshSettings();
      toast.success('Anti-Spam koruması ve gecikme ayarları kaydedildi.');
    } catch {
      toast.error('Spam ayarları kaydedilirken hata oluştu.');
    } finally {
      setAntiSpamSaving(false);
    }
  };

  const handleResetActiveToDefault = () => {
    const defaultVal = DEFAULTS[activeItemKey];
    setTemplates(prev => ({
      ...prev,
      [activeItemKey]: defaultVal,
    }));
    toast.success('Seçili şablon resmi önerilen metne sıfırlandı.');
  };

  const handleInsertTag = (tag: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = templates[activeItemKey] || '';
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const nextVal = before + tag + after;

    setTemplates(prev => ({
      ...prev,
      [activeItemKey]: nextVal,
    }));

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Aktif şablon tanımı
  const currentCategoryDef = CATEGORIES[activeCategory];
  const currentItemDef = currentCategoryDef.items.find(i => i.key === activeItemKey) || currentCategoryDef.items[0];
  const currentTemplateText = templates[activeItemKey] || DEFAULTS[activeItemKey] || '';

  // Canlı WhatsApp önizlemesi (kategoriye ve şablona göre dinamik örnek veriyle simüle edilir)
  const getLivePreview = () => {
    const raw = currentTemplateText;
    const cleanSchool = schoolName || 'Örnek Anadolu Lisesi';
    const schoolClosing = /müdürlüğü$/i.test(cleanSchool) ? cleanSchool : `${cleanSchool} MÜDÜRLÜĞÜ`;

    switch (activeCategory) {
      case 'absenteeism':
        return raw
          .replace(/\{\{?ogrenciAdi\}?\}/gi, 'Ahmet YILMAZ')
          .replace(/\{\{?ozursuzGun\}?\}/gi, '4.5')
          .replace(/\{\{?ozurluGun\}?\}/gi, '2.0')
          .replace(/\{\{?toplamGun\}?\}/gi, '6.5')
          .replace(/\{\{?okulAdi\}?\}\s*(?:Müdürlüğü|MÜDÜRLÜĞÜ|müdürlüğü)/gi, schoolClosing)
          .replace(/\{\{?okulAdi\}?\}/gi, cleanSchool)
          .replace(/\{\{?uyariNo\}?\}/gi, activeItemKey === 'waTemplate1' ? '1' : activeItemKey === 'waTemplate2' ? '2' : activeItemKey === 'waTemplate3' ? '3' : '1');

      case 'daily':
        return raw
          .replace(/\{okul_adi\}/gi, cleanSchool)
          .replace(/\{sinif\}/gi, '10-A')
          .replace(/\{numara\}/gi, '452')
          .replace(/\{ogrenci_adi\}/gi, 'Zeynep KAYA')
          .replace(/\{tarih\}/gi, new Date().toLocaleDateString('tr-TR'))
          .replace(/\{oturum\}/gi, 'sabah ilk derste')
          .replace(/\{okul_telefonu\}/gi, schoolPhone);

      case 'warning':
        return raw
          .replace(/\{\{?veliAdi\}?\}/gi, 'Sayın Mehmet KAYA')
          .replace(/\{\{?ogrenciAdi\}?\}/gi, 'Zeynep KAYA')
          .replace(/\{\{?sinif\}?\}/gi, '10-A')
          .replace(/\{\{?numara\}?\}/gi, '452')
          .replace(/\{\{?uyariNo\}?\}/gi, '1')
          .replace(/\{\{?davranis\}?\}/gi, 'Ders araç ve gereçlerini kasıtlı olarak getirmemek veya ders düzenini bozmak')
          .replace(/\{\{?aciklama\}?\}/gi, '▫️ *Açıklama / Detay:* Ders esnasında izin almadan cep telefonu kullanılmıştır.\n')
          .replace(/\{\{?okulAdi\}?\}\s*(?:Müdürlüğü|MÜDÜRLÜĞÜ|müdürlüğü)/gi, schoolClosing)
          .replace(/\{\{?okulAdi\}?\}/gi, cleanSchool);

      case 'consent':
        return raw
          .replace(/\{\{?okulAdi\}?\}\s*(?:Müdürlüğü|MÜDÜRLÜĞÜ|müdürlüğü)/gi, `${cleanSchool.toUpperCase()} MÜDÜRLÜĞÜ`)
          .replace(/\{\{?okulAdi\}?\}/gi, cleanSchool)
          .replace(/\{\{?onayLinki\}?\}/gi, 'https://okuldesk-onay.web.app/v/7f9a2b4c')
          .replace(/\{\{?okulTelefon\}?\}/gi, `📞 *Tereddüt halinde teyit için okul tel:* ${schoolPhone}\n\n`);

      default:
        return raw;
    }
  };

  const statusColors = {
    disconnected: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: <MessageCircle size={24} className="text-slate-400" /> },
    connecting: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <Loader2 size={24} className="text-amber-500 animate-spin" /> },
    reconnecting: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <Loader2 size={24} className="text-blue-500 animate-spin" /> },
    qr: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: <QrCode size={24} className="text-indigo-600" /> },
    connected: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 size={24} className="text-emerald-600" /> },
  };

  const currentTheme = statusColors[waState.status];

  return (
    <div className="space-y-6">
      {confirmModal}

      <PageHeader
        title="WhatsApp Bağlantısı ve Mesaj Şablonları Merkezi"
        description="Kurumsal WhatsApp hattınızı bağlayın; devamsızlık mektupları, anlık devamsızlık bildirimleri, yazılı uyarılar ve KVKK onay davetlerini tek çatı altından düzenleyin."
        icon={<MessageCircle size={28} className="text-emerald-600" />}
      />

      {/* ── ÜST ANA GEÇİŞ SEKMELERİ ── */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl shadow-2xs p-1.5 gap-2">
        <button
          type="button"
          onClick={() => setMainTab('connection')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer ${mainTab === 'connection'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <Smartphone size={16} />
          <span>WhatsApp Cihaz & Bağlantı Durumu</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${waState.status === 'connected'
              ? 'bg-emerald-500 text-white'
              : waState.status === 'qr'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-300 text-slate-800'
            }`}>
            {STATUS_LABELS[waState.status]}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('templates')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer ${mainTab === 'templates'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <Layers size={16} />
          <span>Mesaj Şablonları Merkezi (Tüm Bölümler)</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${mainTab === 'templates' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
            4 Bölüm • 7 Şablon
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 1. SEKME: BAĞLANTI & QR KOD YÖNETİMİ                                       */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'connection' && (
        <div className="space-y-6">
          {/* Bağlantı Durum Kartı */}
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
                    ? 'Okul kurumsal hattı devrede. Devamsızlık mektupları, anlık yoklama bildirimleri ve uyarılar tek tıkla velilere gönderilmeye hazır.'
                    : waState.status === 'qr'
                      ? 'Lütfen aşağıdaki QR kodu WhatsApp uygulamanızla okutun.'
                      : 'WhatsApp bildirimlerini gönderebilmek için kurumsal hattınızı bağlayın.'}
                </p>
                {waState.error && (
                  <div className="text-rose-600 text-xs mt-1.5 font-semibold flex items-center gap-1">
                    <AlertTriangle size={14} /> {waState.error}
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {waState.status === 'disconnected' && (
                <Button
                  variant="primary"
                  onClick={handleConnect}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs h-10 px-5 shadow-sm"
                >
                  {actionLoading ? <><Loader2 size={16} className="animate-spin" /> Başlatılıyor...</> : <><LinkIcon size={16} /> WhatsApp'a Bağlan</>}
                </Button>
              )}
              {waState.status !== 'disconnected' && (
                <Button
                  variant="danger"
                  onClick={handleDisconnect}
                  disabled={actionLoading}
                  className="font-bold text-xs h-10 px-5 shadow-sm"
                >
                  {actionLoading ? <><Loader2 size={16} className="animate-spin" /> Bekleyin...</> : <><Unlink size={16} /> Bağlantıyı Kes</>}
                </Button>
              )}
            </div>
          </div>

          {/* Ağ ve Çoklu Bilgisayar (Ortak Veritabanı) Kartı */}
          <NetworkSettingsCard />

          {/* Akıllı Anti-Spam ve Gönderim Güvenliği Kartı */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Akıllı Anti-Spam ve Gönderim Güvenliği Koruması
                  </h3>
                  <p className="text-xs text-slate-500">
                    WhatsApp kurumsal hattınızın toplu bildirimlerde engel/spam filtresine takılmasını önleyen insansı gecikme sistemi.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={antiSpamSaving}
                onClick={handleSaveAntiSpam}
                leftIcon={antiSpamSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                className="text-xs font-bold h-8 px-4 bg-emerald-600 hover:bg-emerald-700 self-start sm:self-auto"
              >
                {antiSpamSaving ? 'Kaydediliyor...' : 'Spam Ayarlarını Kaydet'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-7 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={antiSpamEnabled}
                    onChange={e => setAntiSpamEnabled(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Akıllı İnsansı Gönderim Gecikmesini Etkinleştir (Önerilen)
                  </span>
                </label>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                  Ardı ardına giden veli bildirimleri arasına rastgele insansı zaman farkı ekler. Otomatik bildirimler bot algoritması yerine gerçek insan kullanımı izlenimi vererek hesabınızı güvende tutar.
                </p>
              </div>

              <div className="md:col-span-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Mesajlar Arası Bekleme Süresi (Saniye):
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={antiSpamMinDelay}
                    onChange={e => setAntiSpamMinDelay(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-16 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-center font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="text-slate-500 font-medium">ile</span>
                  <input
                    type="number"
                    min={4}
                    max={30}
                    value={antiSpamMaxDelay}
                    onChange={e => setAntiSpamMaxDelay(Math.max(antiSpamMinDelay + 1, parseInt(e.target.value) || 7))}
                    className="w-16 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-center font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="text-slate-500">sn arası (Rastgele)</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  * Toplu anlık devamsızlık ve mektup gönderimlerinde her veli öncesinde bu aralıktan rastgele bir süre beklenir.
                </div>
              </div>
            </div>
          </div>

          {/* QR Kod Ekranı (Bekleniyorsa) */}
          {waState.status === 'qr' && waState.qrBase64 && (
            <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-indigo-100 shrink-0">
                <img
                  className="w-64 h-64 object-contain"
                  src={waState.qrBase64}
                  alt="WhatsApp QR Kodu"
                />
                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Loader2 size={13} className="animate-spin text-indigo-600" /> QR kod otomatik yenilenir
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
                  <Smartphone size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>Oturum bilgisi bilgisayarınızda güvenle saklanır. Uygulamayı yeniden açtığınızda otomatik bağlanır.</span>
                </div>
              </div>
            </div>
          )}

          {/* Rehber & Bilgi Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase">
                <FileText size={16} /> Devamsızlık Mektupları
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Devamsızlık Mektubu ekranından seçilen velilere renkli ve mühürlü <strong>resmi PDF belgesi</strong> ile birlikte özelleştirilmiş WhatsApp bildirimi gönderilir.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase">
                <Clock size={16} /> Günlük Anlık Bildirim
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Günlük yoklamada gelmeyen öğrenciler tespit edilip tek tıkla velilere "Bugün okula gelmedi" uyarısı iletilir. Sınıf bazlı gruplanarak raporlanabilir.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase">
                <ShieldCheck size={16} /> KVKK Onay Güvencesi
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                WhatsApp mesajları yalnızca açık rızası bulunan velilere gönderilebilir. Reddeden veya henüz onaylamayan velilere izinsiz mesaj gönderimi engellenir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* 2. SEKME: BİRLEŞİK MESAJ ŞABLONLARI MERKEZİ                               */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'templates' && (
        <div className="space-y-6">
          {/* Kategori Seçim Paneli (4 Bölüm Kartı) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(CATEGORIES) as TemplateCategory[]).map(catKey => {
              const cat = CATEGORIES[catKey];
              const isSelected = activeCategory === catKey;
              const IconComp = cat.icon;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => handleSelectCategory(catKey)}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2.5 relative ${isSelected
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                      <IconComp size={18} />
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isSelected ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {cat.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className={`text-xs font-black leading-tight ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                      {cat.shortTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ana Düzenleme Kartı */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Kart Başlığı & Eylemler */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <currentCategoryDef.icon size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      {currentCategoryDef.title}
                    </h2>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      {currentItemDef.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {currentItemDef.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetActiveToDefault}
                  leftIcon={<RotateCcw size={13} />}
                  className="text-xs h-8 bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  title="Bu şablon için MEB önerilen varsayılan metnini geri yükle"
                >
                  Önerilen Metni Getir
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={templateSaving}
                  onClick={handleSaveAllTemplates}
                  leftIcon={templateSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  className="text-xs font-bold h-8 px-4 bg-emerald-600 hover:bg-emerald-700"
                >
                  {templateSaving ? 'Kaydediliyor...' : 'Tüm Şablonları Kaydet'}
                </Button>
              </div>
            </div>

            {/* Alt Şablon Sekmeleri (Kategori birden fazla şablon içeriyorsa) */}
            {currentCategoryDef.items.length > 1 && (
              <div className="border-b border-slate-200 bg-slate-100/60 px-4 pt-3 flex flex-wrap gap-2">
                {currentCategoryDef.items.map(item => {
                  const isActive = activeItemKey === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveItemKey(item.key)}
                      className={`px-3.5 py-2 rounded-t-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer border-t border-x ${isActive
                          ? 'bg-white text-emerald-700 border-slate-200 border-b-white -mb-px shadow-2xs'
                          : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                    >
                      <span>{item.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-200 text-slate-600'
                        }`}>
                        {item.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="p-4 sm:p-5 space-y-4">
              {/* Dinamik Değişken Butonları */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" /> Metne Eklenebilir Değişkenler (Tıklayarak Ekleyin):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Mesaj gönderilirken öğrenci ve velinin gerçek bilgileriyle otomatik doldurulur.
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentItemDef.tags.map(p => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => handleInsertTag(p.tag)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-emerald-800 border border-slate-200 rounded-md font-mono text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center gap-1"
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
                      Şablon Metni Düzenleyici ({currentItemDef.title})
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {currentTemplateText.length} karakter
                    </span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    rows={14}
                    value={currentTemplateText}
                    onChange={e => {
                      const val = e.target.value;
                      setTemplates(prev => ({
                        ...prev,
                        [activeItemKey]: val,
                      }));
                    }}
                    placeholder="Şablon metnini buraya yazın..."
                    className="w-full p-3.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white transition leading-relaxed resize-y placeholder:text-slate-400"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>* *Kalın yazı* için yıldız kullanın. _İtalik_ için alt çizgi kullanın.</span>
                    <button
                      type="button"
                      onClick={handleResetActiveToDefault}
                      className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Varsayılan MEB metnine dön
                    </button>
                  </div>
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
                  <div className="flex-1 min-h-[320px] bg-[#EFEAE2] rounded-xl p-4 border border-slate-200 flex flex-col justify-start relative overflow-hidden shadow-inner">
                    <div className="bg-white rounded-lg rounded-tl-none p-3.5 shadow-sm max-w-full text-xs text-slate-900 border border-emerald-100 relative whitespace-pre-wrap leading-relaxed font-sans">
                      {getLivePreview()}

                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>10:30</span>
                        <span className="text-blue-500 font-bold">✓✓</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 text-center">
                      <span className="text-[10px] text-slate-600 bg-white/95 px-3 py-1 rounded-full shadow-2xs border border-slate-200 inline-flex items-center gap-1">
                        🔒 Uçtan uca şifreli resmi okul bildirimi
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
