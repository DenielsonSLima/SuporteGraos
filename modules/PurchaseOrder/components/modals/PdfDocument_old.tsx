import React, { useMemo } from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { PurchaseOrder } from '../../types';
import { Loading } from '../../../Loadings/types';
import { settingsService } from '../../../../services/settingsService';
import { PdfVariant } from './PdfPreviewModal';

interface Props {
  order: PurchaseOrder;
  loadings: Loading[];
  variant: PdfVariant;
}

// Função para renderizar apenas variante 'producer'
const isProducerVariant = (v: PdfVariant) => v === 'producer';

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    width: 300,
    height: 300,
    opacity: 0.03,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 20,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: 'contain',
  },
  companyInfo: {
    gap: 2,
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  companyDetail: {
    fontSize: 8,
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  titleBox: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  titleSmall: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#ffffff',
    opacity: 0.6,
    letterSpacing: 1,
  },
  titleMain: {
    fontSize: 12,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#ffffff',
    marginTop: 4,
  },
  orderNumber: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#10b981',
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginTop: 8,
  },
  dateValue: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  dashboard: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dashCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dashLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: 4,
  },
  dashValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  dashBar: {
    height: 2,
    width: 30,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
    marginTop: 4,
  },
  balanceCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  balanceLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  balanceStatus: {
    fontSize: 6,
    fontFamily: 'Helvetica-BoldOblique',
    textTransform: 'uppercase',
    color: '#ffffff',
    opacity: 0.7,
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1e293b',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
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
    borderBottomColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  summary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    fontFamily: 'Helvetica',
  },
  footerBold: {
    fontSize: 7,
    color: '#1e293b',
    fontFamily: 'Helvetica-Bold',
  },
});

const PdfDocument: React.FC<Props> = ({ order, loadings, variant }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  // Formatadores
  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  const num = (val: number, dec = 2) => 
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(val || 0);

  const dateStr = (val: string) => {
    if (!val) return '-';
    if (val.includes('T')) return new Date(val).toLocaleDateString('pt-BR');
    const [year, month, day] = val.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDoc = (doc: string) => {
    if (!doc) return '';
    return doc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
              .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  // Cálculos consolidados
  const stats = useMemo(() => {
    const activeLoadings = loadings.filter(l => l.status !== 'canceled');
    
    const totalWeightKg = activeLoadings.reduce((acc, l) => acc + l.weightKg, 0);
    const totalWeightSc = activeLoadings.reduce((acc, l) => acc + l.weightSc, 0);
    const totalLoadedValue = activeLoadings.reduce((acc, l) => acc + l.totalPurchaseValue, 0);
    
    const avgPricePerSc = totalWeightSc > 0 ? totalLoadedValue / totalWeightSc : 0;

    const payments = (order.transactions || []).filter(t => t.type === 'payment' || t.type === 'advance');
    const expenses = (order.transactions || []).filter(t => t.type === 'expense');
    const debitedExpenses = expenses.filter(t => t.deductFromPartner);

    const totalPaid = payments.reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);
    const totalDebited = debitedExpenses.reduce((acc, t) => acc + t.value, 0);
    
    const balance = totalLoadedValue - totalPaid - totalDebited;

    return {
      totalWeightKg,
      totalWeightSc,
      totalLoadedValue,
      avgPricePerSc,
      payments,
      debitedExpenses,
      totalPaid,
      totalDebited,
      balance,
      activeLoadings
    };
  }, [order, loadings]);

  const isProducerVariant = variant === 'producer';
  const title = isProducerVariant ? 'EXTRATO CONSOLIDADO - PRODUTOR' : 'AUDITORIA INTERNA - COMPRA';

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation={variant === 'internal' ? 'landscape' : 'portrait'}>
        {/* Watermark */}
        {watermark.imageUrl && (
          <View style={{ position: 'absolute', top: 150, left: 150, width: 300, height: 300, opacity: 0.03 }}>
            <Image src={watermark.imageUrl} style={{ width: 300, height: 300 }} />
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logoUrl && (
              <Image src={company.logoUrl} style={styles.logo} />
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.nomeFantasia}</Text>
              <Text style={styles.companyDetail}>Razão Social: {company.razaoSocial}</Text>
              <Text style={styles.companyDetail}>CNPJ: {formatDoc(company.cnpj)}</Text>
              <Text style={styles.companyDetail}>{company.endereco}, {company.numero} - {company.bairro}</Text>
              <Text style={styles.companyDetail}>{company.cidade}/{company.uf} - CEP: {company.cep}</Text>
              <Text style={styles.companyDetail}>Tel: {company.telefone}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.titleBox}>
              <Text style={styles.titleSmall}>{title}</Text>
              <Text style={styles.titleMain}>ORDEM DE COMPRA</Text>
              <Text style={styles.orderNumber}>#{order.number}</Text>
            </View>
            <Text style={styles.dateLabel}>
              EMISSÃO: <Text style={styles.dateValue}>{new Date().toLocaleDateString('pt-BR')}</Text>
            </Text>
          </View>
        </View>

        {/* Dashboard */}
        <View style={styles.dashboard}>
          <View style={styles.dashCard}>
            <Text style={styles.dashLabel}>Total Carregado</Text>
            <Text style={styles.dashValue}>{currency(stats.totalLoadedValue)}</Text>
            <View style={[styles.dashBar, { backgroundColor: '#3b82f6' }]} />
          </View>

          <View style={styles.dashCard}>
            <Text style={[styles.dashLabel, { color: '#059669' }]}>Total Liquidado</Text>
            <Text style={[styles.dashValue, { color: '#047857' }]}>{currency(stats.totalPaid)}</Text>
            <View style={[styles.dashBar, { backgroundColor: '#10b981' }]} />
          </View>

          <View style={styles.dashCard}>
            <Text style={[styles.dashLabel, { color: '#d97706' }]}>Retenções/Taxas</Text>
            <Text style={[styles.dashValue, { color: '#b45309' }]}>{currency(stats.totalDebited)}</Text>
            <View style={[styles.dashBar, { backgroundColor: '#f59e0b' }]} />
          </View>

          <View style={[
            styles.balanceCard,
            {
              backgroundColor: stats.balance <= 0.05 ? '#059669' : '#dc2626',
              borderColor: stats.balance <= 0.05 ? '#047857' : '#b91c1c',
            }
          ]}>
            <Text style={styles.balanceLabel}>Saldo Remanescente</Text>
            <Text style={styles.balanceValue}>{currency(stats.balance)}</Text>
            <Text style={styles.balanceStatus}>
              {stats.balance <= 0.05 ? 'Contrato Quitado' : 'Valor a Liquidar'}
            </Text>
          </View>
        </View>

        {/* Informações do Produtor */}
        {isProducerVariant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DADOS DO PRODUTOR</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Nome</Text>
                <Text style={styles.infoValue}>{order.partnerName || '-'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Data</Text>
                <Text style={styles.infoValue}>{dateStr(order.date)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>{order.status || '-'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Carregamentos */}
        {stats.activeLoadings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CARREGAMENTOS ({stats.activeLoadings.length})</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellBold, { width: '10%' }]}>Nº</Text>
                <Text style={[styles.tableCellBold, { width: '15%' }]}>Data</Text>
                <Text style={[styles.tableCellBold, { width: '15%', textAlign: 'right' }]}>Peso (kg)</Text>
                <Text style={[styles.tableCellBold, { width: '15%', textAlign: 'right' }]}>Sacos</Text>
                <Text style={[styles.tableCellBold, { width: '20%', textAlign: 'right' }]}>Preço/Saco</Text>
                <Text style={[styles.tableCellBold, { width: '25%', textAlign: 'right' }]}>Valor Total</Text>
              </View>
              {stats.activeLoadings.map((loading, idx) => (
                <View key={loading.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{idx + 1}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{dateStr(loading.date)}</Text>
                  <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>{num(loading.weightKg)}</Text>
                  <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>{num(loading.weightSc)}</Text>
                  <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>{currency(loading.purchasePricePerSc)}</Text>
                  <Text style={[styles.tableCellBold, { width: '25%', textAlign: 'right' }]}>{currency(loading.totalPurchaseValue)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total de Peso:</Text>
                <Text style={styles.summaryValue}>{num(stats.totalWeightKg)} kg ({num(stats.totalWeightSc)} sacos)</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Preço Médio por Saco:</Text>
                <Text style={styles.summaryValue}>{currency(stats.avgPricePerSc)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Valor Total Carregado:</Text>
                <Text style={[styles.summaryValue, { fontSize: 10, color: '#0f172a' }]}>{currency(stats.totalLoadedValue)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Pagamentos */}
        {stats.payments.length > 0 && isProducerVariant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAGAMENTOS E ADIANTAMENTOS</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellBold, { width: '15%' }]}>Data</Text>
                <Text style={[styles.tableCellBold, { width: '40%' }]}>Descrição</Text>
                <Text style={[styles.tableCellBold, { width: '25%', textAlign: 'right' }]}>Valor</Text>
                <Text style={[styles.tableCellBold, { width: '20%', textAlign: 'right' }]}>Desconto</Text>
              </View>
              {stats.payments.map((pmt) => (
                <View key={pmt.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{dateStr(pmt.date)}</Text>
                  <Text style={[styles.tableCell, { width: '40%' }]}>{pmt.notes || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '25%', textAlign: 'right' }]}>{currency(pmt.value)}</Text>
                  <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>{currency(pmt.discountValue || 0)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Despesas Debitadas */}
        {stats.debitedExpenses.length > 0 && isProducerVariant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DESPESAS DEBITADAS DO PRODUTOR</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellBold, { width: '15%' }]}>Data</Text>
                <Text style={[styles.tableCellBold, { width: '60%' }]}>Descrição</Text>
                <Text style={[styles.tableCellBold, { width: '25%', textAlign: 'right' }]}>Valor</Text>
              </View>
              {stats.debitedExpenses.map((exp) => (
                <View key={exp.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{dateStr(exp.date)}</Text>
                  <Text style={[styles.tableCell, { width: '60%' }]}>{exp.notes || '-'}</Text>
                  <Text style={[styles.tableCell, { width: '25%', textAlign: 'right' }]}>{currency(exp.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Sistema: <Text style={styles.footerBold}>{company.nomeFantasia}</Text>
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} fixed />
        </View>
      </Page>
    </Document>
  );
};

export default PdfDocument;
