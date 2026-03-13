
import React from 'react';
import { User, Truck, TrendingUp, DollarSign } from 'lucide-react';

interface FinancialEntityCardProps {
    name: string;
    type: 'purchase' | 'freight' | 'commission' | 'sales';
    balance: number;
    currency: (val: number) => string;
    children?: React.ReactNode;
}

const FinancialEntityCard: React.FC<FinancialEntityCardProps> = ({ name, type, balance, currency, children }) => {
    const isPayable = type !== 'sales';
    const accentColor = isPayable ? 'rose' : 'emerald';
    const Icon = type === 'freight' ? Truck : (type === 'sales' ? TrendingUp : User);

    return (
        <div className={`bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden group/card hover:border-${accentColor}-200 transition-all duration-500`}>
            {/* Entity Header */}
            <div className="bg-slate-950 px-8 py-5 flex justify-between items-center text-white relative overflow-hidden group">
                {/* Subtle Background Glow */}
                <div className={`absolute -right-4 -bottom-4 w-32 h-32 bg-${accentColor}-500/10 rounded-full blur-3xl group-hover:bg-${accentColor}-500/20 transition-all duration-700`} />

                <div className="flex items-center gap-5 relative z-10">
                    <div className={`p-3 bg-slate-900 rounded-2xl border border-white/5 text-${accentColor}-400 shadow-2xl group-hover:scale-110 transition-transform duration-500`}>
                        <Icon size={24} />
                    </div>
                    <div>
                        <h3 className="font-black text-white uppercase tracking-tighter text-lg italic leading-none">{name}</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full bg-${accentColor}-500 animate-pulse`} />
                            Saldo {isPayable ? 'pendente com o' : 'consolidado do'} parceiro
                        </p>
                    </div>
                </div>

                <div className="text-right relative z-10">
                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest">
                        {isPayable ? 'Dívida Consolidada' : 'Total a Receber'}
                    </span>
                    <span className={`text-2xl font-black text-${accentColor}-400 tracking-tighter italic`}>
                        {currency(balance)}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
                {children}
            </div>
        </div>
    );
};

export default FinancialEntityCard;
