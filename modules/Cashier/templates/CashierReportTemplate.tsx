
import React from 'react';
import { CashierReport } from '../types';
import { settingsService } from '../../../services/settingsService';
import { 
  Sprout, TrendingUp, TrendingDown, 
  Scale, BadgeCheck, 
  CalendarDays, ArrowUpCircle, ArrowDownCircle,
  Landmark as BankIcon, Users, Package, Truck, Tractor, HandCoins, PiggyBank, Handshake, Percent
} from 'lucide-react';

interface Props {
  report: CashierReport;
  title: string;
}

const CashierReportTemplate: React.FC<Props> = ({ report, title }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const dateTime = (val: string) => new Date(val).toLocaleString('pt-BR');

  const cellStyle = 'border border-slate-400 px-2 py-1.5 text-black font-bold uppercase text-[8px] leading-tight';
  const headerStyle = 'border border-slate-900 bg-slate-100 px-2 py-1.5 text-black font-black uppercase text-[7px] leading-tight';

  return (
    <div id="cashier-report-pdf" className="relative w-full bg-white text-black p-10 text-[8px] leading-tight font-sans min-h-[285mm] flex flex-col box-border overflow-hidden">
      
      {/* MARCA D'ÁGUA TÉCNICA */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {watermark.imageUrl ? (
          <img src={watermark.imageUrl} className="w-[65%] object-contain opacity-[0.05]" alt="BG" />
        ) : (
          <Sprout size={300} className="text-slate-100 opacity-10" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="h-16 w-auto flex items-center shrink-0 overflow-hidden">
               {company.logoUrl ? (
                 <img src={company.logoUrl} className="max-h-full w-auto object-contain" alt="Logo" />
               ) : (
                 <Sprout size={32} className="text-black" />
               )}
            </div>
            <div>
              <h1 className="text-[12px] font-black uppercase text-black leading-none">{company.razaoSocial}</h1>
              <div className="text-black text-[8px] mt-1 space-y-0.5 font-bold uppercase tracking-tighter">
                <p>CNPJ: {company.cnpj} | {company.cidade}/{company.uf}</p>
                <p>{company.endereco}, {company.numero} | {company.telefone}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-sm font-black text-black uppercase italic leading-none">Fechamento Auditoria de Caixa</h2>
            <p className="text-[8px] font-black text-blue-800 mt-2 uppercase tracking-widest">{title}</p>
            <p className="mt-0.5 text-[7px] text-slate-500 font-bold uppercase tracking-tighter">ERP Suporte Grãos • {dateTime(new Date().toISOString())}</p>
          </div>
        </div>

        {/* 1. KPIs DE TOPO */}
        <div className="grid grid-cols-5 gap-2 mb-8">
            <div className="border-2 border-black bg-slate-900 p-2.5 rounded shadow-sm text-center">
                <span className="text-[6px] font-black uppercase text-slate-400 block mb-0.5">Patrimônio Líquido Real</span>
                <p className={`text-[10px] font-black leading-none ${report.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{currency(report.netBalance)}</p>
            </div>
            <div className="border border-slate-300 bg-slate-50 p-2.5 rounded text-center">
                <span className="text-[6px] font-black uppercase text-slate-500 block mb-0.5">Disponível em Banco</span>
                <p className="text-[9px] font-black text-black leading-none">{currency(report.totalBankBalance)}</p>
            </div>
            <div className="border border-emerald-300 bg-emerald-50 p-2.5 rounded text-center">
                <span className="text-[6px] font-black uppercase text-emerald-600 block mb-0.5">Total de Ativos</span>
                <p className="text-[9px] font-black text-black leading-none">{currency(report.totalAssets)}</p>
            </div>
            <div className="border border-rose-300 bg-rose-50 p-2.5 rounded text-center">
                <span className="text-[6px] font-black uppercase text-rose-600 block mb-0.5">Total de Passivos</span>
                <p className="text-[9px] font-black text-black leading-none">{currency(report.totalLiabilities)}</p>
            </div>
            <div className="border border-slate-300 bg-slate-50 p-2.5 rounded text-center">
                <span className="text-[6px] font-black uppercase text-slate-500 block mb-0.5">Aporte Inicial</span>
                <p className="text-[9px] font-black text-black leading-none">{currency(report.totalInitialBalance)}</p>
            </div>
        </div>

        {/* 2. SALDOS INICIAIS DO MÊS */}
        <div className="mb-8 break-inside-avoid">
            <h3 className="font-black text-black uppercase text-[8px] mb-2 border-b border-slate-900 pb-1 flex items-center gap-2 italic">
                <CalendarDays size={10} /> Posição de Abertura do Período
            </h3>
            <div className="grid grid-cols-4 gap-2">
                {report.initialMonthBalances.map((acc, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded flex justify-between items-center">
                        <span className="text-[7px] font-black text-slate-600 uppercase pr-2 flex-1 leading-tight">{acc.bankName}</span>
                        <span className="text-[8px] font-black text-black shrink-0">{currency(acc.value)}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* 3. ATIVOS E PASSIVOS LADO A LADO */}
        <div className="grid grid-cols-2 gap-8 mb-8">
            
            {/* ATIVOS */}
            <div className="break-inside-avoid">
                <h3 className="font-black text-emerald-800 uppercase text-[8px] mb-2 border-b-2 border-emerald-600 pb-1 flex items-center gap-2 italic">
                    <ArrowUpCircle size={10} /> Direitos e Haveres (Ativos)
                </h3>
                <div className="space-y-1.5">
                    {[
                        { icon: TrendingUp, label: "Recebíveis Vendas (Grãos)", val: report.pendingSalesReceipts },
                        { icon: Tractor, label: "Patrimônio (Bens Ativos)", val: report.totalFixedAssetsValue },
                        { icon: Users, label: "Haveres de Sócios (Débitos Societários)", val: report.shareholderReceivables },
                        { icon: BankIcon, label: "Empréstimos Concedidos", val: report.loansGranted },
                        { icon: Truck, label: "Mercadoria em Trânsito", val: report.merchandiseInTransitValue },
                        { icon: HandCoins, label: "Adiantamentos Concedidos", val: report.advancesGiven }
                    ].map((item, idx) => (
                        <div key={idx} className="flex justify-between p-2 border border-emerald-200 bg-emerald-50/40 rounded">
                            <div className="flex items-center gap-2">
                                <item.icon size={10} className="text-emerald-700"/>
                                <span className="text-[7.5px] font-bold text-slate-700 uppercase">{item.label}</span>
                            </div>
                            <span className="font-black text-black">{currency(item.val)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center p-2 bg-emerald-500 border border-slate-900 rounded mt-2 shadow-sm">
                        <span className="text-[8px] font-black uppercase text-black">Total Ativos Operacionais</span>
                        <span className="text-[10px] font-black text-black">{currency(report.totalAssets - report.totalBankBalance)}</span>
                    </div>
                </div>
            </div>

            {/* PASSIVOS */}
            <div className="break-inside-avoid">
                <h3 className="font-black text-rose-800 uppercase text-[8px] mb-2 border-b-2 border-rose-600 pb-1 flex items-center gap-2 italic">
                    <ArrowDownCircle size={10} /> Obrigações e Débitos (Passivos)
                </h3>
                <div className="space-y-1.5">
                    {[
                        { icon: Package, label: "Dívida Fornecedores (Grãos)", val: report.pendingPurchasePayments },
                        { icon: Truck, label: "Saldos de Frete a Liquidar", val: report.pendingFreightPayments },
                        { icon: Percent, label: "Comissões a Pagar (Corretores)", val: report.commissionsToPay },
                        { icon: Users, label: "Obrigações com Sócios (Saldos Credores)", val: report.shareholderPayables },
                        { icon: BankIcon, label: "Créditos de Terceiros / Emprest.", val: report.loansTaken },
                        { icon: PiggyBank, label: "Adiantamentos Recebidos", val: report.advancesTaken }
                    ].map((item, idx) => (
                        <div key={idx} className="flex justify-between p-2 border border-rose-200 bg-rose-50/40 rounded">
                            <div className="flex items-center gap-2">
                                <item.icon size={10} className="text-rose-700"/>
                                <span className="text-[7.5px] font-bold text-slate-700 uppercase">{item.label}</span>
                            </div>
                            <span className="font-black text-black">{currency(item.val)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center p-2 bg-rose-500 border border-slate-900 rounded mt-2 shadow-sm">
                        <span className="text-[8px] font-black uppercase text-black">Total Obrigações</span>
                        <span className="text-[10px] font-black text-black">{currency(report.totalLiabilities)}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* 5. PATRIMÔNIO LÍQUIDO FINAL */}
        <div className="mt-auto bg-slate-900 border-2 border-black rounded-xl p-6 flex justify-between items-center shadow-xl break-inside-avoid h-24">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-blue-400">
                    <Scale size={32} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Patrimônio Líquido Real Projetado</h4>
                    <p className="text-[8px] text-slate-500 font-bold uppercase italic">Sobra integral estimada após liquidação total de ativos e passivos operacionais</p>
                </div>
            </div>
            <div className="text-right">
                <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Resultado Líquido Final</span>
                <p className={`text-2xl font-black tracking-tighter ${report.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currency(report.netBalance)}
                </p>
            </div>
        </div>

        {/* RODAPÉ TÉCNICO */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
           <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><BadgeCheck size={10} className="text-blue-500" /> Relatório Validado via Fluxo ERP</span>
              <span>Página 1 de 1</span>
           </div>
           <span>Autenticado em {dateTime(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  );
};

export default CashierReportTemplate;
