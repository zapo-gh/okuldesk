import React, { useRef } from "react";
import { ActionModal } from "../../../components/ui/ActionModal";
import { FileText, ShieldAlert } from "lucide-react";
import { Student } from "./types";
import { Button } from '../../../components/ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  uploadError: string;
  studentSearch: string;
  setStudentSearch: (v: string) => void;
  showStudentDropdown: boolean;
  setShowStudentDropdown: (v: boolean) => void;
  selectedStudentId: string;
  setSelectedStudentId: (v: string) => void;
  students: Student[];
  fetchWarningCount: (id: string) => void;
  warningLoading: boolean;
  warningNumber: number;
  setWarningNumber: (n: number) => void;
  pdfFile: File | null;
  setPdfFile: (f: File | null) => void;
  isBep: boolean;
  setIsBep: (v: boolean) => void;
}

export function AbsenteeismUploadModal({
  isOpen,
  onClose,
  onSubmit,
  uploadError,
  studentSearch,
  setStudentSearch,
  showStudentDropdown,
  setShowStudentDropdown,
  selectedStudentId,
  setSelectedStudentId,
  students,
  fetchWarningCount,
  warningLoading,
  warningNumber,
  setWarningNumber,
  pdfFile,
  setPdfFile,
  isBep,
  setIsBep,
}: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Devamsızlık Mektubu Yükle"
      onSubmit={onSubmit}
      submitText="Yükle ve Kaydet"
    >
      <div className="space-y-5">
        {uploadError && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
            <ShieldAlert size={16} /> {uploadError}
          </div>
        )}

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Öğrenci</label>
          <input
            ref={searchInputRef}
            type="text"
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              setShowStudentDropdown(true);
              if (!e.target.value) setSelectedStudentId("");
            }}
            onFocus={() => setShowStudentDropdown(true)}
            placeholder="Öğrenci adı veya numarası..."
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            required={!selectedStudentId}
          />
          {showStudentDropdown && studentSearch.length > 0 && (
            <div className="absolute top-full left-0 right-0 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
              {students
                .filter(
                  (s) =>
                    s.fullName
                      .toLocaleLowerCase("tr-TR")
                      .includes(studentSearch.toLocaleLowerCase("tr-TR")) ||
                    s.schoolNumber.includes(studentSearch)
                )
                .map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setStudentSearch(`${s.fullName} (${s.schoolNumber}) - ${s.className}`);
                      setShowStudentDropdown(false);
                      fetchWarningCount(s.id);
                    }}
                    className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition"
                  >
                    <strong className="text-gray-900">{s.fullName}</strong>
                    <span className="text-gray-500 ml-2">
                      {s.schoolNumber} — {s.className}
                    </span>
                  </div>
                ))}
            </div>
          )}
          {selectedStudentId && (
            <p className="text-xs text-green-600 font-medium mt-1">✓ Öğrenci seçildi</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Uyarı Numarası</label>
          {warningLoading ? (
            <div className="text-sm text-gray-500 animate-pulse">
              Önerilen uyarı no hesaplanıyor...
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={warningNumber === n ? 'primary' : 'outline'}
                    onClick={() => setWarningNumber(n)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    {n}. Uyarı
                  </Button>
                ))}
              </div>
              {selectedStudentId && (
                <p className="text-xs text-gray-500 mt-2">
                  Sistem önerisi: <strong>{warningNumber}. uyarı</strong> (daha önce{" "}
                  {warningNumber - 1} mektup yüklenmiş)
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mektup Dosyası</label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer"
            onClick={() => document.getElementById("pdfUpload")?.click()}
          >
            <FileText className="mx-auto text-gray-400 mb-2" size={24} />
            <span className="text-sm text-gray-600 font-medium">
              {pdfFile ? pdfFile.name : "PDF veya Fotoğraf seçmek için tıklayın"}
            </span>
            <input
              id="pdfUpload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={isBep}
            onChange={(e) => setIsBep(e.target.checked)}
            className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">BEP Öğrencisi</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Öğrencinin Bireysel Eğitim Planı varsa seçin. BEP öğrencilerinin devamsızlık hakkı
              farklı hesaplanır.
            </p>
          </div>
        </label>
      </div>
    </ActionModal>
  );
}
