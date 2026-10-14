import React, { RefObject } from "react";
import { ActionModal } from "../../../components/ui/ActionModal";
import { ShieldAlert, Smartphone, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
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
    messages: {
      parent: string;
      relation?: string;
      phone: string;
      waConsentStatus?: string;
      waConsentDate?: string | Date | null;
      isPrimary?: boolean;
      message: string;
    }[];
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
  waConnected?: boolean;
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
  waConnected = true,
}: Props) {
  const selectedCount = waSelectedParents.size;

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="WhatsApp Devamsızlık Mektubu Gönderimi"
      submitDisabled={!waConnected || !!waSendLoading || selectedCount === 0 || waPreviewLoading}
      submitText={
        !waConnected
          ? "⚠️ WhatsApp Bağlantısı Gerekli"
          : waSendLoading
          ? "Gönderiliyor..."
          : selectedCount === 0
          ? "Veli Seçilmedi"
          : `Seçili (${selectedCount}) Veliye Gönder`
      }
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(e);
      }}
      width="lg"
    >
      {waRecord && (
        <div className="space-y-4">
          {/* WhatsApp Bağlantı Uyarısı */}
          {!waConnected && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start justify-between gap-3 text-amber-900 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-950 text-sm">WhatsApp Bağlantısı Bulunamadı</div>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">
                    Veliye WhatsApp üzerinden bildirim gönderebilmek için sol menüdeki <strong>WhatsApp İletişim</strong> bölümünden telefonunuzun kamerasıyla QR kodu taratıp bağlantı kurmalısınız.
                  </p>
                </div>
              </div>
              <a
                href="/admin/whatsapp"
                className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-xs"
              >
                WhatsApp'a Git
              </a>
            </div>
          )}

          {/* Öğrenci Bilgi Kartı */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-base shadow-xs">
                {waRecord.warningNumber}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                  {waRecord.student.fullName}
                  <span className="text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded text-xs font-semibold">
                    {waRecord.student.className}
                  </span>
                  <span className="text-slate-500 font-mono text-xs">
                    No: {waRecord.student.schoolNumber}
                  </span>
                </div>
                <div className="text-indigo-800 text-xs font-medium mt-0.5">
                  {waRecord.warningNumber}. Devamsızlık Uyarı Mektubu
                </div>
              </div>
            </div>
          </div>

          {/* Gün Girişi */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Özürlü Devamsızlık (Gün)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={waExcusedDays}
                onChange={(e) => setWaExcusedDays(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
                placeholder="Örn: 2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Özürsüz Devamsızlık (Gün)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={waUnexcusedDays}
                onChange={(e) => setWaUnexcusedDays(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
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
              className="text-xs"
            >
              🔄 Metni Güncelle
            </Button>
          </div>

          {waPreviewError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              <ShieldAlert size={16} className="inline mr-2" /> {waPreviewError}
            </div>
          )}
          {waPreviewLoading && !waPreviewData && (
            <div className="p-8 text-center text-gray-500 animate-pulse font-medium text-sm">
              Önizleme ve veli izin durumu yükleniyor...
            </div>
          )}

          {waPreviewData && (
            <div className="border-t border-gray-200 pt-4">
              {/* Belge Kırpma Alanı */}
              {waPreviewData.hasPreviewImage && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-gray-800">
                      📸 Belge Kırpma (PDF'den dönüştürülen görsel)
                    </h4>
                    <span className="text-xs text-gray-500">Mavi çubukları sürükleyin</span>
                  </div>
                  {fullPageLoading ? (
                    <div className="h-48 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center animate-pulse text-gray-400 text-sm">
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

              {/* Veli Seçimi ve Onay Durumu Başlığı */}
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Smartphone size={16} className="text-indigo-600" />
                  Gönderilecek Veliler ve İzin Durumu
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setWaSelectedParents(new Set(waPreviewData.messages.map((m) => m.phone)))
                    }
                    className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    Tümünü Seç
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const approved = waPreviewData.messages
                        .filter((m) => m.waConsentStatus === "ACCEPTED")
                        .map((m) => m.phone);
                      setWaSelectedParents(
                        new Set(approved.length > 0 ? approved : waPreviewData.messages.map((m) => m.phone))
                      );
                    }}
                    className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    title="Yalnızca WhatsApp KVKK izni onaylı olan velileri seçer"
                  >
                    Sadece Onaylıları Seç
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setWaSelectedParents(new Set())}
                    className="text-red-600 font-semibold hover:underline cursor-pointer"
                  >
                    Temizle
                  </button>
                </div>
              </div>

              {/* Veli Kartları Listesi */}
              <div className="space-y-3.5">
                {waPreviewData.messages.map((m, i) => {
                  const isChecked = waSelectedParents.has(m.phone);
                  const isDeclined = m.waConsentStatus === "DECLINED";
                  const isAccepted = m.waConsentStatus === "ACCEPTED";

                  return (
                    <div
                      key={i}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        isChecked
                          ? "border-indigo-400 ring-2 ring-indigo-100 bg-white"
                          : "border-gray-200 bg-gray-50/70 opacity-80"
                      }`}
                    >
                      {/* Veli Seçim Başlığı */}
                      <label className="flex items-center gap-3 p-3 bg-white border-b border-gray-100 cursor-pointer hover:bg-slate-50/70 transition">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setWaSelectedParents((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(m.phone);
                              else next.delete(m.phone);
                              return next;
                            });
                          }}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">{m.parent}</span>
                              {m.relation && m.relation !== "Veli" && (
                                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                                  {m.relation}
                                </span>
                              )}
                              {m.isPrimary && (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                                  1. Veli
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{m.phone}</div>
                          </div>

                          {/* WhatsApp Onay Rozeti */}
                          <div>
                            {isAccepted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>WhatsApp Onaylı</span>
                              </span>
                            ) : isDeclined ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                <AlertTriangle size={13} className="text-rose-600" />
                                <span>İzin Reddedildi</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                <Clock size={13} className="text-amber-600" />
                                <span>Onay Bekliyor</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </label>

                      {/* Reddedilmiş Veli Uyarısı */}
                      {isDeclined && (
                        <div className="px-3 py-2 bg-rose-50/90 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                          <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                          <span>
                            <strong>KVKK Uyarısı:</strong> Bu veli WhatsApp iletişimini reddetmiştir. Resmi bilgilendirmenin SMS veya matbu yazılı tebligat ile yapılması önerilir.
                          </span>
                        </div>
                      )}

                      {/* Mesaj Önizlemesi */}
                      <div className="p-3 bg-[#e6f4ea]/30">
                        <pre className="text-[12.5px] font-sans text-gray-800 whitespace-pre-wrap break-words m-0 leading-relaxed">
                          {m.message}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </ActionModal>
  );
}
