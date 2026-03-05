import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';
import { FileText, ArrowDownRight } from 'lucide-react';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const date = (val: string) => new Date(val + 'T12:00:00').toLocaleDateString('pt-BR');

    const totalBruto = data.summary?.find(s => s.label.includes('Bruto'))?.value || 0;
    const totalPago = data.summary?.find(s => s.label.includes('Pagos'))?.value || 0;
    const totalSaldo = data.summary?.find(s => s.label.includes('Saldo'))?.value || 0;

    return (
        <ReportLayout title={data.title} subtitle={data.subtitle} landscape>
            <table className="w-full border-collapse mb-6">
                <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                        <th className="py-2 px-2 text-left font-bold uppercase text-slate-700 text-[10px]">Data</th>
                        <th className="py-2 px-2 text-left font-bold uppercase text-slate-700 text-[10px]">Transportadora / Placa</th>
                        <th className="py-2 px-2 text-left font-bold uppercase text-slate-700 text-[10px]">Origem / Destino</th>
                        <th className="py-2 px-2 text-right font-bold uppercase text-slate-700 text-[10px]">Valor Bruto</th>
                        <th className="py-2 px-2 text-right font-bold uppercase text-slate-700 text-[10px]">Total Pago</th>
                        <th className="py-2 px-2 text-right font-bold uppercase text-slate-700 text-[10px]">Saldo Pendente</th>
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map((row: any, idx: number) => (
                        <React.Fragment key={idx}>
                            {/* Linha principal do Frete */}
                            <tr className="border-b border-slate-200 bg-white hover:bg-slate-50">
                                <td className="py-3 px-2 text-xs font-medium text-slate-900 border-l-4 border-blue-500">
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-blue-500" />
                                        {date(row.date)}
                                    </div>
                                </td>
                                <td className="py-3 px-2">
                                    <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{row.carrier}</p>
                                    <p className="text-[10px] text-slate-500">Motorista: {row.driver} | Placa: {row.plate}</p>
                                </td>
                                <td className="py-3 px-2">
                                    <p className="text-xs text-slate-900 truncate max-w-[200px]">{row.origin}</p>
                                    <p className="text-[10px] text-slate-500">Para: {row.destination}</p>
                                </td>
                                <td className="py-3 px-2 text-right text-xs font-bold text-slate-900">
                                    {currency(row.freightValue)}
                                </td>
                                <td className="py-3 px-2 text-right text-xs font-bold text-emerald-600">
                                    {currency(row.freightPaid)}
                                </td>
                                <td className={`py-3 px-2 text-right text-xs font-bold ${row.balance > 0.01 ? 'text-red-500' : 'text-slate-400'}`}>
                                    {row.balance > 0.01 ? currency(row.balance) : 'Quitado'}
                                </td>
                            </tr>

                            {/* Sub-linhas dos pagamentos */}
                            {row.payments && row.payments.length > 0 && (
                                <tr className="bg-slate-50/50">
                                    <td colSpan={6} className="p-0 border-b border-slate-200">
                                        <div className="pl-8 pr-2 py-2 w-full">
                                            <table className="w-full">
                                                <tbody>
                                                    {row.payments.map((p: any, pIdx: number) => (
                                                        <tr key={pIdx} className="border-b border-dashed border-slate-200 last:border-0">
                                                            <td className="py-1 px-2 text-left w-1/4">
                                                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
                                                                    <ArrowDownRight size={12} />
                                                                    Pagamento em {date(p.date)}
                                                                </div>
                                                            </td>
                                                            <td className="py-1 px-2 text-left text-[10px] text-slate-500 w-1/2">
                                                                Conta: {p.account}
                                                                {p.discount > 0 ? ` (Abatimento: ${currency(p.discount)})` : ''}
                                                            </td>
                                                            <td className="py-1 px-2 text-right text-[10px] font-bold text-emerald-600 w-1/4">
                                                                {currency(p.value)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}

                    {/* Fallback de array vazio */}
                    {data.rows.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-8 text-center text-sm text-slate-500 bg-white">
                                Nenhum frete encontrado no período selecionado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Resumo do Rodapé */}
            <div className="flex justify-end gap-10 border-t-2 border-slate-800 pt-4 mt-6">
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Total Fretes Bruto</p>
                    <p className="text-base font-bold text-slate-900">{currency(totalBruto)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Total Pago</p>
                    <p className="text-base font-bold text-emerald-600">{currency(totalPago)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Saldo Pendente</p>
                    <p className="text-base font-bold text-red-500">{currency(totalSaldo)}</p>
                </div>
            </div>
        </ReportLayout>
    );
};

export default Template;
