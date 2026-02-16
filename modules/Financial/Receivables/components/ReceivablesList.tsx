
import React, { useState, useMemo } from 'react';
import { FinancialRecord } from '../../types';
import FinancialTable from '../../components/FinancialTable';
import ReceivablesGroupedList from './ReceivablesGroupedList';
import { Search, LayoutList, Users, CheckSquare, DollarSign, X, Filter } from 'lucide-react';
import FinancialPaymentModal, { PaymentData } from '../../components/modals/FinancialPaymentModal';
import { financialActionService } from '../../../../services/financialActionService';

interface Props {
  records: FinancialRecord[];
  onReceive: (record: FinancialRecord) => void;
  onRefresh: () => void;
}

const ReceivablesList: React.FC<Props> = ({ records, onReceive, onRefresh }) => {
  // UI State
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // --- FILTERING ---
  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      r.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [records, searchTerm]);

  // --- CALCULATIONS ---
  const totalReceivable = useMemo(() => 
    filteredRecords.reduce((acc, r) => acc + (r.originalValue - r.paidValue), 0)
  , [filteredRecords]);

  const totalSelectedValue = useMemo(() => 
    records
      .filter(r => selectedIds.includes(r.id))
      .reduce((acc, r) => acc + (r.originalValue - r.paidValue), 0)
  , [records, selectedIds]);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  // --- HANDLERS ---

  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkPaymentConfirm = (data: PaymentData) => {
    if(window.confirm(`Confirma o recebimento em lote de ${selectedIds.length} títulos no valor total de ${currency(totalSelectedValue)}?`)) {
      selectedIds.forEach(id => {
        // For simple bulk logic:
        // We consider the individual principal balance as the 'principal' paid.
        // Any bulk discounts/interest would need complex distribution.
        // Here we assume pure principal payment for each item.
        
        const record = records.find(r => r.id === id);
        if (record) {
          const balance = record.originalValue - record.paidValue;
          financialActionService.processRecord(id, { 
            ...data, 
            principal: balance,
            interest: 0,
            discount: 0,
            amount: balance 
          }, record.subType);
        }
      });
      
      setIsBulkModalOpen(false);
      setSelectedIds([]);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* CONTROLS BAR */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Search Input - Fixed Styling for Readability */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Digite para filtrar por cliente..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all shadow-sm"
          />
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutList size={16} />
            Lista Simples
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'grouped' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={16} />
            Agrupar por Cliente
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="bg-gradient-to-r from-emerald-50 to-white border border-emerald-100 p-4 rounded-xl flex justify-between items-center">
        <div>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total a Receber (Visão Atual)</p>
          <p className="text-2xl font-bold text-emerald-700">{currency(totalReceivable)}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          {filteredRecords.length} títulos encontrados
        </div>
      </div>

      {/* CONTENT */}
      <div>
        {viewMode === 'list' ? (
          <FinancialTable 
            records={filteredRecords} 
            type="receivable" 
            onPay={onReceive} 
            selectable
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
          />
        ) : (
          <ReceivablesGroupedList 
            records={filteredRecords}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
            onReceive={onReceive}
          />
        )}
      </div>

      {/* BULK ACTION BAR (Floating) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-4 border border-slate-700">
          <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <CheckSquare size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">{selectedIds.length} selecionados</p>
              <p className="text-lg font-bold text-white">{currency(totalSelectedValue)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <DollarSign size={18} />
              Baixar em Lote
            </button>
            <button 
              onClick={handleClearSelection}
              className="p-2.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Cancelar Seleção"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* BULK PAYMENT MODAL */}
      <FinancialPaymentModal 
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={handleBulkPaymentConfirm}
        record={null}
        bulkTotal={totalSelectedValue}
        bulkCount={selectedIds.length}
      />

    </div>
  );
};

export default ReceivablesList;
