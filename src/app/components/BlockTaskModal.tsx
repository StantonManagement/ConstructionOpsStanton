import React from 'react';
import { BlockLocationModal } from './BlockLocationModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  locationName?: string;
  currentReason?: string;
  currentNote?: string;
}

export const BlockTaskModal: React.FC<Props> = ({
  isOpen,
  onClose,
  locationId,
  locationName,
  currentReason,
  currentNote,
}) => {
  return (
    <BlockLocationModal
      isOpen={isOpen}
      onClose={onClose}
      locationId={locationId}
      locationName={locationName}
      currentReason={currentReason}
      currentNote={currentNote}
    />
  );
};
