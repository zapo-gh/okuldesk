import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BellRing,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Search,
  Trash2,
  Play,
  Pause,
  Square,
  RefreshCw,
  Calendar,
  CheckSquare,
  MessageSquare,
  Phone,
  AlertTriangle,
  History,
  Eye,
  Sliders,
  Info,
  X,
  Printer,
  Loader2,
  Layers,
  List
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../hooks/useConfirm';
import { PageHeader } from '../../components/ui/PageHeader';
import { ActionModal } from '../../components/ui/ActionModal';
import { Button } from '../../components/ui/Button';
import { printPdfBlob } from '../../utils/printPdf';

interface StudentParent {
  id: string;
  contactId?: string;
  fullName: string;
  relation: string;
  phone: string;
  waConsentStatus: 'ACCEPTED' | 'DECLINED' | 'PENDING';
  isPrimary?: boolean;
}

interface StudentItem {
  id: string;
  schoolNumber: string;
  fullName: string;
  className: string;
  status: string;
  parents: StudentParent[];
  selectedParentId?: string;
}

interface NotificationHistoryItem {
  id: string;
  studentId: string;
  studentName?: string;
  schoolNumber?: string;
  className?: string;
  date: string;
  sessionType: 'MORNING' | 'AFTERNOON' | 'FULL_DAY';
  parentName: string;
  parentPhone: string;
  message: string;
  status: 'SENT' | 'FAILED';
  errorMessage?: string;
  sentAt: string;
}

type SessionType = 'MORNING' | 'AFTERNOON' | 'FULL_DAY';

const SESSION_MAP: Record<SessionType, { label: string; text: string; icon: string }> = {
  MORNING: { label: 'Sabah İlk Ders', text: 'sabah ilk derste', icon: '☀️' },
  AFTERNOON: { label: 'Öğleden Sonra İlk Ders', text: 'öğleden sonra ilk derste', icon: '🌤️' },
  FULL_DAY: { label: 'Tam Gün', text: 'tam gün', icon: '📅' },
};

const DEFAULT_TEMPLATE = `Sayın Velimiz,

{okul_adi} idaresi olarak; {sinif} sınıfı {numara} numaralı öğrencimiz {ogrenci_adi}'in {tarih} tarihinde ({oturum}) okulda bulunmadığı tespit edilmiştir.

Öğrencimizin güvenliği ve eğitim sürecinin aksamaması adına durumu bilgilerinize sunarız.

İletişim: {okul_telefonu}`;

function normalizeTr(text: string): string {
  return (text || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .trim();
}

export default function DailyAbsenteeismPage() {
  const { settings } = useSettings();
  const { confirm, confirmModal } = useConfirm();

  // ── Global Parametreler ──
  const [targetDate, setTargetDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [sessionType, setSessionType] = useState<SessionType>(() => {
    const hour = new Date().getHours();
    const min = new Date().getMinutes();
    return hour + min / 60 >= 12.5 ? 'AFTERNOON' : 'MORNING';
  });

  // ── WhatsApp Bağlantı Durumu ──
  const [waStatus, setWaStatus] = useState<string>('checking');
  const checkWaStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setWaStatus(res.data?.data?.status || 'disconnected');
    } catch {
      setWaStatus('disconnected');
    }
  };

  useEffect(() => {
    checkWaStatus();
    const interval = setInterval(checkWaStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Aktif Sekme ──
  const [activeTab, setActiveTab] = useState<'express' | 'class'>('express');

  // ── Yöntem 1: Hızlı Numara Girişi ──
  const [expressInput, setExpressInput] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);

  // ── Yöntem 2: Sınıf Seçimi ──
  const [classes, setClasses] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classStudents, setClassStudents] = useState<StudentItem[]>([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState<boolean>(false);
  const [classSearchFilter, setClassSearchFilter] = useState<string>('');

  // ── Gönderim Kuyruğu ──
  const [queuedStudents, setQueuedStudents] = useState<StudentItem[]>([]);
  const [duplicateMap, setDuplicateMap] = useState<Record<string, string>>({});

  // ── Şablon & Ayarlar ──
  const [templateText, setTemplateText] = useState<string>(DEFAULT_TEMPLATE);
  const [showTemplateSettings, setShowTemplateSettings] = useState<boolean>(false);
  const [antiSpamEnabled, setAntiSpamEnabled] = useState<boolean>(true);
  const [antiSpamMinDelay, setAntiSpamMinDelay] = useState<number>(4);
  const [antiSpamMaxDelay, setAntiSpamMaxDelay] = useState<number>(7);

  // Ayarlardaki anlık devamsızlık şablonuyla senkronize et
  useEffect(() => {
    if (settings?.waTemplateDaily && settings.waTemplateDaily.trim()) {
      setTemplateText(settings.waTemplateDaily);
    }
  }, [settings?.waTemplateDaily]);

  // ── Geçmiş / Tarihçe ──
  const [historyList, setHistoryList] = useState<NotificationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historySessionFilter, setHistorySessionFilter] = useState<string>('ALL');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('ALL');
  const [historyViewMode, setHistoryViewMode] = useState<'grouped' | 'table'>('grouped');
  const [pdfGenerating, setPdfGenerating] = useState<boolean>(false);
  const [viewHistoryModalItem, setViewHistoryModalItem] = useState<NotificationHistoryItem | null>(null);

  // ── Canlı Gönderim Motoru State ──
  interface DispatchItem {
    student: StudentItem;
    parent: StudentParent;
    message: string;
    status: 'PENDING' | 'SENDING' | 'WAITING' | 'SENT' | 'FAILED' | 'SKIPPED';
    errorMessage?: string;
    sentTime?: string;
  }
  const [dispatchModalOpen, setDispatchModalOpen] = useState<boolean>(false);
  const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
  const [dispatchIndex, setDispatchIndex] = useState<number>(0);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [dispatchTicker, setDispatchTicker] = useState<string>('');
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // ── Sınıfları Yükle ──
  useEffect(() => {
    api.get('/students/classes')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setClasses(Array.isArray(list) ? list : []);
      })
      .catch(err => {
        console.error('Sınıflar yüklenemedi:', err);
        setClasses([]);
      });
  }, []);

  // ── Seçilen Sınıfın Öğrencilerini Getir ──
  useEffect(() => {
    if (!selectedClass) {
      setClassStudents([]);
      return;
    }
    setClassStudentsLoading(true);
    api.get(`/daily-absenteeism/students-by-class?className=${encodeURIComponent(selectedClass)}`)
      .then(res => {
        const list: StudentItem[] = (res.data?.students || []).map((s: any) => ({
          ...s,
          selectedParentId: s.primaryParentId || s.parents?.[0]?.id,
        }));
        setClassStudents(list);
      })
      .catch(err => {
        toast.error('Sınıf öğrencileri alınamadı: ' + (err.response?.data?.message || err.message));
      })
      .finally(() => {
        setClassStudentsLoading(false);
      });
  }, [selectedClass]);

  // ── Geçmiş Kayıtları Getir ──
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/daily-absenteeism/history?date=${targetDate}`);
      setHistoryList(res.data?.history || []);
    } catch (err: any) {
      console.error('Geçmiş yükleme hatası:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [targetDate]);

  // ── Mükerrer Gönderim Kontrolü ──
  const checkDuplicates = async (students: StudentItem[]) => {
    if (students.length === 0) return;
    try {
      const studentIds = students.map(s => s.id);
      const res = await api.post('/daily-absenteeism/check-duplicates', {
        date: targetDate,
        sessionType,
        studentIds,
      });
      const duplicates: Array<{ studentId: string; sentAt: string }> = res.data?.duplicates || [];
      const map: Record<string, string> = {};
      duplicates.forEach(d => {
        map[d.studentId] = d.sentAt;
      });
      setDuplicateMap(prev => ({ ...prev, ...map }));
    } catch (err) {
      console.error('Duplicate check hatası:', err);
    }
  };

  useEffect(() => {
    if (queuedStudents.length > 0) {
      checkDuplicates(queuedStudents);
    }
  }, [targetDate, sessionType, queuedStudents.length]);

  // ── Yöntem 1: Hızlı Numara Sorgulama ──
  const handleLookupExpressNumbers = async () => {
    const raw = expressInput.trim();
    if (!raw) {
      toast.error('Lütfen en az bir öğrenci numarası giriniz.');
      return;
    }
    const numbers = raw.split(/[\s,;\n\r]+/).map(n => n.trim()).filter(Boolean);
    if (numbers.length === 0) return;

    setLookupLoading(true);
    try {
      const res = await api.post('/daily-absenteeism/lookup-numbers', { numbers });
      const found: any[] = res.data?.found || [];
      const notFound: string[] = res.data?.notFound || [];

      if (found.length === 0) {
        toast.error(`Girilen numaralara (${numbers.join(', ')}) ait aktif öğrenci bulunamadı.`);
        return;
      }

      const newItems: StudentItem[] = found.map(s => ({
        ...s,
        selectedParentId: s.primaryParentId || s.parents?.[0]?.id,
      }));

      const existingIds = new Set(queuedStudents.map(s => s.id));
      const toAdd = newItems.filter(s => !existingIds.has(s.id));

      if (toAdd.length === 0) {
        toast('Bulunan tüm öğrenciler zaten gönderim kuyruğunda yer alıyor.', { icon: 'ℹ️' });
      } else {
        setQueuedStudents(prev => [...prev, ...toAdd]);
        checkDuplicates(toAdd);
        toast.success(`${toAdd.length} öğrenci gönderim kuyruğuna eklendi.`);
        setExpressInput('');
      }

      if (notFound.length > 0) {
        toast.error(`Bulunamayan numaralar: ${notFound.join(', ')}`, { duration: 5000 });
      }
    } catch (err: any) {
      toast.error('Numara sorgulama hatası: ' + (err.response?.data?.message || err.message));
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Sınıf Listesinden Tek Öğrenci Toggle ──
  const toggleStudentFromClass = (student: StudentItem) => {
    const exists = queuedStudents.some(s => s.id === student.id);
    if (exists) {
      setQueuedStudents(prev => prev.filter(s => s.id !== student.id));
    } else {
      setQueuedStudents(prev => [...prev, student]);
      checkDuplicates([student]);
    }
  };

  // ── Sınıftaki Tümünü Seç / Temizle ──
  const handleSelectAllInClass = () => {
    if (classStudents.length === 0) return;
    const existingMap = new Map(queuedStudents.map(s => [s.id, s]));
    classStudents.forEach(s => {
      if (!existingMap.has(s.id)) {
        existingMap.set(s.id, s);
      }
    });
    const updated = Array.from(existingMap.values());
    setQueuedStudents(updated);
    checkDuplicates(classStudents);
    toast.success(`${classStudents.length} öğrenci kuyruğa dahil edildi.`);
  };

  const handleClearAllInClass = () => {
    if (classStudents.length === 0) return;
    const classIds = new Set(classStudents.map(s => s.id));
    setQueuedStudents(prev => prev.filter(s => !classIds.has(s.id)));
  };

  // ── Kuyruktan Tek Öğrenci Çıkar ──
  const removeStudentFromQueue = (studentId: string) => {
    setQueuedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  // ── Kuyruktaki Tümünü Temizle ──
  const handleClearAllQueue = async () => {
    if (queuedStudents.length === 0) return;
    const ok = await confirm('Gönderim kuyruğundaki tüm öğrencileri listeden kaldırmak istediğinize emin misiniz?');
    if (!ok) return;
    setQueuedStudents([]);
  };

  // ── Hedef Veli Değiştir ──
  const handleParentChange = (studentId: string, parentId: string) => {
    setQueuedStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, selectedParentId: parentId } : s))
    );
  };

  // ── Mesaj Hazırlama Fonksiyonu ──
  const renderMessageForStudent = (student: StudentItem, parent: StudentParent, itemIndex = 0): string => {
    const schoolName = (settings?.schoolName || 'Okulumuz').trim();
    const schoolPhone = settings?.schoolPhone || '';
    const dateFormatted = targetDate.split('-').reverse().join('.');
    const sessionText = SESSION_MAP[sessionType]?.text || 'sabah ilk derste';

    let text = templateText;

    text = text.replace(/{okul_adi}/g, schoolName);
    text = text.replace(/{ogrenci_adi}/g, student.fullName);
    text = text.replace(/{numara}/g, student.schoolNumber);
    text = text.replace(/{sinif}/g, student.className);
    text = text.replace(/{veli_adi}/g, parent.fullName || 'Sayın Velimiz');
    text = text.replace(/{tarih}/g, dateFormatted);
    text = text.replace(/{oturum}/g, sessionText);
    text = text.replace(/{okul_telefonu}/g, schoolPhone || 'Okul İdaresi');

    if (antiSpamEnabled) {
      const greetings = [
        'Sayın Velimiz,',
        'Değerli Velimiz,',
        `Sayın ${parent.fullName},`,
        'Bilgilendirme:'
      ];
      const greetingChoice = greetings[itemIndex % greetings.length];
      if (text.startsWith('Sayın Velimiz,')) {
        text = text.replace('Sayın Velimiz,', greetingChoice);
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      text += `\n\n🕒 [Gönderim Kaydı: ${timeStr}]`;
    }

    return text;
  };

  // ── Sınıf Listesi Filtreleme ──
  const filteredClassStudents = useMemo(() => {
    if (!classSearchFilter.trim()) return classStudents;
    const q = normalizeTr(classSearchFilter);
    return classStudents.filter(s =>
      normalizeTr(s.fullName).includes(q) ||
      normalizeTr(s.schoolNumber).includes(q)
    );
  }, [classStudents, classSearchFilter]);

  // ── Gönderim Kuyruğu Başlatma Kontrolü ──
  const handleStartDispatch = () => {
    if (queuedStudents.length === 0) {
      toast.error('Gönderim kuyruğunda hiç öğrenci yok.');
      return;
    }

    if (waStatus !== 'connected') {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-rose-700">WhatsApp Bağlantısı Bulunamadı!</span>
          <span className="text-xs text-slate-600">
            Mesaj gönderebilmek için sol menüden WhatsApp oturumunun açık olması gerekir.
          </span>
          <div className="flex gap-2 mt-1">
            <Link
              to="/admin/whatsapp"
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium no-underline"
            >
              WhatsApp'a Bağlan
            </Link>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ), { duration: 6000 });
      return;
    }

    const items: DispatchItem[] = queuedStudents.map((s, idx) => {
      const parent = s.parents.find(p => p.id === s.selectedParentId) || s.parents[0] || {
        id: '',
        fullName: 'Veli Bilgisi Yok',
        relation: 'Veli',
        phone: '',
        waConsentStatus: 'PENDING',
      };
      const message = renderMessageForStudent(s, parent, idx);
      return {
        student: s,
        parent,
        message,
        status: 'PENDING',
      };
    });

    setDispatchItems(items);
    setDispatchIndex(0);
    setDispatchModalOpen(true);
    setIsDispatching(false);
    setIsPaused(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;
  };

  // ── Canlı Gönderim Döngüsü ──
  const runDispatchLoop = async () => {
    setIsDispatching(true);
    setIsPaused(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    for (let i = dispatchIndex; i < dispatchItems.length; i++) {
      if (isCancelledRef.current) {
        setDispatchTicker('Gönderim durduruldu.');
        setIsDispatching(false);
        break;
      }

      while (isPausedRef.current) {
        setDispatchTicker('⏸️ Gönderim duraklatıldı. Devam etmek için [Devam Et] butonuna tıklayın.');
        await new Promise(r => setTimeout(r, 500));
        if (isCancelledRef.current) break;
      }
      if (isCancelledRef.current) break;

      const item = dispatchItems[i];
      setDispatchIndex(i);

      if (!item.parent.phone) {
        setDispatchItems(prev => {
          const cp = [...prev];
          cp[i] = { ...cp[i], status: 'SKIPPED', errorMessage: 'Veli telefon numarası eksik' };
          return cp;
        });
        continue;
      }

      if (item.parent.waConsentStatus === 'DECLINED') {
        setDispatchItems(prev => {
          const cp = [...prev];
          cp[i] = { ...cp[i], status: 'SKIPPED', errorMessage: 'Veli WhatsApp bildirimlerini reddetti (KVKK)' };
          return cp;
        });
        continue;
      }

      setDispatchItems(prev => {
        const cp = [...prev];
        cp[i] = { ...cp[i], status: 'SENDING' };
        return cp;
      });
      setDispatchTicker(`🚀 [${item.student.schoolNumber} - ${item.student.fullName}] velisine mesaj iletiliyor...`);

      try {
        const res = await api.post('/daily-absenteeism/send-single', {
          studentId: item.student.id,
          date: targetDate,
          sessionType,
          parentName: item.parent.fullName,
          parentPhone: item.parent.phone,
          message: item.message,
        });

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (res.data?.success) {
          setDispatchItems(prev => {
            const cp = [...prev];
            cp[i] = { ...cp[i], status: 'SENT', sentTime: timeStr };
            return cp;
          });
        } else {
          setDispatchItems(prev => {
            const cp = [...prev];
            cp[i] = { ...cp[i], status: 'FAILED', errorMessage: res.data?.error || 'Gönderim başarısız' };
            return cp;
          });
        }
      } catch (err: any) {
        setDispatchItems(prev => {
          const cp = [...prev];
          cp[i] = {
            ...cp[i],
            status: 'FAILED',
            errorMessage: err.response?.data?.message || err.message || 'Sunucu hatası',
          };
          return cp;
        });
      }

      if (i < dispatchItems.length - 1 && !isCancelledRef.current) {
        const delayMs = antiSpamEnabled
          ? Math.floor(Math.random() * ((antiSpamMaxDelay - antiSpamMinDelay) * 1000 + 1)) + antiSpamMinDelay * 1000
          : 1500;

        let remaining = Math.round(delayMs / 1000);
        setCountdownSeconds(remaining);

        while (remaining > 0 && !isCancelledRef.current) {
          if (isPausedRef.current) break;
          setDispatchTicker(`⏳ Spam koruması: Sonraki veli için ${remaining} sn bekleniyor...`);
          await new Promise(r => setTimeout(r, 1000));
          remaining -= 1;
          setCountdownSeconds(remaining);
        }
        setCountdownSeconds(null);
      }
    }

    setIsDispatching(false);
    setDispatchTicker('✅ İşlem tamamlandı!');
    fetchHistory();
  };

  const handlePauseDispatch = () => {
    isPausedRef.current = true;
    setIsPaused(true);
  };

  const handleResumeDispatch = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    if (!isDispatching) {
      runDispatchLoop();
    }
  };

  const handleCancelDispatch = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setIsPaused(false);
    setIsDispatching(false);
    setDispatchTicker('Gönderim durduruldu.');
  };

  // ── Geçmiş Kayıt Silme (useConfirm İle) ──
  const handleDeleteHistory = async (id: string) => {
    const ok = await confirm('Bu bildirim kaydını geçmişten silmek istediğinize emin misiniz?');
    if (!ok) return;

    try {
      await api.delete(`/daily-absenteeism/history/${id}`);
      toast.success('Kayıt silindi.');
      setHistoryList(prev => prev.filter(h => h.id !== id));
    } catch (err: any) {
      toast.error('Silme hatası: ' + (err.response?.data?.message || err.message));
    }
  };

  // ── Geçmiş Filtreleme ──
  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      const matchSession = historySessionFilter === 'ALL' || item.sessionType === historySessionFilter;
      if (!matchSession) return false;
      const matchClass = historyClassFilter === 'ALL' || (item.className || 'Diğer') === historyClassFilter;
      if (!matchClass) return false;
      if (!historySearch.trim()) return true;
      const q = normalizeTr(historySearch);
      return (
        normalizeTr(item.studentName || '').includes(q) ||
        normalizeTr(item.schoolNumber || '').includes(q) ||
        normalizeTr(item.className || '').includes(q) ||
        normalizeTr(item.parentName || '').includes(q) ||
        normalizeTr(item.parentPhone || '').includes(q)
      );
    });
  }, [historyList, historySearch, historySessionFilter, historyClassFilter]);

  // ── Geçmişteki Benzersiz Sınıflar ──
  const historyAvailableClasses = useMemo(() => {
    const counts: Record<string, number> = {};
    historyList.forEach(item => {
      const cls = (item.className || 'Diğer').trim();
      counts[cls] = (counts[cls] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, 'tr-TR', { numeric: true }));
  }, [historyList]);

  // ── Sınıf Bazlı Gruplama ──
  const groupedHistory = useMemo(() => {
    const map: Record<string, NotificationHistoryItem[]> = {};
    filteredHistory.forEach(item => {
      const cls = (item.className || 'Diğer').trim();
      if (!map[cls]) map[cls] = [];
      map[cls].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'tr-TR', { numeric: true }));
  }, [filteredHistory]);

  // ── Günlük PDF Rapor İndir / Önizle ──
  const handleDownloadPdfReport = async () => {
    if (filteredHistory.length === 0) {
      toast.error('Rapor oluşturmak için seçili filtrede kayıtlı bildirim bulunmuyor.');
      return;
    }

    setPdfGenerating(true);
    const toastId = toast.loading('Günlük anlık devamsızlık raporu hazırlanıyor...');
    try {
      const res = await api.get('/daily-absenteeism/report/pdf', {
        params: {
          date: targetDate,
          sessionType: historySessionFilter,
          className: historyClassFilter,
        },
        responseType: 'blob',
      });

      const formattedDate = targetDate.split('-').reverse().join('.');
      printPdfBlob(res.data as Blob, {
        title: `${formattedDate} Günlük Devamsızlık Bildirim Çizelgesi`,
        subtitle: `${settings?.schoolName || 'Okul Müdürlüğü'} · Toplam ${filteredHistory.length} öğrencinin veli bilgilendirme kayıtları`,
        fileName: `Gunluk_Devamsizlik_Raporu_${targetDate}.pdf`,
        onOpenInSystem: async () => {
          await api.post('/daily-absenteeism/report/pdf/open', null, {
            params: {
              date: targetDate,
              sessionType: historySessionFilter,
              className: historyClassFilter,
            },
          });
        },
      });
      toast.success('Günlük devamsızlık PDF raporu açıldı.', { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'PDF rapor hazırlanırken hata oluştu.', { id: toastId });
    } finally {
      setPdfGenerating(false);
    }
  };

  // ── KVKK Rozet Yardımcısı ──
  const renderConsentBadge = (status: 'ACCEPTED' | 'DECLINED' | 'PENDING' | undefined) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="WhatsApp Açık Rıza Onaylı">
            ✅ Onaylı
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title="WhatsApp Bildirimi Reddedildi!">
            ❌ Reddedildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200" title="WhatsApp Onayı Bekliyor / Henüz Alınmadı">
            ⏳ Onaysız
          </span>
        );
    }
  };

  const completedCount = dispatchItems.filter(
    it => it.status === 'SENT' || it.status === 'FAILED' || it.status === 'SKIPPED'
  ).length;
  const dispatchProgress = dispatchItems.length > 0 ? Math.round((completedCount / dispatchItems.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Standart OkulDesk Başlığı (PageHeader) ── */}
      <PageHeader
        title="Anlık Devamsızlık Bildirimi (WhatsApp)"
        description="Ders yoklaması sonrası okula gelmeyen öğrencileri velilerine anında ve güvenle bildirin."
        icon={<BellRing size={26} className="text-white" />}
        actions={
          <div className="flex items-center gap-2.5">
            {waStatus === 'connected' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 rounded-lg text-xs font-semibold backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>WhatsApp Bağlı</span>
              </div>
            ) : (
              <Link
                to="/admin/whatsapp"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 border border-rose-400/30 rounded-lg text-xs font-semibold no-underline transition backdrop-blur-sm"
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>WhatsApp Bağlı Değil</span>
              </Link>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTemplateSettings(!showTemplateSettings)}
              leftIcon={<Sliders size={15} />}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs py-1.5 px-3"
            >
              {showTemplateSettings ? 'Ayarları Gizle' : 'Şablon & Spam Ayarları'}
            </Button>
          </div>
        }
      />

      {/* ── Şablon & Anti-Spam Ayarları Kartı ── */}
      {showTemplateSettings && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Bildirim Mesajı Şablonu ve Akıllı Spam Koruması</h3>
            </div>
            <button
              onClick={() => setTemplateText(DEFAULT_TEMPLATE)}
              className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline font-medium cursor-pointer"
            >
              Varsayılan Şablona Sıfırla
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Şablon Editörü */}
            <div className="lg:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Mesaj Şablonu:
              </label>
              <textarea
                value={templateText}
                onChange={e => setTemplateText(e.target.value)}
                rows={6}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                placeholder="Mesaj metnini giriniz..."
              />
              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Etiketler:</span>
                {['{ogrenci_adi}', '{numara}', '{sinif}', '{veli_adi}', '{tarih}', '{oturum}', '{okul_adi}', '{okul_telefonu}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTemplateText(p => p + ' ' + tag)}
                    className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer font-mono text-[10px]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Anti-Spam Yapılandırması */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Akıllı Anti-Spam Koruması</span>
                </div>
                <input
                  type="checkbox"
                  checked={antiSpamEnabled}
                  onChange={e => setAntiSpamEnabled(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                WhatsApp hesabınızın ardışık bildirimlerde bot/spam filtresine takılmasını önlemek için dinamik hitap varyasyonu, benzersiz zaman damgası ve insansı gecikme uygular.
              </p>

              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">Mesajlar Arası Bekleme Süresi:</span>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={antiSpamMinDelay}
                    onChange={e => setAntiSpamMinDelay(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-14 bg-white border border-slate-300 rounded px-2 py-1 text-center text-slate-800 font-semibold"
                  />
                  <span className="text-slate-500">ile</span>
                  <input
                    type="number"
                    min={4}
                    max={25}
                    value={antiSpamMaxDelay}
                    onChange={e => setAntiSpamMaxDelay(Math.max(antiSpamMinDelay + 1, parseInt(e.target.value) || 7))}
                    className="w-14 bg-white border border-slate-300 rounded px-2 py-1 text-center text-slate-800 font-semibold"
                  />
                  <span className="text-slate-500">saniye arası (Rastgele)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tarih & Devamsızlık Zamanı Barı ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Tarih */}
        <div className="md:col-span-4 flex items-center gap-3">
          <Calendar size={20} className="text-indigo-600 shrink-0" />
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Yoklama Tarihi</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Oturum / Ders Seçimi */}
        <div className="md:col-span-8 flex flex-col sm:flex-row sm:items-center justify-end gap-2.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start sm:self-center mr-1">
            Devamsızlık Zamanı:
          </span>
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
            {(Object.keys(SESSION_MAP) as SessionType[]).map(key => {
              const opt = SESSION_MAP[key];
              const isActive = sessionType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSessionType(key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Ana İçerik: 2 Kolonlu Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── SOL SÜTUN: Öğrenci Seçimi ── */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          {/* Sekme Butonları */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveTab('express')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'express'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Send size={15} />
              <span>Hızlı Numara Girişi</span>
            </button>
            <button
              onClick={() => setActiveTab('class')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'class'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users size={15} />
              <span>Sınıf Listesinden Seçim</span>
            </button>
          </div>

          {/* ── TAB 1: HIZLI NUMARA GİRİŞİ ── */}
          {activeTab === 'express' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Gelmeyen Öğrenci Numaralarını Giriniz:
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Virgül, boşluk veya alt alta</span>
                </div>
                <textarea
                  value={expressInput}
                  onChange={e => setExpressInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      handleLookupExpressNumbers();
                    }
                  }}
                  rows={4}
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors font-mono"
                  placeholder="Örnek: 102, 345, 876 veya Excel'den kopyalanan liste..."
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">
                    İpucu: <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-mono">Ctrl + Enter</kbd> ile hızlı ekleyebilirsiniz.
                  </span>
                  <Button
                    type="button"
                    onClick={handleLookupExpressNumbers}
                    disabled={lookupLoading || !expressInput.trim()}
                    variant="primary"
                    leftIcon={lookupLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                    className="text-xs py-2 px-4 shrink-0"
                  >
                    {lookupLoading ? 'Sorgulanıyor...' : 'Sorgula ve Listeye Ekle'}
                  </Button>
                </div>
              </div>

              {/* Bilgi Kutusu */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong className="text-blue-950 block mb-0.5">Toplu Hızlı Giriş Kolaylığı:</strong>
                  Yoklama fişinden veya nöbetçi idareci listesinden numaraları doğrudan buraya yapıştırıp listeye ekleyebilirsiniz. Sistem öğrencileri sınıfları ve 1. öncelikli velileriyle anında eşleştirecektir.
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: SINIF LİSTESİNDEN SEÇİM ── */}
          {activeTab === 'class' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Sınıf Seçici Dropdown */}
                <div className="flex-1">
                  <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Sınıf Seçiniz --</option>
                    {classes.map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.count} Öğrenci)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sınıf İçi Arama */}
                {selectedClass && (
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Sınıf içinde ara (İsim veya No)..."
                      value={classSearchFilter}
                      onChange={e => setClassSearchFilter(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Sınıf Seçili Değilse */}
              {!selectedClass && (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users size={32} className="mx-auto text-slate-400 mb-2 opacity-60" />
                  <p className="text-sm font-medium text-slate-700">Lütfen yukarıdan bir sınıf seçin</p>
                  <p className="text-xs text-slate-500 mt-1">Sınıfı seçtikten sonra gelmeyen öğrencileri tıklayarak işaretleyebilirsiniz.</p>
                </div>
              )}

              {/* Sınıf Seçiliyken Liste */}
              {selectedClass && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                    <span>
                      Sınıf Mevcudu: <strong className="text-slate-800">{filteredClassStudents.length}</strong> öğrenci
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllInClass}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckSquare size={13} /> Sınıftaki Tümünü Seç
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearAllInClass}
                        className="text-xs text-slate-500 hover:text-rose-600 font-medium hover:underline cursor-pointer"
                      >
                        Seçimi Temizle
                      </button>
                    </div>
                  </div>

                  {classStudentsLoading ? (
                    <div className="flex items-center justify-center py-12 text-slate-500">
                      <RefreshCw size={20} className="animate-spin text-indigo-600 mr-2" />
                      <span className="text-xs">Öğrenciler yükleniyor...</span>
                    </div>
                  ) : filteredClassStudents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      Aramaya uygun öğrenci bulunamadı.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
                      {filteredClassStudents.map(student => {
                        const isQueued = queuedStudents.some(s => s.id === student.id);
                        const primaryParent = student.parents?.[0];
                        return (
                          <div
                            key={student.id}
                            onClick={() => toggleStudentFromClass(student)}
                            className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between gap-1.5 select-none ${
                              isQueued
                                ? 'bg-rose-50/90 border-rose-300 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                                    {student.schoolNumber}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 truncate">
                                    {student.fullName}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                  {primaryParent?.fullName || 'Veli yok'} • {primaryParent?.phone || 'Tel yok'}
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isQueued ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded">
                                    <X size={11} /> Gelmedi
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[10px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded">
                                    Seç
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                              <span className="text-slate-500 font-medium text-[10px]">{student.className}</span>
                              {renderConsentBadge(primaryParent?.waConsentStatus)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SAĞ SÜTUN: Gönderilecek Öğrenciler (Kompakt Liste) ── */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3.5 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full flex items-center justify-center">
                {queuedStudents.length}
              </span>
              <h2 className="text-sm font-bold text-slate-800">Gönderilecek Öğrenciler</h2>
            </div>
            {queuedStudents.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllQueue}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} /> Tümünü Temizle
              </button>
            )}
          </div>

          {/* Kuyruk Boşsa */}
          {queuedStudents.length === 0 ? (
            <div className="text-center py-16 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <BellRing size={32} className="mx-auto text-slate-400 opacity-60" />
              <p className="text-xs font-bold text-slate-700">Henüz öğrenci seçilmedi</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Soldaki panelden öğrenci numaralarını yapıştırarak veya sınıf listesinden tıklayarak listeye ekleyin.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-slate-100 bg-white">
                {queuedStudents.map(student => {
                  const targetParent =
                    student.parents.find(p => p.id === student.selectedParentId) ||
                    student.parents[0] || {
                      id: '',
                      fullName: 'Veli Bilgisi Yok',
                      relation: 'Veli',
                      phone: '',
                      waConsentStatus: 'PENDING',
                    };

                  const duplicateTime = duplicateMap[student.id];

                  return (
                    <div
                      key={student.id}
                      className="p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      {/* Sol: No & İsim */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono font-bold text-indigo-700 text-xs">
                            {student.schoolNumber}
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {student.fullName}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded shrink-0">
                            {student.className}
                          </span>
                        </div>

                        {/* Veli & Telefon */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                          {student.parents.length > 1 ? (
                            <select
                              value={targetParent.id}
                              onChange={e => handleParentChange(student.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] text-slate-700 font-medium"
                            >
                              {student.parents.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.fullName} ({p.relation})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="truncate font-medium text-slate-700">
                              {targetParent.fullName}
                            </span>
                          )}

                          <span className="font-mono text-slate-500 text-[10px] shrink-0">
                            {targetParent.phone || 'Tel yok'}
                          </span>
                        </div>
                      </div>

                      {/* Sağ: Rozetler & Silme */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          {renderConsentBadge(targetParent.waConsentStatus)}
                          {duplicateTime && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded"
                              title={`Bugün ${SESSION_MAP[sessionType]?.label} için daha önce mesaj gönderilmiş.`}
                            >
                              <AlertTriangle size={9} /> Bildirildi
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeStudentFromQueue(student.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Listeden Çıkar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Alt Gönderim Butonu */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleStartDispatch}
                  leftIcon={<Send size={15} />}
                  className="w-full py-2.5 justify-center text-xs font-bold"
                >
                  WhatsApp Bildirimlerini Başlat ({queuedStudents.length} Öğrenci)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CANLI GÖNDERİM MODALI (Standart ActionModal İle) ── */}
      <ActionModal
        isOpen={dispatchModalOpen}
        onClose={() => {
          if (!isDispatching) {
            setDispatchModalOpen(false);
            const sentIds = new Set(
              dispatchItems.filter(it => it.status === 'SENT').map(it => it.student.id)
            );
            setQueuedStudents(prev => prev.filter(s => !sentIds.has(s.id)));
          }
        }}
        title="WhatsApp Devamsızlık Bildirimi Gönderimi"
        width="xl"
        hideFooter={true}
      >
        <div className="space-y-4 py-1">
          {/* Oturum & Tarih Bilgisi */}
          <div className="flex items-center justify-between text-xs text-slate-600 pb-2 border-b border-slate-100">
            <span>Zaman: <strong className="text-slate-800">{SESSION_MAP[sessionType]?.label}</strong></span>
            <span>Tarih: <strong className="text-slate-800">{targetDate}</strong></span>
          </div>

          {/* İlerleme Çubuğu */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                İlerleme: <strong className="text-slate-800">{completedCount}</strong> / {dispatchItems.length} tamamlandı
              </span>
              <span className="font-bold text-indigo-600">%{dispatchProgress}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${dispatchProgress}%` }}
              />
            </div>
          </div>

          {/* Canlı Ticker */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              {isDispatching ? (
                <RefreshCw size={14} className="animate-spin text-indigo-600 shrink-0" />
              ) : (
                <Info size={14} className="text-slate-400 shrink-0" />
              )}
              <span className="truncate text-slate-700 font-mono text-[11px]">
                {dispatchTicker || 'Gönderime hazır. Başlat butonuna basınız.'}
              </span>
            </div>
            {countdownSeconds !== null && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold text-[10px] shrink-0 border border-amber-200">
                {countdownSeconds}s
              </span>
            )}
          </div>

          {/* Kuyruk Listesi */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
            {dispatchItems.map(item => (
              <div
                key={item.student.id}
                className="p-2 rounded border border-slate-200/80 bg-white flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded text-[10px] font-bold">
                    {item.student.schoolNumber}
                  </span>
                  <span className="font-bold text-slate-800">{item.student.fullName}</span>
                  <span className="text-[11px] text-slate-500">({item.parent.fullName})</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.status === 'PENDING' && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock size={11} /> Bekliyor
                    </span>
                  )}
                  {item.status === 'SENDING' && (
                    <span className="text-[10px] text-indigo-600 flex items-center gap-1 font-semibold">
                      <RefreshCw size={11} className="animate-spin" /> İletiliyor...
                    </span>
                  )}
                  {item.status === 'SENT' && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Gönderildi ({item.sentTime})
                    </span>
                  )}
                  {item.status === 'FAILED' && (
                    <span
                      className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 cursor-help"
                      title={item.errorMessage}
                    >
                      <XCircle size={11} /> Hata
                    </span>
                  )}
                  {item.status === 'SKIPPED' && (
                    <span
                      className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 cursor-help"
                      title={item.errorMessage}
                    >
                      <AlertCircle size={11} /> Atlandı
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {!isDispatching && completedCount < dispatchItems.length && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={runDispatchLoop}
                  leftIcon={<Play size={14} />}
                  className="text-xs"
                >
                  Gönderimi Başlat
                </Button>
              )}

              {isDispatching && !isPaused && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePauseDispatch}
                  leftIcon={<Pause size={14} />}
                  className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  Duraklat
                </Button>
              )}

              {isPaused && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleResumeDispatch}
                  leftIcon={<Play size={14} />}
                  className="text-xs"
                >
                  Devam Et
                </Button>
              )}

              {isDispatching && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelDispatch}
                  leftIcon={<Square size={14} />}
                  className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                >
                  Durdur / İptal Et
                </Button>
              )}
            </div>

            {!isDispatching && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDispatchModalOpen(false);
                  const sentIds = new Set(
                    dispatchItems.filter(it => it.status === 'SENT').map(it => it.student.id)
                  );
                  setQueuedStudents(prev => prev.filter(s => !sentIds.has(s.id)));
                }}
                className="text-xs"
              >
                Kapat ve Kuyruğu Güncelle
              </Button>
            )}
          </div>
        </div>
      </ActionModal>

      {/* ── ALT BÖLÜM: Günlük Bildirim Geçmişi (Tarihçe) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <History size={18} className="text-indigo-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Günlük WhatsApp Bildirim Geçmişi</h3>
                <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  {filteredHistory.length} Kayıt
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {targetDate.split('-').reverse().join('.')} tarihinde velilere iletilen anlık devamsızlık bildirimleri
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sınıf Filtresi */}
            <select
              value={historyClassFilter}
              onChange={e => setHistoryClassFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              title="Sınıfa göre filtrele"
            >
              <option value="ALL">Tüm Sınıflar ({historyList.length})</option>
              {historyAvailableClasses.map(([cls, count]) => (
                <option key={cls} value={cls}>
                  {cls} Sınıfı ({count})
                </option>
              ))}
            </select>

            {/* Oturum Filtresi */}
            <select
              value={historySessionFilter}
              onChange={e => setHistorySessionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              title="Oturuma göre filtrele"
            >
              <option value="ALL">Tüm Zamanlar</option>
              <option value="MORNING">Sabah İlk Ders</option>
              <option value="AFTERNOON">Öğleden Sonra İlk Ders</option>
              <option value="FULL_DAY">Tam Gün</option>
            </select>

            {/* Arama Kutusu */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Öğrenci, veli ara..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-36"
              />
            </div>

            {/* Görünüm Modu Değiştirici */}
            <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setHistoryViewMode('grouped')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  historyViewMode === 'grouped'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sınıflara göre gruplandırılmış görünüm"
              >
                <Layers size={13} />
                <span>Sınıf Bazlı</span>
              </button>
              <button
                type="button"
                onClick={() => setHistoryViewMode('table')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  historyViewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Düz liste görünümü"
              >
                <List size={13} />
                <span>Düz Liste</span>
              </button>
            </div>

            {/* Günlük PDF Rapor İndir Butonu */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdfReport}
              disabled={pdfGenerating || filteredHistory.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-700 bg-indigo-50/80 border-indigo-200 hover:bg-indigo-100 cursor-pointer"
              title="Günlük bildirilen tüm öğrencilerin resmi MEB PDF çizelgesini indir/yazdır"
            >
              {pdfGenerating ? <Loader2 size={13} className="animate-spin text-indigo-600" /> : <Printer size={13} />}
              <span>Günlük PDF Rapor</span>
            </Button>

            {/* Yenile Butonu */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              title="Yenile"
              className="p-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={historyLoading ? 'animate-spin text-indigo-600' : ''} />
            </Button>
          </div>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <RefreshCw size={20} className="animate-spin text-indigo-600 mr-2" />
            <span className="text-xs">Geçmiş yükleniyor...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
            {targetDate} tarihinde gönderilmiş herhangi bir bildirim bulunamadı.
          </div>
        ) : historyViewMode === 'grouped' ? (
          /* ── Sınıf Bazlı Gruplu Görünüm ── */
          <div className="space-y-4">
            {groupedHistory.map(([clsName, classRows]) => {
              const classSent = classRows.filter(r => r.status === 'SENT').length;
              const classFailed = classRows.length - classSent;
              return (
                <div key={clsName} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  {/* Sınıf Kart Başlığı */}
                  <div className="bg-slate-50/95 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs bg-indigo-100/70 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                        {clsName} Sınıfı
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        ({classRows.length} Öğrenci)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> {classSent} İletildi
                      </span>
                      {classFailed > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          <XCircle size={12} /> {classFailed} Başarısız
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sınıf Öğrenci Tablosu */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2 px-3 w-16">Saat</th>
                          <th className="py-2 px-3 w-20">Okul No</th>
                          <th className="py-2 px-3">Öğrenci Adı Soyadı</th>
                          <th className="py-2 px-3">Oturum</th>
                          <th className="py-2 px-3">Veli ve Telefon</th>
                          <th className="py-2 px-3 w-24">Durum</th>
                          <th className="py-2 px-3 text-right w-16">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classRows.map(row => {
                          const sentTimeStr = new Date(row.sentAt).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          return (
                            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 font-mono text-slate-600">{sentTimeStr}</td>
                              <td className="py-2 px-3 font-mono font-bold text-indigo-700">{row.schoolNumber || '-'}</td>
                              <td className="py-2 px-3 font-bold text-slate-800">{row.studentName || 'Bilinmiyor'}</td>
                              <td className="py-2 px-3">
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
                                  {SESSION_MAP[row.sessionType]?.icon} {SESSION_MAP[row.sessionType]?.label || row.sessionType}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-slate-800 font-semibold">{row.parentName || '-'}</span>
                                <span className="text-[10px] text-slate-500 font-mono ml-1.5">({row.parentPhone})</span>
                              </td>
                              <td className="py-2 px-3">
                                {row.status === 'SENT' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 size={11} /> Başarılı
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full cursor-help"
                                    title={row.errorMessage || 'Hata oluştu'}
                                  >
                                    <XCircle size={11} /> Başarısız
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setViewHistoryModalItem(row)}
                                    className="p-1 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                    title="Mesajı İncele"
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteHistory(row.id)}
                                    className="p-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Kaydı Sil"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Düz Liste Görünümü ── */
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Saat</th>
                  <th className="py-2.5 px-3">Öğrenci No</th>
                  <th className="py-2.5 px-3">Adı Soyadı</th>
                  <th className="py-2.5 px-3">Sınıf</th>
                  <th className="py-2.5 px-3">Zaman</th>
                  <th className="py-2.5 px-3">Veli Bilgisi</th>
                  <th className="py-2.5 px-3">Durum</th>
                  <th className="py-2.5 px-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map(row => {
                  const sentTimeStr = new Date(row.sentAt).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-600">{sentTimeStr}</td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700">{row.schoolNumber || '-'}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">{row.studentName || 'Bilinmiyor'}</td>
                      <td className="py-2 px-3 text-slate-600 font-medium">{row.className || '-'}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
                          {SESSION_MAP[row.sessionType]?.icon} {SESSION_MAP[row.sessionType]?.label || row.sessionType}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-slate-800 font-semibold">{row.parentName || '-'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{row.parentPhone}</div>
                      </td>
                      <td className="py-2 px-3">
                        {row.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} /> Başarılı
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full cursor-help"
                            title={row.errorMessage || 'Hata oluştu'}
                          >
                            <XCircle size={11} /> Başarısız
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewHistoryModalItem(row)}
                            className="p-1 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Mesajı İncele"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHistory(row.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Kaydı Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mesaj Detayı Modalı (Standart ActionModal İle) ── */}
      <ActionModal
        isOpen={Boolean(viewHistoryModalItem)}
        onClose={() => setViewHistoryModalItem(null)}
        title="İletilen WhatsApp Mesajı"
        width="lg"
        hideFooter={true}
      >
        {viewHistoryModalItem && (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Öğrenci: <strong className="text-slate-800">{viewHistoryModalItem.studentName}</strong></span>
                <span>Tarih: <strong className="text-slate-800">{viewHistoryModalItem.date}</strong></span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Veli: <strong className="text-slate-800">{viewHistoryModalItem.parentName} ({viewHistoryModalItem.parentPhone})</strong></span>
                <span>Zaman: <strong className="text-slate-800">{SESSION_MAP[viewHistoryModalItem.sessionType]?.label}</strong></span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {viewHistoryModalItem.message}
            </div>

            {viewHistoryModalItem.errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                <strong>Hata Detayı:</strong> {viewHistoryModalItem.errorMessage}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                variant="primary"
                onClick={() => setViewHistoryModalItem(null)}
                className="text-xs"
              >
                Kapat
              </Button>
            </div>
          </div>
        )}
      </ActionModal>

      {/* ── Standart OkulDesk Onay Modalı (useConfirm) ── */}
      {confirmModal}
    </div>
  );
}
