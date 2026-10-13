import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { AbsenteeismRecord } from './types';
import { printPdfBlob } from '../../../utils/printPdf';
import { 
  FileText, 
  ExternalLink, 
  FolderOpen, 
  Printer, 
  Download, 
  X, 
  Loader2 
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  record: AbsenteeismRecord | null;
}

export function AbsenteeismPdfModal({ isOpen, onClose, record }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobData, setBlobData] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !record) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setBlobData(null);
      return;
    }

    let active = true;
    setLoading(true);

    api.get(`/absenteeism/${record.id}/pdf`, { responseType: 'blob' })
      .then((res) => {
        if (!active) return;
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobData(blob);
        setBlobUrl(url);
      })
      .catch((err) => {
        if (!active) return;
        console.error('PDF yüklenemedi:', err);
        toast.error('Devamsızlık mektubu yüklenemedi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [isOpen, record?.id]);

  if (!isOpen || !record) return null;

  const handleOpenInSystem = async () => {
    setActionLoading(true);
    try {
      await api.post(`/absenteeism/${record.id}/open`);
      toast.success('Mektup Windows varsayılan PDF okuyucusunda açıldı.');
    } catch (err: any) {
      toast.error('Dosya harici uygulamada açılamadı.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowInFolder = async () => {
    setActionLoading(true);
    try {
      await api.post(`/absenteeism/${record.id}/show-in-folder`);
      toast.success('Mektup dosyasının bulunduğu klasör açıldı.');
    } catch (err: any) {
      toast.error('Klasör açılamadı.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    if (blobData) {
      printPdfBlob(blobData);
    }
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const safeStudentName = record.student.fullName.replace(/[\\/:*?"<>|]/g, '').trim();
    const safeClassName = record.student.className.replace(/[\\/:*?"<>|]/g, '-').trim();
    const fileName = `${safeClassName}_${record.student.schoolNumber}_${safeStudentName}_${record.warningNumber}.Uyari.pdf`;
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Başlığı */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                <span>{record.student.fullName}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {record.warningNumber}. Uyarı
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {record.student.className} • No: {record.student.schoolNumber} • Yüklenme: {new Date(record.createdAt).toLocaleDateString('tr-TR')}
              </p>
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInSystem}
              disabled={actionLoading}
              leftIcon={<ExternalLink size={14} />}
              className="h-8 px-2.5 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
              title="Varsayılan PDF programında aç"
            >
              Windows'ta Aç
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShowInFolder}
              disabled={actionLoading}
              leftIcon={<FolderOpen size={14} />}
              className="h-8 px-2.5 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
              title="Dosyanın bulunduğu klasörü aç ve göster"
            >
              Klasörde Göster
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!blobData}
              leftIcon={<Printer size={14} />}
              className="h-8 px-2.5 text-xs text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
              title="Mektubu yazdır"
            >
              Yazdır
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!blobUrl}
              leftIcon={<Download size={14} />}
              className="h-8 px-2 text-xs text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
              title="PDF dosyasını indir"
            />

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition ml-1"
              title="Kapat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Gövdesi: PDF Görüntüleyici */}
        <div className="flex-1 p-2 sm:p-4 bg-slate-100 min-h-[400px] flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center text-slate-500 py-16">
              <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
              <p className="text-xs font-semibold">Devamsızlık mektubu yükleniyor...</p>
            </div>
          ) : blobUrl ? (
            <iframe 
              src={blobUrl} 
              className="w-full h-[72vh] rounded-xl border border-slate-300 bg-white shadow-inner"
              title="Devamsızlık Mektubu Önizleme"
            />
          ) : (
            <div className="text-center text-slate-400 py-16 text-xs">
              Mektup görüntülenemedi.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
