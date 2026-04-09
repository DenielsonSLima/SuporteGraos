import React from 'react';
import { Loading } from '../types';
import { FreightPaymentsCard } from './details/FreightPaymentsCard';

interface Props {
  loading: Loading;
  onUpdate: (updated: Loading) => void;
}

const LoadingFinancialTab: React.FC<Props> = ({ loading, onUpdate }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <FreightPaymentsCard 
        loading={loading}
        onUpdate={onUpdate}
      />
      
      {/* 
          DICA: Podemos adicionar aqui um card de 'Despesas de Viagem' 
          separado se o usuário solicitar no futuro, mantendo a modularidade.
      */}
    </div>
  );
};

export default LoadingFinancialTab;