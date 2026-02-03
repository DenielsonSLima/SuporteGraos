
import React, { useState, useMemo } from 'react';
import { User, DollarSign, Search, CheckSquare, ChevronRight, Calendar, CheckCircle2, TrendingUp, Wallet, MinusCircle } from 'lucide-react';
import { FinancialRecord, FinancialStatus } from '../../types';
import FinancialPaymentModal, { PaymentData } from '../../components/modals/FinancialPaymentModal';
import { financialActionService } from '../../../../services/financialActionService';
import { ModuleId } from '../../../../types';

interface Props {
  records: FinancialRecord[];
  onRefresh: () => void;
  viewMode: 'open' | 'all';
}

const UnifiedReceivableManager: React.FC<Props> = ({ records, onRefresh, viewMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedRecordForSinglePay, setSelectedRecordForSinglePay] = useState<FinancialRecord | null>(null);

  const currency = (val: number) => {
    // Normaliza valores extremamente baixos para zero absoluto
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  const dateStr = (val: string) => {
    if (!val) return '-';
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  const groupedData = useMemo(() => {
    const filtered = records.filter(r => 
      r.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const map: Record<string, any> = {};
    filtered.forEach(r => {
      const entityKey = r.entityName;
      if (!map[entityKey]) {
        map[entityKey] = { name: entityKey, items: [], total: 0, balance: 0 };
      }
      map[entityKey].items.push(r);
      map[entityKey].total += r.originalValue;
      
      // Correção de precisão: garante que o saldo nunca seja negativo por arredondamento de float
      const rawBalance = r.originalValue - r.paidValue - (r.discountValue || 0);
      const itemBalance = rawBalance < 0.01 ? 0 : rawBalance;
      map[entityKey].balance += itemBalance;
    });

    return Object.values(map).sort((a, b) => b.balance - a.balance);
  }, [records, searchTerm]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRowClick = (item: FinancialRecord) => {
    if (item.status === 'paid') return;
    setSelectedRecordForSinglePay(item);
    setIsPayModalOpen(true);
  };

  const handleNavigateToOrder = (e: React.MouseEvent, item: FinancialRecord) => {
    e.stopPropagation();
    const orderId = item.id.replace('so-', '');
    window.dispatchEvent(new CustomEvent('app:navigate', { 
      detail: { moduleId: ModuleId.SALES_ORDER, orderId } 
    }));
  };

  const totalSelected = records
    .filter(r => selectedIds.includes(r.id))
    .reduce((acc, r) => {
        const bal = r.originalValue - r.paidValue - (r.discountValue || 0);
        return acc + (bal < 0.01 ? 0 : bal);
    }, 0);

  const handleConfirmPayment = async (data: PaymentData) => {
    if (selectedRecordForSinglePay) {
      await financialActionService.processRecord(selectedRecordForSinglePay.id, data, selectedRecordForSinglePay.subType);
    } else {
      for (const id of selectedIds) {
        const record = records.find(r => r.id === id);
        if (record) {
           const rawBalance = record.originalValue - record.paidValue - (record.discountValue || 0);
           const balance = rawBalance < 0.01 ? 0 : rawBalance;
           await financialActionService.processRecord(id, { ...data, amount: balance, discount: 0 }, record.subType);
        }
      }
    }
    setIsPayModalOpen(false);
    setSelectedIds([]);
    onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="px-4 pt-4 relative max-w-md">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por cliente ou venda..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-sm focus:bg-white focus:border-emerald-500 focus:ring-0 outline-none transition-all font-bold"
        />
      </div>

      <div className="space-y-4 px-2 pb-4">
        {groupedData.length === 0 ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase italic border-2 border-dashed border-slate-100 rounded-3xl mx-2">
            Nenhum título {viewMode === 'open' ? 'em aberto' : 'encontrado'}.
          </div>
        ) : (
          groupedData.map((entity) => (
            <div key={entity.name} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group/card hover:border-emerald-200 transition-all">
              <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-slate-800 rounded-2xl border border-slate-700 text-emerald-400 shadow-inner">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-white uppercase tracking-tighter text-base italic">{entity.name}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo consolidado do cliente</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Total {viewMode === 'open' ? 'A Receber' : 'Pendente'}</span>
                  <span className="text-xl font-black text-emerald-400 tracking-tighter">{currency(entity.balance)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 font-black uppercase tracking-widest">
                      <th className="px-6 py-3 w-10 text-center">Sel.</th>
                      <th className="px-4 py-3">Nº Venda</th>
                      <th className="px-4 py-3">Volume / Peso</th>
                      <th className="px-4 py-3 text-center">Preço SC</th>
                      <th className="px-4 py-3 text-center">Conta / Destino</th>
                      <th className="px-4 py-3 text-right">V. Faturado</th>
                      <th className="px-4 py-3 text-right">V. Recebido</th>
                      <th className="px-6 py-3 text-right text-emerald-600">Saldo Aberto</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {entity.items.map((item: FinancialRecord) => {
                      const totalLiquidated = item.paidValue + (item.discountValue || 0);
                      const rawPending = item.originalValue - totalLiquidated;
                      const pendingBalance = rawPending < 0.01 ? 0 : rawPending;
                      const isPaid = item.status === 'paid';
                      
                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-emerald-50/30 transition-colors cursor-pointer group/row ${selectedIds.includes(item.id) ? 'bg-emerald-50/50' : ''}`}
                          onClick={() => handleRowClick(item)}
                        >
                          <td className="px-6 py-4 text-center" onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}>
                            {!isPaid ? (
                              <button className={`${selectedIds.includes(item.id) ? 'text-emerald-600' : 'text-slate-300'}`}>
                                <CheckSquare size={18} />
                              </button>
                            ) : <div className="w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-sm"><CheckCircle2 size={12}/></div>}
                          </td>
                          <td className="px-4 py-4">
                            <button 
                              onClick={(e) => handleNavigateToOrder(e, item)}
                              className="font-black text-emerald-600 hover:text-emerald-800 uppercase italic tracking-tighter text-xs"
                            >
                              #{item.description.replace('Venda ', '').replace('Pedido de Venda ', '')}
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              {item.weightKg && item.weightKg > 0 ? (
                                <>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="font-black text-slate-800 text-sm">{item.weightKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">KG</span>
                                  </div>
                                  {item.totalSc && item.totalSc > 0 && (
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="font-bold text-slate-600 text-xs">{item.totalSc.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                                      <span className="text-[8px] font-bold text-slate-400 uppercase">SC</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-400 uppercase italic">Sem pesagem</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {item.unitPriceSc && item.unitPriceSc > 0 ? (
                              <div className="flex flex-col items-center gap-0.5 bg-emerald-50/50 px-2 py-1.5 rounded-lg border border-emerald-100">
                                <span className="font-black text-emerald-700 text-sm">{currency(item.unitPriceSc)}</span>
                                <span className="text-[7px] font-black text-emerald-500 uppercase tracking-wider">/ SACA</span>
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-300 uppercase italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                             <div className="flex items-center justify-center gap-1.5 font-black text-indigo-700 uppercase text-[9px] bg-indigo-50/50 px-2 py-1 rounded-lg border border-indigo-100">
                               <Wallet size={12} className="text-indigo-400" />
                               <span className="truncate max-w-[120px]">{item.bankAccount || (isPaid ? 'CONCILIADO' : 'AGUARDANDO')}</span>
                             </div>
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-slate-500">{currency(item.originalValue)}</td>
                          <td className="px-4 py-4 text-right">
                             <div className="flex flex-col items-end">
                                <span className="font-black text-emerald-600">{currency(item.paidValue)}</span>
                                {item.discountValue! > 0 && <span className="text-[8px] font-black text-amber-600 uppercase flex items-center gap-0.5"><MinusCircle size={8}/> Abatimento: {currency(item.discountValue!)}</span>}
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-700 text-sm tracking-tighter">
                            {pendingBalance <= 0.05 ? <span className="text-emerald-500 flex items-center justify-end gap-1"><CheckCircle2 size={12}/> QUITADO</span> : currency(pendingBalance)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <ChevronRight size={16} className="text-slate-300 group-hover/row:text-emerald-500 group-hover/row:translate-x-1 transition-all" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-8 border border-slate-700 animate-in slide-in-from-bottom-4 ring-4 ring-black/10">
          <div className="flex items-center gap-4 pr-8 border-r border-slate-700">
             <div className="p-2.5 bg-emerald-600 rounded-2xl shadow-lg"><TrendingUp size={24} /></div>
             <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selecionados ({selectedIds.length})</p>
                <p className="text-2xl font-black text-emerald-400 tracking-tighter">{currency(totalSelected)}</p>
             </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setSelectedIds([])} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Cancelar</button>
             <button 
                onClick={() => { setSelectedRecordForSinglePay(null); setIsPayModalOpen(true); }} 
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95"
             >
                Baixar em Lote
             </button>
          </div>
        </div>
      )}

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

export default UnifiedReceivableManager;
