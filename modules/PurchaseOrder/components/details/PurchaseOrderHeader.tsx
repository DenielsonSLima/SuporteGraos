
import React, { useEffect, useState } from 'react';
import { User, MapPin, FileText, UserCheck, ShoppingBag } from 'lucide-react';
import { PurchaseOrder } from '../../types';
import { partnerService } from '../../../../services/partnerService';

interface Props {
  order: PurchaseOrder;
}

const PurchaseOrderHeader: React.FC<Props> = ({ order }) => {
  const [partnerNickname, setPartnerNickname] = useState('');

  useEffect(() => {
    const p = partnerService.getById(order.partnerId);
    if (p && p.nickname) {
      setPartnerNickname(p.nickname);
    }
  }, [order.partnerId]);

  const formatDoc = (doc: string) => {
    if (!doc) return 'NÃO INFORMADO';
    const cleaned = doc.replace(/\D/g, '');
    if (cleaned.length === 11) return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (cleaned.length === 14) return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return doc;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      {/* CARD DO FORNECEDOR */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-4 text-blue-600 border-b border-slate-50 pb-3">
            <User size={20} />
            <h3 className="font-black uppercase text-xs tracking-widest">Identificação do Fornecedor / Origem</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razão Social / Nome</p>
              <div className="flex flex-col">
                 <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{order.partnerName}</p>
                 {partnerNickname && (
                    <p className="text-sm font-bold text-blue-600 uppercase mt-0.5">
                        {partnerNickname}
                    </p>
                 )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <FileText size={12} /> Documento
                </p>
                <p className="text-sm font-bold text-slate-700 font-mono">{formatDoc(order.partnerDocument)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <MapPin size={12} /> Origem da Mercadoria
                </p>
                <p className="text-sm font-bold text-slate-700 uppercase">
                  {(() => {
                    const city = order.useRegisteredLocation 
                      ? (order.partnerCity || '...')
                      : (order.loadingCity || order.partnerCity || '...');
                    const state = order.useRegisteredLocation 
                      ? (order.partnerState || '...')
                      : (order.loadingState || order.partnerState || '...');
                    return `${city} / ${state}`;
                  })()}
                </p>
                {!order.useRegisteredLocation && order.loadingComplement && (
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">{order.loadingComplement}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4">
            <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-white text-xs font-black">
                    {order.consultantName.charAt(0)}
                </div>
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Sócio Comprador (Responsável)</p>
                <p className="text-sm font-black text-slate-800 uppercase mt-0.5">{order.consultantName}</p>
            </div>
        </div>
      </div>

      {/* CARD DO CONTRATO */}
      <div className="lg:col-span-4 bg-slate-950 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden group">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
            <ShoppingBag size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-blue-400" />
              <h3 className="font-black uppercase text-xs tracking-widest">Resumo do Pedido</h3>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400">PC #{order.number}</span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Status Operacional</p>
              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase border ${
                  order.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-blue-500/20 border-blue-500 text-blue-400'
              }`}>
                  {order.status === 'completed' ? 'Finalizado' : 'Em Execução'}
              </span>
            </div>
            
            <div>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Data de Emissão</p>
                <p className="text-lg font-black">{new Date(order.date).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderHeader;
