import React from 'react';
import { Search } from 'lucide-react';
import { ActionModal } from '../../components/ui/ActionModal';

interface StudentOption {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
}

interface UploadResult {
  matched: { studentId: string }[];
  [key: string]: any;
}

interface ViolationsManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  manualSearch: string;
  setManualSearch: (val: string) => void;
  allStudents: StudentOption[];
  result: UploadResult | null;
  manualLoading: boolean;
  handleManualAdd: (studentId: string) => void;
}

export const ViolationsManualAddModal: React.FC<ViolationsManualAddModalProps> = ({
  isOpen,
  onClose,
  manualSearch,
  setManualSearch,
  allStudents,
  result,
  manualLoading,
  handleManualAdd
}) => {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Manuel Öğrenci Ekle"
      hideSubmit
      cancelText="Kapat"
    >
      <div className="space-y-4 min-h-[300px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Ad, numara veya sınıf..." 
            value={manualSearch} 
            onChange={e => setManualSearch(e.target.value)} 
            autoFocus 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm" 
          />
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {manualSearch && allStudents
            .filter(s => 
              !result?.matched.some(m => m.studentId === s.id) && 
              (s.fullName.toLowerCase().includes(manualSearch.toLowerCase()) || s.schoolNumber.includes(manualSearch))
            )
            .slice(0, 15)
            .map(s => (
              <div 
                key={s.id} 
                onClick={() => !manualLoading && handleManualAdd(s.id)} 
                className="flex justify-between items-center p-3 hover:bg-indigo-50 rounded-lg cursor-pointer transition"
              >
                <div>
                  <div className="font-bold text-gray-900">{s.fullName}</div>
                  <div className="text-xs text-gray-500">{s.className} - No: {s.schoolNumber}</div>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded shadow-sm">Ekle</span>
              </div>
          ))}
        </div>
      </div>
    </ActionModal>
  );
};
