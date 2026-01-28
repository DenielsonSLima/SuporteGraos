
export type AdvanceType = 'given' | 'taken'; // Given = Concedido (Ativo), Taken = Recebido (Passivo)

export interface AdvanceTransaction {
  id: string;
  partnerId: string;
  partnerName: string;
  type: AdvanceType;
  date: string;
  value: number;
  description: string;
  status: 'active' | 'settled'; // Active counts towards balance
  accountId?: string; // ID da conta bancária
  accountName?: string; // Nome da conta para histórico
}

export interface PartnerAdvanceSummary {
  partnerId: string;
  partnerName: string;
  totalGiven: number; // Quanto adiantamos a ele
  totalTaken: number; // Quanto ele nos adiantou
  netBalance: number; // Positive = Ele nos deve (Crédito), Negative = Devemos a ele (Débito)
  lastTransactionDate: string;
}
