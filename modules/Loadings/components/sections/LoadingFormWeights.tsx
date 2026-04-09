
import React from 'react';
import { Scale, Wheat, ShoppingBag } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    formData: Partial<Loading>;
    onSetFormData: (data: Partial<Loading>) => void;
    currency: (val: number) => string;
}

const LoadingFormWeights: React.FC<Props> = ({ formData, onSetFormData, currency }) => {
    const labelShadow = "text-[10px] font-black text-white/50 uppercase tracking-widest mb-1 block ml-1";

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
        onSetFormData({ [field]: numericValue });
    };

    return (
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-2xl border border-white/5 relative overflow-hidden group">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 -mt-5 -mr-5 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />

            <h3 className="text-sm font-black uppercase tracking-tighter mb-4 flex items-center gap-3 text-emerald-400">
                <div className="p-1.5 bg-emerald-400/10 rounded-lg border border-emerald-400/20"><Scale size={16} /></div>
                3. Pesagem de Origem & Custos
            </h3>

            <div className="space-y-4">
                <div>
                    <label className={labelShadow}>Peso Bruto Carregado (KG)</label>
                    <div className="relative group/input">
                        <input
                            type="text"
                            inputMode="numeric"
                            className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-2.5 text-xl font-black text-white focus:border-emerald-500 focus:bg-white/10 focus:outline-none transition-all placeholder:text-white/5 shadow-inner"
                            value={formatMask(formData.weightKg)}
                            onChange={e => handleMaskChange(e.target.value, 'weightKg')}
                            placeholder="0,00"
                            required
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Quilos</span>
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/40 group-focus-within/input:scale-110 transition-transform">
                                <Scale size={16} className="text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <Wheat size={14} className="text-amber-400" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Conversão SC</span>
                        </div>
                        <p className="text-lg font-black text-white tracking-tighter">
                            {formData.weightSc?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-white/30 ml-0.5">SC</span>
                        </p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <Scale size={14} className="text-blue-400" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Toneladas</span>
                        </div>
                        <p className="text-lg font-black text-white tracking-tighter">
                            {formData.weightTon?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-white/30 ml-0.5">TON</span>
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <label className={labelShadow}>Custo Unitário Compra (SC)</label>
                            <div className="relative w-40 group/cost">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="w-full bg-white/5 border-2 border-white/10 rounded-lg px-4 py-2 text-base font-black text-emerald-400 focus:border-emerald-500 focus:bg-white/10 outline-none transition-all text-right"
                                    value={formatMask(formData.purchasePricePerSc)}
                                    onChange={e => handleMaskChange(e.target.value, 'purchasePricePerSc')}
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase tracking-widest pointer-events-none">
                                    BRL
                                </div>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <div className="flex items-center gap-2 mb-0.5">
                                <ShoppingBag size={12} className="text-white/40" />
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Investimento Total Grão</span>
                            </div>
                            <p className="text-xl font-black text-white tracking-tighter glow-emerald">
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
