
import React, { useState } from 'react';
import { ArrowLeft, Truck, Calendar, DollarSign, CheckSquare, Square, FileText, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { Freight } from '../../types';
import { useCarrierFinancials } from '../../hooks/useCarrierFinancials';
import FreightPaymentModal from '../modals/FreightPaymentModal';

interface Props {
  carrierName: string;
  allFreights: Freight[];
  onBack: () => void;
  onRefresh: () => void;
}

const CarrierFinancialDetails: React.FC<Props> = ({ carrierName, allFreights, onBack, onRefresh }) => {
  const { carrierFreights, selectedFreightIds, totals, actions } = useCarrierFinancials(carrierName, allFreights, onRefresh);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const handleConfirmPayment = (data: any) => {
    actions.processPayment(data);
    setIsPayModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">{carrierName}</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detalhamento Financeiro e Rastro de Fretes</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card Saldo Devedor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Devedor Total</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{currency(totals.totalDebt)}</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><AlertTriangle size={24}/></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">{carrierFreights.length} cargas pendentes</p>
        </div>
        
        {/* Card Crédito Global (Novo) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Crédito Disponível</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{currency(totals.globalCredit || 0)}</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Wallet size={24}/></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Saldo de Adiantamentos</p>
        </div>

        {/* Card Adiantamentos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adiantamentos Realizados</p>
              <h3 className="text-2xl font-black text-blue-600 mt-1">{currency(totals.totalAdvances)}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><DollarSign size={24}/></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Valores já abatidos</p>
        </div>

        {/* Card Seleção */}
        <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl">
           <div className="flex justify-between items-start">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Selecionado</p>
               <h3 className="text-2xl font-black text-emerald-400 mt-1">{currency(totals.selectedDebt)}</h3>
            </div>
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400"><CheckCircle2 size={24}/></div>
           </div>
           <button 
             onClick={() => setIsPayModalOpen(true)}
             disabled={selectedFreightIds.length === 0}
             className="w-full mt-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all"
           >
             Realizar Baixa ({selectedFreightIds.length})
           </button>
        </div>
      </div>

      {/* Tabela de Fretes em Aberto */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Truck size={18} className="text-slate-400" /> 
               Fretes em Aberto
            </h3>
            <button 
              onClick={actions.selectAll} 
              className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide flex items-center gap-1"
            >
              {selectedFreightIds.length === carrierFreights.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-white border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                  <tr>
                     <th className="px-6 py-3 w-10 text-center">Sel.</th>
                     <th className="px-6 py-3">Data</th>
                     <th className="px-6 py-3">Placa / Motorista</th>
                     <th className="px-6 py-3">Rota</th>
                     <th className="px-6 py-3 text-right">Valor Total</th>
                     <th className="px-6 py-3 text-right">Pago</th>
                     <th className="px-6 py-3 text-right text-rose-600">Saldo</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 font-medium">
                  {carrierFreights.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Nenhum frete pendente para esta transportadora.</td></tr>
                  ) : (
                      carrierFreights.map(f => {
                          const isSelected = selectedFreightIds.includes(f.id);
                          return (
                              <tr key={f.id} onClick={() => actions.toggleFreightSelection(f.id)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                  <td className="px-6 py-4 text-center">
                                      <div className={`transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                                          {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-col">
                                          <span className="font-bold text-slate-800">{dateStr(f.date)}</span>
                                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                             <FileText size={10} /> Ped: {f.orderNumber}
                                          </span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-col">
                                          <span className="font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded w-fit text-xs border border-slate-200">{f.vehiclePlate}</span>
                                          <span className="text-xs mt-1 text-slate-500">{f.driverName}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-xs">
                                      {f.originCity} <span className="text-slate-300 px-1">➝</span> {f.destinationCity}
                                  </td>
                                  <td className="px-6 py-4 text-right">{currency(f.totalFreight)}</td>
                                  <td className="px-6 py-4 text-right text-emerald-600">{currency(f.paidValue)}</td>
                                  <td className="px-6 py-4 text-right font-black text-rose-600 text-base">{currency(f.balanceValue)}</td>
                              </tr>
                          );
                      })
                  )}
               </tbody>
            </table>
         </div>
      </div>

      <FreightPaymentModal 
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onConfirm={handleConfirmPayment}
        totalPending={totals.selectedDebt}
        recordDescription={`Baixa em Lote (${selectedFreightIds.length} fretes) - ${carrierName}`}
      />

    </div>
  );
};

export default CarrierFinancialDetails;
