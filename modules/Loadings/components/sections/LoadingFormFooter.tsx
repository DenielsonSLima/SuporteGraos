
import React from 'react';
import { Save, TrendingUp, DollarSign } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    formData: Partial<Loading>;
    isSubmitting: boolean;
    currency: (val: number) => string;
    onClose: () => void;
}

const LoadingFormFooter: React.FC<Props> = ({ formData, isSubmitting, currency, onClose }) => {
    const result = (formData.totalSalesValue || 0) - ((formData.totalPurchaseValue || 0) + (formData.totalFreightValue || 0));
    const isPositive = result >= 0;

    return (
        <div className="bg-white border-t border-slate-200 px-8 py-6 shrink-0 flex flex-col md:flex-row justify-between items-center gap-6 shadow-[0_-15px_30px_rgba(0,0,0,0.03)] z-10">
            <div className="flex gap-6 items-center w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                <div className="shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <DollarSign size={12} className="text-emerald-500" /> Valor total da venda
                    </p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">{currency(formData.totalSalesValue || 0)}</p>
                </div>

                <div className="w-px h-8 bg-slate-100 hidden sm:block" />

                <div className="shrink-0 bg-slate-900 rounded-xl px-4 py-2 border border-slate-800 shadow-lg group">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5 flex items-center gap-2">
                        <TrendingUp size={12} className={isPositive ? 'text-emerald-400' : 'text-rose-400'} /> Resultado do Carregamento
                    </p>
                    <p className={`text-lg font-black tracking-tighter ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {currency(result)}
                    </p>
                </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 md:flex-none px-6 py-3 rounded-xl border-2 border-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 hover:border-slate-200 active:scale-95 transition-all"
                >
                    Descartar
                </button>
                <button
                    form="loading-form"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-slate-950 text-white font-black shadow-2xl shadow-slate-900/40 hover:bg-slate-800 flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Save size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                            Confirmar Carregamento
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default LoadingFormFooter;
