
import React from 'react';
import { Truck, ShoppingBag, ArrowRightLeft, MapPin } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    editForm: Loading;
    isEditing: boolean;
    isQuickRedirecting: boolean;
    onSetIsQuickRedirecting: (val: boolean) => void;
    onUpdateForm: (data: Partial<Loading>) => void;
    onConfirmRedirect: () => void;
    onSaveDisplacement: () => void;
    allCarriers: any[];
    availableDrivers: any[];
    availableVehicles: any[];
    activeSales: any[];
    currency: (val: number) => string;
}

const LoadingStructuralInfo: React.FC<Props> = ({
    editForm, isEditing, isQuickRedirecting, onSetIsQuickRedirecting,
    onUpdateForm, onConfirmRedirect, onSaveDisplacement,
    allCarriers, availableDrivers, availableVehicles, activeSales, currency
}) => {
    const labelClass = 'text-[9px] font-black text-slate-500 uppercase mb-1 block tracking-widest ml-0.5';
    const inputClass = 'w-full border-2 border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 font-black focus:outline-none focus:border-blue-500 rounded-lg text-xs transition-all shadow-sm';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Origem */}
                <div className={`p-3 rounded-xl border bg-white transition-all duration-300 ${isEditing ? 'ring-2 ring-blue-500/10 border-blue-200' : 'border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><ShoppingBag size={14} /></div>
                        <span className={labelClass}>1. Origem & Produto</span>
                    </div>
                    <p className="font-black text-slate-900 text-sm mb-2 truncate tracking-tighter uppercase leading-tight">{editForm.supplierName}</p>
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                            <span className={labelClass}>Preço Compra (R$/SC)</span>
                            {isEditing ? (
                                <input type="number" step="0.01" className={inputClass} value={editForm.purchasePricePerSc} onChange={e => onUpdateForm({ purchasePricePerSc: parseFloat(e.target.value) })} />
                            ) : (
                                <p className="font-black text-slate-800 text-base tracking-tighter">{currency(editForm.purchasePricePerSc)}</p>
                            )}
                        </div>
                        <div className="mt-[-8px]">
                            <span className={labelClass}>Gênero / Produto</span>
                            <p className="text-[9px] font-black text-slate-400 px-1 uppercase tracking-widest">{editForm.product}</p>
                        </div>
                    </div>
                </div>

                {/* 2. Transporte */}
                <div className={`p-3 rounded-xl border bg-white transition-all duration-300 ${isEditing ? 'ring-2 ring-blue-500/10 border-blue-200' : 'border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><Truck size={14} /></div>
                        <span className={labelClass}>2. Transporte</span>
                    </div>
                    {isEditing ? (
                        <div className="space-y-2">
                            <div>
                                <label className={labelClass}>Transportadora</label>
                                <select className={inputClass} value={editForm.carrierId} onChange={e => { const c = allCarriers.find(x => x.id === e.target.value); onUpdateForm({ carrierId: e.target.value, carrierName: c?.name || '' }); }}>
                                    {allCarriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Motorista</label>
                                <select className={inputClass} value={editForm.driverId} onChange={e => { const d = availableDrivers.find(x => x.id === e.target.value); onUpdateForm({ driverId: e.target.value, driverName: d?.name || '' }); }}>
                                    <option value="">Selecione...</option>
                                    {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Placa</label>
                                <input className={`${inputClass} uppercase`} value={editForm.vehiclePlate} onChange={e => onUpdateForm({ vehiclePlate: e.target.value })} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tighter leading-tight">{editForm.carrierName}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-tight">{editForm.driverName}</p>
                            <div className="mt-3 inline-block px-3 py-1 bg-slate-900 text-white font-mono font-black rounded-lg text-xs tracking-[0.2em] shadow-md border border-slate-800">
                                {editForm.vehiclePlate}
                            </div>
                        </>
                    )}
                </div>

                {/* 3. Destino */}
                <div className={`p-3 rounded-xl border transition-all duration-300 ${isEditing ? 'ring-2 ring-blue-500/10 border-blue-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><MapPin size={14} /></div>
                            <span className={labelClass}>3. Destino (Venda)</span>
                        </div>
                        {!isEditing && (
                            <button onClick={() => onSetIsQuickRedirecting(!isQuickRedirecting)} className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase transition-all shadow-sm ${isQuickRedirecting ? 'bg-rose-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'}`}>
                                {isQuickRedirecting ? 'Sair' : 'Alt. Destino'}
                            </button>
                        )}
                    </div>
                    {isQuickRedirecting || isEditing ? (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 durarion-500">
                            <div>
                                <label className={labelClass}>Novo Vínculo de Venda</label>
                                <select className={inputClass} value={editForm.salesOrderId} onChange={e => { const s = activeSales.find(x => x.id === e.target.value); onUpdateForm({ salesOrderId: e.target.value, salesOrderNumber: s?.number || '', customerName: s?.customerName || '', salesPrice: s?.unitPrice || 0 }); }}>
                                    <option value="">Escolha um pedido ativo...</option>
                                    {activeSales.map(s => <option key={s.id} value={s.id}>{s.customerName} (#{s.number})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Preço Venda (R$/SC)</label>
                                <input type="number" step="0.01" className={inputClass} value={editForm.salesPrice} onChange={e => onUpdateForm({ salesPrice: parseFloat(e.target.value) })} />
                            </div>
                            {isQuickRedirecting && !isEditing && (
                                <button onClick={onConfirmRedirect} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl font-black text-[10px] uppercase shadow-md flex items-center justify-center gap-2 transition-all active:scale-95">
                                    Confirmar Troca
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tighter leading-tight">{editForm.customerName}</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-black uppercase tracking-widest">Ped. Venda: #{editForm.salesOrderNumber}</p>
                            {editForm.isRedirected && (
                                <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 shadow-inner">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-700 uppercase tracking-widest"><ArrowRightLeft size={12} /> Carga Remanejada</div>
                                    <p className="text-[8px] text-indigo-400 font-bold mt-1 uppercase">Origem Original: {editForm.originalDestination}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Deslocamento Extra */}
            {(editForm.isRedirected || isEditing) && (
                <div className="bg-slate-950 text-white p-6 rounded-3xl shadow-2xl animate-in slide-in-from-top-4 duration-500 border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <MapPin size={120} />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-900/40"><MapPin size={24} /></div>
                            <div>
                                <h4 className="font-black text-xl uppercase tracking-tighter">Custos Adicionais de Remanejo</h4>
                                <p className="text-[10px] text-indigo-300 font-black uppercase tracking-[0.2em] mt-1">Valor de deslocamento extra para o transportador</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="text-right">
                                <label className="text-[9px] font-black text-indigo-300 uppercase mb-2 block tracking-widest">Adicionar ao Frete</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-indigo-400">R$</span>
                                    <input
                                        type="number" step="0.01"
                                        className="bg-white border-2 border-indigo-600/20 rounded-2xl pl-11 pr-4 py-3 font-black text-2xl text-slate-950 focus:outline-none focus:border-indigo-500 transition-all w-56 shadow-2xl"
                                        placeholder="0,00"
                                        value={editForm.redirectDisplacementValue || ''}
                                        onChange={e => onUpdateForm({ redirectDisplacementValue: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            {!isEditing && (
                                <button onClick={onSaveDisplacement} className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/40 transition-all active:scale-95">Salvar Valor</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoadingStructuralInfo;
