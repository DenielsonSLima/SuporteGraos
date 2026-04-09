
import React from 'react';
import { ShoppingBag, TrendingUp, DollarSign, Calculator } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    editForm: Loading;
    isEditing: boolean;
    freightBase: 'origin' | 'destination';
    stats: any;
    onToggleFreightBase: (base: 'origin' | 'destination') => void;
    onUpdateForm: (data: Partial<Loading>) => void;
    currency: (val: number) => string;
}

const LoadingFinancialSummary: React.FC<Props> = ({
    editForm, isEditing, freightBase, stats,
    onToggleFreightBase, onUpdateForm, currency
}) => {
    const labelClass = 'text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest';
    const inputClass = 'w-full border-2 border-slate-200 bg-white px-3 py-1.5 text-slate-900 font-black focus:outline-none focus:border-blue-500 rounded-xl text-sm transition-all';

    const formatMask = (val: number | undefined) => {
        if (val === undefined || isNaN(val)) return '';
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val);
    };

    const handleMaskChange = (value: string, field: keyof Loading) => {
        const digits = value.replace(/\D/g, '');
        const numericValue = digits ? parseInt(digits) / 100 : 0;
        onUpdateForm({ [field]: numericValue });
    };

    return (
        <div className="space-y-2.5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
                {/* Financeiro Compra */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group transition-all">
                    <div className="flex items-center gap-2 mb-2.5 text-blue-700 border-b border-blue-50 pb-2 text-[10px] font-black uppercase tracking-widest">
                        <div className="p-1.5 bg-blue-50 rounded-lg group-hover:scale-110 transition-transform"><ShoppingBag size={14} /></div>
                        <h3>Financeiro Compra</h3>
                    </div>
                    <div className="space-y-2.5">
                        <div>
                            <span className={labelClass}>Unit. (SC)</span>
                            <p className="text-base font-black text-slate-800 tracking-tighter leading-none">{currency(editForm.purchasePricePerSc)}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 p-1.5 bg-slate-50/50 rounded-xl text-center">
                            <span className={labelClass}>Total a Pagar</span>
                            <p className="text-lg font-black text-blue-700 tracking-tighter leading-tight">{currency(stats.purVal)}</p>
                        </div>
                    </div>
                </div>

                {/* Financeiro Venda */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group transition-all">
                    <div className="flex items-center gap-2 mb-2.5 text-emerald-700 border-b border-emerald-50 pb-2 text-[10px] font-black uppercase tracking-widest">
                        <div className="p-1.5 bg-emerald-50 rounded-lg group-hover:scale-110 transition-transform"><TrendingUp size={14} /></div>
                        <h3>Financeiro Venda</h3>
                    </div>
                    <div className="space-y-2.5">
                        <div>
                            <span className={labelClass}>Unit. (SC)</span>
                            <p className="text-base font-black text-slate-800 tracking-tighter leading-none">{currency(editForm.salesPrice)}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 p-1.5 bg-slate-50/50 rounded-xl text-center">
                            <span className={labelClass}>Total {editForm.unloadWeightKg ? 'Faturado' : 'Projetado'}</span>
                            <p className="text-lg font-black text-emerald-700 tracking-tighter leading-tight">{currency(stats.salVal)}</p>
                        </div>
                    </div>
                </div>

                {/* Custo Logístico */}
                <div className={`p-3 rounded-xl border shadow-sm flex flex-col justify-between transition-all group ${isEditing ? 'bg-slate-950 border-rose-500/50' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-2.5 border-b border-rose-500/10 pb-2 text-[10px] font-black uppercase tracking-widest">
                        <div className={`flex items-center gap-2 ${isEditing ? 'text-rose-400' : 'text-rose-700'}`}>
                            <div className={`p-1.5 rounded-lg group-hover:scale-110 transition-transform ${isEditing ? 'bg-white/5' : 'bg-rose-50'}`}><DollarSign size={14} /></div>
                            <h3>Custo Logístico</h3>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                                <span className={labelClass}>Preço (TON)</span>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        className={`${inputClass} !bg-slate-900 !text-white !border-slate-800 !py-1 !px-2 !text-xs text-right`} 
                                        value={formatMask(editForm.freightPricePerTon)} 
                                        onChange={e => handleMaskChange(e.target.value, 'freightPricePerTon')} 
                                    />
                                ) : (
                                    <p className="text-sm font-black text-slate-800 tracking-tighter leading-none">{currency(editForm.freightPricePerTon)}</p>
                                )}
                            </div>

                            <div className={`p-1 rounded-xl flex items-center gap-1 shadow-inner flex-1 border ${isEditing ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => onToggleFreightBase('origin')}
                                    className={`flex-1 py-1 text-[8px] font-black uppercase rounded-lg transition-all cursor-pointer ${freightBase === 'origin' ? (isEditing ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-950 text-white shadow-lg') : 'text-slate-500 hover:bg-slate-200/50'}`}
                                >
                                    Ori
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onToggleFreightBase('destination')}
                                    className={`flex-1 py-1 text-[8px] font-black uppercase rounded-lg transition-all cursor-pointer ${freightBase === 'destination' ? (isEditing ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-950 text-white shadow-lg') : 'text-slate-500 hover:bg-slate-200/50'}`}
                                >
                                    Des
                                </button>
                            </div>
                        </div>

                        <div className={`pt-1.5 border-t ${isEditing ? 'border-white/10' : 'border-slate-100'} flex justify-between items-center`}>
                            <div className="flex items-center justify-between w-full">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Liquid. Frete:</span>
                                <p className={`text-base font-black tracking-tighter leading-none ${isEditing ? 'text-rose-400' : 'text-rose-700'}`}>{currency(stats.frVal)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resultado da Carga */}
            <div className={`p-4 rounded-xl border shadow-xl relative overflow-hidden group transition-all duration-500 hover:scale-[1.005] ${stats.profit >= 0 ? 'bg-slate-950 border-emerald-500/30' : 'bg-rose-950 border-rose-500/30'}`}>
                {/* Background Decoration */}
                <div className={`absolute -bottom-10 -right-10 opacity-5 transition-transform duration-700 group-hover:scale-150 ${stats.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <Calculator size={160} />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${stats.profit >= 0 ? 'bg-emerald-600 shadow-lg shadow-emerald-900/40' : 'bg-rose-600 shadow-lg shadow-rose-900/40'}`}>
                            <Calculator size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className={`font-black text-[9px] uppercase tracking-widest ${stats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>Resultado</h3>
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Consolidado da Operação</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 font-mono">
                        <div className="text-right">
                            <span className="text-[7px] text-white/20 font-black uppercase tracking-widest block mb-0.5">Receita</span>
                            <span className="text-xs font-bold text-white">{currency(stats.salVal)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[7px] text-white/20 font-black uppercase tracking-widest block mb-0.5">Custos</span>
                            <span className="text-xs font-bold text-rose-400">{currency(stats.totalCost)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6">
                        <div className="text-left">
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] block mb-0.5">Lucro Líquido</span>
                            <p className={`text-xl font-black tracking-tighter leading-none ${stats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {currency(stats.profit)}
                            </p>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase ${stats.profit >= 0 ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'bg-rose-600/20 text-rose-400 border border-rose-500/20'}`}>
                            {stats.margin.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingFinancialSummary;
