import React, { useState } from 'react';
import { ActionModal } from '../../../components/ui/ActionModal';
import { Button } from '../../../components/ui/Button';
import { 
  ShieldCheck, 
  Globe, 
  Calendar, 
  Smartphone, 
  Copy, 
  Check, 
  FileText, 
  User, 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  Clock,
  KeyRound,
  Info,
  Printer
} from 'lucide-react';
import { ConsentContactData } from './ManualConsentModal';
import toast from 'react-hot-toast';

interface DigitalConsentLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ConsentContactData | null;
  onPrintPdf?: (contact: ConsentContactData) => void;
  onDownloadPdf?: (contact: ConsentContactData) => void;
}

export function DigitalConsentLogModal({
  isOpen,
  onClose,
  contact,
  onPrintPdf,
  onDownloadPdf,
}: DigitalConsentLogModalProps) {
  const [copiedIp, setCopiedIp] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  if (!contact) return null;

  const handleCopyIp = () => {
    if (contact.consentIp) {
      navigator.clipboard.writeText(contact.consentIp);
      setCopiedIp(true);
      toast.success('IP adresi kopyalandı.');
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  const handleCopyToken = () => {
    if (contact.consentToken) {
      navigator.clipboard.writeText(contact.consentToken);
      setCopiedToken(true);
      toast.success('Doğrulama anahtarı kopyalandı.');
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  // User-Agent'tan cihaz türü tahmini
  const parseDevice = (ua?: string | null) => {
    if (!ua) return 'Bilinmeyen Cihaz';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'Apple iOS (Mobil)';
    if (/Android/i.test(ua)) return 'Android (Mobil)';
    if (/Windows NT/i.test(ua)) return 'Windows Bilgisayar';
    if (/Macintosh/i.test(ua)) return 'Apple macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return ua.slice(0, 40) + '...';
  };

  const formattedDate = contact.waConsentDate 
    ? new Date(contact.waConsentDate).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Kayıt Tarihi Belirtilmedi';

  const isAccepted = contact.waConsentStatus === 'ACCEPTED';
  const isDeclined = contact.waConsentStatus === 'DECLINED';

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Dijital Açık Rıza ve Güvenlik Kaydı"
      width="lg"
      hideFooter={true}
    >
      <div className="space-y-4">
        {/* Üst Durum Bandı */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
          isAccepted 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
            : isDeclined 
              ? 'bg-rose-50/80 border-rose-200 text-rose-900' 
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isAccepted 
                ? 'bg-emerald-100 text-emerald-700' 
                : isDeclined 
                  ? 'bg-rose-100 text-rose-700' 
                  : 'bg-amber-100 text-amber-700'
            }`}>
              {isAccepted && <CheckCircle2 size={18} />}
              {isDeclined && <XCircle size={18} />}
              {!isAccepted && !isDeclined && <Clock size={18} />}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {isAccepted ? 'Açık Rıza Verildi (Onaylandı)' : isDeclined ? 'Açık Rıza Reddedildi' : 'Onay Bekleniyor'}
              </div>
              <div className="text-[11px] opacity-80">
                {contact.consentSource === 'WEB' ? 'Veli doğrudan mobil web formu üzerinden işlem yapmıştır.' : 'Okul idaresi tarafından manuel işlenmiştir.'}
              </div>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 shadow-2xs">
            Kaynak: {contact.consentSource || 'WEB'}
          </span>
        </div>

        {/* Öğrenci ve Veli Özet Kutusu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap size={15} />
            </div>
            <div>
              <div className="text-[10.5px] uppercase font-bold text-slate-400">Öğrenci Bilgileri</div>
              <div className="text-xs font-bold text-slate-900">
                {contact.student?.fullName || contact.studentName || '—'}
              </div>
              <div className="text-[11px] text-slate-500">
                {contact.student?.className || contact.className} · No: {contact.student?.schoolNumber || contact.schoolNumber || '—'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <User size={15} />
            </div>
            <div>
              <div className="text-[10.5px] uppercase font-bold text-slate-400">Veli Bilgileri</div>
              <div className="text-xs font-bold text-slate-900">
                {contact.parentName} {contact.relation ? `(${contact.relation})` : ''}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {contact.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Teknik İspat ve Güvenlik Log Tablosu */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-100/70 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-indigo-600" />
            <span>5651 & 6698 KVKK Elektronik İşlem ve Erişim Logları</span>
          </div>

          <div className="divide-y divide-slate-100 bg-white">
            {/* İşlem Zamanı */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar size={14} className="text-slate-400" />
                <span className="font-medium">İşlem Zaman Damgası:</span>
              </div>
              <span className="font-bold text-slate-900 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {formattedDate}
              </span>
            </div>

            {/* İstemci IP Adresi */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Globe size={14} className="text-slate-400" />
                <span className="font-medium">Kayıtlı İstemci IP Adresi:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {contact.consentIp ? (
                  <>
                    <span className="font-bold text-indigo-900 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {contact.consentIp}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyIp}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                      title="IP Kopyala"
                    >
                      {copiedIp ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </>
                ) : (
                  <span className="text-slate-400 italic">Kayıt yok (Manuel onay)</span>
                )}
              </div>
            </div>

            {/* Cihaz ve İşletim Sistemi */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Smartphone size={14} className="text-slate-400" />
                <span className="font-medium">Erişim Cihazı / Ortam:</span>
              </div>
              <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]" title={contact.consentUserAgent || ''}>
                {parseDevice(contact.consentUserAgent)}
              </span>
            </div>

            {/* Güvenlik Doğrulama Token'ı */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <KeyRound size={14} className="text-slate-400" />
                <span className="font-medium">Tekil Doğrulama Anahtarı:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {contact.consentToken ? (
                  <>
                    <span className="font-mono text-[10.5px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 max-w-[180px] sm:max-w-[260px] truncate" title={contact.consentToken}>
                      {contact.consentToken}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                      title="Token Kopyala"
                    >
                      {copiedToken ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </>
                ) : (
                  <span className="text-slate-400 italic">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hukuki Açıklama Kartı */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-amber-900 leading-relaxed">
          <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Hukuki İspat Güvencesi:</strong> 6698 sayılı KVKK 5/2 ve 5651 sayılı kanun uyarınca; veri sorumlusunun açık rızanın geçerli şekilde alındığını teyit ve ispat yükümlülüğü bulunmaktadır. Yukarıda kayıtlı zaman damgası, bağlantı IP adresi ve cihaz bilgileri resmi denetim ve ihtilaflarda okul lehine delil niteliği taşımaktadır.
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex items-center justify-between pt-2">
          {(onPrintPdf || onDownloadPdf) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (onPrintPdf) onPrintPdf(contact);
                else if (onDownloadPdf) onDownloadPdf(contact);
              }}
              leftIcon={<Printer size={14} />}
              className="text-xs text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
            >
              Resmi Formu Yazdır (PDF)
            </Button>
          ) : <div />}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold px-4"
          >
            Kapat
          </Button>
        </div>
      </div>
    </ActionModal>
  );
}
