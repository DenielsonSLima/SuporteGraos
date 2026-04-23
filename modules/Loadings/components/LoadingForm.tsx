
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loading } from '../types';
import { PurchaseOrder } from '../../PurchaseOrder/types';
import { SalesOrder } from '../../SalesOrder/types';
import { useToast } from '../../../contexts/ToastContext';
import { useActiveSales } from '../../../hooks/useActiveSales';
import { useCarrierPartners } from '../../../hooks/useCarrierPartners';
import { usePartnerDrivers, usePartnerVehicles } from '../../../hooks/useParceiros';
import { computeFormTotals } from '../calculations';
import QuickDriverModal from '../../Partners/components/QuickDriverModal';

// ─── Componentes Modulados (Seções) ────────────────────────────────────────
import LoadingFormHeader from './sections/LoadingFormHeader';
import LoadingFormDestination from './sections/LoadingFormDestination';
import LoadingFormLogistics from './sections/LoadingFormLogistics';
import LoadingFormWeights from './sections/LoadingFormWeights';
import LoadingFormFreight from './sections/LoadingFormFreight';
import LoadingFormFooter from './sections/LoadingFormFooter';

import ModalPortal from '../../../components/ui/ModalPortal';

interface Props {
  purchaseOrder: PurchaseOrder;
  onSave: (loading: Loading) => void;
  onClose: () => void;
}

const LoadingForm: React.FC<Props> = ({ purchaseOrder, onSave, onClose }) => {
  const { addToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Query Hooks ───────────────────────────────────────────────────────────
  const { data: activeSales = [] } = useActiveSales();
  const { data: carriers = [] } = useCarrierPartners();

  // ─── States ────────────────────────────────────────────────────────────────
  const [salesSearch, setSalesSearch] = useState('');
  const [isSalesDropdownOpen, setIsSalesDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickDriverModal, setShowQuickDriverModal] = useState(false);

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

  const getLocalDate = () => new Date().toLocaleDateString('sv-SE');

  const [formData, setFormData] = useState<Partial<Loading>>({
    id: generateUUID(),
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
    extraExpenses: [],
    status: 'in_transit',
    isClientTransport: false
  });

  const fleetPartnerId = useMemo(() => {
    if (formData.isClientTransport && formData.salesOrderId) {
      return activeSales.find(s => s.id === formData.salesOrderId)?.customerId || '';
    }
    return formData.carrierId || '';
  }, [formData.isClientTransport, formData.salesOrderId, formData.carrierId, activeSales]);

  const { data: rawDrivers = [], isPending: isLoadingDrivers } = usePartnerDrivers(fleetPartnerId);
  const { data: rawVehicles = [] } = usePartnerVehicles(fleetPartnerId);
  const availableDrivers = useMemo(() => rawDrivers.filter(d => d.active !== false), [rawDrivers]);
  const availableVehicles = useMemo(() => rawVehicles.filter(v => v.active !== false), [rawVehicles]);

  // Click outside dropdown
  useEffect(() => {
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
    if (!(formData.isClientTransport && formData.salesOrderId)) return;
    const sale = activeSales.find(s => s.id === formData.salesOrderId);
    if (sale) {
      setFormData(prev => ({
        ...prev,
        carrierId: sale.customerId,
        carrierName: `(FOB) ${sale.customerName}`,
        freightPricePerTon: 0,
        totalFreightValue: 0
      }));
    }
  }, [formData.isClientTransport, formData.salesOrderId, activeSales]);

  // Totals calculations
  const totals = useMemo(
    () => computeFormTotals(
      formData.weightKg || 0,
      formData.purchasePricePerSc || 0,
      formData.freightPricePerTon || 0,
      formData.salesPrice || 0
    ),
    [formData.weightKg, formData.purchasePricePerSc, formData.freightPricePerTon, formData.salesPrice]
  );

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...totals }));
  }, [totals]);

  const handleSelectSalesOrder = (sale: SalesOrder) => {
    setFormData(prev => ({
      ...prev,
      salesOrderId: sale.id,
      salesOrderNumber: sale.number,
      customerName: sale.customerName,
      customerNickname: sale.customerNickname,
      salesPrice: sale.unitPrice || 0
    }));
    setSalesSearch(sale.customerName);
    setIsSalesDropdownOpen(false);
    addToast('info', 'Destino Vinculado', `Venda #${sale.number} selecionada.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.salesOrderId) return addToast('error', 'Falta Destino', 'Vincule um pedido de venda.');
    if (!formData.driverId) return addToast('error', 'Falta Logística', 'Selecione o motorista.');
    if (!formData.weightKg || formData.weightKg <= 0) return addToast('error', 'Peso Inválido');
    if (!formData.purchasePricePerSc || formData.purchasePricePerSc <= 0) {
      return addToast('error', 'Preço Obrigatório', 'Informe o custo unitário de compra.');
    }

    setIsSubmitting(true);
    try {
      const loadingData: Loading = {
        ...formData,
        id: formData.id || generateUUID(),
        date: formData.date || getLocalDate(),
        weightKg: formData.weightKg || 0,
        weightTon: (formData.weightKg || 0) / 1000,
        weightSc: (formData.weightKg || 0) / 60,
        totalPurchaseValue: formData.totalPurchaseValue || 0,
        totalSalesValue: formData.totalSalesValue || 0,
        totalFreightValue: formData.totalFreightValue || 0,
        freightAdvances: 0,
        freightPaid: 0,
        productPaid: 0,
        extraExpenses: formData.extraExpenses || []
      } as Loading;

      await onSave(loadingData);
      addToast('success', 'Carregamento Criado', `Motorista ${formData.driverName || 'N/A'} - ${formData.carrierName || 'N/A'}`);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      addToast('error', 'Erro', 'Falha ao salvar carregamento.');
    }
  };

  const filteredSales = activeSales.filter(s =>
    s.customerName.toLowerCase().includes(salesSearch.toLowerCase()) ||
    (s.customerNickname?.toLowerCase().includes(salesSearch.toLowerCase())) ||
    s.number.includes(salesSearch)
  );

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xl p-4 sm:p-6 animate-in fade-in duration-500">
        <div className="w-full max-w-5xl bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20 animate-in zoom-in-95 duration-500">

          <LoadingFormHeader
            purchaseOrder={purchaseOrder}
            customerName={formData.customerName || ''}
            customerNickname={formData.customerNickname}
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto p-6 lg:p-8 scrollbar-hide">
            <form id="loading-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                <div className="lg:col-span-7 space-y-6">
                  <LoadingFormDestination
                    formData={formData}
                    salesSearch={salesSearch}
                    isSalesDropdownOpen={isSalesDropdownOpen}
                    filteredSales={filteredSales}
                    onSetSalesSearch={setSalesSearch}
                    onSetIsSalesDropdownOpen={setIsSalesDropdownOpen}
                    onSetFormData={data => setFormData(prev => ({ ...prev, ...data }))}
                    onSelectSalesOrder={handleSelectSalesOrder}
                    currency={currency}
                    dropdownRef={dropdownRef}
                  />

                  <LoadingFormLogistics
                    formData={formData}
                    carriers={carriers}
                    availableDrivers={availableDrivers}
                    availableVehicles={availableVehicles}
                    fleetPartnerId={fleetPartnerId}
                    isLoadingDrivers={isLoadingDrivers}
                    onSetFormData={data => setFormData(prev => ({ ...prev, ...data }))}
                    onShowQuickDriverModal={setShowQuickDriverModal}
                  />

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <label className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1 block">Anotações Gerais (Opcional)</label>
                    <textarea
                      className="w-full rounded-2xl border-2 border-slate-100 bg-white px-5 py-3 text-slate-700 font-medium focus:border-indigo-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-sm h-24 resize-none"
                      value={formData.notes || ''}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Observações de qualidade, avarias ou acordos específicos..."
                    />
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <LoadingFormWeights
                    formData={formData}
                    onSetFormData={data => setFormData(prev => ({ ...prev, ...data }))}
                    currency={currency}
                  />

                  <LoadingFormFreight
                    formData={formData}
                    onSetFormData={data => setFormData(prev => ({ ...prev, ...data }))}
                    currency={currency}
                  />
                </div>
              </div>
            </form>
          </div>

          <LoadingFormFooter
            formData={formData}
            isSubmitting={isSubmitting}
            currency={currency}
            onClose={onClose}
          />
        </div>

        {fleetPartnerId && (
          <QuickDriverModal
            isOpen={showQuickDriverModal}
            onClose={() => setShowQuickDriverModal(false)}
            partnerId={fleetPartnerId}
            onSuccess={(newDriver) => {
              setFormData(prev => ({
                ...prev,
                driverId: newDriver.id,
                driverName: newDriver.name,
                vehiclePlate: prev.vehiclePlate || availableVehicles[0]?.plate || ''
              }));
            }}
          />
        )}
      </div>
    </ModalPortal>
  );
};

export default LoadingForm;
