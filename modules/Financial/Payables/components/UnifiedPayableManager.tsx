
import React, { useState, useMemo } from 'react';
import { CheckSquare, ChevronRight, CheckCircle2, Wallet, MinusCircle } from 'lucide-react';
import { FinancialRecord } from '../../types';
// MODALS ESPECÍFICOS
import PurchasePaymentModal from '../../../PurchaseOrder/components/modals/PurchasePaymentModal';
import FreightPaymentModal from '../../../Logistics/components/modals/FreightPaymentModal';
import FinancialPaymentModal from '../../components/modals/FinancialPaymentModal';

import { financialActionService } from '../../../../services/financialActionService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useToast } from '../../../../contexts/ToastContext';
import { ModuleId } from '../../../../types';

// SHARED COMPONENTS
import FinancialEntityCard from '../../components/shared/FinancialEntityCard';
import FinancialTable from '../../components/shared/FinancialTable';
import FinancialBatchFooter from '../../components/shared/FinancialBatchFooter';
import QuickPaymentViewModal from './modals/QuickPaymentViewModal';

interface Props {
  records: FinancialRecord[];
  onRefresh: () => void;
  type: 'purchase' | 'freight' | 'commission';
  searchTerm?: string;
  hideSearchBar?: boolean;
}

const UnifiedPayableManager: React.FC<Props> = ({ records, onRefresh, type, searchTerm: externalSearch, hideSearchBar }) => {
  const [internalSearch, setInternalSearch] = useState('');
  const searchTerm = externalSearch !== undefined ? externalSearch : internalSearch;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: rawAccounts = [] } = useAccounts();
  const accountsList = rawAccounts.filter(a => a.is_active !== false);
  const { addToast } = useToast();

  const [modalType, setModalType] = useState<'purchase' | 'freight' | 'generic' | 'quick_view' | null>(null);
  const [selectedRecordForSinglePay, setSelectedRecordForSinglePay] = useState<FinancialRecord | null>(null);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const groupedData = useMemo(() => {
    const filtered = records.filter(r =>
      r.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchTerm.toLowerCase())
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
    (window as any).__pendingOrderNav = { moduleId: ModuleId.PURCHASE_ORDER, orderId };
    window.dispatchEvent(new CustomEvent('app:navigate', {
      detail: { moduleId: ModuleId.PURCHASE_ORDER, orderId }
    }));
  };

  const totalSelected = records
    .filter(r => selectedIds.includes(r.id))
    .reduce((acc, r) => acc + (r.remainingValue || 0), 0);

  const handleConfirmPayment = async (data: any) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (selectedRecordForSinglePay) {
        await financialActionService.processRecord(selectedRecordForSinglePay.id, data, selectedRecordForSinglePay.subType);
        addToast('success', 'Pagamento registrado com sucesso!');
      } else {
        for (const id of selectedIds) {
          const record = records.find(r => r.id === id);
          if (record) {
            const balance = record.remainingValue || 0;
            await financialActionService.processRecord(id, { ...data, amount: balance, discount: 0 }, record.subType);
          }
        }
        addToast('success', `${selectedIds.length} pagamentos registrados!`);
      }
    } catch (err) {
      addToast('error', 'Erro ao processar pagamento');
    } finally {
      setModalType(null);
      setSelectedRecordForSinglePay(null);
      setSelectedIds([]);
      setIsProcessing(false);
      onRefresh();
    }
  };

  const headers = [
    'Sel.',
    type === 'purchase' ? 'Nº Pedido' : 'Data Carga',
    type === 'purchase' ? 'Info / Cargas' : 'Transporte / Motorista',
    'Volume / Preço',
    'Valor Original',
    'Liquidado',
    'Saldo Aberto',
    ''
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-32">
      {groupedData.length === 0 ? (
        <div className="p-32 text-center text-slate-300 font-black uppercase italic border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
          Nenhum título localizado.
        </div>
      ) : (
        groupedData.map((entity) => (
          <FinancialEntityCard
            key={entity.name}
            name={entity.name}
            type={type}
            balance={entity.balance}
            currency={currency}
          >
            <FinancialTable headers={headers}>
              {entity.items.map((item: FinancialRecord) => {
                const totalLiquidated = item.paidValue + (item.discountValue || 0);
                const pendingBalance = item.remainingValue || 0;
                const isSelected = selectedIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-all cursor-pointer group/row ${isSelected ? 'bg-rose-50/40' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="px-8 py-5 text-center" onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}>
                      {item.status !== 'paid' ? (
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 hover:border-rose-400 text-transparent'}`}>
                          <CheckSquare size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 size={14} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-5 font-black text-slate-500 italic tracking-tighter">
                      {type === 'purchase' ? (
                        <button
                          onClick={(e) => handleNavigateToOrder(e, item)}
                          className="font-black text-indigo-600 hover:text-indigo-800 hover:underline transition-colors decoration-rose-500/30 underline-offset-4"
                        >
                          #{item.description.replace('Pedido de Compra ', '')}
                        </button>
                      ) : dateStr(item.issueDate)}
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-col">
                        {type === 'purchase' ? (
                          <>
                            <span className="font-black text-slate-800 uppercase text-[11px] leading-tight tracking-tight">Cargas vinculadas: {item.loadCount ?? 0}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest">{(item.totalTon ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} TON</span>
                          </>
                        ) : (
                          <>
                            <span className="font-black text-slate-800 uppercase text-[11px] leading-tight truncate max-w-[200px] italic">{item.entityName}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest">{item.driverName || 'Motorista Padrão'}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      {type === 'purchase' ? (
                        item.totalSc ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-slate-900 tracking-tighter text-sm italic">{item.totalSc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[9px] text-slate-400 uppercase font-bold not-italic">SC</span></span>
                            {item.unitPriceSc ? <span className="text-[10px] font-black text-indigo-500/70 uppercase tracking-widest">@ {currency(item.unitPriceSc)}</span> : null}
                          </div>
                        ) : <span className="text-slate-200 uppercase font-black text-[9px]">Não Inf.</span>
                      ) : (
                        item.weightKg ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-slate-900 tracking-tighter text-sm italic">{(item.weightKg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[9px] text-slate-400 uppercase font-bold not-italic">TON</span></span>
                            {item.unitPriceTon ? <span className="text-[10px] font-black text-indigo-500/70 uppercase tracking-widest">@ {currency(item.unitPriceTon)}</span> : null}
                          </div>
                        ) : <span className="text-slate-200 uppercase font-black text-[9px]">Não Inf.</span>
                      )}
                    </td>
                    <td className="px-4 py-5 text-right font-black text-slate-400 tracking-tight">{currency(item.originalValue)}</td>
                    <td className="px-4 py-5 text-right">
                      <span className={`font-black tracking-tight ${totalLiquidated > 0 ? 'text-emerald-500' : 'text-slate-200'}`}>{currency(totalLiquidated)}</span>
                      {(item.discountValue || 0) > 0 && <span className="block text-[8px] font-black text-amber-500 uppercase flex justify-end gap-1 items-center mt-1"><MinusCircle size={10} /> C/ Abatimentos</span>}
                    </td>
                    <td className="px-8 py-5 text-right font-black text-rose-500 text-sm italic tracking-tighter">
                      {pendingBalance <= 0.01 ? <CheckCircle2 size={16} className="text-emerald-500 ml-auto" /> : currency(pendingBalance)}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <ChevronRight size={18} className="text-slate-200 group-hover/row:text-rose-400 group-hover/row:translate-x-1 transition-all" />
                    </td>
                  </tr>
                );
              })}
            </FinancialTable>
          </FinancialEntityCard>
        ))
      )}

      {selectedRecordForSinglePay && (
        <QuickPaymentViewModal
          isOpen={modalType === 'quick_view'}
          onClose={() => { setModalType(null); setSelectedRecordForSinglePay(null); }}
          record={selectedRecordForSinglePay}
          onAddPayment={() => {
            if (selectedRecordForSinglePay.subType === 'purchase_order') setModalType('purchase');
            else if (selectedRecordForSinglePay.subType === 'freight') setModalType('freight');
            else setModalType('generic');
          }}
          onRefresh={onRefresh}
        />
      )}

      {selectedIds.length > 0 && (
        <FinancialBatchFooter
          selectedCount={selectedIds.length}
          totalAmount={totalSelected}
          currency={currency}
          onConfirm={() => setModalType('generic')}
          onCancel={() => setSelectedIds([])}
          type="payable"
          isProcessing={isProcessing}
        />
      )}

      <PurchasePaymentModal
        isOpen={modalType === 'purchase'}
        onClose={() => { setModalType(null); setSelectedRecordForSinglePay(null); }}
        onConfirm={handleConfirmPayment}
        totalPending={selectedRecordForSinglePay ? (selectedRecordForSinglePay.remainingValue || 0) : 0}
        recordDescription={selectedRecordForSinglePay?.description}
        isProcessing={isProcessing}
      />

      <FreightPaymentModal
        isOpen={modalType === 'freight'}
        onClose={() => { setModalType(null); setSelectedRecordForSinglePay(null); }}
        onConfirm={handleConfirmPayment}
        totalPending={selectedRecordForSinglePay ? (selectedRecordForSinglePay.remainingValue || 0) : 0}
        recordDescription={selectedRecordForSinglePay?.description}
        isProcessing={isProcessing}
      />

      <FinancialPaymentModal
        isOpen={modalType === 'generic'}
        onClose={() => { setModalType(null); setSelectedRecordForSinglePay(null); }}
        onConfirm={handleConfirmPayment}
        record={selectedRecordForSinglePay}
        bulkTotal={totalSelected > 0 ? totalSelected : undefined}
      />
    </div>
  );
};

export default UnifiedPayableManager;