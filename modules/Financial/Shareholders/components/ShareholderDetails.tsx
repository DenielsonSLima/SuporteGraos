
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  Plus,
  Landmark,
  Pencil,
  Trash2
} from 'lucide-react';
import type { Shareholder, ShareholderTransaction } from '../../../../services/shareholderService';
import { useUpdateShareholderTransaction, useDeleteShareholderTransaction, useShareholderTotals } from '../../../../hooks/useShareholders';
import ShareholderCreditModal from './ShareholderCreditModal';
import FinancialPaymentModal, { PaymentData } from '../../components/modals/FinancialPaymentModal';
import ActionConfirmationModal from '../../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  shareholder: Shareholder;
  onBack: () => void;
  onGeneratePdf: () => void;
  onWithdraw: () => void; // Ação de Pagar (Baixar saldo)
  onAddCredit: () => void; // Ação de Adicionar (Aumentar saldo)
}

const ShareholderDetails: React.FC<Props> = ({ shareholder, onBack, onGeneratePdf, onWithdraw, onAddCredit }) => {
  const { addToast } = useToast();
  const updateTransaction = useUpdateShareholderTransaction();
  const deleteTransaction = useDeleteShareholderTransaction();
  
  // Estado para Edição
  const [editingTx, setEditingTx] = useState<ShareholderTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<ShareholderTransaction | null>(null);
  
  // Modais de Edição
  const [isEditCreditOpen, setIsEditCreditOpen] = useState(false);
  const [isEditDebitOpen, setIsEditDebitOpen] = useState(false);

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  
  // CORREÇÃO DE FUSO HORÁRIO
  const dateStr = (val: string) => {
    if (!val) return '-';
    // Se a data vier com time (ISO), converte. Se vier YYYY-MM-DD, divide.
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  // ✅ ZERO CÁLCULO FINANCEIRO NO FRONTEND — totais via RPC server-side
  const { data: shareholderTotals } = useShareholderTotals(shareholder.id);
  const totalCredits = shareholderTotals?.totalCredits ?? 0;
  const totalDebits = shareholderTotals?.totalDebits ?? 0;

  // -- AÇÕES DE EDIÇÃO E EXCLUSÃO --

  const handleEditClick = (tx: ShareholderTransaction) => {
    setEditingTx(tx);
    if (tx.type === 'credit') {
        setIsEditCreditOpen(true);
    } else {
        setIsEditDebitOpen(true);
    }
  };

  const handleConfirmEditCredit = async (data: { date: string; value: number; description: string }) => {
    if (!editingTx) return;
    
    await updateTransaction.mutateAsync({
        shareholderId: shareholder.id,
        transaction: {
            ...editingTx,
            date: data.date,
            value: data.value,
            description: data.description
        }
    });
    
    addToast('success', 'Lançamento Atualizado');
    setIsEditCreditOpen(false);
    setEditingTx(null);
    onBack(); // Refresh hack (component pai vai recarregar) - idealmente usar um onRefresh prop
    setTimeout(() => onBack(), 10); // Re-trigger visual refresh by forcing parent update via navigation toggle or reload
  };

  const handleConfirmEditDebit = async (data: PaymentData) => {
    if (!editingTx) return;
    
    await updateTransaction.mutateAsync({
        shareholderId: shareholder.id,
        transaction: {
            ...editingTx,
            date: data.date,
            value: data.amount,
            description: data.notes || editingTx.description,
            accountId: data.accountId
        }
    });

    addToast('success', 'Retirada Atualizada');
    setIsEditDebitOpen(false);
    setEditingTx(null);
    onBack(); // Refresh hack
    setTimeout(() => onBack(), 10);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    await deleteTransaction.mutateAsync({ shareholderId: shareholder.id, transactionId: deletingTx.id });
    addToast('success', 'Transação Excluída');
    setDeletingTx(null);
    onBack(); // Refresh hack
    setTimeout(() => onBack(), 10);
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300 pb-10">
      
      {/* HEADER & NAVIGATION */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="rounded-full bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span>Financeiro</span>
              <span>/</span>
              <span>Sócios</span>
              <span>/</span>
              <span className="text-slate-800 font-medium">Extrato</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{shareholder.name}</h1>
          </div>
        </div>

        <button 
          onClick={onGeneratePdf}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <Printer size={16} />
          Imprimir Extrato
        </button>
      </div>

      {/* SUMMARY / ACTIONS CARD */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          
          {/* Esquerda: Saldo */}
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Wallet size={18} />
              Saldo Atual (A Receber)
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className={`text-4xl font-bold ${shareholder.financial.currentBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {currency(shareholder.financial.currentBalance)}
              </h2>
              {shareholder.financial.currentBalance > 0 && (
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full uppercase">
                  Crédito Disponível
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-2">
              Este é o valor acumulado que a empresa deve ao sócio (Pro-labore, Lucros, etc).
            </p>
          </div>

          {/* Direita: Ações */}
          <div className="flex flex-col gap-3 border-l border-slate-100 pl-8">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Operações Rápidas</p>
            
            <button 
              onClick={onAddCredit}
              className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-800 px-4 py-3 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-200 text-emerald-800 p-2 rounded-lg group-hover:bg-emerald-300 transition-colors">
                  <ArrowUpCircle size={20} />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-sm">Adicionar Crédito</span>
                  <span className="block text-xs opacity-70">Lançar salário, lucro ou aporte</span>
                </div>
              </div>
              <Plus size={18} />
            </button>

            <button 
              onClick={onWithdraw}
              className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-800 px-4 py-3 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-rose-200 text-rose-800 p-2 rounded-lg group-hover:bg-rose-300 transition-colors">
                  <ArrowDownCircle size={20} />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-sm">Realizar Pagamento (Baixa)</span>
                  <span className="block text-xs opacity-70">Pagar ao sócio e descontar do saldo</span>
                </div>
              </div>
              <Landmark size={18} />
            </button>
          </div>

        </div>
      </div>

      {/* HISTORY TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-800">Extrato Detalhado</h3>
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-emerald-600 font-medium">Entradas: {currency(totalCredits)}</span>
            <span className="text-rose-600 font-medium">Saídas: {currency(totalDebits)}</span>
          </div>
        </div>

        {shareholder.financial.history.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="bg-slate-50 p-4 rounded-full inline-block mb-3">
              <FileText size={32} className="opacity-50" />
            </div>
            <p>Nenhuma movimentação registrada.</p>
            <p className="text-xs mt-1">Use os botões acima para lançar créditos ou pagamentos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 w-28">Data</th>
                  <th className="px-6 py-3 w-28 text-center">Tipo</th>
                  <th className="px-6 py-3">Descrição / Detalhes</th>
                  <th className="px-6 py-3 text-right w-32">Valor</th>
                  <th className="px-6 py-3 text-right w-32">Saldo</th>
                  <th className="px-6 py-3 text-center w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {shareholder.financial.history
                  .slice()
                  .reverse()
                  .map((t, idx) => {
                    // Calcula saldo acumulado até este ponto
                    const allTransactions = shareholder.financial.history.slice().reverse();
                    let accumulatedBalance = 0;
                    for (let i = 0; i <= idx; i++) {
                      accumulatedBalance += allTransactions[i].type === 'credit' ? allTransactions[i].value : -allTransactions[i].value;
                    }
                    
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 group transition-colors">
                        <td className="px-6 py-4 flex items-center gap-2 font-bold text-slate-700">
                          <Calendar size={14} className="text-slate-400" />
                          {dateStr(t.date)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {t.type === 'credit' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 uppercase tracking-wide">
                              <ArrowUpCircle size={10} /> Crédito
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-100 uppercase tracking-wide">
                              <ArrowDownCircle size={10} /> Débito
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">
                          <div className="flex flex-col gap-1">
                            <span>{t.description}</span>
                            {t.accountId && (
                              <span className="text-[10px] font-normal text-slate-400 flex items-center gap-1">
                                <Landmark size={10} />
                                Conta: {t.accountId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-right font-mono font-bold text-base ${t.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'credit' ? '+' : '-'}{currency(t.value)}
                        </td>
                        <td className={`px-6 py-4 text-right font-mono font-bold text-base ${accumulatedBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {currency(accumulatedBalance)}
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditClick(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                 <Pencil size={14} />
                              </button>
                              <button onClick={() => setDeletingTx(t)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Excluir">
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAIS DE AÇÃO */}
      {editingTx && isEditCreditOpen && (
          <ShareholderCreditModal 
            isOpen={isEditCreditOpen}
            onClose={() => setIsEditCreditOpen(false)}
            onConfirm={handleConfirmEditCredit}
            shareholderName={shareholder.name}
            initialData={{
                date: editingTx.date,
                value: editingTx.value,
                description: editingTx.description
            }}
          />
      )}

      {editingTx && isEditDebitOpen && (
          <FinancialPaymentModal 
             isOpen={isEditDebitOpen}
             onClose={() => setIsEditDebitOpen(false)}
             onConfirm={handleConfirmEditDebit}
             record={null}
             initialData={{ // Adaptando para o modal genérico
                 date: editingTx.date,
                 value: editingTx.value,
                 accountId: editingTx.accountId,
                 notes: editingTx.description
             }}
          />
      )}

      <ActionConfirmationModal 
         isOpen={!!deletingTx}
         onClose={() => setDeletingTx(null)}
         onConfirm={handleConfirmDelete}
         title="Excluir Lançamento?"
         description="Tem certeza que deseja excluir esta movimentação? O saldo do sócio será recalculado automaticamente."
         type="danger"
      />

    </div>
  );
};

export default ShareholderDetails;
