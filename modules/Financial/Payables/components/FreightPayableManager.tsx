
import React, { useState, useMemo } from 'react';
import { Truck, Filter, Calendar, User, DollarSign, X } from 'lucide-react';
import FinancialTable from '../../components/FinancialTable';
import { FinancialRecord } from '../../types';
import FinancialPaymentModal, { PaymentData } from '../../components/modals/FinancialPaymentModal';

interface Props {
  records: FinancialRecord[];
  onRefresh: () => void;
}

const FreightPayableManager: React.FC<Props> = ({ records, onRefresh }) => {
  // --- FILTERS STATE ---
  const [carrierFilter, setCarrierFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // --- SELECTION STATE ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedRecordForSinglePay, setSelectedRecordForSinglePay] = useState<FinancialRecord | null>(null);

  // --- DERIVED DATA ---
  // Unique Carriers and Drivers for dropdowns
  const carriers = useMemo(() => Array.from(new Set(records.map(r => r.entityName))).sort(), [records]);
  const drivers = useMemo(() => Array.from(new Set(records.filter(r => r.driverName).map(r => r.driverName!))).sort(), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesCarrier = carrierFilter ? record.entityName === carrierFilter : true;
      const matchesDriver = driverFilter ? record.driverName === driverFilter : true;
      
      let matchesDate = true;
      if (startDate && record.dueDate < startDate) matchesDate = false;
      if (endDate && record.dueDate > endDate) matchesDate = false;

      return matchesCarrier && matchesDriver && matchesDate;
    });
  }, [records, carrierFilter, driverFilter, startDate, endDate]);

  const totalSelected = filteredRecords
    .filter(r => selectedIds.includes(r.id))
    .reduce((acc, r) => acc + (r.originalValue - r.paidValue), 0);

  // --- HANDLERS ---

  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleClearFilters = () => {
    setCarrierFilter('');
    setDriverFilter('');
    setStartDate('');
    setEndDate('');
  };

  const openBulkPayment = () => {
    if (selectedIds.length === 0) return;
    
    // Optional: Validate if all selected belong to same Carrier
    const selectedRecords = filteredRecords.filter(r => selectedIds.includes(r.id));
    const firstCarrier = selectedRecords[0].entityName;
    const mixed = selectedRecords.some(r => r.entityName !== firstCarrier);
    
    if (mixed) {
      if(!window.confirm('Você selecionou fretes de transportadoras diferentes. Deseja continuar com o pagamento unificado? Recomenda-se filtrar por transportadora antes.')) {
        return;
      }
    }

    setSelectedRecordForSinglePay(null);
    setIsPayModalOpen(true);
  };

  const openSinglePayment = (record: FinancialRecord) => {
    setSelectedRecordForSinglePay(record);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = (data: PaymentData) => {
    // Here we would call the service API to process the payment
    console.log('Processing Payment:', data);
    
    if (selectedRecordForSinglePay) {
      // FIX: Property 'remainderAction' does not exist on type 'PaymentData'.
      alert(`Pagamento de ${data.amount} processado para ${selectedRecordForSinglePay.description}.`);
    } else {
      alert(`Pagamento em LOTE de ${data.amount} processado para ${selectedIds.length} títulos.`);
    }

    setIsPayModalOpen(false);
    setSelectedIds([]);
    setSelectedRecordForSinglePay(null);
    onRefresh(); // Trigger data reload
  };

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      
      {/* FILTER BAR */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700">
          <Filter size={18} className="text-slate-500" />
          Filtros Avançados de Frete
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Transportadora */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Transportadora</label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select 
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary-500 bg-white text-slate-900"
              >
                <option value="">Todas</option>
                {carriers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Motorista */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Motorista</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select 
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary-500 bg-white text-slate-900"
              >
                <option value="">Todos</option>
                {drivers.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Periodo */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Vencimento (De - Até)</label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary-500 bg-white text-slate-900"
                />
              </div>
              <span className="text-slate-400">-</span>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-2 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary-500 bg-white text-slate-900"
                />
              </div>
              {(carrierFilter || driverFilter || startDate || endDate) && (
                <button 
                  onClick={handleClearFilters}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Limpar Filtros"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex justify-between items-center animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-4">
            <span className="bg-slate-700 px-3 py-1 rounded-full text-xs font-bold">{selectedIds.length} selecionados</span>
            <div className="text-sm">
              <span className="opacity-70 mr-2">Total a Pagar:</span>
              <span className="text-xl font-bold text-emerald-400">{currency(totalSelected)}</span>
            </div>
          </div>
          <button 
            onClick={openBulkPayment}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
          >
            <DollarSign size={18} />
            Gerar Contas a Pagar Único
          </button>
        </div>
      )}

      {/* TABLE */}
      <FinancialTable 
        records={filteredRecords} 
        type="payable" 
        onPay={openSinglePayment}
        selectable
        selectedIds={selectedIds}
        onToggleSelection={handleToggleSelection}
      />

      {/* PAYMENT MODAL */}
      <FinancialPaymentModal 
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onConfirm={handleConfirmPayment}
        record={selectedRecordForSinglePay}
        bulkTotal={selectedRecordForSinglePay ? undefined : totalSelected}
        bulkCount={selectedIds.length}
      />

    </div>
  );
};

export default FreightPayableManager;
