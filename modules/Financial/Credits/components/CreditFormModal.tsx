import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { FinancialRecord } from '../../types';
import { bankAccountService } from '../../../../services/bankAccountService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: FinancialRecord | null;
}

const CreditFormModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    entityName: '',
    description: '',
    type: 'credit_income',
    amount: 0,
    interestRate: 0,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    bankAccountId: '',
    notes: '',
  });

  const accounts = bankAccountService.getBankAccounts();

  useEffect(() => {
    if (initialData) {
      setFormData({
        entityName: initialData.entityName,
        description: initialData.description,
        type: initialData.subType || 'credit_income',
        amount: initialData.originalValue || 0,
        interestRate: initialData.paidValue || 0,
        issueDate: initialData.issueDate.split('T')[0],
        dueDate: initialData.dueDate.split('T')[0],
        bankAccountId: initialData.bankAccount || '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        entityName: '',
        description: '',
        type: 'credit_income',
        amount: 0,
        interestRate: 0,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        bankAccountId: '',
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' || name === 'interestRate' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">
            {initialData ? 'Editar Crédito' : 'Novo Crédito'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Seção 1: Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Informações Básicas
            </h3>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Instituição / Banco *
              </label>
              <input
                type="text"
                name="entityName"
                value={formData.entityName}
                onChange={handleChange}
                placeholder="Ex: Banco XYZ, Corretora ABC..."
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Descrição
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Ex: Investimento CDB, Poupança, Renda Fixa..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Tipo de Crédito *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="credit_income">Crédito de Renda</option>
                <option value="investment">Investimento</option>
              </select>
            </div>
          </div>

          {/* Seção 2: Valores */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Valores e Taxa
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Capital Investido (R$) *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0,00"
                  step="0.01"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Taxa de Rendimento (% a.m.) *
                </label>
                <input
                  type="number"
                  name="interestRate"
                  value={formData.interestRate}
                  onChange={handleChange}
                  placeholder="0,00"
                  step="0.01"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Datas */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Período do Investimento
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Data de Início *
                </label>
                <input
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Seção 4: Banco/Conta */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Conta Bancária
            </h3>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Onde os rendimentos serão depositados?
              </label>
              <select
                name="bankAccountId"
                value={formData.bankAccountId}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Selecione uma conta...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.bankName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seção 5: Observações */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Observações
            </h3>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Notas adicionais
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Ex: Contato com o gerente, Rendimentos antecipados..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Footer com Botões */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              {initialData ? 'Atualizar' : 'Criar Crédito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreditFormModal;
