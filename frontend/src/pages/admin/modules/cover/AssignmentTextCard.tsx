import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Copy,
  Check,
  FileText,
  Users,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Edit2
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { formatPhoneNumber } from '../../../../utils/formatters';

interface AssignmentTextCardProps {
  dateStr: string;
  schoolName: string;
  displayCovers: any[];
  absences: any[];
  dailyDutyStaff: any[];
  notes?: string;
  notesEnabled?: boolean;
  staffList?: any[];
}

/**
 * Personel nesnesinden veya extraData içinden telefon numarasını çıkarır
 */
function extractStaffPhone(staff: any): string {
  if (!staff) return '';
  if (staff.phone) return String(staff.phone).trim();
  if (staff.telefon) return String(staff.telefon).trim();
  if (staff.gsm) return String(staff.gsm).trim();
  if (staff.mobile) return String(staff.mobile).trim();

  if (staff.extraData) {
    try {
      const data = typeof staff.extraData === 'string' ? JSON.parse(staff.extraData) : staff.extraData;
      if (data && typeof data === 'object') {
        const candidateKeys = [
          'Cep Telefonu', 'Telefon', 'GSM', 'Telefon No', 'Cep No', 'Cep',
          'TEL', 'TELEFON', 'CEP TELEFONU', 'GSM NO', 'phone', 'mobile'
        ];
        for (const k of candidateKeys) {
          if (data[k]) return String(data[k]).trim();
        }
      }
    } catch {}
  }
  return '';
}

/**
 * WhatsApp URL'si için uluslararası format temizliği (örn: 905551234567)
 */
function cleanPhoneForWhatsApp(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '90' + clean.slice(1);
  else if (clean.length === 10 && clean.startsWith('5')) clean = '90' + clean;
  else if (!clean.startsWith('90') && clean.length > 0) clean = '90' + clean;
  return clean;
}

export const AssignmentTextCard: React.FC<AssignmentTextCardProps> = ({
  dateStr,
  schoolName,
  displayCovers,
  absences,
  dailyDutyStaff,
  notes,
  notesEnabled,
  staffList = [],
}) => {
  type FormatMode = 'whatsapp' | 'plain' | 'merged';
  const [formatMode, setFormatMode] = useState<FormatMode>('whatsapp');
  const [copied, setCopied] = useState(false);
  const [copiedTeacherId, setCopiedTeacherId] = useState<string | null>(null);

  // Kullanıcı tarafından düzenlenen mesajlar (teacherId -> custom text)
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});

  // Telefonu olmayan öğretmene numara girmek için modal durumu
  const [phonePromptTeacher, setPhonePromptTeacher] = useState<any | null>(null);
  const [phoneInputValue, setPhoneInputValue] = useState('');

  // Gönderilen öğretmenler state (tarih bazlı localStorage saklama)
  const [sentTeacherIds, setSentTeacherIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`nobetci_wa_sent_${dateStr}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`nobetci_wa_sent_${dateStr}`);
      setSentTeacherIds(raw ? new Set(JSON.parse(raw)) : new Set());
    } catch {
      setSentTeacherIds(new Set());
    }
  }, [dateStr]);

  const markAsSent = (teacherId: string) => {
    setSentTeacherIds(prev => {
      const next = new Set(prev);
      next.add(teacherId);
      try {
        localStorage.setItem(`nobetci_wa_sent_${dateStr}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const unmarkSent = (teacherId: string) => {
    setSentTeacherIds(prev => {
      const next = new Set(prev);
      next.delete(teacherId);
      try {
        localStorage.setItem(`nobetci_wa_sent_${dateStr}`, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Kullanıcı tarafından kaydedilen özel telefonlar (staffId -> phone)
  const [customPhones, setCustomPhones] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('nobetci_custom_phones');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const saveCustomPhone = (teacherId: string, phone: string) => {
    setCustomPhones(prev => {
      const next = { ...prev, [teacherId]: phone };
      try {
        localStorage.setItem('nobetci_custom_phones', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const openPhoneEdit = (group: any) => {
    const teacherId = String(group.teacher.id || group.teacher.name);
    const existing = customPhones[teacherId] || extractStaffPhone(group.teacher);
    setPhoneInputValue(existing || '');
    setPhonePromptTeacher(group);
  };

  const openExternalUrl = async (url: string) => {
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      });
    } catch {
      return dateStr;
    }
  }, [dateStr]);

  const dateDMY = useMemo(() => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
      return new Date(dateStr).toLocaleDateString('tr-TR');
    } catch {
      return dateStr;
    }
  }, [dateStr]);

  // Nöbetçi öğretmen haritası (ID -> Station)
  const dutyStaffMap = useMemo(() => {
    const map = new Map<string, string>();
    dailyDutyStaff.forEach((d) => {
      if (d.staff?.id) {
        map.set(String(d.staff.id), d.station?.name || '');
      }
    });
    return map;
  }, [dailyDutyStaff]);

  // Devamsızlık haritası (staffId -> reason)
  const absenceMap = useMemo(() => {
    const map = new Map<string, string>();
    absences.forEach((a) => {
      const r = a.reason || 'İzinli';
      const t = a.absenceTime === 'SABAH' ? ' (Sabah)' : a.absenceTime === 'OGLEDEN_SONRA' ? ' (Öğleden Sonra)' : '';
      map.set(String(a.staffId), r + t);
    });
    return map;
  }, [absences]);

  // ─── Dersi Birleştirilen Öğretmenler Grubu ───
  const mergedTeacherGroups = useMemo(() => {
    // Sadece birleştirilen görevlendirmeleri al
    const mergedCovers = (displayCovers || []).filter((c) => {
      if (c.isCancelled) return false;
      return Boolean(
        c.isMerged ||
        c.isCombined ||
        (c.notes && c.notes.toLowerCase().includes('birleştir'))
      );
    });

    const groupMap = new Map<string, { teacher: any; covers: any[] }>();

    mergedCovers.forEach((c) => {
      const targetTeacher =
        c.mergedWithStaff ||
        c.presentCoTeachers?.[0] ||
        (c.substituteStaffId && staffList?.find((s: any) => s.id === c.substituteStaffId)) ||
        c.substituteStaff ||
        c.suggestedSubstitute?.staff;

      if (!targetTeacher) return;

      const teacherId = String(targetTeacher.id || targetTeacher.staffId || targetTeacher.name);
      const fullStaff = staffList?.find((s: any) => s.id === targetTeacher.id) || targetTeacher;

      if (!groupMap.has(teacherId)) {
        groupMap.set(teacherId, {
          teacher: fullStaff,
          covers: []
        });
      }

      groupMap.get(teacherId)!.covers.push(c);
    });

    const result: Array<{
      teacher: any;
      covers: any[];
      subtitle: string;
      message: string;
    }> = [];

    groupMap.forEach(({ teacher, covers }) => {
      const sortedCovers = [...covers].sort((a, b) => a.period - b.period);

      // Alt başlık: AMP 10 MUHASEB (3. saat - 10 MUHASEB) • AMP 10 MUHASEB (4. saat - 10 MUHASEB)
      const subtitle = sortedCovers
        .map(c => `${c.className} (${c.period}. saat${c.subject ? ` - ${c.subject}` : ''})`)
        .join(' • ');

      // Mesaj satırları
      const lessonLines = sortedCovers.map((c) => {
        const subjectStr = c.subject ? ` (${c.subject})` : '';
        return `• ${c.period}. Ders: ${c.className}${subjectStr} [Diğer grup öğretmeni - izinli/mazeretli]`;
      });

      const message = [
        `Sayın ${teacher.name} Hocam,`,
        ``,
        `${dateDMY} günü aşağıdaki derslerinizde diğer grup öğretmeninin izinli/mazeretli olması sebebiyle gruplar birleştirilecektir:`,
        ``,
        ...lessonLines
      ].join('\n');

      result.push({
        teacher,
        covers: sortedCovers,
        subtitle,
        message
      });
    });

    return result.sort((a, b) => a.teacher.name.localeCompare(b.teacher.name, 'tr-TR'));
  }, [displayCovers, staffList, dateDMY]);

  // ─── Genel Görevlendirme Metin Üretimi (Nöbetçi / Düz Metin) ───
  const generatedText = useMemo(() => {
    if (!displayCovers || displayCovers.length === 0) {
      return `📅 Tarih: ${formattedDate}\n\n(Bu tarih için herhangi bir boş ders görevlendirmesi bulunmuyor)`;
    }

    const byPeriod = new Map<number, any[]>();
    displayCovers.forEach((c) => {
      const p = c.period;
      if (!byPeriod.has(p)) byPeriod.set(p, []);
      byPeriod.get(p)!.push(c);
    });

    const sortedPeriods = Array.from(byPeriod.keys()).sort((a, b) => a - b);

    if (formatMode === 'whatsapp') {
      const lines: string[] = [
        `📋 *NÖBETÇİ ÖĞRETMEN BOŞ DERS GÖREVLENDİRME LİSTESİ*`,
        `🏫 *${schoolName || 'Okul Müdürlüğü'}*`,
        `📅 *Tarih:* ${formattedDate}`,
        ``,
      ];

      sortedPeriods.forEach((period) => {
        lines.push(`⏰ *${period}. Ders:*`);
        const coversInPeriod = byPeriod.get(period)!;
        coversInPeriod.forEach((c) => {
          const absentName = c.absentStaff?.name || 'Öğretmen';
          const reason = absenceMap.get(String(c.absentStaff?.id || c.absentStaffId)) || 'İzinli';
          const subId = c.substituteStaffId || c.substituteStaff?.id || c.suggestedSubstitute?.staff?.id;
          const subName = c.substituteStaff?.name || c.suggestedSubstitute?.staff?.name;
          const isCancelled = c.isCancelled || c.substituteStaffId === 'CANCEL';
          const isHandledByAdmin = c.substituteStaffId === 'ADMIN';
          const isMerged = Boolean(c.isMerged || c.isCombined);
          const mergedName = c.mergedWithStaff?.name || c.presentCoTeachers?.[0]?.name;
          const displayAbsentName = [c.absentStaff, ...(c.coAbsentStaffs || [])].filter(Boolean).map((s: any) => s.name).join(' & ') || absentName;

          let assignmentPart = '';
          if (isMerged) {
            assignmentPart = `*Grup Birleştirilecek* - ${mergedName || subName || 'Öğretmen'}`;
          } else if (isHandledByAdmin) {
            assignmentPart = `_İdare Kontrolünde_`;
          } else if (isCancelled) {
            assignmentPart = `_İptal Edildi_`;
          } else if (subName) {
            const station = dutyStaffMap.get(String(subId));
            const stationStr = station ? ` [${station}]` : '';
            assignmentPart = `*${subName}*${stationStr}`;
          } else {
            assignmentPart = `⚠️ _[Nöbetçi Atanmadı]_`;
          }

          lines.push(`• *${c.className}*: ${assignmentPart} _(${displayAbsentName} - ${reason})_`);
        });
        lines.push(``);
      });

      if (notesEnabled && notes && notes.trim()) {
        lines.push(`📌 *Açıklamalar:*`);
        lines.push(notes.trim());
      }

      return lines.join('\n');
    } else {
      // Düz Metin
      const lines: string[] = [
        `NÖBETÇİ ÖĞRETMEN BOŞ DERS GÖREVLENDİRME LİSTESİ`,
        `${schoolName || 'Okul Müdürlüğü'}`,
        `Tarih: ${formattedDate}`,
        `----------------------------------------`,
      ];

      sortedPeriods.forEach((period) => {
        lines.push(`\n${period}. DERS:`);
        const coversInPeriod = byPeriod.get(period)!;
        coversInPeriod.forEach((c) => {
          const absentName = c.absentStaff?.name || 'Öğretmen';
          const reason = absenceMap.get(String(c.absentStaff?.id || c.absentStaffId)) || 'İzinli';
          const subId = c.substituteStaffId || c.substituteStaff?.id || c.suggestedSubstitute?.staff?.id;
          const subName = c.substituteStaff?.name || c.suggestedSubstitute?.staff?.name;
          const isCancelled = c.isCancelled || c.substituteStaffId === 'CANCEL';
          const isHandledByAdmin = c.substituteStaffId === 'ADMIN';
          const isMerged = Boolean(c.isMerged || c.isCombined);
          const mergedName = c.mergedWithStaff?.name || c.presentCoTeachers?.[0]?.name;
          const displayAbsentName = [c.absentStaff, ...(c.coAbsentStaffs || [])].filter(Boolean).map((s: any) => s.name).join(' & ') || absentName;

          let subText = '';
          if (isMerged) subText = `Grup Birleştirilecek - ${mergedName || subName || 'Öğretmen'}`;
          else if (isHandledByAdmin) subText = 'İdare Kontrolünde';
          else if (isCancelled) subText = 'İptal Edildi';
          else if (subName) {
            const station = dutyStaffMap.get(String(subId));
            subText = `${subName}${station ? ` (${station})` : ''}`;
          } else {
            subText = 'Nöbetçi Atanmadı';
          }

          lines.push(`- ${c.className}: ${subText} (Gelmeyen: ${displayAbsentName} - ${reason})`);
        });
      });

      if (notesEnabled && notes && notes.trim()) {
        lines.push(`\nAÇIKLAMALAR:\n${notes.trim()}`);
      }

      return lines.join('\n');
    }
  }, [displayCovers, formattedDate, schoolName, formatMode, dutyStaffMap, absenceMap, notes, notesEnabled]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      toast.success('Metin panoya kopyalandı! WhatsApp grubuna yapıştırabilirsiniz.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Panoya kopyalanamadı.');
    }
  };

  const handleCopyTeacher = async (teacherId: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedTeacherId(teacherId);
      toast.success('Öğretmene özel mesaj panoya kopyalandı!');
      setTimeout(() => setCopiedTeacherId(null), 2000);
    } catch {
      toast.error('Panoya kopyalanamadı.');
    }
  };

  const handleCopyAllMerged = async () => {
    if (mergedTeacherGroups.length === 0) return;
    const allTexts = mergedTeacherGroups
      .map(g => {
        const tId = String(g.teacher.id || g.teacher.name);
        return editedMessages[tId] !== undefined ? editedMessages[tId] : g.message;
      })
      .join('\n\n' + '════════════════════════════════════════' + '\n\n');

    try {
      await navigator.clipboard.writeText(allTexts);
      toast.success('Dersi birleştirilen tüm öğretmenlerin mesajları panoya kopyalandı!');
    } catch {
      toast.error('Panoya kopyalanamadı.');
    }
  };

  const handleSendWhatsApp = async (group: any) => {
    const teacher = group.teacher;
    const teacherId = String(teacher.id || teacher.name);
    const phone = customPhones[teacherId] || extractStaffPhone(teacher);
    const textToSend = editedMessages[teacherId] !== undefined ? editedMessages[teacherId] : group.message;

    if (!phone) {
      setPhonePromptTeacher(group);
      setPhoneInputValue('');
      return;
    }

    const clean = cleanPhoneForWhatsApp(phone);
    if (!clean || clean.length < 10) {
      setPhonePromptTeacher(group);
      setPhoneInputValue(phone);
      return;
    }

    const url = `https://wa.me/${clean}?text=${encodeURIComponent(textToSend)}`;
    await openExternalUrl(url);
    markAsSent(teacherId);
    toast.success(`${teacher.name} için WhatsApp açıldı ve 'Gönderildi' olarak işaretlendi.`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
      {/* Üst Başlık & Butonlar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Görevlendirme Metni &amp; WhatsApp Paylaşımı</h3>
            <p className="text-xs text-slate-500">Öğretmen grubuna ve dersi birleştirilen öğretmenlere hazır mesajlar</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Format Seçim Sekmeleri */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => setFormatMode('whatsapp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                formatMode === 'whatsapp'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <MessageSquare size={14} className="text-emerald-600" />
              <span>Nöbetçi WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setFormatMode('plain')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                formatMode === 'plain'
                  ? 'bg-white text-slate-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <FileText size={14} className="text-slate-500" />
              <span>Düz Metin Formatı</span>
            </button>
            <button
              type="button"
              onClick={() => setFormatMode('merged')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                formatMode === 'merged'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold border border-blue-200 ring-1 ring-blue-100'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Users size={14} className="text-blue-600" />
              <span>Dersi Birleştirilenler</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  formatMode === 'merged'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {mergedTeacherGroups.length}
              </span>
            </button>
          </div>

          {formatMode !== 'merged' && (
            <Button
              onClick={handleCopy}
              className="gap-1.5 text-xs font-bold py-1.5 transition-all shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {copied ? <Check size={14} className="animate-bounce" /> : <Copy size={14} />}
              {copied ? 'Kopyalandı!' : 'Metni Kopyala'}
            </Button>
          )}
        </div>
      </div>

      {/* ─── SEKME 1 & 2: Nöbetçi WhatsApp & Düz Metin Önizlemesi ─── */}
      {formatMode !== 'merged' && (
        <div className="relative">
          <textarea
            readOnly
            rows={10}
            value={generatedText}
            className="w-full text-xs font-mono p-4 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 leading-relaxed focus:outline-none select-all"
          />
          <div className="absolute right-3 bottom-3 text-[10px] text-slate-400 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-200">
            {displayCovers.length} görev kaydı
          </div>
        </div>
      )}

      {/* ─── SEKME 3: Dersi Birleştirilen Öğretmenler Özel Bölümü ─── */}
      {formatMode === 'merged' && (
        <div className="space-y-4">
          {/* Mavi Bilgilendirme Kutusu */}
          <div className="bg-sky-50 border border-sky-200/90 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
            <div className="w-5 h-5 rounded-md bg-sky-500 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-2xs">
              i
            </div>
            <div>
              <h4 className="text-xs font-bold text-sky-900">
                Dersi Birleştirilen Öğretmenler Bilgilendirme Servisi:
              </h4>
              <p className="text-xs text-sky-700 mt-0.5 leading-relaxed">
                Bu öğretmenlerimiz o gün nöbetçi olmayabilecekleri için genel nöbetçi listesini almayabilirler. Aşağıdaki hazır WhatsApp mesajlarını tek tıkla kopyalayabilir veya doğrudan WhatsApp üzerinden öğretmenlerimize gönderebilirsiniz.
              </p>
            </div>
          </div>

          {/* Alt Başlık & Tümünü Kopyala Butonu */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <h4 className="text-xs font-bold text-slate-800">
              {mergedTeacherGroups.length} Öğretmen İçin Özel Mesaj Hazırlandı
            </h4>

            {mergedTeacherGroups.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAllMerged}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer"
              >
                <Copy size={13} className="text-slate-500" />
                <span>Tümünü Toplu Kopyala</span>
              </button>
            )}
          </div>

          {/* Öğretmen Kartları Listesi */}
          {mergedTeacherGroups.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
              <Users size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700">Bu tarih için dersi birleştirilen öğretmen bulunamadı.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Grup derslerinde diğer grup öğretmeni okulda olan birleştirilmiş ders kaydı olduğunda burada otomatik listelenir.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mergedTeacherGroups.map((group) => {
                const teacher = group.teacher;
                const teacherId = String(teacher.id || teacher.name);
                const isSent = sentTeacherIds.has(teacherId);
                const phone = customPhones[teacherId] || extractStaffPhone(teacher);
                const isCopied = copiedTeacherId === teacherId;
                const initial = (teacher.name || 'Ö').trim().charAt(0).toUpperCase();

                return (
                  <div
                    key={teacherId}
                    className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs hover:border-slate-300 transition"
                  >
                    {/* Öğretmen Üst Bilgi Satırı */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                          {initial}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900">{teacher.name}</h4>

                            {isSent && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-2xs animate-in fade-in">
                                <CheckCircle2 size={12} className="text-emerald-600" /> Gönderildi
                              </span>
                            )}

                            {phone ? (
                              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                                <Smartphone size={11} className="text-slate-400" /> {formatPhoneNumber(phone)}
                                <button
                                  type="button"
                                  onClick={() => openPhoneEdit(group)}
                                  title="Telefonu Düzenle"
                                  className="text-slate-400 hover:text-indigo-600 ml-0.5 cursor-pointer"
                                >
                                  <Edit2 size={10} />
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openPhoneEdit(group)}
                                className="text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 transition cursor-pointer"
                              >
                                <AlertTriangle size={11} className="text-amber-600" /> Telefon Kayıtlı Değil (+ Ekle)
                              </button>
                            )}

                            {isSent && (
                              <button
                                type="button"
                                onClick={() => unmarkSent(teacherId)}
                                className="text-[10px] text-slate-400 hover:text-rose-600 underline ml-1 cursor-pointer"
                              >
                                İşareti Kaldır
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {group.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Sağ Aksiyon Butonları */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(group)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                            isSent
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title="Doğrudan WhatsApp'ta sohbet aç"
                        >
                          <span className="text-sm">🟢</span>
                          <span>{isSent ? 'Tekrar Gönder' : 'WhatsApp ile Gönder'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopyTeacher(
                              teacherId,
                              editedMessages[teacherId] !== undefined ? editedMessages[teacherId] : group.message
                            )
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          <span>{isCopied ? 'Kopyalandı' : 'Kopyala'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Mesaj Metin Alanı */}
                    <textarea
                      rows={5}
                      value={editedMessages[teacherId] !== undefined ? editedMessages[teacherId] : group.message}
                      onChange={(e) => setEditedMessages(prev => ({ ...prev, [teacherId]: e.target.value }))}
                      className="w-full text-xs font-sans p-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 leading-relaxed focus:bg-white focus:border-indigo-400 focus:outline-none transition resize-y"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Telefon Ekleme / Düzenleme Modalı ─── */}
      {phonePromptTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Smartphone size={16} className="text-emerald-600" />
                <span>{phonePromptTeacher.teacher.name} — Telefon Numarası</span>
              </h3>
              <button
                type="button"
                onClick={() => setPhonePromptTeacher(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              WhatsApp üzerinden doğrudan sohbet başlatabilmek için öğretmenin cep telefonu numarasını giriniz (girdiğiniz numara sonraki kullanımlar için de kaydedilecektir):
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cep Telefonu</label>
              <input
                type="tel"
                autoFocus
                placeholder="05xx xxx xx xx"
                value={phoneInputValue}
                onChange={(e) => setPhoneInputValue(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const tId = String(phonePromptTeacher.teacher.id || phonePromptTeacher.teacher.name);
                  const textToSend = editedMessages[tId] !== undefined ? editedMessages[tId] : phonePromptTeacher.message;
                  openExternalUrl(`https://api.whatsapp.com/send?text=${encodeURIComponent(textToSend)}`);
                  markAsSent(tId);
                  setPhonePromptTeacher(null);
                  toast.success('WhatsApp açıldı ve gönderildi olarak işaretlendi.');
                }}
                className="text-xs text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
              >
                Numarasız Aç
              </button>

              <button
                type="button"
                disabled={!phoneInputValue.trim()}
                onClick={() => {
                  const clean = cleanPhoneForWhatsApp(phoneInputValue);
                  if (!clean || clean.length < 10) {
                    toast.error('Lütfen geçerli bir telefon numarası giriniz.');
                    return;
                  }
                  const tId = String(phonePromptTeacher.teacher.id || phonePromptTeacher.teacher.name);
                  saveCustomPhone(tId, phoneInputValue.trim());
                  const textToSend = editedMessages[tId] !== undefined ? editedMessages[tId] : phonePromptTeacher.message;
                  openExternalUrl(`https://wa.me/${clean}?text=${encodeURIComponent(textToSend)}`);
                  markAsSent(tId);
                  setPhonePromptTeacher(null);
                  toast.success(`${phonePromptTeacher.teacher.name} için WhatsApp açıldı ve 'Gönderildi' olarak işaretlendi.`);
                }}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg shadow-xs cursor-pointer transition"
              >
                Kaydet &amp; WhatsApp ile Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
