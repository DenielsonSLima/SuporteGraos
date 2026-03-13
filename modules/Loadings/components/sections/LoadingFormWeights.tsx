
import React from 'react';
import { Scale, Wheat, ShoppingBag } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    formData: Partial<Loading>;
    onSetFormData: (data: Partial<Loading>) => void;
    currency: (val: number) => string;
}

const LoadingFormWeights: React.FC<Props> = ({ formData, onSetFormData, currency }) => {
    const labelShadow = "text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 block ml-1";

    return (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border border-white/5 relative overflow-hidden group">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />

            <h3 className="text-sm font-black uppercase tracking-tighter italic mb-8 flex items-center gap-3 text-emerald-400">
                <div className="p-2 bg-emerald-400/10 rounded-xl border border-emerald-400/20"><Scale size={20} /></div>
                3. Pesagem de Origem & Custos
            </h3>

            <div className="space-y-8">
                <div>
                    <label className={labelShadow}>Peso Bruto Carregado (KG)</label>
                    <div className="relative group/input">
                        <input
                            type="number"
                            className="w-full bg-white/5 border-2 border-white/10 rounded-[1.5rem] px-6 py-5 text-4xl font-black text-white focus:border-emerald-500 focus:bg-white/10 focus:outline-none transition-all placeholder:text-white/5 shadow-inner"
                            value={formData.weightKg || ''}
                            onChange={e => onSetFormData({ weightKg: parseFloat(e.target.value) })}
                            placeholder="0.00"
                            required
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <span className="text-xs font-black text-white/20 uppercase tracking-widest">Quilos</span>
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/40 group-focus-within/input:scale-110 transition-transform">
                                <Scale size={20} className="text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Wheat size={14} className="text-amber-400" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Conversão SC</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tighter italic">
                            {formData.weightSc?.toLocaleString()} <span className="text-xs text-white/30 not-italic ml-1">SC</span>
                        </p>
                    </div>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <Scale size={14} className="text-blue-400" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Toneladas</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tighter italic">
                            {formData.weightTon?.toLocaleString(undefined, { minimumFractionDigits: 3 })} <span className="text-xs text-white/30 not-italic ml-1">TON</span>
                        </p>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <label className={labelShadow}>Custo Unitário Compra (SC)</label>
                            <div className="relative w-48 group/cost">
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-lg font-black text-emerald-400 focus:border-emerald-500 focus:bg-white/10 outline-none transition-all"
                                    value={formData.purchasePricePerSc}
                                    onChange={e => onSetFormData({ purchasePricePerSc: parseFloat(e.target.value) })}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase tracking-widest pointer-events-none">
                                    BRL
                                </div>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <div className="flex items-center gap-2 mb-1">
                                <ShoppingBag size={14} className="text-white/40" />
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Investimento Total Grão</span>
                            </div>
                            <p className="text-3xl font-black text-white tracking-tighter italic glow-emerald">
                                {currency(formData.totalPurchaseValue || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .glow-emerald {
          text-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }
      `}} />
        </div>
    );
};

export default LoadingFormWeights;
