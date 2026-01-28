
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Handshake, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  User, 
  Phone, 
  MapPin, 
  Mail,
  Search,
  AlertTriangle
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { shareholderService, Shareholder } from '../../../services/shareholderService';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../contexts/ToastContext';

interface Props {
  onBack: () => void;
}

const ShareholdersSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  // State to control View Mode (List vs Form)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for deletion
  const [shareholderToDelete, setShareholderToDelete] = useState<Shareholder | null>(null);

  // Load from Service
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);

  useEffect(() => {
    const unsubscribe = shareholderService.subscribe(items => setShareholders(items));
    
    // Load initial data
    setShareholders(shareholderService.getAll());
    
    return () => unsubscribe();
  }, []);

  const refreshData = () => {
    setShareholders([...shareholderService.getAll()]);
  };

  // --- LOGIC: FILTER & SORT ---
  const filteredAndSortedShareholders = useMemo(() => {
    return shareholders
      .filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cpf.includes(searchTerm)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [shareholders, searchTerm]);

  // Form State
  const initialFormState = {
    name: '',
    cpf: '',
    email: '',
    phone: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zip: ''
    }
  };

  const [formData, setFormData] = useState(initialFormState);

  // Actions
  const handleAddNew = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setViewMode('form');
  };

  const handleEdit = (shareholder: Shareholder) => {
    setFormData(shareholder);
    setEditingId(shareholder.id);
    setViewMode('form');
  };

  const confirmDelete = () => {
    if (shareholderToDelete) {
      shareholderService.delete(shareholderToDelete.id);
      refreshData();
      addToast('success', 'Sócio Removido', 'O cadastro foi excluído permanentemente.');
      setShareholderToDelete(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Update existing
      shareholderService.update({ ...formData, id: editingId } as Shareholder);
      addToast('success', 'Cadastro Atualizado');
    } else {
      // Create new
      const newShareholder = { ...formData, id: Math.random().toString(36).substr(2, 9) } as Shareholder;
      shareholderService.add(newShareholder);
      addToast('success', 'Sócio Cadastrado');
    }

    refreshData();
    setViewMode('list');
  };

  const handleCancel = () => {
    setViewMode('list');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Mascara CPF
    if (name === 'cpf') {
      formattedValue = value
        .replace(/\D/g, '') // Remove tudo que não é dígito
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1'); // Limita o tamanho
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: formattedValue
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: formattedValue }));
    }
  };

  // --- RENDER FORM ---
  if (viewMode === 'form') {
    return (
      <SettingsSubPage
        title={editingId ? "Editar Sócio" : "Novo Sócio"}
        description="Preencha as informações cadastrais do sócio."
        icon={Handshake}
        color="bg-emerald-500"
        onBack={handleCancel}
      >
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Personal Data */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 border-b border-slate-200 pb-2">
              <User size={18} className="text-slate-500" />
              Dados Pessoais
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Nome Completo</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Nome do Sócio"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">CPF</label>
                <input
                  type="text"
                  name="cpf"
                  required
                  value={formData.cpf}
                  onChange={handleInputChange}
                  maxLength={14}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </div>

          {/* Section: Contact */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 border-b border-slate-200 pb-2">
              <Phone size={18} className="text-slate-500" />
              Contato
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Telefone / Celular</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Section: Address */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-800 border-b border-slate-200 pb-2">
              <MapPin size={18} className="text-slate-500" />
              Endereço
            </h3>
            <div className="grid gap-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">CEP</label>
                <input
                  type="text"
                  name="address.zip"
                  value={formData.address.zip}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="00000-000"
                />
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">Logradouro</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Número</label>
                <input
                  type="text"
                  name="address.number"
                  value={formData.address.number}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Bairro</label>
                <input
                  type="text"
                  name="address.neighborhood"
                  value={formData.address.neighborhood}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">Cidade</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">UF</label>
                <input
                  type="text"
                  name="address.state"
                  maxLength={2}
                  value={formData.address.state}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Save size={18} />
              Salvar Sócio
            </button>
          </div>
        </form>
      </SettingsSubPage>
    );
  }

  // --- RENDER LIST ---
  return (
    <SettingsSubPage
      title="Sócios"
      description="Gerencie os sócios da empresa. Estes dados podem ser utilizados em contratos e assinaturas."
      icon={Handshake}
      color="bg-emerald-500"
      onBack={onBack}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar sócio por nome ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <Plus size={18} />
          Novo Sócio
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4">Nome / CPF</th>
              <th className="px-6 py-4">Contato</th>
              <th className="hidden px-6 py-4 md:table-cell">Endereço</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedShareholders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  {searchTerm ? 'Nenhum sócio corresponde à busca.' : 'Nenhum sócio cadastrado. Clique em "Novo Sócio" para começar.'}
                </td>
              </tr>
            ) : (
              filteredAndSortedShareholders.map((socio) => (
                <tr key={socio.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{socio.name}</div>
                        <div className="text-xs text-slate-500">{socio.cpf}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400" />
                        <span>{socio.phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail size={14} className="text-slate-400" />
                        <span className="truncate max-w-[150px]">{socio.email || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-6 py-4 md:table-cell">
                    <div className="flex items-start gap-1.5">
                      <MapPin size={14} className="mt-0.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-2">
                        {socio.address.city}/{socio.address.state}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(socio)}
                        className="rounded p-1 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => setShareholderToDelete(socio)}
                        className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ActionConfirmationModal 
        isOpen={!!shareholderToDelete}
        onClose={() => setShareholderToDelete(null)}
        onConfirm={confirmDelete}
        title="Excluir Sócio?"
        description={
          <div className="space-y-3">
             <p>Tem certeza que deseja remover o cadastro de <strong>{shareholderToDelete?.name}</strong>?</p>
             <div className="p-3 bg-red-50 border border-red-100 rounded text-red-700 text-xs font-bold flex items-start gap-2">
               <AlertTriangle size={16} className="shrink-0" />
               <p>Atenção: Isso removerá o registro cadastral, mas transações financeiras históricas já realizadas podem ser mantidas para auditoria do caixa.</p>
             </div>
          </div>
        }
        type="danger"
        confirmLabel="Sim, Excluir"
      />
    </SettingsSubPage>
  );
};

export default ShareholdersSettings;
