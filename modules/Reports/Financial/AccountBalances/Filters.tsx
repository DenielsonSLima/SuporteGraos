
import React from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  filters: any;
  onChange: (newFilters: any) => void;
}

const Filters: React.FC<Props> = ({ filters, onChange }) => {
  const years = [2023, 2024, 2025];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ano Exercício</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={filters.year}
            onChange={(e) => onChange({ year: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900 font-bold"
          >
            {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default Filters;
