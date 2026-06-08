// modules/Partners/components/QuickPartnerModal.tsx
// ============================================================================
// Modal de Cadastro Rápido de Parceiro
// Usado nos formulários de Pedido de Compra e Pedido de Venda para cadastrar
// um parceiro sem sair do fluxo atual.
// ============================================================================

import React, { useState } from 'react';
import { X, User, Building2, Save, Loader2, Search, Tag, Phone, MapPin } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { partnersService } from '../partners.service';
import { authService } from '../../../services/authService';
import { DEFAULT_PARTNER_CATEGORIES } from '../../../constants';
import { Partner } from '../partners.types';
import { useCnpjLookup } from '../hooks/useCnpjLookup';
import ReactDOM from 'react-dom';

interface QuickPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Categorias pré-selecionadas (ex: ['1'] para Produtor no Ped. Compra, ['5'] para Cliente no Ped. Venda) */
  defaultCategories?: string[];
  /** Callback com o parceiro criado para auto-selecionar no formulário pai */
  onSuccess?: (partner: Partner) => void;
}

const QuickPartnerModal: React.FC<QuickPartnerModalProps> = ({
  isOpen,
  onClose,
  defaultCategories = [],
  onSuccess
}) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { lookup: lookupCnpj, isSearching: isSearchingCnpj } = useCnpjLookup();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<'PJ' | 'PF'>('PJ');
  const [documentNotInformed, setDocumentNotInformed] = useState(false);
  const [addressNotInformed, setAddressNotInformed] = useState(false);
  const [formData, setFormData] = useState({
    categories: defaultCategories,
    document: '',
    name: '',
    nickname: '',
    tradeName: '',
    phone: '',
    city: '',
    state: ''
  });

  if (!isOpen) return null;

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
    setFormData(prev => ({ ...prev, document: masked }));
  };

  const handleDocumentOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setDocumentNotInformed(isChecked);
    if (isChecked) {
      setFormData(prev => ({ ...prev, document: '' }));
    }
  };

  const handleAddressOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setAddressNotInformed(isChecked);
    if (isChecked) {
      setFormData(prev => ({ ...prev, city: '', state: '' }));
    }
  };

  const handleConsultarCnpj = async () => {
    const cnpjLimpo = formData.document.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      addToast('warning', 'CNPJ Inválido', 'Digite um CNPJ válido com 14 números.');
      return;
    }

    try {
      const data = await lookupCnpj(formData.document);
      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.nome?.toUpperCase() || '',
          tradeName: data.fantasia?.toUpperCase() || '',
          nickname: (data.fantasia || data.nome)?.toUpperCase() || '',
          phone: data.telefone,
          city: data.municipio?.toUpperCase() || '',
          state: data.uf?.toUpperCase() || ''
        }));
        if (data.municipio && data.uf) {
          setAddressNotInformed(false);
        }
        addToast('success', 'CNPJ Encontrado', 'Campos preenchidos automaticamente.');
      }
    } catch (err: any) {
      addToast('error', 'Erro', err.message || 'Falha na consulta CNPJ.');
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim()) {
      addToast('warning', 'Atenção', 'O nome do parceiro é obrigatório.');
      return;
    }

    if (formData.categories.length === 0) {
      addToast('warning', 'Atenção', 'Selecione pelo menos uma categoria.');
      return;
    }

    // Validação de documento quando informado
    if (!documentNotInformed) {
      const cleanDoc = formData.document.replace(/\D/g, '');
      if (type === 'PF' && cleanDoc.length !== 11) {
        addToast('error', 'CPF Inválido', 'O CPF deve conter 11 dígitos.');
        return;
      }
      if (type === 'PJ' && cleanDoc.length !== 14) {
        addToast('error', 'CNPJ Inválido', 'O CNPJ deve conter 14 dígitos.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const currentUser = await authService.getCurrentUser();
      const companyId = currentUser?.companyId;
      if (!companyId) throw new Error('Company ID não encontrado');

      const finalDocument = documentNotInformed ? 'NÃO INFORMADO' : formData.document.trim();

      // Verifica duplicidade
      if (finalDocument && finalDocument !== 'NÃO INFORMADO') {
        const dupCheck = await partnersService.checkDocumentExists(finalDocument);
        if (dupCheck.exists) {
          addToast('error', 'Documento Duplicado', `Já existe o parceiro: ${dupCheck.name}`);
          setIsSubmitting(false);
          return;
        }
      }

      const hasAddress = !addressNotInformed && formData.city && formData.state;

      const result = await partnersService.savePartnerComplete({
        partnerId: null,
        companyId,
        partnerData: {
          type,
          document: finalDocument || 'NÃO INFORMADO',
          name: formData.name.toUpperCase().trim(),
          nickname: formData.nickname ? formData.nickname.toUpperCase().trim() : null,
          tradeName: formData.tradeName ? formData.tradeName.toUpperCase().trim() : null,
          phone: formData.phone || null,
          email: null,
          notes: null,
          active: true
        },
        addressData: hasAddress ? {
          cep: '',
          street: '',
          number: '',
          neighborhood: '',
          cityName: formData.city ? formData.city.toUpperCase().trim() : '',
          stateUf: formData.state ? formData.state.toUpperCase().trim() : '',
          isPrimary: true
        } : null,
        categories: formData.categories
      });

      // Invalida queries para atualizar listas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARTNERS });

      addToast('success', 'Parceiro Cadastrado', `${formData.name.toUpperCase().trim()} foi adicionado com sucesso.`);

      // Monta um Partner mínimo para callback
      if (onSuccess) {
        const newPartner: Partner = {
          id: result?.partner_id || result?.id || crypto.randomUUID(),
          companyId,
          type,
          categories: formData.categories,
          document: finalDocument || 'NÃO INFORMADO',
          name: formData.name.toUpperCase().trim(),
          nickname: formData.nickname ? formData.nickname.toUpperCase().trim() : undefined,
          tradeName: formData.tradeName ? formData.tradeName.toUpperCase().trim() : undefined,
          phone: formData.phone || undefined,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          address: hasAddress ? {
            id: '',
            companyId,
            partnerId: result?.partner_id || result?.id || '',
            cep: '',
            street: '',
            number: '',
            neighborhood: '',
            isPrimary: true,
            cityName: formData.city ? formData.city.toUpperCase().trim() : '',
            stateUf: formData.state ? formData.state.toUpperCase().trim() : ''
          } : undefined
        };
        onSuccess(newPartner);
      }

      onClose();
    } catch (error: any) {
      console.error('Erro ao cadastrar parceiro rápido:', error);
      addToast('error', 'Erro ao Cadastrar', error.message || 'Não foi possível salvar o parceiro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 font-bold focus:border-emerald-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-sm uppercase';
  const labelClass = 'block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest ml-1';

  const modalContent = (
    <div
      className="animate-in fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter italic leading-none">Novo Parceiro</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Cadastro Rápido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-1.5 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Tipo PJ/PF */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setType('PJ'); if (!documentNotInformed) setFormData(prev => ({ ...prev, document: '' })); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 p-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                type === 'PJ'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Building2 size={16} /> Pessoa Jurídica
            </button>
            <button
              type="button"
              onClick={() => { setType('PF'); if (!documentNotInformed) setFormData(prev => ({ ...prev, document: '' })); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 p-2.5 text-xs font-black uppercase tracking-wider transition-all ${
                type === 'PF'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              <User size={16} /> Pessoa Física
            </button>
          </div>

          {/* Documento + "Não informado" */}
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <label className={`${labelClass} mb-0`}>{type === 'PJ' ? 'CNPJ' : 'CPF'}</label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  checked={documentNotInformed}
                  onChange={handleDocumentOptionChange}
                />
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Não informado</span>
              </label>
            </div>
            <div className={`flex gap-2 transition-opacity duration-200 ${documentNotInformed ? 'opacity-40 pointer-events-none' : ''}`}>
              <input
                className={inputClass}
                value={documentNotInformed ? 'NÃO INFORMADO' : formData.document}
                onChange={handleDocumentChange}
                maxLength={type === 'PJ' ? 18 : 14}
                disabled={documentNotInformed}
                placeholder={type === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
              />
              {type === 'PJ' && !documentNotInformed && (
                <button
                  type="button"
                  onClick={handleConsultarCnpj}
                  disabled={isSearchingCnpj}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors uppercase tracking-wider whitespace-nowrap"
                >
                  {isSearchingCnpj ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
                  Buscar
                </button>
              )}
            </div>
          </div>

          {/* Categorias */}
          <div>
            <label className={labelClass}>Categorias</label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_PARTNER_CATEGORIES.map(cat => {
                const isSelected = formData.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className={labelClass}>{type === 'PJ' ? 'Razão Social' : 'Nome Completo'} *</label>
            <input
              autoFocus
              required
              className={inputClass}
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome do parceiro"
            />
          </div>

          {/* Apelido + Telefone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Apelido <span className="text-slate-300 font-semibold normal-case tracking-normal">(opcional)</span></label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  className={`${inputClass} pl-9`}
                  value={formData.nickname}
                  onChange={e => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="Nome de guerra"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Telefone <span className="text-slate-300 font-semibold normal-case tracking-normal">(opcional)</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  className={`${inputClass} pl-9`}
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          {/* Endereço + "Sem endereço" */}
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <label className={`${labelClass} mb-0 flex items-center gap-1`}>
                <MapPin size={10} /> Endereço
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  checked={addressNotInformed}
                  onChange={handleAddressOptionChange}
                />
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Sem endereço</span>
              </label>
            </div>
            <div className={`grid grid-cols-3 gap-3 transition-opacity duration-200 ${addressNotInformed ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="col-span-2">
                <input
                  className={inputClass}
                  value={formData.city}
                  onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  disabled={addressNotInformed}
                  placeholder="Cidade do parceiro"
                />
              </div>
              <div>
                <input
                  className={`${inputClass} text-center`}
                  maxLength={2}
                  value={formData.state}
                  onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  disabled={addressNotInformed}
                  placeholder="UF"
                />
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="pt-4 flex gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-black shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 flex items-center justify-center gap-2 uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="animate-spin" /> Salvando...</>
              ) : (
                <><Save size={16} /> Cadastrar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Portal: renderiza direto no <body> para evitar problemas de overflow/z-index
  return ReactDOM.createPortal(modalContent, document.body);
};

export default QuickPartnerModal;
