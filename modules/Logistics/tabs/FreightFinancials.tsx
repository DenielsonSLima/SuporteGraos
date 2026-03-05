
import React, { useState, useCallback } from 'react';
import { Freight } from '../types';
import FreightFinancialsDashboard from '../components/Financials/FreightFinancialsDashboard';
import CarrierFinancialDetails from '../components/Financials/CarrierFinancialDetails';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';

interface Props {
  freights: Freight[];
  onManageFinancials: (freight: Freight) => void; 
}

const FreightFinancials: React.FC<Props> = ({ freights }) => {
  const queryClient = useQueryClient();
  const [selectedCarrierName, setSelectedCarrierName] = useState<string | null>(null);

  // Invalida cache do TanStack Query para recarregar dados frescos
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FREIGHTS });
  }, [queryClient]);

  // Renderização Condicional: Dashboard ou Detalhes
  if (selectedCarrierName) {
    return (
      <CarrierFinancialDetails 
        carrierName={selectedCarrierName}
        allFreights={freights}
        onBack={() => { setSelectedCarrierName(null); handleRefresh(); }}
        onRefresh={handleRefresh}
      />
    );
  }

  return (
    <FreightFinancialsDashboard 
      freights={freights} 
      onSelectCarrier={setSelectedCarrierName} 
    />
  );
};

export default FreightFinancials;
