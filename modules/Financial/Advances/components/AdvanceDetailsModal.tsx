import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, ArrowUpRight, ArrowDownLeft, Wallet, 
  DollarSign, Trash2, Edit3, Clock, ShieldCheck, 
  HelpCircle, ChevronRight, AlertTriangle, RefreshCw
} from 'lucide-react';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { useAdvanceChildren, useAdvanceConsumptionSources } from '../../../../hooks/useAdvances';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  advance: any;
  allAdvances: any[];
  onEdit: (tx: any) => void;
  onDelete: (tx: any) => void;
  onDeleteChild: (childId: string) => void;
}

const AdvanceDetailsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  advance,
  allAdvances,
  onEdit,
  onDelete,
  onDeleteChild
}) => {
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | null>(null);

  useEffect(() => {
    if (advance) {
      setSelectedAdvanceId(advance.id);
    }
  }, [advance]);

  // Encontra todos os adiantamentos do mesmo parceiro para colocar no sidebar
  const partnerAdvances = useMemo(() => {
    if (!advance) return [];
    return allAdvances
      .filter(a => a.partnerId === advance.partnerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allAdvances, advance]);

  const currentAdvance = useMemo(() => {
    if (!selectedAdvanceId) return advance;
    return partnerAdvances.find(a => a.id === selectedAdvanceId) || advance;
  }, [partnerAdvances, selectedAdvanceId, advance]);

  // Carrega os consumos (filhos) do adiantamento atual em tempo real
  const { data: children = [], isLoading: isLoadingChildren } = useAdvanceChildren(currentAdvance?.id || null);
  const { data: consumptionSources = [], isLoading: isLoadingConsumption } = useAdvanceConsumptionSources(currentAdvance?.id || null);

  const mergedItems = useMemo(() => {
    const list: any[] = [];
    
    // Mapeia os filhos do adiantamento (baixas manuais)
    (children || []).forEach((child: any) => {
      list.push({
        id: child.id,
        date: child.advance_date,
        type: 'manual',
        label: 'Baixa Manual Realizada',
        description: child.description,
        amount: child.amount,
        accountName: child.account_name,
        canDelete: true,
      });
    });

    // Mapeia as fontes de consumo (carregamentos do pedido)
    (consumptionSources || []).forEach((source: any) => {
      list.push({
        id: source.source_id,
        date: source.source_date,
        type: source.source_type,
        label: source.source_label || 'Consumo por Carregamento',
        description: 'Carregamento automático vinculado ao Pedido de Compra',
        amount: source.amount,
        accountName: null,
        canDelete: false,
      });
    });

    // Ordena por data decrescente (mais recentes primeiro)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [children, consumptionSources]);

  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const dateStr = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  if (!isOpen || !currentAdvance) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-6xl bg-slate-50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[85vh]">
          
          {/* Header */}
          <div className="bg-slate-950 px-8 py-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-black text-xl uppercase tracking-tighter italic leading-none">Rastro e Histórico Contábil</h3>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1.5">
                  Auditoria de Saldo e Consumos: {currentAdvance.partnerName}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
              <X size={28} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar (List of Sibling Advances) */}
            <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 flex flex-col gap-4 shrink-0">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                Lançamentos do Parceiro ({partnerAdvances.length})
              </h4>
              
              <div className="space-y-3 flex-1">
                {partnerAdvances.map((adv) => {
                  const isSelected = adv.id === currentAdvance.id;
                  return (
                    <button
                      key={adv.id}
                      onClick={() => setSelectedAdvanceId(adv.id)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 relative overflow-hidden ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/20 shadow-md' 
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar size={12} /> {dateStr(adv.date)}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          adv.type === 'given' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {adv.type === 'given' ? 'Eu Paguei' : 'Eu Recebi'}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valor Original</p>
                        <p className="text-sm font-black text-slate-800 tracking-tight">{currency(adv.value)}</p>
                      </div>

                      <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400">Saldo Restante:</span>
                        <span className={`font-black ${adv.remainingAmount > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {currency(adv.remainingAmount)}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail Panel */}
            <div className="flex-1 bg-slate-50/50 overflow-y-auto p-8 flex flex-col gap-6">
              
              {/* Top Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* original amount */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor do Lançamento Original</span>
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{currency(currentAdvance.value)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={14} className="text-slate-400" />
                    <span>Lançado em {dateStr(currentAdvance.date)}</span>
                  </div>
                </div>

                {/* total consumed */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">Descontado / Consumido</span>
                    <span className="text-2xl font-black text-amber-600 tracking-tighter">
                      {(currentAdvance.settledAmount ?? 0) > 0 ? '- ' : ''}{currency(currentAdvance.settledAmount ?? 0)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 font-bold">
                    <ArrowUpRight size={14} />
                    <span>{mergedItems.length} baixa(s) efetuada(s)</span>
                  </div>
                </div>

                {/* remaining balance */}
                <div className="bg-emerald-500 text-white rounded-3xl p-6 shadow-lg shadow-emerald-100 flex flex-col justify-between relative overflow-hidden">
                  <div>
                    <span className="text-[9px] font-black text-emerald-100 uppercase tracking-widest block mb-1">Saldo Disponível Atual</span>
                    <span className="text-3xl font-black tracking-tighter">{currency(currentAdvance.remainingAmount ?? 0)}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100 font-bold">
                    <Wallet size={14} />
                    <span>Origem: {currentAdvance.accountName || 'Caixa/Banco'}</span>
                  </div>
                </div>

              </div>

              {/* Action Toolbar for parent */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="font-black text-slate-800 text-sm uppercase tracking-tighter italic">Informações do Registro</h4>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Motivo: <span className="text-slate-600 italic">"{currentAdvance.description}"</span>
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => onEdit(currentAdvance)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                  >
                    <Edit3 size={16} />
                    Editar Registro
                  </button>
                  <button
                    onClick={() => onDelete(currentAdvance)}
                    disabled={currentAdvance.settledAmount > 0}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm ${
                      currentAdvance.settledAmount > 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                    }`}
                    title={currentAdvance.settledAmount > 0 ? 'Não é possível excluir adiantamento com baixas vinculadas.' : 'Excluir registro'}
                  >
                    <Trash2 size={16} />
                    Excluir Lançamento
                  </button>
                </div>
              </div>

              {/* Rastro de Volta Section */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-slate-800 text-base uppercase tracking-tighter italic">Rastro Contábil ("Rastro de Volta")</h3>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">Histórico completo de baixas, amortizações e desonerações deste saldo</p>
                  </div>
                  {(isLoadingChildren || isLoadingConsumption) && (
                    <RefreshCw className="animate-spin text-slate-400" size={18} />
                  )}
                </div>

                 <div className="">
                   {mergedItems.length === 0 ? (
                     <div className="flex flex-col items-center justify-center text-center py-12 px-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                       <div className="p-4 bg-slate-100 rounded-full text-slate-400 mb-3">
                         <HelpCircle size={28} />
                       </div>
                       <h4 className="font-black text-slate-800 text-sm uppercase tracking-tighter">Nenhum desconto efetuado</h4>
                       <p className="text-xs text-slate-400 max-w-sm font-bold mt-1">
                         Este adiantamento ainda está com saldo de <span className="text-emerald-600 font-black">{currency(currentAdvance.value)}</span> integralmente livre para ser consumido em fretes futuros.
                       </p>
                     </div>
                   ) : (
                     <div className="space-y-4">
                       {mergedItems.map((item: any) => (
                         <div 
                           key={item.id}
                           className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50 transition-all group shadow-sm"
                         >
                           <div className="flex items-center gap-4">
                             <div className={`p-3 rounded-xl border ${
                               item.type === 'manual' 
                                 ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                 : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                             }`}>
                               {item.type === 'manual' ? <ArrowDownLeft size={18} /> : <Wallet size={18} />}
                             </div>
                             <div>
                               <div className="flex items-center gap-2.5">
                                 <span className={`text-xs font-black uppercase tracking-tight ${
                                   item.type === 'manual' ? 'text-emerald-600' : 'text-indigo-600'
                                 }`}>
                                   {item.label}
                                 </span>
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                   <Calendar size={10} /> {dateStr(item.date)}
                                 </span>
                               </div>
                               <p className="text-xs text-slate-500 font-bold mt-1">{item.description}</p>
                               {item.accountName && !item.accountName.toLowerCase().includes('virtu') ? (
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                   CONTA ENVOLVIDA: {item.accountName}
                                 </p>
                               ) : item.type === 'manual' ? (
                                 <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                                   DEDUZIDO DIRETAMENTE DO SALDO DO ADIANTAMENTO
                                 </p>
                               ) : (
                                 <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">
                                   BAIXA AUTOMÁTICA VIA CARREGAMENTO DO PEDIDO
                                 </p>
                               )}
                             </div>
                           </div>

                           <div className="flex items-center gap-4">
                             <span className="text-base font-black text-amber-600 tracking-tight">
                               - {currency(item.amount)}
                             </span>
                             {item.canDelete ? (
                               <button
                                 onClick={() => onDeleteChild(item.id)}
                                 className="p-2.5 rounded-lg bg-rose-50 text-rose-600 opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                 title="Estornar este desconto específico"
                               >
                                 <Trash2 size={16} />
                               </button>
                             ) : (
                               <div className="w-10" />
                             )}
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default AdvanceDetailsModal;
