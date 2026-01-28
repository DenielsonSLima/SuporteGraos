
import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Handshake, 
  Server, 
  Tags, 
  Coins, 
  Landmark, 
  ScrollText, 
  Receipt, 
  Database, 
  Map, 
  FileImage,
  ChevronRight,
  Search,
  Package,
  Layout
} from 'lucide-react';

// Import sub-modules
import CompanySettings from './Company/CompanySettings';
import UsersSettings from './Users/UsersSettings';
import ShareholdersSettings from './Shareholders/ShareholdersSettings';
import ApiSettings from './Api/ApiSettings';
import PartnerTypesSettings from './PartnerTypes/PartnerTypesSettings';
import InitialBalanceSettings from './InitialBalance/InitialBalanceSettings';
import BankAccountsSettings from './BankAccounts/BankAccountsSettings';
import LogsSettings from './Logs/LogsSettings';
import ExpenseTypesSettings from './ExpenseTypes/ExpenseTypesSettings';
import BackupSettings from './Backup/BackupSettings';
import LocationsSettings from './Locations/LocationsSettings';
import WatermarkSettings from './Watermark/WatermarkSettings';
import ProductTypesSettings from './ProductTypes/ProductTypesSettings';
import LoginScreenSettings from './LoginScreen/LoginScreenSettings';

const SETTINGS_MENU = [
  { 
    id: 'company', 
    title: 'Empresa', 
    description: 'Dados cadastrais, CNPJ, endereço e logomarca.', 
    icon: Building2,
    color: 'bg-blue-500',
    component: CompanySettings
  },
  { 
    id: 'login_screen', 
    title: 'Tela Inicial', 
    description: 'Imagens de fundo e rotação da tela de acesso.', 
    icon: Layout,
    color: 'bg-indigo-600',
    component: LoginScreenSettings
  },
  { 
    id: 'users', 
    title: 'Usuários', 
    description: 'Gerenciar acesso, senhas e permissões de colaboradores.', 
    icon: Users,
    color: 'bg-indigo-500',
    component: UsersSettings
  },
  { 
    id: 'shareholders', 
    title: 'Sócios', 
    description: 'Cadastro de sócios e estrutura societária.', 
    icon: Handshake,
    color: 'bg-emerald-500',
    component: ShareholdersSettings
  },
  { 
    id: 'product_types', 
    title: 'Tipos de Produtos', 
    description: 'Cadastro de produtos comercializados (Milho, Soja, etc).', 
    icon: Package,
    color: 'bg-yellow-500',
    component: ProductTypesSettings
  },
  { 
    id: 'api', 
    title: 'API e Status', 
    description: 'Chaves de API, webhooks e status de serviços.', 
    icon: Server,
    color: 'bg-slate-500',
    component: ApiSettings
  },
  { 
    id: 'partner_types', 
    title: 'Tipos de Parceiros', 
    description: 'Categorização de clientes, fornecedores e transportadoras.', 
    icon: Tags,
    color: 'bg-violet-500',
    component: PartnerTypesSettings
  },
  { 
    id: 'initial_balance', 
    title: 'Saldo Inicial', 
    description: 'Configuração de saldos de abertura e caixa.', 
    icon: Coins,
    color: 'bg-amber-500',
    component: InitialBalanceSettings
  },
  { 
    id: 'bank_accounts', 
    title: 'Contas Bancárias', 
    description: 'Cadastro de bancos, agências e contas correntes.', 
    icon: Landmark,
    color: 'bg-cyan-500',
    component: BankAccountsSettings
  },
  { 
    id: 'logs', 
    title: 'Logs e Eventos', 
    description: 'Auditoria de ações e histórico de alterações.', 
    icon: ScrollText,
    color: 'bg-orange-500',
    component: LogsSettings
  },
  { 
    id: 'expense_types', 
    title: 'Tipos de Despesas', 
    description: 'Plano de contas e categorias de custos.', 
    icon: Receipt,
    color: 'bg-rose-500',
    component: ExpenseTypesSettings
  },
  { 
    id: 'backup', 
    title: 'Backup e Restauração', 
    description: 'Cópias de segurança e recuperação de dados.', 
    icon: Database,
    color: 'bg-teal-500',
    component: BackupSettings
  },
  { 
    id: 'locations', 
    title: 'Cidades e UF', 
    description: 'Base de dados de municípios e estados.', 
    icon: Map,
    color: 'bg-lime-500',
    component: LocationsSettings
  },
  { 
    id: 'watermark', 
    title: 'Marca D\'água PDF', 
    description: 'Personalização visual para documentos impressos.', 
    icon: FileImage,
    color: 'bg-pink-500',
    component: WatermarkSettings
  },
];

const Settings = () => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const activeModule = SETTINGS_MENU.find(m => m.id === activeSectionId);

  if (activeModule) {
    const ActiveComponent = activeModule.component;
    return <ActiveComponent onBack={() => setActiveSectionId(null)} />;
  }

  const filteredModules = SETTINGS_MENU.filter(module => 
    module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>
          <p className="text-slate-500">Gerencie todos os parâmetros do sistema em um só lugar.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar configuração..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-64"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredModules.map((module) => (
          <button
            key={module.id}
            onClick={() => setActiveSectionId(module.id)}
            className="group relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary-200 hover:shadow-md"
          >
            <div className="flex w-full items-start justify-between">
              <div className={`rounded-lg p-3 text-white shadow-sm transition-transform group-hover:scale-110 ${module.color}`}>
                <module.icon size={24} />
              </div>
              <ChevronRight className="text-slate-300 transition-colors group-hover:text-primary-500" size={20} />
            </div>
            
            <div>
              <h3 className="mb-1 font-bold text-slate-800 group-hover:text-primary-700">
                {module.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2">
                {module.description}
              </p>
            </div>
          </button>
        ))}
        
        {filteredModules.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-500">
            Nenhuma configuração encontrada para o termo "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
