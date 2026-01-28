export interface ShareholderTransaction {
  id: string;
  date: string;
  type: 'credit' | 'debit'; // Credit = Pro Labore, Debit = Withdrawal
  value: number;
  description: string;
  accountId?: string; // If debit, which bank account paid it
}

export interface ShareholderRecurrence {
  active: boolean;
  amount: number;
  day: number; // Geralmente 1 ou 5
  lastGeneratedMonth?: string; // Formato YYYY-MM para controle
}

export interface Shareholder {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  // Financial Extension
  financial: {
    proLaboreValue: number;
    currentBalance: number;
    lastProLaboreDate?: string;
    recurrence?: ShareholderRecurrence;
    history: ShareholderTransaction[];
  };
}
