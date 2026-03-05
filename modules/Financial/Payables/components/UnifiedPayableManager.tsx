import React, { useState, useMemo } from 'react';
import { Filter, Calendar, User, DollarSign, X, CheckSquare, Search, AlertTriangle, ChevronDown, ChevronRight, Truck, Package, CheckCircle2, Scale, Wallet, MinusCircle } from 'lucide-react';
import { FinancialRecord, FinancialStatus } from '../../types';
// MODALS ESPECÍFICOS
import PurchasePaymentModal from '../../../PurchaseOrder/components/modals/PurchasePaymentModal';
import FreightPaymentModal from '../../../Logistics/components/modals/FreightPaymentModal';
import FinancialPaymentModal, { PaymentData } from '../../components/modals/FinancialPaymentModal'; // Mantém para despesas administrativas

import { financialActionService } from '../../../../services/financialActionService';
import { useAccounts } from '../../../../hooks/useAccounts';
import { useToast } from '../../../../contexts/ToastContext';
import { ModuleId } from '../../../../types';

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
  // Contas bancárias via TanStack Query (cache + realtime)
  const { data: rawAccounts = [] } = useAccounts();
  const accountsList = rawAccounts.filter(a => a.is_active !== false);
  const { addToast } = useToast();

  // Controle de qual modal abrir
  const [modalType, setModalType] = useState<'purchase' | 'freight' | 'generic' | null>(null);
  const [selectedRecordForSinglePay, setSelectedRecordForSinglePay] = useState<FinancialRecord | null>(null);

  // Grouping Helpers
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  // Consolidação por Parceiro (Header do Accordion)
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
    if (item.status === 'paid') return;
    setSelectedRecordForSinglePay(item);

    // Define qual modal abrir
    if (item.subType === 'purchase_order') setModalType('purchase');
    else if (item.subType === 'freight') setModalType('freight');
    else setModalType('generic');
  };

  const handleNavigateToOrder = (e: React.MouseEvent, item: FinancialRecord) => {
    e.stopPropagation();
    const orderId = item.originId || item.id;
    // Store pending navigation so the target module can pick it up on mount
    (window as any).__pendingOrderNav = { moduleId: ModuleId.PURCHASE_ORDER, orderId };
    window.dispatchEvent(new CustomEvent('app:navigate', {
      detail: { moduleId: ModuleId.PURCHASE_ORDER, orderId }
    }));
  };

  // Cálculo do total selecionado para pagamento em lote (Saldo Pendente)
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
        // Lógica de lote
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
      // SEMPRE fecha o modal e reseta o estado, mesmo em caso de erro
      setModalType(null);
      setSelectedRecordForSinglePay(null);
      setSelectedIds([]);
      setIsProcessing(false);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">

      {!hideSearchBar && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por parceiro ou pedido..."
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-0 outline-none shadow-sm font-medium"
          />
        </div>
      )}

      <div className="space-y-4">
        {groupedData.length === 0 ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase italic border-2 border-dashed rounded-2xl">Nenhum título encontrado.</div>
        ) : (
          groupedData.map((entity) => (
            <div key={entity.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Entity Header */}
              <div className="bg-slate-900 px-6 py-4 border-b border-slate-700 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-primary-400 shadow-sm">
                    {type === 'freight' ? <Truck size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <h3 className="font-black text-white uppercase tracking-tight text-base italic">{entity.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo pendente com o parceiro</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Dívida Consolidada</span>
                  <span className="text-xl font-black text-emerald-400">{currency(entity.balance)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-white border-b border-slate-100">
                    <tr className="text-slate-400 font-black uppercase tracking-tighter">
                      <th className="px-6 py-2 w-10 text-center">Sel.</th>
                      <th className="px-4 py-2">{type === 'purchase' ? 'Nº Pedido' : 'Data Carga'}</th>
                      <th className="px-4 py-2">{type === 'purchase' ? 'Info / Cargas' : 'Transporte / Motorista'}</th>
                      <th className="px-4 py-2 text-right">Volume / Preço</th>
                      <th className="px-4 py-2 text-center">Conta / Status</th>
                      <th className="px-4 py-2 text-right">Valor Original</th>
                      <th className="px-4 py-2 text-right">Liquidado</th>
                      <th className="px-6 py-2 text-right text-rose-600">Saldo Aberto</th>
                      <th className="px-6 py-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {entity.items.map((item: FinancialRecord) => {
                      const totalLiquidated = item.paidValue + (item.discountValue || 0);
                      const pendingBalance = item.remainingValue || 0;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-50' : ''}`}
                          onClick={() => handleRowClick(item)}
                        >
                          <td className="px-6 py-3 text-center" onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}>
                            {item.status !== 'paid' ? (
                              <button className={`${selectedIds.includes(item.id) ? 'text-blue-600' : 'text-slate-300'}`}>
                                <CheckSquare size={18} />
                              </button>
                            ) : <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto"><CheckCircle2 size={12} /></div>}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-500">
                            {type === 'purchase' ? (
                              <button
                                onClick={(e) => handleNavigateToOrder(e, item)}
                                className="font-black text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                title="Ver Detalhes do Pedido"
                              >
                                #{item.description.replace('Pedido de Compra ', '')}
                              </button>
                            ) : dateStr(item.issueDate)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              {type === 'purchase' ? (
                                <>
                                  <span className="font-black text-slate-800 uppercase text-[11px] leading-tight">Cargas vinculadas: {item.loadCount ?? 0}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Total: {(item.totalTon ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TON</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-black text-slate-800 uppercase text-[11px] leading-tight truncate max-w-[180px]">{item.entityName}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.driverName || 'Motorista não inf.'}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {type === 'purchase' ? (
                              item.totalSc ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-black text-slate-900">{item.totalSc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] text-slate-400 uppercase font-bold">SC</span></span>
                                  {item.unitPriceSc ? <span className="text-[10px] font-bold text-blue-600 italic">@ {currency(item.unitPriceSc)}</span> : null}
                                </div>
                              ) : <span className="text-slate-300 italic">N/D</span>
                            ) : (
                              item.weightKg ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-black text-slate-900">{(item.weightKg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] text-slate-400 uppercase font-bold">TON</span></span>
                                  {item.unitPriceTon ? (
                                    <span className="text-[10px] font-bold text-blue-600 italic">@ {currency(item.unitPriceTon)}</span>
                                  ) : null}
                                </div>
                              ) : <span className="text-slate-300 italic">N/D</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 font-bold text-indigo-600">
                              <Wallet size={12} className="text-slate-400" />
                              {(() => {
                                if (!item.bankAccount) return item.status === 'paid' ? '—' : 'Pendente';
                                if (item.bankAccount === 'ABATIMENTO' || item.bankAccount === 'discount_virtual') return 'Desconto';
                                const acc = accountsList.find(a => a.id === item.bankAccount) || accountsList.find(a => a.account_name === item.bankAccount);
                                return acc?.account_name || item.bankAccount;
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-500">{currency(item.originalValue)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold ${totalLiquidated > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{currency(totalLiquidated)}</span>
                            {(item.discountValue || 0) > 0 && <span className="block text-[8px] font-black text-amber-600 uppercase flex justify-end gap-0.5 items-center"><MinusCircle size={8} /> C/ Abatimentos</span>}
                          </td>
                          <td className="px-6 py-3 text-right font-black text-rose-600 text-[12px]">{currency(pendingBalance)}</td>
                          <td className="px-6 py-3 text-center">
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl flex items-center gap-8 border border-slate-700 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 pr-8 border-r border-slate-700">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-lg"><DollarSign size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total selecionado ({selectedIds.length} itens)</p>
              <p className="text-2xl font-black text-emerald-400 tracking-tighter">{currency(totalSelected)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setSelectedIds([])} className="px-6 py-3 text-sm font-black uppercase text-slate-400 hover:text-white transition-colors">Cancelar</button>
            <button onClick={() => setModalType('generic')} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95">Efetuar Baixa Única</button>
          </div>
        </div>
      )}

      {/* RENDERIZAÇÃO CONDICIONAL DOS MODAIS ESPECÍFICOS */}

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