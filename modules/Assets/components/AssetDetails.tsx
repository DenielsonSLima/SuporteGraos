
import React, { useState } from 'react';
import {
    ArrowLeft, Calendar, DollarSign, Box, User,
    Trash2, PackageCheck, History, Landmark,
    Info, CheckCircle2, Calculator, ArrowUpRight,
    AlertTriangle, Pencil, RefreshCw, MoreHorizontal, Clock,
    Printer, Tag, StickyNote
} from 'lucide-react';
import { Asset } from '../types';
import { formatDateBR } from '../../../utils/dateUtils';
import { FinancialRecord } from '../../Financial/types';
import FinancialPaymentModal, { PaymentData } from '../../Financial/components/modals/FinancialPaymentModal';
import TransactionManagementModal from '../../Financial/components/modals/TransactionManagementModal';
import AssetSaleModal from './AssetSaleModal';
import AssetWriteOffModal from './AssetWriteOffModal';
import AssetDossierPdfModal from './AssetDossierPdfModal';
import ActionConfirmationModal from '../../../components/ui/ActionConfirmationModal';
import { useToast } from '../../../contexts/ToastContext';
import { useAssetDetailsOperations } from '../hooks/useAssetDetailsOperations';
import { useAssetSale } from '../hooks/useAssetSale';
import { useAssetDetailStats } from '../hooks/useAssetKPIs';

interface Props {
    asset: Asset;
    onBack: () => void;
    onDelete: (id: string) => void;
    onEdit: () => void;
    onRefresh: () => void;
}

const AssetDetails: React.FC<Props> = ({ asset, onBack, onDelete, onEdit, onRefresh }) => {
    const { addToast } = useToast();
    const { financialHistory, confirmPayment, updateRecord, deleteRecord, updateAsset } = useAssetDetailsOperations(asset.id);
    const assetSale = useAssetSale();

    // Modals Control
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);

    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // Forçar atualização do histórico local sem precisar sair e voltar
    const [refreshKey, setRefreshKey] = useState(0);

    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);

    // CORREÇÃO DE FUSO HORÁRIO
    const dateStr = (val: string) => formatDateBR(val);

    // KPIs do ativo — cálculos centralizados no hook (TODO: migrar para RPC)
    const stats = useAssetDetailStats(asset, financialHistory);

    // --- HANDLERS FINANCEIROS ---

    const handleOpenPayment = (record: FinancialRecord) => {
        setSelectedRecord(record);
        setIsPayModalOpen(true);
    };

    const handleOpenEdit = (record: FinancialRecord) => {
        setSelectedRecord(record);
        setIsEditModalOpen(true);
    };

    const handleConfirmPayment = (data: PaymentData) => {
        if (!selectedRecord) return;
        void confirmPayment(selectedRecord.id, data);
        setIsPayModalOpen(false);
        setSelectedRecord(null);
        setRefreshKey(prev => prev + 1);
        onRefresh();
        addToast('success', 'Recebimento Confirmado');
    };

    const handleUpdateRecord = (updated: any) => {
        if (!selectedRecord) return;
        void updateRecord(updated);
        setIsEditModalOpen(false);
        setSelectedRecord(null);
        setRefreshKey(prev => prev + 1);
        onRefresh();
        addToast('success', 'Lançamento Atualizado');
    };

    const handleDeleteRecord = (id: string) => {
        if (window.confirm('Deseja estornar este recebimento? O valor sairá do caixa e o saldo voltará a constar como aberto.')) {
            void deleteRecord(id);
            setIsEditModalOpen(false);
            setSelectedRecord(null);
            setRefreshKey(prev => prev + 1);
            onRefresh();
            addToast('warning', 'Lançamento Estornado');
        }
    };

    // --- HANDLERS PATRIMONIAIS ---

    const handleConfirmSale = (data: any) => {
        assetSale.mutate(
            {
                asset,
                buyerName: data.buyerName,
                buyerId: data.buyerId,
                saleDate: data.saleDate,
                saleValue: data.saleValue,
                installments: data.installments,
                firstDueDate: data.firstDueDate,
                notes: data.notes,
            },
            {
                onSuccess: (result) => {
                    addToast('success', 'Venda Registrada', `${result.installments} parcelas geradas no Contas a Receber.`);
                },
            }
        );
        setIsSaleModalOpen(false);
        setRefreshKey(prev => prev + 1);
        onRefresh();
    };

    const handleConfirmWriteOff = (data: { date: string; reason: string; notes: string }) => {
        void updateAsset({
            ...asset,
            status: 'write_off',
            writeOffDate: data.date,
            writeOffReason: data.reason,
            writeOffNotes: data.notes
        });
        setIsWriteOffModalOpen(false);
        setRefreshKey(prev => prev + 1);
        onRefresh();
        addToast('warning', 'Baixa Patrimonial Efetuada');
    };

    return (
        <div className="animate-in slide-in-from-right-4 duration-300 pb-20">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="rounded-full bg-white p-2 text-slate-500 shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">{asset.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${asset.status === 'sold' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                    asset.status === 'write_off' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                        'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                {asset.status === 'sold' ? 'Vendido' : asset.status === 'write_off' ? 'Baixado' : 'Ativo Imobilizado'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {asset.identifier || 'S/N'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsPdfModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-800 shadow-lg transition-all active:scale-95"
                    >
                        <Printer size={16} /> Exportar PDF
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase hover:bg-slate-50"
                    >
                        <Pencil size={16} /> Editar
                    </button>
                    <button
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl text-xs font-black uppercase hover:bg-rose-50"
                    >
                        <Trash2 size={16} /> Excluir
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* COLUNA ESQUERDA: INFOS DO BEM & AÇÕES */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2 flex items-center gap-2">
                            <Info size={16} className="text-blue-500" /> Ficha de Aquisição
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Custo de Aquisição</span>
                                <p className="font-black text-slate-800 text-lg">{currency(asset.acquisitionValue)}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Data da Compra</span>
                                <p className="font-bold text-slate-700">{dateStr(asset.acquisitionDate)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2 flex items-center gap-2">
                            <Tag size={16} className="text-indigo-500" /> Identificação e Observações
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Identificador</span>
                                <p className="font-bold text-slate-700 uppercase">{asset.identifier || 'Não informado'}</p>
                            </div>
                            <div className="flex gap-2">
                                <StickyNote size={16} className="text-slate-300 mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Descrição / Observações</span>
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                        {asset.description?.trim() || 'Nenhuma observação registrada.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AÇÕES PARA ATIVO ATIVO */}
                    {asset.status === 'active' && (
                        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl text-white">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 border-b border-white/10 pb-2">Gestão do Ativo</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => setIsSaleModalOpen(true)}
                                    className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl transition-all group shadow-lg shadow-emerald-900/20"
                                >
                                    <div className="text-left">
                                        <span className="block font-black text-sm uppercase italic">Vender Bem</span>
                                        <span className="text-[9px] opacity-70 font-bold uppercase">Gerar conta a receber</span>
                                    </div>
                                    <ArrowUpRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button
                                    onClick={() => setIsWriteOffModalOpen(true)}
                                    className="w-full flex items-center justify-between bg-slate-800 hover:bg-rose-900 text-white p-4 rounded-xl transition-all group"
                                >
                                    <div className="text-left">
                                        <span className="block font-black text-sm uppercase italic">Dar Baixa</span>
                                        <span className="text-[9px] opacity-70 font-bold uppercase">Remover por perda/avaria</span>
                                    </div>
                                    <AlertTriangle size={20} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}

                    {asset.status === 'sold' && (
                        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute right-0 top-0 opacity-10 p-4"><PackageCheck size={64} /></div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-6 border-b border-white/10 pb-2">Dados do Desinvestimento</h3>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Comprador</span>
                                    <p className="text-base font-black uppercase text-white">{asset.buyerName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Data da Venda</span>
                                        <p className="font-black text-white">{asset.saleDate ? dateStr(asset.saleDate) : '-'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Valor Negociado</span>
                                        <p className="font-black text-emerald-400 text-lg">{currency(asset.saleValue || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {asset.status === 'write_off' && (
                        <div className="bg-rose-950 rounded-2xl p-6 text-white shadow-xl">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-4 border-b border-white/10 pb-2">Detalhes da Baixa</h3>
                            <p className="text-xs font-bold text-rose-200 uppercase mb-1">Motivo: {asset.writeOffReason}</p>
                            <p className="text-[10px] text-slate-400">Data: {asset.writeOffDate ? dateStr(asset.writeOffDate) : '-'}</p>
                            <div className="mt-4 p-3 bg-black/30 rounded-xl italic text-[11px] border border-white/5 opacity-80">
                                "{asset.writeOffNotes}"
                            </div>
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: FINANCEIRO DA VENDA */}
                <div className="lg:col-span-8">
                    {asset.status !== 'sold' ? (
                        <div className="h-full flex flex-col items-center justify-center p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                            <Calculator size={48} className="text-slate-300 mb-4" />
                            <h3 className="font-black text-slate-400 uppercase tracking-widest text-lg">
                                {asset.status === 'write_off' ? 'Bem Baixado' : 'Bem em Uso'}
                            </h3>
                            <p className="text-sm text-slate-500 max-w-xs mt-2">
                                {asset.status === 'write_off' ? 'Este item foi retirado do inventário por perda ou avaria.' : 'Este ativo faz parte do patrimônio imobilizado da empresa.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Total Recebido</span>
                                    <p className="text-xl font-black text-emerald-600">{currency(stats.totalReceived)}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Saldo a Receber</span>
                                    <p className="text-xl font-black text-rose-600">{currency(stats.totalPending)}</p>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-2">Progresso do Pagamento</span>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${stats.progress}%` }}></div>
                                        </div>
                                        <span className="font-black text-slate-700 text-xs">{stats.progress.toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <History size={18} className="text-indigo-600" />
                                        <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-700">Cronograma de Recebimento</h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                        <RefreshCw size={12} /> Sincronizado com Financeiro
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className="bg-slate-50/50 border-b border-slate-100">
                                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                <th className="px-6 py-3">Vencimento</th>
                                                <th className="px-6 py-3">Data Baixa</th>
                                                <th className="px-6 py-3">Descrição da Parcela</th>
                                                <th className="px-6 py-3 text-right">Valor Parcela</th>
                                                <th className="px-6 py-3 text-right text-emerald-600">Recebido</th>
                                                <th className="px-6 py-3">Conta</th>
                                                <th className="px-6 py-3 text-center">Status</th>
                                                <th className="px-6 py-3 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 font-medium">
                                            {financialHistory.map(r => {
                                                const isPaid = r.status === 'paid';
                                                const isOverdue = !isPaid && new Date(r.dueDate) < new Date();

                                                return (
                                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <Calendar size={14} className="text-slate-300" />
                                                                <span className={isOverdue ? 'text-rose-600 font-black' : 'text-slate-700'}>{dateStr(r.dueDate)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {isPaid ? (
                                                                <span className="text-[10px] font-bold text-emerald-600 uppercase">{dateStr(r.settlementDate || r.issueDate)}</span>
                                                            ) : (
                                                                <span className="text-slate-300 italic text-[10px]">Pendente</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="font-bold text-slate-800 text-xs uppercase">{r.description}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-slate-500">
                                                            {currency(r.originalValue)}
                                                        </td>
                                                        <td className={`px-6 py-4 text-right font-black ${isPaid ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                            {currency(r.paidValue)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {isPaid ? (
                                                                <div className="flex items-center gap-1.5 font-black text-indigo-700 uppercase text-[9px]">
                                                                    <Landmark size={12} className="text-indigo-400" />
                                                                    <span className="truncate max-w-[100px]">{r.bankAccount || 'CAIXA'}</span>
                                                                </div>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded shadow-xs border ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                    isOverdue ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                        'bg-amber-50 text-amber-700 border-amber-100'
                                                                }`}>
                                                                {isPaid ? 'Liquidado' : isOverdue ? 'Vencido' : 'Pendente'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex justify-center gap-1">
                                                                {!isPaid ? (
                                                                    <button
                                                                        onClick={() => handleOpenPayment(r)}
                                                                        className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                        title="Dar Baixa (Receber)"
                                                                    >
                                                                        <DollarSign size={16} />
                                                                    </button>
                                                                ) : (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => handleOpenEdit(r)}
                                                                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                                                            title="Editar Lançamento"
                                                                        >
                                                                            <Pencil size={14} />
                                                                        </button>
                                                                        <div className="text-emerald-500 p-1.5"><CheckCircle2 size={18} /></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            <AssetSaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} asset={asset} onConfirmSale={handleConfirmSale} />
            <AssetWriteOffModal isOpen={isWriteOffModalOpen} onClose={() => setIsWriteOffModalOpen(false)} asset={asset} onConfirm={handleConfirmWriteOff} />
            <AssetDossierPdfModal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} asset={asset} financialHistory={financialHistory} />

            {isPayModalOpen && (
                <FinancialPaymentModal
                    isOpen={isPayModalOpen}
                    onClose={() => setIsPayModalOpen(false)}
                    onConfirm={handleConfirmPayment}
                    record={selectedRecord}
                />
            )}

            {isEditModalOpen && selectedRecord && (
                <TransactionManagementModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    transaction={selectedRecord as any}
                    onUpdate={handleUpdateRecord}
                    onDelete={handleDeleteRecord}
                    title="Editar Recebimento de Venda"
                />
            )}

            <ActionConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={() => { onDelete(asset.id); onBack(); }}
                title="Excluir Ativo permanentemente?"
                description={
                    <p>Você está prestes a remover <strong>{asset.name}</strong> do inventário. Esta ação é irreversível.</p>
                }
                type="danger"
            />
        </div>
    );
};

export default AssetDetails;
