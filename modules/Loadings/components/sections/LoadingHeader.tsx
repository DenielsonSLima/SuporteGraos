
import React from 'react';
import { X, Truck, Pencil, Save, Trash2 } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    loading: Loading;
    isEditing: boolean;
    onEditToggle: (val: boolean) => void;
    onSave: () => void;
    onDelete: () => void;
    onClose: () => void;
}

const LoadingHeader: React.FC<Props> = ({ loading, isEditing, onEditToggle, onSave, onDelete, onClose }) => {
    return (
        <div className={`px-4 py-2.5 flex justify-between items-center shrink-0 transition-all duration-500 ${isEditing ? 'bg-amber-600' : 'bg-slate-950'} shadow-md z-10`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-all duration-500 shadow-inner ${isEditing ? 'bg-amber-50 text-amber-700' : 'bg-slate-800 text-blue-400'}`}>
                    <Truck size={20} className={isEditing ? 'animate-pulse' : ''} />
                </div>
                <div>
                    <h2 className="text-base font-black uppercase tracking-tighter italic text-white leading-tight">
                        {isEditing ? 'Edição Estrutural' : 'Gestão de Carga'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-black text-white/70 uppercase tracking-widest">
                            #{loading.purchaseOrderNumber}
                        </span>
                        <span className="text-white/40 text-[9px]">•</span>
                        <p className="text-[9px] text-white/50 font-black uppercase tracking-widest">
                            {new Date(loading.date).toLocaleDateString()} | {loading.vehiclePlate}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isEditing ? (
                    <>
                        <button
                            onClick={() => onEditToggle(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-white border border-white/10"
                        >
                            <Pencil size={12} /> Estrutural
                        </button>
                        <button
                            onClick={onClose}
                            className="hover:bg-white/20 p-1.5 rounded-full transition-colors text-white"
                        >
                            <X size={20} />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={onDelete}
                            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-100 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-rose-600/30 active:scale-95"
                        >
                            <Trash2 size={12} className="inline mr-1" /> Excluir
                        </button>
                        <button
                            onClick={() => onEditToggle(false)}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onSave}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
                        >
                            <Save size={14} /> Salvar Tudo
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default LoadingHeader;
