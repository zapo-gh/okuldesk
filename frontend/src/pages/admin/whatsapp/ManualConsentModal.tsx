import React, { useState, useEffect } from 'react';
import { ActionModal } from '../../../components/ui/ActionModal';
import { Button } from '../../../components/ui/Button';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Clock, Download, ShieldCheck, User } from 'lucide-react';

export interface ConsentContactData {
  contactId: string;
  parentId?: string;
  parentName: string;
  phone: string;
  relation?: string;
  studentName?: string;
  className?: string;
  schoolNumber?: string;
  student?: {
    id?: string;
    fullName: string;
    schoolNumber: string;
    className: string;
  };
  waConsentStatus: string;
  photoConsentStatus?: string;
  consentSource?: string;
  waConsentDate?: string | null;
  consentToken?: string | null;
  consentIp?: string | null;
  consentUserAgent?: string | null;
  lastConsentSentAt?: string | null;
  updatedAt?: string;
}

interface ManualConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ConsentContactData | null;
  onSuccess: () => void;
}

export function ManualConsentModal({ isOpen, onClose, contact, onSuccess }: ManualConsentModalProps) {
  const [waStatus, setWaStatus] = useState<string>('PENDING');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (contact) {
      setWaStatus(contact.waConsentStatus || 'PENDING');
    }
  }, [contact]);

  if (!contact) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/whatsapp/consents/manual', {
        contactId: contact.contactId,
        waConsentStatus: waStatus,
      });
      toast.success('Veli açık rıza tercihi başarıyla kaydedildi.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kaydedilirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/whatsapp/consents/pdf/contact/${contact.contactId}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KVKK_Onay_Formu_${contact.studentName || 'Veli'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('2 sayfalık KVKK ve Açık Rıza Formu indirildi.');
    } catch {
      toast.error('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Veli WhatsApp Açık Rıza Yönetimi"
      onSubmit={handleSubmit}
      submitText={saving ? 'Kaydediliyor...' : 'Tercihi Kaydet'}
      submitDisabled={saving}
      width="md"
    >
      <div className="space-y-4">
        {/* Veli & Öğrenci Özet Kartı */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <User size={15} className="text-slate-500" />
              {contact.parentName}
            </div>
            <div className="text-slate-500 mt-0.5 font-mono">
              Tel: {contact.phone} {contact.relation ? `(${contact.relation})` : ''}
            </div>
          </div>
          <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
            <div className="font-semibold text-slate-700">
              {contact.studentName || contact.student?.fullName || 'Öğrenci Bilgisi Yok'}
            </div>
            <div className="text-slate-500 mt-0.5">
              {contact.className || contact.student?.className || '—'} · No: {contact.schoolNumber || contact.student?.schoolNumber || '—'}
            </div>
          </div>
        </div>

        {/* WhatsApp İletişim Hattı İzni */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo-600" />
              WhatsApp İletişim Hattı Açık Rıza Durumu
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Devamsızlık bildirimleri, yazılı uyarılar ve okul resmi bilgilendirmeleri.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setWaStatus('ACCEPTED')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer ${
                waStatus === 'ACCEPTED'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400/20 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 size={16} className={waStatus === 'ACCEPTED' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Onaylandı</span>
            </button>

            <button
              type="button"
              onClick={() => setWaStatus('DECLINED')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer ${
                waStatus === 'DECLINED'
                  ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-400/20 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <XCircle size={16} className={waStatus === 'DECLINED' ? 'text-rose-600' : 'text-slate-400'} />
              <span>Reddedildi</span>
            </button>

            <button
              type="button"
              onClick={() => setWaStatus('PENDING')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer ${
                waStatus === 'PENDING'
                  ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-400/20 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock size={16} className={waStatus === 'PENDING' ? 'text-amber-600' : 'text-slate-400'} />
              <span>Bekliyor</span>
            </button>
          </div>
        </div>

        {/* 2 Sayfalık Matbu Form İndir Butonu */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Veliden ıslak imza almak için:
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            leftIcon={downloading ? <Clock size={13} className="animate-spin" /> : <Download size={13} />}
            className="text-xs h-8 text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold"
          >
            {downloading ? 'Hazırlanıyor...' : '2 Sayfalık Formu İndir (PDF)'}
          </Button>
        </div>
      </div>
    </ActionModal>
  );
}
