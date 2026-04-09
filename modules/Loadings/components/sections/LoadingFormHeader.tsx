
import React from 'react';
import { Truck, X, ArrowRight } from 'lucide-react';
import { PurchaseOrder } from '../../PurchaseOrder/types';

interface Props {
    purchaseOrder: PurchaseOrder;
    customerName: string;
    onClose: () => void;
}

const LoadingFormHeader: React.FC<Props> = ({ purchaseOrder, customerName, onClose }) => {
    return (
        <div className="bg-slate-950 text-white px-6 py-5 flex justify-between items-center shrink-0 border-b border-white/5 shadow-2xl z-10">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 rounded-xl shadow-xl shadow-emerald-900/40 animate-in zoom-in-50 duration-500">
                    <Truck size={24} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tighter leading-none">Registrar Novo Carregamento</h2>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-black text-white/70 uppercase tracking-widest border border-white/5">
                            Origem: Ped. #{purchaseOrder.number}
                        </span>
                        <ArrowRight size={12} className="text-white/20" />
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-400/20">
                            {customerName || 'Aguardando Seleção de Destino'}
                        </span>
                    </div>
                </div>
            </div>
            <button
                onClick={onClose}
                className="hover:bg-white/10 p-2 rounded-xl transition-all active:scale-90 text-white/40 hover:text-white border border-transparent hover:border-white/10"
            >
                <X size={24} />
            </button>
        </div>
    );
};

export default LoadingFormHeader;
