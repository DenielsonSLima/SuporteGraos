
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Truck, 
  Wallet, 
  BadgeDollarSign, 
  BarChart2, 
  FileText,
  Settings,
  Tractor,
  HelpCircle
} from 'lucide-react';
import { MenuItem, ModuleId } from './types';

export const APP_NAME = "Suporte Grãos ERP";

export const MENU_ITEMS: MenuItem[] = [
  { 
    id: ModuleId.HOME, 
    label: "Início", 
    icon: LayoutDashboard,
    description: "Visão geral e KPIs" 
  },
  { 
    id: ModuleId.PARTNERS, 
    label: "Parceiros", 
    icon: Users,
    description: "Gestão de fornecedores e clientes"
  },
  { 
    id: ModuleId.PURCHASE_ORDER, 
    label: "Ped. Compra", 
    icon: ShoppingCart,
    description: "Entrada de grãos e insumos"
  },
  { 
    id: ModuleId.SALES_ORDER, 
    label: "Ped. Venda", 
    icon: TrendingUp,
    description: "Saída e comercialização"
  },
  { 
    id: ModuleId.LOGISTICS, 
    label: "Logística", 
    icon: Truck,
    description: "Fretes e movimentação"
  },
  { 
    id: ModuleId.ASSETS, 
    label: "Patrimônio", 
    icon: Tractor, 
    description: "Bens, Veículos e Imóveis" 
  },
  { 
    id: ModuleId.CASHIER, 
    label: "Caixa", 
    icon: Wallet,
    description: "Movimentação diária"
  },
  { 
    id: ModuleId.FINANCIAL, 
    label: "Financeiro", 
    icon: BadgeDollarSign,
    description: "Contas a pagar e receber"
  },
  { 
    id: ModuleId.PERFORMANCE, 
    label: "Performance", 
    icon: BarChart2,
    description: "Indicadores de desempenho"
  },
  { 
    id: ModuleId.REPORTS, 
    label: "Relatórios", 
    icon: FileText,
    description: "Relatórios gerenciais e fiscais"
  },
  { 
    id: ModuleId.SETTINGS, 
    label: "Configurações", 
    icon: Settings,
    description: "Parâmetros do sistema"
  },
];

// Estrutura de Sub-permissões
export const SUBMODULES: Record<string, { id: string; label: string }[]> = {
  [ModuleId.FINANCIAL]: [
    { id: 'financial.payables', label: 'Contas a Pagar' },
    { id: 'financial.receivables', label: 'Contas a Receber' },
    { id: 'financial.loans', label: 'Empréstimos' },
    { id: 'financial.transfers', label: 'Transferências' },
    { id: 'financial.advances', label: 'Adiantamentos' },
    { id: 'financial.shareholders', label: 'Conta Sócios' }
  ],
  [ModuleId.PARTNERS]: [
    { id: 'partners.manage', label: 'Gerenciar Cadastros' },
    { id: 'partners.fleet', label: 'Gestão de Frota' }
  ],
  [ModuleId.PURCHASE_ORDER]: [
    { id: 'purchase.create', label: 'Criar Pedidos' },
    { id: 'purchase.approve', label: 'Aprovar/Finalizar' }
  ],
  [ModuleId.SALES_ORDER]: [
    { id: 'sales.create', label: 'Criar Vendas' },
    { id: 'sales.approve', label: 'Aprovar/Finalizar' }
  ],
  [ModuleId.LOGISTICS]: [
    { id: 'logistics.manage', label: 'Gestão de Cargas' },
    { id: 'logistics.financial', label: 'Financeiro de Fretes' }
  ],
  [ModuleId.SETTINGS]: [
    { id: 'settings.users', label: 'Gestão de Usuários' },
    { id: 'settings.company', label: 'Dados da Empresa' },
    { id: 'settings.audit', label: 'Logs e Auditoria' }
  ]
};

export const PARTNER_CATEGORY_IDS = {
  RURAL_PRODUCER: '1',
  INDUSTRY: '2',
  CARRIER: '3',
  BROKER: '4',
  CUSTOMER: '5',
  SUPPLIER: '7',
  OTHERS: '6',
};

export const DEFAULT_PARTNER_CATEGORIES = [
  { id: PARTNER_CATEGORY_IDS.RURAL_PRODUCER, label: 'Produtor Rural', name: 'Produtor Rural', description: 'Pessoa física ou jurídica que explora atividade agrícola.', isSystem: true },
  { id: PARTNER_CATEGORY_IDS.INDUSTRY, label: 'Indústria', name: 'Indústria', description: 'Empresas de transformação e beneficiamento.', isSystem: true },
  { id: PARTNER_CATEGORY_IDS.CARRIER, label: 'Transportadora', name: 'Transportadora', description: 'Responsável pela logística e frete de cargas.', isSystem: true },
  { id: PARTNER_CATEGORY_IDS.BROKER, label: 'Corretor', name: 'Corretor', description: 'Intermediário nas negociações de compra e venda.', isSystem: true },
  { id: PARTNER_CATEGORY_IDS.CUSTOMER, label: 'Cliente', name: 'Cliente', description: 'Comprador final ou destinatário dos grãos.', isSystem: true },
  { id: PARTNER_CATEGORY_IDS.SUPPLIER, label: 'Fornecedor', name: 'Fornecedor', description: 'Fornecedores de insumos, equipamentos e serviços gerais.', isSystem: true },
  { id: PARTNER_CATEGORY_IDS.OTHERS, label: 'Outros', name: 'Outros', description: 'Parceiros diversos não categorizados acima.', isSystem: true },
];
