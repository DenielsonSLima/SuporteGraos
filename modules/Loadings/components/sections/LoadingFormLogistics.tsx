
import React from 'react';
import { Truck, Plus, ClipboardList, Calendar } from 'lucide-react';
import { Loading } from '../../types';

interface Props {
    formData: Partial<Loading>;
    carriers: any[];
    availableDrivers: any[];
    availableVehicles: any[];
    fleetPartnerId: string;
    isLoadingDrivers: boolean;
    onSetFormData: (data: Partial<Loading>) => void;
    onShowQuickDriverModal: (val: boolean) => void;
}

const LoadingFormLogistics: React.FC<Props> = ({
    formData, carriers, availableDrivers, availableVehicles,
    fleetPartnerId, isLoadingDrivers, onSetFormData, onShowQuickDriverModal
}) => {
    const labelClass = 'text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest ml-1 block';
    const inputClass = 'w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-2.5 text-slate-900 font-bold focus:border-blue-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-sm shadow-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100';

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-tighter">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shadow-inner"><Truck size={18} /></div>
                2. Logística & Frota
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                    <label className={labelClass}>Transportadora Responsável</label>
                    <select
                        className={inputClass}
                        value={formData.carrierId}
                        onChange={e => {
                            const c = carriers.find(x => x.id === e.target.value);
                            onSetFormData({ carrierId: e.target.value, carrierName: c?.name });
                        }}
                        disabled={formData.isClientTransport}
                        required
                    >
                        <option value="">Selecione a empresa...</option>
                        {carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                    <label className={labelClass}>Data do Carregamento</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                        <input
                            type="date"
                            className={`${inputClass} pl-12`}
                            value={formData.date}
                            onChange={e => onSetFormData({ date: e.target.value })}
                            required
                        />
                    </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                    <div className="flex justify-between items-end mb-2">
                        <label className={labelClass + ' mb-0'}>Motorista Designado</label>
                        {fleetPartnerId && (
                            <button
                                type="button"
                                onClick={() => onShowQuickDriverModal(true)}
                                className="text-[9px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1.5 uppercase transition-all bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg border border-blue-100 active:scale-95"
                                title="Cadastrar novo motorista para esta transportadora"
                            >
                                <Plus size={10} strokeWidth={3} /> Novo Motorista
                            </button>
                        )}
                    </div>
                    <select
                        className={inputClass}
                        value={formData.driverId}
                        onChange={e => {
                            const d = availableDrivers.find(x => x.id === e.target.value);
                            const fallbackPlate = formData.vehiclePlate || availableVehicles[0]?.plate || '';
                            onSetFormData({
                                driverId: e.target.value,
                                driverName: d?.name || '',
                                vehiclePlate: fallbackPlate
                            });
                        }}
                        disabled={isLoadingDrivers}
                        required
                    >
                        <option value="">{isLoadingDrivers ? 'Buscando motoristas...' : 'Selecione o profissional...'}</option>
                        {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                    <label className={labelClass}>Placa do Veículo Principal</label>
                    <input
                        type="text"
                        className={`${inputClass} uppercase tracking-widest placeholder:tracking-normal font-black text-center`}
                        value={formData.vehiclePlate || ''}
                        onChange={e => onSetFormData({ vehiclePlate: e.target.value })}
                        placeholder="ABC1D23"
                    />
                </div>
                <div className="col-span-2">
                    <label className={labelClass}>Documentação Fiscal (NF - Opcional)</label>
                    <div className="relative">
                        <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                            type="text"
                            className={`${inputClass} pl-12 font-medium`}
                            value={formData.invoiceNumber}
                            onChange={e => onSetFormData({ invoiceNumber: e.target.value })}
                            placeholder="Número da nota fiscal de saída"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingFormLogistics;
