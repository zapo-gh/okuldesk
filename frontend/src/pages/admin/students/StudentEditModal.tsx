import React, { useState, useEffect } from "react";
import { ActionModal } from "../../../components/ui/ActionModal";
import { ShieldAlert, Trash2, Lock, Unlock, AlertTriangle, RotateCcw, CheckCircle2, ArrowUpDown } from "lucide-react";
import { Button } from '../../../components/ui/Button';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  editError: string;
  editForm: { schoolNumber: string; fullName: string; className: string; status: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ schoolNumber: string; fullName: string; className: string; status: string }>>;
  editParents: { id: string; fullName: string; phone: string }[];
  setEditParents: React.Dispatch<React.SetStateAction<{ id: string; fullName: string; phone: string }[]>>;
  newEditParents: { tempId: string; fullName: string; phone: string }[];
  setNewEditParents: React.Dispatch<React.SetStateAction<{ tempId: string; fullName: string; phone: string }[]>>;
  handleRemoveParent: (id: string) => void;
  originalSchoolNumber?: string;
}

export function StudentEditModal({
  isOpen,
  onClose,
  onSubmit,
  editError,
  editForm,
  setEditForm,
  editParents,
  setEditParents,
  newEditParents,
  setNewEditParents,
  handleRemoveParent,
  originalSchoolNumber,
}: Props) {
  const [isNumberUnlocked, setIsNumberUnlocked] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [newNumberInput, setNewNumberInput] = useState("");
  const [securityConfirmText, setSecurityConfirmText] = useState("");
  const [changeReason, setChangeReason] = useState("Alan / Bölüm Değişikliği");

  useEffect(() => {
    if (isOpen) {
      setIsNumberUnlocked(false);
      setShowSecurityModal(false);
      setNewNumberInput("");
      setSecurityConfirmText("");
      setChangeReason("Alan / Bölüm Değişikliği");
    }
  }, [isOpen]);

  const openSecurityDialog = () => {
    setNewNumberInput("");
    setSecurityConfirmText("");
    setShowSecurityModal(true);
  };

  return (
    <>
      <ActionModal
        isOpen={isOpen}
        onClose={onClose}
        title="Öğrenciyi Düzenle"
        onSubmit={onSubmit}
      >
        <div className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
              <ShieldAlert size={16} /> {editError}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Okul Numarası</label>
              {!isNumberUnlocked ? (
                <button
                  type="button"
                  onClick={openSecurityDialog}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
                  title="Alan veya bölüm değişikliği nedeniyle yeni numara tanımlamak için tıklayın"
                >
                  <Lock size={12} className="text-amber-600" />
                  Numarayı Değiştir (Güvenlik Korumalı)
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Yeni Numara Aktif ({changeReason})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (originalSchoolNumber) {
                        setEditForm((prev) => ({ ...prev, schoolNumber: originalSchoolNumber }));
                      }
                      setIsNumberUnlocked(false);
                      toast('Numara eski haline getirildi ve kilitlendi.');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline inline-flex items-center gap-1 cursor-pointer"
                    title="Değişiklikten vazgeç ve eski numaraya dön"
                  >
                    <RotateCcw size={11} /> Vazgeç & Eskiye Dön
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={editForm.schoolNumber}
                readOnly={!isNumberUnlocked}
                onClick={() => {
                  if (!isNumberUnlocked) openSecurityDialog();
                }}
                onChange={(e) => setEditForm({ ...editForm, schoolNumber: e.target.value })}
                placeholder="Okul numarası"
                className={`w-full px-4 py-2 rounded-lg text-sm transition-all font-mono ${
                  isNumberUnlocked
                    ? "border-2 border-emerald-500 bg-emerald-50/20 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    : "border border-slate-300 bg-slate-100/80 text-slate-700 cursor-pointer hover:bg-slate-200/60"
                }`}
                title={!isNumberUnlocked ? "Numarayı değiştirmek için tıklayın" : "Okul numarası"}
                required
              />
              <div
                className="absolute right-3 top-2.5 cursor-pointer"
                onClick={() => {
                  if (!isNumberUnlocked) openSecurityDialog();
                }}
              >
                {isNumberUnlocked ? (
                  <Unlock size={16} className="text-emerald-600" />
                ) : (
                  <Lock size={16} className="text-slate-500 hover:text-amber-700" />
                )}
              </div>
            </div>

            {!isNumberUnlocked ? (
              <p
                onClick={openSecurityDialog}
                className="text-xs text-slate-500 mt-1 cursor-pointer hover:text-amber-700 flex items-center gap-1"
              >
                <span>🔒 Okul numarası güvenlik gereği kilitlidir. Alan/bölüm değişikliğinde yeni numara girmek için tıklayınız.</span>
              </p>
            ) : (
              <p className="text-xs text-emerald-700 mt-1 font-medium flex items-center gap-1">
                <span>✅ Yeni numara girildi. Aşağıdaki <strong>Kaydet</strong> butonuna basıldığında sisteme işlenecektir.</span>
              </p>
            )}
          </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input
              type="text"
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf</label>
            <input
              type="text"
              value={editForm.className}
              onChange={(e) => setEditForm({ ...editForm, className: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>


        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <span>Veli Bilgileri</span>
                <span className="text-xs font-normal text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  1. Sıradaki veli asıl / öncelikli velidir
                </span>
              </h4>
              <p className="text-xs text-gray-500">Öğrenciye en fazla 2 veli tanımlanabilir. Sistem bildirimleri ve onaylar 1. veliye gönderilir.</p>
            </div>
            <div>
              {editParents.length + newEditParents.length < 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setNewEditParents((prev) => [
                      ...prev,
                      { tempId: `temp-${Date.now()}-${Math.random()}`, fullName: "", phone: "" },
                    ])
                  }
                  className="text-xs text-indigo-600 font-semibold hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer flex items-center gap-1"
                >
                  + Yeni Veli Ekle
                </Button>
              )}
            </div>
          </div>

          {/* Mevcut Kayıtlı Veliler */}
          {editParents.map((p, idx) => (
            <div
              key={p.id}
              className={`p-3 mb-3 bg-white rounded-xl shadow-sm border transition-all ${
                idx === 0
                  ? 'border-indigo-300 ring-1 ring-indigo-200/60 bg-gradient-to-r from-indigo-50/30 to-white'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      idx === 0
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {idx === 0 ? '1. Veli (Asıl Veli)' : '2. Veli (Yedek)'}
                  </span>
                  <span className={`text-[11px] ${idx === 0 ? 'text-indigo-700 font-medium' : 'text-slate-500'}`}>
                    {idx === 0
                      ? '• İlk kullanılacak öncelikli iletişim numarası (WhatsApp / Devamsızlık / SMS)'
                      : '• Gerektiğinde ulaşılacak ikinci iletişim numarası'}
                  </span>
                </div>
                {editParents.length === 2 && idx === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditParents([editParents[1], editParents[0]]);
                      toast.success('1. ve 2. veli sırası değiştirildi. Onaylamak için Kaydet butonuna basınız.');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition cursor-pointer shrink-0"
                    title="1. ve 2. velinin yerini değiştir"
                  >
                    <ArrowUpDown size={13} className="text-indigo-600" />
                    <span>Yer Değiştir</span>
                  </button>
                )}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Veli Adı Soyadı
                  </label>
                  <input
                    type="text"
                    value={p.fullName}
                    onChange={(e) => {
                      const up = [...editParents];
                      up[idx].fullName = e.target.value;
                      setEditParents(up);
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ad Soyad"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Telefon Numarası
                  </label>
                  <input
                    type="text"
                    value={p.phone}
                    onChange={(e) => {
                      const up = [...editParents];
                      up[idx].phone = e.target.value;
                      setEditParents(up);
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleRemoveParent(p.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md border border-red-100 shrink-0 cursor-pointer"
                  title="Veliyi Sil"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}

          {/* Yeni Eklenen Veliler */}
          {newEditParents.map((np, nIdx) => (
            <div
              key={np.tempId}
              className="flex items-end gap-2 p-3 mb-3 bg-emerald-50/50 border border-emerald-200 border-dashed rounded-xl"
            >
              <div className="flex-1">
                <label className="block text-xs font-medium text-emerald-900 mb-1">
                  {editParents.length + nIdx + 1}. Yeni Veli Adı
                </label>
                <input
                  type="text"
                  value={np.fullName}
                  onChange={(e) => {
                    const up = [...newEditParents];
                    up[nIdx].fullName = e.target.value;
                    setNewEditParents(up);
                  }}
                  className="w-full p-2 border border-emerald-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-emerald-900 mb-1">Telefon</label>
                <input
                  type="text"
                  value={np.phone}
                  onChange={(e) => {
                    const up = [...newEditParents];
                    up[nIdx].phone = e.target.value;
                    setNewEditParents(up);
                  }}
                  className="w-full p-2 border border-emerald-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="05XX XXX XX XX"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setNewEditParents((prev) => prev.filter((item) => item.tempId !== np.tempId))
                }
                className="p-2 text-red-500 hover:bg-red-50 rounded-md border border-red-100 shrink-0 cursor-pointer"
                title="İptal Et"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}

          {editParents.length === 0 && newEditParents.length === 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center">
              <p className="text-xs text-slate-500 mb-2">Bu öğrenciye kayıtlı veli bulunmamaktadır.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setNewEditParents([
                    { tempId: `temp-${Date.now()}-1`, fullName: "", phone: "" },
                  ])
                }
                className="text-xs text-indigo-600 hover:bg-indigo-50 border-indigo-200 inline-flex items-center gap-1 cursor-pointer"
              >
                + Yeni Veli Ekle
              </Button>
            </div>
          )}
        </div>
      </div>
    </ActionModal>

      {/* Güvenlik Doğrulama Modalı (Okul Numarası Kilidini Açma) */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 transition-opacity"
            onClick={() => setShowSecurityModal(false)}
          />

          {/* Modal Dialog */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="p-5 border-b border-amber-100 bg-amber-50/70 flex items-start gap-3.5">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Güvenlik Adımı: Okul Numarası Değişikliği
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Öğrenci kimlik numarasını değiştirmek için güvenlik doğrulamasını onaylayınız.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Öğrenci Bilgi Özeti */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Öğrenci:</span>
                  <span className="font-semibold text-slate-900">{editForm.fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Sınıfı:</span>
                  <span className="font-semibold text-slate-900">{editForm.className}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mevcut Okul Numarası:</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded">
                    {originalSchoolNumber || editForm.schoolNumber}
                  </span>
                </div>
              </div>

              {/* Yeni Okul Numarası Girişi */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                <label className="block text-xs font-bold text-indigo-950 mb-1.5">
                  Yeni Okul Numarası <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newNumberInput}
                  onChange={(e) => setNewNumberInput(e.target.value)}
                  placeholder="Yeni okul numarasını giriniz (Örn: 450)"
                  className="w-full px-3.5 py-2 border-2 border-indigo-300 focus:border-indigo-600 rounded-lg text-sm font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  autoFocus
                />
                <p className="text-[11px] text-indigo-700 mt-1 font-medium">
                  Öğrencinin yeni alan/bölümündeki veya düzeltilmiş okul numarasını yazınız.
                </p>
              </div>

              {/* Değişiklik Gerekçesi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Değişiklik Gerekçesi
                </label>
                <select
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="Alan / Bölüm Değişikliği">Alan / Bölüm Değişikliği (Meslek/Teknik)</option>
                  <option value="E-Okul Numara Düzeltmesi">E-Okul Numara Düzeltmesi</option>
                  <option value="Dal / Şube Geçişi">Dal / Şube Geçişi</option>
                  <option value="Diğer Resmi İdari Gerekçe">Diğer Resmi İdari Gerekçe</option>
                </select>
              </div>

              {/* Bilgilendirme Kutusu */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle size={14} /> Önemli Bilgilendirme
                </div>
                <p className="leading-relaxed text-[11px]">
                  Okul numarası değiştirildiğinde öğrencinin tüm devamsızlık ve resmi kayıtları otomatik olarak yeni numaraya aktarılır.
                </p>
              </div>

              {/* Onay Kelimesi Girişi */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  İşlemi onaylamak için kutucuğa <span className="font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded tracking-wider">ONAYLA</span> yazınız:
                </label>
                <input
                  type="text"
                  value={securityConfirmText}
                  onChange={(e) => setSecurityConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    const canSubmit =
                      newNumberInput.trim().length > 0 &&
                      newNumberInput.trim() !== (originalSchoolNumber || editForm.schoolNumber) &&
                      securityConfirmText.trim().toUpperCase() === "ONAYLA";
                    if (e.key === "Enter" && canSubmit) {
                      e.preventDefault();
                      setEditForm((prev) => ({ ...prev, schoolNumber: newNumberInput.trim() }));
                      setIsNumberUnlocked(true);
                      setShowSecurityModal(false);
                      toast.success(`Yeni numara (${newNumberInput.trim()}) tanımlandı. Lütfen ana formdaki Kaydet butonuna basınız.`);
                    }
                  }}
                  placeholder="ONAYLA"
                  className="w-full px-3.5 py-2 border-2 border-slate-300 focus:border-amber-500 rounded-lg text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowSecurityModal(false)}
                className="text-slate-600 hover:text-slate-900"
              >
                Vazgeç
              </Button>
              {(() => {
                const isValidNewNumber =
                  newNumberInput.trim().length > 0 &&
                  newNumberInput.trim() !== (originalSchoolNumber || editForm.schoolNumber);
                const isConfirmed = securityConfirmText.trim().toUpperCase() === "ONAYLA";
                const canApply = isValidNewNumber && isConfirmed;

                return (
                  <Button
                    type="button"
                    disabled={!canApply}
                    onClick={() => {
                      setEditForm((prev) => ({ ...prev, schoolNumber: newNumberInput.trim() }));
                      setIsNumberUnlocked(true);
                      setShowSecurityModal(false);
                      toast.success(`Yeni numara (${newNumberInput.trim()}) tanımlandı. Kaydetmek için formdaki Kaydet butonuna basınız.`);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      canApply
                        ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Yeni Numarayı Tanımla ve Uygula
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
