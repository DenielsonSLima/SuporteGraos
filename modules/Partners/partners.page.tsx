// modules/Partners/partners.page.tsx
// ============================================================================
// Página orquestradora do módulo Parceiros (SKILL §1.1 + §9.4)
// Responsabilidade: gerenciar estado, fluxo e coordenar componentes filhos.
// ============================================================================

import React, { useState, useEffect } from 'react';
import PartnerFilters from './components/PartnerFilters';
import PartnerList from './components/PartnerList';
import PartnerFormAdd from './components/PartnerFormAdd';
import PartnerFormEdit from './components/PartnerFormEdit';
import PartnerPdfModal from './components/modals/PartnerPdfModal';
import AllPartnersPdfModal from './components/modals/AllPartnersPdfModal';
import PartnerDeleteModal from './components/modals/PartnerDeleteModal';
import CarrierDetails from './submodules/Carriers/CarrierDetails';
import BrokerDetails from './submodules/Brokers/BrokerDetails';
import { Partner, SavePartnerData } from './partners.types';
import { DEFAULT_PARTNER_CATEGORIES, PARTNER_CATEGORY_IDS } from '../../constants';
import { usePartners, useCreatePartner, useUpdatePartner, useDeletePartner } from '../../hooks/useParceiros';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonCards } from '../../components/ui/SkeletonCards';
import { usePartnersModule } from './hooks/usePartnersModule';
import { authService } from '../../services/authService';
import { partnersService } from './partners.service';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../hooks/queryKeys';

const PartnersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Sincroniza busca com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading: loading } = usePartners({
    page,
    pageSize: PAGE_SIZE,
    searchTerm: debouncedSearch,
    category: activeTab
  });

  const createPartnerMutation = useCreatePartner();
  const updatePartnerMutation = useUpdatePartner();
  const deletePartnerMutation = useDeletePartner();

  const [balancesTick, setBalancesTick] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'form-add' | 'form-edit' | 'details'>('list');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isAllPartnersPdfOpen, setIsAllPartnersPdfOpen] = useState(false);

  const [editingPartner, setEditingPartner] = useState<Partner | undefined>(undefined);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

  const partners = data?.data || [];
  const totalCount = data?.count || 0;

  const { partnerBalances, savePartnerAddress } = usePartnersModule({ partners, balancesTick });

  // ─── Navegação global via evento ────────────────────────
  useEffect(() => {
    const handleGlobalNav = (e: any) => {
      if (e.detail?.moduleId === 'partners' && e.detail?.partnerId) {
        const p = partners.find(it => it.id === e.detail.partnerId);
        if (p) {
          if (p.categories.includes(PARTNER_CATEGORY_IDS.CARRIER) || p.categories.includes(PARTNER_CATEGORY_IDS.BROKER)) {
            setSelectedPartner(p);
            setViewMode('details');
          } else {
            setEditingPartner(p);
            setViewMode('form-edit');
          }
        }
      }
    };
    window.addEventListener('app:navigate', handleGlobalNav);
    return () => window.removeEventListener('app:navigate', handleGlobalNav);
  }, [partners]);

  // ─── Listener de atualização financeira ─────────────────
  useEffect(() => {
    const handleFinancialUpdate = () => setBalancesTick(prev => prev + 1);
    window.addEventListener('financial:updated', handleFinancialUpdate);
    window.addEventListener('data:updated', handleFinancialUpdate);
    return () => {
      window.removeEventListener('financial:updated', handleFinancialUpdate);
      window.removeEventListener('data:updated', handleFinancialUpdate);
    };
  }, []);

  // ─── Fallback: redireciona se partner não tem view dedicada ─
  useEffect(() => {
    if (viewMode === 'details' && selectedPartner) {
      const isCarrier = selectedPartner.categories?.includes(PARTNER_CATEGORY_IDS.CARRIER);
      const isBroker = selectedPartner.categories?.includes(PARTNER_CATEGORY_IDS.BROKER);
      if (!isCarrier && !isBroker) {
        setViewMode('list');
        setSelectedPartner(null);
      }
    }
  }, [viewMode, selectedPartner]);

  // ─── Handlers ───────────────────────────────────────────
  const handleAddNew = () => {
    setEditingPartner(undefined);
    setViewMode('form-add');
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setViewMode('form-edit');
  };

  const handleToggleStatus = async (partner: Partner) => {
    try {
      const newStatus = partner.active === false;
      await updatePartnerMutation.mutateAsync({ id: partner.id, partner: { active: newStatus } });
      addToast(newStatus ? 'success' : 'info', `Parceiro ${newStatus ? 'Ativado' : 'Inativado'}`);
    } catch {
      addToast('error', 'Erro', 'Falha ao atualizar status do parceiro');
    }
  };

  const handleViewDetails = (partner: Partner) => {
    setSelectedPartner(partner);
    setViewMode('details');
  };

  const handleExportPdf = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsPdfModalOpen(true);
  };

  /**
   * handleSave: salva parceiro + endereço + categorias de forma atômica via RPC.
   * SKILL §3.5: Operação completa em uma única transação no banco.
   * SKILL §6.2: Toast de sucesso após conclusão da operação atômica.
   */
  const handleSave = async (saveData: SavePartnerData) => {
    try {
      const companyId = data?.data?.[0]?.companyId || (await authService.getCurrentUser())?.companyId;
      if (!companyId) throw new Error('Company ID não encontrado');

      const { address, ...partnerData } = saveData;

      // Chama a RPC atômica centralizada
      await partnersService.savePartnerComplete({
        partnerId: editingPartner?.id || null,
        companyId,
        partnerData,
        addressData: address || null,
        categories: partnerData.categories || []
      });

      // Invalida as queries do TanStack Query
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARTNERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDRESSES });

      addToast('success', editingPartner ? 'Dados Atualizados' : 'Parceiro Cadastrado');
      setBalancesTick(prev => prev + 1);
      setViewMode('list');
    } catch (error: any) {
      console.error('Erro ao salvar parceiro via RPC:', error);
      
      // SKILL §6.2: Exibe mensagem de erro específica se vier do backend
      const errorMessage = error.message || 'Não foi possível salvar os dados do parceiro.';
      addToast('error', 'Erro no Cadastro', errorMessage);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPage(1);
  };

  // ─── Skeleton inicial ──────────────────────────────────
  if (loading && partners.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-pulse">
          <div className="h-12 w-full max-w-lg rounded-2xl bg-slate-100" />
          <div className="flex gap-3">
            <div className="h-12 w-40 rounded-2xl bg-slate-100" />
            <div className="h-12 w-40 rounded-2xl bg-slate-100" />
          </div>
        </div>
        <SkeletonCards count={8} cols={4} />
      </div>
    );
  }

  // ─── Formulário de Criação (SKILL §9.4: FormAdd separado) ──
  if (viewMode === 'form-add') {
    return (
      <PartnerFormAdd
        categories={DEFAULT_PARTNER_CATEGORIES}
        onSave={handleSave}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  // ─── Formulário de Edição (SKILL §9.4: FormEdit separado) ──
  if (viewMode === 'form-edit' && editingPartner) {
    return (
      <PartnerFormEdit
        partner={editingPartner}
        categories={DEFAULT_PARTNER_CATEGORIES}
        onSave={handleSave}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  // ─── Detalhe: Transportadora / Corretor ─────────────────
  if (viewMode === 'details' && selectedPartner) {
    if (selectedPartner.categories.includes(PARTNER_CATEGORY_IDS.CARRIER)) {
      return <CarrierDetails carrier={selectedPartner} onBack={() => setViewMode('list')} />;
    }
    if (selectedPartner.categories.includes(PARTNER_CATEGORY_IDS.BROKER)) {
      return <BrokerDetails broker={selectedPartner} onBack={() => setViewMode('list')} />;
    }
    return null;
  }

  // ─── Listagem Principal ─────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PartnerFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        categories={DEFAULT_PARTNER_CATEGORIES}
        onPrintReport={() => setIsAllPartnersPdfOpen(true)}
        onAddNew={handleAddNew}
      />

      <PartnerList
        partners={partners}
        allCategories={DEFAULT_PARTNER_CATEGORIES}
        balances={partnerBalances}
        loading={loading}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
        onEdit={handleEdit}
        onDelete={setPartnerToDelete}
        onToggleStatus={handleToggleStatus}
        onViewDetails={handleViewDetails}
        onExportPdf={handleExportPdf}
      />

      {/* MODAIS */}
      {partnerToDelete && (
        <PartnerDeleteModal
          isOpen={!!partnerToDelete}
          partner={partnerToDelete}
          onClose={() => setPartnerToDelete(null)}
          onConfirm={async () => {
            try {
              await deletePartnerMutation.mutateAsync(partnerToDelete.id);
              setPartnerToDelete(null);
              addToast('success', 'Parceiro removido com sucesso');
            } catch {
              addToast('error', 'Erro', 'Falha ao remover parceiro');
            }
          }}
        />
      )}

      {isPdfModalOpen && selectedPartner && (
        <PartnerPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          partner={selectedPartner}
        />
      )}

      {isAllPartnersPdfOpen && (
        <AllPartnersPdfModal
          isOpen={isAllPartnersPdfOpen}
          onClose={() => setIsAllPartnersPdfOpen(false)}
          partners={partners}
          balances={partnerBalances}
        />
      )}
    </div>
  );
};

export default PartnersPage;
