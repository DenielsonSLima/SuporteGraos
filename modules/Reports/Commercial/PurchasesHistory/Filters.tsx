
import React from 'react';
import { Calendar, User, Package } from 'lucide-react';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';

interface Props {
  filters: any;
  onChange: (newFilters: any) => void;
}

const Filters: React.FC<Props> = ({ filters, onChange }) => {
  const purchaseRecords = financialIntegrationService.getPayables().filter((record) => record.subType === 'purchase_order');
  const partners = Array.from(new Set(purchaseRecords.map((record) => record.entityName).filter(Boolean))).sort();
  const products = Array.from(new Set(purchaseRecords.map((record) => record.description).filter(Boolean))).sort();

  return (
    <div className="space-y-5 animate-in slide-in-from-left-2">
      
      {/* Date Range */}
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

      {/* Supplier Filter */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Fornecedor</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={filters.partnerId || ''}
            onChange={(e) => onChange({ partnerId: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
          >
            <option value="">Todos</option>
            {partners.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Filter */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Produto</label>
        <div className="relative">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={filters.product || ''}
            onChange={(e) => onChange({ product: e.target.value })}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white text-slate-900"
          >
            <option value="">Todos</option>
            {products.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

    </div>
  );
};

export default Filters;
