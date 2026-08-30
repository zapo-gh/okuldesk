import React from "react";
import { ActionModal } from "../../../components/ui/ActionModal";
import { ShieldAlert, Trash2 } from "lucide-react";
import { Button } from '../../../components/ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  editError: string;
  editForm: { schoolNumber: string; fullName: string; className: string; status: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ schoolNumber: string; fullName: string; className: string; status: string }>>;
  editParents: { id: string; fullName: string; phone: string }[];
  setEditParents: React.Dispatch<React.SetStateAction<{ id: string; fullName: string; phone: string }[]>>;
  newEditParent: { fullName: string; phone: string } | null;
  setNewEditParent: React.Dispatch<React.SetStateAction<{ fullName: string; phone: string } | null>>;
  handleRemoveParent: (id: string) => void;
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
  newEditParent,
  setNewEditParent,
  handleRemoveParent,
}: Props) {
  return (
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Okul Numarası</label>
          <input
            type="text"
            value={editForm.schoolNumber}
            disabled
            className="w-full p-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg"
          />
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
          <select
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif</option>
          </select>
        </div>

        <div className="mt-6 border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">Veli Bilgileri</h4>

          {editParents.map((p, idx) => (
            <div
              key={p.id}
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
                    const up = [...editParents];
                    up[idx].fullName = e.target.value;
                    setEditParents(up);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="text"
                  value={p.phone}
                  onChange={(e) => {
                    const up = [...editParents];
                    up[idx].phone = e.target.value;
                    setEditParents(up);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <Button variant="ghost" onClick={() => handleRemoveParent(p.id)} className="text-red-600 hover:text-red-900 px-2 py-1 transition-colors" title="Sil">
                <Trash2 size={16} />
              </Button>
            </div>
          ))}

          {newEditParent ? (
            <div className="flex items-end gap-3 p-3 bg-green-50 border border-green-200 border-dashed rounded-lg mb-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-green-800 mb-1">
                  Yeni Veli Adı
                </label>
                <input
                  type="text"
                  value={newEditParent.fullName}
                  onChange={(e) =>
                    setNewEditParent({ ...newEditParent, fullName: e.target.value })
                  }
                  className="w-full p-2 border border-green-300 rounded-md text-sm bg-white"
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-green-800 mb-1">Telefon</label>
                <input
                  type="text"
                  value={newEditParent.phone}
                  onChange={(e) => setNewEditParent({ ...newEditParent, phone: e.target.value })}
                  className="w-full p-2 border border-green-300 rounded-md text-sm bg-white"
                  placeholder="05XX XXX XX XX"
                />
              </div>
              <Button
                type="button"
                onClick={() => setNewEditParent(null)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md shrink-0"
              >
                İptal
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => setNewEditParent({ fullName: "", phone: "" })}
              className="text-sm px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              + Yeni Veli Ekle
            </Button>
          )}
        </div>
      </div>
    </ActionModal>
  );
}
