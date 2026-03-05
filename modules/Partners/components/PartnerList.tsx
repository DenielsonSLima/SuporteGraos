// modules/Partners/components/PartnerList.tsx
// ============================================================================
// Componente de listagem de parceiros (SKILL §9.4: {Modulo}List.tsx)
// Responsabilidade: renderizar grid de cards + paginação
// ============================================================================

import React from 'react';
import { Users } from 'lucide-react';
import PartnerCard from './PartnerCard';
import { Partner, PartnerCategory } from '../partners.types';
import { Pagination } from '../../../components/ui/Pagination';
import { SkeletonCards } from '../../../components/ui/SkeletonCards';

interface PartnerListProps {
  partners: Partner[];
  allCategories: PartnerCategory[];
  balances: Record<string, { credit: number; debit: number; net: number }>;
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onEdit: (partner: Partner) => void;
  onDelete: (partner: Partner) => void;
  onToggleStatus: (partner: Partner) => void;
  onViewDetails: (partner: Partner) => void;
  onExportPdf: (partner: Partner) => void;
}

const PartnerList: React.FC<PartnerListProps> = ({
  partners,
  allCategories,
  balances,
  loading,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewDetails,
  onExportPdf
}) => {
  if (loading) {
    return <SkeletonCards count={8} cols={4} />;
  }

  if (partners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-300 italic border-2 border-dashed rounded-3xl">
        <Users size={64} className="mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest">Nenhum parceiro encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {partners.map(partner => (
          <PartnerCard
            key={partner.id}
            partner={partner}
            allCategories={allCategories}
            balance={balances[partner.id]?.net || 0}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            onViewDetails={onViewDetails}
            onExportPdf={onExportPdf}
          />
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
        isLoading={loading}
      />
    </>
  );
};

export default PartnerList;
