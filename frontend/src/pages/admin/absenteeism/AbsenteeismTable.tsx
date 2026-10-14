import { FileText, Smartphone, Trash2 } from "lucide-react";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AbsenteeismRecord } from "./types";
import { Button } from '../../../components/ui/Button';

interface Props {
  records: AbsenteeismRecord[];
  listSearch: string;
  waConnected: boolean;
  waSendLoading: string;
  formatDate: (d: string) => string;
  onPreview: (r: AbsenteeismRecord) => void;
  onDelete: (id: string) => void;
  onViewPDF: (r: AbsenteeismRecord) => void;
}

export function AbsenteeismTable({
  records,
  listSearch,
  waConnected,
  waSendLoading,
  formatDate,
  onPreview,
  onDelete,
  onViewPDF,
}: Props) {
  const unsent = records.filter((r) => !r.waSentAt);
  const sent = records.filter((r) => r.waSentAt);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              Öğrenci
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              Sınıf
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              Veli / İletişim & Onay
            </th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              Uyarı No
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              Durum
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              Tarih
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {records.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                {listSearch ? "Arama sonucu bulunamadı." : "Henüz devamsızlık mektubu yüklenmemiş."}
              </td>
            </tr>
          ) : (
            <>
              {unsent.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-2 bg-amber-50/50 border-y border-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider"
                    >
                      📨 Gönderilmeyi Bekleyenler ({unsent.length})
                    </td>
                  </tr>
                  {unsent.map((r) => (
                    <RecordRow
                      key={r.id}
                      r={r}
                      waConnected={waConnected}
                      waSendLoading={waSendLoading}
                      formatDate={formatDate}
                      onPreview={() => onPreview(r)}
                      onDelete={() => onDelete(r.id)}
                      onViewPDF={() => onViewPDF(r)}
                    />
                  ))}
                </>
              )}
              {sent.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-2 bg-green-50/50 border-y border-green-100 text-green-800 text-xs font-bold uppercase tracking-wider mt-4"
                    >
                      ✅ Başarıyla Gönderilenler ({sent.length})
                    </td>
                  </tr>
                  {sent.map((r) => (
                    <RecordRow
                      key={r.id}
                      r={r}
                      waConnected={waConnected}
                      waSendLoading={waSendLoading}
                      formatDate={formatDate}
                      onPreview={() => onPreview(r)}
                      onDelete={() => onDelete(r.id)}
                      onViewPDF={() => onViewPDF(r)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

const RecordRow = ({
  r,
  waConnected,
  waSendLoading,
  formatDate,
  onPreview,
  onDelete,
  onViewPDF,
}: any) => {
  const parents = r.student?.parents || [];

  return (
    <tr className="hover:bg-gray-50/50 transition">
      {/* Öğrenci Bilgisi */}
      <td className="px-4 py-3">
        <div className="font-bold text-gray-900 flex items-center gap-2">
          {r.student.fullName}
          {r.isBep && (
            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              BEP
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 font-medium">No: {r.student.schoolNumber}</div>
      </td>

      {/* Sınıf */}
      <td className="px-4 py-3 text-sm font-medium text-gray-700">{r.student.className}</td>

      {/* Veli / İletişim & WhatsApp Onay Durumu */}
      <td className="px-4 py-3">
        {parents.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {parents.map((p: any, idx: number) => (
              <div key={p.id || idx} className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-800 text-xs">
                  {p.fullName}
                </span>
                {p.relation && p.relation !== 'Veli' && (
                  <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded font-medium">
                    {p.relation}
                  </span>
                )}
                {p.isPrimary && (
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded">
                    1. Veli
                  </span>
                )}
                <span className="font-mono text-slate-600 text-[11px]">
                  {p.phone || 'Tel yok'}
                </span>

                {/* WhatsApp KVKK Onay Rozeti */}
                {p.waConsentStatus === 'ACCEPTED' ? (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    title="WhatsApp KVKK İzni Onaylı"
                  >
                    ✅ Onaylı
                  </span>
                ) : p.waConsentStatus === 'DECLINED' ? (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                    title="WhatsApp İletişim İzni Reddedildi!"
                  >
                    ❌ Reddedildi
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                    title="WhatsApp Onayı Bekliyor / Alınmadı"
                  >
                    ⏳ Onaysız
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-rose-500 font-medium italic">Veli kaydı yok</span>
        )}
      </td>

      {/* Uyarı No */}
      <td className="px-4 py-3 text-center">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            r.warningNumber === 1
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : r.warningNumber === 2
              ? "bg-orange-50 text-orange-700 border-orange-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {r.warningNumber}. Uyarı
        </span>
      </td>

      {/* Durum */}
      <td className="px-4 py-3">
        {r.waSentAt ? (
          <StatusBadge status="ACTIVE" customText="Gönderildi" />
        ) : (
          <StatusBadge status="PENDING" customText="Gönderilmedi" />
        )}
      </td>

      {/* Tarih */}
      <td className="px-4 py-3 text-xs text-gray-500 font-medium">{formatDate(r.createdAt)}</td>

      {/* İşlemler */}
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1.5">
          {waConnected && (
            <Button
              variant="ghost"
              onClick={onPreview}
              disabled={waSendLoading === r.id || !!r.waSentAt}
              className="text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Veliye Devamsızlık Mektubu Gönder"
            >
              {waSendLoading === r.id ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Smartphone size={13} />
              )}
              {!r.waSentAt && "Gönder"}
            </Button>
          )}
          <button
            type="button"
            onClick={onViewPDF}
            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
            title="Mektubu PDF olarak aç ve görüntüle"
          >
            <FileText size={15} />
          </button>
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-red-600 hover:text-red-900 px-1.5 py-1 transition-colors cursor-pointer"
            title="Kaydı Sil"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </td>
    </tr>
  );
};
