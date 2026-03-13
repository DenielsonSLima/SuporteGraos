
import React, { useMemo } from 'react';
import { MoreHorizontal, Calendar, CheckCircle2, AlertCircle, Clock, ArrowDownCircle, ArrowUpCircle, Landmark, MinusCircle } from 'lucide-react';
import { FinancialRecord, FinancialStatus } from '../types';
import type { Account } from '../../../services/accountsService';
import { useAccounts } from '../../../hooks/useAccounts';

interface Props {
  records: FinancialRecord[];
  type: 'payable' | 'receivable' | 'history';
  onPay?: (record: FinancialRecord) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelection?: (id: string) => void;
}

const statusConfig: Record<FinancialStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'Aberto', color: 'bg-amber-100 text-amber-700', icon: Clock },
  paid: { label: 'Liquidado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  overdue: { label: 'Atrasado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  partial: { label: 'Parcial', color: 'bg-blue-100 text-blue-700', icon: Clock },
};

const FinancialTable: React.FC<Props> = ({
  records,
  type,
  onPay,
  selectable = false,
  selectedIds = [],
  onToggleSelection
}) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const { data: accountsList = [] } = useAccounts();

  const getBankAccountName = (bankAccountId?: string, description?: string) => {
    if (!bankAccountId) {
      if (description && /abatimento|desconto|ajuste/i.test(description)) return 'Desconto';
      return '';
    }
    if (bankAccountId === 'ABATIMENTO' || bankAccountId === 'discount_virtual') return 'Desconto/Abatimento';
    if (bankAccountId === 'advance_virtual') return 'Adiantamento';
    const account = accountsList.find(a => a.id === bankAccountId) || accountsList.find(a => a.account_name === bankAccountId);
    return account?.account_name || bankAccountId;
  };

  // CORREÇÃO DE FUSO HORÁRIO
  const date = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  const isDebit = (record: FinancialRecord) => {
    // Para transferências, verificar a nota para saber se é saída (Débito) ou entrada (Crédito)
    if (record.subType === 'transfer') {
      return record.notes?.startsWith('Saída:') || false;
    }
    return ['purchase_order', 'freight', 'commission', 'admin', 'loan_taken', 'shareholder'].includes(record.subType || '');
  };

  const freightPartialLabels = useMemo(() => {
    const grouped = new Map<string, Array<{ id: string; date: string }>>();

    records.forEach((record) => {
      if (!record.id.startsWith('frtx:')) return;
      const parts = record.id.split(':');
      const commitmentId = parts[1];
      if (!commitmentId) return;
      const list = grouped.get(commitmentId) || [];
      list.push({ id: record.id, date: record.issueDate || record.dueDate || '' });
      grouped.set(commitmentId, list);
    });

    const labels = new Map<string, string>();
    grouped.forEach((list) => {
      if (list.length <= 1) return;

      const ordered = [...list].sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        if (da !== db) return da - db;
        return a.id.localeCompare(b.id);
      });

      ordered.forEach((item, index) => {
        labels.set(item.id, `Parcial ${index + 1}/${ordered.length}`);
      });
    });

    return labels;
  }, [records]);

  if (records.length === 0) {
    return (
      <div className="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 italic font-bold uppercase tracking-widest">
        Nenhum registro financeiro encontrado.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] text-slate-600 whitespace-nowrap border-collapse">
          <thead className="bg-slate-900 text-white font-black uppercase tracking-tighter">
            <tr>
              {selectable && <th className="px-4 py-3 w-10 text-center">Sel.</th>}
              <th className="px-4 py-3 border-r border-slate-800">Lançamento</th>
              <th className="px-4 py-3 border-r border-slate-800">Parceiro / Entidade</th>
              <th className="px-4 py-3 border-r border-slate-800">Ref. (Pedido/Mot/Placa)</th>
              <th className="px-4 py-3 border-r border-slate-800">Categoria</th>
              <th className="px-4 py-3 border-r border-slate-800">Conta Bancária</th>
              {type === 'history' ? (
                <th className="px-4 py-3 text-right border-r border-slate-800">Valor Movimentado</th>
              ) : (
                <>
                  <th className="px-4 py-3 text-right border-r border-slate-800">Bruto (A)</th>
                  <th className="px-4 py-3 text-right border-r border-slate-800">Deduções (B)</th>
                  <th className="px-4 py-3 text-right border-r border-slate-800">Líquido (A-B)</th>
                  <th className="px-4 py-3 text-right border-r border-slate-800">Liquidado</th>
                </>
              )}
              <th className="px-4 py-3 text-center border-r border-slate-800">Fluxo</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => {
              const debit = isDebit(record);
              const totalSettled = (record.paidValue || 0) + (record.discountValue || 0);
              const bankInfo = getBankAccountName(record.bankAccount, record.description) || (record.description && /abatimento|desconto|ajuste/i.test(record.description) ? 'Desconto' : record.status === 'paid' ? 'Ajuste Contábil' : 'Pendente');

              return (
                <tr key={record.id} className={`hover:bg-slate-50 transition-colors ${selectable && selectedIds.includes(record.id) ? 'bg-blue-50/50' : ''}`}>
                  {selectable && (
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        disabled={record.status === 'paid'}
                        checked={selectedIds.includes(record.id)}
                        onChange={() => onToggleSelection && onToggleSelection(record.id)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}

                  <td className="px-4 py-4 font-black text-slate-900">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {date(record.issueDate)}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-black text-slate-800 uppercase max-w-[180px] truncate">{record.entityName}</div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-blue-600">{record.description}</span>
                      {freightPartialLabels.get(record.id) && (
                        <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider">
                          {freightPartialLabels.get(record.id)}
                        </span>
                      )}
                      {record.driverName && <span className="text-[10px] text-slate-400 font-black uppercase">Mot: {record.driverName}</span>}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-block rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                      {record.category}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-600">
                      <Landmark size={12} className="text-slate-400" />
                      {bankInfo}
                    </div>
                  </td>

                  {type === 'history' ? (
                    <td className="px-4 py-4 text-right font-black text-emerald-600">
                      {currency(record.paidValue)}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-4 text-right font-bold text-slate-500">
                        {currency(record.originalValue)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-rose-400">
                        {record.deductionsAmount && record.deductionsAmount > 0 ? currency(record.deductionsAmount) : '-'}
                      </td>
                      <td className="px-4 py-4 text-right font-black text-slate-900 border-x border-slate-100 bg-slate-50/30">
                        {currency(record.netAmount || record.originalValue)}
                      </td>
                      <td className={`px-4 py-4 text-right font-black ${totalSettled > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                        <div className="flex flex-col items-end">
                          <span>{currency(totalSettled)}</span>
                          {record.discountValue! > 0 && record.paidValue! > 0 && (
                            <span className="text-[8px] text-amber-600 uppercase">Incl. Abatimento</span>
                          )}
                          {record.discountValue! > 0 && record.paidValue! === 0 && (
                            <span className="text-[8px] text-amber-600 uppercase flex items-center gap-0.5"><MinusCircle size={8} /> Abatimento Puro</span>
                          )}
                        </div>
                      </td>
                    </>
                  )}

                  <td className="px-4 py-4 text-center">
                    {debit ? (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-1 rounded-lg border border-rose-200 font-black uppercase text-[9px] tracking-widest">
                        <ArrowDownCircle size={12} /> Débito
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 font-black uppercase text-[9px] tracking-widest">
                        <ArrowUpCircle size={12} /> Crédito
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onPay && onPay(record)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-95"
                        title="Ver Ações / Detalhes"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(FinancialTable, (prevProps, nextProps) => {
  // Se os records têm tamanho diferente, precisa re-renderizar
  if (prevProps.records.length !== nextProps.records.length) return false;

  // Se os records estão na mesma ordem e com os mesmos IDs, não precisa re-renderizar
  const isSameOrder = prevProps.records.every((r, i) => r.id === nextProps.records[i]?.id);
  if (!isSameOrder) return false;

  // Compara outros props
  return prevProps.type === nextProps.type &&
    prevProps.selectable === nextProps.selectable &&
    JSON.stringify(prevProps.selectedIds) === JSON.stringify(nextProps.selectedIds);
});
