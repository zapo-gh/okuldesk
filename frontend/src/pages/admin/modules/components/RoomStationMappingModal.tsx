import React from 'react';
import { ActionModal } from '../../../../components/ui/ActionModal';
import { RoomStationMappingView } from './RoomStationMappingView';

interface RoomStationMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYear?: string;
  onSaved?: () => void;
}

export const RoomStationMappingModal: React.FC<RoomStationMappingModalProps> = ({
  isOpen,
  onClose,
  academicYear,
  onSaved,
}) => {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Derslik ➔ Nöbet Yeri Eşleştirmesi"
      width="xl"
      hideFooter
    >
      <div className="p-2">
        <RoomStationMappingView
          academicYear={academicYear}
          onSaved={() => {
            if (onSaved) onSaved();
          }}
          isEmbedded={false}
        />
      </div>
    </ActionModal>
  );
};
