export const formatCurrency = (val: number): string => 
  new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(Math.abs(val) < 0.005 ? 0 : val);
