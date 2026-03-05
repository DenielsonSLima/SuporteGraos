// modules/Partners/hooks/useCnpjLookup.ts
// ============================================================================
// Hook para consulta de CNPJ na ReceitaWS (SKILL §1.2: componentes não fazem API)
// Extrai a chamada externa que estava diretamente no PartnerForm.tsx
// ============================================================================

import { useState, useCallback } from 'react';

export interface CnpjData {
  nome: string;
  fantasia: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  status?: string;
  message?: string;
}

/**
 * Hook dedicado para consulta de CNPJ via ReceitaWS (JSONP).
 * Substitui a função `fetchCnpjData` que estava inline no componente.
 */
export function useCnpjLookup() {
  const [isSearching, setIsSearching] = useState(false);

  const fetchCnpjData = useCallback((cnpj: string): Promise<CnpjData> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const callbackName = 'receitaws_callback_' + Math.round(100000 * Math.random());

      (window as any)[callbackName] = (data: CnpjData) => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };

      script.src = `https://www.receitaws.com.br/v1/cnpj/${cnpj}?callback=${callbackName}`;
      script.onerror = () => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        reject(new Error('Erro ao consultar API'));
      };

      document.body.appendChild(script);
    });
  }, []);

  const lookup = useCallback(async (document: string): Promise<CnpjData | null> => {
    const cnpjLimpo = document.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) return null;

    setIsSearching(true);
    try {
      const data = await fetchCnpjData(cnpjLimpo);
      if (data.status === 'ERROR') {
        throw new Error(data.message || 'Erro na consulta CNPJ');
      }
      return data;
    } finally {
      setIsSearching(false);
    }
  }, [fetchCnpjData]);

  return { lookup, isSearching };
}
