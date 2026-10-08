import React, { RefObject } from "react";
import { ActionModal } from "../../../components/ui/ActionModal";
import { ShieldAlert, Smartphone } from "lucide-react";
import { AbsenteeismRecord } from "./types";
import { Button } from '../../../components/ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  waSendLoading: string;
  waRecord: AbsenteeismRecord | null;
  waExcusedDays: string;
  setWaExcusedDays: (v: string) => void;
  waUnexcusedDays: string;
  setWaUnexcusedDays: (v: string) => void;
  onPreviewRefresh: () => void;
  waPreviewLoading: boolean;
  waPreviewError: string;
  waPreviewData: {
    messages: { parent: string; phone: string; message: string }[];
    hasPreviewImage: boolean;
  } | null;
  fullPageLoading: boolean;
  fullPageImage: string | null;
  cropContainerRef: RefObject<HTMLDivElement>;
  cropTop: number;
  cropBottom: number;
  handleCropMouseDown: (edge: "top" | "bottom") => (e: React.MouseEvent) => void;
  waSelectedParents: Set<string>;
  setWaSelectedParents: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function AbsenteeismWhatsAppModal({
  isOpen,
  onClose,
  onSubmit,
  waSendLoading,
  waRecord,
  waExcusedDays,
  setWaExcusedDays,
  waUnexcusedDays,
  setWaUnexcusedDays,
  onPreviewRefresh,
  waPreviewLoading,
  waPreviewError,
  waPreviewData,
  fullPageLoading,
  fullPageImage,
  cropContainerRef,
  cropTop,
  cropBottom,
  handleCropMouseDown,
  waSelectedParents,
  setWaSelectedParents,
}: Props) {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="WhatsApp Mesaj Önizleme"
      submitText={waSendLoading ? "Gönderiliyor..." : "Gönder"}
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(e);
      }}
      width="lg"
    >
      {waRecord && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
              {waRecord.warningNumber}
            </div>
            <div>
              <div className="font-bold text-indigo-900">
                {waRecord.student.fullName}{" "}
                <span className="text-indigo-600 font-normal ml-2">
                  {waRecord.student.className}
                </span>
              </div>
              <div className="text-indigo-700 text-xs mt-0.5">
                {waRecord.warningNumber}. Devamsızlık Uyarısı
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Özürlü Devamsızlık (Gün)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={waExcusedDays}
                onChange={(e) => setWaExcusedDays(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Örn: 2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Özürsüz Devamsızlık (Gün)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={waUnexcusedDays}
                onChange={(e) => setWaUnexcusedDays(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Örn: 4"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={onPreviewRefresh}
              disabled={waPreviewLoading}
              variant="secondary"
            >
              🔄 Metni Güncelle
            </Button>
          </div>

          {waPreviewError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              <ShieldAlert size={16} className="inline mr-2" /> {waPreviewError}
            </div>
          )}
          {waPreviewLoading && !waPreviewData && (
            <div className="p-8 text-center text-gray-500 animate-pulse font-medium">
              Önizleme Oluşturuluyor...
            </div>
          )}

          {waPreviewData && (
            <div className="border-t pt-4">
              {waPreviewData.hasPreviewImage && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-gray-800">
                      📸 Belge Kırpma (PDF'den dönüştürülen resim)
                    </h4>
                    <span className="text-xs text-gray-500">Mavi çubukları sürükleyin</span>
                  </div>
                  {fullPageLoading ? (
                    <div className="h-48 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center animate-pulse text-gray-400">
                      PDF Görseli Yükleniyor...
                    </div>
                  ) : (
                    fullPageImage && (
                      <div
                        ref={cropContainerRef}
                        className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                      >
                        <img
                          src={`data:image/jpeg;base64,${fullPageImage}`}
                          alt="PDF"
                          className="w-full h-auto max-h-[300px] object-contain block select-none pointer-events-none"
                        />
                        <div
                          className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none"
                          style={{ height: `${cropTop}%` }}
                        />
                        <div
                          className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none"
                          style={{ top: `${cropBottom}%` }}
                        />
                        <div
                          className="absolute left-0 right-0 border-2 border-indigo-500 pointer-events-none"
                          style={{ top: `${cropTop}%`, height: `${cropBottom - cropTop}%` }}
                        />

                        <div
                          onMouseDown={handleCropMouseDown("top")}
                          className="absolute left-0 right-0 h-1.5 bg-indigo-500 cursor-ns-resize z-10 flex items-center justify-center hover:h-2 transition-all"
                          style={{ top: `calc(${cropTop}% - 3px)` }}
                        >
                          <div className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full absolute -top-3">
                            Üst Sınır
                          </div>
                        </div>

                        <div
                          onMouseDown={handleCropMouseDown("bottom")}
                          className="absolute left-0 right-0 h-1.5 bg-indigo-500 cursor-ns-resize z-10 flex items-center justify-center hover:h-2 transition-all"
                          style={{ top: `calc(${cropBottom}% - 3px)` }}
                        >
                          <div className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full absolute -bottom-3">
                            Alt Sınır
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Smartphone size={16} /> Gönderilecek Veliler ve Mesaj
                </h4>
                {waPreviewData.messages.length > 1 && (
                  <div className="text-xs">
                    <Button
                      type="button"
                      onClick={() =>
                        setWaSelectedParents(new Set(waPreviewData.messages.map((m) => m.phone)))
                      }
                      className="text-indigo-600 font-medium hover:underline mr-3"
                    >
                      Tümünü Seç
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setWaSelectedParents(new Set())}
                      className="text-red-600 font-medium hover:underline"
                    >
                      Temizle
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {waPreviewData.messages.map((m, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
                  >
                    <label className="flex items-center gap-3 p-3 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition">
                      <input
                        type="checkbox"
                        checked={waSelectedParents.has(m.phone)}
                        onChange={(e) => {
                          setWaSelectedParents((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(m.phone);
                            else next.delete(m.phone);
                            return next;
                          });
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{m.parent}</p>
                        <p className="text-xs text-gray-500">{m.phone}</p>
                      </div>
                    </label>
                    <div className="p-3 bg-[#e6f4ea]/30">
                      <pre className="text-[13px] font-sans text-gray-700 whitespace-pre-wrap break-words m-0">
                        {m.message}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ActionModal>
  );
}
