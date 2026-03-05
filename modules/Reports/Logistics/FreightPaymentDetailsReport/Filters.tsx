import React from 'react';
import { Calendar, Truck } from 'lucide-react';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';

interface Props {
    filters: any;
    onChange: (newFilters: any) => void;
}

const Filters: React.FC<Props> = ({ filters, onChange }) => {
    const freightPayables = financialIntegrationService.getPayables().filter((record) => record.subType === 'freight');
    const carriers = Array.from(new Set(freightPayables.map((record) => record.entityName).filter(Boolean))).sort();

    return (
        <div className="space-y-5 animate-in slide-in-from-left-2">
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase">Período</label>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">De:</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => onChange({ startDate: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">Até:</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => onChange({ endDate: e.target.value })}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
                        />
                    </div>
                </div>
            </div>

            <hr className="border-slate-100" />

            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Transportadora</label>
                <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                        value={filters.carrierName || ''}
                        onChange={(e) => onChange({ carrierName: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
                    >
                        <option value="">Todas</option>
                        {carriers.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default Filters;
