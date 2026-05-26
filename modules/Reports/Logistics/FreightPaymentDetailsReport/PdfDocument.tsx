import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfSummary } from '../../../../components/pdf/PdfSummary';
import { GeneratedReportData } from '../../types';

const s = StyleSheet.create({
    th: { padding: 4, fontSize: 6.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#ffffff' },
    tdBox: { paddingTop: 3, paddingBottom: 3, paddingLeft: 3, paddingRight: 3, flexDirection: 'column' },
    mainTxt: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 1 },
    subTxt: { fontSize: 6.5, color: '#64748b' },
    badge: { fontSize: 6, paddingVertical: 1, paddingHorizontal: 4, borderRadius: 2, fontFamily: 'Helvetica-Bold' },
    payRow: { flexDirection: 'row', paddingTop: 2, paddingBottom: 2, paddingLeft: 12, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', borderBottomStyle: 'dashed' },
    expRow: { flexDirection: 'row', paddingTop: 1, paddingBottom: 1, paddingLeft: 12, borderBottomWidth: 0.5, borderBottomColor: '#fed7aa', borderBottomStyle: 'dashed' },
    kpiBox: { flex: 1, padding: 6, borderRadius: 4, borderWidth: 0.5 },
    kpiLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 2 },
    kpiValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
    sectionLabel: { fontSize: 6, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', paddingLeft: 12, paddingTop: 3, paddingBottom: 2 },
});

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
    const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const dt = (val: string) => {
        if (!val) return '-';
        const pureDate = val.split('T')[0];
        const parts = pureDate.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            if (year.length === 4) {
                return `${day}/${month}/${year}`;
            }
        }
        return new Date((val.length <= 10 ? val + 'T12:00:00' : val)).toLocaleDateString('pt-BR');
    };
    const num = (val: number | null) => val != null ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val) : '-';

    const getKpi = (label: string) => data.summary?.find(s => s.label.includes(label))?.value || 0;

    const kpis = [
        { label: 'Total Fretes', value: fmt(getKpi('Total Fretes')), bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
        { label: 'Pago Direto', value: fmt(getKpi('Pago (direto)')), bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
        { label: 'Adiant. Usado', value: fmt(getKpi('Total Adiantamentos')), bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
        { label: 'Saldo Adiant.', value: fmt(getKpi('Saldo Adiantamentos Fornecedor')), bg: '#fdf4ff', border: '#f5d0fe', color: '#86198f' },
        { label: 'Descontos', value: fmt(getKpi('Descontos')), bg: '#f5f3ff', border: '#c4b5fd', color: '#5b21b6' },
        { label: 'Saldo Pendente', value: fmt(getKpi('Saldo Pendente')), bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
    ];

    const summaryItems = [
        { label: 'Total Fretes Bruto', value: fmt(getKpi('Total Fretes')), highlight: 'neutral' as const },
        { label: 'Total Pago', value: fmt(getKpi('Pago (direto)')), highlight: 'positive' as const },
        { label: 'Total Adiantamentos Usados', value: fmt(getKpi('Total Adiantamentos')), highlight: 'neutral' as const },
        { label: 'Saldo de Adiantamentos Disponível', value: fmt(getKpi('Saldo Adiantamentos Fornecedor')), highlight: 'neutral' as const },
        { label: 'Saldo Pendente', value: fmt(getKpi('Saldo Pendente')), highlight: 'negative' as const },
    ];

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={pdfStyles.page}>
                <PdfWatermark />
                <PdfHeader title={data.title} subtitle={data.subtitle} />

                {/* KPI Row */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    {kpis.map((k, i) => (
                        <View key={i} style={[s.kpiBox, { backgroundColor: k.bg, borderColor: k.border }]}>
                            <Text style={[s.kpiLabel, { color: k.color }]}>{k.label}</Text>
                            <Text style={[s.kpiValue, { color: k.color }]}>{k.value}</Text>
                        </View>
                    ))}
                </View>

                <View style={pdfStyles.section}>
                    {/* Header */}
                    <View style={[pdfStyles.tableHeader, { backgroundColor: '#1e293b' }]}>
                        <Text style={[s.th, { width: '8%' }]}>Data</Text>
                        <Text style={[s.th, { width: '20%' }]}>Transp./Motorista</Text>
                        <Text style={[s.th, { width: '20%' }]}>Pesagem (Kg)</Text>
                        <Text style={[s.th, { width: '12%', textAlign: 'center' }]}>Cálculo</Text>
                        <Text style={[s.th, { width: '12%', textAlign: 'right' }]}>Valor Frete</Text>
                        <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>Pago/Adiant.</Text>
                        <Text style={[s.th, { width: '14%', textAlign: 'right' }]}>Saldo</Text>
                    </View>

                    {/* Body */}
                    {data.rows.map((row: any, idx: number) => {
                        const statusBorder = row.financialStatus === 'paid' ? '#10b981' : row.financialStatus === 'partial' ? '#f59e0b' : '#ef4444';
                        return (
                            <View wrap={false} key={idx} style={{ borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderLeftWidth: 3, borderLeftColor: statusBorder }}>
                                {/* Main freight row */}
                                <View style={{ flexDirection: 'row' }}>
                                    <View style={[s.tdBox, { width: '8%' }]}>
                                        <Text style={{ fontSize: 7.5, color: '#3b82f6', fontFamily: 'Helvetica-Bold' }}>{dt(row.date)}</Text>
                                    </View>
                                    <View style={[s.tdBox, { width: '20%' }]}>
                                        <Text style={s.mainTxt}>{row.carrier}</Text>
                                        <Text style={s.subTxt}>{row.driver} • {row.plate}</Text>
                                        {row.supplier ? <Text style={[s.subTxt, { fontSize: 6 }]}>De: {row.supplier} → {row.destination}</Text> : null}
                                    </View>
                                    <View style={[s.tdBox, { width: '20%' }]}>
                                        <Text style={s.subTxt}>Carrego: <Text style={{ fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>{num(row.weightOriginKg)}</Text> kg</Text>
                                        <Text style={s.subTxt}>Descarrego: <Text style={{ fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>{row.weightUnloadKg != null ? num(row.weightUnloadKg) : 'N/D'}</Text> kg</Text>
                                        {row.breakageKg != null && row.breakageKg > 0 && (
                                            <Text style={{ fontSize: 6.5, color: '#ef4444', fontFamily: 'Helvetica-Bold' }}>Quebra: {num(row.breakageKg)} kg</Text>
                                        )}
                                    </View>
                                    <View style={[s.tdBox, { width: '12%', alignItems: 'center' }]}>
                                        <Text style={[s.badge, { backgroundColor: row.freightBase === 'Destino' ? '#ede9fe' : '#dbeafe', color: row.freightBase === 'Destino' ? '#6d28d9' : '#1d4ed8' }]}>
                                            Pelo {row.freightBase}
                                        </Text>
                                        <Text style={[s.subTxt, { marginTop: 2 }]}>R$ {(row.freightPerTon || 0).toFixed(2)}/ton</Text>
                                    </View>
                                    <View style={[s.tdBox, { width: '12%' }]}>
                                        <Text style={[s.mainTxt, { textAlign: 'right' }]}>{fmt(row.freightValue)}</Text>
                                    </View>
                                    <View style={[s.tdBox, { width: '14%' }]}>
                                        <Text style={[s.mainTxt, { textAlign: 'right', color: '#059669' }]}>{fmt(row.paidValue)}</Text>
                                        {row.advanceValue > 0 && <Text style={{ fontSize: 6.5, textAlign: 'right', color: '#d97706' }}>Adiant: {fmt(row.advanceValue)}</Text>}
                                        {row.totalDiscount > 0 && <Text style={{ fontSize: 6.5, textAlign: 'right', color: '#7c3aed' }}>Desc: {fmt(row.totalDiscount)}</Text>}
                                    </View>
                                    <View style={[s.tdBox, { width: '14%' }]}>
                                        <Text style={[s.mainTxt, { textAlign: 'right', color: row.balanceValue > 0.01 ? '#ef4444' : '#10b981' }]}>
                                            {row.balanceValue > 0.01 ? fmt(row.balanceValue) : 'Quitado'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Extra expenses */}
                                {row.extraExpenses && row.extraExpenses.length > 0 && (
                                    <View style={{ backgroundColor: '#fffbeb', paddingBottom: 2 }}>
                                        <Text style={[s.sectionLabel, { color: '#c2410c' }]}>Despesas Extras</Text>
                                        {row.extraExpenses.map((exp: any, eIdx: number) => (
                                            <View key={eIdx} style={s.expRow}>
                                                <Text style={{ flex: 1, fontSize: 6.5, color: '#c2410c' }}>{exp.type === 'deduction' ? '(−) ' : '(+) '}{exp.description || 'Despesa'}</Text>
                                                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: exp.type === 'deduction' ? '#dc2626' : '#c2410c', width: '20%', textAlign: 'right', paddingRight: 8 }}>{fmt(exp.value)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Payment detail lines */}
                                {row.allPayments && row.allPayments.length > 0 && (
                                    <View style={{ backgroundColor: '#f8fafc', paddingBottom: 2 }}>
                                        <Text style={[s.sectionLabel, { color: '#475569' }]}>Histórico de Pagamentos</Text>
                                        {row.allPayments.map((p: any, pIdx: number) => {
                                            const isAdv = p.type === 'advance';
                                            return (
                                                <View key={pIdx} style={s.payRow}>
                                                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: isAdv ? '#d97706' : '#059669', width: '30%' }}>
                                                        {isAdv ? '⬇ Adiantamento' : '💵 Pagamento'} em {dt(p.date)}
                                                    </Text>
                                                    <Text style={{ fontSize: 6.5, color: '#64748b', flex: 1 }}>
                                                        {p.description && p.description !== 'Pagamento' && p.description !== 'Adiantamento consumido' ? `${p.description} • ` : ''}Conta: {p.account}
                                                    </Text>
                                                    <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: isAdv ? '#d97706' : '#059669', width: '20%', textAlign: 'right', paddingRight: 8 }}>{fmt(p.value)}</Text>
                                                </View>
                                            );
                                        })}
                                        {row.previousMonthPayments > 0 && (
                                            <View style={{ flexDirection: 'row', paddingLeft: 12, paddingTop: 2, paddingBottom: 2 }}>
                                                <Text style={{ fontSize: 6, color: '#2563eb' }}>⏰ {row.previousMonthPayments} pagamento(s) de meses anteriores</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}

                    {data.rows.length === 0 && (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, color: '#64748b' }}>Nenhum frete encontrado no período selecionado.</Text>
                        </View>
                    )}
                </View>

                <PdfSummary items={summaryItems} />

                {/* Legenda */}
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 4, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: '#e2e8f0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <View style={{ width: 8, height: 3, backgroundColor: '#10b981', borderRadius: 1 }} />
                        <Text style={{ fontSize: 6, color: '#94a3b8' }}>Quitado</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <View style={{ width: 8, height: 3, backgroundColor: '#f59e0b', borderRadius: 1 }} />
                        <Text style={{ fontSize: 6, color: '#94a3b8' }}>Parcial</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <View style={{ width: 8, height: 3, backgroundColor: '#ef4444', borderRadius: 1 }} />
                        <Text style={{ fontSize: 6, color: '#94a3b8' }}>Pendente</Text>
                    </View>
                </View>

                <PdfFooter />
            </Page>
        </Document>
    );
};

export default PdfDocument;
