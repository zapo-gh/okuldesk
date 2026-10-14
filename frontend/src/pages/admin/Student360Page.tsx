import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { 
  ArrowLeft, User, Users, FileText, AlertTriangle, ShieldAlert, 
  MessageSquare, History, RefreshCw, ExternalLink, Download, Printer,
  Send, Image as ImageIcon, CheckCircle2, Clock, X, Phone, Edit3
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useConfirm } from '../../hooks/useConfirm';
import { formatPhoneNumber } from '../../utils/formatters';
import { ManualConsentModal, ConsentContactData } from './whatsapp/ManualConsentModal';
import { printPdfBlob } from '../../utils/printPdf';

interface Student360Data {
  student: { 
    id: string; 
    schoolNumber: string; 
    fullName: string; 
    className: string; 
    status: string; 
    createdAt: string;
  };
  parents: Array<{ 
    id: string; 
    contactId?: string;
    fullName: string; 
    phone: string; 
    relation?: string;
    waConsentStatus: string; 
    waConsentDate: string | null; 
    photoConsentStatus?: string;
    photoConsentDate?: string | null;
    consentSource?: string | null;
    user: { 
      username: string; 
      mustChangePassword: boolean;
    };
  }>;
  absenteeisms: { 
    summary: { 
      records: number; 
      excusedDays: number; 
      unexcusedDays: number; 
      sent: number; 
      pending: number;
    }; 
    records: Array<{ 
      id: string; 
      warningNumber: number; 
      isBep: boolean; 
      excusedDays: number | null; 
      unexcusedDays: number | null; 
      createdAt: string; 
      viewedByParent: boolean; 
      waSentAt: string | null;
    }>;
  };
  warnings: { 
    total: number; 
    records: Array<{ 
      id: string; 
      warningNumber: number; 
      behaviorCode: string; 
      behaviorText: string; 
      description: string | null; 
      issuedBy: string; 
      issuedAt: string; 
      waSentAt: string | null;
    }>;
  };
  violations: { 
    total: number; 
    confirmed: number; 
    records: Array<{ 
      id: string; 
      type: string; 
      violationDate: string; 
      matchedBy: string; 
      isConfirmed: boolean; 
      createdAt: string;
    }>;
  };
  auditLogs: Array<{ 
    id: string; 
    action: string; 
    metadata: string | null; 
    createdAt: string; 
    user: { 
      username: string; 
      role: string;
    };
  }>;
}

const fmtDate = (value: string | null) => 
  value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

const consentLabel: Record<string, string> = {
  PENDING: 'Onay Bekliyor',
  ACCEPTED: 'Onaylandı',
  DECLINED: 'Reddedildi'
};

export default function Student360Page() {
  const { confirm } = useConfirm();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingConsent, setSendingConsent] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [downloadingAbsence, setDownloadingAbsence] = useState<string | null>(null);
  const [downloadingWarning, setDownloadingWarning] = useState<string | null>(null);
  const [busyViolation, setBusyViolation] = useState<string | null>(null);
  const [source, setSource] = useState<any>(null);
  const [showSource, setShowSource] = useState(false);
  const [selectedConsentContact, setSelectedConsentContact] = useState<ConsentContactData | null>(null);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [downloadingConsentPdf, setDownloadingConsentPdf] = useState<string | null>(null);

  const handlePrintConsentPdf = async (contactId?: string) => {
    if (!contactId) return;
    setDownloadingConsentPdf(contactId);
    try {
      const res = await api.get(`/whatsapp/consents/pdf/contact/${contactId}`, {
        responseType: 'blob',
      });
      printPdfBlob(res.data as Blob);
      toast.success('Yazdırma ekranı açıldı.');
    } catch {
      toast.error('PDF oluşturulurken hata oluştu.');
    } finally {
      setDownloadingConsentPdf(null);
    }
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/students/360/${id}`);
      setData(res.data.data);
    } catch (e: any) {
      const errMsg = e?.response?.data?.message || 'Öğrenci bilgileri yüklenemedi.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const sendConsent = async (parentId: string, parentName: string) => {
    if (!await confirm(`${parentName} için WhatsApp onay isteği gönderilsin mi?`)) return;
    setSendingConsent(parentId);
    setMessage('');
    try {
      await api.post('/whatsapp/send-consent', { parentId });
      setMessage(`${parentName} için WhatsApp onay isteği gönderildi.`);
      toast.success('Onay isteği gönderildi.');
      await load();
    } catch (e: any) {
      const errMsg = e?.response?.data?.message || 'WhatsApp onay isteği gönderilemedi.';
      setMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setSendingConsent(null);
    }
  };

  const downloadFile = async (endpoint: string, filename: string, setter: (v: string | null) => void, buttonId: string) => {
    setter(buttonId);
    try {
      const r = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: r.headers['content-type'] || 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Belge indirilemedi.');
    } finally {
      setter(null);
    }
  };

  const openViolationSource = async (violationId: string) => {
    setBusyViolation(violationId);
    setMessage('');
    try {
      const r = await api.get(`/violations/student/record/${violationId}/source`);
      setSource(r.data.data);
      setShowSource(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'İhlal kaynağı yüklenemedi.');
    } finally {
      setBusyViolation(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600"></div>
        <p className="text-sm text-slate-500 font-medium">Öğrenci 360° profili yükleniyor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200 max-w-lg mx-auto mt-12">
        <AlertTriangle size={40} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Öğrenci Bulunamadı</h2>
        <p className="text-slate-600 text-sm mb-5">{error || 'İstenen öğrenci kaydına ulaşılamadı.'}</p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => navigate('/admin/students')} variant="outline">
            Öğrenci Listesine Dön
          </Button>
          <Button onClick={load} variant="primary">
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  const { student } = data;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8">
      {/* Top Navigation & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button 
          onClick={() => navigate('/admin/students')} 
          variant="outline"
          className="self-start text-slate-600 hover:text-slate-900"
          leftIcon={<ArrowLeft size={16} />}
        >
          Öğrenci Listesine Dön
        </Button>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => navigate(`/admin/students?edit=${student.id}`)} 
            variant="outline"
            leftIcon={<ExternalLink size={16} />}
          >
            Öğrenciyi Düzenle
          </Button>
          <Button 
            onClick={load} 
            variant="outline"
            leftIcon={<RefreshCw size={16} />}
          >
            Yenile
          </Button>
        </div>
      </div>

      {/* Student Master Banner */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <User size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{student.fullName}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  student.status === 'ACTIVE' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {student.status === 'ACTIVE' ? 'Aktif Öğrenci' : 'Pasif Öğrenci'}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Okul No: <strong className="text-slate-800">{student.schoolNumber}</strong> &nbsp;•&nbsp; Sınıf: <strong className="text-slate-800">{student.className}</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Flash Message Banner */}
      {message && (
        <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-900 text-sm font-medium flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-indigo-400 hover:text-indigo-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={FileText} label="Devamsızlık Mektubu" value={data.absenteeisms.summary.records} />
        <Metric icon={AlertTriangle} label="Yazılı Uyarı" value={data.warnings.total} />
        <Metric icon={ShieldAlert} label="Kural İhlali" value={data.violations.total} />
        <Metric icon={Users} label="Kayıtlı Veli" value={data.parents.length} />
      </div>

      {/* Detailed Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* 1. Parent Information */}
        <Card icon={Users} title="Veli Bilgileri">
          {data.parents.length === 0 ? (
            <Empty text="Bu öğrenciye ait kayıtlı veli bulunmamaktadır." />
          ) : (
            <div className="space-y-3">
              {data.parents.map(p => (
                <div key={p.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">{p.fullName}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono">
                        <Phone size={13} className="text-slate-400" />
                        <span>{formatPhoneNumber(p.phone)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit ${
                        p.waConsentStatus === 'ACCEPTED' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : p.waConsentStatus === 'DECLINED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        WhatsApp: {consentLabel[p.waConsentStatus] || p.waConsentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-200/60">
                    {/* Fikir 1: Onay İste (WhatsApp + Web Linki) */}
                    {p.waConsentStatus !== 'ACCEPTED' && (
                      <Button 
                        disabled={sendingConsent === p.id} 
                        onClick={() => sendConsent(p.id, p.fullName)} 
                        variant="outline"
                        className="text-xs py-1.5 px-2.5 h-auto text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        leftIcon={<Send size={14} />}
                      >
                        {sendingConsent === p.id ? 'Gönderiliyor...' : 'WhatsApp Onay İsteği Gönder'}
                      </Button>
                    )}

                    {/* Fikir 3: Manuel Düzenle */}
                    {p.contactId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedConsentContact({
                            contactId: p.contactId!,
                            parentId: p.id,
                            parentName: p.fullName,
                            phone: p.phone,
                            relation: p.relation,
                            studentName: data.student.fullName,
                            className: data.student.className,
                            schoolNumber: data.student.schoolNumber,
                            waConsentStatus: p.waConsentStatus,
                            photoConsentStatus: p.photoConsentStatus,
                            consentSource: p.consentSource || undefined,
                          });
                          setIsConsentModalOpen(true);
                        }}
                        className="text-xs py-1.5 px-2.5 h-auto text-slate-700 border-slate-200 hover:bg-slate-100"
                        leftIcon={<Edit3 size={14} />}
                      >
                        Manuel Düzenle
                      </Button>
                    )}

                    {/* 2 Sayfalık KVKK Formu Yazdır (PDF) */}
                    {p.contactId && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={downloadingConsentPdf === p.contactId}
                        onClick={() => handlePrintConsentPdf(p.contactId)}
                        className="text-xs py-1.5 px-2.5 h-auto text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                        leftIcon={<Printer size={14} />}
                      >
                        {downloadingConsentPdf === p.contactId ? 'Hazırlanıyor...' : '2 Sayfalık Formu Yazdır (PDF)'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 2. Absenteeism Summary */}
        <Card icon={FileText} title="Devamsızlık Durumu">
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <Mini label="Özürlü Gün" value={data.absenteeisms.summary.excusedDays} />
            <Mini label="Özürsüz Gün" value={data.absenteeisms.summary.unexcusedDays} />
            <Mini label="Gönderim Bekleyen" value={data.absenteeisms.summary.pending} />
          </div>

          <div className="space-y-2.5">
            {data.absenteeisms.records.slice(0, 8).map(x => (
              <div key={x.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Mektup #{x.warningNumber}{x.isBep ? ' • BEP Öğrencisi' : ''}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {fmtDate(x.createdAt)} &nbsp;•&nbsp; 
                      <span className={x.waSentAt ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                        {x.waSentAt ? 'WhatsApp iletildi' : 'WhatsApp bekliyor'}
                      </span>
                    </div>
                  </div>

                  <Button 
                    disabled={downloadingAbsence === x.id} 
                    onClick={() => downloadFile(`/absenteeism/${x.id}/pdf/download`, `devamsizlik-mektubu-${x.warningNumber}.pdf`, setDownloadingAbsence, x.id)} 
                    variant="outline"
                    className="text-xs py-1.5 px-2.5 h-auto"
                    leftIcon={<Download size={13} />}
                  >
                    {downloadingAbsence === x.id ? 'İndiriliyor...' : 'PDF İndir'}
                  </Button>
                </div>
              </div>
            ))}
            {data.absenteeisms.records.length === 0 && <Empty text="Devamsızlık mektubu kaydı bulunmuyor." />}
          </div>
        </Card>

        {/* 3. Written Warnings */}
        <Card icon={AlertTriangle} title="Yazılı Uyarılar (Tutanaklar)">
          <div className="space-y-2.5">
            {data.warnings.records.slice(0, 8).map(x => (
              <div key={x.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {x.warningNumber}. Uyarı — {x.behaviorCode}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{x.behaviorText}</p>
                    <div className="text-xs text-slate-400 mt-1.5">
                      {fmtDate(x.issuedAt)} &nbsp;•&nbsp; Düzenleyen: {x.issuedBy}
                    </div>
                  </div>

                  <Button 
                    disabled={downloadingWarning === x.id} 
                    onClick={() => downloadFile(`/warnings/${x.id}/pdf/download`, `yazili-uyari-${x.warningNumber}.pdf`, setDownloadingWarning, x.id)} 
                    variant="outline"
                    className="shrink-0 text-xs py-1.5 px-2.5 h-auto"
                    leftIcon={<Download size={13} />}
                  >
                    {downloadingWarning === x.id ? 'İndiriliyor...' : 'PDF İndir'}
                  </Button>
                </div>
              </div>
            ))}
            {data.warnings.records.length === 0 && <Empty text="Yazılı uyarı kaydı bulunmuyor." />}
          </div>
        </Card>

        {/* 4. Violations */}
        <Card icon={ShieldAlert} title="Kural İhlali Takibi">
          <div className="flex gap-2.5 mb-4">
            <Mini label="Toplam İhlal" value={data.violations.total} />
            <Mini label="Onaylanmış" value={data.violations.confirmed} />
          </div>

          <div className="space-y-2.5">
            {data.violations.records.slice(0, 8).map(x => (
              <div key={x.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{x.type}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {fmtDate(x.violationDate)} &nbsp;•&nbsp; 
                      <span className={x.isConfirmed ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                        {x.isConfirmed ? 'Onaylı' : 'Bekliyor'}
                      </span> 
                      &nbsp;•&nbsp; {x.matchedBy}
                    </div>
                  </div>

                  <Button 
                    disabled={busyViolation === x.id} 
                    onClick={() => openViolationSource(x.id)} 
                    variant="outline"
                    className="shrink-0 text-xs py-1.5 px-2.5 h-auto"
                    leftIcon={<ImageIcon size={13} />}
                  >
                    {busyViolation === x.id ? 'Yükleniyor...' : 'Kaynağı Gör'}
                  </Button>
                </div>
              </div>
            ))}
            {data.violations.records.length === 0 && <Empty text="İhlal kaydı bulunmuyor." />}
          </div>
        </Card>

        {/* 5. Communication Consent */}
        <Card icon={MessageSquare} title="WhatsApp İletişim İzni">
          <div className="space-y-3">
            {data.parents.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-semibold text-sm text-slate-900">{p.fullName}</span>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono">{formatPhoneNumber(p.phone)}</div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  p.waConsentStatus === 'ACCEPTED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : p.waConsentStatus === 'DECLINED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {consentLabel[p.waConsentStatus] || p.waConsentStatus}
                </span>
              </div>
            ))}
            {data.parents.length === 0 && <Empty text="İletişim bilgisi bulunamadı." />}
          </div>
        </Card>

        {/* 6. Audit Trail */}
        <Card icon={History} title="Sistem Değişiklik Geçmişi (Audit Logs)">
          <div className="space-y-2.5">
            {data.auditLogs.slice(0, 10).map(x => (
              <Row key={x.id} title={x.action} meta={`${fmtDate(x.createdAt)} • Kullanıcı: ${x.user?.username || 'Sistem'}`} />
            ))}
            {data.auditLogs.length === 0 && <Empty text="Sistem log kaydı bulunmuyor." />}
          </div>
        </Card>
      </div>

      {/* Violation Source Modal */}
      {showSource && source && (
        <div 
          className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" 
          onClick={() => setShowSource(false)}
        >
          <div 
            className="max-w-2xl w-full p-6 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">İhlal Kaynak Detayı</h2>
              <button 
                onClick={() => setShowSource(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-sm pt-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Öğrenci</span>
                  <p className="font-semibold text-slate-800">{source.student?.fullName} ({source.student?.schoolNumber})</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">İhlal Türü</span>
                  <p className="font-semibold text-slate-800">{source.violation?.type || '—'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Tarih</span>
                  <p className="font-medium text-slate-700">{fmtDate(source.violation?.violationDate)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium">Eşleştirme Yöntemi</span>
                  <p className="font-medium text-slate-700">{source.violation?.matchedBy || '—'}</p>
                </div>
              </div>

              {source.upload?.ocrRawText && (
                <div>
                  <span className="text-xs font-semibold text-slate-700">OCR Ham Metni</span>
                  <pre className="mt-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 whitespace-pre-wrap text-xs text-slate-700 font-mono max-h-48 overflow-y-auto">
                    {source.upload.ocrRawText}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setShowSource(false)} variant="outline">
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manuel Açık Rıza Düzenleme Modalı (Fikir 3) */}
      <ManualConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        contact={selectedConsentContact}
        onSuccess={() => load()}
      />
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
          <Icon size={18} />
        </div>
        <h2 className="font-bold text-slate-900 text-base">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="p-4 flex items-center gap-3.5 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
        <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
      <div className="text-lg font-bold text-slate-900">{value ?? 0}</div>
      <div className="text-[11px] font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function Row({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/75 hover:bg-white transition-colors">
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="text-xs text-slate-400 mt-0.5">{meta}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-sm text-slate-400 py-6 text-center italic border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      {text}
    </div>
  );
}
