
import React from 'react';
import { Calculator, DollarSign, Info } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    formData: Partial<Loading>;
    onSetFormData: (data: Partial<Loading>) => void;
    currency: (val: number) => string;
}

const LoadingFormFreight: React.FC<Props> = ({ formData, onSetFormData, currency }) => {
    const labelClass = 'text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1 block';

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
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            {formData.isClientTransport && (
                <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center border-4 border-slate-100 rounded-2xl animate-in fade-in duration-500">
                    <div className="p-2.5 bg-white rounded-full shadow-xl mb-2 text-slate-200">
                        <DollarSign size={28} className="rotate-12" />
                    </div>
                    <span className="text-lg font-black text-slate-300 uppercase tracking-[0.2em]">Frete FOB</span>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                        <Info size={10} /> Despesa por conta do comprador
                    </p>
                </div>
            )}

            <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-3 uppercase tracking-tighter">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg shadow-inner"><Calculator size={16} /></div>
                4. Acerto de Logística (Frete)
            </h3>

            <div className="space-y-4">
                <div>
                    <label className={labelClass}>Valor Combinado (R$ / TON)</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors">
                            <DollarSign size={16} />
                        </div>
                        <input
                            type="text"
                            inputMode="numeric"
                            className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-2 pl-10 text-slate-900 font-black focus:border-rose-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-base shadow-sm text-right pr-4"
                            value={formatMask(formData.freightPricePerTon)}
                            onChange={e => handleMaskChange(e.target.value, 'freightPricePerTon')}
                            disabled={formData.isClientTransport}
                            placeholder="0,00"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center bg-rose-50/50 p-3 rounded-xl border border-rose-100 shadow-sm group-hover:bg-rose-50 transition-colors">
                    <div>
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-0.5">Custo Logístico Projetado</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-tight">Cálculo baseado no peso de origem</p>
                        </div>
                    </div>
                    <p className="text-xl font-black text-rose-700 tracking-tighter">
                        {currency(formData.totalFreightValue || 0)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoadingFormFreight;
