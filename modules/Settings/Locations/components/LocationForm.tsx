import React from 'react';
import { Map, Save } from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';

interface LocationFormData {
  stateId: string;
  uf: string;
  cityName: string;
}

interface LocationState {
  id: string;
  name: string;
  uf: string;
  cities: { id: string; name: string; isSystem?: boolean }[];
}

interface LocationFormProps {
  formData: LocationFormData;
  locations: LocationState[];
  saving: boolean;
  onChange: (data: LocationFormData) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const LocationForm: React.FC<LocationFormProps> = ({
  formData,
  locations,
  saving,
  onChange,
  onSave,
  onCancel,
}) => {
  return (
    <SettingsSubPage
      title="Nova Cidade"
      description="Adicione uma nova cidade à base de dados."
      icon={Map}
      color="bg-lime-500"
      onBack={onCancel}
    >
      <form onSubmit={onSave} className="max-w-xl space-y-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Estado (UF)</label>
            <select
              required
              value={formData.stateId}
              onChange={e => {
                const selected = locations.find(s => s.id === e.target.value);
                onChange({ ...formData, stateId: e.target.value, uf: selected?.uf || '' });
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
            >
              <option value="">Selecione o Estado...</option>
              {[...locations].sort((a, b) => a.name.localeCompare(b.name)).map(state => (
                <option key={state.id} value={state.id}>{state.name} ({state.uf})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nome da Cidade</label>
            <input
              type="text"
              required
              value={formData.cityName}
              onChange={e => onChange({ ...formData, cityName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              placeholder="Ex: Ribeirão Preto"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white hover:bg-lime-700 disabled:opacity-60">
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </SettingsSubPage>
  );
};

export default LocationForm;
