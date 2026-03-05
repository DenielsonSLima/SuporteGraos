import React from 'react';
import {
  Handshake, Save, User, Phone, MapPin
} from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';

interface ShareholderFormData {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
}

interface ShareholderFormProps {
  formData: ShareholderFormData;
  editingId: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const ShareholderForm: React.FC<ShareholderFormProps> = ({
  formData,
  editingId,
  onChange,
  onSave,
  onCancel,
}) => {
  return (
    <SettingsSubPage
      title={editingId ? "Editar Sócio" : "Novo Sócio"}
      description="Preencha as informações cadastrais do sócio."
      icon={Handshake}
      color="bg-emerald-500"
      onBack={onCancel}
    >
      <form onSubmit={onSave} className="space-y-6">
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
                onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
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
                onChange={onChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Número</label>
              <input
                type="text"
                name="address.number"
                value={formData.address.number}
                onChange={onChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Bairro</label>
              <input
                type="text"
                name="address.neighborhood"
                value={formData.address.neighborhood}
                onChange={onChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Cidade</label>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={onChange}
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
                onChange={onChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
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
};

export default ShareholderForm;
