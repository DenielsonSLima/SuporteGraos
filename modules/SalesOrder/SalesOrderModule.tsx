
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Layers, Calendar, User, AlertTriangle, X } from 'lucide-react';
import { SalesOrder } from './types';
import SalesOrderCard from './components/SalesOrderCard';
import SalesOrderForm from './components/SalesOrderForm';
import SalesOrderDetails from './components/SalesOrderDetails';
import SalesKPIs from './components/SalesKPIs';
import ActionConfirmationModal from '../../components/ui/ActionConfirmationModal';
import { salesService } from '../../services/salesService';
import { loadingService } from '../../services/loadingService';
import { shareholderService } from '../../services/shareholderService';
import { useToast } from '../../contexts/ToastContext';
import { waitForInit } from '../../services/supabaseInitService';

export type SalesGroupByOption = 'month' | 'partner' | 'none';

const SalesOrderModule: React.FC = () => {
  const { addToast } = useToast();
  
  // Data State
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [shareholders, setShareholders] = useState<{id: string, name: string}[]>([]);

  // UI/Filter State
  const [activeTab, setActiveTab] = useState<'active' | 'finalized' | 'all'>('active');
  const [groupBy, setGroupBy] = useState<SalesGroupByOption>('none'); // Default none p/ respeitar ordem alfabética global
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>('list');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | undefined>(undefined);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
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
    onConfirm: () => {}
  });

  useEffect(() => {
    const initModule = async () => {
      await waitForInit();
      salesService.startRealtime();
      await salesService.loadFromSupabase();
      loadSales();
    };

    void initModule();
    const unsubscribe = salesService.subscribe((items) => setSales(items));
    setShareholders(shareholderService.getAll().map(s => ({ id: s.id, name: s.name })));

    const handleNavigation = (e: any) => {
        if (e.detail?.moduleId === 'sales_order' && e.detail?.orderId) {
            const order = salesService.getById(e.detail.orderId);
            if (order) {
                setSelectedOrder(order);
                setViewMode('details');
            }
        }
    };
    window.addEventListener('app:navigate', handleNavigation);
    return () => { 
      window.removeEventListener('app:navigate', handleNavigation);
      unsubscribe();
    };
  }, []);

  const loadSales = () => {
    setSales(salesService.getAll());
  };

  const handleAddNew = () => {
    setSelectedOrder(undefined);
    setViewMode('form');
  };

  const handleOrderClick = (order: SalesOrder) => {
    const freshOrder = salesService.getById(order.id);
    setSelectedOrder(freshOrder || order);
    setViewMode('details');
  };

  const handleSave = (order: SalesOrder) => {
    if (selectedOrder && selectedOrder.id === order.id) {
      salesService.update(order);
      setSelectedOrder(order);
      setViewMode('details');
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
      salesService.add(newOrder);
      // O subscriber já atualiza o state via salesService.subscribe()
      setViewMode('list');
      addToast('success', 'Venda Criada');
    }
  };

  const handleDeleteRequest = (order: SalesOrder) => {
    const linkedLoadings = loadingService.getBySalesOrder(order.id);
    
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
        const result = await salesService.delete(order.id);
        
        if (result?.success) {
          addToast('success', 'Venda Excluída', 'Pedido e recebimentos removidos com sucesso.');
          // O subscriber já atualiza o state via salesService.subscribe()
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
      onConfirm: () => {
        const freshOrder = salesService.getById(order.id);
        if (freshOrder) {
            const updated = { ...freshOrder, status: 'completed' as const };
            salesService.update(updated);
            // O subscriber já atualiza o state via salesService.subscribe()
            if (viewMode === 'details') setSelectedOrder(updated);
            addToast('success', 'Venda Finalizada');
        } else {
            addToast('error', 'Erro', 'Pedido de venda não encontrado.');
        }
      }
    });
  };

  // --- LÓGICA DE FILTRAGEM E ORDENAÇÃO ALFABÉTICA ---
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
        // 1. Busca
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
            s.customerName.toLowerCase().includes(search) ||
            s.number.toLowerCase().includes(search);
        
        // 2. Data
        let matchesDate = true;
        if (startDate && s.date < startDate) matchesDate = false;
        if (endDate && s.date > endDate) matchesDate = false;

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
    }).sort((a, b) => a.customerName.localeCompare(b.customerName)); // ORDENAÇÃO ALFABÉTICA SOLICITADA
  }, [sales, activeTab, searchTerm, startDate, endDate, selectedShareholder]);

  const groupedSales = useMemo(() => {
    if (groupBy === 'none') return [{ title: '', orders: filteredSales }];

    const groups: Record<string, SalesOrder[]> = {};
    filteredSales.forEach(order => {
      let key = 'Outros';
      if (groupBy === 'month') {
        const date = new Date(order.date);
        key = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        // Sorting hack: YYYY-MM|Title
        key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}|${key}`;
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
          {filteredSales.length === 0 && (
            <div className="text-center py-20 text-slate-400 italic">Nenhum pedido encontrado nesta visão.</div>
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
