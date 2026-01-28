
import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  Scale, 
  DollarSign, 
  ArrowRight, 
  Save, 
  X, 
  Search,
  Calculator,
  UserCheck,
  Package,
  ChevronDown,
  Wheat,
  MapPin,
  ClipboardList,
  ShoppingBag,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { Loading } from '../types';
import { PurchaseOrder } from '../../PurchaseOrder/types';
import { SalesOrder } from '../../SalesOrder/types';
import { salesService } from '../../../services/salesService';
import { partnerService } from '../../../services/partnerService';
import { fleetService } from '../../../services/fleetService';
import { driverService } from '../../../services/driverService';
import { PARTNER_CATEGORY_IDS } from '../../../constants';
import { Partner, Driver, Vehicle } from '../../Partners/types';
import { useToast } from '../../../contexts/ToastContext';

interface Props {
  purchaseOrder: PurchaseOrder;
  onSave: (loading: Loading) => void;
  onClose: () => void;
}

const LoadingForm: React.FC<Props> = ({ purchaseOrder, onSave, onClose }) => {
  const { addToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // States
  const [activeSales, setActiveSales] = useState<SalesOrder[]>([]);
  const [carriers, setCarriers] = useState<Partner[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  
  // Sales Dropdown Search
  const [salesSearch, setSalesSearch] = useState('');
  const [isSalesDropdownOpen, setIsSalesDropdownOpen] = useState(false);

  const getLocalDate = () => new Date().toLocaleDateString('sv-SE');

  const [formData, setFormData] = useState<Partial<Loading>>({
    date: getLocalDate(),
    invoiceNumber: '',
    purchaseOrderId: purchaseOrder.id,
    purchaseOrderNumber: purchaseOrder.number,
    supplierName: purchaseOrder.partnerName,
    product: purchaseOrder.items[0]?.productName || 'Milho em Grãos',
    weightKg: 0,
    weightTon: 0,
    weightSc: 0,
    purchasePricePerSc: purchaseOrder.items[0]?.unitPrice || 0,
    totalPurchaseValue: 0,
    freightPricePerTon: 0,
    totalFreightValue: 0,
    salesOrderId: '',
    salesPrice: 0,
    totalSalesValue: 0,
    status: 'in_transit',
    isClientTransport: false
  });

  useEffect(() => {
    const sales = salesService.getAll().filter(s => ['approved', 'pending'].includes(s.status));
    setActiveSales(sales);
    const validCarriers = partnerService.getAll().filter(p => p.categories.includes(PARTNER_CATEGORY_IDS.CARRIER));
    setCarriers(validCarriers);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSalesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync FOB logic
  useEffect(() => {
    if (formData.isClientTransport && formData.salesOrderId) {
      const sale = activeSales.find(s => s.id === formData.salesOrderId);
      if (sale) {
        setFormData(prev => ({
          ...prev,
          carrierId: sale.customerId,
          carrierName: `(FOB) ${sale.customerName}`,
          freightPricePerTon: 0,
          totalFreightValue: 0
        }));
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
        setAvailableDrivers(driverService.getByPartner(sale.customerId).map(mapDriver));
        setAvailableVehicles(fleetService.getVehicles(sale.customerId));
      }
    }
  }, [formData.isClientTransport, formData.salesOrderId]);

  useEffect(() => {
    if (!formData.isClientTransport && formData.carrierId) {
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
      setAvailableDrivers(driverService.getByPartner(formData.carrierId).map(mapDriver));
      setAvailableVehicles(fleetService.getVehicles(formData.carrierId));
    }
  }, [formData.carrierId, formData.isClientTransport]);

  // Mantém lista de motoristas atualizada quando o serviço (Supabase) mudar
  useEffect(() => {
    const refreshDrivers = () => {
      const targetPartnerId = formData.isClientTransport && formData.salesOrderId
        ? activeSales.find(s => s.id === formData.salesOrderId)?.customerId
        : formData.carrierId;
      if (!targetPartnerId) return;
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
      setAvailableDrivers(driverService.getByPartner(targetPartnerId).map(mapDriver));
    };
    const unsub = driverService.subscribe(() => refreshDrivers());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.isClientTransport, formData.salesOrderId, formData.carrierId]);

  // Totals Calculation
  useEffect(() => {
    const kg = formData.weightKg || 0;
    const sc = kg / 60;
    const ton = kg / 1000;
    const purchaseTotal = sc * (formData.purchasePricePerSc || 0);
    const freightTotal = ton * (formData.freightPricePerTon || 0);
    const salesTotal = sc * (formData.salesPrice || 0);

    setFormData(prev => ({
      ...prev,
      weightTon: parseFloat(ton.toFixed(3)),
      weightSc: parseFloat(sc.toFixed(2)),
      totalPurchaseValue: parseFloat(purchaseTotal.toFixed(2)),
      totalFreightValue: parseFloat(freightTotal.toFixed(2)),
      totalSalesValue: parseFloat(salesTotal.toFixed(2))
    }));
  }, [formData.weightKg, formData.purchasePricePerSc, formData.freightPricePerTon, formData.salesPrice]);

  const handleSelectSalesOrder = (sale: SalesOrder) => {
    setFormData(prev => ({
      ...prev,
      salesOrderId: sale.id,
      salesOrderNumber: sale.number,
      customerName: sale.customerName,
      salesPrice: sale.unitPrice || 0
    }));
    setSalesSearch(sale.customerName);
    setIsSalesDropdownOpen(false);
    addToast('info', 'Destino Vinculado', `Venda #${sale.number} selecionada.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.salesOrderId) return addToast('error', 'Falta Destino', 'Vincule um pedido de venda.');
    if (!formData.driverId) return addToast('error', 'Falta Logística', 'Selecione o motorista.');
    if (!formData.weightKg || formData.weightKg <= 0) return addToast('error', 'Peso Inválido');
    
    // Gera UUID v4 compatível com Supabase
    const generateUUID = (): string => {
      if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
        return self.crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
    
    onSave({ ...formData, id: generateUUID(), freightAdvances: 0, freightPaid: 0, productPaid: 0 } as Loading);
    
    // Notificação profissional após criação
    addToast(
      'Carregamento Criado',
      `Carregamento ${formData.loadingNumber} registrado com sucesso no sistema`,
      'success'
    );
  };

  const filteredSales = activeSales.filter(s => 
    s.customerName.toLowerCase().includes(salesSearch.toLowerCase()) || 
    s.number.includes(salesSearch)
  );

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const inputClass = 'w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 font-bold focus:border-emerald-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-sm';
  const labelClass = 'block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest ml-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
        
        {/* Header Estilizado */}
        <div className="bg-slate-900 text-white px-8 py-6 flex justify-between items-center shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Truck size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">Registrar Novo Carregamento</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-700">Origem: {purchaseOrder.number}</span>
                <ArrowRight size={12} className="text-slate-600" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{formData.customerName || 'Aguardando Destino'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <form id="loading-form" onSubmit={handleSubmit} className="space-y-8">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* COLUNA ESQUERDA: DESTINO E LOGÍSTICA */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* CARD 1: SELEÇÃO DE VENDA */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative" ref={dropdownRef}>
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                      <ShoppingBag size={18} className="text-emerald-500" /> 1. Destino da Mercadoria
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-0"
                        checked={formData.isClientTransport}
                        onChange={e => setFormData({...formData, isClientTransport: e.target.checked})}
                      />
                      <span className="text-[10px] font-black text-slate-500 uppercase group-hover:text-emerald-600 transition-colors">Frete FOB (Cliente retira)</span>
                    </label>
                  </div>

                  <div className="relative">
                    <label className={labelClass}>Pesquisar Contrato de Venda / Cliente</label>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                      <input 
                        type="text"
                        placeholder="Nome do cliente ou nº do pedido..."
                        value={salesSearch}
                        onFocus={() => setIsSalesDropdownOpen(true)}
                        onChange={(e) => { setSalesSearch(e.target.value); setIsSalesDropdownOpen(true); }}
                        className={`${inputClass} pl-12 h-12 text-base`}
                      />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    </div>

                    {/* LISTA DE VENDAS CUSTOMIZADA */}
                    {isSalesDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-80 overflow-y-auto">
                          {filteredSales.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 italic font-medium">Nenhum contrato ativo encontrado.</div>
                          ) : (
                            filteredSales.map(sale => (
                              <div 
                                key={sale.id}
                                onClick={() => handleSelectSalesOrder(sale)}
                                className="p-4 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-black text-slate-900 uppercase group-hover:text-emerald-700 transition-colors">{sale.customerName}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Venda #{sale.number}</span>
                                      <span className="text-[10px] font-black text-blue-600 flex items-center gap-1"><UserCheck size={12}/> Vendedor: {sale.consultantName}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-emerald-600">{currency(sale.unitPrice || 0)} <span className="text-[9px] text-slate-400 uppercase">/ SC</span></p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Saldo: {sale.quantity?.toLocaleString()} SC</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {formData.salesOrderId && !isSalesDropdownOpen && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between animate-in zoom-in-95">
                       <div className="flex items-center gap-3">
                          <CheckCircle2 className="text-emerald-500" size={20} />
                          <div>
                            <p className="text-xs font-black text-emerald-900 uppercase leading-none">Contrato Selecionado</p>
                            <p className="text-[10px] font-bold text-emerald-700 mt-1 uppercase tracking-tight">{formData.customerName} | Preço Venda: {currency(formData.salesPrice || 0)}</p>
                          </div>
                       </div>
                       <button type="button" onClick={() => {setFormData({...formData, salesOrderId: '', customerName: ''}); setSalesSearch('');}} className="text-emerald-400 hover:text-rose-500 transition-colors"><X size={16}/></button>
                    </div>
                  )}
                </div>

                {/* CARD 2: LOGÍSTICA */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-black text-slate-900 mb-5 flex items-center gap-2 uppercase tracking-widest">
                    <Truck size={18} className="text-blue-500" /> 2. Logística de Transporte
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelClass}>Transportadora</label>
                      <select 
                        className={inputClass} 
                        value={formData.carrierId} 
                        onChange={e => { const c = carriers.find(x => x.id === e.target.value); setFormData({...formData, carrierId: e.target.value, carrierName: c?.name}); }} 
                        disabled={formData.isClientTransport}
                        required
                      >
                        <option value="">Selecione...</option>
                        {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelClass}>Data do Carregamento</label>
                      <input type="date" className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelClass}>Motorista</label>
                      <select className={inputClass} value={formData.driverId} onChange={e => { const d = availableDrivers.find(x => x.id === e.target.value); setFormData({...formData, driverId: e.target.value, driverName: d?.name || '', vehiclePlate: availableVehicles.find(v => v.id === d?.linkedVehicleId)?.plate || formData.vehiclePlate}); }} required>
                        <option value="">Selecione...</option>
                        {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelClass}>Placa do Veículo (Opcional)</label>
                      <input type="text" className={`${inputClass} uppercase`} value={formData.vehiclePlate || ''} onChange={e => setFormData({...formData, vehiclePlate: e.target.value})} placeholder="Ex: AAA-0000" />
                    </div>
                    <div className="col-span-2">
                       <label className={labelClass}>Nº Documento Fiscal (NF)</label>
                       <div className="relative">
                          <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input type="text" className={`${inputClass} pl-10`} value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} placeholder="Opcional" />
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: PESOS E FINANCEIRO */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* CARD 3: PESAGEM E COMPRA */}
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-emerald-400">
                    <Scale size={18} /> 3. Pesagem de Origem
                  </h3>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Peso Bruto Carregado (KG)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-2xl font-black text-white focus:border-emerald-500 focus:outline-none transition-all"
                          value={formData.weightKg || ''} 
                          onChange={e => setFormData({...formData, weightKg: parseFloat(e.target.value)})} 
                          placeholder="0" 
                          required 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">KG</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                         <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Equivalente SC</span>
                         <p className="text-lg font-black text-emerald-400">{formData.weightSc?.toLocaleString()} <span className="text-[10px]">SC</span></p>
                      </div>
                      <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                         <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Em Toneladas</span>
                         <p className="text-lg font-black text-blue-400">{formData.weightTon?.toLocaleString()} <span className="text-[10px]">TON</span></p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                      <div className="flex justify-between items-end mb-2">
                         <span className="text-[10px] font-black text-slate-400 uppercase">Custo Unitário Compra</span>
                         <span className="text-[10px] font-black text-slate-400 uppercase">Total Grão</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <input 
                            type="number" step="0.01" 
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-emerald-500 outline-none"
                            value={formData.purchasePricePerSc} 
                            onChange={e => setFormData({...formData, purchasePricePerSc: parseFloat(e.target.value)})} 
                          />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-xl font-black text-white">{currency(formData.totalPurchaseValue || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 4: FRETE */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  {formData.isClientTransport && (
                    <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-[1px] z-10 flex items-center justify-center rotate-[-5deg]">
                       <span className="text-2xl font-black text-slate-300 uppercase tracking-widest border-4 border-slate-200 px-6 py-2 rounded-xl">Frete FOB</span>
                    </div>
                  )}
                  <h3 className="text-xs font-black text-slate-900 mb-5 flex items-center gap-2 uppercase tracking-widest">
                    <Calculator size={18} className="text-rose-500" /> 4. Acerto de Frete
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Valor Combinado (R$/TON)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                          type="number" step="0.01" className={`${inputClass} pl-10`}
                          value={formData.freightPricePerTon} 
                          onChange={e => setFormData({...formData, freightPricePerTon: parseFloat(e.target.value)})} 
                          disabled={formData.isClientTransport}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-rose-50 p-4 rounded-xl border border-rose-100">
                      <span className="text-[10px] font-black text-rose-600 uppercase">Custo Logístico Total</span>
                      <span className="text-xl font-black text-rose-700">{currency(formData.totalFreightValue || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* SUMMARY PEQUENO */}
                <div className="p-4 bg-emerald-950 rounded-2xl text-white flex justify-between items-center shadow-lg border border-emerald-900">
                   <div>
                     <p className="text-[8px] font-black uppercase text-emerald-500 leading-none mb-1">Resultado Projetado</p>
                     <p className="text-lg font-black leading-none">{currency(formData.totalSalesValue! - (formData.totalPurchaseValue! + formData.totalFreightValue!))}</p>
                   </div>
                   <TrendingUp size={24} className="text-emerald-500/50" />
                </div>

              </div>
            </div>

            {/* OBSERVAÇÕES */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <label className={labelClass}>Anotações Gerais da Carga</label>
              <textarea 
                className={`${inputClass} h-20 font-medium text-slate-700`} 
                value={formData.notes || ''} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                placeholder="Observações de qualidade, avarias ou acordos específicos..." 
              />
            </div>
          </form>
        </div>

        {/* Footer de Ações */}
        <div className="bg-white border-t border-slate-200 px-8 py-6 shrink-0 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="hidden sm:block">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total da Carga (Venda)</p>
            <p className="text-xl font-black text-slate-900">{currency(formData.totalSalesValue || 0)}</p>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl border-2 border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button 
              form="loading-form" 
              type="submit" 
              className="flex-1 sm:flex-none px-12 py-3.5 rounded-xl bg-slate-950 text-white font-black shadow-xl shadow-slate-900/20 hover:bg-slate-800 flex items-center justify-center gap-2 uppercase text-xs tracking-widest active:scale-95 transition-all"
            >
              <Save size={18} /> Confirmar e Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingForm;
