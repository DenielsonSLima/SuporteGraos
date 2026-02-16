
import React from 'react';
import { Handshake, Wallet, Pencil, Trash2, Coins, Landmark, MinusCircle } from 'lucide-react';
import { OrderTransaction } from '../../types';

interface Props {
  brokerName: string;
  commissionPerSc: number;
  totalDue: number;
  transactions: OrderTransaction[];
  onAddPayment: () => void;
  onEditTx: (tx: OrderTransaction) => void;
  onDeleteTx: (id: string) => void;
}

const OrderBrokerCard: React.FC<Props> = ({ 
  brokerName, 
  commissionPerSc, 
  totalDue, 
  transactions, 
  onAddPayment, 
  onEditTx, 
  onDeleteTx 
}) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const brokerTxs = transactions.filter(t => t.type === 'commission');
  
  // CORREÇÃO: Soma valor (dinheiro) + descontos para abater o total devido
  const totalPaid = brokerTxs.reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);
  const balance = Math.max(0, totalDue - totalPaid);

  return (
    <div className="bg-white rounded-2xl border-2 border-violet-100 shadow-sm overflow-hidden w-full animate-in slide-in-from-bottom-4">
      <div className="bg-violet-50 px-6 py-4 border-b border-violet-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-violet-800">
          <Handshake size={20} />
          <h3 className="font-black uppercase text-[10px] tracking-widest text-violet-900">
            Controle de Comissão: <span className="text-violet-600">{brokerName}</span>
          </h3>
        </div>
        <button 
          onClick={onAddPayment} 
          className="text-[10px] bg-violet-600 text-white px-4 py-2 rounded-xl font-black uppercase shadow-lg transition-all active:scale-95 hover:bg-violet-700"
        >
          Pagar Corretagem
        </button>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <span className="text-[9px] text-slate-400 font-black uppercase">Acordado/SC</span>
            <p className="text-lg font-black text-slate-800">{currency(commissionPerSc)}</p>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-black uppercase">Total Devido (Carregado)</span>
            <p className="text-lg font-black text-slate-800">{currency(totalDue)}</p>
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-black uppercase">Total Liquidado</span>
            <p className="text-lg font-black text-emerald-600">{currency(totalPaid)}</p>
          </div>
          <div className="bg-violet-100/30 p-3 rounded-xl border border-violet-100">
            <span className="text-[9px] text-violet-600 font-black uppercase">Saldo em Aberto</span>
            <p className="text-xl font-black text-violet-700">{currency(balance)}</p>
          </div>
        </div>
        
        <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-1">Histórico de Pagamentos de Corretagem</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {brokerTxs.length === 0 ? (
            <div className="col-span-2 text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
               <p className="text-[10px] text-slate-300 italic uppercase font-bold">Nenhum pagamento registrado</p>
            </div>
          ) : (
            brokerTxs.map(t => {
                const totalTx = t.value + (t.discountValue || 0);
                const isPureDiscount = t.value === 0 && (t.discountValue || 0) > 0;

                return (
                  <div key={t.id} className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white transition-all group relative">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isPureDiscount ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                            {isPureDiscount ? <MinusCircle size={14}/> : <Wallet size={14}/>}
                        </div>
                        <div>
                            <span className="font-black text-slate-700 uppercase text-[10px]">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                            {t.deductFromPartner && (
                              <span className="ml-2 bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded font-black uppercase inline-flex items-center gap-1">
                                 <Coins size={8}/> Deb. Produtor
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="text-right">
                          <span className={`font-black ${isPureDiscount ? 'text-amber-600' : 'text-violet-700'}`}>{currency(totalTx)}</span>
                          {isPureDiscount && <p className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">Abatimento</p>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg w-fit shadow-xs">
                        <Landmark size={12} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-600 uppercase">{t.accountName}</span>
                    </div>

                    <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => onEditTx(t)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-all active:scale-95"><Pencil size={12}/></button>
                      <button onClick={() => onDeleteTx(t.id)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 shadow-sm transition-all active:scale-95"><Trash2 size={12}/></button>
                    </div>
                  </div>
                );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderBrokerCard;
