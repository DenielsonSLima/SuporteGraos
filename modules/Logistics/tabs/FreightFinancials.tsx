
import React, { useState, useEffect } from 'react';
import { Freight } from '../types';
import FreightFinancialsDashboard from '../components/Financials/FreightFinancialsDashboard';
import CarrierFinancialDetails from '../components/Financials/CarrierFinancialDetails';
import { LoadingCache } from '../../../services/loadingCache';

interface Props {
  freights: Freight[];
  onManageFinancials: (freight: Freight) => void; 
}

const FreightFinancials: React.FC<Props> = ({ freights: initialFreights }) => {
  // Estado local para garantir atualização instantânea após pagamentos
  const [currentFreights, setCurrentFreights] = useState<Freight[]>(initialFreights);
  const [selectedCarrierName, setSelectedCarrierName] = useState<string | null>(null);

  // Sincroniza com as props se mudarem externamente
  useEffect(() => {
    setCurrentFreights(initialFreights);
  }, [initialFreights]);

  // Escuta eventos de atualização de dados para refresh automático
  useEffect(() => {
    const handleDataUpdate = (e: any) => {
      if (e.detail?.type === 'freight_payment' || e.detail?.type === 'loading_update') {
        handleRefresh();
      }
    };
    
    window.addEventListener('data:updated', handleDataUpdate);
    return () => window.removeEventListener('data:updated', handleDataUpdate);
  }, []);

  const handleRefresh = () => {
    // Recarrega do serviço para garantir dados frescos após um pagamento
    // Em um cenário real com backend, isso seria um fetch
    const allLoadings = LoadingCache.getAll();
    const freshFreights = allLoadings.map(l => ({
        id: l.id,
        orderNumber: l.purchaseOrderNumber, 
        date: l.date,
        carrierName: l.carrierName,
        driverName: l.driverName,
        vehiclePlate: l.vehiclePlate,
        supplierName: l.supplierName, 
        originCity: 'Origem', 
        originState: 'MT',
        destinationCity: l.customerName, 
        destinationState: 'MT',
        product: l.product,
        weight: l.weightKg,
        unit: 'KG',
        merchandiseValue: (l.weightSc || 0) * (l.purchasePricePerSc || 0),
        pricePerUnit: l.freightPricePerTon,
        totalFreight: l.totalFreightValue,
        paidValue: l.freightPaid,
        advanceValue: l.freightAdvances,
        balanceValue: l.totalFreightValue - l.freightPaid,
        status: l.status === 'unloading' ? 'waiting_unload' : l.status as any,
        financialStatus: l.totalFreightValue <= l.freightPaid && l.totalFreightValue > 0 ? 'paid' : (l.freightPaid > 0 ? 'partial' : 'pending')
      } as Freight));
      
    setCurrentFreights(freshFreights);
  };

  // Renderização Condicional: Dashboard ou Detalhes
  if (selectedCarrierName) {
    return (
      <CarrierFinancialDetails 
        carrierName={selectedCarrierName}
        allFreights={currentFreights}
        onBack={() => { setSelectedCarrierName(null); handleRefresh(); }}
        onRefresh={handleRefresh}
      />
    );
  }

  return (
    <FreightFinancialsDashboard 
      freights={currentFreights} 
      onSelectCarrier={setSelectedCarrierName} 
    />
  );
};

export default FreightFinancials;
