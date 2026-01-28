
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Layers, AlertTriangle, Calendar, User, X } from 'lucide-react';
import { PurchaseOrder } from './types';
import PurchaseKPIs from './components/PurchaseKPIs';
import OrderForm from './components/OrderForm';
import OrderDetails from './components/OrderDetails';
import ActiveOrders from './tabs/ActiveOrders';
import FinalizedOrders from './tabs/FinalizedOrders';
import AllOrders from './tabs/AllOrders';
import OrderDeleteModal from './components/OrderDeleteModal';
import ActionConfirmationModal from '../../components/ui/ActionConfirmationModal';
import { purchaseService } from '../../services/purchaseService';
import { shareholderService } from '../../services/shareholderService';
import { useToast } from '../../contexts/ToastContext';

export type GroupByOption = 'month' | 'harvest' | 'partner' | 'none';

const PurchaseOrderModule: React.FC = () => {
  const { addToast } = useToast();

  const generateUuid = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  };
  
  // Data State
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [shareholders, setShareholders] = useState<{id: string, name: string}[]>([]);

  // UI/Filter State
  const [activeTab, setActiveTab] = useState<'active' | 'finalized' | 'all'>('active');
  const [groupBy, setGroupBy] = useState<GroupByOption>('month');
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>('list');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | undefined>(undefined);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedShareholder, setSelectedShareholder] = useState('');

  // Modals
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'danger' | 'success' | 'warning';
    title: string;
    description: React.ReactNode;
    onConfirm: () => void;
  }>({
    isOpen: false, type: 'danger', title: '', description: null, onConfirm: () => {}
  });

  useEffect(() => {
    // Carrega apenas no mount; atualizações são incrementais
    setOrders(purchaseService.getAll());
    setShareholders(shareholderService.getAll().map(s => ({ id: s.id, name: s.name })));

    // ✅ REALTIME: Subscribe para mudanças em purchase_orders
    console.log('[PurchaseOrderModule] Subscribing to realtime updates...');
    const subscription = purchaseService.subscribeToUpdates((updatedOrder, eventType) => {
      console.log('[PurchaseOrderModule] Realtime event:', eventType, updatedOrder);
      
      if (eventType === 'DELETE') {
        // Remover da lista
        setOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
        // Se está visualizando este pedido, voltar para lista
        if (selectedOrder?.id === updatedOrder.id) {
          setViewMode('list');
          setSelectedOrder(undefined);
        }
      } else {
        // INSERT ou UPDATE
        setOrders(prev => {
          const index = prev.findIndex(o => o.id === updatedOrder.id);
          if (index >= 0) {
            // Atualizar existente
            const newOrders = [...prev];
            newOrders[index] = updatedOrder;
            return newOrders;
          } else {
            // Novo pedido adicionado por outro usuário
            return [...prev, updatedOrder];
          }
        });
        // Se está visualizando este pedido, atualizar também
        if (selectedOrder?.id === updatedOrder.id) {
          setSelectedOrder(updatedOrder);
        }
      }
    });

    const handleNavigation = (e: any) => {
        if (e.detail?.moduleId === 'purchase_order' && e.detail?.orderId) {
            const order = purchaseService.getById(e.detail.orderId);
            if (order) {
                setSelectedOrder(order);
                setViewMode('details');
            }
        }
    };
    window.addEventListener('app:navigate', handleNavigation);
    return () => {
      console.log('[PurchaseOrderModule] Cleaning up subscriptions...');
      window.removeEventListener('app:navigate', handleNavigation);
      subscription?.(); // Limpar subscription
    };
  }, [selectedOrder?.id, viewMode]); 

  const handleAddNew = () => {
    setSelectedOrder(undefined);
    setViewMode('form');
  };

  const handleOrderClick = (order: PurchaseOrder) => {
    const freshOrder = purchaseService.getById(order.id);
    setSelectedOrder(freshOrder || order);
    setViewMode('details');
  };

  const handleSave = (order: PurchaseOrder) => {
    if (selectedOrder && selectedOrder.id === order.id) {
      purchaseService.update(order);
      setOrders(prev => prev.map(o => o.id === order.id ? order : o));
      setSelectedOrder(order);
      setViewMode('details');
      addToast('success', 'Pedido Atualizado');
    } else {
      const newId = generateUuid();
      const newOrder = { ...order, id: newId };
      purchaseService.add(newOrder);
      setOrders(prev => [...prev, newOrder]);
      setViewMode('list');
      setSelectedOrder(undefined);
      addToast('success', 'Pedido Criado');
    }
  };

  const handleDeleteRequest = (order: PurchaseOrder) => {
    setOrderToDelete(order);
  };

  const executeDelete = () => {
    if (orderToDelete) {
      purchaseService.delete(orderToDelete.id);
      addToast('success', 'Exclusão Completa Realizada');
      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      setOrderToDelete(null);
      if (viewMode === 'details') setViewMode('list');
    }
  };

  const handleFinalizeRequest = (order: PurchaseOrder) => {
    setActionModal({
      isOpen: true,
      type: 'success',
      title: 'Finalizar Pedido de Compra',
      description: 'Deseja encerrar este contrato? Certifique-se que o saldo foi liquidado.',
      onConfirm: () => {
        const freshOrder = purchaseService.getById(order.id);
        if (freshOrder) {
            const updated = { ...freshOrder, status: 'completed' as const };
            purchaseService.update(updated);
            setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
            if (viewMode === 'details') setSelectedOrder(updated);
            addToast('success', 'Pedido Finalizado');
        } else {
            addToast('error', 'Erro ao finalizar', 'Pedido não encontrado.');
        }
      }
    });
  };

  // --- LÓGICA DE FILTRAGEM UNIFICADA (FILTROS + ABAS) ---
  const finalList = useMemo(() => {
    return orders.filter(o => {
      // 1. Filtro de Texto (Nome, Número)
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
         o.partnerName.toLowerCase().includes(search) ||
         o.number.toLowerCase().includes(search);

      // 2. Filtro de Data
      let matchesDate = true;
      if (startDate && o.date < startDate) matchesDate = false;
      if (endDate && o.date > endDate) matchesDate = false;

      // 3. Filtro de Sócio
      let matchesShareholder = true;
      if (selectedShareholder && o.consultantName !== selectedShareholder) matchesShareholder = false;

      // 4. Filtro de Aba (Status)
      let matchesTab = true;
      if (activeTab === 'active') {
         matchesTab = ['pending', 'approved', 'transport'].includes(o.status);
      } else if (activeTab === 'finalized') {
         matchesTab = ['completed', 'canceled'].includes(o.status);
      }

      return matchesSearch && matchesDate && matchesShareholder && matchesTab;
    });
  }, [orders, searchTerm, startDate, endDate, selectedShareholder, activeTab]);

  const handleClearFilters = () => {
      setSearchTerm('');
      setStartDate('');
      setEndDate('');
      setSelectedShareholder('');
  };

  const hasFilters = searchTerm || startDate || endDate || selectedShareholder;

  const renderContent = () => {
    if (viewMode === 'form') return <OrderForm initialData={selectedOrder} onSave={handleSave} onCancel={() => setViewMode(selectedOrder ? 'details' : 'list')} />;
    if (viewMode === 'details' && selectedOrder) return <OrderDetails order={selectedOrder} onBack={() => setViewMode('list')} onEdit={() => setViewMode('form')} onDelete={() => handleDeleteRequest(selectedOrder)} onFinalize={() => handleFinalizeRequest(selectedOrder)} />;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* KPI Section - Recebe a lista JÁ FILTRADA */}
        <PurchaseKPIs orders={finalList} />
        
        {/* Filter Bar (Estilo Sales Order) */}
        <div className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Buscar pedido por fornecedor ou número..." 
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
                        <Plus size={16} /> Novo Pedido
                    </button>
                </div>
            </div>

            {/* Advanced Filters Row */}
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
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sócio Comprador</label>
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
                            onChange={(e) => setGroupBy(e.target.value as GroupByOption)} 
                            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-blue-500 focus:outline-none appearance-none"
                        >
                            <option value="month">Por Mês</option>
                            <option value="harvest">Por Safra</option>
                            <option value="partner">Por Fornecedor</option>
                            <option value="none">Sem Agrupamento</option>
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

        {/* Content List */}
        <div className="min-h-[400px]">
          {activeTab === 'active' && <ActiveOrders orders={finalList} onOrderClick={handleOrderClick} onFinalize={handleFinalizeRequest} onDelete={handleDeleteRequest} groupBy={groupBy} />}
          {activeTab === 'finalized' && <FinalizedOrders orders={finalList} onOrderClick={handleOrderClick} onDelete={handleDeleteRequest} groupBy={groupBy} />}
          {activeTab === 'all' && <AllOrders orders={finalList} onOrderClick={handleOrderClick} onDelete={handleDeleteRequest} groupBy={groupBy} />}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      <ActionConfirmationModal 
        isOpen={actionModal.isOpen} onClose={() => setActionModal(prev => ({ ...prev, isOpen: false }))} 
        onConfirm={actionModal.onConfirm} title={actionModal.title} description={actionModal.description} type={actionModal.type} 
      />
      <OrderDeleteModal 
        isOpen={!!orderToDelete} 
        onClose={() => setOrderToDelete(null)} 
        onConfirm={executeDelete} 
        order={orderToDelete} 
      />
    </>
  );
};

export default PurchaseOrderModule;
