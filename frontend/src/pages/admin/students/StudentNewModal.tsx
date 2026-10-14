import React from "react";
import { ActionModal } from "../../../components/ui/ActionModal";
import { ShieldAlert, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from '../../../components/ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  newLoading: boolean;
  newError: string;
  newForm: { schoolNumber: string; fullName: string; className: string };
  setNewForm: React.Dispatch<React.SetStateAction<{ schoolNumber: string; fullName: string; className: string }>>;
  newParents: { fullName: string; phone: string }[];
  setNewParents: React.Dispatch<React.SetStateAction<{ fullName: string; phone: string }[]>>;
}

export function StudentNewModal({
  isOpen,
  onClose,
  onSubmit,
  newLoading,
  newError,
  newForm,
  setNewForm,
  newParents,
  setNewParents,
}: Props) {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Öğrenci Ekle"
      submitText={newLoading ? "Kaydediliyor..." : "Öğrenciyi Kaydet"}
      onSubmit={onSubmit}
    >
      <div className="space-y-4">
        {newError && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
            <ShieldAlert size={16} /> {newError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Okul Numarası</label>
          <input
            type="text"
            value={newForm.schoolNumber}
            onChange={(e) => setNewForm({ ...newForm, schoolNumber: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input
              type="text"
              value={newForm.fullName}
              onChange={(e) => setNewForm({ ...newForm, fullName: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sınıf</label>
            <input
              type="text"
              value={newForm.className}
              onChange={(e) => setNewForm({ ...newForm, className: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
              placeholder="ör: 9/A"
            />
          </div>
        </div>

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <span>Veli Bilgileri</span>
                <span className="text-xs font-normal text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  1. Sıradaki veli asıl / öncelikli velidir
                </span>
              </h4>
              <p className="text-xs text-gray-500">
                Öğrenci iletişim ve WhatsApp bildirimleri ilk sıradaki (1. Veli) numarasına gönderilir.
              </p>
            </div>
            <div>
              {newParents.length < 2 && (
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => setNewParents([...newParents, { fullName: "", phone: "" }])}
                  className="text-xs text-indigo-600 font-semibold hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer flex items-center gap-1"
                >
                  + Veli Ekle
                </Button>
              )}
            </div>
          </div>

          {newParents.map((p, idx) => (
            <div
              key={idx}
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
                {newParents.length === 2 && idx === 0 && (
                  <button
                    type="button"
                    onClick={() => setNewParents([newParents[1], newParents[0]])}
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
                      const up = [...newParents];
                      up[idx].fullName = e.target.value;
                      setNewParents(up);
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
                      const up = [...newParents];
                      up[idx].phone = e.target.value;
                      setNewParents(up);
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="05XX XXX XX XX"
                  />
                </div>
                {newParents.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNewParents(newParents.filter((_, i) => i !== idx))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md border border-red-100 shrink-0 cursor-pointer"
                    title="Veliyi Sil"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ActionModal>
  );
}
