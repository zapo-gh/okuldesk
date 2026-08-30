import React, { RefObject } from "react";
import { ActionModal } from "../../../components/ui/ActionModal";
import { ShieldAlert, Upload } from "lucide-react";
import { ParentImportResult } from "./types";
import { Button } from '../../../components/ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  parentError: string;
  parentPreview: ParentImportResult | null;
  parentDone: ParentImportResult | null;
  parentLoading: boolean;
  parentFileRef: RefObject<HTMLInputElement>;
  handleParentFileSelect: (f: File) => void;
  resetParentModal: () => void;
  handleParentImportConfirm: () => void;
}

export function ParentImportModal({
  isOpen,
  onClose,
  parentError,
  parentPreview,
  parentDone,
  parentLoading,
  parentFileRef,
  handleParentFileSelect,
  resetParentModal,
  handleParentImportConfirm,
}: Props) {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Veli Bilgisi Aktar (Excel)"
      width="lg"
    >
      <div className="space-y-4">
        {parentError && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
            <ShieldAlert size={16} /> {parentError}
          </div>
        )}

        {!parentPreview && !parentDone && (
          <>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 mb-2">
              <strong>Desteklenen Sütunlar:</strong> Okul No | Öğr. Ad Soyad | Sınıf/Grup | 1.
              Veli Telefon | 1. Veli Ad Soyad | 1. Veli Yakınlık | 2. Veli Telefon | 2. Veli Adı
            </div>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-indigo-500 hover:bg-indigo-50 transition cursor-pointer"
              onClick={() => parentFileRef.current?.click()}
            >
              {parentLoading ? (
                <div className="animate-pulse text-indigo-600 font-medium">
                  Excel Dosyası Okunuyor...
                </div>
              ) : (
                <>
                  <Upload className="mx-auto text-gray-400 mb-3" size={40} />
                  <p className="font-semibold text-gray-800">Veli Excel dosyasını seçin</p>
                  <p className="text-xs text-gray-500 mt-2">.xls, .xlsx</p>
                </>
              )}
            </div>
          </>
        )}
        <input
          ref={parentFileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleParentFileSelect(e.target.files[0]);
          }}
        />

        {parentPreview && !parentDone && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-lg font-medium">
                {parentPreview.matched} Eşleşen
              </span>
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg font-medium">
                {parentPreview.unmatched} Bulunamayan
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Öğrenci</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600">Durum</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Veli 1</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Veli 2</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {parentPreview.preview.map((r, i) => (
                    <tr key={i} className={r.matched ? "" : "bg-red-50/50 opacity-60"}>
                      <td className="px-3 py-2 font-medium">
                        {r.schoolNumber} - {r.studentName}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.matched ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : (
                          <span className="text-red-500 font-bold">✕</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.parent1Name} <br />
                        <span className="text-gray-500">{r.parent1Phone}</span>
                      </td>
                      <td className="px-3 py-2">
                        {r.parent2Name} <br />
                        <span className="text-gray-500">{r.parent2Phone}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                onClick={resetParentModal}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Farklı Seç
              </Button>
              <Button
                type="button"
                onClick={handleParentImportConfirm}
                disabled={parentLoading || parentPreview.matched === 0}
                variant="primary"
              >
                {parentLoading
                  ? "Aktarılıyor..."
                  : `${parentPreview.matched} Öğrenci Velisini Aktar`}
              </Button>
            </div>
          </div>
        )}

        {parentDone && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Veli Aktarımı Tamamlandı
            </h3>

            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xl font-bold text-green-600">
                  {parentDone.parentsCreated}
                </div>
                <div className="text-xs text-gray-500">Yeni Veli</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xl font-bold text-yellow-600">
                  {parentDone.parentsUpdated}
                </div>
                <div className="text-xs text-gray-500">Güncellenen</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xl font-bold text-indigo-600">{parentDone.matched}</div>
                <div className="text-xs text-gray-500">Eşleşen</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xl font-bold text-red-600">{parentDone.errors.length}</div>
                <div className="text-xs text-gray-500">Hata</div>
              </div>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 w-full"
            >
              Kapat
            </Button>
          </div>
        )}
      </div>
    </ActionModal>
  );
}
