import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import {
  FolderArchive, Printer, Plus, Trash2, Copy, Sparkles,
  Settings2, Edit3, ArrowUp, ArrowDown, Search, Check,
  BookOpen, Layers, RefreshCw, X, SlidersHorizontal, Hash,
  ZoomIn, ZoomOut, Type
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { ActionModal } from '../../../components/ui/ActionModal';
import { useSettings } from '../../../context/SettingsContext';
import { SDP_TEMPLATES, SDPTemplate } from './data/sdpTemplates';
import {
  FolderSpinePrintTemplate,
  FolderSpineItem,
  SpineType
} from './print/FolderSpinePrintTemplate';

const STORAGE_KEY = 'okuldesk_folder_spine_items';
const CONFIG_KEY = 'okuldesk_folder_spine_config';

const COLOR_PALETTE = [
  { name: 'Kırmızı (Resmi/İdari)', val: '#dc2626' },
  { name: 'Lacivert (Eğitim)', val: '#1e3a8a' },
  { name: 'Yeşil (Zümre/Öğrenci)', val: '#15803d' },
  { name: 'Turuncu (Sosyal)', val: '#ea580c' },
  { name: 'Mor (Rehberlik)', val: '#7e22ce' },
  { name: 'Teal (Mesleki)', val: '#0f766e' },
  { name: 'Gri / Standart', val: '' }
];

// Türkçe karakter ve case duyarsız arama normalizasyonu
const normalizeForSearch = (str: string) =>
  (str || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();

// Akıllı puanlamalı SDP arama fonksiyonu
const searchSdpTemplates = (query: string, maxResults = 35): SDPTemplate[] => {
  const q = normalizeForSearch(query);
  if (!q) return [];

  const matches: { item: SDPTemplate; score: number }[] = [];

  for (const item of SDP_TEMPLATES) {
    const codeNorm = normalizeForSearch(item.code);
    const titleNorm = normalizeForSearch(item.title);
    const subNorm = normalizeForSearch(item.subtitle || '');
    const catNorm = normalizeForSearch(item.category || '');

    let score = -1;
    if (codeNorm === q) score = 100;
    else if (codeNorm.startsWith(q)) score = 90;
    else if (codeNorm.includes(q)) score = 80;
    else if (titleNorm.startsWith(q)) score = 70;
    else if (titleNorm.includes(q)) score = 60;
    else if (subNorm.includes(q)) score = 40;
    else if (catNorm.includes(q)) score = 20;

    if (score >= 0) {
      matches.push({ item, score });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(m => m.item);
};

export default function FolderSpinePage() {
  const { settings } = useSettings();
  const printRef = useRef<HTMLDivElement>(null);

  // ── Kurum Bilgileri & Sayfa Ayarları ──
  const [config, setConfig] = useState({
    schoolName: settings?.schoolName || 'ALİYA İZZETBEGOVİÇ MESLEKİ VE TEKNİK ANADOLU LİSESİ',
    topLine1: 'T.C.',
    topLine2: 'MİLLÎ EĞİTİM BAKANLIĞI',
    topLine3: '',
    showLogo: true,
    logoSize: 'large' as 'normal' | 'large' | 'xlarge',
    textOrientation: 'horizontal' as 'horizontal' | 'vertical',
    titleFontSize: 13,
    fontFamily: 'sans' as 'serif' | 'sans',
    spineType: 'wide' as SpineType,
    customWidth: 50,
    customHeight: 190,
    academicYear: settings?.academicYear || '2025-2026'
  });

  // Önizleme Zoom Seviyesi (Varsayılan %65: Sayfanın solunun kesilmesini önler ve tek ekrana sığdırır)
  const [previewZoom, setPreviewZoom] = useState<number>(0.65);

  // Ayarlar değiştikçe veya ilk açılışta settings'ten çek
  useEffect(() => {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        let width = parsed.customWidth;
        // Eski 58mm veya 34mm kalmışsa resmi Türkiye okul standartlarına (50mm / 30mm) normalize et
        if (!width || width === 58) {
          width = parsed.spineType === 'narrow' ? 30 : parsed.spineType === 'slim' ? 20 : 50;
        } else if (width === 34) {
          width = 30;
        }
        const height = parsed.customHeight || 190;
        const spineType: SpineType = parsed.spineType === 'slim' ? 'slim' : (parsed.spineType === 'narrow' ? 'narrow' : 'wide');

        setConfig(prev => ({
          ...prev,
          ...parsed,
          spineType,
          customWidth: width,
          customHeight: height,
          titleFontSize: typeof parsed.titleFontSize === 'number'
            ? parsed.titleFontSize
            : (parsed.fontSizeLevel === 'small' ? 10 : parsed.fontSizeLevel === 'large' ? 14 : 13),
          textOrientation: parsed.textOrientation || 'horizontal'
        }));
        return;
      } catch { /* ignore */ }
    }
    if (settings?.schoolName) {
      setConfig(prev => ({
        ...prev,
        schoolName: settings.schoolName,
        academicYear: settings.academicYear || prev.academicYear
      }));
    }
  }, [settings?.schoolName, settings?.academicYear]);

  const saveConfig = (newCfg: typeof config) => {
    setConfig(newCfg);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newCfg));
  };

  // ── Klasör Sırtlık Listesi ──
  const [items, setItems] = useState<FolderSpineItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    // Varsayılan örnekler (Resmi sdp.xlsx kodlarına uygun)
    return [
      {
        id: 'default-1',
        code: '188.02',
        title: 'ÖĞRETMEN NÖBETİ',
        subtitle: 'Nöbet Hizmetleri ve Çizelgeler',
        year: '2025-2026',
        folderNo: 1,
        colorTag: '#dc2626'
      },
      {
        id: 'default-2',
        code: '121.02',
        title: 'HAFTALIK DERS PROGRAMLARI',
        subtitle: 'Haftalık Ders Dağıtım Çizelgeleri',
        year: '2025-2026',
        folderNo: 2,
        colorTag: '#1e3a8a'
      },
      {
        id: 'default-3',
        code: '100',
        title: 'EĞİTİM ÖĞRETİM İŞLERİ GENEL',
        subtitle: 'Milli Eğitim Faaliyetleri',
        year: '2025-2026',
        folderNo: 1,
        colorTag: '#15803d'
      },
      {
        id: 'default-4',
        code: '101.03',
        title: 'MESLEKİ ORTAÖĞRETİM PROGRAMLARI',
        subtitle: 'Ders Zümre Kararları ve Yıllık Planlar',
        year: '2025-2026',
        folderNo: 1,
        colorTag: '#ea580c'
      }
    ];
  });

  const saveItems = (newItems: FolderSpineItem[]) => {
    setItems(newItems);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  };

  // ── Modal Durumları ──
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState('ALL');
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<string[]>([]);

  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [seriesBaseItem, setSeriesBaseItem] = useState<FolderSpineItem | null>(null);
  const [seriesCount, setSeriesCount] = useState<number>(3);
  const [seriesStartNo, setSeriesStartNo] = useState<number>(1);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FolderSpineItem | null>(null);

  const [isDimensionModalOpen, setIsDimensionModalOpen] = useState(false);

  // ── Tekil Yeni Ekleme Formu ──
  const [formItem, setFormItem] = useState<Partial<FolderSpineItem>>({
    code: '',
    title: '',
    subtitle: '',
    year: config.academicYear,
    folderNo: 1,
    colorTag: ''
  });

  // ── SDP Otomatik Tamamlama (Arama) ──
  const [sdpSearchQuery, setSdpSearchQuery] = useState('');
  const [isSdpDropdownOpen, setIsSdpDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const sdpDropdownRef = useRef<HTMLDivElement>(null);

  // Düzenleme modalı için SDP arama
  const [editSdpQuery, setEditSdpQuery] = useState('');
  const [isEditSdpOpen, setIsEditSdpOpen] = useState(false);
  const [editHighlightedIndex, setEditHighlightedIndex] = useState<number>(0);
  const editSdpRef = useRef<HTMLDivElement>(null);

  // Canlı SDP eşleşmeleri (Akıllı puanlamalı ve Türkçe normalizasyonlu)
  const matchingSdpItems = useMemo(() => {
    return searchSdpTemplates(sdpSearchQuery, 35);
  }, [sdpSearchQuery]);

  const matchingEditSdpItems = useMemo(() => {
    return searchSdpTemplates(editSdpQuery, 35);
  }, [editSdpQuery]);

  // Dropdown dışı tıklama dinleyicisi
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sdpDropdownRef.current && !sdpDropdownRef.current.contains(e.target as Node)) {
        setIsSdpDropdownOpen(false);
      }
      if (editSdpRef.current && !editSdpRef.current.contains(e.target as Node)) {
        setIsEditSdpOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Yazdırma kancası
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Klasor_Sirtligi_${config.academicYear}_${config.spineType}`
  });

  // Kategoriler
  const categories = useMemo(() => {
    const set = new Set<string>();
    SDP_TEMPLATES.forEach(t => set.add(t.category));
    return Array.from(set);
  }, []);

  // Filtrelenmiş Şablonlar (Arama ve kategori filtresi)
  const filteredTemplates = useMemo(() => {
    const q = normalizeForSearch(templateSearch);
    return SDP_TEMPLATES.filter(t => {
      const matchCat = templateCategory === 'ALL' || t.category === templateCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        normalizeForSearch(t.code).includes(q) ||
        normalizeForSearch(t.title).includes(q) ||
        normalizeForSearch(t.subtitle || '').includes(q) ||
        normalizeForSearch(t.category).includes(q)
      );
    });
  }, [templateCategory, templateSearch]);

  // Tekil Ekle
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.title?.trim()) {
      return toast.error('Lütfen bir klasör başlığı girin.');
    }
    const newItem: FolderSpineItem = {
      id: 'item-' + Date.now(),
      title: formItem.title.trim().toLocaleUpperCase('tr-TR'),
      code: formItem.code?.trim() || '',
      subtitle: formItem.subtitle?.trim() || '',
      year: formItem.year?.trim() || config.academicYear,
      folderNo: formItem.folderNo || items.length + 1,
      colorTag: formItem.colorTag || ''
    };
    saveItems([...items, newItem]);
    setFormItem({
      code: '',
      title: '',
      subtitle: '',
      year: config.academicYear,
      folderNo: items.length + 2,
      colorTag: ''
    });
    setSdpSearchQuery('');
    setIsSdpDropdownOpen(false);
    toast.success('Klasör sırtlığı eklendi.');
  };

  // Toplu Şablon Ekleme
  const handleAddSelectedTemplates = () => {
    if (selectedTemplateKeys.length === 0) {
      return toast.error('Lütfen en az bir şablon seçin.');
    }
    const keyMap = new Map(SDP_TEMPLATES.map(t => [`${t.code}_${t.title}`, t]));
    const newItems: FolderSpineItem[] = [];
    let count = 0;
    for (const key of selectedTemplateKeys) {
      const tmpl = keyMap.get(key);
      if (!tmpl) continue;
      newItems.push({
        id: `tmpl-${Date.now()}-${count}`,
        title: tmpl.title,
        code: tmpl.code,
        subtitle: tmpl.subtitle || '',
        year: config.academicYear,
        folderNo: items.length + count + 1,
        colorTag: ''
      });
      count++;
    }
    saveItems([...items, ...newItems]);
    setIsTemplateModalOpen(false);
    setSelectedTemplateKeys([]);
    toast.success(`${newItems.length} adet hazır klasör şablonu eklendi.`);
  };

  // Seri Üretim (1'den N'e kadar çoğalt)
  const handleGenerateSeries = () => {
    if (!seriesBaseItem) return;
    const newItems: FolderSpineItem[] = [];
    for (let i = 0; i < seriesCount; i++) {
      const no = seriesStartNo + i;
      newItems.push({
        ...seriesBaseItem,
        id: `series-${Date.now()}-${i}`,
        folderNo: no
      });
    }
    saveItems([...items, ...newItems]);
    setIsSeriesModalOpen(false);
    toast.success(`${seriesCount} adet seri klasör sırtlığı oluşturuldu.`);
  };

  // Düzenleme Kaydet
  const handleSaveEdit = () => {
    if (!editingItem) return;
    if (!editingItem.title.trim()) return toast.error('Başlık boş olamaz.');
    saveItems(items.map(it => it.id === editingItem.id ? editingItem : it));
    setIsEditModalOpen(false);
    setEditingItem(null);
    toast.success('Sırtlık güncellendi.');
  };

  // Sıra Değiştir
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    saveItems(updated);
  };

  // Çoğalt
  const duplicateItem = (item: FolderSpineItem) => {
    const copy: FolderSpineItem = {
      ...item,
      id: 'dup-' + Date.now(),
      folderNo: typeof item.folderNo === 'number' ? item.folderNo + 1 : `${item.folderNo} (Kopya)`
    };
    saveItems([...items, copy]);
    toast.success('Etiket kopyalandı.');
  };

  // Sil
  const deleteItem = (id: string) => {
    saveItems(items.filter(it => it.id !== id));
    toast.success('Etiket silindi.');
  };

  // Sayfa Sayısı Hesabı (Milimetrik genişliğe göre dinamik)
  const currentWidthMm = config.customWidth || (config.spineType === 'wide' ? 50 : config.spineType === 'narrow' ? 30 : 20);
  const gapMm = currentWidthMm <= 25 ? 1.5 : 2;
  const itemsPerPage = Math.max(1, Math.min(14, Math.floor((276 + gapMm) / (currentWidthMm + gapMm))));
  const pageCount = Math.max(1, Math.ceil(items.length / itemsPerPage));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Klasör Sırtlığı Hazırlama"
        description="MEB standartlarına uygun, resmi logolu, geniş (50mm), dar (30mm) ve ince (20mm) klasör sırtlık etiketleri oluşturun ve doğrudan A4 çıktısı alın."
        icon={<FolderArchive size={24} />}
      />

      {/* ── ÜST KONTROL & AYARLAR ÇUBUĞU ── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* Format Seçimi & Ölçü Ayarları Butonu */}
        <div className="lg:col-span-7 flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="flex-1 bg-slate-100 p-1 rounded-xl grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => saveConfig({ ...config, spineType: 'wide', customWidth: 50, customHeight: 190, titleFontSize: 13 })}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                config.spineType === 'wide' && (config.customWidth || 50) === 50
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Geniş Büro Klasörü: 7-8 cm sırt kalınlığı, standart 50 mm etiket cebi (Noki, Mas, Gıpta, Esselte vb.)"
            >
              <Layers size={14} className="shrink-0" />
              <span>Geniş</span>
              <span className="text-[10px] opacity-75 font-normal">(50mm)</span>
            </button>
            <button
              type="button"
              onClick={() => saveConfig({ ...config, spineType: 'narrow', customWidth: 30, customHeight: 190, titleFontSize: 10 })}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                config.spineType === 'narrow' && (config.customWidth || 30) === 30
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Dar / Standart Büro Klasörü: 5 cm sırt kalınlığı, standart 30 mm etiket cebi"
            >
              <SlidersHorizontal size={14} className="shrink-0" />
              <span>Dar</span>
              <span className="text-[10px] opacity-75 font-normal">(30mm)</span>
            </button>
            <button
              type="button"
              onClick={() => saveConfig({ ...config, spineType: 'slim', customWidth: 20, customHeight: 190, titleFontSize: 8.5 })}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                config.spineType === 'slim' && (config.customWidth || 20) === 20
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="İnce / Poşetli / Sunum / Halkalı Klasör: 2-3 cm sırt, 20 mm etiket cebi"
            >
              <Hash size={14} className="shrink-0" />
              <span>İnce</span>
              <span className="text-[10px] opacity-75 font-normal">(20mm)</span>
            </button>
          </div>

          {/* Sırtlık Ölçü Ayarları Butonu */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDimensionModalOpen(true)}
            className="py-2.5 px-3 rounded-xl border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 gap-1.5 shrink-0 text-xs font-bold transition-all shadow-2xs"
            title="Klasör sırtlık genişlik ve yükseklik ölçülerini milimetrik olarak özelleştirin"
          >
            <Settings2 size={15} className="text-indigo-600" />
            <span>Ölçü Ayarları</span>
            <span className="font-mono text-[11px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
              {config.customWidth || 50}mm
            </span>
          </Button>
        </div>

        {/* Hızlı Butonlar */}
        <div className="lg:col-span-5 flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTemplateModalOpen(true)}
            className="gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Sparkles size={14} className="text-indigo-600" /> ⚡ Hazır MEB Şablonları Ekle
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm('Tüm klasör sırtlığı etiketleri silinsin mi?')) {
                saveItems([]);
              }
            }}
            className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
          >
            <Trash2 size={13} /> Tümünü Temizle
          </Button>
        </div>
      </div>

      {/* ── İKİ KOLONLU ANA YAPI (SOL: FORM & LİSTE, SAĞ: CANLI A4 ÖNİZLEME) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── SOL PANEL: GİRİŞ FORMU VE ETİKET LİSTESİ ── */}
        <div className="lg:col-span-5 space-y-5">
          {/* Kurum Üst Bilgi Kartı (Katlanabilir / Düzenlenebilir) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Settings2 size={14} /> Kurumsal Başlık Bilgileri
              </span>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.showLogo}
                  onChange={e => saveConfig({ ...config, showLogo: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700">MEB Logosu</span>
              </label>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Okul / Kurum Adı</label>
                <input
                  type="text"
                  value={config.schoolName}
                  onChange={e => saveConfig({ ...config, schoolName: e.target.value })}
                  placeholder="Okul Adı"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Mülki İdare (Örn: T.C.)</label>
                  <input
                    type="text"
                    value={config.topLine1}
                    onChange={e => saveConfig({ ...config, topLine1: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Bakanlık / Valilik</label>
                  <input
                    type="text"
                    value={config.topLine2}
                    onChange={e => saveConfig({ ...config, topLine2: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">İlçe MEM (Opsiyonel)</label>
                  <input
                    type="text"
                    value={config.topLine3}
                    onChange={e => saveConfig({ ...config, topLine3: e.target.value })}
                    placeholder="Örn: MERAM İLÇE MEM"
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Öğretim Yılı</label>
                  <input
                    type="text"
                    value={config.academicYear}
                    onChange={e => saveConfig({ ...config, academicYear: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tipografi & Logo Detay Ayarları */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {config.showLogo && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-semibold">MEB Logo Boyutu:</span>
                    <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => saveConfig({ ...config, logoSize: 'normal' })}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                          config.logoSize === 'normal' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => saveConfig({ ...config, logoSize: 'large' })}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                          config.logoSize === 'large' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Büyük (Önerilen)
                      </button>
                      <button
                        type="button"
                        onClick={() => saveConfig({ ...config, logoSize: 'xlarge' })}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                          config.logoSize === 'xlarge' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Çok Büyük
                      </button>
                    </div>
                  </div>
                )}

                {/* Gövde Punto Stepper (+ - ile birim birim artırma/azaltma) */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Gövde Punto:</span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => saveConfig({ ...config, titleFontSize: Math.max(8, (config.titleFontSize || 14) - 1) })}
                      className="w-7 h-6 flex items-center justify-center bg-white hover:bg-slate-200 text-slate-800 rounded font-bold text-xs shadow-xs transition-colors"
                      title="Puntoyu 1 birim azalt"
                    >
                      -
                    </button>
                    <span className="px-2 font-mono font-bold text-xs text-indigo-700 min-w-[44px] text-center">
                      {config.titleFontSize || 14} pt
                    </span>
                    <button
                      type="button"
                      onClick={() => saveConfig({ ...config, titleFontSize: Math.min(28, (config.titleFontSize || 14) + 1) })}
                      className="w-7 h-6 flex items-center justify-center bg-white hover:bg-slate-200 text-slate-800 rounded font-bold text-xs shadow-xs transition-colors"
                      title="Puntoyu 1 birim artır"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Yazı Tipi (Font) */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Yazı Tipi (Font):</span>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => saveConfig({ ...config, fontFamily: 'sans' })}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        config.fontFamily === 'sans' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Modern (Sans)
                    </button>
                    <button
                      type="button"
                      onClick={() => saveConfig({ ...config, fontFamily: 'serif' })}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        config.fontFamily === 'serif' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Resmi (Times)
                    </button>
                  </div>
                </div>

                {/* Yazı Yönü (Kullanıcı Talebi: Yazı Tipi Seçeneğinin Hemen Altında) */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Yazı Yönü:</span>
                  <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => saveConfig({ ...config, textOrientation: 'horizontal' })}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                        config.textOrientation === 'horizontal' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Gövde başlığı ve alt açıklama düz yatay satırlar halinde okunsun (MEB Standardı)"
                    >
                      ↔ Yatay (Düz)
                    </button>
                    <button
                      type="button"
                      onClick={() => saveConfig({ ...config, textOrientation: 'vertical' })}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                        config.textOrientation === 'vertical' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Gövde metni sırt boyunca 90° dikey dönsün"
                    >
                      ↕ Dikey (90°)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Yeni Etiket Ekleme Formu */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <Plus size={16} className="text-indigo-600" /> Yeni Klasör Sırtlığı Ekle
            </h3>
            <form onSubmit={handleAddItem} className="space-y-3">
              {/* SDP Kodu veya Bölüm İsmi ile Canlı Arama / Tamamlama */}
              <div className="relative" ref={sdpDropdownRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    SDP Kodu veya Bölüm İsmi
                  </label>
                  <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                    <Sparkles size={11} /> Yazdıkça listelenir
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formItem.code || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setFormItem({ ...formItem, code: val });
                      setSdpSearchQuery(val);
                      setHighlightedIndex(0);
                      setIsSdpDropdownOpen(val.trim().length > 0);
                    }}
                    onFocus={() => {
                      if ((formItem.code || '').trim().length > 0) {
                        setSdpSearchQuery(formItem.code || '');
                        setHighlightedIndex(0);
                        setIsSdpDropdownOpen(true);
                      }
                    }}
                    onKeyDown={e => {
                      if (!isSdpDropdownOpen || matchingSdpItems.length === 0) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedIndex(prev => (prev + 1) % matchingSdpItems.length);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex(prev => (prev - 1 + matchingSdpItems.length) % matchingSdpItems.length);
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        const item = matchingSdpItems[highlightedIndex] || matchingSdpItems[0];
                        if (item) {
                          setFormItem(prev => ({
                            ...prev,
                            code: item.code,
                            title: item.title,
                            subtitle: item.subtitle || item.category || ''
                          }));
                          setSdpSearchQuery(item.code);
                          setIsSdpDropdownOpen(false);
                        }
                      } else if (e.key === 'Escape') {
                        setIsSdpDropdownOpen(false);
                      }
                    }}
                    placeholder="SDP Kodu (örn: 188, 121) veya Bölüm İsmi (örn: Nöbet, Ders, Öğrenci)..."
                    className="w-full border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 placeholder:font-normal"
                  />
                  {formItem.code && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormItem({ ...formItem, code: '' });
                        setSdpSearchQuery('');
                        setIsSdpDropdownOpen(false);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      title="Temizle"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Canlı Açılır Sonuç Listesi */}
                {isSdpDropdownOpen && matchingSdpItems.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold sticky top-0">
                      <span>MEB SDP Sonuçları ({matchingSdpItems.length})</span>
                      <span className="text-indigo-600 text-[10px]">Tıklayın veya Enter ile seçin 👇</span>
                    </div>
                    {matchingSdpItems.map((item, idx) => {
                      const isHigh = idx === highlightedIndex;
                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onMouseDown={e => {
                            e.preventDefault(); // blur olmasını önler
                            setFormItem(prev => ({
                              ...prev,
                              code: item.code,
                              title: item.title,
                              subtitle: item.subtitle || item.category || ''
                            }));
                            setSdpSearchQuery(item.code);
                            setIsSdpDropdownOpen(false);
                          }}
                          className={`p-2.5 cursor-pointer transition-colors flex flex-col gap-0.5 group ${
                            isHigh ? 'bg-indigo-50 text-indigo-950' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 group-hover:bg-indigo-100 px-2 py-0.5 rounded">
                              {item.code}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {item.category}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 text-xs mt-0.5 group-hover:text-indigo-950 leading-snug">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="text-[11px] text-slate-500 truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Klasör Ana Başlığı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formItem.title}
                  onChange={e => setFormItem({ ...formItem, title: e.target.value })}
                  placeholder="ÖRN: ÖĞRETMEN NÖBETİ VEYA DERS PROGRAMLARI"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Klasör / Cilt No</label>
                  <input
                    type="text"
                    value={formItem.folderNo}
                    onChange={e => setFormItem({ ...formItem, folderNo: e.target.value })}
                    placeholder="Örn: 1 veya 01"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Öğretim Yılı</label>
                  <input
                    type="text"
                    value={formItem.year}
                    onChange={e => setFormItem({ ...formItem, year: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Alt Açıklama (Dönem vb.)</label>
                <input
                  type="text"
                  value={formItem.subtitle}
                  onChange={e => setFormItem({ ...formItem, subtitle: e.target.value })}
                  placeholder="Örn: Nöbet Hizmetleri ve Çizelgeler"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Renk Seçimi */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Kategori / Renk Şeridi</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PALETTE.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormItem({ ...formItem, colorTag: c.val })}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform ${
                        formItem.colorTag === c.val ? 'ring-2 ring-indigo-500 scale-110 border-white' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: c.val || '#f1f5f9' }}
                      title={c.name}
                    >
                      {formItem.colorTag === c.val && <Check size={11} className={c.val ? 'text-white' : 'text-slate-800'} />}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs py-2">
                <Plus size={15} /> Sırtlık Listesine Ekle
              </Button>
            </form>
          </div>

          {/* Eklenen Sırtlıklar Listesi */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookOpen size={14} className="text-indigo-600" /> Eklenen Etiketler ({items.length})
              </span>
              <span className="text-[11px] text-slate-500">
                {config.spineType === 'wide' ? 'Sayfada 4 etiket' : 'Sayfada 7 etiket'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Henüz eklenmiş klasör sırtlığı yok. Yukarıdaki formdan veya <strong>Hazır MEB Şablonları</strong> butonundan ekleyin.
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={item.id} className="p-3 flex items-center gap-2 hover:bg-slate-50/80 transition-colors group">
                    {/* Renk şeridi göstergesi */}
                    <div
                      className="w-1.5 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: item.colorTag || '#cbd5e1' }}
                    />

                    {/* Sıra / No Rozeti */}
                    <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                      {item.folderNo || idx + 1}
                    </div>

                    {/* Metin Bilgisi */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        {item.code && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1 rounded">
                            {item.code}
                          </span>
                        )}
                        <p className="font-bold text-xs text-slate-800 truncate" title={item.title}>
                          {item.title}
                        </p>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                      {/* Seri Üret */}
                      <button
                        type="button"
                        onClick={() => {
                          setSeriesBaseItem(item);
                          setSeriesStartNo((Number(item.folderNo) || 1) + 1);
                          setIsSeriesModalOpen(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        title="Seri Numara ile Çoğalt"
                      >
                        <Hash size={13} />
                      </button>
                      {/* Yukarı / Aşağı Taşı */}
                      <button
                        type="button"
                        onClick={() => moveItem(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                        title="Yukarı Taşı"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(idx, 'down')}
                        disabled={idx === items.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                        title="Aşağı Taşı"
                      >
                        <ArrowDown size={13} />
                      </button>
                      {/* Düzenle */}
                      <button
                        type="button"
                        onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Düzenle"
                      >
                        <Edit3 size={13} />
                      </button>
                      {/* Kopyala */}
                      <button
                        type="button"
                        onClick={() => duplicateItem(item)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        title="Kopyasını Oluştur"
                      >
                        <Copy size={13} />
                      </button>
                      {/* Sil */}
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── SAĞ PANEL: CANLI A4 ÖNİZLEME ── */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Printer size={16} className="text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-800">Canlı A4 Baskı Önizlemesi</h3>
              <span className="bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-full border border-indigo-100">
                {items.length} Etiket • {pageCount} Sayfa
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Kontrolleri (Soldan kesilmeyi önler, ekrana sığdırır) */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs shadow-xs">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                  title="Küçült"
                >
                  <ZoomOut size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(0.65)}
                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                    previewZoom === 0.65 ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Ekrana Tam Sığdır"
                >
                  Sığdır (%65)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(0.85)}
                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                    previewZoom === 0.85 ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  %85
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(1)}
                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                    previewZoom === 1 ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  %100
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.min(1.3, Number((z + 0.1).toFixed(2))))}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                  title="Büyüt"
                >
                  <ZoomIn size={13} />
                </button>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => handlePrint()}
                disabled={items.length === 0}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                <Printer size={14} /> Yazdır / PDF
              </Button>
            </div>
          </div>

          {/* Önizleme Alanı — Sol tarafın kesilmesini önleyen mx-auto + scrollbox */}
          <div className="p-4 bg-slate-200/60 overflow-x-auto overflow-y-auto max-h-[850px]">
            {items.length === 0 ? (
              <div className="py-24 text-center text-slate-400">
                <FolderArchive size={48} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold">Önizlenecek etiket bulunamadı.</p>
                <p className="text-xs text-slate-400 mt-1">Sol menüden etiket ekleyerek canlı önizlemeyi görebilirsiniz.</p>
              </div>
            ) : (
              <div
                className="mx-auto transition-all"
                style={{
                  width: `${Math.round(282 * previewZoom)}mm`,
                  minWidth: `${Math.round(282 * previewZoom)}mm`,
                  minHeight: `${Math.round(208 * pageCount * previewZoom)}mm`,
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top left',
                    width: '280mm'
                  }}
                >
                  <FolderSpinePrintTemplate
                    ref={printRef}
                    items={items}
                    schoolName={config.schoolName}
                    topHeaderLine1={config.topLine1}
                    topHeaderLine2={config.topLine2}
                    topHeaderLine3={config.topLine3}
                    showLogo={config.showLogo}
                    logoSize={config.logoSize}
                    textOrientation={config.textOrientation}
                    titleFontSize={config.titleFontSize}
                    fontFamily={config.fontFamily}
                    spineType={config.spineType}
                    customWidth={config.customWidth}
                    customHeight={config.customHeight}
                    academicYear={config.academicYear}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: HAZIR MEB ŞABLONLARI SEÇİCİ ── */}
      <ActionModal
        isOpen={isTemplateModalOpen}
        onClose={() => { setIsTemplateModalOpen(false); setSelectedTemplateKeys([]); }}
        title="⚡ Hazır MEB Standart Dosya Planı (SDP) Şablonları"
        width="full"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Milli Eğitim Bakanlığı okullarında en sık kullanılan klasör başlıklarını seçip tek tıkla listenize ekleyebilirsiniz ({SDP_TEMPLATES.length} adet resmi MEB şablonu).
          </p>

          {/* Arama & Kategori Filtresi */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                placeholder="Klasör adı veya SDP kodu ara..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={templateCategory}
              onChange={e => setTemplateCategory(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500 bg-white"
            >
              <option value="ALL">Tüm Kategoriler ({SDP_TEMPLATES.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Şablon Listesi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto p-1">
            {filteredTemplates.map((t, idx) => {
              const itemKey = `${t.code}_${t.title}`;
              const isSelected = selectedTemplateKeys.includes(itemKey);
              return (
                <div
                  key={itemKey}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTemplateKeys(selectedTemplateKeys.filter(k => k !== itemKey));
                    } else {
                      setSelectedTemplateKeys([...selectedTemplateKeys, itemKey]);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-400 shadow-sm ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded text-indigo-600 mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-700 px-1 rounded">
                        {t.code}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {t.category}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 leading-tight">
                      {t.title}
                    </p>
                    {t.subtitle && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                        {t.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alt Seçim ve Butonlar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const currentKeys = filteredTemplates.map(t => `${t.code}_${t.title}`);
                  const allSelected = currentKeys.length > 0 && currentKeys.every(k => selectedTemplateKeys.includes(k));
                  if (allSelected) {
                    setSelectedTemplateKeys(selectedTemplateKeys.filter(k => !currentKeys.includes(k)));
                  } else {
                    setSelectedTemplateKeys(Array.from(new Set([...selectedTemplateKeys, ...currentKeys])));
                  }
                }}
                className="text-xs text-slate-600"
              >
                {filteredTemplates.length > 0 && filteredTemplates.every(t => selectedTemplateKeys.includes(`${t.code}_${t.title}`))
                  ? 'Görüntülenenlerin Seçimini Kaldır'
                  : 'Görüntülenenleri Seç'}
              </Button>
              <span className="text-xs text-slate-500">
                {selectedTemplateKeys.length} adet seçildi
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setIsTemplateModalOpen(false); setSelectedTemplateKeys([]); }}
              >
                İptal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddSelectedTemplates}
                disabled={selectedTemplateKeys.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <Plus size={14} /> Seçilenleri Ekle ({selectedTemplateKeys.length})
              </Button>
            </div>
          </div>
        </div>
      </ActionModal>

      {/* ── MODAL: SERİ NUMARA İLE ÇOĞALT ── */}
      <ActionModal
        isOpen={isSeriesModalOpen}
        onClose={() => setIsSeriesModalOpen(false)}
        title="🔢 Seri Numara ile Klasör Çoğalt"
      >
        {seriesBaseItem && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <p className="font-bold text-slate-800">{seriesBaseItem.title}</p>
              {seriesBaseItem.code && <p className="text-slate-500 font-mono mt-0.5">SDP: {seriesBaseItem.code}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Başlangıç Numarası</label>
                <input
                  type="number"
                  min="1"
                  value={seriesStartNo}
                  onChange={e => setSeriesStartNo(parseInt(e.target.value) || 1)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kaç Adet Üretilsin?</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={seriesCount}
                  onChange={e => setSeriesCount(parseInt(e.target.value) || 1)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              💡 Örnek: Başlangıç {seriesStartNo}, {seriesCount} adet üretildiğinde Klasör No: {seriesStartNo}'den {seriesStartNo + seriesCount - 1}'e kadar otomatik eklenecektir.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsSeriesModalOpen(false)}>
                İptal
              </Button>
              <Button type="button" onClick={handleGenerateSeries} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Oluştur ve Ekle
              </Button>
            </div>
          </div>
        )}
      </ActionModal>

      {/* ── MODAL: ETİKET DÜZENLE ── */}
      <ActionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="✏️ Klasör Sırtlığını Düzenle"
      >
        {editingItem && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Klasör Ana Başlığı *</label>
              <input
                type="text"
                value={editingItem.title}
                onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative" ref={editSdpRef}>
                <label className="block text-xs font-medium text-slate-600 mb-1">SDP Kodu / Bölüm</label>
                <input
                  type="text"
                  value={editingItem.code || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEditingItem({ ...editingItem, code: val });
                    setEditSdpQuery(val);
                    setEditHighlightedIndex(0);
                    setIsEditSdpOpen(val.trim().length > 0);
                  }}
                  onFocus={() => {
                    if ((editingItem.code || '').trim().length > 0) {
                      setEditSdpQuery(editingItem.code || '');
                      setEditHighlightedIndex(0);
                      setIsEditSdpOpen(true);
                    }
                  }}
                  onKeyDown={e => {
                    if (!isEditSdpOpen || matchingEditSdpItems.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setEditHighlightedIndex(prev => (prev + 1) % matchingEditSdpItems.length);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setEditHighlightedIndex(prev => (prev - 1 + matchingEditSdpItems.length) % matchingEditSdpItems.length);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const item = matchingEditSdpItems[editHighlightedIndex] || matchingEditSdpItems[0];
                      if (item) {
                        setEditingItem(prev => prev ? ({
                          ...prev,
                          code: item.code,
                          title: item.title,
                          subtitle: item.subtitle || item.category || ''
                        }) : null);
                        setEditSdpQuery(item.code);
                        setIsEditSdpOpen(false);
                      }
                    } else if (e.key === 'Escape') {
                      setIsEditSdpOpen(false);
                    }
                  }}
                  placeholder="Kod veya Konu ara..."
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                />

                {/* Düzenleme Açılır Listesi */}
                {isEditSdpOpen && matchingEditSdpItems.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl divide-y divide-slate-100">
                    {matchingEditSdpItems.map((item, idx) => {
                      const isHigh = idx === editHighlightedIndex;
                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setEditHighlightedIndex(idx)}
                          onMouseDown={e => {
                            e.preventDefault();
                            setEditingItem(prev => prev ? ({
                              ...prev,
                              code: item.code,
                              title: item.title,
                              subtitle: item.subtitle || item.category || ''
                            }) : null);
                            setEditSdpQuery(item.code);
                            setIsEditSdpOpen(false);
                          }}
                          className={`p-2 cursor-pointer transition-colors flex flex-col gap-0.5 text-left ${
                            isHigh ? 'bg-indigo-50 text-indigo-950' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {item.code}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {item.category}
                            </span>
                          </div>
                          <span className="font-bold text-slate-800 text-xs mt-0.5">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="text-[11px] text-slate-500 truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Klasör No</label>
                <input
                  type="text"
                  value={editingItem.folderNo || ''}
                  onChange={e => setEditingItem({ ...editingItem, folderNo: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Alt Açıklama</label>
              <input
                type="text"
                value={editingItem.subtitle || ''}
                onChange={e => setEditingItem({ ...editingItem, subtitle: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Yıl</label>
              <input
                type="text"
                value={editingItem.year || ''}
                onChange={e => setEditingItem({ ...editingItem, year: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Kategori / Renk</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PALETTE.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, colorTag: c.val })}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform ${
                      editingItem.colorTag === c.val ? 'ring-2 ring-indigo-500 scale-110 border-white' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.val || '#f1f5f9' }}
                    title={c.name}
                  >
                    {editingItem.colorTag === c.val && <Check size={11} className={c.val ? 'text-white' : 'text-slate-800'} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                İptal
              </Button>
              <Button type="button" onClick={handleSaveEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Kaydet
              </Button>
            </div>
          </div>
        )}
      </ActionModal>

      {/* ── MODAL: SIRTLIK ÖLÇÜ & BOYUT AYARLARI ── */}
      <ActionModal
        isOpen={isDimensionModalOpen}
        onClose={() => setIsDimensionModalOpen(false)}
        title="📏 Sırtlık Ölçü & Boyut Ayarları (Milimetrik)"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Elinizdeki klasörün sırtındaki şeffaf cebin içine bir cetvel tutarak genişliğini tam ölçebilir ve etiketi klasörünüze tam oturacak şekilde milimetre milimetre eşitleyebilirsiniz.
          </p>

          {/* Hazır Standart Seçenekler */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Hazır Klasör Standartları (Türkiye Büro Standartları):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => saveConfig({ ...config, spineType: 'wide', customWidth: 50, customHeight: 190, titleFontSize: 13 })}
                className={`p-3 rounded-xl border text-center transition-all ${
                  config.spineType === 'wide' && (config.customWidth || 50) === 50
                    ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-400/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs text-slate-900">Geniş Klasör</div>
                <div className="font-mono font-bold text-sm text-indigo-700 mt-0.5">50 mm</div>
                <div className="text-[10px] text-slate-500 mt-1">7-8 cm sırt (Noki, Mas, Gıpta)</div>
              </button>
              <button
                type="button"
                onClick={() => saveConfig({ ...config, spineType: 'narrow', customWidth: 30, customHeight: 190, titleFontSize: 10 })}
                className={`p-3 rounded-xl border text-center transition-all ${
                  config.spineType === 'narrow' && (config.customWidth || 30) === 30
                    ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-400/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs text-slate-900">Dar Klasör</div>
                <div className="font-mono font-bold text-sm text-indigo-700 mt-0.5">30 mm</div>
                <div className="text-[10px] text-slate-500 mt-1">5 cm sırt kalınlığı</div>
              </button>
              <button
                type="button"
                onClick={() => saveConfig({ ...config, spineType: 'slim', customWidth: 20, customHeight: 190, titleFontSize: 8.5 })}
                className={`p-3 rounded-xl border text-center transition-all ${
                  config.spineType === 'slim' && (config.customWidth || 20) === 20
                    ? 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-400/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs text-slate-900">İnce Klasör</div>
                <div className="font-mono font-bold text-sm text-indigo-700 mt-0.5">20 mm</div>
                <div className="text-[10px] text-slate-500 mt-1">2-3 cm sırt (Sunum/Poşetli)</div>
              </button>
            </div>
          </div>

          {/* Milimetrik Hassas Ayarlama */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            {/* Genişlik */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Etiket Genişliği:
              </label>
              <div className="flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const currentW = config.customWidth || 50;
                    const newW = Math.max(15, currentW - 1);
                    const newType = newW >= 42 ? 'wide' : (newW >= 26 ? 'narrow' : 'slim');
                    saveConfig({ ...config, customWidth: newW, spineType: newType });
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-base shadow-xs border border-slate-200 transition-colors"
                  title="1 mm daralt"
                >
                  -
                </button>
                <div className="flex-1 flex items-center justify-center">
                  <input
                    type="number"
                    min={15}
                    max={70}
                    value={config.customWidth || 50}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 30;
                      const newType = val >= 42 ? 'wide' : (val >= 26 ? 'narrow' : 'slim');
                      saveConfig({ ...config, customWidth: val, spineType: newType });
                    }}
                    className="w-16 text-center font-mono font-black text-sm text-indigo-700 bg-white border border-slate-300 rounded-lg py-1 outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-500 ml-1.5">mm</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentW = config.customWidth || 50;
                    const newW = Math.min(70, currentW + 1);
                    const newType = newW >= 42 ? 'wide' : (newW >= 26 ? 'narrow' : 'slim');
                    saveConfig({ ...config, customWidth: newW, spineType: newType });
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-base shadow-xs border border-slate-200 transition-colors"
                  title="1 mm genişlet"
                >
                  +
                </button>
              </div>
            </div>

            {/* Yükseklik */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Etiket Yüksekliği:
              </label>
              <div className="flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const currentH = config.customHeight || 190;
                    const newH = Math.max(150, currentH - 2);
                    saveConfig({ ...config, customHeight: newH });
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-base shadow-xs border border-slate-200 transition-colors"
                  title="2 mm kısalt"
                >
                  -
                </button>
                <div className="flex-1 flex items-center justify-center">
                  <input
                    type="number"
                    min={150}
                    max={210}
                    value={config.customHeight || 190}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 190;
                      saveConfig({ ...config, customHeight: val });
                    }}
                    className="w-16 text-center font-mono font-black text-sm text-indigo-700 bg-white border border-slate-300 rounded-lg py-1 outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-500 ml-1.5">mm</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentH = config.customHeight || 190;
                    const newH = Math.min(205, currentH + 2);
                    saveConfig({ ...config, customHeight: newH });
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-base shadow-xs border border-slate-200 transition-colors"
                  title="2 mm uzat"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
            <span className="font-semibold">A4 Sayfasına Sığan Etiket:</span>
            <span className="font-bold font-mono bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
              Sayfa Başına {itemsPerPage} Etiket ({pageCount} Sayfa)
            </span>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="button"
              onClick={() => setIsDimensionModalOpen(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4"
            >
              Tamamla ve Uygula
            </Button>
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
