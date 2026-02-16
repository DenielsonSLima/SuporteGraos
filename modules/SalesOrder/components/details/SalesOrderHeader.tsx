
import React from 'react';
import { User, MapPin, FileText, Package, UserCheck } from 'lucide-react';
import { SalesOrder } from '../../types';

interface Props {
  order: SalesOrder;
}

const SalesOrderHeader: React.FC<Props> = ({ order }) => {
  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const num = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      {/* 1. DADOS DO CLIENTE (Nome, Endereço, CNPJ) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4 text-emerald-600 border-b border-slate-50 pb-3">
            <User size={20} />
            <h3 className="font-black uppercase text-xs tracking-widest">Dados do Cliente Comprador</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razão Social / Nome</p>
              <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{order.customerName}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <FileText size={12} /> CNPJ / CPF
                </p>
                <p className="text-sm font-bold text-slate-700 font-mono">{order.customerDocument}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <MapPin size={12} /> Localização
                </p>
                <p className="text-sm font-bold text-slate-700 uppercase">{order.customerCity} / {order.customerState}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SÓCIO QUE VENDEU - DENTRO DO HEADER DE CLIENTE PARA CONTEXTO */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <UserCheck size={18} />
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Sócio Vendedor Responsável</p>
                <p className="text-sm font-black text-slate-800 uppercase mt-0.5">{order.consultantName}</p>
            </div>
        </div>
      </div>

      {/* 2. DADOS DO CONTRATO (Sacas, Valor/SC, Total) */}
      <div className="lg:col-span-5 bg-slate-950 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden group">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
            <Package size={120} />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-emerald-400" />
              <h3 className="font-black uppercase text-xs tracking-widest">Condições do Contrato</h3>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ref: #{order.number}</span>
          </div>

          <div className="grid grid-cols-2 gap-y-6">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-emerald-400">Quantidade Contratada</p>
              <p className="text-2xl font-black">{num(order.quantity || 0)} <span className="text-xs font-normal opacity-60 uppercase">SC</span></p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-emerald-400">Valor Unitário (SC)</p>
              <p className="text-2xl font-black">{currency(order.unitPrice || 0)}</p>
            </div>
            <div className="col-span-2 pt-4 border-t border-white/10">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-emerald-400">Valor Total do Contrato</p>
              <p className="text-3xl font-black tracking-tighter">{currency(order.totalValue)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOrderHeader;
