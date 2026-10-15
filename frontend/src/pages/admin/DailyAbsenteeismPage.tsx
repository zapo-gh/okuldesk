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
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Filter,
  CheckSquare,
  SquareCheck,
  MessageSquare,
  Phone,
  AlertTriangle,
  History,
  Check,
  Eye,
  Sliders,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

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
  alreadySentTime?: string;
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
  MORNING: { label: 'Sabah (1. Oturum)', text: 'Sabah 1. Oturum', icon: '☀️' },
  AFTERNOON: { label: 'Öğleden Sonra (2. Oturum)', text: 'Öğleden Sonra 2. Oturum', icon: '🌤️' },
  FULL_DAY: { label: 'Tam Gün', text: 'Tam Gün', icon: '📅' },
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

  // ── Aktif Sekme (Öğrenci Seçim Yöntemi) ──
  const [activeTab, setActiveTab] = useState<'express' | 'class'>('express');

  // ── Yöntem 1: Hızlı Numara Girişi State ──
  const [expressInput, setExpressInput] = useState<string>('');
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);

  // ── Yöntem 2: Sınıf Seçimi State ──
  const [classes, setClasses] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classStudents, setClassStudents] = useState<StudentItem[]>([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState<boolean>(false);
  const [classSearchFilter, setClassSearchFilter] = useState<string>('');

  // ── Gönderim Kuyruğu (Seçilen Öğrenciler) ──
  const [queuedStudents, setQueuedStudents] = useState<StudentItem[]>([]);
  const [duplicateMap, setDuplicateMap] = useState<Record<string, string>>({}); // studentId -> sentAt

  // ── Şablon & Ayarlar ──
  const [templateText, setTemplateText] = useState<string>(DEFAULT_TEMPLATE);
  const [showTemplateSettings, setShowTemplateSettings] = useState<boolean>(false);
  const [antiSpamEnabled, setAntiSpamEnabled] = useState<boolean>(true);
  const [antiSpamMinDelay, setAntiSpamMinDelay] = useState<number>(4);
  const [antiSpamMaxDelay, setAntiSpamMaxDelay] = useState<number>(7);

  // ── Geçmiş / Tarihçe ──
  const [historyList, setHistoryList] = useState<NotificationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historySessionFilter, setHistorySessionFilter] = useState<string>('ALL');
  const [viewHistoryModalItem, setViewHistoryModalItem] = useState<NotificationHistoryItem | null>(null);

  // ── Canlı Gönderim Motoru (Modal) State ──
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

  // Gönderim motoru ref'leri (durdurma ve duraklatma için)
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // ── Sınıfları Yükle ──
  useEffect(() => {
    api.get('/students/classes')
      .then(res => {
        setClasses(res.data || []);
      })
      .catch(err => {
        console.error('Sınıflar yüklenemedi:', err);
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

  // ── Tekrar Gönderim (Duplicate) Kontrolü ──
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

  // ── Yöntem 1: Numaraları Sorgula ve Kuyruğa Ekle ──
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

      // Zaten kuyrukta olanları tekrar ekleme
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

  // ── Kuyruktaki Öğrencinin Hedef Velisini Değiştir ──
  const handleParentChange = (studentId: string, parentId: string) => {
    setQueuedStudents(prev =>
      prev.map(s => (s.id === studentId ? { ...s, selectedParentId: parentId } : s))
    );
  };

  // ── Mesaj Hazırlama Fonksiyonu (Dinamik Etiketler + Anti-Spam Değişkenleri) ──
  const renderMessageForStudent = (student: StudentItem, parent: StudentParent, itemIndex = 0): string => {
    const schoolName = (settings?.schoolName || 'Okulumuz').trim();
    const schoolPhone = settings?.schoolPhone || '';
    const dateFormatted = targetDate.split('-').reverse().join('.');
    const sessionText = SESSION_MAP[sessionType]?.text || 'Ders Yoklaması';

    let text = templateText;

    // Temel etiket değişimi
    text = text.replace(/{okul_adi}/g, schoolName);
    text = text.replace(/{ogrenci_adi}/g, student.fullName);
    text = text.replace(/{numara}/g, student.schoolNumber);
    text = text.replace(/{sinif}/g, student.className);
    text = text.replace(/{veli_adi}/g, parent.fullName || 'Sayın Velimiz');
    text = text.replace(/{tarih}/g, dateFormatted);
    text = text.replace(/{oturum}/g, sessionText);
    text = text.replace(/{okul_telefonu}/g, schoolPhone || 'Okul İdaresi');

    // Anti-Spam Koruması: Metin içi mikro-farklılıklar ve zaman etiketi
    if (antiSpamEnabled) {
      // 1. Hitap çeşitliliği (eğer şablonda Sayın Velimiz ile başlıyorsa)
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

      // 2. Mesaj sonuna benzersiz zaman etiketi ekle (WhatsApp hash çakışmasını ve bot filtresini %100 engeller)
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

  // ── Gönderim Kuyruğu Başlatma Öncesi Kontrol ──
  const handleStartDispatch = () => {
    if (queuedStudents.length === 0) {
      toast.error('Gönderim kuyruğunda hiç öğrenci yok.');
      return;
    }

    if (waStatus !== 'connected') {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-rose-300">WhatsApp Bağlantısı Bulunamadı!</span>
          <span className="text-xs text-slate-300">
            Mesaj gönderebilmek için WhatsApp oturumunun açık olması gerekir.
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
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ), { duration: 6000 });
      return;
    }

    // Gönderim listesini hazırla
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
      // İptal kontrolü
      if (isCancelledRef.current) {
        setDispatchTicker('Gönderim kullanıcı tarafından durduruldu.');
        setIsDispatching(false);
        break;
      }

      // Duraklatma kontrolü
      while (isPausedRef.current) {
        setDispatchTicker('⏸️ Gönderim duraklatıldı. Devam etmek için [Devam Et] butonuna tıklayın.');
        await new Promise(r => setTimeout(r, 500));
        if (isCancelledRef.current) break;
      }
      if (isCancelledRef.current) break;

      const item = dispatchItems[i];
      setDispatchIndex(i);

      // Telefon kontrolü
      if (!item.parent.phone) {
        setDispatchItems(prev => {
          const cp = [...prev];
          cp[i] = { ...cp[i], status: 'SKIPPED', errorMessage: 'Veli telefon numarası eksik' };
          return cp;
        });
        continue;
      }

      // Veli WhatsApp ret durumu
      if (item.parent.waConsentStatus === 'DECLINED') {
        setDispatchItems(prev => {
          const cp = [...prev];
          cp[i] = { ...cp[i], status: 'SKIPPED', errorMessage: 'Veli WhatsApp bildirimlerini reddetti (KVKK)' };
          return cp;
        });
        continue;
      }

      // Gönderiliyor durumuna al
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

      // Son eleman değilse ve anti-spam devredeyse insansı bekleme süresi uygula
      if (i < dispatchItems.length - 1 && !isCancelledRef.current) {
        const delayMs = antiSpamEnabled
          ? Math.floor(Math.random() * ((antiSpamMaxDelay - antiSpamMinDelay) * 1000 + 1)) + antiSpamMinDelay * 1000
          : 1500;

        let remaining = Math.round(delayMs / 1000);
        setCountdownSeconds(remaining);

        while (remaining > 0 && !isCancelledRef.current) {
          if (isPausedRef.current) {
            break;
          }
          setDispatchTicker(`⏳ Spam koruması: Sonraki veli için ${remaining} sn bekleniyor...`);
          await new Promise(r => setTimeout(r, 1000));
          remaining -= 1;
          setCountdownSeconds(remaining);
        }
        setCountdownSeconds(null);
      }
    }

    setIsDispatching(false);
    setDispatchTicker('✅ Tüm kuyruk tamamlandı!');
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

  // ── Geçmiş Kayıt Silme ──
  const handleDeleteHistory = async (id: string) => {
    if (!window.confirm('Bu bildirim kaydını geçmişten silmek istediğinize emin misiniz?')) return;
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
  }, [historyList, historySearch, historySessionFilter]);

  // ── KVKK Rozet Yardımcısı ──
  const renderConsentBadge = (status: 'ACCEPTED' | 'DECLINED' | 'PENDING' | undefined) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full" title="Veli WhatsApp ile bilgilendirmeyi açıkça onaylamıştır.">
            <CheckCircle2 size={12} /> Onaylı
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full" title="Veli WhatsApp bildirimini reddetmiştir. Mesaj gönderilmeyecektir.">
            <XCircle size={12} /> Reddedildi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full" title="Veli henüz onay vermemiştir.">
            <Clock size={12} /> Onaysız
          </span>
        );
    }
  };

  // ── Canlı Gönderim İlerleme Yüzdesi ──
  const completedCount = dispatchItems.filter(
    it => it.status === 'SENT' || it.status === 'FAILED' || it.status === 'SKIPPED'
  ).length;
  const dispatchProgress = dispatchItems.length > 0 ? Math.round((completedCount / dispatchItems.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 pb-20 space-y-6">
      {/* ── Üst Başlık & Durum Çubuğu ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
            <BellRing size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Anlık / Günlük Devamsızlık Bildirimi
              </h1>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                WhatsApp
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Sabah ve öğleden sonra yoklamalarında gelmeyen öğrencileri velilerine anında ve güvenle bildirin.
            </p>
          </div>
        </div>

        {/* WhatsApp Durum Rozeti */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          {waStatus === 'connected' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>WhatsApp Bağlı (Hazır)</span>
            </div>
          ) : (
            <Link
              to="/admin/whatsapp"
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 hover:text-white hover:bg-rose-500/25 transition-all text-xs font-medium no-underline shadow-sm"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>WhatsApp Bağlı Değil (Bağlan)</span>
            </Link>
          )}

          <button
            onClick={() => setShowTemplateSettings(!showTemplateSettings)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              showTemplateSettings
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <Sliders size={14} />
            <span>Şablon & Spam Ayarları</span>
            {showTemplateSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* ── Şablon & Anti-Spam Ayarları Çekmecesi (Açılır/Kapanır) ── */}
      {showTemplateSettings && (
        <div className="bg-slate-900/90 border border-indigo-500/30 p-5 rounded-2xl shadow-2xl backdrop-blur-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-400" />
              <h3 className="text-base font-semibold text-white">Bildirim Mesajı Şablonu ve Akıllı Spam Koruması</h3>
            </div>
            <button
              onClick={() => setTemplateText(DEFAULT_TEMPLATE)}
              className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              Varsayılan Şablona Sıfırla
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Şablon Editörü */}
            <div className="lg:col-span-2 space-y-2">
              <label className="text-xs font-medium text-slate-300 block">
                Mesaj Şablonu (Kullanılabilir etiketler aşağıdadır):
              </label>
              <textarea
                value={templateText}
                onChange={e => setTemplateText(e.target.value)}
                rows={7}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Mesaj metnini giriniz..."
              />
              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Etiketler:</span>
                <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => setTemplateText(p => p + ' {ogrenci_adi}')}>
                  {'{ogrenci_adi}'}
                </code>
                <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => setTemplateText(p => p + ' {numara}')}>
                  {'{numara}'}
                </code>
                <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => setTemplateText(p => p + ' {sinif}')}>
                  {'{sinif}'}
                </code>
                <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => setTemplateText(p => p + ' {veli_adi}')}>
                  {'{veli_adi}'}
                </code>
                <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => setTemplateText(p => p + ' {tarih}')}>
                  {'{tarih}'}
                </code>
                <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => setTemplateText(p => p + ' {oturum}')}>
                  {'{oturum}'}
                </code>
                <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => setTemplateText(p => p + ' {okul_adi}')}>
                  {'{okul_adi}'}
                </code>
                <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded cursor-pointer" onClick={() => setTemplateText(p => p + ' {okul_telefonu}')}>
                  {'{okul_telefonu}'}
                </code>
              </div>
            </div>

            {/* Anti-Spam Yapılandırması */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Akıllı Anti-Spam</span>
                </div>
                <input
                  type="checkbox"
                  checked={antiSpamEnabled}
                  onChange={e => setAntiSpamEnabled(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                WhatsApp hesabınızın toplu gönderimlerde spam engeline takılmasını önlemek için dinamik hitap varyasyonu, benzersiz zaman damgası ve insansı gecikme uygular.
              </p>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="text-xs font-medium text-slate-300 block">Mesajlar Arası Bekleme Süresi:</span>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={antiSpamMinDelay}
                    onChange={e => setAntiSpamMinDelay(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-14 bg-slate-900 border border-white/10 rounded px-2 py-1 text-center text-white"
                  />
                  <span className="text-slate-400">ile</span>
                  <input
                    type="number"
                    min={4}
                    max={25}
                    value={antiSpamMaxDelay}
                    onChange={e => setAntiSpamMaxDelay(Math.max(antiSpamMinDelay + 1, parseInt(e.target.value) || 7))}
                    className="w-14 bg-slate-900 border border-white/10 rounded px-2 py-1 text-center text-white"
                  />
                  <span className="text-slate-400">saniye arası (Rastgele)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tarih & Oturum Seçim Barı ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-white/10 items-center">
        {/* Tarih */}
        <div className="md:col-span-4 flex items-center gap-2.5">
          <Calendar size={18} className="text-indigo-400 shrink-0" />
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Yoklama Tarihi</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Oturum Seçimi */}
        <div className="md:col-span-8 flex flex-col sm:flex-row sm:items-center justify-end gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider self-start sm:self-center mr-1">
            Devamsızlık Oturumu:
          </span>
          <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-white/10 gap-1">
            {(Object.keys(SESSION_MAP) as SessionType[]).map(key => {
              const opt = SESSION_MAP[key];
              const isActive = sessionType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSessionType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
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

      {/* ── Ana İçerik: 2 Kolonlu Panel (Sol: Seçim Yöntemleri, Sağ: Kuyruk) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── SOL SÜTUN: Öğrenci Seçimi (Hızlı Numara vs Sınıf Listesi) ── */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          {/* Sekme Butonları */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <button
              onClick={() => setActiveTab('express')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activeTab === 'express'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Send size={16} />
              <span>Hızlı Numara Girişi</span>
            </button>
            <button
              onClick={() => setActiveTab('class')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activeTab === 'class'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users size={16} />
              <span>Sınıf Listesinden Seçim</span>
            </button>
          </div>

          {/* ── TAB 1: HIZLI NUMARA GİRİŞİ ── */}
          {activeTab === 'express' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>Okul Numaralarını Yapıştırın veya Yazın:</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Virgül, boşluk veya alt alta</span>
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
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  placeholder="Örnek: 102, 345, 876 veya Excel'den kopyalanan liste..."
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    İpucu: <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Ctrl + Enter</kbd> ile hızlı ekleyebilirsiniz.
                  </span>
                  <button
                    type="button"
                    onClick={handleLookupExpressNumbers}
                    disabled={lookupLoading || !expressInput.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    {lookupLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Sorgulanıyor...</span>
                      </>
                    ) : (
                      <>
                        <Search size={14} />
                        <span>Sorgula ve Listeye Ekle</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Bilgi Kutusu */}
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
                <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200 leading-relaxed">
                  <strong className="text-blue-100 block mb-0.5">Toplu Hızlı Giriş Kolaylığı:</strong>
                  Nöbetçi öğretmen veya idareci tarafından kağıda yazılmış gelmeyen öğrenci numaralarını doğrudan buraya yazıp ekleyebilirsiniz. Sistem öğrenciyi, sınıfını ve birinci öncelikli velisini otomatik olarak eşleştirecektir.
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
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Sınıf içinde ara (İsim veya No)..."
                      value={classSearchFilter}
                      onChange={e => setClassSearchFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Sınıf Seçili Değilse */}
              {!selectedClass && (
                <div className="text-center py-12 text-slate-400 bg-slate-950/40 rounded-xl border border-dashed border-white/10">
                  <Users size={36} className="mx-auto text-slate-500 mb-2 opacity-50" />
                  <p className="text-sm">Öğrenci listesini görüntülemek için lütfen yukarıdan bir sınıf seçin.</p>
                </div>
              )}

              {/* Sınıf Seçiliyken Liste */}
              {selectedClass && (
                <div className="space-y-3">
                  {/* Toplu İşlem Butonları */}
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>
                      Toplam: <strong className="text-white">{filteredClassStudents.length}</strong> öğrenci
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllInClass}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline flex items-center gap-1"
                      >
                        <CheckSquare size={13} /> Sınıftaki Tümünü Ekle
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={handleClearAllInClass}
                        className="text-xs text-slate-400 hover:text-rose-400 font-medium hover:underline"
                      >
                        Sınıfı Kuyruktan Çıkar
                      </button>
                    </div>
                  </div>

                  {classStudentsLoading ? (
                    <div className="flex items-center justify-center py-12 text-slate-400">
                      <RefreshCw size={24} className="animate-spin text-indigo-400 mr-2" />
                      <span>Öğrenciler yükleniyor...</span>
                    </div>
                  ) : filteredClassStudents.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-950/40 rounded-xl border border-white/10 text-xs">
                      Aramaya uygun öğrenci bulunamadı.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {filteredClassStudents.map(student => {
                        const isQueued = queuedStudents.some(s => s.id === student.id);
                        const primaryParent = student.parents?.[0];
                        return (
                          <div
                            key={student.id}
                            onClick={() => toggleStudentFromClass(student)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 select-none ${
                              isQueued
                                ? 'bg-rose-500/10 border-rose-500/40 shadow-sm shadow-rose-500/10'
                                : 'bg-slate-950/70 border-white/10 hover:border-white/20 hover:bg-slate-950'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                    {student.schoolNumber}
                                  </span>
                                  <span className="text-xs font-semibold text-white">
                                    {student.fullName}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                                  <span>Veli: {primaryParent?.fullName || 'Belirtilmemiş'}</span>
                                  <span>•</span>
                                  <span>{primaryParent?.phone || 'Tel yok'}</span>
                                </div>
                              </div>

                              <div>
                                {isQueued ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 rounded-lg">
                                    <X size={12} /> Gelmedi
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-slate-400 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg">
                                    İşaretle
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/5">
                              <span className="text-slate-400">{student.className}</span>
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

        {/* ── SAĞ SÜTUN: Gönderim Kuyruğu (Seçilen Öğrenciler) ── */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600/30 text-indigo-300 rounded-lg flex items-center justify-center font-bold text-xs">
                {queuedStudents.length}
              </div>
              <h2 className="text-base font-bold text-white">Gönderilecek Öğrenciler</h2>
            </div>
            {queuedStudents.length > 0 && (
              <button
                type="button"
                onClick={() => setQueuedStudents([])}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
              >
                <Trash2 size={13} /> Tümünü Temizle
              </button>
            )}
          </div>

          {/* Kuyruk Boşsa */}
          {queuedStudents.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-slate-950/40 rounded-xl border border-dashed border-white/10 space-y-2">
              <BellRing size={36} className="mx-auto text-slate-500 opacity-40" />
              <p className="text-sm font-medium text-slate-300">Henüz öğrenci seçilmedi</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Soldaki panelden öğrenci numaralarını yapıştırarak veya sınıf listesinden tıklayarak listeye ekleyin.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {queuedStudents.map(student => {
                const targetParent =
                  student.parents.find(p => p.id === student.selectedParentId) ||
                  student.parents[0] || {
                    id: '',
                    fullName: 'Kayıtlı Veli Yok',
                    relation: 'Veli',
                    phone: '',
                    waConsentStatus: 'PENDING',
                  };

                const duplicateTime = duplicateMap[student.id];

                return (
                  <div
                    key={student.id}
                    className="p-3 bg-slate-950/80 rounded-xl border border-white/10 space-y-2 relative group hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                            {student.schoolNumber}
                          </span>
                          <span className="text-xs font-bold text-white">{student.fullName}</span>
                          <span className="text-[11px] text-slate-400">({student.className})</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeStudentFromQueue(student.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Listeden Çıkar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Veli Seçimi / Bilgisi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1.5 border-t border-white/5 items-center">
                      <div>
                        {student.parents.length > 1 ? (
                          <select
                            value={targetParent.id}
                            onChange={e => handleParentChange(student.id, e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            {student.parents.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.fullName} ({p.relation || 'Veli'})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-300 font-medium">
                            {targetParent.fullName} ({targetParent.relation || 'Veli'})
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          📞 {targetParent.phone || 'Telefon eksik!'}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {renderConsentBadge(targetParent.waConsentStatus)}

                        {duplicateTime && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded"
                            title={`Bu öğrenciye ${targetDate} tarihinde (${SESSION_MAP[sessionType]?.label}) mesaj gönderilmiş.`}
                          >
                            <AlertTriangle size={10} /> Bugün Bildirildi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Gönderim Başlat Butonu */}
          {queuedStudents.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartDispatch}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Send size={18} />
                <span>WhatsApp Bildirimlerini Başlat ({queuedStudents.length} Öğrenci)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CANLI GÖNDERİM MODALI (Canlı İlerleme + Anti-Spam Gecikmesi) ── */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Başlığı */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600/30 text-indigo-400 rounded-xl flex items-center justify-center">
                  <BellRing size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">WhatsApp Bildirim Gönderim Motoru</h3>
                  <p className="text-xs text-slate-400">
                    Oturum: {SESSION_MAP[sessionType]?.label} • {targetDate}
                  </p>
                </div>
              </div>

              {!isDispatching && (
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* İlerleme Çubuğu */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  İlerleme: <strong>{completedCount}</strong> / {dispatchItems.length} tamamlandı
                </span>
                <span className="font-bold text-indigo-400">%{dispatchProgress}</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${dispatchProgress}%` }}
                />
              </div>
            </div>

            {/* Canlı Ticker / Durum Bildirimi */}
            <div className="p-3 bg-slate-950 rounded-xl border border-white/10 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                {isDispatching ? (
                  <RefreshCw size={14} className="animate-spin text-indigo-400 shrink-0" />
                ) : (
                  <Info size={14} className="text-slate-400 shrink-0" />
                )}
                <span className="truncate text-slate-200 font-mono">
                  {dispatchTicker || 'Gönderime hazır. Başlat butonuna basınız.'}
                </span>
              </div>
              {countdownSeconds !== null && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono font-bold text-[11px] shrink-0">
                  {countdownSeconds}s
                </span>
              )}
            </div>

            {/* Kuyruk Listesi */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 border border-white/5 rounded-xl p-2 bg-slate-950/50">
              {dispatchItems.map((item, idx) => (
                <div
                  key={item.student.id}
                  className="p-2.5 rounded-lg border border-white/5 bg-slate-900/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[11px]">
                      {item.student.schoolNumber}
                    </span>
                    <span className="font-medium text-white">{item.student.fullName}</span>
                    <span className="text-[11px] text-slate-400">({item.parent.fullName})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'PENDING' && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock size={12} /> Bekliyor
                      </span>
                    )}
                    {item.status === 'SENDING' && (
                      <span className="text-[11px] text-indigo-400 flex items-center gap-1">
                        <RefreshCw size={12} className="animate-spin" /> İletiliyor...
                      </span>
                    )}
                    {item.status === 'SENT' && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 size={12} /> Gönderildi ({item.sentTime})
                      </span>
                    )}
                    {item.status === 'FAILED' && (
                      <span
                        className="text-[11px] text-rose-400 flex items-center gap-1 font-medium cursor-help"
                        title={item.errorMessage}
                      >
                        <XCircle size={12} /> Hata: {item.errorMessage}
                      </span>
                    )}
                    {item.status === 'SKIPPED' && (
                      <span
                        className="text-[11px] text-amber-400 flex items-center gap-1 font-medium cursor-help"
                        title={item.errorMessage}
                      >
                        <AlertCircle size={12} /> Atlandı
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Kontrol Butonları */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                {!isDispatching && completedCount < dispatchItems.length && (
                  <button
                    type="button"
                    onClick={runDispatchLoop}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    <Play size={14} /> Gönderimi Başlat
                  </button>
                )}

                {isDispatching && !isPaused && (
                  <button
                    type="button"
                    onClick={handlePauseDispatch}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Pause size={14} /> Duraklat
                  </button>
                )}

                {isPaused && (
                  <button
                    type="button"
                    onClick={handleResumeDispatch}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Play size={14} /> Devam Et
                  </button>
                )}

                {isDispatching && (
                  <button
                    type="button"
                    onClick={handleCancelDispatch}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Square size={14} /> İptal Et
                  </button>
                )}
              </div>

              {!isDispatching && (
                <button
                  type="button"
                  onClick={() => {
                    setDispatchModalOpen(false);
                    // Başarılı gönderilenleri kuyruktan temizle
                    const sentIds = new Set(
                      dispatchItems.filter(it => it.status === 'SENT').map(it => it.student.id)
                    );
                    setQueuedStudents(prev => prev.filter(s => !sentIds.has(s.id)));
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors"
                >
                  Kapat ve Kuyruğu Güncelle
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ALT BÖLÜM: Günlük Bildirim Geçmişi (Tarihçe) ── */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <History size={20} className="text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">Günlük WhatsApp Bildirim Geçmişi</h3>
              <p className="text-xs text-slate-400">
                Seçilen tarihte ({targetDate}) velilere iletilen tüm anlık devamsızlık bildirimleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Oturum Filtresi */}
            <select
              value={historySessionFilter}
              onChange={e => setHistorySessionFilter(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Tüm Oturumlar</option>
              <option value="MORNING">Sabah (1. Oturum)</option>
              <option value="AFTERNOON">Öğleden Sonra (2. Oturum)</option>
              <option value="FULL_DAY">Tam Gün</option>
            </select>

            {/* Arama */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Geçmişte ara..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-44"
              />
            </div>

            <button
              onClick={fetchHistory}
              title="Yenile"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-slate-300"
            >
              <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-indigo-400 mr-2" />
            <span>Geçmiş yükleniyor...</span>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-950/40 rounded-xl border border-dashed border-white/10 text-xs">
            {targetDate} tarihinde gönderilmiş herhangi bir bildirim bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Saat</th>
                  <th className="py-2.5 px-3">Öğrenci No</th>
                  <th className="py-2.5 px-3">Adı Soyadı</th>
                  <th className="py-2.5 px-3">Sınıf</th>
                  <th className="py-2.5 px-3">Oturum</th>
                  <th className="py-2.5 px-3">Veli Bilgisi</th>
                  <th className="py-2.5 px-3">Durum</th>
                  <th className="py-2.5 px-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredHistory.map(row => {
                  const sentTimeStr = new Date(row.sentAt).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{sentTimeStr}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">{row.schoolNumber || '-'}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{row.studentName || 'Bilinmiyor'}</td>
                      <td className="py-2.5 px-3 text-slate-300">{row.className || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-white/5 px-2 py-0.5 rounded">
                          {SESSION_MAP[row.sessionType]?.icon} {SESSION_MAP[row.sessionType]?.text || row.sessionType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-200">{row.parentName || '-'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{row.parentPhone}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {row.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Başarılı
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full cursor-help"
                            title={row.errorMessage || 'Hata oluştu'}
                          >
                            <XCircle size={12} /> Başarısız
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewHistoryModalItem(row)}
                            className="p-1 text-slate-400 hover:text-indigo-300 transition-colors"
                            title="Mesajı İncele"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHistory(row.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
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

      {/* ── Mesaj Detayı Modal ── */}
      {viewHistoryModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-indigo-400" />
                <h4 className="text-sm font-bold text-white">İletilen WhatsApp Mesajı</h4>
              </div>
              <button
                onClick={() => setViewHistoryModalItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Öğrenci: <strong className="text-white">{viewHistoryModalItem.studentName}</strong></span>
                <span>Tarih: <strong className="text-white">{viewHistoryModalItem.date}</strong></span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Veli: <strong className="text-white">{viewHistoryModalItem.parentName} ({viewHistoryModalItem.parentPhone})</strong></span>
                <span>Oturum: <strong className="text-white">{SESSION_MAP[viewHistoryModalItem.sessionType]?.text}</strong></span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-white/10 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {viewHistoryModalItem.message}
            </div>

            {viewHistoryModalItem.errorMessage && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                <strong>Hata Detayı:</strong> {viewHistoryModalItem.errorMessage}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewHistoryModalItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
