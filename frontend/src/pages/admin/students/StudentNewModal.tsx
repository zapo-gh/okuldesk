import React from "react";
import { ActionModal } from "../../../components/ui/ActionModal";
import { ShieldAlert, Trash2 } from "lucide-react";
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
            <h4 className="font-semibold text-gray-800">Veli Bilgileri</h4>
            {newParents.length < 2 && (
              <Button 
                type="button" 
                variant="ghost"
                onClick={() => setNewParents([...newParents, { fullName: "", phone: "" }])}
                className="text-sm text-indigo-600 font-medium hover:bg-indigo-50 px-3 py-1"
              >
                + Veli Ekle
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Telefon numarası ile veli hesabı otomatik oluşturulacaktır.
          </p>

          {newParents.map((p, idx) => (
            <div
              key={idx}
              className="flex items-end gap-3 p-3 bg-white border rounded-lg mb-3 shadow-sm"
            >
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {idx + 1}. Veli Adı
                </label>
                <input
                  type="text"
                  value={p.fullName}
                  onChange={(e) => {
                    const up = [...newParents];
                    up[idx].fullName = e.target.value;
                    setNewParents(up);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="text"
                  value={p.phone}
                  onChange={(e) => {
                    const up = [...newParents];
                    up[idx].phone = e.target.value;
                    setNewParents(up);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  placeholder="05XX XXX XX XX"
                />
              </div>
              {newParents.length > 1 && (
                <Button
                  type="button"
                  onClick={() => setNewParents(newParents.filter((_, i) => i !== idx))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md border border-red-100 shrink-0"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </ActionModal>
  );
}
