
import React from 'react';
import { CashierReport } from '../types';
import { settingsService } from '../../../services/settingsService';
import {
  Sprout,
  TrendingUp,
  TrendingDown,
  Scale,
  BadgeCheck,
  CalendarDays,
  ArrowUpCircle,
  ArrowDownCircle,
  Landmark as BankIcon,
  Users,
  Package,
  Truck,
  Tractor,
  HandCoins,
  PiggyBank,
  Percent,
  BarChart3,
  MapPin,
  Phone,
  Mail,
  Handshake
} from 'lucide-react';

interface Props {
  report: CashierReport;
  title: string;
}

const CashierReportTemplate: React.FC<Props> = ({ report, title }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const formatCNPJ = (value?: string) => {
    if (!value) return 'CNPJ não informado';
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 14) return value;
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value?: string) => {
    if (!value) return 'Contato não informado';
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10) return value;
    return digits.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  const safeText = (value?: string, fallback = '—') => (value && value.trim().length > 0 ? value : fallback);

  const currency = (val: number) => {
    const cleanValue = Math.abs(val || 0) < 0.01 ? 0 : val || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanValue);
  };

  const dateTime = (val?: string) => {
    if (!val) return new Date().toLocaleString('pt-BR');
    return new Date(val).toLocaleString('pt-BR');
  };

  const referenceLabel = report.referenceDate
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(report.referenceDate))
    : 'Posição Corrente';

  const emissionDate = report.generatedAt || report.snapshotClosedDate || new Date().toISOString();
  const statusTag = report.isSnapshot ? 'Snapshot Auditável' : report.isClosed ? 'Fechamento Oficial' : 'Execução Dinâmica';
  const documentId = report.id?.toUpperCase() || 'CAIXA-AO-VIVO';
  const operator = report.snapshotClosedBy || 'Motor ERP Suporte Grãos';

  const addressLine = [safeText(company.endereco, ''), safeText(company.numero, '')]
    .filter(Boolean)
    .join(', ') || 'Endereço não informado';
  const cityUfLine = [safeText(company.cidade, ''), safeText(company.uf, '')]
    .filter(Boolean)
    .join(' / ') || 'Cidade / UF não informados';

  const bankPercent = (value: number) => {
    const total = report.totalBankBalance || 0;
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const distributionData = [
    { label: 'Ativos Totais', value: report.totalAssets, color: 'bg-emerald-500' },
    { label: 'Passivos Totais', value: report.totalLiabilities, color: 'bg-rose-500' },
    { label: 'Saldo Líquido', value: report.netBalance, color: report.netBalance >= 0 ? 'bg-blue-500' : 'bg-amber-500' }
  ];
  const distributionMax = Math.max(...distributionData.map(item => Math.abs(item.value)), 1);

  return (
    <div id="cashier-report-pdf" className="relative w-full bg-white text-black p-10 text-[8px] leading-tight font-sans min-h-[285mm] flex flex-col box-border overflow-hidden">

      {/* MARCA D'ÁGUA */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-[0.03]">
        {watermark.imageUrl ? (
          <img src={watermark.imageUrl} className="w-[60%] object-contain" alt="Marca d'água" />
        ) : (
          <Sprout size={340} className="text-slate-200" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">

        {/* CABEÇALHO */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div className="flex gap-6 items-center">
            <div className="h-16 w-auto flex items-center shrink-0 overflow-hidden">
              {company.logoUrl ? (
                <img src={company.logoUrl} className="max-h-full w-auto object-contain" alt="Logo" />
              ) : (
                <Sprout size={40} className="text-emerald-600" />
              )}
            </div>
            <div>
              <h1 className="text-base font-black uppercase text-slate-900 leading-none">{safeText(company.razaoSocial, 'Suporte Grãos')}</h1>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Fechamento 360º • Caixa & Liquidez</p>
              <div className="text-slate-600 text-[8px] mt-2 space-y-0.5 font-bold uppercase">
                <p>CNPJ: {formatCNPJ(company.cnpj)}</p>
                <p className="flex items-center gap-1"><MapPin size={10} /> {addressLine} • {cityUfLine}</p>
                <p className="flex items-center gap-2"><Phone size={10} /> {formatPhone(company.telefone)} <span className="flex items-center gap-1"><Mail size={10} /> {safeText(company.email, 'Email não informado')}</span></p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black text-slate-950 uppercase italic tracking-tighter">RELATÓRIO DE CAIXA</h2>
            <div className="mt-2 inline-flex items-center gap-2 text-[9px] font-black uppercase">
              <span className="px-3 py-1 bg-slate-900 text-white rounded-lg tracking-widest">{referenceLabel}</span>
              <span className="px-3 py-1 border border-slate-300 rounded-lg text-slate-500">#{documentId.slice(0, 10)}</span>
            </div>
            <p className="text-[7px] text-slate-500 font-bold uppercase mt-2">Emitido em {dateTime(emissionDate)}</p>
            <p className="text-[7px] text-slate-500 font-bold uppercase">Responsável: {operator}</p>
          </div>
        </div>

        {/* METADADOS DO RELATÓRIO */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { icon: CalendarDays, label: 'Período Referência', value: referenceLabel },
            { icon: Handshake, label: 'Status Operacional', value: statusTag },
            { icon: Users, label: 'Responsável Técnico', value: operator },
            { icon: Sprout, label: 'Última Atualização', value: dateTime(emissionDate) }
          ].map((meta, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl bg-white/60 backdrop-blur p-3 flex items-start gap-2">
              <meta.icon size={12} className="text-slate-500" />
              <div>
                <span className="text-[6.5px] font-black uppercase text-slate-400 block mb-0.5">{meta.label}</span>
                <p className="text-[8px] font-black text-slate-900 leading-tight">{meta.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 1. KPIs DE TOPO */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          <div className="border-2 border-slate-900 bg-slate-950 p-2.5 rounded-xl shadow-sm text-center text-white">
            <span className="text-[6px] font-black uppercase text-slate-400 block mb-0.5">Patrimônio Líquido Real</span>
            <p className={`text-[11px] font-black leading-none ${report.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{currency(report.netBalance)}</p>
          </div>
          <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-xl text-center">
            <span className="text-[6px] font-black uppercase text-slate-500 block mb-0.5">Disponível em Banco</span>
            <p className="text-[9px] font-black text-slate-900 leading-none">{currency(report.totalBankBalance)}</p>
          </div>
          <div className="border border-emerald-300 bg-emerald-50 p-2.5 rounded-xl text-center">
            <span className="text-[6px] font-black uppercase text-emerald-600 block mb-0.5">Total de Ativos</span>
            <p className="text-[9px] font-black text-slate-900 leading-none">{currency(report.totalAssets)}</p>
          </div>
          <div className="border border-rose-300 bg-rose-50 p-2.5 rounded-xl text-center">
            <span className="text-[6px] font-black uppercase text-rose-600 block mb-0.5">Total de Passivos</span>
            <p className="text-[9px] font-black text-slate-900 leading-none">{currency(report.totalLiabilities)}</p>
          </div>
          <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-xl text-center">
            <span className="text-[6px] font-black uppercase text-slate-500 block mb-0.5">Aporte Inicial</span>
            <p className="text-[9px] font-black text-slate-900 leading-none">{currency(report.totalInitialBalance)}</p>
          </div>
        </div>

        {/* POSIÇÃO DE ABERTURA E CONTEXTO */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h3 className="font-black text-slate-900 uppercase text-[8px] mb-3 border-b border-slate-200 pb-2 flex items-center gap-2 italic">
              <CalendarDays size={10} /> Posição de Abertura do Período
            </h3>
            <div className="space-y-2 max-h-40 overflow-hidden">
              {report.initialMonthBalances.map((acc, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/70 border border-slate-100 rounded px-3 py-1.5">
                  <span className="text-[7px] font-black text-slate-600 uppercase pr-2 flex-1 leading-tight">{acc.bankName}</span>
                  <span className="text-[8px] font-black text-slate-900">{currency(acc.value)}</span>
                </div>
              ))}
              {report.initialMonthBalances.length === 0 && (
                <p className="text-[7px] text-slate-500 font-bold">Sem dados informados para este período.</p>
              )}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h3 className="font-black text-slate-900 uppercase text-[8px] mb-3 border-b border-slate-200 pb-2 flex items-center gap-2 italic">
              <BankIcon size={10} /> Contexto Operacional
            </h3>
            <div className="grid grid-cols-2 gap-3 text-[7px] font-black text-slate-600 uppercase">
              <div>
                <p className="text-slate-400 mb-0.5">Snapshot?</p>
                <p className="text-slate-900">{report.isSnapshot ? 'Sim' : 'Não'}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-0.5">Fechado?</p>
                <p className="text-slate-900">{report.isClosed ? 'Sim' : 'Não'}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-0.5">Referência</p>
                <p className="text-slate-900">{referenceLabel}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-0.5">Documento</p>
                <p className="text-slate-900">#{documentId.slice(0, 12)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ESPELHO BANCÁRIO */}
        {report.bankBalances?.length > 0 && (
          <div className="mb-8 break-inside-avoid">
            <h3 className="font-black text-slate-900 uppercase text-[8px] mb-2 border-b border-slate-900 pb-1 flex items-center gap-2 italic">
              <BankIcon size={10} /> Espelho das Contas Bancárias
            </h3>
            <table className="w-full border border-slate-200 rounded-2xl overflow-hidden text-[7.5px]">
              <thead className="bg-slate-100 text-slate-600 uppercase">
                <tr>
                  <th className="text-left px-3 py-2 font-black">Banco</th>
                  <th className="text-right px-3 py-2 font-black">Saldo Atual</th>
                  <th className="text-right px-3 py-2 font-black">Participação</th>
                </tr>
              </thead>
              <tbody>
                {report.bankBalances.map(acc => (
                  <tr key={acc.id} className="border-t border-slate-100 bg-white/80">
                    <td className="px-3 py-1.5 font-black text-slate-700 uppercase">
                      <span>{acc.bankName}</span>
                      {acc.owner && <span className="block text-[6px] text-slate-400 font-bold normal-case">{acc.owner}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right font-black text-slate-900">{currency(acc.balance)}</td>
                    <td className="px-3 py-1.5 text-right font-black text-slate-500">{bankPercent(acc.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ESPELHO CONSOLIDADO + GRÁFICO */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-slate-900 uppercase text-[8px] flex items-center gap-2 italic">
              <Handshake size={10} /> Espelho Consolidado do Caixa
            </h3>
            <p className="text-[7px] font-black text-slate-500 uppercase">Referência • {referenceLabel}</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 grid grid-cols-2 gap-6">
              <div className="break-inside-avoid">
                <h4 className="font-black text-emerald-800 uppercase text-[8px] mb-2 border-b-2 border-emerald-600 pb-1 flex items-center gap-2 italic">
                  <ArrowUpCircle size={10} /> Direitos e Haveres (Ativos)
                </h4>
                <div className="space-y-1.5">
                  {[
                    { icon: TrendingUp, label: 'Recebíveis Vendas (Grãos)', val: report.pendingSalesReceipts },
                    { icon: Tractor, label: 'Patrimônio (Bens Ativos)', val: report.totalFixedAssetsValue },
                    { icon: Users, label: 'Haveres de Sócios (Débitos)', val: report.shareholderReceivables },
                    { icon: BankIcon, label: 'Empréstimos Concedidos', val: report.loansGranted },
                    { icon: Truck, label: 'Mercadoria em Trânsito', val: report.merchandiseInTransitValue },
                    { icon: HandCoins, label: 'Adiantamentos Concedidos', val: report.advancesGiven }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 border border-emerald-200 bg-emerald-50/50 rounded">
                      <div className="flex items-center gap-2">
                        <item.icon size={10} className="text-emerald-700" />
                        <span className="text-[7.5px] font-bold text-slate-700 uppercase">{item.label}</span>
                      </div>
                      <span className="font-black text-slate-900">{currency(item.val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-2 bg-emerald-500 border border-slate-900 rounded mt-2 shadow-sm text-black">
                    <span className="text-[8px] font-black uppercase">Total Ativos Operacionais</span>
                    <span className="text-[10px] font-black">{currency(report.totalAssets)}</span>
                  </div>
                </div>
              </div>

              <div className="break-inside-avoid">
                <h4 className="font-black text-rose-800 uppercase text-[8px] mb-2 border-b-2 border-rose-600 pb-1 flex items-center gap-2 italic">
                  <ArrowDownCircle size={10} /> Obrigações e Débitos (Passivos)
                </h4>
                <div className="space-y-1.5">
                  {[
                    { icon: Package, label: 'Dívida Fornecedores (Grãos)', val: report.pendingPurchasePayments },
                    { icon: Truck, label: 'Saldos de Frete a Liquidar', val: report.pendingFreightPayments },
                    { icon: Percent, label: 'Comissões a Pagar', val: report.commissionsToPay },
                    { icon: Users, label: 'Obrigações com Sócios', val: report.shareholderPayables },
                    { icon: BankIcon, label: 'Créditos de Terceiros / Emprést.', val: report.loansTaken },
                    { icon: PiggyBank, label: 'Adiantamentos Recebidos', val: report.advancesTaken }
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 border border-rose-200 bg-rose-50/50 rounded">
                      <div className="flex items-center gap-2">
                        <item.icon size={10} className="text-rose-700" />
                        <span className="text-[7.5px] font-bold text-slate-700 uppercase">{item.label}</span>
                      </div>
                      <span className="font-black text-slate-900">{currency(item.val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-2 bg-rose-500 border border-slate-900 rounded mt-2 shadow-sm text-black">
                    <span className="text-[8px] font-black uppercase">Total Obrigações</span>
                    <span className="text-[10px] font-black">{currency(report.totalLiabilities)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h4 className="font-black text-slate-900 uppercase text-[8px] mb-3 flex items-center gap-2 italic">
                <BarChart3 size={12} /> Distribuição Visual do Caixa
              </h4>
              <div className="space-y-3">
                {distributionData.map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[7px] font-black text-slate-500 uppercase mb-1">
                      <span>{item.label}</span>
                      <span>{currency(item.value)}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full`}
                        style={{ width: `${Math.min(100, (Math.abs(item.value) / distributionMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[7px] text-slate-500 font-bold uppercase text-center">
                Gráfico baseado nos valores atuais do módulo Caixa
              </p>
            </div>
          </div>
        </div>

        {/* 5. PATRIMÔNIO LÍQUIDO FINAL */}
        <div className="mt-auto bg-slate-900 border-2 border-slate-950 rounded-2xl p-6 flex justify-between items-center shadow-xl break-inside-avoid h-28 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-2xl text-blue-300">
              <Scale size={32} />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Patrimônio Líquido Real Projetado</h4>
              <p className="text-[8px] text-slate-300 font-bold uppercase italic">Sobra estimada após liquidação integral de ativos e passivos operacionais.</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8px] font-black uppercase text-slate-300 block mb-1">Resultado Líquido Final</span>
            <p className={`text-2xl font-black tracking-tighter ${report.netBalance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
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
          <span>Autenticado em {dateTime(emissionDate)}</span>
        </div>
      </div>
    </div>
  );
};

export default CashierReportTemplate;
