// modules/Partners/components/PartnerFormAdd.tsx
// ============================================================================
// Formulário de CRIAÇÃO de parceiro (SKILL §9.4: {Modulo}FormAdd.tsx)
// ============================================================================

import React from 'react';
import PartnerForm from './PartnerForm';
import { PartnerCategory, SavePartnerData } from '../partners.types';

interface Props {
  categories: PartnerCategory[];
  onSave: (data: SavePartnerData) => void;
  onCancel: () => void;
}

const PartnerFormAdd: React.FC<Props> = ({ categories, onSave, onCancel }) => {
  return (
    <PartnerForm
      categories={categories}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};

export default PartnerFormAdd;
