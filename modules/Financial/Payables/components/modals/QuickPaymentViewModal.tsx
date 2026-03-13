import React, { useState, useEffect } from 'react';
import { X, Wallet, Calendar, ArrowUpRight, ArrowDownLeft, Trash2, Edit2, AlertCircle, Plus } from 'lucide-react';
import { FinancialRecord, FinancialTransaction } from '../../../types';
import { financialTransactionService } from '../../../../../services/financial/financialTransactionService';
import { useAccounts } from '../../../../../hooks/useAccounts';
import { useToast } from '../../../../../contexts/ToastContext';
import ActionConfirmationModal from '../../../../../components/ui/ActionConfirmationModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    record: FinancialRecord;
    onAddPayment: () => void;
    onRefresh: () => void;
}

import ModalPortal from '../../../../../components/ui/ModalPortal';

const QuickPaymentViewModal: React.FC<Props> = ({ isOpen, onClose, record, onAddPayment, onRefresh }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const { data: accounts = [] } = useAccounts();
    const { addToast } = useToast();

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Usando o service robusto que busca via financial_links
            const subType = record.subType === 'purchase_order' ? 'purchase_order' :
                (record.subType === 'freight' ? 'loading' : 'standalone');

            const links = await financialTransactionService.getLinksByEntity(record.originId || record.id, subType as any);
            setHistory(links || []);
        } catch (error) {
            console.error('Error fetching payment history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, record]);

    if (!isOpen) return null;

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

    const handleDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            await financialTransactionService.delete(pendingDeleteId);
            addToast('success', 'Estorno realizado com sucesso!');
            fetchHistory();
            onRefresh();
        } catch (error) {
            addToast('error', 'Erro ao realizar estorno');
        } finally {
            setPendingDeleteId(null);
        }
    };

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                    {/* Header */}
                    <div className="bg-slate-900 px-8 py-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Detalhes do Título</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{record.description}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {/* KPIs Section */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor Total</span>
                                <span className="text-lg font-black text-slate-900 italic tracking-tighter">{currency(record.originalValue)}</span>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total Pago</span>
                                <span className="text-lg font-black text-emerald-700 italic tracking-tighter">{currency(record.paidValue + (record.discountValue || 0))}</span>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                                <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block mb-1">Saldo Aberto</span>
                                <span className="text-lg font-black text-rose-700 italic tracking-tighter">{currency(record.remainingValue || 0)}</span>
                            </div>
                        </div>

                        {/* History Section */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Wallet size={14} className="text-indigo-500" />
                                    Histórico de Movimentações
                                </h4>
                                <button
                                    onClick={onAddPayment}
                                    disabled={record.status === 'paid'}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                                >
                                    <Plus size={14} /> Novo Pagamento
                                </button>
                            </div>

                            <div className="bg-slate-50 rounded-[1.5rem] border border-slate-100 overflow-hidden max-h-[300px] overflow-y-auto">
                                {loading ? (
                                    <div className="p-12 text-center text-slate-400 animate-pulse font-black uppercase italic text-xs">Carregando histórico...</div>
                                ) : history.length === 0 ? (
                                    <div className="p-12 text-center text-slate-300 font-black uppercase italic text-[10px] tracking-widest">Nenhuma movimentação registrada.</div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100/50">
                                                <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                                                <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Conta</th>
                                                <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                                                <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {history.map((link) => {
                                                const tx = link.transaction;
                                                const account = accounts.find(a => a.id === tx.account_id);
                                                const isReversal = tx.description?.includes('[REV_OF:');

                                                return (
                                                    <tr key={tx.id} className={`hover:bg-white transition-all group ${isReversal ? 'opacity-50' : ''}`}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 text-[11px] font-black text-slate-700">
                                                                <Calendar size={12} className="text-slate-400" />
                                                                {formatDate(tx.transaction_date)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{account?.account_name || 'Conta Excluída'}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`text-[12px] font-black tracking-tighter italic ${tx.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {tx.type === 'IN' ? '+' : '-'} {currency(tx.amount)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                {!isReversal && (
                                                                    <button
                                                                        onClick={() => setPendingDeleteId(tx.id)}
                                                                        className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-all"
                                                                        title="Estornar"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <ActionConfirmationModal
                    isOpen={!!pendingDeleteId}
                    onClose={() => setPendingDeleteId(null)}
                    onConfirm={handleDelete}
                    title="Estornar Lançamento?"
                    description="Esta ação criará um lançamento reverso no financeiro para anular este valor. O saldo voltará a constar como aberto."
                    type="danger"
                />
            </div>
        </ModalPortal>
    );
};

export default QuickPaymentViewModal;
