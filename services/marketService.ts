
export interface MarketItem {
  label: string;
  value: string;
  variation: number;
  unit?: string;
}

export const marketService = {
  getMarketData: async (): Promise<MarketItem[]> => {
    // Valores base médios (referência safra atual)
    const baseCommodities = [
      { label: 'Soja (Paranaguá)', base: 132.50 },
      { label: 'Milho (MT)', base: 58.90 },
      { label: 'Arroz (RS)', base: 118.00 },
      { label: 'Feijão (Cores)', base: 280.00 },
      { label: 'Boi Gordo (@)', base: 235.00 },
      { label: 'Trigo (PR)', base: 1240.00 },
      { label: 'Diesel S10', base: 6.05 },
      { label: 'Gasolina Comum', base: 5.79 },
      { label: 'Petróleo (Brent)', base: 415.40 },
    ];

    // Simula uma variação de mercado para as commodities (entre -1.5% e +1.5%)
    const commodities: MarketItem[] = baseCommodities.map(item => {
      const randomVar = (Math.random() * 3 - 1.5);
      const newValue = item.base * (1 + randomVar / 100);
      return {
        label: item.label,
        value: newValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        variation: randomVar
      };
    });

    try {
      // BUSCA DÓLAR REAL (API Externa sem autenticação necessária)
      const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      if (response.ok) {
        const data = await response.json();
        const usd = data.USDBRL;
        const dollarItem: MarketItem = { 
          label: 'Dólar Comercial', 
          value: parseFloat(usd.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
          variation: parseFloat(usd.pctChange) 
        };
        // O Dólar real é sempre o primeiro da lista
        return [dollarItem, ...commodities];
      }
    } catch (error) {
    }

    // Fallback completo se a rede falhar
    return [
      { label: 'Dólar (Estimado)', value: '5,78', variation: 0.15 },
      ...commodities
    ];
  }
};
