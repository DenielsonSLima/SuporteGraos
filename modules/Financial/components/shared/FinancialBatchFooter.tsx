
import React from 'react';
import { DollarSign, TrendingUp, X } from 'lucide-react';

interface FinancialBatchFooterProps {
    selectedCount: number;
    totalAmount: number;
    currency: (val: number) => string;
    onConfirm: () => void;
    onCancel: () => void;
    type: 'payable' | 'receivable';
    isProcessing?: boolean;
}

const FinancialBatchFooter: React.FC<FinancialBatchFooterProps> = ({
    selectedCount, totalAmount, currency, onConfirm, onCancel, type, isProcessing
}) => {
    const isPayable = type === 'payable';
    const accentColor = isPayable ? 'rose' : 'emerald';
    const Icon = isPayable ? DollarSign : TrendingUp;

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-950 text-white p-6 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center gap-8 border border-white/5 animate-in slide-in-from-bottom-10 ring-8 ring-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-6 pr-8 md:border-r md:border-white/10">
                <div className={`p-4 bg-${accentColor}-600 rounded-2xl shadow-xl shadow-${accentColor}-900/40 relative group`}>
                    <Icon size={28} className="text-white group-hover:scale-110 transition-transform" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-white text-slate-950 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-slate-950">
                        {selectedCount}
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total para Baixa em Lote</p>
                    <p className={`text-3xl font-black text-${accentColor}-400 tracking-tighter italic`}>
                        {currency(totalAmount)}
                    </p>
                </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
                <button
                    onClick={onCancel}
                    className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors flex items-center gap-2 group"
                >
                    <X size={16} className="group-hover:rotate-90 transition-transform" /> Cancelar Seleção
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isProcessing}
                    className={`flex-1 md:flex-none px-12 py-4 bg-${accentColor}-600 hover:bg-${accentColor}-700 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50`}
                >
                    {isProcessing ? 'Processando...' : `Confirmar Baixa de ${selectedCount} Títulos`}
                </button>
            </div>
        </div>
    );
};

export default FinancialBatchFooter;
