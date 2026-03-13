
import React from 'react';
import { ShoppingBag, Search, ChevronDown, CheckCircle2, X, UserCheck } from 'lucide-react';
import { SalesOrder } from '../../SalesOrder/types';
import { Loading } from '../../types';

interface Props {
    formData: Partial<Loading>;
    salesSearch: string;
    isSalesDropdownOpen: boolean;
    filteredSales: SalesOrder[];
    onSetSalesSearch: (val: string) => void;
    onSetIsSalesDropdownOpen: (val: boolean) => void;
    onSetFormData: (data: Partial<Loading>) => void;
    onSelectSalesOrder: (sale: SalesOrder) => void;
    currency: (val: number) => string;
    dropdownRef: React.RefObject<HTMLDivElement>;
}

const LoadingFormDestination: React.FC<Props> = ({
    formData, salesSearch, isSalesDropdownOpen, filteredSales,
    onSetSalesSearch, onSetIsSalesDropdownOpen, onSetFormData,
    onSelectSalesOrder, currency, dropdownRef
}) => {
    const labelClass = 'text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest ml-1 block';
    const inputClass = 'w-full rounded-2xl border-2 border-slate-100 bg-white px-5 py-3.5 text-slate-900 font-black focus:border-indigo-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-base shadow-sm';

    return (
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative transition-all hover:shadow-md" ref={dropdownRef}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter italic">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner"><ShoppingBag size={20} /></div>
                    1. Destino & Vínculo Comercial
                </h3>
                <label className="flex items-center gap-3 cursor-pointer group bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            className="peer w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer appearance-none border-2 checked:bg-indigo-600 checked:border-indigo-600 transition-all"
                            checked={formData.isClientTransport}
                            onChange={e => onSetFormData({ isClientTransport: e.target.checked })}
                        />
                        <CheckCircle2 size={12} className="absolute left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Frete FOB (Cliente retira)</span>
                </label>
            </div>

            <div className="relative">
                <label className={labelClass}>Pesquisar Contrato de Venda / Cliente</label>
                <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <Search size={22} />
                    </div>
                    <input
                        type="text"
                        placeholder="Nome do cliente ou nº do pedido..."
                        value={salesSearch}
                        onFocus={() => onSetIsSalesDropdownOpen(true)}
                        onChange={(e) => { onSetSalesSearch(e.target.value); onSetIsSalesDropdownOpen(true); }}
                        className={`${inputClass} pl-14`}
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:rotate-180 transition-transform duration-300">
                        <ChevronDown size={20} />
                    </div>
                </div>

                {/* Dropdown de Vendas */}
                {isSalesDropdownOpen && (
                    <div className="absolute z-50 mt-4 w-full bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ring-4 ring-slate-100/50">
                        <div className="max-h-96 overflow-y-auto scrollbar-hide p-2 space-y-1">
                            {filteredSales.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <Search size={32} className="text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Nenhum contrato ativo encontrado</p>
                                </div>
                            ) : (
                                filteredSales.map(sale => (
                                    <div
                                        key={sale.id}
                                        onClick={() => onSelectSalesOrder(sale)}
                                        className="p-5 hover:bg-indigo-50/50 cursor-pointer rounded-2xl transition-all group flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-700 transition-colors text-base italic">{sale.customerName}</p>
                                            <div className="flex items-center gap-4 mt-1.5">
                                                <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 uppercase tracking-widest leading-none">Venda #{sale.number}</span>
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"><UserCheck size={14} className="text-indigo-300" /> {sale.consultantName}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-emerald-600 text-lg leading-none italic">{currency(sale.unitPrice || 0)} <span className="text-[10px] text-slate-300 uppercase not-italic">/ SC</span></p>
                                            <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">Saldo: {sale.quantity?.toLocaleString()} SC</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {formData.salesOrderId && !isSalesDropdownOpen && (
                <div className="mt-6 p-6 bg-emerald-50 rounded-[1.5rem] border border-emerald-100 flex items-center justify-between animate-in zoom-in-95 duration-500 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-900 uppercase tracking-tighter leading-none mb-1 shadow-emerald-500">Contrato Vinculado com Sucesso</p>
                            <p className="text-base font-black text-emerald-700 italic tracking-tight">{formData.customerName} <span className="mx-2 opacity-30">|</span> Preço Venda: {currency(formData.salesPrice || 0)}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => { onSetFormData({ salesOrderId: '', customerName: '' }); onSetSalesSearch(''); }}
                        className="p-3 bg-white text-emerald-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl border border-emerald-100 hover:border-rose-100 active:scale-95 shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default LoadingFormDestination;
