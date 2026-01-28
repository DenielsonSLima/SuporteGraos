import React, { useState, useEffect } from 'react';
import { 
  Map, 
  Plus, 
  Search, 
  MapPin, 
  X, 
  Save, 
  Trash2
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { locationService } from '../../../services/locationService';

interface StateData {
  uf: string;
  name: string;
  cities: string[];
}

interface Props {
  onBack: () => void;
}

const LocationsSettings: React.FC<Props> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  // Load initial data from the Service
  const [locations, setLocations] = useState<StateData[]>(locationService.getStates());
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const unsubscribe = locationService.subscribe(items => setLocations(items));
    
    setLocations(locationService.getStates());
    
    return () => unsubscribe();
  }, []);
  
  const [formData, setFormData] = useState({
    uf: '',
    cityName: ''
  });

  // Refresh data helper
  const refreshData = () => {
    setLocations([...locationService.getStates()]); // Spread to trigger re-render
  };

  // Actions
  const handleAddNew = () => {
    setFormData({ uf: '', cityName: '' });
    setViewMode('form');
  };

  const handleDeleteCity = async (uf: string, cityName: string) => {
    if (window.confirm(`Deseja remover ${cityName} - ${uf}?`)) {
      await locationService.removeCity(uf, cityName);
      refreshData();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.uf || !formData.cityName.trim()) return;

    // Check duplicates locally before calling service to give UI feedback
    const state = locations.find(s => s.uf === formData.uf);
    if (state && state.cities.includes(formData.cityName)) {
      alert('Esta cidade já está cadastrada neste estado.');
      return;
    }

    // Save to Service
    await locationService.addCity(formData.uf, formData.cityName);
    refreshData();
    setViewMode('list');
  };

  // Filter Logic
  const filteredLocations = locations.filter(state => {
    const searchLower = searchTerm.toLowerCase();
    const stateMatch = state.name.toLowerCase().includes(searchLower) || state.uf.toLowerCase().includes(searchLower);
    const cityMatch = state.cities.some(city => city.toLowerCase().includes(searchLower));
    return stateMatch || cityMatch;
  });

  // --- RENDER FORM ---
  if (viewMode === 'form') {
    return (
      <SettingsSubPage
        title="Nova Cidade"
        description="Adicione uma nova cidade à base de dados."
        icon={Map}
        color="bg-lime-500"
        onBack={() => setViewMode('list')}
      >
        <form onSubmit={handleSave} className="max-w-xl space-y-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Estado (UF)</label>
              <select
                required
                value={formData.uf}
                onChange={e => setFormData({...formData, uf: e.target.value})}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              >
                <option value="">Selecione o Estado...</option>
                {ALL_STATES_LIST.map(state => (
                  <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome da Cidade</label>
              <input
                type="text"
                required
                value={formData.cityName}
                onChange={e => setFormData({...formData, cityName: e.target.value})}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
                placeholder="Ex: Ribeirão Preto"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white hover:bg-lime-700"
            >
              <Save size={18} />
              Salvar
            </button>
          </div>
        </form>
      </SettingsSubPage>
    );
  }

  // --- RENDER LIST ---
  return (
    <SettingsSubPage
      title="Cidades e UF"
      description="Base de dados de municípios e estados para endereçamento."
      icon={Map}
      color="bg-lime-500"
      onBack={onBack}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cidade ou estado..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          />
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-lime-700"
        >
          <Plus size={18} />
          Adicionar Cidade
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {filteredLocations.length === 0 ? (
          <div className="col-span-full py-10 text-center text-slate-500">
            Nenhuma localização encontrada.
          </div>
        ) : (
          filteredLocations.map((state) => (
            <div key={state.uf} className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 font-bold text-slate-700 shadow-sm">
                    {state.uf}
                  </div>
                  <h3 className="font-semibold text-slate-800">{state.name}</h3>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
                  {state.cities.length} cidades
                </span>
              </div>
              
              <div className="p-4 flex-1">
                {state.cities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {state.cities.map((city) => (
                      <div 
                        key={`${state.uf}-${city}`} 
                        className="group flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 transition-all hover:border-red-200 hover:bg-red-50"
                      >
                        <MapPin size={12} className="text-slate-400 group-hover:text-red-400" />
                        <span>{city}</span>
                        <button
                          onClick={() => handleDeleteCity(state.uf, city)}
                          className="ml-1 rounded-full p-0.5 text-slate-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                          title="Remover cidade"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400">Nenhuma cidade cadastrada.</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </SettingsSubPage>
  );
};

export default LocationsSettings;