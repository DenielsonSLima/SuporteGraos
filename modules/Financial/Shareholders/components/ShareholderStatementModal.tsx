
import React, { useState } from 'react';
import { X, Calendar, ArrowUpCircle, ArrowDownCircle, Printer } from 'lucide-react';
import type { Shareholder } from '../../../../services/shareholderService';
import ShareholderPdfModal from './ShareholderPdfModal';

interface Props {
  shareholder: Shareholder | null;
  isOpen: boolean;
  onClose: () => void;
}

const ShareholderStatementModal: React.FC<Props> = ({ shareholder, isOpen, onClose }) => {
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  if (!isOpen || !shareholder) return null;

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
          
          {/* Header */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Extrato Financeiro</h3>
                <p className="text-sm text-slate-500">{shareholder.name}</p>
              </div>
              <button 
                onClick={() => setIsPdfOpen(true)}
                className="flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm ml-4"
              >
                <Printer size={16} />
                Exportar PDF
              </button>
            </div>
            <button onClick={onClose} className="hover:bg-slate-200 p-2 rounded-full transition-colors text-slate-500">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shareholder.financial.history.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                      Nenhuma movimentação registrada.
                    </td>
                  </tr>
                ) : (
                  shareholder.financial.history.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {date(t.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {t.type === 'credit' ? (
                            <ArrowUpCircle size={16} className="text-emerald-500" />
                          ) : (
                            <ArrowDownCircle size={16} className="text-rose-500" />
                          )}
                          <span className="font-medium text-slate-700">{t.description}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${t.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === 'debit' ? '-' : '+'}{currency(t.value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
            <span className="text-sm text-slate-500">Saldo Atual</span>
            <span className={`text-xl font-bold ${shareholder.financial.currentBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {currency(shareholder.financial.currentBalance)}
            </span>
          </div>

        </div>
      </div>

      {/* PDF Modal Layer */}
      <ShareholderPdfModal 
        isOpen={isPdfOpen} 
        onClose={() => setIsPdfOpen(false)}
        shareholder={shareholder}
      />
    </>
  );
};

export default ShareholderStatementModal;
