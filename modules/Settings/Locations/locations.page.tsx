import React, { useState, useMemo } from 'react';
import { useLocations, useAddCity, useRemoveCity } from '../../../hooks/useLocations';
import { useToast } from '../../../contexts/ToastContext';
import LocationForm from './components/LocationForm';
import LocationGrid from './components/LocationGrid';

interface Props {
  onBack: () => void;
}

const LocationsSettings: React.FC<Props> = ({ onBack }) => {
  const { addToast } = useToast();
  const { data: locations = [], isLoading } = useLocations();
  const addCityMutation = useAddCity();
  const removeCityMutation = useRemoveCity();

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ stateId: '', uf: '', cityName: '' });
  const [saving, setSaving] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<{ stateUf: string; cityId: string; cityName: string } | null>(null);

  const handleAddNew = () => {
    setFormData({ stateId: '', uf: '', cityName: '' });
    setViewMode('form');
  };

  const confirmDeleteCity = async () => {
    if (!cityToDelete) return;
    try {
      await removeCityMutation.mutateAsync({ cityId: cityToDelete.cityId, cityName: cityToDelete.cityName });
      addToast('success', 'Cidade Removida');
    } catch (err: any) {
      addToast('error', 'Erro ao Remover', err.message);
    }
    setCityToDelete(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.stateId || !formData.cityName.trim()) return;

    setSaving(true);
    try {
      await addCityMutation.mutateAsync({ stateId: formData.stateId, cityName: formData.cityName.trim() });
      setViewMode('list');
      addToast('success', 'Cidade Adicionada');
    } catch (err: any) {
      addToast('error', 'Erro ao Salvar', err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredLocations = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return locations.filter(state => {
      const stateMatch = state.name.toLowerCase().includes(searchLower) || state.uf.toLowerCase().includes(searchLower);
      const cityMatch = state.cities.some(c => c.name.toLowerCase().includes(searchLower));
      return stateMatch || cityMatch;
    });
  }, [locations, searchTerm]);

  if (viewMode === 'form') {
    return (
      <LocationForm
        formData={formData}
        locations={locations}
        saving={saving}
        onChange={setFormData}
        onSave={handleSave}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  return (
    <LocationGrid
      locations={filteredLocations}
      isLoading={isLoading}
      searchTerm={searchTerm}
      cityToDelete={cityToDelete}
      onSearchChange={setSearchTerm}
      onAddNew={handleAddNew}
      onDeleteCityRequest={setCityToDelete}
      onDeleteCityConfirm={confirmDeleteCity}
      onDeleteCityCancel={() => setCityToDelete(null)}
      onBack={onBack}
    />
  );
};

export default LocationsSettings;
