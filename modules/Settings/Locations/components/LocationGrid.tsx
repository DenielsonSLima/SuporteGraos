import React from 'react';
import {
  Map, Plus, Search, MapPin, X
} from 'lucide-react';
import SettingsSubPage from '../../components/SettingsSubPage';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';
import { SkeletonCards } from '../../../../components/ui/SkeletonCards';

interface LocationState {
  id: string;
  name: string;
  uf: string;
  cities: { id: string; name: string; isSystem?: boolean }[];
}

interface CityToDelete {
  stateUf: string;
  cityId: string;
  cityName: string;
}

interface LocationGridProps {
  locations: LocationState[];
  isLoading: boolean;
  searchTerm: string;
  cityToDelete: CityToDelete | null;
  onSearchChange: (term: string) => void;
  onAddNew: () => void;
  onDeleteCityRequest: (city: CityToDelete) => void;
  onDeleteCityConfirm: () => void;
  onDeleteCityCancel: () => void;
  onBack: () => void;
}

const LocationGrid: React.FC<LocationGridProps> = ({
  locations,
  isLoading,
  searchTerm,
  cityToDelete,
  onSearchChange,
  onAddNew,
  onDeleteCityRequest,
  onDeleteCityConfirm,
  onDeleteCityCancel,
  onBack,
}) => {
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar cidade ou estado..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          />
        </div>
        <button onClick={onAddNew}
          className="flex items-center gap-2 rounded-lg bg-lime-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-lime-700">
          <Plus size={18} />
          Adicionar Cidade
        </button>
      </div>

      {isLoading ? (
        <SkeletonCards count={4} cols={2} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {locations.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-500">
              Nenhuma localização encontrada.
            </div>
          ) : (
            locations.map((state) => (
              <div key={state.id} className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 font-bold text-slate-700 shadow-sm text-sm">
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
                        <div key={city.id}
                          className="group flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 transition-all hover:border-red-200 hover:bg-red-50">
                          <MapPin size={12} className="text-slate-400 group-hover:text-red-400" />
                          <span>{city.name}</span>
                          {!city.isSystem && (
                            <button
                              onClick={() => onDeleteCityRequest({ stateUf: state.uf, cityId: city.id, cityName: city.name })}
                              className="ml-1 rounded-full p-0.5 text-slate-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                              title="Remover cidade">
                              <X size={12} />
                            </button>
                          )}
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
      )}

      <ActionConfirmationModal
        isOpen={!!cityToDelete}
        onClose={onDeleteCityCancel}
        onConfirm={onDeleteCityConfirm}
        title="Remover Cidade?"
        description={<p>Deseja remover <strong>{cityToDelete?.cityName}</strong> - {cityToDelete?.stateUf}?</p>}
        type="danger"
        confirmLabel="Sim, Remover"
      />
    </SettingsSubPage>
  );
};

export default LocationGrid;
