
import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Tractor,
  Car,
  Warehouse,
  Box,
  Tag,
  StickyNote,
  Trash2,
  History,
  LayoutGrid,
  Calendar,
  Printer,
  Pencil,
  Loader2
} from 'lucide-react';
import { Asset } from './types';
import AssetForm from './components/AssetForm';
import AssetSaleModal from './components/AssetSaleModal';
import AssetDetails from './components/AssetDetails';
import AssetKPIs from './components/AssetKPIs';
import AssetListPdfModal from './components/AssetListPdfModal';
import ActionConfirmationModal from '../../components/ui/ActionConfirmationModal';
import { useToast } from '../../contexts/ToastContext';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '../../hooks/useAssets';
import { useStandaloneRecords } from '../../hooks/useFinancialActions';
import { useAssetSale } from './hooks/useAssetSale';
import { formatDateBR } from '../../utils/dateUtils';

const AssetsModule: React.FC = () => {
  const { addToast } = useToast();

  // ── TanStack Query: dados + realtime automático (via useAssets hook) ──────
  const { data: assets = [], isLoading } = useAssets();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const assetSale = useAssetSale();
  const { data: standaloneRecords = [] } = useStandaloneRecords();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ativos' | 'historico'>('ativos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');

  // States for Modals
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isListPdfModalOpen, setIsListPdfModalOpen] = useState(false);
  // Armazena apenas o ID — o objeto é derivado do cache TanStack Query
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  // Deriva o ativo selecionado a partir do cache TanStack Query (sempre atualizado)
  const selectedAsset = assets.find((a) => a.id === selectedAssetId) ?? null;

  const handleOpenAdd = () => {
    setAssetToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setAssetToEdit({ ...asset });
    setIsFormOpen(true);
  };

  const handleSaveAsset = (data: any) => {
    const isEditing = !!assetToEdit?.id;

    if (isEditing && assetToEdit) {
      const payload: Asset = {
        ...assetToEdit,
        ...data,
        id: assetToEdit.id,
        origin: assetToEdit.origin || 'purchase',
        status: assetToEdit.status || 'active'
      };
      updateAsset.mutate(payload);
      addToast('success', 'Bem Atualizado', 'As informações do patrimônio foram salvas.');
    } else {
      // UUID gerado pelo browser crypto (v4 compatível com Supabase)
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          });
      createAsset.mutate({
        ...data,
        id: newId,
        origin: 'purchase',
        status: 'active'
      });
      addToast('success', 'Bem Cadastrado', 'Novo ativo adicionado ao imobilizado.');
    }
    setAssetToEdit(null);
    setIsFormOpen(false);
  };

  const handleDeleteRequest = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    setAssetToDelete(asset);
  };

  const executeDelete = () => {
    if (assetToDelete) {
      deleteAsset.mutate(assetToDelete.id);
      addToast('success', 'Ativo Removido', 'O bem foi excluído permanentemente.');
      setAssetToDelete(null);
      if (viewMode === 'details') {
        setViewMode('list');
        setSelectedAssetId(null);
      }
    }
  };

  const handleConfirmSale = (data: any) => {
    if (!selectedAsset) return;

    assetSale.mutate(
      {
        asset: selectedAsset,
        buyerName: data.buyerName,
        buyerId: data.buyerId,
        saleDate: data.saleDate,
        saleValue: data.saleValue,
        installments: data.installments,
        firstDueDate: data.firstDueDate,
        notes: data.notes,
      },
      {
        onSuccess: () => {
          addToast('success', 'Venda Registrada', 'Títulos de crédito gerados no financeiro.');
        },
      }
    );
    setIsSaleModalOpen(false);
  };

  const filteredAssets = useMemo(() => {
    const term = searchTerm.toLowerCase();

    let base = assets;

    if (activeTab === 'ativos') {
      base = assets.filter(a => {
        if (a.status === 'active') return true;
        if (a.status === 'sold') {
          return standaloneRecords.some(r => r.assetId === a.id && r.status !== 'paid');
        }
        return false;
      });
    }
    const matches = base.filter(a =>
      a.name.toLowerCase().includes(term) ||
      a.identifier?.toLowerCase().includes(term)
    );

    // Ordena alfabeticamente pelo nome
    return [...matches].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
  }, [assets, searchTerm, activeTab, standaloneRecords]);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  // CORREÇÃO DE DATA: Usa utilitário centralizado
  const date = (val: string) => formatDateBR(val);

  const getIcon = (type: string) => {
    switch (type) {
      case 'vehicle': return <Car size={24} />;
      case 'property': return <Warehouse size={24} />;
      case 'machine': return <Tractor size={24} />;
      default: return <Box size={24} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vehicle': return 'Veículo';
      case 'machine': return 'Máquina';
      case 'property': return 'Imóvel';
      case 'equipment': return 'Equipamento';
      case 'other': return 'Outro';
      default: return 'N/A';
    }
  };

  // Skeleton de carregamento inicial
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="flex justify-center items-center gap-2 text-slate-400 py-4">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm font-medium">Carregando patrimônio...</span>
        </div>
      </div>
    );
  }

  if (viewMode === 'details' && selectedAsset) {
    return (
      <AssetDetails
        asset={selectedAsset}
        onBack={() => { setViewMode('list'); setSelectedAssetId(null); }}
        onDelete={() => setAssetToDelete(selectedAsset)}
        onEdit={() => { setAssetToEdit({ ...selectedAsset }); setIsFormOpen(true); }}
        onRefresh={() => { /* TanStack Query atualiza automaticamente via realtime */ }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <AssetKPIs assets={assets} />

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">

          {/* Abas */}
          <div className="flex flex-col sm:flex-row bg-slate-100 p-1 rounded-xl w-full xl:w-auto shrink-0">
            <button
              onClick={() => setActiveTab('ativos')}
              className={`flex-1 sm:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'ativos' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid size={14} /> Ativos & Pendências
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex-1 sm:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'historico' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <History size={14} /> Histórico Geral
            </button>
          </div>

          {/* Barra de Ações e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="relative flex-1 sm:w-64 xl:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white transition-all outline-none font-medium"
                placeholder="Buscar bem..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setIsListPdfModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
              >
                <Printer size={18} /> <span className="hidden lg:inline">Exportar</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg whitespace-nowrap"
              >
                <Plus size={18} /> Novo Ativo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map(asset => (
          <div
            key={asset.id}
            onClick={() => { setSelectedAssetId(asset.id); setViewMode('details'); }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all cursor-pointer hover:border-blue-300"
          >
            <div className="p-5 flex justify-between items-start">
              <div className="flex gap-4">
                <div className={`p-3 rounded-xl h-fit shadow-sm ${asset.status === 'sold' ? 'bg-emerald-50 text-emerald-600' :
                    asset.status === 'write_off' ? 'bg-rose-50 text-rose-400' :
                      'bg-blue-50 text-blue-600'
                  }`}>
                  {getIcon(asset.type)}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-tighter italic group-hover:text-blue-700 transition-colors">{asset.name}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{asset.identifier || 'S/N'}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs border bg-slate-50 text-slate-600 border-slate-200">
                      {getTypeLabel(asset.type)}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs border ${asset.status === 'sold' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        asset.status === 'write_off' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                      {asset.status === 'sold' ? 'Vendido' : asset.status === 'write_off' ? 'Baixado' : 'Ativo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 space-y-2 text-sm text-slate-600 flex-1">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-300" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Aquisição: {date(asset.acquisitionDate)}</span>
              </div>
              {asset.identifier && (
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-slate-300" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Identificador: {asset.identifier}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Box size={14} className="text-slate-300" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Custo: <strong className="text-slate-900">{currency(asset.acquisitionValue)}</strong></span>
              </div>
              {asset.description && (
                <div className="flex items-start gap-2 pt-1">
                  <StickyNote size={14} className="text-slate-300 mt-0.5" />
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {asset.description}
                  </p>
                </div>
              )}
              {asset.status === 'sold' && (
                <div className="text-[10px] bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-100 mt-2 font-bold shadow-inner">
                  Vendido por <strong className="text-base block">{currency(asset.saleValue || 0)}</strong>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-3 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={(e) => handleOpenEdit(e, asset)}
                className="text-slate-400 hover:text-blue-600 p-2 rounded-xl hover:bg-blue-50 transition-all"
                title="Editar Bem"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={(e) => handleDeleteRequest(e, asset)}
                className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-all"
                title="Excluir Bem"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {filteredAssets.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
            Nenhum bem encontrado nesta categoria.
          </div>
        )}
      </div>

      <AssetForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveAsset}
        initialData={assetToEdit}
      />

      {selectedAsset && isSaleModalOpen && (
        <AssetSaleModal
          isOpen={isSaleModalOpen}
          onClose={() => setIsSaleModalOpen(false)}
          asset={selectedAsset}
          onConfirmSale={handleConfirmSale}
        />
      )}

      {isListPdfModalOpen && (
        <AssetListPdfModal
          isOpen={isListPdfModalOpen}
          onClose={() => setIsListPdfModalOpen(false)}
          assets={assets}
          financialRecords={standaloneRecords}
        />
      )}

      <ActionConfirmationModal
        isOpen={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onConfirm={executeDelete}
        title="Excluir Ativo permanentemente?"
        description={
          <p>Você está prestes a remover <strong>{assetToDelete?.name}</strong> do inventário. Esta ação é irreversível e apagará o registro do sistema.</p>
        }
        type="danger"
      />
    </div>
  );
};

export default AssetsModule;
