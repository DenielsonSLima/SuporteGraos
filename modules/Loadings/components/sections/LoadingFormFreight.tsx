
import React from 'react';
import { Calculator, DollarSign, Info } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    formData: Partial<Loading>;
    onSetFormData: (data: Partial<Loading>) => void;
    currency: (val: number) => string;
}

const LoadingFormFreight: React.FC<Props> = ({ formData, onSetFormData, currency }) => {
    const labelClass = 'text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1 block';

    return (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            {formData.isClientTransport && (
                <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center border-4 border-slate-100 rounded-[2rem] animate-in fade-in duration-500">
                    <div className="p-4 bg-white rounded-full shadow-xl mb-4 text-slate-200">
                        <DollarSign size={40} className="rotate-12" />
                    </div>
                    <span className="text-2xl font-black text-slate-300 uppercase tracking-[0.2em] italic">Frete FOB</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Info size={12} /> Despesa por conta do comprador
                    </p>
                </div>
            )}

            <h3 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-tighter italic">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl shadow-inner"><Calculator size={20} /></div>
                4. Acerto de Logística (Frete)
            </h3>

            <div className="space-y-6">
                <div>
                    <label className={labelClass}>Valor Combinado (R$ / TON)</label>
                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors">
                            <DollarSign size={22} />
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full rounded-2xl border-2 border-slate-100 bg-white px-5 py-4 pl-14 text-slate-900 font-black focus:border-rose-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-xl shadow-sm"
                            value={formData.freightPricePerTon}
                            onChange={e => onSetFormData({ freightPricePerTon: parseFloat(e.target.value) })}
                            disabled={formData.isClientTransport}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center bg-rose-50/50 p-6 rounded-[1.5rem] border border-rose-100 shadow-sm group-hover:bg-rose-50 transition-colors">
                    <div>
                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-1">Custo Logístico Projetado</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">Cálculo baseado no peso de origem</p>
                        </div>
                    </div>
                    <p className="text-3xl font-black text-rose-700 tracking-tighter italic">
                        {currency(formData.totalFreightValue || 0)}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoadingFormFreight;
