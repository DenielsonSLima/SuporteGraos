
import React, { useState, useEffect } from 'react';
import { Building2, Upload, X, Save, MapPin, Phone, Globe, Search, Loader2 } from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { settingsService } from '../../../services/settingsService';
import { useToast } from '../../../contexts/ToastContext';

interface Props {
  onBack: () => void;
}

const CompanySettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Initial State from Service
  const [formData, setFormData] = useState(() => {
    const data = settingsService.getCompanyData();
    return data;
  });

  // Inicializar dados apenas uma vez ao montar
  useEffect(() => {
    const currentData = settingsService.getCompanyData();
    setFormData(currentData);
    setLogoPreview(currentData.logoUrl);
    setIsDirty(false);
  }, []);

  // Listener para atualizações externas (realtime), mas não sobrescreve mudanças locais
  useEffect(() => {
    const unsubscribe = settingsService.onCompanyChange(nextCompany => {
      // Só atualiza se não houver alterações pendentes
      if (!isDirty) {
        setFormData(nextCompany);
        setLogoPreview(nextCompany.logoUrl);
      }
    });

    return () => unsubscribe();
  }, [isDirty]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        setFormData(prev => ({ ...prev, logoUrl: result }));
        setIsDirty(true);
        addToast('info', 'Imagem Carregada', 'Não esqueça de salvar as alterações no final.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logoUrl: null }));
    setIsDirty(true);
  };

  // Helper function to perform JSONP request to ReceitaWS (bypasses CORS)
  const fetchCnpjData = (cnpj: string) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const callbackName = 'receitaws_callback_' + Math.round(100000 * Math.random());
      
      // Define global callback
      (window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };

      script.src = `https://www.receitaws.com.br/v1/cnpj/${cnpj}?callback=${callbackName}`;
      script.onerror = () => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        reject(new Error('Falha na conexão com a ReceitaWS'));
      };

      document.body.appendChild(script);
    });
  };

  const handleConsultarCnpj = async () => {
    const cnpjLimpo = formData.cnpj.replace(/\D/g, '');

    if (cnpjLimpo.length !== 14) {
      addToast('warning', 'CNPJ Inválido', 'Digite apenas os 14 números do CNPJ.');
      return;
    }

    setIsSearchingCnpj(true);

    try {
      const data: any = await fetchCnpjData(cnpjLimpo);

      if (data.status === 'ERROR') {
        addToast('error', 'Erro na Receita', data.message);
        return;
      }

      // Map API response to form state
      setFormData(prev => ({
        ...prev,
        razaoSocial: data.nome || prev.razaoSocial,
        nomeFantasia: data.fantasia || data.nome || prev.nomeFantasia,
        cep: data.cep ? data.cep.replace('.', '') : prev.cep,
        endereco: data.logradouro || prev.endereco,
        numero: data.numero || prev.numero,
        bairro: data.bairro || prev.bairro,
        cidade: data.municipio || prev.cidade,
        uf: data.uf || prev.uf,
        telefone: data.telefone ? data.telefone.split('/')[0].trim() : prev.telefone,
        email: data.email || prev.email,
      }));
      
      addToast('success', 'Dados Encontrados', 'Formulário preenchido com dados da Receita.');

    } catch (error) {
      console.error(error);
      addToast('error', 'Erro de Conexão', 'Não foi possível consultar o CNPJ.');
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Save to Service
    try {
      await settingsService.updateCompanyData(formData);
      setIsDirty(false); // Limpa o estado de alterações pendentes
      addToast('success', 'Dados Salvos', 'As informações da empresa foram atualizadas e sincronizadas com o banco de dados.');
    } catch (err: any) {
      const errorMessage = err?.message || 'Ocorreu um erro interno.';
      addToast('error', 'Erro ao Salvar', errorMessage);
      console.error('Erro ao salvar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SettingsSubPage
      title="Empresa"
      description="Gerencie os dados da sua organização. Estas informações serão utilizadas no cabeçalho de relatórios e PDFs."
      icon={Building2}
      color="bg-blue-500"
      onBack={onBack}
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Left Column: Logo & Branding */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Logomarca da Empresa
            </label>
            <p className="mb-4 text-xs text-slate-500">
              Esta imagem aparecerá no canto superior esquerdo de todos os documentos gerados.
            </p>

            <div className="relative flex flex-col items-center justify-center">
              {logoPreview ? (
                <div className="relative mb-4 h-48 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <img 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    className="h-full w-full object-contain p-2" 
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute right-2 top-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200 transition-colors"
                    title="Remover logo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white transition-colors hover:bg-slate-50">
                  <div className="flex flex-col items-center justify-center pb-6 pt-5">
                    <Upload className="mb-3 h-10 w-10 text-slate-400" />
                    <p className="mb-2 text-sm text-slate-500">
                      <span className="font-semibold text-primary-600">Clique para enviar</span>
                    </p>
                    <p className="text-xs text-slate-500">PNG, JPG ou SVG (Max. 2MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <p className="font-semibold">Dica de Visualização</p>
                <p className="mt-1 opacity-90">
                  Utilize o botão de busca ao lado do CNPJ para preencher automaticamente os dados da empresa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form Data */}
        <div className="space-y-8 lg:col-span-2">
          
          {/* Section: General Info */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-lg font-semibold text-slate-800">
              <Building2 size={20} className="text-slate-400" />
              Dados Cadastrais
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">CNPJ</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                    placeholder="00.000.000/0001-00" 
                  />
                  <button
                    type="button"
                    onClick={handleConsultarCnpj}
                    disabled={isSearchingCnpj}
                    className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    title="Consultar na Receita Federal"
                  >
                    {isSearchingCnpj ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Search size={18} />
                    )}
                    <span className="hidden sm:inline">Consultar</span>
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Digite apenas os números para consultar.</p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Razão Social</label>
                <input 
                  type="text" 
                  name="razaoSocial"
                  value={formData.razaoSocial}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                  placeholder="Ex: Agro Grãos LTDA" 
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nome Fantasia</label>
                <input 
                  type="text" 
                  name="nomeFantasia"
                  value={formData.nomeFantasia}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                  placeholder="Ex: Suporte Grãos" 
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Insc. Estadual</label>
                <input 
                  type="text" 
                  name="ie"
                  value={formData.ie}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                  placeholder="Isento ou Número" 
                />
              </div>
            </div>
          </div>

          {/* Section: Address */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-lg font-semibold text-slate-800">
              <MapPin size={20} className="text-slate-400" />
              Endereço e Localização
            </h3>
            <div className="grid gap-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">CEP</label>
                <input 
                  type="text" 
                  name="cep"
                  value={formData.cep}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                  placeholder="00000-000" 
                />
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">Endereço (Rua/Av)</label>
                <input 
                  type="text" 
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Número</label>
                <input 
                  type="text" 
                  name="numero"
                  value={formData.numero}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Bairro</label>
                <input 
                  type="text" 
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm" 
                />
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">Cidade</label>
                <input 
                  type="text" 
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">UF</label>
                <input 
                  type="text" 
                  name="uf"
                  maxLength={2}
                  value={formData.uf}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm uppercase" 
                  placeholder="UF"
                />
              </div>
            </div>
          </div>

          {/* Section: Contact */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-lg font-semibold text-slate-800">
              <Phone size={20} className="text-slate-400" />
              Contato
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
               <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">E-mail Financeiro</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                  placeholder="contato@empresa.com"
                />
              </div>
               <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Globe size={16} className="text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    name="site"
                    value={formData.site}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border border-slate-300 bg-white pl-10 p-2.5 text-slate-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" 
                    placeholder="www.suaempresa.com.br"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-6">
            {isDirty && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-medium">Alterações não salvas</span>
              </div>
            )}
            {!isDirty && <div />}
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-70"
            >
              {isLoading ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Dados da Empresa
                </>
              )}
            </button>
          </div>

        </div>
      </form>
    </SettingsSubPage>
  );
};

export default CompanySettings;
