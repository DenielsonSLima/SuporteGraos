// modules/Partners/components/PartnerFormEdit.tsx
// ============================================================================
// Formulário de EDIÇÃO de parceiro (SKILL §9.4: {Modulo}FormEdit.tsx)
// ============================================================================

import React from 'react';
import PartnerForm from './PartnerForm';
import { Partner, PartnerCategory, SavePartnerData } from '../partners.types';

interface Props {
  partner: Partner;
  categories: PartnerCategory[];
  onSave: (data: SavePartnerData) => void;
  onCancel: () => void;
}

const PartnerFormEdit: React.FC<Props> = ({ partner, categories, onSave, onCancel }) => {
  return (
    <PartnerForm
      initialData={partner}
      categories={categories}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};

export default PartnerFormEdit;
