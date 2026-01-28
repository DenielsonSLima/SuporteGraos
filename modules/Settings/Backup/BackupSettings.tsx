
import React, { useState, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  UploadCloud,
  CheckSquare,
  Square
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import JSZip from 'jszip';
import { useToast } from '../../../contexts/ToastContext';

// Import Services for Data Access
import { partnerService } from '../../../services/partnerService';
import { fleetService } from '../../../services/fleetService';
import { purchaseService } from '../../../services/purchaseService';
import { salesService } from '../../../services/salesService';
import { loadingService } from '../../../services/loadingService';
import { financialActionService } from '../../../services/financialActionService';
import { financialService } from '../../../services/financialService';
import { shareholderService } from '../../../services/shareholderService';
import { settingsService } from '../../../services/settingsService';
import { logService } from '../../../services/logService';
import { authService } from '../../../services/authService';
import { assetService } from '../../../services/assetService';
import { loanService } from '../../../services/loanService';
import { classificationService } from '../../../services/classificationService';
import { advanceService } from '../../Financial/Advances/services/advanceService';

const AVAILABLE_MODULES = [
  { id: 'partners', label: 'Parceiros e Contatos', fileName: 'partners.json', description: 'Clientes, Fornecedores e Transportadoras' },
  { id: 'fleet', label: 'Frota e Motoristas', fileName: 'fleet.json', description: 'Motoristas e Veículos vinculados' },
  { id: 'purchases', label: 'Pedidos de Compra', fileName: 'purchases.json', description: 'Histórico de compras de grãos' },
  { id: 'sales', label: 'Pedidos de Venda', fileName: 'sales.json', description: 'Histórico de vendas e contratos' },
  { id: 'logistics', label: 'Logística e Fretes', fileName: 'loadings.json', description: 'Carregamentos e controle de frota' },
  { id: 'advances', label: 'Adiantamentos Manuais', fileName: 'advances.json', description: 'Antecipações fora de contratos' },
  { id: 'financial_admin', label: 'Financeiro e Histórico', fileName: 'financial_actions.json', description: 'Lançamentos, despesas e transferências' },
  { id: 'shareholders', label: 'Sócios e Conta Corrente', fileName: 'shareholders.json', description: 'Movimentações e cadastros de sócios' },
  { id: 'loans', label: 'Empréstimos', fileName: 'loans.json', description: 'Contratos tomados e concedidos' },
  { id: 'assets', label: 'Patrimônio (Bens)', fileName: 'assets.json', description: 'Veículos, Imóveis e Equipamentos' },
  { id: 'logs', label: 'Logs do Sistema', fileName: 'system_logs.json', description: 'Auditoria de eventos, acessos e alterações' },
  { id: 'settings', label: 'Configurações Completas', fileName: 'settings.json', description: 'Empresa, Bancos, Categorias e Tipos' },
];

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

interface Props {
  onBack: () => void;
}

const BackupSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBackupModules, setSelectedBackupModules] = useState<string[]>(AVAILABLE_MODULES.map(m => m.id));
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [restoreStage, setRestoreStage] = useState<'upload' | 'select' | 'processing' | 'finished'>('upload');
  const [selectedRestoreModules, setSelectedRestoreModules] = useState<string[]>([]);
  const [availableRestoreModules, setAvailableRestoreModules] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleBackupModule = (id: string) => {
    setSelectedBackupModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const toggleRestoreModule = (id: string) => {
    setSelectedRestoreModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleGenerateBackup = async () => {
    if (selectedBackupModules.length === 0) {
      addToast('warning', 'Nenhum Módulo', 'Selecione pelo menos um módulo.');
      return;
    }

    setIsProcessing(true);

    try {
      const zip = new JSZip();
      
      for (const modId of selectedBackupModules) {
        const moduleDef = AVAILABLE_MODULES.find(m => m.id === modId);
        if (!moduleDef) continue;

        let data = null;
        if (modId === 'partners') data = partnerService.getAll();
        if (modId === 'fleet') data = { drivers: fleetService.getAllDrivers(), vehicles: fleetService.getAllVehicles() };
        if (modId === 'purchases') data = purchaseService.getAll();
        if (modId === 'sales') data = salesService.getAll();
        if (modId === 'logistics') data = loadingService.getAll();
        if (modId === 'advances') data = advanceService.getManualTransactions();
        if (modId === 'shareholders') data = shareholderService.getAll();
        if (modId === 'loans') data = loanService.getAll();
        if (modId === 'assets') data = assetService.getAll();
        if (modId === 'logs') data = logService.getAll();
        if (modId === 'financial_admin') data = { expenses: financialActionService.getStandaloneRecords(), transfers: financialActionService.getTransfers() };
        
        if (modId === 'settings') {
          data = {
            company: settingsService.getCompanyData(),
            watermark: settingsService.getWatermark(),
            bankAccounts: financialService.getBankAccounts(),
            initialBalances: financialService.getInitialBalances(),
            loginScreen: settingsService.getLoginSettings(),
            partnerTypes: classificationService.getPartnerTypes(),
            productTypes: classificationService.getProductTypes(),
            expenseCategories: financialService.getExpenseCategories()
          };
        }

        if (data) zip.file(moduleDef.fileName, JSON.stringify(data, null, 2));
        await new Promise(r => setTimeout(r, 50));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_erp_graos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      const { userId, userName } = getLogInfo();
      logService.addLog({ userId, userName, action: 'export', module: 'Configurações', description: `Gerou backup (${selectedBackupModules.length} módulos).` });

      setIsProcessing(false);
      addToast('success', 'Backup Gerado');
    } catch (error) {
      console.error(error);
      addToast('error', 'Erro no Backup');
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.zip')) return;

    setUploadedFile(file);
    setRestoreStage('processing');
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const foundModules: string[] = [];
      AVAILABLE_MODULES.forEach(mod => { if (loadedZip.file(mod.fileName)) foundModules.push(mod.id); });
      setAvailableRestoreModules(foundModules);
      setSelectedRestoreModules(foundModules);
      setRestoreStage('select');
    } catch (err) {
      setRestoreStage('upload');
      addToast('error', 'Arquivo Corrompido');
    }
  };

  const handleExecuteRestore = async () => {
    if (!uploadedFile) return;
    setRestoreStage('processing');
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(uploadedFile);
      
      for (const modId of selectedRestoreModules) {
        const modDef = AVAILABLE_MODULES.find(m => m.id === modId);
        const zipFile = loadedZip.file(modDef?.fileName || '');
        if (zipFile) {
          const content = await zipFile.async("string");
          const parsedData = JSON.parse(content);
          
          if (modId === 'partners') partnerService.importData(parsedData);
          if (modId === 'fleet') fleetService.importData(parsedData.drivers, parsedData.vehicles);
          if (modId === 'purchases') purchaseService.importData(parsedData);
          if (modId === 'sales') salesService.importData(parsedData);
          if (modId === 'logistics') loadingService.importData(parsedData);
          if (modId === 'advances') advanceService.importData(parsedData);
          if (modId === 'shareholders') shareholderService.importData(parsedData);
          if (modId === 'loans') loanService.importData(parsedData);
          if (modId === 'assets') assetService.importData(parsedData);
          if (modId === 'logs') logService.importData(parsedData);
          if (modId === 'financial_admin') financialActionService.importData(parsedData.expenses || [], parsedData.transfers || []);
          
          if (modId === 'settings') {
            if(parsedData.company) await settingsService.updateCompanyData(parsedData.company);
            if(parsedData.watermark) await settingsService.updateWatermark(parsedData.watermark);
            if(parsedData.loginScreen) await settingsService.updateLoginSettings(parsedData.loginScreen);
            
            if(parsedData.partnerTypes || parsedData.productTypes) {
                classificationService.importData(parsedData.partnerTypes, parsedData.productTypes);
            }

            financialService.importData(
                parsedData.bankAccounts, 
                parsedData.initialBalances,
                parsedData.expenseCategories
            );
          }
        }
      }
      setRestoreStage('finished');
      addToast('success', 'Dados Restaurados');
    } catch (err) {
      setRestoreStage('upload');
      addToast('error', 'Erro na Restauração', 'Verifique a integridade do arquivo.');
    }
  };

  return (
    <SettingsSubPage title="Backup e Restauração" description="Gestão de segurança de dados e cópias de segurança." icon={Database} color="bg-teal-500" onBack={onBack}>
      <div className="flex border-b border-slate-200 mb-6">
        <button onClick={() => setActiveTab('backup')} className={`flex-1 pb-4 text-sm font-bold border-b-4 transition-all ${activeTab === 'backup' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-400'}`}>
             <div className="flex justify-center items-center gap-2"><Download size={18}/> Exportar Dados (Backup)</div>
        </button>
        <button onClick={() => setActiveTab('restore')} className={`flex-1 pb-4 text-sm font-bold border-b-4 transition-all ${activeTab === 'restore' ? 'border-teal-500 text-teal-700' : 'border-transparent text-slate-400'}`}>
             <div className="flex justify-center items-center gap-2"><UploadCloud size={18}/> Importar Dados (Restore)</div>
        </button>
      </div>

      {activeTab === 'backup' ? (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          {isProcessing ? <div className="py-20 text-center text-teal-600"><Loader2 className="animate-spin mx-auto mb-4" size={40} /><p className="font-bold">Compactando dados...</p></div> : (
            <>
              <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-teal-800 text-sm">
                 <p>Selecione os módulos que deseja incluir no arquivo de backup. O arquivo gerado será um <strong>.ZIP</strong> contendo os dados em formato JSON.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_MODULES.map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => toggleBackupModule(m.id)} 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${selectedBackupModules.includes(m.id) ? 'bg-teal-50 border-teal-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className={selectedBackupModules.includes(m.id) ? 'text-teal-600' : 'text-slate-300'}>
                        {selectedBackupModules.includes(m.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                    <div>
                        <span className="block text-sm font-black text-slate-800 uppercase">{m.label}</span>
                        <span className="text-xs text-slate-500 leading-tight">{m.description}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleGenerateBackup} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                  Baixar Backup Completo
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4">
          {restoreStage === 'upload' && (
            <div className="border-2 border-dashed border-slate-300 p-12 text-center rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition-all group" onClick={() => fileInputRef.current?.click()}>
              <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                 <Upload className="text-teal-600" size={40} />
              </div>
              <h3 className="font-bold text-lg text-slate-700">Clique para carregar o arquivo .ZIP</h3>
              <p className="text-sm text-slate-400 mt-1">Selecione o arquivo de backup gerado anteriormente pelo sistema.</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".zip" onChange={handleFileUpload} />
            </div>
          )}
          
          {restoreStage === 'select' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-slate-700 uppercase">Módulos Encontrados no Arquivo:</p>
                  <button onClick={() => setRestoreStage('upload')} className="text-xs font-bold text-teal-600 hover:underline">Trocar Arquivo</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableRestoreModules.map(mid => {
                  const isSelected = selectedRestoreModules.includes(mid);
                  return (
                    <div 
                        key={mid} 
                        onClick={() => toggleRestoreModule(mid)}
                        className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${isSelected ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200 opacity-60'}`}
                    >
                        <div className={isSelected ? 'text-emerald-600' : 'text-slate-300'}>
                             {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <span className="text-sm font-bold uppercase text-slate-700">{AVAILABLE_MODULES.find(m => m.id === mid)?.label || mid}</span>
                    </div>
                  );
                })}
              </div>
              <button 
                onClick={handleExecuteRestore} 
                disabled={selectedRestoreModules.length === 0}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 Confirmar Restauração
              </button>
            </div>
          )}
          
          {restoreStage === 'processing' && (
             <div className="py-24 text-center">
                <Loader2 className="animate-spin mx-auto mb-6 text-teal-600" size={48} /> 
                <h3 className="text-xl font-bold text-slate-800">Processando dados...</h3>
                <p className="text-slate-500">Por favor, não feche esta janela.</p>
             </div>
          )}
          
          {restoreStage === 'finished' && (
             <div className="py-20 text-center bg-emerald-50 rounded-2xl border border-emerald-100">
                <CheckCircle2 className="text-emerald-500 mx-auto mb-4" size={64} />
                <h3 className="text-2xl font-black text-emerald-800 uppercase">Restauração Concluída!</h3>
                <p className="text-emerald-600 mt-2 font-medium">Os dados foram atualizados com sucesso.</p>
                <button onClick={() => window.location.reload()} className="mt-8 bg-slate-900 hover:bg-slate-800 text-white px-10 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-105 active:scale-95">
                    Recarregar Sistema
                </button>
             </div>
          )}
        </div>
      )}
    </SettingsSubPage>
  );
};

export default BackupSettings;
