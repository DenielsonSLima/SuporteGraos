import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfSummary } from '../../../../components/pdf/PdfSummary';
import { GeneratedReportData } from '../../types';

// Estilos específicos para este relatório que possui sub-linhas
const localStyles = StyleSheet.create({
    th: {
        padding: 4,
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
        color: '#334155'
    },
    tdContainer: {
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 4,
        paddingRight: 4,
        flexDirection: 'column'
    },
    mainText: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#0f172a',
        marginBottom: 2
    },
    subText: {
        fontSize: 7,
        color: '#64748b'
    },
    paymentRow: {
        flexDirection: 'row',
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        borderBottomStyle: 'dashed'
    },
    paymentTextInfo: {
        fontSize: 7,
        color: '#64748b',
        flex: 1
    },
    paymentTextDate: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#059669',
        width: '25%'
    },
    paymentTextValue: {
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#059669',
        width: '25%',
        textAlign: 'right',
        paddingRight: 8
    }
});

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
    const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const date = (val: string) => new Date(val + 'T12:00:00').toLocaleDateString('pt-BR');

    const totalBruto = data.summary?.find(s => s.label.includes('Bruto'))?.value || 0;
    const totalPago = data.summary?.find(s => s.label.includes('Pagos'))?.value || 0;
    const totalSaldo = data.summary?.find(s => s.label.includes('Saldo'))?.value || 0;

    const summaryItems = [
        { label: 'Total Fretes Bruto', value: currency(totalBruto), highlight: 'neutral' as const },
        { label: 'Total Pago', value: currency(totalPago), highlight: 'positive' as const },
        { label: 'Saldo Pendente', value: currency(totalSaldo), highlight: 'negative' as const }
    ];

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={pdfStyles.page}>
                <PdfWatermark />
                <PdfHeader title={data.title} subtitle={data.subtitle} />

                <View style={pdfStyles.section}>
                    {/* Header da Tabela */}
                    <View style={[pdfStyles.tableHeader, { backgroundColor: '#f1f5f9' }]}>
                        <Text style={[localStyles.th, { width: '12%' }]}>Data</Text>
                        <Text style={[localStyles.th, { width: '28%' }]}>Transportadora / Placa</Text>
                        <Text style={[localStyles.th, { width: '25%' }]}>Origem / Destino</Text>
                        <Text style={[localStyles.th, { width: '13%', textAlign: 'right' }]}>Valor Bruto</Text>
                        <Text style={[localStyles.th, { width: '12%', textAlign: 'right' }]}>Total Pago</Text>
                        <Text style={[localStyles.th, { width: '10%', textAlign: 'right' }]}>Saldo</Text>
                    </View>

                    {/* Corpo da Tabela */}
                    {data.rows.map((row: any, idx: number) => (
                        <View wrap={false} key={idx} style={{ borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>

                            {/* Linha Principal - Frete */}
                            <View style={{ flexDirection: 'row' }}>
                                <View style={[localStyles.tdContainer, { width: '12%' }]}>
                                    <Text style={{ fontSize: 8, color: '#3b82f6', fontFamily: 'Helvetica-Bold' }}>{date(row.date)}</Text>
                                </View>

                                <View style={[localStyles.tdContainer, { width: '28%' }]}>
                                    <Text style={localStyles.mainText}>{row.carrier}</Text>
                                    <Text style={localStyles.subText}>Mot: {row.driver} | Placa: {row.plate}</Text>
                                </View>

                                <View style={[localStyles.tdContainer, { width: '25%' }]}>
                                    <Text style={localStyles.mainText}>{row.origin}</Text>
                                    <Text style={localStyles.subText}>Para: {row.destination}</Text>
                                </View>

                                <View style={[localStyles.tdContainer, { width: '13%' }]}>
                                    <Text style={[localStyles.mainText, { textAlign: 'right' }]}>{currency(row.freightValue)}</Text>
                                </View>

                                <View style={[localStyles.tdContainer, { width: '12%' }]}>
                                    <Text style={[localStyles.mainText, { textAlign: 'right', color: '#059669' }]}>{currency(row.freightPaid)}</Text>
                                </View>

                                <View style={[localStyles.tdContainer, { width: '10%' }]}>
                                    <Text style={[localStyles.mainText, { textAlign: 'right', color: row.balance > 0.01 ? '#ef4444' : '#94a3b8' }]}>
                                        {row.balance > 0.01 ? currency(row.balance) : 'Quitado'}
                                    </Text>
                                </View>
                            </View>

                            {/* Linhas Secundárias - Pagamentos */}
                            {row.payments && row.payments.length > 0 && (
                                <View style={{ backgroundColor: '#f8fafc', paddingLeft: '12%', paddingRight: '22%' }}>
                                    {row.payments.map((p: any, pIdx: number) => (
                                        <View key={pIdx} style={localStyles.paymentRow}>
                                            <Text style={localStyles.paymentTextDate}>Pago em {date(p.date)}</Text>
                                            <Text style={localStyles.paymentTextInfo}>
                                                Conta: {p.account}
                                                {p.discount > 0 ? ` (Abate: ${currency(p.discount)})` : ''}
                                            </Text>
                                            <Text style={localStyles.paymentTextValue}>{currency(p.value)}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}

                    {/* Empty State */}
                    {data.rows.length === 0 && (
                        <View style={{ padding: 16, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, color: '#64748b' }}>Nenhum frete encontrado no período selecionado.</Text>
                        </View>
                    )}
                </View>

                <PdfSummary items={summaryItems} />

                <PdfFooter />
            </Page>
        </Document>
    );
};

export default PdfDocument;
