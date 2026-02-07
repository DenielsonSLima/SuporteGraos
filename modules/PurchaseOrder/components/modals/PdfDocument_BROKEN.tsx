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
  // PAGE SETUP
  page: {
    padding: 24,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },

  // HEADER CONTAINER
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
  },

  headerLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    alignItems: 'flex-start',
  },

  logoBox: {
    width: 60,
    height: 60,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: 50,
    height: 50,
  },

  companyBlock: {
    flex: 1,
    gap: 3,
  },

  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },

  companyRazaoSocial: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },

  companyDetails: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    marginTop: 4,
  },

  headerRight: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-end',
    gap: 6,
  },

  extractLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  orderTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#ffffff',
    textTransform: 'uppercase',
  },

  orderNumber: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#10b981',
    marginTop: 4,
  },

  emissionDate: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#cbd5e1',
    textTransform: 'uppercase',
  },

  // KPI DASHBOARD
  kpiContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 10,
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
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 4,
  },

  kpiBar: {
    height: 2,
    width: 30,
    borderRadius: 1,
  },

  kpiCardBalance: {
    flex: 1,
    padding: 12,
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
    marginBottom: 4,
  },

  kpiBalanceValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },

  kpiBalanceStatus: {
    fontSize: 6,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#ffffff',
    opacity: 0.7,
    textTransform: 'uppercase',
    marginTop: 3,
  },

  // INFO SECTIONS
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },

  infoColumn: {
    flex: 1,
    gap: 3,
  },

  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    paddingBottom: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  sectionTitleWithIcon: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  infoItem: {
    marginBottom: 6,
  },

  infoItemLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  infoItemValue: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },

  infoSubValue: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },

  // TABLE STYLES
  tableTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  tableTitleLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
  },

  tableTotalLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  table: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  tableHeaderCell: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    textAlign: 'left',
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  tableRowEven: {
    backgroundColor: '#f8fafc',
  },

  tableRowOdd: {
    backgroundColor: '#ffffff',
  },

  tableRowTotal: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    fontFamily: 'Helvetica-Bold',
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

  // FINANCE SECTION
  financialSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },

  financialColumn: {
    flex: 1,
  },

  financialTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    paddingBottom: 4,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  financialEmpty: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  // SIGNATURES
  signaturesContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#1e293b',
  },

  signaturesRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 16,
  },

  signatureBox: {
    flex: 1,
    alignItems: 'center',
  },

  signatureLine: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    marginBottom: 4,
    width: '100%',
  },

  signatureLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },

  signatureDetail: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
    fontStyle: 'italic',
  },

  // FOOTER
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 12,
  },

  footerLeft: {
    flexDirection: 'row',
    gap: 6,
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
  try {
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

  // --- CÁLCULOS CONSOLIDADOS ---
  const stats = useMemo(() => {
    try {
      const validLoadings = Array.isArray(loadings) ? loadings : [];
      const activeLoadings = validLoadings.filter(l => l?.status !== 'canceled');
      
      const totalWeightKg = activeLoadings.reduce((acc, l) => acc + (Number(l?.weightKg) || 0), 0);
      const totalWeightSc = activeLoadings.reduce((acc, l) => acc + (Number(l?.weightSc) || 0), 0);
      const totalLoadedValue = activeLoadings.reduce((acc, l) => acc + (Number(l?.totalPurchaseValue) || 0), 0);
      
      const avgPricePerSc = totalWeightSc > 0 ? totalLoadedValue / totalWeightSc : 0;

      const transactionList = Array.isArray(order?.transactions) ? order.transactions : [];
      const payments = transactionList.filter(t => t?.type === 'payment' || t?.type === 'advance');
      const expenses = transactionList.filter(t => t?.type === 'expense');
      const debitedExpenses = expenses.filter(t => t?.deductFromPartner);

      const totalPaid = payments.reduce((acc, t) => acc + (Number(t?.value) || 0) + (Number(t?.discountValue) || 0), 0);
      const totalDebited = debitedExpenses.reduce((acc, t) => acc + (Number(t?.value) || 0), 0);
      
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
    } catch (err) {
      console.error('Stats calculation error:', err);
      return {
        totalWeightKg: 0,
        totalWeightSc: 0,
        totalLoadedValue: 0,
        avgPricePerSc: 0,
        payments: [],
        debitedExpenses: [],
        totalPaid: 0,
        totalDebited: 0,
        balance: 0,
        activeLoadings: []
      };
    }
  }, [order, loadings]);

  // Apenas renderizar variante producer
  if (variant !== 'producer') {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Modo não disponível para esta visualização</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* WATERMARK */}
        {watermark.imageUrl && (
          <View style={{ position: 'absolute', top: 200, left: 200, opacity: 0.02 }}>
            <Image src={watermark.imageUrl} style={{ width: 250, height: 250 }} />
          </View>
        )}

        {/* HEADER SECTION */}
        <View style={styles.headerContainer}>
          {/* LEFT SIDE */}
          <View style={styles.headerLeft}>
            {/* Logo Box */}
            <View style={styles.logoBox}>
              {company.logoUrl && (
                <Image src={company.logoUrl} style={styles.logo} />
              )}
            </View>

            {/* Company Info */}
            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>{company.nomeFantasia}</Text>
              <Text style={styles.companyRazaoSocial}>{company.razaoSocial}</Text>
              <View>
                <Text style={styles.companyDetails}>CNPJ: {formatDoc(company.cnpj)}</Text>
              </View>
              <View style={{ marginTop: 2 }}>
                <Text style={styles.companyDetails}>{company.cidade}/{company.uf}</Text>
              </View>
            </View>
          </View>

          {/* RIGHT SIDE - ORDER IDENTIFICATION BOX */}
          <View style={styles.headerRight}>
            <Text style={styles.extractLabel}>Extrato Consolidado</Text>
            <Text style={styles.orderTitle}>Ordem de Compra</Text>
            <Text style={styles.orderNumber}>#{order.number}</Text>
            <Text style={styles.emissionDate}>Emissão: {new Date().toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        {/* KPI DASHBOARD */}
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
        <View style={styles.infoRow}>
          {/* PRODUTOR */}
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>Identificação do Produtor</Text>
            <View style={styles.infoItem}>
              <Text style={styles.infoItemLabel}>Razão Social / Nome</Text>
              <Text style={styles.infoSubValue}>{order.partnerName || '-'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoItemLabel}>Documento</Text>
                <Text style={styles.infoItemValue}>{formatDoc(order.partnerDocument || '')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoItemLabel}>Cidade / UF</Text>
                <Text style={styles.infoItemValue}>{order.partnerCity || '-'} / {order.partnerState || '-'}</Text>
              </View>
            </View>
          </View>

          {/* NEGOCIAÇÃO */}
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>Detalhes da Negociação</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoItemLabel}>Safra Vinculada</Text>
                <Text style={styles.infoSubValue}>{order.harvest || '-'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoItemLabel}>Consultor Responsável</Text>
                <Text style={styles.infoItemValue}>{order.consultantName || '-'}</Text>
              </View>
            </View>
            <View>
              <Text style={styles.infoItemLabel}>Produto Contratado</Text>
              <Text style={styles.infoSubValue}>{order.items?.[0]?.productName || '-'}</Text>
              <Text style={[styles.infoItemValue, { marginTop: 2 }]}>
                Média: {currency(stats.avgPricePerSc)} /SC
              </Text>
            </View>
          </View>
        </View>

        {/* TABELA DE CARREGAMENTOS */}
        {stats.activeLoadings.length > 0 && (
          <View>
            <View style={styles.tableTitle}>
              <Text style={styles.tableTitleLabel}>Histórico Analítico de Carregamentos</Text>
              <Text style={styles.tableTotalLabel}>
                Total Volume: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{num(stats.totalWeightSc, 2)} SC</Text>
              </Text>
            </View>

            <View style={styles.table}>
              {/* TABLE HEADER */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Data Carga</Text>
                <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Logística / Transporte</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Peso Bruto (KG)</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Volume (SC)</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Preço Unit.</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Total Bruto</Text>
              </View>

              {/* TABLE ROWS */}
              {stats.activeLoadings.map((loading, idx) => (
                <View key={loading.id} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{dateStr(loading.date)}</Text>
                  
                  {/* Carrier + Driver */}
                  <View style={{ width: '30%' }}>
                    <Text style={[styles.tableCell, { marginBottom: 2 }]}>{loading.carrierName || 'SUPORTE TRANSLOG'}</Text>
                    <Text style={[styles.tableCell, { fontSize: 7, color: '#94a3b8' }]}>
                      {loading.driverName || '-'}
                    </Text>
                  </View>

                  <Text style={[styles.tableCellBold, { width: '15%', textAlign: 'right' }]}>{num(loading.weightKg, 0)}</Text>
                  <Text style={[styles.tableCellBold, { width: '15%', textAlign: 'right', color: '#3b82f6' }]}>{num(loading.weightSc, 2)}</Text>
                  <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>{currency(loading.purchasePricePerSc)}</Text>
                  <Text style={[styles.tableCellBold, { width: '15%', textAlign: 'right' }]}>{currency(loading.totalPurchaseValue)}</Text>
                </View>
              ))}

              {/* TOTAL ROW */}
              <View style={[styles.tableRow, styles.tableRowTotal]}>
                <Text style={[styles.tableCellBold, { width: '40%' }]}>Totais Consolidados:</Text>
                <Text style={[styles.tableCellBold, { width: '15%', textAlign: 'right' }]}>{num(stats.totalWeightKg, 0)} KG</Text>
                <Text style={[styles.tableCellBold, { width: '15%', textAlign: 'right', color: '#3b82f6' }]}>{num(stats.totalWeightSc, 2)} SC</Text>
                <Text style={[styles.tableCellBold, { width: '15%' }]}></Text>
                <Text style={[styles.tableCellBold, { width: '15%', textAlign: 'right' }]}>{currency(stats.totalLoadedValue)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* FINANCIAL SECTION */}
        <View style={styles.financialSection}>
          {/* LIQUIDAÇÕES */}
          <View style={styles.financialColumn}>
            <Text style={styles.financialTitle}>Liquidações Realizadas</Text>
            {stats.payments.length === 0 ? (
              <Text style={styles.financialEmpty}>Sem registros de pagamento.</Text>
            ) : (
              stats.payments.map((p, i) => (
                <View key={i} style={{ marginBottom: 4 }}>
                  <Text style={styles.tableCell}>{dateStr(p.date)} - {currency(p.value + (p.discountValue || 0))}</Text>
                  <Text style={[styles.tableCell, { fontSize: 7, color: '#94a3b8' }]}>{p.notes || '-'}</Text>
                </View>
              ))
            )}
          </View>

          {/* RETENÇÕES */}
          <View style={styles.financialColumn}>
            <Text style={styles.financialTitle}>Retenções e Despesas Extras</Text>
            {stats.debitedExpenses.length === 0 ? (
              <Text style={styles.financialEmpty}>Nenhuma retenção aplicada.</Text>
            ) : (
              stats.debitedExpenses.map((e, i) => (
                <View key={i} style={{ marginBottom: 4 }}>
                  <Text style={styles.tableCell}>{dateStr(e.date)} - {currency(e.value)}</Text>
                  <Text style={[styles.tableCell, { fontSize: 7, color: '#94a3b8' }]}>{e.notes || 'Taxa Diversa'}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* SIGNATURES */}
        <View style={styles.signaturesContainer}>
          <View style={styles.signaturesRow}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>{company.razaoSocial || company.nomeFantasia}</Text>
              <Text style={styles.signatureDetail}>Emitente / Comprador</Text>
            </View>

            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>{order.partnerName || 'PRODUTOR'}</Text>
              <Text style={styles.signatureDetail}>Favorecido / Produtor</Text>
            </View>
          </View>

          {/* FOOTER BAR */}
          <View style={[styles.footer, { backgroundColor: '#1e293b', padding: 8, borderRadius: 8, borderTopWidth: 0 }]}>
            <View style={styles.footerLeft}>
              <Text style={[styles.footerText, { color: '#10b981' }]}>📊 ERP Suporte Grãos v1.8</Text>
              <Text style={[styles.footerText, { color: '#475569' }]}>•</Text>
              <Text style={[styles.footerText, { color: '#cbd5e1' }]}>Documento Auditado Eletronicamente</Text>
            </View>
            <Text style={[styles.footerText, { color: '#cbd5e1' }]} render={({ pageNumber, totalPages }) => (
              `Página ${pageNumber} de ${totalPages} • ${new Date().toLocaleTimeString('pt-BR')}`
            )} fixed />
          </View>
        </View>
      </Page>
    </Document>
  );
  } catch (err) {
    console.error('PDF render error:', err);
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Erro ao gerar PDF. Tente novamente.</Text>
        </Page>
      </Document>
    );
  }
};

export default PdfDocument;
