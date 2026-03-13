
import React from 'react';
import { Scale, ArrowRight, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    editForm: Loading;
    isEditing: boolean;
    quickWeight: string;
    onSetQuickWeight: (val: string) => void;
    onQuickWeightConfirm: () => void;
    onUpdateForm: (data: Partial<Loading>) => void;
    stats: any;
}

const LoadingWeightConferencing: React.FC<Props> = ({
    editForm, isEditing, quickWeight, onSetQuickWeight,
    onQuickWeightConfirm, onUpdateForm, stats
}) => {
    const labelClass = 'text-[10px] font-black text-slate-500 uppercase mb-1.5 block tracking-widest ml-1';

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-slate-950 text-white rounded-lg shadow-lg"><Scale size={16} /></div>
                <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-sm">Pesagem e Conferência de Quebra</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                {/* Peso Origem */}
                <div className={`md:col-span-2 p-3 rounded-xl border transition-all duration-500 ${isEditing ? 'ring-2 ring-blue-500/10 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                    <span className={labelClass}>Peso Origem (Carregamento)</span>
                    {isEditing ? (
                        <div className="relative mt-2">
                            <input
                                type="number"
                                className="w-full bg-white border-2 border-blue-200 rounded-2xl px-5 py-4 font-black text-3xl text-slate-900 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                                value={editForm.weightKg}
                                onChange={e => onUpdateForm({ weightKg: parseFloat(e.target.value) })}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase tracking-widest">KG</span>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xl font-black text-slate-900 tracking-tighter italic">{stats.wOri.toLocaleString()}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">KG</span>
                        </div>
                    )}
                </div>

                {/* Separador */}
                <div className="flex justify-center text-slate-200">
                    <ArrowRight size={24} className="hidden md:block opacity-30" />
                </div>

                {/* Peso Destino */}
                <div className={`md:col-span-2 p-3 rounded-xl border-2 transition-all duration-500 ${!editForm.unloadWeightKg ? 'bg-amber-50 border-amber-200 ring-4 ring-amber-500/5' : 'bg-emerald-50 border-emerald-100 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${!editForm.unloadWeightKg ? 'text-amber-700' : 'text-emerald-700'}`}>Peso Destino (Chegada)</span>
                        {editForm.unloadWeightKg ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-amber-500 animate-pulse" />}
                    </div>

                    {(!editForm.unloadWeightKg || isEditing) ? (
                        <div className="flex gap-2 mt-1">
                            <div className="relative flex-1 min-w-0">
                                <input
                                    type="number" value={quickWeight} onChange={e => onSetQuickWeight(e.target.value)}
                                    placeholder="Peso Destino..."
                                    className="w-full bg-white border-2 border-emerald-200 rounded-lg px-3 py-2 font-black text-sm text-slate-950 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest">KG</span>
                            </div>
                            {!isEditing && (
                                <button
                                    onClick={onQuickWeightConfirm}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-900/10 flex items-center gap-2 transition-all active:scale-95 shrink-0"
                                >
                                    <Check size={20} /> Confirmar
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-3 mb-3 h-14 mt-2">
                                <input
                                    type="number" value={quickWeight} onChange={e => onSetQuickWeight(e.target.value)}
                                    className="flex-1 min-w-0 bg-white border-2 border-slate-100 rounded-lg px-3 py-1.5 font-black text-base text-slate-950 focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
                                />
                                <button onClick={onQuickWeightConfirm} className="bg-slate-950 text-white px-3 rounded-lg font-black text-[9px] uppercase tracking-widest active:scale-95 shrink-0 whitespace-nowrap border border-white/10">OK</button>
                            </div>
                            <div className="flex items-baseline gap-1.5 opacity-60">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confirmado:</span>
                                <span className="text-sm font-black text-slate-900 tracking-tighter italic">{stats.wDest.toLocaleString()} KG</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadingWeightConferencing;
