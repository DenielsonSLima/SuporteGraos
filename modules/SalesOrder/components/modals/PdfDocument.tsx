import React, { useMemo } from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { SalesOrder } from '../../types';
import { Loading } from '../../../Loadings/types';
import { settingsService } from '../../../../services/settingsService';

type PdfVariant = 'producer' | 'internal';

interface Props {
  order: SalesOrder;
  loadings: Loading[];
  variant: PdfVariant;
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    top: 120,
    left: 150,
    width: 280,
    height: 280,
    opacity: 0.03,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: '#ecfdf3',
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    width: 48,
    height: 48,
  },
  companyBlock: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  companyRazao: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  companyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  companyMetaText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginRight: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerRightBox: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'flex-end',
    borderBottomWidth: 3,
    borderBottomColor: '#10b981',
  },
  headerRightLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#34d399',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerRightTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#ffffff',
  },
  headerRightNumber: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginTop: 3,
  },
  headerRightDate: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'right',
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    marginRight: 8,
  },
  kpiCardLast: {
    marginRight: 0,
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
    color: '#0f172a',
  },
  kpiSub: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 4,
  },
  balanceCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
  },
  balanceLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginTop: 4,
  },
  balanceStatus: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    opacity: 0.7,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoColumn: {
    flex: 1,
    marginRight: 12,
  },
  infoColumnLast: {
    marginRight: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  infoLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  infoValueStrong: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  infoValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginTop: 2,
  },
  infoRowGrid: {
    flexDirection: 'row',
    marginTop: 6,
  },
  infoCell: {
    flex: 1,
    marginRight: 8,
  },
  infoCellLast: {
    marginRight: 0,
  },
  tableTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tableTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowOdd: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  tableCellMuted: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    color: '#94a3b8',
    marginTop: 2,
  },
  tableTotalRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: '#f1f5f9',
  },
  receiptsSection: {
    marginTop: 6,
    marginBottom: 12,
  },
  receiptsTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
    paddingBottom: 4,
    marginBottom: 6,
    color: '#047857',
  },
  receiptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  receiptCard: {
    width: '32%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#ffffff',
  },
  receiptCardLast: {
    marginRight: 0,
  },
  receiptLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  receiptNote: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  receiptValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#047857',
    marginTop: 4,
  },
  receiptEmpty: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  signatures: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
  },
  signaturesRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  signatureBox: {
    flex: 1,
    alignItems: 'center',
    marginRight: 12,
  },
  signatureBoxLast: {
    marginRight: 0,
  },
  signatureLine: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    width: '100%',
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  signatureRole: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  footer: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  footerAccent: {
    color: '#34d399',
  },
});

const stylesInternal = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    top: 80,
    left: 240,
    width: 420,
    height: 420,
    opacity: 0.03,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerLogoImg: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  headerMetaRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  headerMetaText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginRight: 10,
  },
  headerBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderBottomWidth: 3,
    borderBottomColor: '#3b82f6',
  },
  headerBadgeLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerBadgeTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#ffffff',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  headerBadgeNote: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  kpiItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 8,
    marginRight: 6,
    backgroundColor: '#ffffff',
  },
  kpiItemLast: {
    marginRight: 0,
  },
  kpiItemDark: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  kpiLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 4,
  },
  kpiValueLight: {
    color: '#ffffff',
  },
  kpiHint: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  tableHeaderCell: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowOdd: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  tableCellSmall: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    color: '#94a3b8',
    marginTop: 2,
  },
  tableTotalRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 6,
    backgroundColor: '#f1f5f9',
  },
  panelRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  panel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 8,
    marginRight: 8,
    backgroundColor: '#ffffff',
  },
  panelLast: {
    marginRight: 0,
  },
  panelTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1e293b',
    marginBottom: 6,
  },
  panelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  panelCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 6,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#ffffff',
  },
  panelLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  panelValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 4,
  },
  panelValueWarn: {
    color: '#e11d48',
  },
  panelListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#64748b',
    lineHeight: 1.3,
  },
  approvalBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  approvalLine: {
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    width: '100%',
    marginBottom: 6,
  },
  approvalName: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  approvalRole: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  footer: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  footerAccent: {
    color: '#34d399',
  },
});

const PdfDocument: React.FC<Props> = ({ order, loadings, variant }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

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

  const cleanNotes = (val?: string) => (val ? val.replace(/\s*\[ORIGIN:[^\]]+\]\s*/g, ' ').trim() : '');
  const receiptAccountLabel = (accountName?: string, notes?: string) => {
    if (accountName) return accountName;
    const cleaned = cleanNotes(notes);
    return cleaned || 'Conta nao informada';
  };

  const stats = useMemo(() => {
    const safeLoadings = Array.isArray(loadings) ? loadings : [];
    const activeLoadings = safeLoadings.filter((l) => l?.status !== 'canceled');

    const contractQtySc = Number(order?.quantity) || 0;

    const totalDeliveredKg = activeLoadings.reduce(
      (acc, l) => acc + (Number(l?.unloadWeightKg) || 0),
      0
    );
    const totalDeliveredSc = totalDeliveredKg / 60;

    const totalBreakageKg = activeLoadings.reduce((acc, l) => {
      if (Number(l?.unloadWeightKg) > 0) {
        return acc + Math.max(0, (Number(l?.weightKg) || 0) - (Number(l?.unloadWeightKg) || 0));
      }
      return acc;
    }, 0);

    const inTransitLoadings = activeLoadings.filter(
      (l) => !Number(l?.unloadWeightKg) || Number(l?.unloadWeightKg) <= 0
    );
    const inTransitQtySc = inTransitLoadings.reduce((acc, l) => acc + (Number(l?.weightSc) || 0), 0);

    const totalInvoiced = activeLoadings
      .filter((l) => Number(l?.unloadWeightKg) > 0)
      .reduce((acc, l) => {
        const price = Number(l?.salesPrice) || Number(order?.unitPrice) || 0;
        return acc + ((Number(l?.unloadWeightKg) || 0) / 60) * price;
      }, 0);

    const receipts = Array.isArray(order?.transactions)
      ? order.transactions.filter((t) => t?.type === 'receipt')
      : [];
    const totalPaidByCustomer = receipts.reduce(
      (acc, t) => acc + (Number(t?.value) || 0) + (Number(t?.discountValue) || 0),
      0
    );

    const financialBalance = totalInvoiced - totalPaidByCustomer;

    const executionPercent = contractQtySc > 0 ? (totalDeliveredSc / contractQtySc) * 100 : 0;

    return {
      contractQtySc,
      totalDeliveredSc,
      totalBreakageKg,
      inTransitQtySc,
      totalInvoiced,
      totalPaidByCustomer,
      financialBalance,
      receipts,
      activeLoadings,
      executionPercent,
    };
  }, [order, loadings]);

  const statsInternal = useMemo(() => {
    const safeLoadings = Array.isArray(loadings) ? loadings : [];
    const activeLoadings = safeLoadings.filter((l) => l?.status !== 'canceled');

    const totalWeightKgOrig = activeLoadings.reduce((acc, l) => acc + (Number(l?.weightKg) || 0), 0);
    const totalWeightKgDest = activeLoadings.reduce((acc, l) => acc + (Number(l?.unloadWeightKg) || 0), 0);
    const totalWeightScOrig = totalWeightKgOrig / 60;

    const totalGrainCost = activeLoadings.reduce((acc, l) => acc + (Number(l?.totalPurchaseValue) || 0), 0);
    const totalFreightCost = activeLoadings.reduce((acc, l) => acc + (Number(l?.totalFreightValue) || 0), 0);
    const totalRevenue = activeLoadings.reduce((acc, l) => acc + (Number(l?.totalSalesValue) || 0), 0);

    const transactions = Array.isArray(order?.transactions) ? order.transactions : [];
    const orderExpenses = transactions
      .filter((t) => t?.type === 'expense')
      .reduce((acc, t) => acc + (Number(t?.value) || 0), 0);
    const brokerCommission = transactions
      .filter((t) => t?.type === 'commission' && !t?.deductFromPartner)
      .reduce((acc, t) => acc + (Number(t?.value) || 0), 0);

    const totalInvestment = totalGrainCost + totalFreightCost + orderExpenses + brokerCommission;
    const netProfit = totalRevenue - totalInvestment;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const profitPerSc = totalWeightScOrig > 0 ? netProfit / totalWeightScOrig : 0;

    const totalBreakageKg = Math.max(0, totalWeightKgOrig - totalWeightKgDest);
    const breakagePercent = totalWeightKgOrig > 0 ? (totalBreakageKg / totalWeightKgOrig) * 100 : 0;

    return {
      activeLoadings,
      totalWeightKgOrig,
      totalWeightKgDest,
      totalWeightScOrig,
      totalGrainCost,
      totalFreightCost,
      totalRevenue,
      orderExpenses,
      brokerCommission,
      totalInvestment,
      netProfit,
      marginPercent,
      profitPerSc,
      totalBreakageKg,
      breakagePercent,
    };
  }, [order, loadings]);

  if (variant === 'internal') {
    const marginPercentAbs = Math.min(Math.abs(statsInternal.marginPercent) * 4, 100);

    return (
      <Document>
        <Page size="A4" orientation="landscape" style={stylesInternal.page}>
          {watermark.imageUrl && <Image src={watermark.imageUrl} style={stylesInternal.watermark} />}

          <View style={stylesInternal.header}>
            <View style={stylesInternal.headerLeft}>
              <View style={stylesInternal.headerLogo}>
                {company.logoUrl && <Image src={company.logoUrl} style={stylesInternal.headerLogoImg} />}
              </View>
              <View>
                <Text style={stylesInternal.headerTitle}>{company.razaoSocial}</Text>
                <Text style={stylesInternal.headerSubtitle}>Inteligencia logistica e auditoria de performance</Text>
                <View style={stylesInternal.headerMetaRow}>
                  <Text style={stylesInternal.headerMetaText}>Contrato venda: #{order.number}</Text>
                  <Text style={stylesInternal.headerMetaText}>Cliente: {order.customerName || '-'}</Text>
                  <Text style={stylesInternal.headerMetaText}>Emissao: {new Date().toLocaleDateString('pt-BR')}</Text>
                </View>
              </View>
            </View>
            <View style={stylesInternal.headerBadge}>
              <Text style={stylesInternal.headerBadgeLabel}>Restrito: auditoria interna</Text>
              <Text style={stylesInternal.headerBadgeTitle}>Analise de spread real</Text>
              <Text style={stylesInternal.headerBadgeNote}>Demonstrativo de lucratividade por carga</Text>
            </View>
          </View>

          <View style={stylesInternal.kpiRow}>
            <View style={stylesInternal.kpiItem}>
              <Text style={stylesInternal.kpiLabel}>Investimento direto</Text>
              <Text style={stylesInternal.kpiValue}>{currency(statsInternal.totalInvestment)}</Text>
              <Text style={stylesInternal.kpiHint}>Grao + frete + taxas</Text>
            </View>
            <View style={stylesInternal.kpiItem}>
              <Text style={stylesInternal.kpiLabel}>Receita bruta (destino)</Text>
              <Text style={stylesInternal.kpiValue}>{currency(statsInternal.totalRevenue)}</Text>
              <Text style={stylesInternal.kpiHint}>Base: balanca do cliente</Text>
            </View>
            <View style={[stylesInternal.kpiItem, stylesInternal.kpiItemDark]}>
              <Text style={[stylesInternal.kpiLabel, { color: '#ffffff' }]}>Lucro liquido final</Text>
              <Text style={[stylesInternal.kpiValue, stylesInternal.kpiValueLight, { color: statsInternal.netProfit >= 0 ? '#34d399' : '#fb7185' }]}>
                {currency(statsInternal.netProfit)}
              </Text>
              <Text style={[stylesInternal.kpiHint, { color: '#94a3b8' }]}>Sobra real apos custos</Text>
            </View>
            <View style={stylesInternal.kpiItem}>
              <Text style={stylesInternal.kpiLabel}>Margem comercial</Text>
              <Text style={[stylesInternal.kpiValue, { color: statsInternal.marginPercent >= 10 ? '#16a34a' : '#1e293b' }]}>
                {num(statsInternal.marginPercent)}%
              </Text>
              <View style={stylesInternal.progressTrack}>
                <View
                  style={[
                    stylesInternal.progressFill,
                    { width: `${marginPercentAbs}%`, backgroundColor: statsInternal.marginPercent >= 0 ? '#22c55e' : '#f43f5e' },
                  ]}
                />
              </View>
            </View>
            <View style={[stylesInternal.kpiItem, stylesInternal.kpiItemLast, { backgroundColor: '#0f172a', borderColor: '#0f172a' }]}>
              <Text style={[stylesInternal.kpiLabel, { color: '#60a5fa' }]}>Lucro medio por saca</Text>
              <Text style={[stylesInternal.kpiValue, stylesInternal.kpiValueLight]}>{currency(statsInternal.profitPerSc)}</Text>
              <Text style={[stylesInternal.kpiHint, { color: '#60a5fa' }]}>Eficiencia operacional</Text>
            </View>
          </View>

          <View style={{ marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f172a', textTransform: 'uppercase' }}>
              Matriz analitica de spread e performance logistica
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <Text style={[stylesInternal.tableCell, { color: '#94a3b8', marginRight: 8 }]}
              >
                Custo medio compra: {currency(statsInternal.totalGrainCost / (statsInternal.totalWeightScOrig || 1))}
              </Text>
              <Text style={[stylesInternal.tableCell, { color: '#94a3b8' }]}
              >
                Frete medio (T): {currency(statsInternal.totalFreightCost / ((statsInternal.totalWeightKgOrig || 1) / 1000))}
              </Text>
            </View>
          </View>

          <View>
            <View style={stylesInternal.tableHeaderRow}>
              <Text style={[stylesInternal.tableHeaderCell, { width: '12%' }]}>Dta/Motorista</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '22%' }]}>Transportadora / Origem</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Peso Orig.</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Peso Dest.</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Quebra kg</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Custo SC</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Venda SC</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Frete Total</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Resultado</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '6%', textAlign: 'center' }]}>Status</Text>
            </View>

            {statsInternal.activeLoadings.map((l, idx) => {
              const rowCost = (Number(l?.totalPurchaseValue) || 0) + (Number(l?.totalFreightValue) || 0);
              const rowProfit = (Number(l?.totalSalesValue) || 0) - rowCost;
              const breakage = l?.unloadWeightKg ? Math.max(0, (Number(l?.weightKg) || 0) - (Number(l?.unloadWeightKg) || 0)) : 0;
              const breakagePerc = l?.unloadWeightKg ? (breakage / (Number(l?.weightKg) || 1)) * 100 : 0;

              return (
                <View key={l.id || idx} style={[stylesInternal.tableRow, idx % 2 === 0 ? undefined : stylesInternal.tableRowOdd]}>
                  <View style={{ width: '12%' }}>
                    <Text style={stylesInternal.tableCell}>{l.driverName || '-'}</Text>
                    <Text style={stylesInternal.tableCellSmall}>{dateStr(l.date)}</Text>
                  </View>
                  <View style={{ width: '22%' }}>
                    <Text style={stylesInternal.tableCell}>{l.carrierName || '-'}</Text>
                    <Text style={stylesInternal.tableCellSmall}>{l.supplierName || '-'}</Text>
                  </View>
                  <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right' }]}>{num(l.weightKg, 0)}</Text>
                  <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#1d4ed8' }]}>
                    {l.unloadWeightKg ? num(l.unloadWeightKg, 0) : 'Pendente'}
                  </Text>
                  <View style={{ width: '8%', alignItems: 'flex-end' }}>
                    {breakage > 0 ? (
                      <>
                        <Text style={[stylesInternal.tableCell, { color: breakagePerc > 0.5 ? '#e11d48' : '#94a3b8' }]}>
                          {num(breakage, 0)}
                        </Text>
                        <Text style={stylesInternal.tableCellSmall}>({num(breakagePerc, 2)}%)</Text>
                      </>
                    ) : (
                      <Text style={stylesInternal.tableCellSmall}>-</Text>
                    )}
                  </View>
                  <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#64748b' }]}> {currency(l.purchasePricePerSc)} </Text>
                  <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#16a34a' }]}> {currency(l.salesPrice)} </Text>
                  <View style={{ width: '10%', alignItems: 'flex-end' }}>
                    <Text style={[stylesInternal.tableCell, { color: '#475569' }]}>{currency(l.totalFreightValue)}</Text>
                    <Text style={stylesInternal.tableCellSmall}>T: {currency(l.freightPricePerTon)}</Text>
                  </View>
                  <Text style={[stylesInternal.tableCell, { width: '10%', textAlign: 'right', color: rowProfit >= 0 ? '#16a34a' : '#e11d48' }]}>
                    {currency(rowProfit)}
                  </Text>
                  <Text style={[stylesInternal.tableCell, { width: '6%', textAlign: 'center', color: l.status === 'completed' ? '#16a34a' : '#2563eb' }]}>
                    {l.status === 'completed' ? 'Finalizado' : 'Transito'}
                  </Text>
                </View>
              );
            })}

            <View style={stylesInternal.tableTotalRow}>
              <Text style={[stylesInternal.tableCell, { width: '34%', textAlign: 'right' }]}>Totais consolidados:</Text>
              <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right' }]}>{num(statsInternal.totalWeightKgOrig, 0)} KG</Text>
              <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#1d4ed8' }]}> {num(statsInternal.totalWeightKgDest, 0)} KG </Text>
              <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#e11d48' }]}> {num(statsInternal.totalBreakageKg, 0)} KG </Text>
              <Text style={[stylesInternal.tableCell, { width: '8%' }]}></Text>
              <Text style={[stylesInternal.tableCell, { width: '8%' }]}></Text>
              <Text style={[stylesInternal.tableCell, { width: '10%' }]}></Text>
              <Text style={[stylesInternal.tableCell, { width: '10%', textAlign: 'right', color: statsInternal.netProfit >= 0 ? '#16a34a' : '#e11d48' }]}> {currency(statsInternal.netProfit)} </Text>
              <Text style={[stylesInternal.tableCell, { width: '6%' }]}></Text>
            </View>
          </View>

          <View style={stylesInternal.panelRow}>
            <View style={stylesInternal.panel}>
              <Text style={stylesInternal.panelTitle}>Decomposicao de custos reais</Text>
              <View style={stylesInternal.panelGrid}>
                <View style={stylesInternal.panelCard}>
                  <Text style={stylesInternal.panelLabel}>Compra grao</Text>
                  <Text style={stylesInternal.panelValue}>{currency(statsInternal.totalGrainCost)}</Text>
                </View>
                <View style={stylesInternal.panelCard}>
                  <Text style={stylesInternal.panelLabel}>Custo logistico</Text>
                  <Text style={stylesInternal.panelValue}>{currency(statsInternal.totalFreightCost)}</Text>
                </View>
                <View style={stylesInternal.panelCard}>
                  <Text style={stylesInternal.panelLabel}>Taxas / impostos</Text>
                  <Text style={[stylesInternal.panelValue, stylesInternal.panelValueWarn]}>{currency(statsInternal.orderExpenses)}</Text>
                </View>
                <View style={stylesInternal.panelCard}>
                  <Text style={stylesInternal.panelLabel}>Comissoes</Text>
                  <Text style={[stylesInternal.panelValue, stylesInternal.panelValueWarn]}>{currency(statsInternal.brokerCommission)}</Text>
                </View>
              </View>
            </View>

            <View style={[stylesInternal.panel, stylesInternal.panelLast]}>
              <Text style={stylesInternal.panelTitle}>Fluxo de recebimentos</Text>
              {(order.transactions || [])
                .filter((t) => t?.type === 'receipt')
                .slice(0, 4)
                .map((t, i) => (
                  <View key={i} style={stylesInternal.panelListItem}>
                    <Text style={stylesInternal.tableCellSmall}>{dateStr(t.date)} - {receiptAccountLabel(t.accountName, t.notes)}</Text>
                    <Text style={stylesInternal.tableCell}>{currency(t.value)}</Text>
                  </View>
                ))}
              {(order.transactions || []).length === 0 && (
                <Text style={[stylesInternal.tableCellSmall, { textAlign: 'center', marginTop: 4 }]}>
                  Aguardando primeiro recebimento do cliente.
                </Text>
              )}
            </View>
          </View>

          <View style={stylesInternal.notesSection}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 2, marginRight: 12 }}>
                <Text style={stylesInternal.notesTitle}>Notas de auditoria executiva</Text>
                <Text style={stylesInternal.notesText}>
                  1. Este documento reflete a lucratividade real baseada no peso de descarga confirmado pelo cliente.{"\n"}
                  2. Cargas em transito utilizam o peso de origem como expectativa de receita.{"\n"}
                  3. Custos indiretos fixos da empresa nao estao rateados neste demonstrativo por pedido.
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={stylesInternal.approvalBox}>
                  <View style={stylesInternal.approvalLine} />
                  <Text style={stylesInternal.approvalName}>Diretoria / Controladoria</Text>
                  <Text style={stylesInternal.approvalRole}>Validacao de margem e resultado</Text>
                </View>
              </View>
            </View>

            <View style={stylesInternal.footer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[stylesInternal.footerText, stylesInternal.footerAccent]}>ERP Suporte Graos Intelligence v1.8</Text>
                <Text style={[stylesInternal.footerText, { marginLeft: 6 }]}>| Relatorio emitido por: {order.consultantName || '-'}</Text>
              </View>
              <Text style={stylesInternal.footerText}>
                Ref: Pedido {order.number} | Pagina 1 de 1 | {new Date().toLocaleTimeString('pt-BR')}
              </Text>
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  if (variant !== 'producer') {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Modo nao disponivel para esta visualizacao</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermark.imageUrl && <Image src={watermark.imageUrl} style={styles.watermark} />}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
            </View>
            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>{company.nomeFantasia}</Text>
              <Text style={styles.companyRazao}>{company.razaoSocial}</Text>
              <View style={styles.companyMetaRow}>
                <Text style={styles.companyMetaText}>CNPJ: {company.cnpj}</Text>
                <Text style={styles.companyMetaText}>{company.cidade}/{company.uf}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerRightBox}>
              <Text style={styles.headerRightLabel}>Extrato de Comercializacao</Text>
              <Text style={styles.headerRightTitle}>Confirmacao de Venda</Text>
              <Text style={styles.headerRightNumber}>PV #{order.number}</Text>
            </View>
            <Text style={styles.headerRightDate}>
              Data do relatorio: {new Date().toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total contratado</Text>
            <Text style={styles.kpiValue}>{num(stats.contractQtySc, 0)} SC</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(stats.executionPercent, 100)}%`, backgroundColor: '#3b82f6' },
                ]}
              />
            </View>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: '#10b981' }]}>Total entregue</Text>
            <Text style={[styles.kpiValue, { color: '#047857' }]}>{num(stats.totalDeliveredSc, 2)} SC</Text>
            <Text style={styles.kpiSub}>Confirmado em balanca</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: '#2563eb' }]}>Em transito</Text>
            <Text style={[styles.kpiValue, { color: '#1d4ed8' }]}>{num(stats.inTransitQtySc, 2)} SC</Text>
            <Text style={styles.kpiSub}>A caminho da descarga</Text>
          </View>
          <View
            style={[
              styles.balanceCard,
              {
                backgroundColor: stats.financialBalance <= 0.05 ? '#059669' : '#0f172a',
                borderColor: stats.financialBalance <= 0.05 ? '#10b981' : '#6366f1',
              },
            ]}
          >
            <Text style={styles.balanceLabel}>Saldo financeiro</Text>
            <Text style={styles.balanceValue}>{currency(stats.financialBalance)}</Text>
            <Text style={styles.balanceStatus}>
              {stats.financialBalance <= 0.05 ? 'Faturas liquidadas' : 'Aguardando pagamento'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>Identificacao do comprador</Text>
            </View>
            <Text style={styles.infoLabel}>Razao social</Text>
            <Text style={styles.infoValueStrong}>{order.customerName || '-'}</Text>
            <View style={styles.infoRowGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>CNPJ / CPF</Text>
                <Text style={styles.infoValue}>{order.customerDocument || '-'}</Text>
              </View>
              <View style={styles.infoCellLast}>
                <Text style={styles.infoLabel}>Cidade / UF</Text>
                <Text style={styles.infoValue}>{order.customerCity || '-'} / {order.customerState || '-'}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoColumn, styles.infoColumnLast]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>Detalhes do contrato</Text>
            </View>
            <View style={styles.infoRowGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Produto</Text>
                <Text style={styles.infoValueStrong}>{order.productName || '-'}</Text>
              </View>
              <View style={styles.infoCellLast}>
                <Text style={styles.infoLabel}>Preco unitario (SC)</Text>
                <Text style={[styles.infoValueStrong, { color: '#047857' }]}>{currency(order.unitPrice || 0)}</Text>
              </View>
            </View>
            <View style={styles.infoRowGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Vendedor responsavel</Text>
                <Text style={styles.infoValue}>{order.consultantName || '-'}</Text>
              </View>
              <View style={styles.infoCellLast}>
                <Text style={styles.infoLabel}>Data venda</Text>
                <Text style={styles.infoValue}>{dateStr(order.date)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tableTitleRow}>
          <Text style={styles.tableTitle}>Relatorio analitico de entregas realizadas</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '14%' }]}>Data</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>NF / Doc.</Text>
            <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Transportadora / Motorista</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Peso Orig.</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Peso Dest.</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Quebra KG</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Volume SC</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'right' }]}>Total</Text>
          </View>

          {stats.activeLoadings.map((l, idx) => {
            const isDelivered = Number(l?.unloadWeightKg) > 0;
            const weight = isDelivered ? Number(l?.unloadWeightKg) || 0 : Number(l?.weightKg) || 0;
            const breakage = isDelivered ? Math.max(0, (Number(l?.weightKg) || 0) - (Number(l?.unloadWeightKg) || 0)) : 0;
            const totalLine = (weight / 60) * (Number(l?.salesPrice) || Number(order?.unitPrice) || 0);

            return (
              <View key={l.id || idx} style={[styles.tableRow, idx % 2 === 0 ? undefined : styles.tableRowOdd]}>
                <View style={{ width: '14%' }}>
                  <Text style={styles.tableCell}>{dateStr(l.date)}</Text>
                </View>
                <Text style={[styles.tableCell, { width: '12%', color: '#64748b' }]}>NF-{l.invoiceNumber || '---'}</Text>
                <View style={{ width: '22%' }}>
                  <Text style={styles.tableCell}>{l.carrierName || '-'}</Text>
                  <Text style={styles.tableCellMuted}>{l.driverName || '-'}</Text>
                </View>
                <Text style={[styles.tableCell, { width: '10%', textAlign: 'right', color: '#94a3b8' }]}> {num(l.weightKg, 0)} </Text>
                <Text style={[styles.tableCell, { width: '10%', textAlign: 'right', color: '#047857' }]}> {isDelivered ? num(Number(l.unloadWeightKg) || 0, 0) : 'TRANSITO'} </Text>
                <Text style={[styles.tableCell, { width: '10%', textAlign: 'right', color: breakage > 50 ? '#e11d48' : '#cbd5f1' }]}> {breakage > 0 ? num(breakage, 0) : '-'} </Text>
                <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}> {num(weight / 60, 2)} </Text>
                <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}> {currency(totalLine)} </Text>
              </View>
            );
          })}

          <View style={styles.tableTotalRow}>
            <Text style={[styles.tableCell, { width: '58%', textAlign: 'right' }]}>Totais consolidados confirmados:</Text>
            <Text style={[styles.tableCell, { width: '10%', textAlign: 'right', color: '#e11d48' }]}> {num(stats.totalBreakageKg, 0)} KG</Text>
            <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}> {num(stats.totalDeliveredSc, 2)} SC</Text>
            <Text style={[styles.tableCell, { width: '12%', textAlign: 'right', color: '#065f46' }]}> {currency(stats.totalInvoiced)} </Text>
          </View>
        </View>

        <View style={styles.receiptsSection}>
          <Text style={styles.receiptsTitle}>Historico de recebimentos e conciliacao</Text>
          {stats.receipts.length === 0 ? (
            <Text style={styles.receiptEmpty}>Aguardando confirmacao de recebimentos bancarios.</Text>
          ) : (
            <View style={styles.receiptsGrid}>
              {stats.receipts.map((r, i) => (
                <View key={i} style={[styles.receiptCard, (i + 1) % 3 === 0 && styles.receiptCardLast]}>
                  <Text style={styles.receiptLabel}>{dateStr(r.date)}</Text>
                  <Text style={styles.receiptNote}>CONTA: {receiptAccountLabel(r.accountName, r.notes)}</Text>
                  <Text style={styles.receiptValue}>{currency((Number(r.value) || 0) + (Number(r.discountValue) || 0))}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.signatures}>
          <View style={styles.signaturesRow}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{company.razaoSocial}</Text>
              <Text style={styles.signatureRole}>Vendedor / Emitente</Text>
            </View>
            <View style={[styles.signatureBox, styles.signatureBoxLast]}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>{order.customerName || '-'}</Text>
              <Text style={styles.signatureRole}>Comprador / Aceite financeiro</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.footerText, styles.footerAccent]}>Suporte Graos Intelligence v1.8</Text>
              <Text style={[styles.footerText, { marginLeft: 6 }]}>| Este extrato e um comprovante oficial</Text>
            </View>
            <Text style={styles.footerText}>
              Ref: Pedido {order.number} | Pagina 1 de 1 | {new Date().toLocaleTimeString('pt-BR')}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PdfDocument;
