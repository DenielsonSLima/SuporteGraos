
import React from 'react';
import { X, Truck, CheckSquare, Square, FileText, DollarSign } from 'lucide-react';
import { Freight } from '../../types';

interface Props {
  carrierName: string;
  freights: Freight[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onClose: () => void;
  onPay: () => void;
}

const FreightSelectionModal: React.FC<Props> = ({ 
  carrierName, 
  freights, 
  selectedIds, 
  onToggleSelect, 
  onToggleAll, 
  onClose, 
  onPay 
}) => {
  
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  // Calcula o total apenas dos itens selecionados
  const totalSelected = freights
    .filter(f => selectedIds.includes(f.id))
    .reduce((acc, f) => acc + f.balanceValue, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg"><Truck size={20}/></div>
            <div>
              <h3 className="font-bold text-lg">{carrierName}</h3>
              <p className="text-xs text-slate-400">Seleção de fretes para pagamento</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={onToggleAll}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              {selectedIds.length === freights.length && freights.length > 0 ? (
                <CheckSquare size={18} className="text-primary-600" /> 
              ) : (
                <Square size={18} />
              )}
              Selecionar Todos
            </button>
            <span className="text-sm text-slate-500">
              {selectedIds.length} selecionados
            </span>
          </div>

          <div className="space-y-3">
            {freights.map(freight => {
              const isSelected = selectedIds.includes(freight.id);
              return (
                <div 
                  key={freight.id}
                  onClick={() => onToggleSelect(freight.id)}
                  className={`
                    relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
                    ${isSelected 
                      ? 'bg-primary-50 border-primary-500 shadow-sm ring-1 ring-primary-500' 
                      : 'bg-white border-slate-200 hover:border-slate-300'}
                  `}
                >
                  {/* Checkbox */}
                  <div className={`shrink-0 ${isSelected ? 'text-primary-600' : 'text-slate-300'}`}>
                    {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 font-bold mb-0.5 flex items-center gap-1">
                        <FileText size={10} /> Pedido {freight.orderNumber}
                      </p>
                      <p className="font-bold text-slate-800 text-sm">{date(freight.date)}</p>
                      <p className="text-xs text-slate-500">{freight.originCity} {' → '} {freight.destinationCity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold mb-0.5">Veículo</p>
                      <p className="text-sm text-slate-700 bg-slate-100 inline-block px-1.5 rounded">{freight.vehiclePlate}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{freight.driverName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Saldo a Pagar</p>
                      <p className="font-bold text-amber-600 text-lg">{currency(freight.balanceValue)}</p>
                      {freight.advanceValue > 0 && (
                        <p className="text-[10px] text-slate-400">Adiantado: {currency(freight.advanceValue)}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer (Summary & Action) */}
        <div className="bg-white border-t border-slate-200 p-4 shrink-0 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-500">Total Selecionado</p>
            <p className="text-2xl font-bold text-slate-800">
              {currency(totalSelected)}
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={onPay}
              disabled={selectedIds.length === 0}
              className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-bold shadow-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              <DollarSign size={18} />
              Baixar Fretes (Pagar)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FreightSelectionModal;
