import React, { RefObject } from "react";
import { ActionModal } from "../../../components/ui/ActionModal";
import { ShieldAlert, Upload } from "lucide-react";
import { ImportResult } from "./types";
import { Button } from '../../../components/ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  importError: string;
  importPreview: ImportResult | null;
  importDone: ImportResult | null;
  importLoading: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  importFile: File | null;
  handleFileSelect: (f: File) => void;
  resetImportModal: () => void;
  handleImportConfirm: () => void;
}

export function StudentImportModal({
  isOpen,
  onClose,
  importError,
  importPreview,
  importDone,
  importLoading,
  fileInputRef,
  importFile,
  handleFileSelect,
  resetImportModal,
  handleImportConfirm,
}: Props) {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Excel'den Öğrenci Aktar"
      width="lg"
    >
      <div className="space-y-4">
        {importError && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
            <ShieldAlert size={16} /> {importError}
          </div>
        )}

        {!importPreview && !importDone && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-indigo-500 hover:bg-indigo-50 transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {importLoading ? (
              <div className="animate-pulse text-indigo-600 font-medium">
                Excel Dosyası Okunuyor...
              </div>
            ) : (
              <>
                <Upload className="mx-auto text-gray-400 mb-3" size={40} />
                <p className="font-semibold text-gray-800">
                  Excel dosyasını tıklayarak seçin
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Sadece .xls ve .xlsx formatları desteklenir.
                </p>
              </>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
          }}
        />

        {importPreview && !importDone && (
          <div className="space-y-4">
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-800 flex justify-between items-center">
              <span>
                <strong>{importPreview.totalParsed}</strong> öğrenci bulundu.
              </span>
              <span className="text-xs bg-white px-2 py-1 rounded shadow-sm">
                {importFile?.name}
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Okul No</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Ad Soyad</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Sınıf</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {importPreview.students.map((s, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{s.schoolNumber}</td>
                      <td className="px-4 py-2">{s.fullName}</td>
                      <td className="px-4 py-2">{s.className}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                onClick={resetImportModal}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Farklı Dosya Seç
              </Button>
              <Button
                type="button"
                onClick={handleImportConfirm}
                disabled={importLoading}
                variant="primary"
              >
                {importLoading
                  ? "Aktarılıyor..."
                  : `${importPreview.totalParsed} Öğrenciyi Aktar`}
              </Button>
            </div>
          </div>
        )}

        {importDone && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-6">Aktarım Tamamlandı</h3>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-2xl font-bold text-green-600">{importDone.created}</div>
                <div className="text-xs text-gray-500 font-medium">Yeni Eklenen</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-2xl font-bold text-yellow-600">{importDone.skipped}</div>
                <div className="text-xs text-gray-500 font-medium">Güncellenen</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-2xl font-bold text-red-600">{importDone.errors.length}</div>
                <div className="text-xs text-gray-500 font-medium">Hatalı Satır</div>
              </div>
            </div>

            {importDone.errors.length > 0 && (
              <div className="text-left text-xs text-red-600 bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto mb-6">
                {importDone.errors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}

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
