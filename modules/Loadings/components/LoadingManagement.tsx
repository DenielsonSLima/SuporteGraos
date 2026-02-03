
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Truck, Scale, DollarSign, AlertTriangle, AlertCircle,
  CheckCircle2, Building2, Pencil, Save, History, 
  ArrowRight, Wallet, ShoppingBag, TrendingUp, Calculator, 
  ArrowRightLeft, Check, LayoutGrid, Info, MapPin
} from 'lucide-react';
import { Loading } from '../types';
import { SalesOrder } from '../../SalesOrder/types';
import { salesService } from '../../../services/salesService';
import { partnerService } from '../../../services/partnerService';
import { fleetService } from '../../../services/fleetService';
import { driverService } from '../../../services/driverService';
import { loadingService } from '../../../services/loadingService';
import { invalidateLoadingCache } from '../../../services/loadingCache';
import { PARTNER_CATEGORY_IDS } from '../../../constants';
import { Partner, Driver, Vehicle } from '../../Partners/types';
import TransactionModal from '../../PurchaseOrder/components/modals/TransactionModal';
import LoadingFinancialTab from './LoadingFinancialTab';
import { useToast } from '../../../contexts/ToastContext';

interface Props {
  loading: Loading;
  onClose: () => void;
  onUpdate: (updatedLoading: Loading | null) => void;
  originContext?: 'purchase' | 'sales' | 'logistics'; 
}

const LoadingManagement: React.FC<Props> = ({ loading, onClose, onUpdate, originContext = 'logistics' }) => {
  const { addToast } = useToast();
  
  // Configura o callback de toast no loadingService
  useEffect(() => {
    loadingService.setToastCallback((type, title, message) => {
      addToast(type, title, message);
    });
  }, [addToast]);
  
  const [activeTab, setActiveTab] = useState<'info' | 'financial'>('info');

  const [activeSales, setActiveSales] = useState<SalesOrder[]>([]);
  const [allCarriers, setAllCarriers] = useState<Partner[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isQuickRedirecting, setIsQuickRedirecting] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'payment' | 'advance'>('payment');

  const [editForm, setEditForm] = useState<Loading>({ ...loading });
  const [freightBase, setFreightBase] = useState<'origin' | 'destination'>('origin');
  const [quickWeight, setQuickWeight] = useState<string>(loading.unloadWeightKg?.toString() || '');

  useEffect(() => {
    setEditForm({ ...loading });
    setQuickWeight(loading.unloadWeightKg?.toString() || '');
    
    if (loading.unloadWeightKg && loading.unloadWeightKg > 0 && loading.freightPricePerTon > 0) {
       const expectedDestTotal = (loading.unloadWeightKg / 1000) * loading.freightPricePerTon;
       if (Math.abs(loading.totalFreightValue - expectedDestTotal) < 1.0) {
         setFreightBase('destination');
       } else {
         setFreightBase('origin');
       }
    } else {
        setFreightBase('origin');
    }
  }, [loading.id]);

  useEffect(() => {
    setActiveSales(salesService.getAll().filter(s => ['approved', 'pending'].includes(s.status)));
    setAllCarriers(partnerService.getAll().filter(p => p.categories.includes(PARTNER_CATEGORY_IDS.CARRIER)));
  }, []);

  useEffect(() => {
    if (isEditing && editForm.carrierId) {
      const mapDriver = (d: any): Driver => ({
        id: d.id,
        partnerId: d.partner_id || '',
        name: d.name,
        cpf: d.document || '',
        cnh: d.license_number || '',
        cnhCategory: '',
        phone: d.phone || '',
        linkedVehicleId: undefined,
        active: !!d.active
      });
      setAvailableDrivers(driverService.getByPartner(editForm.carrierId).map(mapDriver));
      setAvailableVehicles(fleetService.getVehicles(editForm.carrierId));
    }
  }, [isEditing, editForm.carrierId]);

  // Atualiza lista de motoristas ao receber eventos do Supabase
  useEffect(() => {
    if (!isEditing || !editForm.carrierId) return;
    const mapDriver = (d: any): Driver => ({
      id: d.id,
      partnerId: d.partner_id || '',
      name: d.name,
      cpf: d.document || '',
      cnh: d.license_number || '',
      cnhCategory: '',
      phone: d.phone || '',
      linkedVehicleId: undefined,
      active: !!d.active
    });
    const unsub = driverService.subscribe(() => {
      setAvailableDrivers(driverService.getByPartner(editForm.carrierId).map(mapDriver));
    });
    return unsub;
  }, [isEditing, editForm.carrierId]);

  const stats = useMemo(() => {
    const wOri = editForm.weightKg || 0;
    const wDest = editForm.unloadWeightKg || 0;
    const brk = Math.max(0, wOri - wDest);
    
    const purVal = (wOri / 60) * (editForm.purchasePricePerSc || 0);
    const weightForRevenue = (wDest > 0) ? wDest : wOri;
    const salVal = (weightForRevenue / 60) * (editForm.salesPrice || 0);
    
    const frVal = (freightBase === 'origin' 
      ? (wOri / 1000) * (editForm.freightPricePerTon || 0)
      : (wDest / 1000) * (editForm.freightPricePerTon || 0)) + (editForm.redirectDisplacementValue || 0);

    const totalCost = purVal + frVal;
    const profit = salVal - totalCost;
    const margin = salVal > 0 ? (profit / salVal) * 100 : 0;

    return { wOri, wDest, brk, purVal, salVal, frVal, totalCost, profit, margin };
  }, [editForm, freightBase]);

  const handleToggleFreightBase = (newBase: 'origin' | 'destination') => {
    if (newBase === freightBase) return;
    
    if (newBase === 'destination' && (!editForm.unloadWeightKg || editForm.unloadWeightKg <= 0)) {
        addToast('warning', 'Ação Bloqueada', 'Informe e confirme o peso de destino primeiro.');
        return;
    }

    const wRef = newBase === 'origin' ? editForm.weightKg : editForm.unloadWeightKg!;
    const newTotalFreight = parseFloat(((wRef / 1000) * editForm.freightPricePerTon).toFixed(2)) + (editForm.redirectDisplacementValue || 0);

    const updated = {
        ...editForm,
        totalFreightValue: newTotalFreight
    };

    setFreightBase(newBase);
    setEditForm(updated);
    loadingService.update(updated);
    invalidateLoadingCache();
    onUpdate(updated); 

    const baseLabel = newBase === 'origin' ? 'Peso de Origem' : 'Peso de Destino';
    addToast('info', 'Financeiro Atualizado', `O frete agora é calculado com base no ${baseLabel}.`);
  };

  const handleQuickWeightConfirm = () => {
    const wDest = parseFloat(quickWeight);
    if (isNaN(wDest) || wDest <= 0) return addToast('warning', 'Peso Inválido');

    const wRef = freightBase === 'destination' ? wDest : editForm.weightKg;
    const newTotalFreight = parseFloat(((wRef / 1000) * editForm.freightPricePerTon).toFixed(2)) + (editForm.redirectDisplacementValue || 0);

    const updated: Loading = {
      ...editForm,
      unloadWeightKg: wDest,
      breakageKg: Math.max(0, editForm.weightKg - wDest),
      status: 'completed' as const,
      totalSalesValue: parseFloat(((wDest / 60) * editForm.salesPrice).toFixed(2)),
      totalFreightValue: newTotalFreight
    };

    setEditForm(updated);
    loadingService.update(updated);
    invalidateLoadingCache();
    onUpdate(updated); 
    addToast('success', 'Peso Confirmado', 'Contas a receber atualizado (dividido em etapas).');
  };

  const handleSaveStructural = () => {
    const finalData = {
        ...editForm,
        totalPurchaseValue: parseFloat(stats.purVal.toFixed(2)),
        totalSalesValue: parseFloat(stats.salVal.toFixed(2)),
        totalFreightValue: parseFloat(stats.frVal.toFixed(2)),
        breakageKg: stats.brk
    };
    
    loadingService.update(finalData);
    invalidateLoadingCache();
    onUpdate(finalData);
    setIsEditing(false);
    addToast('success', 'Carregamento Confirmado', 'Contas a pagar atualizado.');
  };

  const handleSaveDisplacement = () => {
    const updated = {
        ...editForm,
        totalFreightValue: parseFloat(stats.frVal.toFixed(2))
    };
    setEditForm(updated);
    loadingService.update(updated);
    invalidateLoadingCache();
    onUpdate(updated);
    addToast('success', 'Deslocamento Atualizado', 'O valor foi somado ao total do frete.');
  };

  const handleConfirmRedirect = () => {
    if (!editForm.salesOrderId) return addToast('error', 'Selecione o novo destino');
    
    const updated: Loading = {
        ...editForm,
        isRedirected: true,
        originalDestination: loading.customerName,
        status: 'redirected'
    };

    setEditForm(updated);
    loadingService.update(updated);
    invalidateLoadingCache();
    onUpdate(updated);
    setIsQuickRedirecting(false);
    addToast('success', 'Carga Redirecionada', `Vínculo alterado para ${updated.customerName}`);
  };

  const handleSaveTransaction = (data: any) => {
    const newTx = { id: Math.random().toString(36).substr(2, 9), type: txType, ...data };
    const updated = { 
      ...editForm, 
      freightPaid: (editForm.freightPaid || 0) + data.value, 
      freightAdvances: txType === 'advance' ? (editForm.freightAdvances || 0) + data.value : (editForm.freightAdvances || 0),
      transactions: [newTx, ...(editForm.transactions || [])]
    };
    setEditForm(updated);
    loadingService.update(updated);
    onUpdate(updated);
    setIsTxModalOpen(false);
  };

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const labelClass = 'text-[10px] font-black text-slate-500 uppercase mb-1 block';
  const inputClass = 'w-full border-2 border-slate-300 bg-white px-2 py-1.5 text-slate-900 font-black focus:outline-none focus:border-blue-500 rounded-lg text-sm transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header Principal */}
        <div className={`px-6 py-4 flex justify-between items-center shrink-0 transition-colors ${isEditing ? 'bg-amber-600 text-white' : 'bg-slate-950 text-white'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isEditing ? 'bg-amber-50 text-amber-700 shadow-inner' : 'bg-slate-800 text-blue-400'}`}>
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter italic">{isEditing ? 'Edição Estrutural' : 'Gestão Logística de Carga'}</h2>
              <p className="text-[10px] opacity-70 font-black uppercase tracking-widest">Pedido {loading.purchaseOrderNumber} | {new Date(loading.date).toLocaleDateString()} | {loading.vehiclePlate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <>
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                  <Pencil size={16} /> Estrutural
                </button>
                <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24}/></button>
              </>
            ) : (
              <>
                <button onClick={() => { 
                  const msg = loading.totalFreightValue && loading.totalFreightValue > 0 
                    ? `⚠️ Excluir carga?\n\n⚡ AVISO: O frete (${loading.totalFreightValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) será DELETADO do Financeiro também!`
                    : 'Excluir carga?';
                  if(window.confirm(msg)) { 
                    loadingService.delete(loading.id);
                    invalidateLoadingCache();
                    addToast('success', 'Carregamento Deletado', 'O frete foi removido do Financeiro também.');
                    onUpdate(null); 
                    onClose(); 
                  }
                }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg">Excluir</button>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest">Cancelar</button>
                <button onClick={handleSaveStructural} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                  <Save size={18} /> Salvar Tudo
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sistema de Abas Internas */}
        {!isEditing && (
          <div className="bg-white border-b border-slate-200 px-6 flex shrink-0">
            <button 
              onClick={() => setActiveTab('info')}
              className={`py-4 px-6 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-4 transition-all ${activeTab === 'info' ? 'border-blue-600 text-blue-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <Info size={16} /> Dados da Carga
            </button>
            <button 
              onClick={() => setActiveTab('financial')}
              className={`py-4 px-6 text-xs font-black uppercase tracking-widest flex items-center gap-2 border-b-4 transition-all ${activeTab === 'financial' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <DollarSign size={16} /> Financeiro do Frete
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          
          {(activeTab === 'info' || isEditing) ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`p-5 rounded-2xl border bg-white transition-all ${isEditing ? 'ring-2 ring-blue-500/20 border-blue-200' : 'border-slate-200 shadow-sm'}`}>
                  <span className={labelClass}>1. Origem & Produto</span>
                  <p className="font-black text-slate-800 text-base mb-3 truncate">{editForm.supplierName}</p>
                  <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                        <span className={labelClass}>Preço Compra (R$/SC)</span>
                        {isEditing ? (
                          <input type="number" step="0.01" className={inputClass} value={editForm.purchasePricePerSc} onChange={e => setEditForm({...editForm, purchasePricePerSc: parseFloat(e.target.value)})} />
                        ) : (
                          <p className="font-black text-slate-700 text-lg">{currency(editForm.purchasePricePerSc)}</p>
                        )}
                      </div>
                      <div>
                        <span className={labelClass}>Produto</span>
                        <p className="text-xs font-black text-slate-500 px-3 uppercase">{editForm.product}</p>
                      </div>
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border bg-white transition-all ${isEditing ? 'ring-2 ring-blue-500/20 border-blue-200' : 'border-slate-200 shadow-sm'}`}>
                  <span className={labelClass}>2. Transporte</span>
                  {isEditing ? (
                    <div className="space-y-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Transportadora</label>
                            <select className={inputClass} value={editForm.carrierId} onChange={e => { const c = allCarriers.find(x => x.id === e.target.value); setEditForm({...editForm, carrierId: e.target.value, carrierName: c?.name || ''}); }}>
                                {allCarriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Motorista</label>
                            <select className={inputClass} value={editForm.driverId} onChange={e => { const d = availableDrivers.find(x => x.id === e.target.value); setEditForm({...editForm, driverId: e.target.value, driverName: d?.name || ''}); }}>
                                <option value="">Selecione...</option>
                                {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Placa</label>
                            <input className={`${inputClass} uppercase`} value={editForm.vehiclePlate} onChange={e => setEditForm({...editForm, vehiclePlate: e.target.value})} />
                        </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-black text-slate-800 text-base truncate uppercase">{editForm.carrierName}</p>
                      <p className="text-sm text-slate-500 mt-1 font-bold">{editForm.driverName}</p>
                      <div className="mt-3 inline-block px-3 py-1 bg-slate-900 text-white font-mono font-black rounded-lg text-xs tracking-widest shadow-md">
                          {editForm.vehiclePlate}
                      </div>
                    </>
                  )}
                </div>

                <div className={`p-5 rounded-2xl border transition-all ${isEditing ? 'ring-2 ring-blue-500/20 border-blue-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex justify-between items-center mb-3">
                      <span className={labelClass}>3. Destino (Venda)</span>
                      {!isEditing && (
                        <button onClick={() => setIsQuickRedirecting(!isQuickRedirecting)} className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase transition-all shadow-sm ${isQuickRedirecting ? 'bg-rose-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                          {isQuickRedirecting ? 'Cancelar' : 'Redirecionar'}
                        </button>
                      )}
                  </div>
                  {isQuickRedirecting || isEditing ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Novo Vínculo de Venda</label>
                            <select className={inputClass} value={editForm.salesOrderId} onChange={e => { const s = activeSales.find(x => x.id === e.target.value); setEditForm({...editForm, salesOrderId: e.target.value, salesOrderNumber: s?.number || '', customerName: s?.customerName || '', salesPrice: s?.unitPrice || 0}); }}>
                                <option value="">Escolha um pedido ativo...</option>
                                {activeSales.map(s => <option key={s.id} value={s.id}>{s.customerName} (#{s.number})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase">Preço Venda (R$/SC)</label>
                            <input type="number" step="0.01" className={inputClass} value={editForm.salesPrice} onChange={e => setEditForm({...editForm, salesPrice: parseFloat(e.target.value)})} />
                        </div>
                        {isQuickRedirecting && !isEditing && (
                            <button onClick={handleConfirmRedirect} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-black text-[10px] uppercase shadow-md flex items-center justify-center gap-2 transition-all active:scale-95">
                                <Check size={14} /> Salvar Redirecionamento
                            </button>
                        )}
                    </div>
                  ) : (
                    <>
                      <p className="font-black text-slate-800 text-base truncate uppercase">{editForm.customerName}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-bold">Ped. Venda: {editForm.salesOrderNumber}</p>
                      {editForm.isRedirected && (
                        <div className="mt-3 p-2 bg-indigo-50 rounded-xl border border-indigo-100 shadow-xs">
                             <div className="flex items-center gap-2 text-[9px] font-black text-indigo-700 uppercase"><ArrowRightLeft size={12} /> Carga Remanejada</div>
                             <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase italic">Origem Original: {editForm.originalDestination}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* CAMPO DE DESLOCAMENTO EXTRA - APARECE SE REDIRECIONADO */}
              {(editForm.isRedirected || isEditing) && (
                <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-xl animate-in slide-in-from-top-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-500 rounded-lg"><MapPin size={20} /></div>
                       <div>
                          <h4 className="font-black text-sm uppercase italic">Custos Adicionais de Remanejo</h4>
                          <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Valor de deslocamento extra para o transportador</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                          <label className="text-[9px] font-black text-indigo-300 uppercase mb-1 block">Adicionar ao Frete (R$)</label>
                          <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-400">R$</span>
                             <input 
                                type="number" step="0.01" 
                                className="bg-indigo-800 border-2 border-indigo-700 rounded-xl pl-9 pr-3 py-2 font-black text-lg text-white focus:outline-none focus:border-emerald-400 transition-all w-48"
                                placeholder="0,00"
                                value={editForm.redirectDisplacementValue || ''}
                                onChange={e => setEditForm({...editForm, redirectDisplacementValue: parseFloat(e.target.value) || 0})}
                             />
                          </div>
                       </div>
                       {!isEditing && (
                          <button onClick={handleSaveDisplacement} className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-lg transition-all active:scale-95">Salvar Valor</button>
                       )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest"><Scale size={20} className="text-slate-400"/> Pesagem e Conferência de Quebra</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                  <div className={`md:col-span-2 p-5 rounded-2xl border transition-all ${isEditing ? 'bg-blue-50 border-blue-300 shadow-inner' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={labelClass}>Peso Origem (Carregamento)</span>
                    {isEditing ? (
                        <div className="relative">
                            <input type="number" className="w-full bg-white border-2 border-blue-300 rounded-xl px-4 py-3 font-black text-2xl text-slate-900 focus:outline-none" value={editForm.weightKg} onChange={e => setEditForm({...editForm, weightKg: parseFloat(e.target.value)})} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase">KG</span>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{stats.wOri.toLocaleString()}</span>
                            <span className="text-sm font-black text-slate-400 uppercase">KG</span>
                        </div>
                    )}
                  </div>

                  <div className="flex justify-center text-slate-300"><ArrowRight size={32} className="hidden md:block" /></div>

                  <div className={`md:col-span-2 p-5 rounded-2xl border-2 transition-all ${!editForm.unloadWeightKg ? 'bg-amber-50 border-amber-300 ring-4 ring-amber-100/50' : 'bg-emerald-50 border-emerald-300 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-2">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${!editForm.unloadWeightKg ? 'text-amber-700' : 'text-emerald-700'}`}>Peso Destino (Chegada)</span>
                       {editForm.unloadWeightKg ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-amber-500 animate-pulse" />}
                    </div>

                    {(!editForm.unloadWeightKg || isEditing) ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1 min-w-0">
                           <input 
                             type="number" value={quickWeight} onChange={e => setQuickWeight(e.target.value)}
                             placeholder="Peso Destino..."
                             className="w-full bg-white border-2 border-emerald-300 rounded-xl px-4 py-3 font-black text-xl text-slate-900 placeholder:text-slate-300 focus:outline-none"
                           />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase">KG</span>
                        </div>
                        {!isEditing && <button onClick={handleQuickWeightConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl font-black text-xs uppercase shadow-lg flex items-center gap-2 transition-all active:scale-95 shrink-0"><Check size={18} /> Confirmar</button>}
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2 mb-2 h-12">
                           <input 
                             type="number" value={quickWeight} onChange={e => setQuickWeight(e.target.value)}
                             className="flex-1 min-w-0 bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-black text-xl text-slate-900 focus:outline-none"
                           />
                           <button onClick={handleQuickWeightConfirm} className="bg-slate-900 text-white px-4 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 shrink-0 whitespace-nowrap">ATUALIZAR</button>
                        </div>
                        <div className="flex items-baseline gap-2 opacity-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Confirmado:</span>
                          <span className="text-lg font-black text-slate-900">{stats.wDest.toLocaleString()} KG</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                   <div className="flex items-center gap-2 mb-4 text-blue-700 border-b border-blue-50 pb-2">
                     <ShoppingBag size={18} /> <h3 className="font-black text-[10px] uppercase tracking-widest">Financeiro Compra</h3>
                   </div>
                   <div className="space-y-4">
                     <div><span className={labelClass}>Valor Unit. (SC)</span><p className="text-lg font-black text-slate-700">{currency(editForm.purchasePricePerSc)}</p></div>
                     <div className="pt-3 border-t border-slate-100 shadow-inner rounded-b-lg p-2"><span className={labelClass}>Total a Pagar</span><p className="text-xl font-black text-blue-700">{currency(stats.purVal)}</p></div>
                   </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                   <div className="flex items-center gap-2 mb-4 text-emerald-700 border-b border-emerald-50 pb-2">
                     <TrendingUp size={18} /> <h3 className="font-black text-[10px] uppercase tracking-widest">Financeiro Venda</h3>
                   </div>
                   <div className="space-y-4">
                     <div><span className={labelClass}>Valor Unit. (SC)</span><p className="text-lg font-black text-slate-700">{currency(editForm.salesPrice)}</p></div>
                     <div className="pt-3 border-t border-slate-100 shadow-inner rounded-b-lg p-2"><span className={labelClass}>Total {editForm.unloadWeightKg ? 'Faturado' : 'Projetado'}</span><p className="text-xl font-black text-emerald-700">{currency(stats.salVal)}</p></div>
                   </div>
                </div>

                <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${isEditing ? 'bg-slate-900 border-rose-500/50' : 'bg-white border-slate-200'}`}>
                   <div className="flex justify-between items-center mb-4 border-b border-rose-500/10 pb-2">
                      <div className={`flex items-center gap-2 ${isEditing ? 'text-rose-400' : 'text-rose-700'}`}>
                        <DollarSign size={18} /> <h3 className="font-black text-[10px] uppercase tracking-widest">Custo Logístico</h3>
                      </div>
                   </div>
                   <div className="space-y-4">
                     <div>
                        <span className={labelClass}>Preço (TON)</span>
                        {isEditing ? (
                            <input type="number" step="0.01" className={`${inputClass} bg-slate-800 border-slate-700 text-white focus:border-rose-500`} value={editForm.freightPricePerTon} onChange={e => setEditForm({...editForm, freightPricePerTon: parseFloat(e.target.value)})} />
                        ) : (
                            <p className="text-lg font-black text-slate-700">{currency(editForm.freightPricePerTon)}</p>
                        )}
                     </div>
                     
                     <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1">
                        <button type="button" onClick={() => handleToggleFreightBase('origin')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${freightBase === 'origin' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Base Origem</button>
                        <button type="button" onClick={() => handleToggleFreightBase('destination')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${freightBase === 'destination' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Base Destino</button>
                     </div>

                     <div className="pt-3 border-t border-slate-100 flex justify-between">
                        <div>
                            <span className={labelClass}>Total Frete</span>
                            <p className={`text-base font-black ${isEditing ? 'text-white' : 'text-rose-700'}`}>{currency(stats.frVal)}</p>
                        </div>
                     </div>
                   </div>
                </div>

                <div className={`p-6 rounded-2xl border shadow-xl flex flex-col justify-between ${stats.profit >= 0 ? 'bg-slate-950 border-emerald-500/30' : 'bg-red-950 border-red-500/30'}`}>
                   <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                     <Calculator size={18} className={stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                     <h3 className={`font-black text-[10px] uppercase tracking-widest ${stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Resultado da Carga</h3>
                   </div>
                   
                   <div className="space-y-1 mb-4 text-[11px] text-white/60 font-bold">
                     <div className="flex justify-between items-center">
                        <span>Receita:</span>
                        <span className="font-black text-white">{currency(stats.salVal)}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] opacity-70">
                        <span>(-) Custos:</span>
                        <span className="font-medium text-rose-300">{currency(stats.totalCost)}</span>
                     </div>
                   </div>

                   <div className="pt-4 border-t border-white/20">
                     <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Lucro Líquido</span>
                       <span className={`text-2xl font-black ${stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{currency(stats.profit)}</span>
                     </div>
                     <div className={`text-right text-xs font-black ${stats.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{stats.margin.toFixed(2)}% Margem</div>
                   </div>
                </div>
              </div>
            </>
          ) : (
            <LoadingFinancialTab 
                loading={editForm} 
                onUpdate={(up) => { setEditForm(up); loadingService.update(up); onUpdate(up); }}
                onAddPayment={() => { setTxType('payment'); setIsTxModalOpen(true); }}
            />
          )}

        </div>
      </div>

      <TransactionModal 
        isOpen={isTxModalOpen} 
        onClose={() => setIsTxModalOpen(false)} 
        onSave={handleSaveTransaction} 
        type={txType} 
        title={txType === 'advance' ? 'Lançar Adiantamento Frete' : 'Baixar Saldo de Frete'} 
      />
    </div>
  );
};

export default LoadingManagement;
