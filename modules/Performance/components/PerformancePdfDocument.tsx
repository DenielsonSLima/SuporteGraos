import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { PerformanceReport } from '../types';
import { settingsService } from '../../../services/settingsService';
import { formatMoney, formatDecimal } from '../../../utils/formatters';

interface Props {
  data: PerformanceReport;
  periodLabel: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: 0.03,
    width: '60%',
    objectFit: 'contain',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 10,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  companyDetail: {
    fontSize: 7,
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1d4ed8',
    marginTop: 4,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    width: '32%',
  },
  infoLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  infoValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  tableCellBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  footer: {
    marginTop: 8,
    paddingTop: 6,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 6,
    color: '#94a3b8',
    fontFamily: 'Helvetica',
  },
});

const PerformancePdfDocument: React.FC<Props> = ({ data, periodLabel }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {watermark.imageUrl && (
          <Image src={watermark.imageUrl} style={styles.watermark} />
        )}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
            <View>
              <Text style={styles.companyName}>{company.razaoSocial}</Text>
              <Text style={styles.companyDetail}>CNPJ: {company.cnpj} | {company.cidade}/{company.uf} • {company.telefone}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>Relatório de Performance Analítica</Text>
            <Text style={styles.subtitle}>DRE Gerencial • Período: {periodLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KPIs Financeiros</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Faturamento</Text>
              <Text style={styles.kpiValue}>{formatMoney(data.totalRevenue)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Débitos Totais</Text>
              <Text style={styles.kpiValue}>{formatMoney(data.totalDebits)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Saldo</Text>
              <Text style={styles.kpiValue}>{formatMoney(data.balance)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Lucro Médio/SC</Text>
              <Text style={styles.kpiValue}>{formatMoney(data.avgProfitPerSc)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Margem Global</Text>
              <Text style={styles.kpiValue}>{formatDecimal(data.globalMarginPercent)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores Operacionais</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Volume (Ton)</Text>
              <Text style={styles.infoValue}>{formatDecimal(data.totalVolumeTon)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Volume (SC)</Text>
              <Text style={styles.infoValue}>{formatDecimal(data.totalVolumeSc)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Preço Médio Compra</Text>
              <Text style={styles.infoValue}>{formatMoney(data.avgPurchasePrice)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Preço Médio Venda</Text>
              <Text style={styles.infoValue}>{formatMoney(data.avgSalesPrice)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Frete Médio/Ton</Text>
              <Text style={styles.infoValue}>{formatMoney(data.avgFreightPriceTon)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Custo Total/SC</Text>
              <Text style={styles.infoValue}>{formatMoney(data.avgTotalCostPerSc)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Frete/SC</Text>
              <Text style={styles.infoValue}>{formatMoney(data.avgFreightCostSc)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Adm/Fixo/SC</Text>
              <Text style={styles.infoValue}>{formatMoney(data.avgPureOpCostSc)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Desp. Mensais</Text>
              <Text style={styles.infoValue}>{formatMoney(data.avgOtherExpensesMonthly)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demonstrativo Mensal Consolidado</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellBold, { width: '20%' }]}>Mês/Ano</Text>
              <Text style={[styles.tableCellBold, { width: '20%', textAlign: 'right' }]}>Faturamento</Text>
              <Text style={[styles.tableCellBold, { width: '20%', textAlign: 'right' }]}>Custos Dir.</Text>
              <Text style={[styles.tableCellBold, { width: '20%', textAlign: 'right' }]}>Saldo Líq.</Text>
              <Text style={[styles.tableCellBold, { width: '20%', textAlign: 'right' }]}>Qtd. (SC)</Text>
            </View>
            {data.monthlyHistory.map((m) => (
              <View key={m.fullDate} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '20%' }]}>{m.name} {m.fullDate.split('-')[0]}</Text>
                <Text style={[styles.tableCell, { width: '20%', textAlign: 'right', color: '#047857' }]}>{formatMoney(m.revenue)}</Text>
                <Text style={[styles.tableCell, { width: '20%', textAlign: 'right', color: '#b91c1c' }]}>{formatMoney(m.purchaseCost + m.freightCost)}</Text>
                <Text style={[styles.tableCell, { width: '20%', textAlign: 'right', color: m.netResult >= 0 ? '#1d4ed8' : '#b91c1c' }]}>{formatMoney(m.netResult)}</Text>
                <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>{formatDecimal(m.totalQuantitySc)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Breakdown de Despesas</Text>
          {data.expenseBreakdown.map((cat) => (
            <View key={cat.label} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{cat.label} — {formatMoney(cat.total)}</Text>
              {cat.items.map((item) => (
                <Text key={item.name} style={{ fontSize: 7, color: '#64748b', marginLeft: 6 }}>
                  {item.name}: {formatMoney(item.value)} ({formatDecimal(item.percentage)}%)
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance por Safra/UF</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellBold, { width: '12%' }]}>UF</Text>
              <Text style={[styles.tableCellBold, { width: '18%', textAlign: 'right' }]}>Volume (SC)</Text>
              <Text style={[styles.tableCellBold, { width: '18%', textAlign: 'right' }]}>Preço Compra</Text>
              <Text style={[styles.tableCellBold, { width: '18%', textAlign: 'right' }]}>Preço Venda</Text>
              <Text style={[styles.tableCellBold, { width: '18%', textAlign: 'right' }]}>Frete Médio</Text>
              <Text style={[styles.tableCellBold, { width: '16%', textAlign: 'right' }]}>Total Vendas</Text>
            </View>
            {data.harvests.map((h) => (
              <View key={`${h.uf}-${h.totalSales}`} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '12%' }]}>{h.uf}</Text>
                <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>{formatDecimal(h.volumeSc)}</Text>
                <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>{formatMoney(h.avgPurchasePrice)}</Text>
                <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>{formatMoney(h.avgSalesPrice)}</Text>
                <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>{formatMoney(h.avgFreightPrice)}</Text>
                <Text style={[styles.tableCell, { width: '16%', textAlign: 'right' }]}>{formatMoney(h.totalSales)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ERP Suporte Grãos • Exportação Oficial</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} fixed />
        </View>
      </Page>
    </Document>
  );
};

export default PerformancePdfDocument;
