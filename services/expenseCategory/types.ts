import { LucideIcon } from 'lucide-react';

export interface ExpenseSubtype {
  id: string;
  name: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  type: 'fixed' | 'variable' | 'administrative' | 'custom';
  color: string;
  subtypes: ExpenseSubtype[];
  icon?: LucideIcon;
}

export const DEFAULT_CATEGORIES_DATA: Omit<ExpenseCategory, 'icon'>[] = [
  {
    id: '1',
    name: 'Despesas Fixas',
    type: 'fixed',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    subtypes: [
      { id: 'f1', name: 'Salários' },
      { id: 'f2', name: 'Aluguel' },
      { id: 'f3', name: 'Segurança' },
      { id: 'f4', name: 'Internet / Telefonia' }
    ]
  },
  {
    id: '2',
    name: 'Despesas Variáveis',
    type: 'variable',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    subtypes: [
      { id: 'v1', name: 'Comissões de Venda' },
      { id: 'v2', name: 'Fretes' },
      { id: 'v3', name: 'Manutenção de Veículos' },
      { id: 'v4', name: 'Combustível' },
      { id: 'v5', name: 'Corretagem' }
    ]
  },
  {
    id: '3',
    name: 'Despesas Administrativas',
    type: 'administrative',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    subtypes: [
      { id: 'a1', name: 'Sistemas / Software' },
      { id: 'a2', name: 'Material de Escritório' },
      { id: 'a3', name: 'Contabilidade' },
      { id: 'a4', name: 'Limpeza e Copa' }
    ]
  }
];
