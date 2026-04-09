
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Layers, Calendar, User, AlertTriangle, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { SalesOrder } from './types';
import SalesOrderCard from './components/SalesOrderCard';
import SalesOrderForm from './components/SalesOrderForm';
import SalesOrderDetails from './components/SalesOrderDetails';
import SalesKPIs from './components/SalesKPIs';
import ActionConfirmationModal from '../../components/ui/ActionConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { parseStringToLocalDate } from '../../utils/dateUtils';
import { useSalesOrderModule } from './hooks/useSalesOrderModule';
import { QUERY_KEYS } from '../../hooks/queryKeys';

export type SalesGroupByOption = 'month' | 'partner' | 'none';

const SalesOrderModule: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Data State — via hook co-localizado (SKIL: zero service imports no TSX)
  const { 
    sales, 
    shareholders, 
    isLoading, 
    isFetching, 
    getOrderById, 
    getLinkedLoadings, 
    saveOrder, 
    deleteOrder, 
    finalizeOrder,
    reopenOrder,
    cancelOrder
  } = useSalesOrderModule();

  // UI/Filter State
  const [activeTab, setActiveTab] = useState<'active' | 'finalized' | 'all'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('sg_erp_sales_active_tab') as any) || 'active';
    }
    return 'active';
  });
  const [groupBy, setGroupBy] = useState<SalesGroupByOption>('none'); // Default none p/ respeitar ordem alfabética global
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>('list');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | undefined>(undefined);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedShareholder, setSelectedShareholder] = useState('');

  // Modals
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'danger' | 'success' | 'warning';
    title: string;
    description: React.ReactNode;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'danger',
    title: '',
    description: null,
    onConfirm: () => { }
  });

  // Persist active tab change
  useEffect(() => {
    localStorage.setItem('sg_erp_sales_active_tab', activeTab);
  }, [activeTab]);

  // Debounce for search to improve performance/responsiveness
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleNavigation = (e: any) => {
      if (e.detail?.moduleId === 'sales_order' && e.detail?.orderId) {
        const order = getOrderById(e.detail.orderId);
        if (order) {
          setSelectedOrder(order);
          setViewMode('details');
        }
      }
    };
    window.addEventListener('app:navigate', handleNavigation);

    // Navegação pendente (definida antes do módulo montar)
    const pending = (window as any).__pendingOrderNav;
    if (pending && pending.moduleId === 'sales_order' && pending.orderId) {
      delete (window as any).__pendingOrderNav;
      const order = getOrderById(pending.orderId);
      if (order) {
        setSelectedOrder(order);
        setViewMode('details');
      }
    }

    return () => {
      window.removeEventListener('app:navigate', handleNavigation);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddNew = () => {
    setSelectedOrder(undefined);
    setViewMode('form');
  };

  const handleOrderClick = (order: SalesOrder) => {
    // Usa dado fresco do cache TanStack Query (sempre sincronizado via realtime)
    const freshOrder = sales.find(o => o.id === order.id) ?? order;
    setSelectedOrder(freshOrder);
    setViewMode('details');
  };

  const handleSave = async (order: SalesOrder) => {
    const isUpdate = !!(selectedOrder && selectedOrder.id === order.id);

    if (isUpdate) {
      const result = await saveOrder(order, true);
      if (!result?.success) {
        addToast('error', 'Erro ao atualizar venda', result?.error || 'Falha ao salvar no banco de dados.');
        return;
      }
      setSelectedOrder(order);
      setViewMode('details');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
      addToast('success', 'Venda Atualizada');
    } else {
      const generateUuid = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };
      const newOrder = {
        ...order,
        id: generateUuid(),
        transactions: [],
        paidValue: 0
      };
      const result = await saveOrder(newOrder, false);
      if (!result?.success) {
        addToast('error', 'Erro ao criar venda', result?.error || 'Falha ao salvar no banco de dados.');
        return;
      }
      setViewMode('list');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
      addToast('success', 'Venda Criada');
    }
  };

  const handleDeleteRequest = (order: SalesOrder) => {
    const linkedLoadings = getLinkedLoadings(order.id);

    // ⛔ BLOQUEAR exclusão se houver carregamentos vinculados
    if (linkedLoadings.length > 0) {
      setActionModal({
        isOpen: true,
        type: 'warning',
        title: 'Exclusão Bloqueada',
        description: (
          <div className="text-left space-y-3">
            <p className="text-slate-700">Carregamentos Vinculados</p>
            <p className="text-sm text-slate-600">
              Este pedido possui <strong>{linkedLoadings.length} carregamento(s)</strong> associado(s).
            </p>
            <p className="text-sm text-slate-600">
              Para excluir esta venda, abra a aba <strong>Carregamentos</strong> dentro deste pedido e exclua os carregamentos lá.
            </p>
          </div>
        ),
        onConfirm: () => {
          setActionModal(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    // ✅ Permitir exclusão se não houver carregamentos
    const warningMessage = (
      <div className="text-left space-y-3">
        <p className="text-slate-700">Ao confirmar, o seguinte será permanentemente excluído:</p>
        {order.paidValue > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Recebimentos</p>
            <p className="text-sm text-slate-600">
              Os recebimentos associados (R$ {order.paidValue.toFixed(2)}) serão removidos do sistema.
            </p>
          </div>
        )}
      </div>
    );

    setActionModal({
      isOpen: true,
      type: 'danger',
      title: `Excluir Venda ${order.number}?`,
      description: warningMessage,
      onConfirm: async () => {
        const result = await deleteOrder(order.id);

        if (result?.success) {
          addToast('success', 'Venda Excluída', 'Pedido e recebimentos removidos com sucesso.');
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
          // TanStack Query + realtime já atualiza o state
          if (viewMode === 'details') setViewMode('list');
        } else {
          addToast('error', 'Erro ao Excluir', result?.error || 'Falha ao excluir pedido no banco de dados.');
        }

        setActionModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleFinalizeRequest = (order: SalesOrder) => {
    setActionModal({
      isOpen: true,
      type: 'success',
      title: 'Finalizar Venda',
      description: 'Deseja marcar este pedido como Concluído? O status será alterado permanentemente.',
      onConfirm: async () => {
        await finalizeOrder(order.id);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
        if (viewMode === 'details') {
          const fresh = getOrderById(order.id);
          if (fresh) setSelectedOrder(fresh);
        }
        addToast('success', 'Venda Finalizada');
        setActionModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleReopenRequest = (order: SalesOrder) => {
    setActionModal({
      isOpen: true,
      type: 'warning',
      title: 'Reabrir Venda',
      description: 'Deseja reabrir este pedido? Ele voltará para o status "Aprovado".',
      onConfirm: async () => {
        await reopenOrder(order.id);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
        if (viewMode === 'details') {
          const fresh = getOrderById(order.id);
          if (fresh) setSelectedOrder(fresh);
        }
        addToast('success', 'Venda Reaberta');
        setActionModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleCancelRequest = (order: SalesOrder) => {
    setActionModal({
      isOpen: true,
      type: 'danger',
      title: `Cancelar Venda ${order.number}?`,
      description: (
        <div className="text-left space-y-3">
          <p className="text-slate-700">Esta ação é irreversível e terá os seguintes efeitos:</p>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
            <li>Status do pedido mudará para <strong>CANCELADO</strong>.</li>
            <li>Todos os recebimentos vinculados serão <strong>INVALIDADOS</strong> no financeiro.</li>
            <li>O saldo dos clientes e contas bancárias será ajustado automaticamente.</li>
          </ul>
        </div>
      ),
      onConfirm: async () => {
        const result = await cancelOrder(order.id, 'Cancelado manualmente via Painel');
        if (result?.success) {
          addToast('success', 'Venda Cancelada', 'Pedido e financeiro sincronizados com sucesso.');
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
          if (viewMode === 'details') setViewMode('list');
        } else {
          addToast('error', 'Erro ao Cancelar', result?.error || 'Falha ao cancelar pedido.');
        }
        setActionModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- LÓGICA DE FILTRAGEM E ORDENAÇÃO ALFABÉTICA ---
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // 1. Busca Debounced
      const search = debouncedSearch.toLowerCase();
      const customerName = (s.customerName || '').toLowerCase();
      const orderNumber = (s.number || '').toLowerCase();
      const matchesSearch =
        customerName.includes(search) ||
        orderNumber.includes(search);

      // 2. Data
      let matchesDate = true;
      const orderDate = s.date || '';
      if (startDate && orderDate < startDate) matchesDate = false;
      if (endDate && orderDate > endDate) matchesDate = false;

      // 3. Sócio (Vendedor)
      let matchesShareholder = true;
      if (selectedShareholder && s.consultantName !== selectedShareholder) matchesShareholder = false;

      // 4. Abas
      let matchesTab = true;
      if (activeTab === 'active') {
        matchesTab = s.status !== 'completed' && s.status !== 'canceled';
      } else if (activeTab === 'finalized') {
        matchesTab = s.status === 'completed' || s.status === 'canceled';
      }

      return matchesSearch && matchesDate && matchesShareholder && matchesTab;
    }).sort((a, b) => (a.customerName || '').localeCompare(b.customerName || '')); // ORDENAÇÃO ALFABÉTICA SOLICITADA
  }, [sales, activeTab, debouncedSearch, startDate, endDate, selectedShareholder]);

  const groupedSales = useMemo(() => {
    if (groupBy === 'none') return [{ title: '', orders: filteredSales }];

    const groups: Record<string, SalesOrder[]> = {};
    filteredSales.forEach(order => {
      let key = 'Outros';
      if (groupBy === 'month') {
        const date = parseStringToLocalDate(order.date);
        key = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        // Sorting hack: YYYY-MM|Title
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}|${key}`;
      } else if (groupBy === 'partner') {
        key = order.customerName;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    });

    return Object.entries(groups).sort((a, b) => {
      if (groupBy === 'month') return b[0].localeCompare(a[0]);
      return a[0].localeCompare(b[0]);
    }).map(([key, orders]) => ({
      title: groupBy === 'month' ? key.split('|')[1] : key,
      orders
    }));
  }, [filteredSales, groupBy]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedShareholder('');
  };

  const hasFilters = searchTerm || startDate || endDate || selectedShareholder;

  const renderContent = () => {
    if (viewMode === 'form') return <SalesOrderForm initialData={selectedOrder} onSave={handleSave} onCancel={() => setViewMode(selectedOrder ? 'details' : 'list')} />;

    if (viewMode === 'details' && selectedOrder) return (
      <SalesOrderDetails
        order={selectedOrder}
        onBack={() => setViewMode('list')}
        onEdit={() => setViewMode('form')}
        onDelete={() => handleDeleteRequest(selectedOrder)}
        onFinalize={() => handleFinalizeRequest(selectedOrder)}
        onReopen={() => handleReopenRequest(selectedOrder)}
        onCancel={() => handleCancelRequest(selectedOrder)}
      />
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-500">

        {/* KPI Section */}
        <SalesKPIs orders={filteredSales} />

        {/* Filter Bar */}
        <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente ou número de pedido..."
                className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium focus:bg-white focus:border-slate-300 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-3">
              {hasFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-rose-100 uppercase"
                >
                  <X size={14} /> Limpar
                </button>
              )}
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 shadow-lg transition-all active:scale-95"
              >
                <Plus size={16} /> Nova Venda
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Inicial</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data Final</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm font-bold text-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sócio Vendedor</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={selectedShareholder}
                  onChange={(e) => setSelectedShareholder(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-blue-500 focus:outline-none appearance-none"
                >
                  <option value="">Todos</option>
                  {shareholders.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Agrupar Lista</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as SalesGroupByOption)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-blue-500 focus:outline-none appearance-none"
                >
                  <option value="none">Por Nome (A-Z)</option>
                  <option value="month">Por Mês</option>
                  <option value="partner">Por Cliente</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('active')} className={`pb-4 px-1 text-sm font-bold uppercase tracking-wide border-b-4 transition-all ${activeTab === 'active' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Pedidos Ativos</button>
            <button onClick={() => setActiveTab('finalized')} className={`pb-4 px-1 text-sm font-bold uppercase tracking-wide border-b-4 transition-all ${activeTab === 'finalized' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Finalizados</button>
            <button onClick={() => setActiveTab('all')} className={`pb-4 px-1 text-sm font-bold uppercase tracking-wide border-b-4 transition-all ${activeTab === 'all' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Todos</button>
          </nav>
        </div>

        {/* Listagem com Agrupamento Dinâmico */}
        <div className="space-y-8 min-h-[400px]">
          {groupedSales.map((group) => (
            <div key={group.title} className="space-y-4">
              {group.title && (
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <h3 className="text-lg font-bold text-slate-700 capitalize">{group.title}</h3>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.orders.length}</span>
                </div>
              )}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.orders.map(order => (
                  <SalesOrderCard key={order.id} order={order} onClick={handleOrderClick} onDelete={handleDeleteRequest} onFinalize={handleFinalizeRequest} />
                ))}
              </div>
            </div>
          ))}
          {filteredSales.length === 0 && !isLoading && (
            <div className="text-center py-20 text-slate-400 italic bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center gap-3">
              <AlertTriangle className="text-slate-300" size={40} />
              <p>Nenhum pedido encontrado nesta visão.</p>
              {hasFilters && (
                <button onClick={handleClearFilters} className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2 hover:underline">Limpar Filtros</button>
              )}
            </div>
          )}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Carregando Pedidos...</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      <ActionConfirmationModal isOpen={actionModal.isOpen} onClose={() => setActionModal(prev => ({ ...prev, isOpen: false }))} onConfirm={actionModal.onConfirm} title={actionModal.title} description={actionModal.description} type={actionModal.type} />
    </>
  );
};

export default SalesOrderModule;
