
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Users,
  Printer,
  X,
  Loader2
} from 'lucide-react';
import PartnerCard from './components/PartnerCard';
import PartnerForm from './components/PartnerForm';
import PartnerPdfModal from './components/modals/PartnerPdfModal';
import AllPartnersPdfModal from './components/modals/AllPartnersPdfModal';
import PartnerDeleteModal from './components/modals/PartnerDeleteModal';
import CarrierDetails from './submodules/Carriers/CarrierDetails';
import BrokerDetails from './submodules/Brokers/BrokerDetails';
import ActionConfirmationModal from '../../components/ui/ActionConfirmationModal';
import { Partner } from './types';
import { DEFAULT_PARTNER_CATEGORIES, PARTNER_CATEGORY_IDS } from '../../constants';
import { partnerService } from '../../services/partnerService';
import { partnerAddressService } from '../../services/partnerAddress';
import { locationService } from '../../services/locationService';
import { financialIntegrationService } from '../../services/financialIntegrationService';
import { advanceService } from '../Financial/Advances/services/advanceService';
import { useToast } from '../../contexts/ToastContext';
import { waitForInit } from '../../services/supabaseInitService';

const PartnersModule: React.FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [balancesTick, setBalancesTick] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>('list');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isAllPartnersPdfOpen, setIsAllPartnersPdfOpen] = useState(false);
  
  // Seleções
  const [editingPartner, setEditingPartner] = useState<Partner | undefined>(undefined);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

  useEffect(() => {
    const initModule = async () => {
      setLoading(true);
      await waitForInit();
      partnerService.startRealtime();
      partnerAddressService.startRealtime();
      refreshPartners();
      setLoading(false);
    };

    initModule();
    // Assinar mudanças reativas do cache de parceiros
    const unsubscribeDb = partnerService.subscribe(items => setPartners(items));

    // Assinar realtime/local de endereços para refletir no cache de parceiros (para todos os usuários)
    const unsubscribeAddresses = partnerAddressService.subscribe((addresses) => {
      const primaryMap = new Map<string, typeof addresses[number]>();
      addresses
        .filter(a => a.active && a.is_primary)
        .forEach((a) => {
          if (!primaryMap.has(a.partner_id)) primaryMap.set(a.partner_id, a);
        });

      // Resolver cidade/UF por ID sem limpar dados existentes
      (async () => {
        for (const [partnerId, addr] of primaryMap.entries()) {
          const existing = partnerService.getById(partnerId);
          const resolvedCity = addr.city_id ? await locationService.getCityNameById(addr.city_id as any) : null;
          const resolvedState = addr.state_id ? await locationService.getStateUfById(addr.state_id as any) : null;

          partnerService.setAddressLocal(partnerId, {
            zip: addr.zip_code || existing?.address?.zip || '',
            street: addr.street || existing?.address?.street || '',
            number: addr.number || existing?.address?.number || '',
            neighborhood: addr.neighborhood || existing?.address?.neighborhood || '',
            city: (resolvedCity ?? existing?.address?.city ?? ''),
            state: (resolvedState ?? existing?.address?.state ?? '')
          });
        }

        // Atualiza lista exibida após resolução
        setPartners(partnerService.getAll());
      })().catch(err => {
        console.warn('⚠️ Falha ao resolver cidade/UF por ID:', err);
        setPartners(partnerService.getAll());
      });
    });

    const handleGlobalNav = (e: any) => {
      if (e.detail?.moduleId === 'partners' && e.detail?.partnerId) {
        const p = partnerService.getById(e.detail.partnerId);
        if (p) {
          if (p.categories.includes(PARTNER_CATEGORY_IDS.CARRIER) || p.categories.includes(PARTNER_CATEGORY_IDS.BROKER)) {
            setSelectedPartner(p);
            setViewMode('details');
          } else {
            setEditingPartner(p);
            setViewMode('form');
          }
        }
      }
    };
    window.addEventListener('app:navigate', handleGlobalNav);
    
    return () => {
      window.removeEventListener('app:navigate', handleGlobalNav);
      unsubscribeDb();
      unsubscribeAddresses();
    };
  }, []);

  useEffect(() => {
    const handleFinancialUpdate = () => {
      setBalancesTick((prev) => prev + 1);
    };

    window.addEventListener('financial:updated', handleFinancialUpdate);
    window.addEventListener('data:updated', handleFinancialUpdate);

    return () => {
      window.removeEventListener('financial:updated', handleFinancialUpdate);
      window.removeEventListener('data:updated', handleFinancialUpdate);
    };
  }, []);

  const refreshPartners = () => {
    setPartners(partnerService.getAll());
  };

  // --- CÁLCULO DE SALDOS CONSOLIDADOS ---
  const partnerBalances = useMemo(() => {
    const payables = financialIntegrationService.getPayables();
    const receivables = financialIntegrationService.getReceivables();
    const advances = advanceService.getSummaries();
    
    const balanceMap: Record<string, { credit: number, debit: number, net: number }> = {};

    partners.forEach(p => {
        let credit = 0;
        let debit = 0;

        // 1. Débitos (Pagar)
        const pPay = payables.filter(r => r.entityName === p.name);
        debit += pPay.reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);
        
        // 2. Créditos (Receber)
        const pRec = receivables.filter(r => r.entityName === p.name);
        credit += pRec.reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);
        
        // 3. Adiantamentos
        const pAdv = advances.find(s => s.partnerId === p.id || s.partnerName === p.name);
        if (pAdv) {
            if (pAdv.netBalance > 0) credit += pAdv.netBalance;
            else debit += Math.abs(pAdv.netBalance);
        }

        balanceMap[p.id] = { 
            credit, 
            debit, 
            net: credit - debit 
        };
    });

    return balanceMap;
  }, [partners, balancesTick]);

  const handleAddNew = () => {
    setEditingPartner(undefined);
    setViewMode('form');
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setViewMode('form');
  };

  const handleToggleStatus = async (partner: Partner) => {
    try {
      const newStatus = partner.active === false;
      await partnerService.update({ ...partner, active: newStatus });
      refreshPartners();
      addToast(newStatus ? 'success' : 'info', `Parceiro ${newStatus ? 'Ativado' : 'Inativado'}`);
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
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

  const handleSave = async (data: Omit<Partner, 'id' | 'createdAt'>) => {
    try {
      if (editingPartner) {
        // EDITAR PARCEIRO EXISTENTE
        await partnerService.update({ ...data, id: editingPartner.id, createdAt: editingPartner.createdAt });
        
        // Se endereço foi alterado, atualizar/CRIAR na tabela separada
        if (data.address && data.address.street) {
          try {
            const existingAddress = partnerAddressService.getPrimaryByPartner(editingPartner.id);
            if (existingAddress) {
              await partnerAddressService.update({
                ...existingAddress,
                street: data.address.street,
                number: data.address.number,
                neighborhood: data.address.neighborhood,
                zip_code: data.address.zip,
                address_type: 'main',
                cityName: data.address.city,
                stateName: data.address.state
              });
            } else {
              await partnerAddressService.add({
                partner_id: editingPartner.id,
                street: data.address.street,
                number: data.address.number,
                neighborhood: data.address.neighborhood,
                zip_code: data.address.zip,
                address_type: 'main',
                is_primary: true,
                active: true,
                cityName: data.address.city,
                stateName: data.address.state
              });
            }
            partnerService.setAddressLocal(editingPartner.id, data.address);
          } catch (err) {
            console.warn('⚠️ Endereço não pôde ser salvo/atualizado:', err);
          }
        }
        addToast('success', 'Dados Atualizados');
      } else {
        // CRIAR NOVO PARCEIRO
        // Gera UUID v4 válido
        const uuid = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c === 'x' ? Math.random() * 16 | 0 : 'r8ab'[Math.random() * 4 | 0]).toString(16));
        
        const newPartner = await partnerService.add({
          ...data,
          id: uuid,
          createdAt: new Date().toISOString(),
          active: true
        });

        // Salvar endereço em tabela separada (se fornecido)
        if (data.address && data.address.street) {
          try {
            await partnerAddressService.add({
              partner_id: newPartner.id, // Usa o ID retornado do Supabase
              street: data.address.street,
              number: data.address.number,
              neighborhood: data.address.neighborhood,
              zip_code: data.address.zip,
              address_type: 'main',
              is_primary: true,
              active: true,
              cityName: data.address.city,
              stateName: data.address.state
            });
            partnerService.setAddressLocal(newPartner.id, data.address);
            addToast('success', 'Parceiro e Endereço Cadastrados');
          } catch (err) {
            console.error('❌ Erro ao salvar endereço:', err);
            // Parceiro foi salvo, endereço falhou - ainda assim sucesso parcial
            addToast('warning', 'Parceiro Cadastrado', 'Mas o endereço não foi salvo');
          }
        } else {
          addToast('success', 'Parceiro Cadastrado');
        }
      }
      refreshPartners();
      setViewMode('list');
    } catch (error) {
      console.error('❌ Erro ao salvar parceiro:', error);
      addToast('error', 'Erro', 'Falha ao salvar parceiro');
    }
  };

  const filteredPartners = useMemo(() => {
    return partners
      .filter(p => {
        if (activeTab !== 'all' && !p.categories.includes(activeTab)) return false;
        const search = searchTerm.toLowerCase();
        return p.name.toLowerCase().includes(search) || p.document.includes(search) || p.nickname?.toLowerCase().includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [partners, activeTab, searchTerm]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Carregando parceiros...</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'form') {
    return <PartnerForm initialData={editingPartner} categories={DEFAULT_PARTNER_CATEGORIES} onSave={handleSave} onCancel={() => setViewMode('list')} />;
  }

  if (viewMode === 'details' && selectedPartner) {
    if (selectedPartner.categories.includes(PARTNER_CATEGORY_IDS.CARRIER)) {
      return <CarrierDetails carrier={selectedPartner} onBack={() => setViewMode('list')} />;
    }
    if (selectedPartner.categories.includes(PARTNER_CATEGORY_IDS.BROKER)) {
      return <BrokerDetails broker={selectedPartner} onBack={() => setViewMode('list')} />;
    }
    setViewMode('list');
    return null;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Topo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, apelido ou documento..."
            className="w-full rounded-2xl border-2 border-slate-100 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 focus:border-primary-500 focus:outline-none transition-all"
          />
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setIsAllPartnersPdfOpen(true)}
                className="flex items-center gap-2 rounded-2xl bg-white border-2 border-slate-200 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
                <Printer size={18} /> Relatório Geral
            </button>
            <button 
                onClick={handleAddNew}
                className="flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 shadow-xl transition-all active:scale-95"
            >
                <Plus size={18} /> Novo Parceiro
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('all')} className={`whitespace-nowrap border-b-4 py-4 px-1 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === 'all' ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Todos</button>
          {DEFAULT_PARTNER_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`whitespace-nowrap border-b-4 py-4 px-1 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === cat.id ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {cat.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Grid */}
      {filteredPartners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-300 italic border-2 border-dashed rounded-3xl">
          <Users size={64} className="mb-4 opacity-20" />
          <p className="font-bold uppercase tracking-widest">Nenhum parceiro encontrado</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPartners.map(partner => (
            <PartnerCard 
              key={partner.id} 
              partner={partner}
              allCategories={DEFAULT_PARTNER_CATEGORIES}
              balance={partnerBalances[partner.id]?.net || 0}
              onEdit={handleEdit}
              onDelete={setPartnerToDelete}
              onToggleStatus={handleToggleStatus}
              onViewDetails={handleViewDetails}
              onExportPdf={handleExportPdf}
            />
          ))}
        </div>
      )}

      {/* MODAIS */}
      {partnerToDelete && (
        <PartnerDeleteModal 
            isOpen={!!partnerToDelete} 
            partner={partnerToDelete}
            onClose={() => setPartnerToDelete(null)} 
            onConfirm={async () => {
              try {
                await partnerService.delete(partnerToDelete.id);
                refreshPartners();
                setPartnerToDelete(null);
                addToast('success', 'Parceiro removido com sucesso');
              } catch (error) {
                console.error('❌ Erro ao deletar parceiro:', error);
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
            partners={filteredPartners}
            balances={partnerBalances}
          />
      )}

    </div>
  );
};

export default PartnersModule;
