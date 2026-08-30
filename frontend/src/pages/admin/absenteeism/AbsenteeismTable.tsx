import { FileText, Smartphone, Trash2 } from "lucide-react";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AbsenteeismRecord } from "./types";
import { printPdfBlob } from "../../../utils/printPdf";
import toast from "react-hot-toast";
import api from "../../../services/api";
import { Button } from '../../../components/ui/Button';

interface Props {
  records: AbsenteeismRecord[];
  listSearch: string;
  waConnected: boolean;
  waSendLoading: string;
  formatDate: (d: string) => string;
  onPreview: (r: AbsenteeismRecord) => void;
  onDelete: (id: string) => void;
}

export function AbsenteeismTable({
  records,
  listSearch,
  waConnected,
  waSendLoading,
  formatDate,
  onPreview,
  onDelete,
}: Props) {
  const unsent = records.filter((r) => !r.waSentAt);
  const sent = records.filter((r) => r.waSentAt);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-left tracking-wider">
              Öğrenci
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-left tracking-wider">
              Sınıf
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center tracking-wider">
              Uyarı No
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-left tracking-wider">
              Durum
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-left tracking-wider">
              Tarih
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {records.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                {listSearch ? "Arama sonucu bulunamadı." : "Henüz devamsızlık mektubu yüklenmemiş."}
              </td>
            </tr>
          ) : (
            <>
              {unsent.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={6}
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
                      onViewPDF={async () => {
                        try {
                          const response = await api.get(`/absenteeism/${r.id}/pdf`, {
                            responseType: "blob",
                          });
                          const url = window.URL.createObjectURL(
                            new Blob([response.data], { type: "application/pdf" })
                          );
                          const a = document.createElement("a");
                          a.href = url;
                          a.target = "_blank";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        } catch (err) {
                          toast.error("Mektup açılamadı.");
                        }
                      }}
                    />
                  ))}
                </>
              )}
              {sent.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={6}
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
                      onViewPDF={async () => {
                        try {
                          const response = await api.get(`/absenteeism/${r.id}/pdf`, {
                            responseType: "blob",
                          });
                          printPdfBlob(new Blob([response.data], { type: "application/pdf" }));
                        } catch (err) {
                          toast.error("Mektup açılamadı.");
                        }
                      }}
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
  return (
    <tr className="hover:bg-gray-50/50 transition">
      <td className="px-6 py-4">
        <div className="font-bold text-gray-900 flex items-center gap-2">
          {r.student.fullName}
          {r.isBep && (
            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              BEP
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 font-medium">{r.student.schoolNumber}</div>
      </td>
      <td className="px-6 py-4 text-sm font-medium text-gray-700">{r.student.className}</td>
      <td className="px-6 py-4 text-center">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border
          ${
            r.warningNumber === 1
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : r.warningNumber === 2
              ? "bg-orange-50 text-orange-700 border-orange-200"
              : "bg-red-50 text-red-700 border-red-200"
          }
        `}
        >
          {r.warningNumber}. Uyarı
        </span>
      </td>
      <td className="px-6 py-4">
        {r.waSentAt ? (
          <StatusBadge status="ACTIVE" customText="Gönderildi" />
        ) : (
          <StatusBadge status="PENDING" customText="Gönderilmedi" />
        )}
      </td>
      <td className="px-6 py-4 text-xs text-gray-500 font-medium">{formatDate(r.createdAt)}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          {waConnected && (
            <Button variant="ghost" onClick={onPreview} disabled={waSendLoading === r.id || !!r.waSentAt} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Veliye Gönder">
              {waSendLoading === r.id ? (
                <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Smartphone size={14} />
              )}
              {!r.waSentAt && "Gönder"}
            </Button>
          )}
          <Button
            onClick={onViewPDF}
            className="p-1.5 text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded shadow-sm transition"
            title="Mektubu PDF olarak aç"
          >
            <FileText size={16} />
          </Button>
          <Button variant="ghost" onClick={onDelete}  className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Kaydı Sil">
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    </tr>
  );
};
