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

const styles = StyleSheet.create({
  // PAGE
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },

  // HEADER SECTION
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 3,
    borderBottomColor: '#1e293b',
  },
  
  headerLeft: {
    flexDirection: 'row',
    gap: 15,
    flex: 1,
    alignItems: 'flex-start',
  },

  logo: {
    width: 60,
    height: 60,
    marginTop: 0,
  },

  companyInfo: {
    gap: 3,
    justifyContent: 'flex-start',
    paddingTop: 0,
  },

  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },

  companyDetail: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#64748b',
  },

  headerRight: {
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 180,
  },

  headerRightLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  headerRightTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#ffffff',
    marginTop: 4,
    textTransform: 'uppercase',
  },

  orderNumber: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#10b981',
    marginTop: 6,
  },

  emissionDate: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#cbd5e1',
    marginTop: 6,
    textTransform: 'uppercase',
  },

  // KPI CARDS
  kpiContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
  },

  kpiLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  kpiValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 6,
  },

  kpiBar: {
    height: 3,
    width: 40,
    borderRadius: 2,
  },

  kpiCardBalance: {
    flex: 1,
    padding: 14,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  kpiBalanceLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    opacity: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  kpiBalanceValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },

  kpiBalanceStatus: {
    fontSize: 6,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#ffffff',
    opacity: 0.7,
    textTransform: 'uppercase',
  },

  // INFO SECTIONS
  infoSection: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    paddingBottom: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  infoRow: {
    flexDirection: 'row',
    gap: 20,
  },

  infoColumn: {
    flex: 1,
  },

  infoItem: {
    marginBottom: 8,
  },

  infoLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },

  // TABLE STYLES
  table: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  tableHeaderCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  tableRowEven: {
    backgroundColor: '#f8fafc',
  },

  tableCell: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },

  tableCellBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },

  // SUMMARY
  summaryBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
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

  // SIGNATURES
  signatureContainer: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 30,
  },

  signatureBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
    alignItems: 'center',
    minHeight: 50,
  },

  signatureLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    marginTop: 8,
  },

  signatureDetail: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    color: '#64748b',
    marginTop: 2,
  },

  // FOOTER
  footerContainer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },

  footerLeft: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  footerText: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    color: '#94a3b8',
  },

  footerBold: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
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

  // Cálculos
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

  // Apenas renderizar variante producer
  if (variant !== 'producer') {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Modo Gerencial não implementado para este módulo</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        {watermark.imageUrl && (
          <View style={{ position: 'absolute', top: 150, left: 150, width: 300, height: 300, opacity: 0.03 }}>
            <Image src={watermark.imageUrl} style={{ width: 300, height: 300 }} />
          </View>
        )}

        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.nomeFantasia}</Text>
              <Text style={styles.companyDetail}>CNPJ: {formatDoc(company.cnpj)} | {company.telefone}</Text>
              <Text style={styles.companyDetail}>{company.endereco}, {company.numero} - {company.bairro}</Text>
              <Text style={styles.companyDetail}>{company.cidade}/{company.uf} - CEP: {company.cep}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.headerRightLabel}>Extrato Consolidado</Text>
            <Text style={styles.headerRightTitle}>Ordem de Compra</Text>
            <Text style={styles.orderNumber}>#{order.number}</Text>
            <Text style={styles.emissionDate}>Emissão: {new Date().toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        {/* KPI CARDS */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: '#3b82f6' }]}>Total Carregado</Text>
            <Text style={styles.kpiValue}>{currency(stats.totalLoadedValue)}</Text>
            <View style={[styles.kpiBar, { backgroundColor: '#3b82f6' }]} />
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: '#10b981' }]}>Total Liquidado</Text>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>{currency(stats.totalPaid)}</Text>
            <View style={[styles.kpiBar, { backgroundColor: '#10b981' }]} />
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: '#f59e0b' }]}>Retenções/Taxas</Text>
            <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{currency(stats.totalDebited)}</Text>
            <View style={[styles.kpiBar, { backgroundColor: '#f59e0b' }]} />
          </View>

          <View style={[
            styles.kpiCardBalance,
            {
              backgroundColor: stats.balance <= 0.05 ? '#059669' : '#dc2626',
              borderColor: stats.balance <= 0.05 ? '#047857' : '#b91c1c',
            }
          ]}>
            <Text style={styles.kpiBalanceLabel}>Saldo Remanescente</Text>
            <Text style={styles.kpiBalanceValue}>{currency(stats.balance)}</Text>
            <Text style={styles.kpiBalanceStatus}>
              {stats.balance <= 0.05 ? 'Contrato Quitado' : 'Valor a Liquidar'}
            </Text>
          </View>
        </View>

        {/* INFO SECTIONS */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.sectionTitle}>Identificação do Produtor</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Razão Social / Nome:</Text>
                <Text style={styles.infoValue}>{order.partnerName || '-'}</Text>
              </View>
            </View>

            <View style={styles.infoColumn}>
              <Text style={styles.sectionTitle}>Detalhes da Negociação</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Safra Vinculada:</Text>
                <Text style={styles.infoValue}>{order.date || '-'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* CARREGAMENTOS TABLE */}
        {stats.activeLoadings.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Histórico Analítico de Carregamentos</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '8%' }]}>Data Carga</Text>
                <Text style={[styles.tableHeaderCell, { width: '24%' }]}>Logística / Transporte</Text>
                <Text style={[styles.tableHeaderCell, { width: '16%', textAlign: 'right' }]}>Peso Bruto (Kg)</Text>
                <Text style={[styles.tableHeaderCell, { width: '16%', textAlign: 'right' }]}>Volume (Sc)</Text>
                <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'right' }]}>Preço Unit.</Text>
                <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'right' }]}>Total Bruto</Text>
              </View>

              {stats.activeLoadings.map((loading, idx) => (
                <View key={loading.id}>
                  <View style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : {}]}>
                    <Text style={[styles.tableCell, { width: '8%' }]}>{dateStr(loading.date)}</Text>
                    <View style={{ width: '24%' }}>
                      <Text style={[styles.tableCell, { marginBottom: 2 }]}>{loading.carrierName || 'SUPORTE TRANSLOG'}</Text>
                      <Text style={[styles.tableCell, { fontSize: 7, color: '#94a3b8', fontStyle: 'italic' }]}>{loading.driverName || '-'}</Text>
                    </View>
                    <Text style={[styles.tableCellBold, { width: '16%', textAlign: 'right' }]}>{num(loading.weightKg)}</Text>
                    <Text style={[styles.tableCellBold, { width: '16%', textAlign: 'right' }]}>{num(loading.weightSc)}</Text>
                    <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>{currency(loading.purchasePricePerSc)}</Text>
                    <Text style={[styles.tableCellBold, { width: '18%', textAlign: 'right' }]}>{currency(loading.totalPurchaseValue)}</Text>
                  </View>
                </View>
              ))}

              <View style={[styles.tableRow, { backgroundColor: '#f1f5f9', fontWeight: 'bold' }]}>
                <Text style={[styles.tableCellBold, { width: '48%' }]}>Totais Consolidados:</Text>
                <Text style={[styles.tableCellBold, { width: '16%', textAlign: 'right' }]}>{num(stats.totalWeightKg)}</Text>
                <Text style={[styles.tableCellBold, { width: '16%', textAlign: 'right' }]}>{num(stats.totalWeightSc)}</Text>
                <Text style={[styles.tableCellBold, { width: '18%' }]}></Text>
                <Text style={[styles.tableCellBold, { width: '18%', textAlign: 'right' }]}>{currency(stats.totalLoadedValue)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* LIQUIDAÇÕES E RETENÇÕES */}
        <View style={[styles.infoSection, { marginBottom: 30 }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoColumn}>
              <Text style={styles.sectionTitle}>Liquidações Realizadas</Text>
              {stats.payments.length === 0 ? (
                <Text style={styles.infoValue}>Sem registros de pagamento</Text>
              ) : (
                stats.payments.map(pmt => (
                  <View key={pmt.id} style={styles.infoItem}>
                    <Text style={styles.infoValue}>{dateStr(pmt.date)} - {currency(pmt.value)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.infoColumn}>
              <Text style={styles.sectionTitle}>Retenções e Despesas Extras</Text>
              {stats.debitedExpenses.length === 0 ? (
                <Text style={styles.infoValue}>Nenhuma retenção aplicável</Text>
              ) : (
                stats.debitedExpenses.map(exp => (
                  <View key={exp.id} style={styles.infoItem}>
                    <Text style={styles.infoValue}>{exp.notes} - {currency(exp.value)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>

        {/* SIGNATURES */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>{company.nomeFantasia}</Text>
            <Text style={styles.signatureDetail}>Empresa / Compradora</Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>{order.partnerName || 'PRODUTOR'}</Text>
            <Text style={styles.signatureDetail}>Produtor / Favorecido</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footerContainer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerText}>📊 ERP SUPORTE GRAOS v1.4</Text>
            <Text style={styles.footerText}>•</Text>
            <Text style={styles.footerText}>Documento Auditado Eletronicamente</Text>
          </View>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages} • ${new Date().toLocaleTimeString('pt-BR')}`
          )} fixed />
        </View>
      </Page>
    </Document>
  );
};

export default PdfDocument;
