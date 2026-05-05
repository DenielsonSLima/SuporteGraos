
import React from 'react';
import { Landmark } from 'lucide-react';
import { LoanRecord } from '../../types';

interface Props {
  loan: LoanRecord;
  currency: (val: number) => string;
  dateStr: (val: string) => string;
  getBankAccountName: (id?: string, desc?: string) => string;
}

const LoanDetailsCard: React.FC<Props> = ({ loan, currency, dateStr, getBankAccountName }) => {
  const isTaken = loan.type === 'taken';

  return (
    <div className={`p-8 rounded-[2rem] border-2 shadow-xl flex flex-col justify-between relative overflow-hidden ${isTaken ? 'bg-rose-600 border-rose-500' : 'bg-emerald-600 border-emerald-500'} text-white`}>
      <div className="absolute right-0 top-0 p-6 opacity-10"><Landmark size={80} /></div>

      <div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4 block">Detalhes do Contrato</span>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] font-black uppercase opacity-70 block">Data Inicial</span>
              <p className="text-sm font-black">{dateStr(loan.contractDate)}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase opacity-70 block">Taxa Juros</span>
              <p className="text-sm font-black">{loan.interestRate}% A.M</p>
            </div>
          </div>

          <div>
            <span className="text-[9px] font-black uppercase opacity-70 block">Valor do Empréstimo</span>
            <p className="text-xl font-black">{currency(loan.originalValue)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
            <div>
              <span className="text-[9px] font-black uppercase opacity-70 block">Total Pago</span>
              <p className="text-sm font-black text-white/90">{currency(loan.originalValue - loan.remainingValue)}</p>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase opacity-70 block text-white">Saldo Devedor</span>
              <p className="text-lg font-black text-white">{currency(loan.remainingValue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-white border-opacity-20">
        <span className="text-[9px] font-black uppercase opacity-70 block mb-1">Conta Bancária de Origem</span>
        <p className="text-xs font-black bg-white/10 px-3 py-2 rounded-xl border border-white/10 inline-block">
          {getBankAccountName(loan.accountId || (loan as any).bankAccount, (loan as any).description || '')}
        </p>
      </div>
    </div>
  );
};

export default LoanDetailsCard;
