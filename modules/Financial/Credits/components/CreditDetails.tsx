import React from 'react';
import { Edit2, Trash2, Calendar, Percent, DollarSign } from 'lucide-react';
import { FinancialRecord } from '../../types';
import { creditService } from '../../../../services/financial/creditService';

interface Props {
  credit: FinancialRecord;
  onEdit: () => void;
  onDelete: () => void;
}

const CreditDetails: React.FC<Props> = ({ credit, onEdit, onDelete }) => {
  const currency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const monthsElapsed = Math.max(1, Math.floor(
    (new Date().getTime() - new Date(credit.issueDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  ));
  const earnings = creditService.calculateEarnings(credit.originalValue || 0, credit.paidValue || 0, monthsElapsed);
  const totalValue = (credit.originalValue || 0) + earnings;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-lg font-black text-slate-900 mb-2">{credit.entityName}</h3>
        <p className="text-xs text-slate-500 font-medium">{credit.description}</p>
      </div>

      {/* Estatísticas Principais */}
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Capital</p>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {currency(credit.originalValue || 0)}
              </p>
            </div>
            <DollarSign className="text-blue-400" size={32} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Rendimentos</p>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                +{currency(earnings)}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                ({monthsElapsed} mês{monthsElapsed > 1 ? 'es' : ''})
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Taxa</p>
              <p className="text-3xl font-black text-emerald-700 mt-1">{credit.paidValue}%</p>
              <p className="text-xs text-emerald-600 font-medium">a.m.</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-4 border border-violet-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">Total Final</p>
              <p className="text-2xl font-black text-violet-700 mt-1">
                {currency(totalValue)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">Rendimento %</p>
              <p className="text-3xl font-black text-violet-700 mt-1">
                {((earnings / (credit.originalValue || 1)) * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Datas */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Data de Início</span>
          </div>
          <span className="font-bold text-slate-900">
            {new Date(credit.issueDate).toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Data de Vencimento</span>
          </div>
          <span className="font-bold text-slate-900">
            {new Date(credit.dueDate).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Notas */}
      {credit.notes && (
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Observações</p>
          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
            {credit.notes}
          </p>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-4 border-t border-slate-200">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition-all"
        >
          <Edit2 size={16} />
          Editar
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-all"
        >
          <Trash2 size={16} />
          Remover
        </button>
      </div>

      {/* Status */}
      <div className="pt-4 border-t border-slate-200 bg-slate-50 rounded-lg p-3">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Status</p>
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            credit.status === 'pending' || credit.status === 'partial'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {credit.status === 'pending' || credit.status === 'partial' ? 'Ativo' : 'Encerrado'}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Criado em {new Date(credit.issueDate).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CreditDetails;
