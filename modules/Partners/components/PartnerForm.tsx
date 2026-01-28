
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Building2, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Save, 
  X,
  Loader2,
  Check,
  AlertTriangle,
  Tag
} from 'lucide-react';
import { Partner, PartnerCategory } from '../types';
import { useToast } from '../../../contexts/ToastContext';
import { partnerService } from '../../../services/partnerService';

interface Props {
  initialData?: Partner;
  categories: PartnerCategory[];
  onSave: (data: Omit<Partner, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const PartnerForm: React.FC<Props> = ({ initialData, categories, onSave, onCancel }) => {
  const { addToast } = useToast();
  const [type, setType] = useState<'PJ' | 'PF'>(initialData?.type || 'PJ');
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [documentNotInformed, setDocumentNotInformed] = useState(false);
  
  const [formData, setFormData] = useState({
    categories: initialData?.categories || [], 
    document: initialData?.document || '',
    name: initialData?.name || '',
    nickname: initialData?.nickname || '',
    tradeName: initialData?.tradeName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: {
      zip: initialData?.address?.zip || '',
      street: initialData?.address?.street || '',
      number: initialData?.address?.number || '',
      neighborhood: initialData?.address?.neighborhood || '',
      city: initialData?.address?.city || '',
      state: initialData?.address?.state || ''
    }
  });

  useEffect(() => {
    if (initialData) {
      if (!initialData.document || initialData.document === 'NÃO INFORMADO') {
        setDocumentNotInformed(true);
      }
    }
  }, [initialData]);

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => {
      const current = prev.categories;
      if (current.includes(categoryId)) {
        return { ...prev, categories: current.filter(id => id !== categoryId) };
      } else {
        return { ...prev, categories: [...current, categoryId] };
      }
    });
  };

  // Helper Masks
  const maskCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskCnpj = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const masked = type === 'PJ' ? maskCnpj(val) : maskCpf(val);
    setFormData({ ...formData, document: masked });
  };

  const handleDocumentOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setDocumentNotInformed(isChecked);
    if (isChecked) {
      setFormData(prev => ({ ...prev, document: '' }));
    }
  };

  const fetchCnpjData = (cnpj: string) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const callbackName = 'receitaws_callback_' + Math.round(100000 * Math.random());
      
      (window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };

      script.src = `https://www.receitaws.com.br/v1/cnpj/${cnpj}?callback=${callbackName}`;
      script.onerror = () => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        reject(new Error('Erro ao consultar API'));
      };

      document.body.appendChild(script);
    });
  };

  const handleConsultarCnpj = async () => {
    const cnpjLimpo = formData.document.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      addToast('warning', 'CNPJ Inválido', 'Digite um CNPJ válido com 14 números.');
      return;
    }

    setIsSearchingCnpj(true);
    try {
      const data: any = await fetchCnpjData(cnpjLimpo);
      if (data.status === 'ERROR') {
        addToast('error', 'Erro na Consulta', data.message);
      } else {
        setFormData(prev => ({
          ...prev,
          name: data.nome,
          tradeName: data.fantasia,
          nickname: data.fantasia || data.nome, // Sugere o nome fantasia como apelido inicial
          email: data.email,
          phone: data.telefone,
          address: {
            ...prev.address,
            street: data.logradouro,
            number: data.numero,
            neighborhood: data.bairro,
            city: data.municipio,
            state: data.uf,
            zip: data.cep.replace('.', '')
          }
        }));
        addToast('success', 'Dados encontrados', 'Os campos foram preenchidos automaticamente.');
      }
    } catch (err) {
      addToast('error', 'Erro de Conexão', 'Falha na comunicação com a ReceitaWS.');
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.categories.length === 0) {
      addToast('warning', 'Categoria obrigatória', 'Selecione pelo menos uma categoria para o parceiro.');
      return;
    }

    let finalDocument = formData.document;

    // Lógica de Validação de Documento
    if (documentNotInformed) {
        finalDocument = 'NÃO INFORMADO';
    } else {
        const cleanDoc = formData.document.replace(/\D/g, '');
        
        // 1. Validação de Tamanho
        if (type === 'PF' && cleanDoc.length !== 11) {
            addToast('error', 'CPF Inválido', 'O CPF deve conter 11 dígitos.');
            return;
        }
        if (type === 'PJ' && cleanDoc.length !== 14) {
            addToast('error', 'CNPJ Inválido', 'O CNPJ deve conter 14 dígitos.');
            return;
        }

        // 2. Validação de Duplicidade (Trava)
        const allPartners = partnerService.getAll();
        const duplicate = allPartners.find(p => {
            // Ignora o próprio registro se estiver editando
            if (initialData && p.id === initialData.id) return false;
            
            // Compara apenas números
            const pDocClean = p.document.replace(/\D/g, '');
            return pDocClean === cleanDoc && pDocClean.length > 0;
        });

        if (duplicate) {
            addToast('error', 'Documento Duplicado', `O documento informado já pertence ao parceiro: ${duplicate.name}`);
            return;
        }
    }

    onSave({ ...formData, document: finalDocument, type });
    addToast('success', 'Parceiro Salvo', `${formData.name} foi salvo com sucesso.`);
  };

  const updateAddress = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const addressInputClass = 'block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white shadow-sm animate-in slide-in-from-bottom-4">
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex justify-between items-center rounded-t-xl">
        <h2 className="text-lg font-bold text-slate-800">
          {initialData ? 'Editar Parceiro' : 'Novo Parceiro'}
        </h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => { setType('PJ'); if(!documentNotInformed) setFormData({...formData, document: ''}); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${
              type === 'PJ' 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Building2 size={20} />
            Pessoa Jurídica
          </button>
          <button
            type="button"
            onClick={() => { setType('PF'); if(!documentNotInformed) setFormData({...formData, document: ''}); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all ${
              type === 'PF' 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User size={20} />
            Pessoa Física
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          
          <div className="md:col-span-2">
            <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-slate-700">
                {type === 'PJ' ? 'CNPJ' : 'CPF'}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                        checked={documentNotInformed}
                        onChange={handleDocumentOptionChange}
                    />
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Não informado</span>
                </label>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={documentNotInformed ? 'NÃO INFORMADO' : formData.document}
                onChange={handleDocumentChange}
                maxLength={type === 'PJ' ? 18 : 14}
                disabled={documentNotInformed}
                className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-slate-100 disabled:text-slate-500 font-bold"
                placeholder={type === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
              />
              {type === 'PJ' && !documentNotInformed && (
                <button
                  type="button"
                  onClick={handleConsultarCnpj}
                  disabled={isSearchingCnpj}
                  className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  {isSearchingCnpj ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
                  Consultar
                </button>
              )}
            </div>
            {!documentNotInformed && (
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    O sistema bloqueará cadastros com documentos duplicados.
                </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Categorias (Selecione uma ou mais)</label>
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
              {categories.map(cat => {
                const isSelected = formData.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`
                      flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all border
                      ${isSelected 
                        ? 'bg-primary-100 border-primary-500 text-primary-800' 
                        : 'bg-white border-slate-300 text-slate-600 hover:border-primary-300 hover:bg-white'}
                    `}
                  >
                    {isSelected && <Check size={14} />}
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {type === 'PJ' ? 'Razão Social' : 'Nome Completo'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Apelido (Nome de Guerra) <span className="text-slate-400 font-normal text-xs">- Opcional</span>
            </label>
            <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    value={formData.nickname}
                    onChange={e => setFormData({...formData, nickname: e.target.value})}
                    placeholder="Como ele é conhecido?"
                    className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Facilita a busca no lançamento de pedidos.</p>
          </div>

          {type === 'PJ' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome Fantasia</label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={e => setFormData({...formData, tradeName: e.target.value})}
                className="block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}
          
          {/* Se for PF, ocupa o espaço para alinhar o grid */}
          {type === 'PF' && <div className="hidden md:block"></div>}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
            <MapPin size={18} className="text-slate-500" />
            Endereço
          </h3>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-500">CEP</label>
              <input 
                type="text" 
                value={formData.address.zip} 
                onChange={e => updateAddress('zip', e.target.value)} 
                className={addressInputClass}
                placeholder="00000-000"
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-500">Rua</label>
              <input 
                type="text" 
                value={formData.address.street} 
                onChange={e => updateAddress('street', e.target.value)} 
                className={addressInputClass}
              />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-500">Número</label>
              <input 
                type="text" 
                value={formData.address.number} 
                onChange={e => updateAddress('number', e.target.value)} 
                className={addressInputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-500">Bairro</label>
              <input 
                type="text" 
                value={formData.address.neighborhood} 
                onChange={e => updateAddress('neighborhood', e.target.value)} 
                className={addressInputClass}
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-500">Cidade</label>
              <input 
                type="text" 
                value={formData.address.city} 
                onChange={e => updateAddress('city', e.target.value)} 
                className={addressInputClass}
              />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-500">UF</label>
              <input 
                type="text" 
                maxLength={2} 
                value={formData.address.state} 
                onChange={e => updateAddress('state', e.target.value)} 
                className={`${addressInputClass} uppercase`}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            <Save size={18} />
            Salvar Parceiro
          </button>
        </div>

      </form>
    </div>
  );
};

export default PartnerForm;
