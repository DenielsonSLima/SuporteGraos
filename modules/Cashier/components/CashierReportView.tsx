
import React, { useState } from 'react';
import {
  Printer,
  Calendar,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Truck,
  Users,
  Package,
  PiggyBank,
  Briefcase,
  Tractor,
  HandCoins,
  CalendarDays,
  Percent,
  Info,
  Car
} from 'lucide-react';
import { CashierReport } from '../types';
import CashierPdfPreviewModal from './modals/CashierPdfPreviewModal';
import CashierKPIs from './CashierKPIs';
import CashierCharts from './CashierCharts';
import CashierSummaryCards from './CashierSummaryCards';

interface Props {
  report: CashierReport;
  title: string;
}

const CashierReportView: React.FC<Props> = ({ report, title }) => {
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const currency = (val: number) => {
    // Ignora o sinal de negativo se o valor for próximo de zero
    const cleanValue = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanValue);
  };

  const ListItem = ({ label, value, icon: Icon, colorClass, borderClass, tooltip }: any) => (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${borderClass || 'border-slate-100'} bg-white hover:bg-slate-50 transition-colors group relative`} title={tooltip}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-800">{currency(value)}</span>
        {tooltip && <Info size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Fluxo de Caixa
            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${report.isClosed ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
              {report.isClosed ? 'Fechado' : 'Aberto'}
            </span>
          </h1>
          <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
            <Calendar size={14} />
            {title}
          </p>
        </div>
        <button onClick={() => setIsPdfOpen(true)} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 hover:text-primary-600 transition-colors shadow-sm text-sm font-medium">
          <Printer size={16} /> Versão Impressa (PDF)
        </button>
      </div>

      <CashierKPIs data={report} />

      {/* Detalhamento de Saldo Inicial do Mês */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Saldos de Abertura do Período</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Posição de cada conta em 01/{new Date(report.referenceDate).getMonth() + 1}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase block mb-0.5">Soma Inicial Consolidada</span>
            <span className="text-lg font-black text-blue-700">{currency(report.totalInitialMonthBalance)}</span>
          </div>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {report.initialMonthBalances.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-white transition-all group">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Landmark size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-600 uppercase leading-tight">{acc.bankName}</span>
                    {acc.owner && <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{acc.owner}</span>}
                  </div>
                </div>
                <span className="text-sm font-black text-slate-900 ml-2 shrink-0">{currency(acc.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CashierCharts data={report} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DISPONIBILIDADES */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 h-fit">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Landmark size={20} className="text-blue-500" /> Contas & Disponibilidades
          </h3>
          <div className="space-y-3">
            {report.bankBalances.map(bank => (
              <div key={bank.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-700 leading-tight">{bank.bankName}</span>
                  {bank.owner && <span className="text-[10px] text-slate-400 leading-tight mt-0.5">{bank.owner}</span>}
                </div>
                <span className="font-bold text-slate-800 shrink-0 ml-2">{currency(bank.balance)}</span>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-200 mt-2 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-400">Total Bancos</span>
              <span className="font-bold text-blue-600 text-lg">{currency(report.totalBankBalance)}</span>
            </div>
          </div>
        </div>

        {/* ATIVOS */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 px-1">
            <ArrowUpRight size={20} className="text-emerald-500" /> Detalhamento de Ativos
          </h3>
          <div className="space-y-2">
            <ListItem label="Recebíveis de Vendas" value={report.pendingSalesReceipts} icon={TrendingUp} colorClass="bg-emerald-100 text-emerald-600" />
            <ListItem label="Patrimônio (Bens Ativos)" value={report.totalFixedAssetsValue} icon={Tractor} colorClass="bg-indigo-100 text-indigo-600" />
            <ListItem
              label="Vendas de Bens (a Receber)"
              value={report.pendingAssetSalesReceipts}
              icon={Car}
              colorClass="bg-teal-100 text-teal-600"
              tooltip="Parcelas pendentes de veículos, máquinas e outros bens vendidos."
            />
            <ListItem
              label="Haveres de Sócios"
              value={report.shareholderReceivables}
              icon={Users}
              colorClass="bg-violet-100 text-violet-600"
              tooltip="Valores que os sócios retiraram a mais ou devem à empresa (Saldos Negativos)."
            />
            <ListItem label="Empréstimos Concedidos" value={report.loansGranted} icon={Landmark} colorClass="bg-blue-100 text-blue-600" />
            <ListItem label="Mercadoria em Trânsito" value={report.merchandiseInTransitValue} icon={Truck} colorClass="bg-amber-100 text-amber-600" />
            <ListItem label="Adiantamentos Concedidos" value={report.advancesGiven} icon={HandCoins} colorClass="bg-cyan-100 text-cyan-600" />
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-emerald-700">Total Ativos + Bens</span>
            <span className="text-xl font-bold text-emerald-700">{currency(report.totalAssets)}</span>
          </div>
        </div>

        {/* PASSIVOS */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 px-1">
            <ArrowDownLeft size={20} className="text-rose-500" /> Detalhamento de Débitos
          </h3>
          <div className="space-y-2">
            <ListItem label="Fornecedores (Grãos)" value={report.pendingPurchasePayments} icon={Package} colorClass="bg-rose-100 text-rose-600" borderClass="border-rose-100" />
            <ListItem label="Fretes a Pagar" value={report.pendingFreightPayments} icon={Truck} colorClass="bg-orange-100 text-orange-600" borderClass="border-orange-100" />
            <ListItem
              label="Comissões a Pagar"
              value={report.commissionsToPay}
              icon={Percent}
              colorClass="bg-purple-100 text-purple-600"
              tooltip="Valores devidos a corretores e intermediários externos."
            />
            <ListItem
              label="Obrigações com Sócios"
              value={report.shareholderPayables}
              icon={Users}
              colorClass="bg-indigo-100 text-indigo-700"
              tooltip="Saldos positivos de Pro-labore/Lucros a pagar aos donos."
            />
            <ListItem label="Empréstimos Tomados" value={report.loansTaken} icon={Landmark} colorClass="bg-slate-100 text-slate-600" />
            <ListItem label="Adiant. de Clientes" value={report.advancesTaken} icon={PiggyBank} colorClass="bg-pink-100 text-pink-600" borderClass="border-pink-100" />
          </div>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-rose-700">Total Obrigações</span>
            <span className="text-xl font-bold text-rose-700">{currency(report.totalLiabilities)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <CashierSummaryCards data={report} />
      </div>

      <CashierPdfPreviewModal isOpen={isPdfOpen} onClose={() => setIsPdfOpen(false)} report={report} title={title} />
    </div>
  );
};

export default CashierReportView;
