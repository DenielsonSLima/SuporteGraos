
import React, { useState, useMemo } from 'react';
import { CheckSquare, ChevronRight, CheckCircle2, Wallet, MinusCircle } from 'lucide-react';
import { FinancialRecord } from '../../types';
import FinancialPaymentModal, { PaymentData } from '../../components/modals/FinancialPaymentModal';
import { financialActionService } from '../../../../services/financialActionService';
import { ModuleId } from '../../../../types';

// SHARED COMPONENTS
import FinancialEntityCard from '../../components/shared/FinancialEntityCard';
import FinancialTable from '../../components/shared/FinancialTable';
import FinancialBatchFooter from '../../components/shared/FinancialBatchFooter';
import QuickPaymentViewModal from '../../components/modals/QuickPaymentViewModal';

interface Props {
  records: FinancialRecord[];
  onRefresh: () => void;
  viewMode: 'open' | 'all';
  searchTerm?: string;
  hideSearchBar?: boolean;
}

const UnifiedReceivableManager: React.FC<Props> = ({ records, onRefresh, viewMode, searchTerm: externalSearch, hideSearchBar }) => {
  const [internalSearch, setInternalSearch] = useState('');
  const searchTerm = externalSearch !== undefined ? externalSearch : internalSearch;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalType, setModalType] = useState<null | 'pay' | 'quick_view'>(null);
  const [selectedRecordForSinglePay, setSelectedRecordForSinglePay] = useState<FinancialRecord | null>(null);

  const currency = (val: number) => {
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
      map[entityKey].balance += (r.remainingValue || 0);
    });

    return Object.values(map).sort((a, b) => b.balance - a.balance);
  }, [records, searchTerm]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRowClick = (item: FinancialRecord) => {
    setSelectedRecordForSinglePay(item);
    setModalType('quick_view');
  };

  const handleNavigateToOrder = (e: React.MouseEvent, item: FinancialRecord) => {
    e.stopPropagation();
    const orderId = item.originId || item.id;
    (window as any).__pendingOrderNav = { moduleId: ModuleId.SALES_ORDER, orderId };
    window.dispatchEvent(new CustomEvent('app:navigate', {
      detail: { moduleId: ModuleId.SALES_ORDER, orderId }
    }));
  };

  const totalSelected = records
    .filter(r => selectedIds.includes(r.id))
    .reduce((acc, r) => acc + (r.remainingValue || 0), 0);

  const { addToast } = (window as any).useToast ? (window as any).useToast() : { addToast: (type: any, title: any, msg: any) => console.log(type, title, msg) };

  const handleConfirmPayment = async (data: PaymentData) => {
    try {
      if (selectedRecordForSinglePay) {
        await financialActionService.processRecord(selectedRecordForSinglePay.id, data, selectedRecordForSinglePay.subType);
      } else {
        for (const id of selectedIds) {
          const record = records.find(r => r.id === id);
          if (record) {
            const balance = record.remainingValue || 0;
            await financialActionService.processRecord(id, { ...data, amount: balance, discount: 0 }, record.subType);
          }
        }
      }
      setModalType(null);
      setSelectedIds([]);
      onRefresh();
      addToast('success', 'Operação Realizada', 'Recebimento registrado com sucesso!');
    } catch (err: any) {
      console.error('[UnifiedReceivableManager] Erro no recebimento:', err);
      addToast('error', 'Falha ao Registrar', err.message || 'Erro inesperado ao processar o recebimento.');
    }
  };

  const headers = [
    'Sel.',
    'Nº Venda',
    'Volume / Peso',
    'Preço SC',
    'Conta / Destino',
    'V. Faturado',
    'V. Recebido',
    'Saldo Aberto',
    ''
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-32">
      {groupedData.length === 0 ? (
        <div className="p-32 text-center text-slate-300 font-black uppercase italic border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
          Nenhum título {viewMode === 'open' ? 'em aberto' : 'encontrado'}.
        </div>
      ) : (
        groupedData.map((entity) => (
          <FinancialEntityCard
            key={entity.name}
            name={entity.name}
            type="sales"
            balance={entity.balance}
            currency={currency}
          >
            <FinancialTable headers={headers}>
              {entity.items.map((item: FinancialRecord) => {
                const totalLiquidated = item.paidValue + (item.discountValue || 0);
                const pendingBalance = item.remainingValue || 0;
                const isPaid = item.status === 'paid';
                const isSelected = selectedIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-all cursor-pointer group/row ${isSelected ? 'bg-emerald-50/40' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="px-8 py-5 text-center" onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}>
                      {!isPaid ? (
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 hover:border-emerald-400 text-transparent'}`}>
                          <CheckSquare size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 size={14} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-5 font-black text-emerald-600 italic tracking-tighter">
                      <button
                        onClick={(e) => handleNavigateToOrder(e, item)}
                        className="font-black text-emerald-600 hover:text-emerald-800 hover:underline transition-colors uppercase italic tracking-tighter text-xs"
                      >
                        #{item.orderNumber || item.description.replace('Venda ', '').replace('Pedido de Venda ', '')}
                      </button>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-col gap-1">
                        {item.weightKg && item.weightKg > 0 ? (
                          <>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-black text-slate-800 text-sm italic tracking-tighter">{item.weightKg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase">KG</span>
                            </div>
                            {item.totalSc && item.totalSc > 0 && (
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-slate-500 text-xs">{item.totalSc.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">SC</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[9px] font-black text-slate-200 uppercase italic tracking-widest">Sem pesagem</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      {item.unitPriceSc && item.unitPriceSc > 0 ? (
                        <div className="flex flex-col items-center gap-0.5 bg-emerald-50/50 px-3 py-1.5 rounded-xl border border-emerald-100/50">
                          <span className="font-black text-emerald-700 text-sm italic tracking-tight">{currency(item.unitPriceSc)}</span>
                          <span className="text-[7px] font-black text-emerald-500 uppercase tracking-[0.2em]">/ SACA</span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black text-slate-200 uppercase italic tracking-widest">—</span>
                      )}
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="inline-flex items-center gap-2 font-black text-indigo-700 uppercase text-[9px] bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 tracking-widest leading-none">
                        <Wallet size={12} className="text-indigo-400" />
                        <span className="truncate max-w-[120px]">{item.bankAccount || (isPaid ? 'CONCILIADO' : 'AGUARDANDO')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right font-black text-slate-400 tracking-tight">{currency(item.originalValue)}</td>
                    <td className="px-4 py-5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-black text-emerald-600 tracking-tight">{currency(item.paidValue)}</span>
                        {item.discountValue! > 0 && <span className="text-[8px] font-black text-amber-500 uppercase flex items-center gap-1"><MinusCircle size={10} /> Abatimento: {currency(item.discountValue!)}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-emerald-700 text-sm tracking-tighter italic">
                      {pendingBalance <= 0.05 ? <span className="text-emerald-500 flex items-center justify-end gap-1.5"><CheckCircle2 size={14} /> QUITADO</span> : currency(pendingBalance)}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <ChevronRight size={18} className="text-slate-200 group-hover/row:text-emerald-500 group-hover/row:translate-x-1 transition-all" />
                    </td>
                  </tr>
                );
              })}
            </FinancialTable>
          </FinancialEntityCard>
        ))
      )}

      {selectedIds.length > 0 && (
        <FinancialBatchFooter
          selectedCount={selectedIds.length}
          totalAmount={totalSelected}
          currency={currency}
          onConfirm={() => { setSelectedRecordForSinglePay(null); setModalType('pay'); }}
          onCancel={() => setSelectedIds([])}
          type="receivable"
        />
      )}

      <FinancialPaymentModal
        isOpen={modalType === 'pay'}
        onClose={() => setModalType(null)}
        onConfirm={handleConfirmPayment}
        record={selectedRecordForSinglePay}
        bulkTotal={selectedRecordForSinglePay ? undefined : totalSelected}
        bulkCount={selectedIds.length}
      />

      {selectedRecordForSinglePay && (
        <QuickPaymentViewModal
          isOpen={modalType === 'quick_view'}
          onClose={() => setModalType(null)}
          record={selectedRecordForSinglePay}
          onAddPayment={() => setModalType('pay')}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};

export default UnifiedReceivableManager;
