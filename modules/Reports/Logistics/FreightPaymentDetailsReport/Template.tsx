import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';
import { FileText, ArrowDownRight, ArrowRight, Scale, AlertTriangle, Banknote, CreditCard, Clock } from 'lucide-react';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const date = (val: string) => {
        if (!val) return '-';
        const d = val.length <= 10 ? val + 'T12:00:00' : val;
        return new Date(d).toLocaleDateString('pt-BR');
    };
    const numberFmt = (val: number | null) => val != null ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val) : '-';

    // KPIs do summary
    const getKpi = (label: string) => data.summary?.find(s => s.label.includes(label))?.value || 0;
    const totalFretes = getKpi('Total Fretes');
    const totalPago = getKpi('Pago (direto)');
    const totalAdiant = getKpi('Total Adiantamentos');
    const totalSaldoAdiant = getKpi('Saldo Adiantamentos Fornecedor');
    const totalDescontos = getKpi('Descontos');
    const totalSaldo = getKpi('Saldo Pendente');
    const totalDespesas = getKpi('Despesas');

    return (
        <ReportLayout title={data.title} subtitle={data.subtitle} landscape>
            {/* KPI Cards */}
            <div className="grid grid-cols-7 gap-3 mb-6">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-[9px] uppercase font-bold text-blue-400">Total Fretes</p>
                    <p className="text-sm font-bold text-blue-800">{currency(totalFretes)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                    <p className="text-[9px] uppercase font-bold text-emerald-400">Pago Direto</p>
                    <p className="text-sm font-bold text-emerald-800">{currency(totalPago)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-[9px] uppercase font-bold text-amber-400">Adiant. Consumidos</p>
                    <p className="text-sm font-bold text-amber-800">{currency(totalAdiant)}</p>
                </div>
                <div className="bg-fuchsia-50 rounded-lg p-3 border border-fuchsia-200">
                    <p className="text-[9px] uppercase font-bold text-fuchsia-400">Saldo Adiant. Disp.</p>
                    <p className="text-sm font-bold text-fuchsia-800">{currency(totalSaldoAdiant)}</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
                    <p className="text-[9px] uppercase font-bold text-violet-400">Descontos</p>
                    <p className="text-sm font-bold text-violet-800">{currency(totalDescontos)}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <p className="text-[9px] uppercase font-bold text-orange-400">Despesas Extras</p>
                    <p className="text-sm font-bold text-orange-800">{currency(totalDespesas)}</p>
                </div>
                <div className={`${totalSaldo > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} rounded-lg p-3 border`}>
                    <p className={`text-[9px] uppercase font-bold ${totalSaldo > 0 ? 'text-red-400' : 'text-slate-400'}`}>Saldo Pendente</p>
                    <p className={`text-sm font-bold ${totalSaldo > 0 ? 'text-red-700' : 'text-slate-400'}`}>{currency(totalSaldo)}</p>
                </div>
            </div>

            {/* Tabela Principal */}
            <table className="w-full border-collapse mb-4">
                <thead>
                    <tr className="bg-slate-800 text-white">
                        <th className="py-2 px-2 text-left text-[9px] font-bold uppercase">Data</th>
                        <th className="py-2 px-2 text-left text-[9px] font-bold uppercase">Transp. / Motorista</th>
                        <th className="py-2 px-2 text-center text-[9px] font-bold uppercase">Pesagem</th>
                        <th className="py-2 px-2 text-center text-[9px] font-bold uppercase">Cálculo Frete</th>
                        <th className="py-2 px-2 text-right text-[9px] font-bold uppercase">Valor Frete</th>
                        <th className="py-2 px-2 text-right text-[9px] font-bold uppercase">Pago/Adiant.</th>
                        <th className="py-2 px-2 text-right text-[9px] font-bold uppercase">Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row: any, idx: number) => {
                        const statusColor = row.financialStatus === 'paid'
                            ? 'border-emerald-500'
                            : row.financialStatus === 'partial'
                            ? 'border-amber-500'
                            : 'border-red-500';

                        return (
                            <React.Fragment key={idx}>
                                {/* ─── LINHA PRINCIPAL DO FRETE ─── */}
                                <tr className={`border-b border-slate-200 bg-white hover:bg-slate-50 border-l-4 ${statusColor}`}>
                                    <td className="py-2.5 px-2 text-xs font-medium text-slate-900">
                                        <div className="flex items-center gap-1.5">
                                            <FileText size={13} className="text-blue-500 shrink-0" />
                                            {date(row.date)}
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-2">
                                        <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">{row.carrier}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {row.driver} • {row.plate}
                                        </p>
                                        {row.supplier && (
                                            <p className="text-[10px] text-slate-400">
                                                De: {row.supplier} <ArrowRight size={8} className="inline" /> {row.destination}
                                            </p>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] text-slate-600">
                                                <Scale size={10} className="inline mr-1 text-blue-400" />
                                                Carrego: <span className="font-bold text-slate-900">{numberFmt(row.weightOriginKg)}</span> kg
                                            </p>
                                            <p className="text-[10px] text-slate-600">
                                                Descarrego: <span className="font-bold text-slate-900">{row.weightUnloadKg != null ? numberFmt(row.weightUnloadKg) : 'N/D'}</span> kg
                                            </p>
                                            {row.breakageKg != null && row.breakageKg > 0 && (
                                                <p className="text-[10px] text-red-500 font-medium">
                                                    <AlertTriangle size={10} className="inline mr-1" />
                                                    Quebra: {numberFmt(row.breakageKg)} kg
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                                            row.freightBase === 'Destino' 
                                                ? 'bg-violet-100 text-violet-700 border border-violet-200' 
                                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                                        }`}>
                                            Pelo {row.freightBase}
                                        </span>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            R$ {row.freightPerTon?.toFixed(2) || '0.00'}/ton
                                        </p>
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-xs font-bold text-slate-900">
                                        {currency(row.freightValue)}
                                    </td>
                                    <td className="py-2.5 px-2 text-right">
                                        <p className="text-xs font-bold text-emerald-600">{currency(row.paidValue)}</p>
                                        {row.advanceValue > 0 && (
                                            <p className="text-[10px] text-amber-600">Adiant: {currency(row.advanceValue)}</p>
                                        )}
                                        {row.totalDiscount > 0 && (
                                            <p className="text-[10px] text-violet-500">Desc: {currency(row.totalDiscount)}</p>
                                        )}
                                    </td>
                                    <td className={`py-2.5 px-2 text-right text-xs font-bold ${row.balanceValue > 0.01 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {row.balanceValue > 0.01 ? currency(row.balanceValue) : '✓ Quitado'}
                                    </td>
                                </tr>

                                {/* ─── DESPESAS EXTRAS ─── */}
                                {row.extraExpenses && row.extraExpenses.length > 0 && (
                                    <tr className="bg-orange-50/40">
                                        <td colSpan={7} className="p-0 border-b border-orange-100">
                                            <div className="pl-8 pr-3 py-1.5">
                                                <p className="text-[9px] font-bold text-orange-600 uppercase mb-1">Despesas Extras</p>
                                                {row.extraExpenses.map((exp: any, eIdx: number) => (
                                                    <div key={eIdx} className="flex items-center justify-between border-b border-dashed border-orange-100 last:border-0 py-0.5">
                                                        <span className="text-[10px] text-orange-700">
                                                            {exp.type === 'deduction' ? '(−) ' : '(+) '}
                                                            {exp.description || 'Despesa'}
                                                        </span>
                                                        <span className={`text-[10px] font-bold ${exp.type === 'deduction' ? 'text-red-500' : 'text-orange-700'}`}>
                                                            {currency(exp.value)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {/* ─── DETALHAMENTO DE PAGAMENTOS / ADIANTAMENTOS ─── */}
                                {row.allPayments && row.allPayments.length > 0 && (
                                    <tr className="bg-slate-50/60">
                                        <td colSpan={7} className="p-0 border-b border-slate-200">
                                            <div className="pl-8 pr-3 py-2">
                                                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Histórico de Pagamentos</p>
                                                <table className="w-full">
                                                    <tbody>
                                                        {row.allPayments.map((p: any, pIdx: number) => {
                                                            const isAdvance = p.type === 'advance';
                                                            return (
                                                                <tr key={pIdx} className="border-b border-dashed border-slate-200 last:border-0">
                                                                    <td className="py-1 px-1 w-[35%]">
                                                                        <div className="flex items-center gap-1.5">
                                                                            {isAdvance ? (
                                                                                <CreditCard size={11} className="text-amber-500 shrink-0" />
                                                                            ) : (
                                                                                <Banknote size={11} className="text-emerald-500 shrink-0" />
                                                                            )}
                                                                            <span className={`text-[10px] font-medium ${isAdvance ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                                                {isAdvance ? 'Adiantamento' : 'Pagamento'} em {date(p.date)}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1 px-1 text-[10px] text-slate-500 w-[35%]">
                                                                        {p.description && p.description !== 'Pagamento' && p.description !== 'Adiantamento consumido' 
                                                                            ? `${p.description} • ` : ''}
                                                                        Conta: {p.account}
                                                                    </td>
                                                                    <td className={`py-1 px-1 text-right text-[10px] font-bold w-[30%] ${isAdvance ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                        {currency(p.value)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                                {row.previousMonthPayments > 0 && (
                                                    <div className="flex items-center gap-1 mt-1.5 text-[9px] text-blue-600 bg-blue-50 rounded px-2 py-1">
                                                        <Clock size={10} />
                                                        <span>{row.previousMonthPayments} pagamento(s) de meses anteriores</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {/* ─── NENHUM PAGAMENTO ─── */}
                                {(!row.allPayments || row.allPayments.length === 0) && row.balanceValue > 0.01 && (
                                    <tr className="bg-red-50/30">
                                        <td colSpan={7} className="py-1 px-8 text-[10px] text-red-400 italic border-b border-red-100">
                                            Nenhum pagamento registrado — Frete totalmente em aberto
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}

                    {data.rows.length === 0 && (
                        <tr>
                            <td colSpan={7} className="py-10 text-center text-sm text-slate-500 bg-white">
                                Nenhum frete encontrado no período selecionado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Legenda */}
            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-200 text-[9px] text-slate-400">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 bg-emerald-500 rounded" />
                    <span>Quitado</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 bg-amber-500 rounded" />
                    <span>Parcial</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 bg-red-500 rounded" />
                    <span>Pendente</span>
                </div>
                <div className="flex items-center gap-1">
                    <Banknote size={10} className="text-emerald-500" />
                    <span>Pagamento direto</span>
                </div>
                <div className="flex items-center gap-1">
                    <CreditCard size={10} className="text-amber-500" />
                    <span>Adiantamento consumido</span>
                </div>
            </div>
        </ReportLayout>
    );
};

export default Template;
