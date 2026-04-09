import { Persistence } from '../persistence';
import type { Shareholder, ShareholderTransaction } from './types';
import type { Shareholder as ShareholderDB, ShareholderTransaction as ShareholderTransactionDB } from '../../types/database';

export const db = new Persistence<Shareholder>('shareholders', [], { useStorage: false });

export function mapRow(row: ShareholderDB, transactions: ShareholderTransaction[] = []): Shareholder {
  return {
    id: row.id,
    name: row.name ?? '',
    cpf: row.cpf ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: {
      street: row.address_street ?? '',
      number: row.address_number ?? '',
      neighborhood: row.address_neighborhood ?? '',
      city: row.address_city ?? '',
      state: row.address_state ?? '',
      zip: row.address_zip ?? '',
    },
    financial: {
      proLaboreValue: Number(row.pro_labore_value) || 0,
      currentBalance: Number(row.current_balance) || 0,
      lastProLaboreDate: row.last_pro_labore_date ?? undefined,
      recurrence: {
        active: row.recurrence_active ?? false,
        amount: Number(row.recurrence_amount) || 0,
        day: row.recurrence_day ?? 1,
        lastGeneratedMonth: row.recurrence_last_generated_month ?? undefined,
      },
      history: transactions,
    },
  };
}

export function mapTransactionRow(row: ShareholderTransactionDB): ShareholderTransaction {
  return {
    id: row.id,
    date: row.date,
    type: row.type as 'credit' | 'debit',
    value: Number(row.value),
    description: row.description ?? '',
    accountId: row.account_name ?? undefined,
  };
}
