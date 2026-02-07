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

const stylesProducer = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    top: 140,
    left: 140,
    width: 300,
    height: 300,
    opacity: 0.03,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBox: {
    width: 72,
    height: 72,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'flex-end',
  },
  headerRightLabel: {
    fontSize: 6,
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
    textTransform: 'uppercase',
  },
  headerRightNumber: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#34d399',
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
  kpiContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
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
  kpiBar: {
    height: 2,
    width: 36,
    borderRadius: 1,
    marginTop: 6,
  },
  kpiBalanceCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  kpiBalanceLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  kpiBalanceValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginTop: 4,
  },
  kpiBalanceStatus: {
    fontSize: 6,
    fontFamily: 'Helvetica-BoldOblique',
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
  badge: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  badgeMuted: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    marginLeft: 6,
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
  tableBadge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
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
  tableRowEven: {
    backgroundColor: '#ffffff',
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
  financialSection: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
  },
  financialColumn: {
    flex: 1,
    marginRight: 12,
  },
  financialColumnLast: {
    marginRight: 0,
  },
  financialTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    marginBottom: 6,
  },
  financialEmpty: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 6,
  },
  financialMeta: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  financialNote: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  financialValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  signatures: {
    marginTop: 12,
    paddingTop: 12,
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
    borderRadius: 12,
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
    padding: 18,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    top: 110,
    left: 320,
    width: 260,
    height: 260,
    opacity: 0.03,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#0f172a',
    paddingBottom: 10,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogo: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerLogoImg: {
    width: 56,
    height: 56,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
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
    marginRight: 8,
  },
  headerBadge: {
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  headerBadgeLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#34d399',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerBadgeTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  headerBadgeNote: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  kpiItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 10,
    marginRight: 8,
  },
  kpiItemDark: {
    backgroundColor: '#0f172a',
    borderColor: '#10b981',
  },
  kpiItemLast: {
    marginRight: 0,
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
    marginTop: 3,
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
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: '#e2e8f0',
  },
  panelRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  panel: {
    flex: 1,
    marginRight: 12,
  },
  panelLast: {
    marginRight: 0,
  },
  panelTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    marginBottom: 6,
  },
  panelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  panelCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 6,
    marginBottom: 6,
    marginRight: 6,
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
    marginTop: 2,
  },
  panelValueWarn: {
    color: '#be123c',
  },
  panelListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 4,
  },
  notesSection: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
  },
  notesTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 6,
    fontFamily: 'Helvetica',
    color: '#64748b',
    lineHeight: 1.4,
  },
  approvalBox: {
    alignItems: 'center',
  },
  approvalLine: {
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    width: '100%',
    marginBottom: 4,
  },
  approvalName: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
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
    marginTop: 6,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 6,
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

  const formatDoc = (doc: string) => {
    if (!doc) return '';
    return doc
      .replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const statsProducer = useMemo(() => {
    const safeLoadings = Array.isArray(loadings) ? loadings : [];
    const activeLoadings = safeLoadings.filter((l) => l?.status !== 'canceled');

    const totalWeightKg = activeLoadings.reduce((acc, l) => acc + (Number(l?.weightKg) || 0), 0);
    const totalWeightSc = activeLoadings.reduce((acc, l) => acc + (Number(l?.weightSc) || 0), 0);
    const totalLoadedValue = activeLoadings.reduce((acc, l) => acc + (Number(l?.totalPurchaseValue) || 0), 0);

    const avgPricePerSc = totalWeightSc > 0 ? totalLoadedValue / totalWeightSc : 0;

    const transactions = Array.isArray(order?.transactions) ? order.transactions : [];
    const payments = transactions.filter((t) => t?.type === 'payment' || t?.type === 'advance');
    const expenses = transactions.filter((t) => t?.type === 'expense');
    const debitedExpenses = expenses.filter((t) => t?.deductFromPartner);

    const totalPaid = payments.reduce(
      (acc, t) => acc + (Number(t?.value) || 0) + (Number(t?.discountValue) || 0),
      0
    );
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
      activeLoadings,
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
    const extraExpenses = transactions.filter((t) => t?.type === 'expense').reduce((acc, t) => acc + (Number(t?.value) || 0), 0);
    const brokerCommission = transactions
      .filter((t) => t?.type === 'commission' && !t?.deductFromPartner)
      .reduce((acc, t) => acc + (Number(t?.value) || 0), 0);

    const totalInvestment = totalGrainCost + totalFreightCost + extraExpenses + brokerCommission;
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
      extraExpenses,
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
                <Text style={stylesInternal.headerSubtitle}>Auditoria executiva de performance financeira</Text>
                <View style={stylesInternal.headerMetaRow}>
                  <Text style={stylesInternal.headerMetaText}>Contrato compra: #{order.number}</Text>
                  <Text style={stylesInternal.headerMetaText}>Safra: {order.harvest || '-'}</Text>
                  <Text style={stylesInternal.headerMetaText}>Emissao: {new Date().toLocaleDateString('pt-BR')}</Text>
                </View>
              </View>
            </View>
            <View style={stylesInternal.headerBadge}>
              <Text style={stylesInternal.headerBadgeLabel}>Documento confidencial</Text>
              <Text style={stylesInternal.headerBadgeTitle}>Relatorio de spread real</Text>
              <Text style={stylesInternal.headerBadgeNote}>Uso exclusivo dos socios e gerencia</Text>
            </View>
          </View>

          <View style={stylesInternal.kpiRow}>
            <View style={stylesInternal.kpiItem}>
              <Text style={stylesInternal.kpiLabel}>Custo total da operacao</Text>
              <Text style={stylesInternal.kpiValue}>{currency(statsInternal.totalInvestment)}</Text>
              <Text style={stylesInternal.kpiHint}>Grao + frete + taxas</Text>
            </View>
            <View style={stylesInternal.kpiItem}>
              <Text style={stylesInternal.kpiLabel}>Faturamento realizado</Text>
              <Text style={stylesInternal.kpiValue}>{currency(statsInternal.totalRevenue)}</Text>
              <Text style={stylesInternal.kpiHint}>Base: peso de destino</Text>
            </View>
            <View style={[stylesInternal.kpiItem, stylesInternal.kpiItemDark]}>
              <Text style={[stylesInternal.kpiLabel, { color: '#ffffff' }]}>Lucro liquido final</Text>
              <Text style={[stylesInternal.kpiValue, stylesInternal.kpiValueLight, { color: statsInternal.netProfit >= 0 ? '#34d399' : '#fb7185' }]}>
                {currency(statsInternal.netProfit)}
              </Text>
              <Text style={[stylesInternal.kpiHint, { color: '#94a3b8' }]}>Sobra real apos custos</Text>
            </View>
            <View style={stylesInternal.kpiItem}>
              <Text style={stylesInternal.kpiLabel}>Margem de lucro</Text>
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
              <Text style={[stylesInternal.kpiValue, stylesInternal.kpiValueLight]}>
                {currency(statsInternal.profitPerSc)}
              </Text>
              <Text style={[stylesInternal.kpiHint, { color: '#60a5fa' }]}>Eficiencia comercial</Text>
            </View>
          </View>

          <View style={{ marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0f172a', textTransform: 'uppercase' }}>
              Matriz analitica de lucratividade por romaneio
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <Text style={[stylesInternal.tableCell, { color: '#94a3b8', marginRight: 8 }]}>
                Custo medio compra: {currency(statsInternal.totalGrainCost / (statsInternal.totalWeightScOrig || 1))}
              </Text>
              <Text style={[stylesInternal.tableCell, { color: '#94a3b8' }]}> 
                Frete medio (T): {currency(statsInternal.totalFreightCost / ((statsInternal.totalWeightKgOrig || 1) / 1000))}
              </Text>
            </View>
          </View>

          <View>
            <View style={stylesInternal.tableHeaderRow}>
              <Text style={[stylesInternal.tableHeaderCell, { width: '12%' }]}>Dta/Placa</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '22%' }]}>Transportadora / Destino</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Peso Orig.</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Peso Dest.</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Quebra kg</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Custo SC</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Venda SC</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Frete Total</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Lucro Carga</Text>
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
                    <Text style={stylesInternal.tableCell}>{l.vehiclePlate || '-'}</Text>
                    <Text style={stylesInternal.tableCellSmall}>{dateStr(l.date)}</Text>
                  </View>
                  <View style={{ width: '22%' }}>
                    <Text style={stylesInternal.tableCell}>{l.carrierName || '-'}</Text>
                    <Text style={stylesInternal.tableCellSmall}>{l.customerName || '-'}</Text>
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
                  <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#64748b' }]}>
                    {currency(l.purchasePricePerSc)}
                  </Text>
                  <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#16a34a' }]}>
                    {currency(l.salesPrice)}
                  </Text>
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
              <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#1d4ed8' }]}>
                {num(statsInternal.totalWeightKgDest, 0)} KG
              </Text>
              <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#e11d48' }]}>
                {num(statsInternal.totalBreakageKg, 0)} KG
              </Text>
              <Text style={[stylesInternal.tableCell, { width: '8%' }]}></Text>
              <Text style={[stylesInternal.tableCell, { width: '8%' }]}></Text>
              <Text style={[stylesInternal.tableCell, { width: '10%' }]}></Text>
              <Text style={[stylesInternal.tableCell, { width: '10%', textAlign: 'right', color: statsInternal.netProfit >= 0 ? '#16a34a' : '#e11d48' }]}>
                {currency(statsInternal.netProfit)}
              </Text>
              <Text style={[stylesInternal.tableCell, { width: '6%' }]}></Text>
            </View>
          </View>

          <View style={stylesInternal.panelRow}>
            <View style={stylesInternal.panel}>
              <Text style={stylesInternal.panelTitle}>Detalhamento de custos diretos</Text>
              <View style={stylesInternal.panelGrid}>
                <View style={stylesInternal.panelCard}>
                  <Text style={stylesInternal.panelLabel}>Custo grao (total)</Text>
                  <Text style={stylesInternal.panelValue}>{currency(statsInternal.totalGrainCost)}</Text>
                </View>
                <View style={stylesInternal.panelCard}>
                  <Text style={stylesInternal.panelLabel}>Custo fretes (total)</Text>
                  <Text style={stylesInternal.panelValue}>{currency(statsInternal.totalFreightCost)}</Text>
                </View>
                <View style={stylesInternal.panelCard}>
                  <Text style={stylesInternal.panelLabel}>Taxas adm / extras</Text>
                  <Text style={[stylesInternal.panelValue, stylesInternal.panelValueWarn]}>{currency(statsInternal.extraExpenses)}</Text>
                </View>
                <View style={stylesInternal.panelCard}>
                  <Text style={stylesInternal.panelLabel}>Comissoes empresa</Text>
                  <Text style={[stylesInternal.panelValue, stylesInternal.panelValueWarn]}>{currency(statsInternal.brokerCommission)}</Text>
                </View>
              </View>
            </View>

            <View style={[stylesInternal.panel, stylesInternal.panelLast]}>
              <Text style={stylesInternal.panelTitle}>Fluxo de saidas efetivadas</Text>
              {(order.transactions || [])
                .filter((t) => t?.type === 'payment' || t?.type === 'advance')
                .slice(0, 4)
                .map((t, i) => (
                  <View key={i} style={stylesInternal.panelListItem}>
                    <Text style={stylesInternal.tableCellSmall}>{dateStr(t.date)} - {t.notes || 'Pagamento'}</Text>
                    <Text style={stylesInternal.tableCell}>{currency(t.value)}</Text>
                  </View>
                ))}
              {(order.transactions || []).length > 4 && (
                <Text style={[stylesInternal.tableCellSmall, { textAlign: 'center', marginTop: 4 }]}>Ver historico completo no ERP</Text>
              )}
            </View>
          </View>

          <View style={stylesInternal.notesSection}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 2, marginRight: 12 }}>
                <Text style={stylesInternal.notesTitle}>Notas de auditoria</Text>
                <Text style={stylesInternal.notesText}>
                  1. A rentabilidade aqui apresentada considera o peso liquido de destino confirmado pelo cliente.{"\n"}
                  2. Cargas em transito utilizam o peso de origem para projecao de receita.{"\n"}
                  3. Quebras acima de 0.50% foram sinalizadas no relatorio para investigacao logistica.
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={stylesInternal.approvalBox}>
                  <View style={stylesInternal.approvalLine} />
                  <Text style={stylesInternal.approvalName}>Comite executivo / socios</Text>
                  <Text style={stylesInternal.approvalRole}>Visto de aprovacao de resultado</Text>
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
        <Page size="A4" style={stylesProducer.page}>
          <Text>Modo nao disponivel para esta visualizacao</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={stylesProducer.page}>
        {watermark.imageUrl && <Image src={watermark.imageUrl} style={stylesProducer.watermark} />}

        <View style={stylesProducer.headerContainer}>
          <View style={stylesProducer.headerLeft}>
            <View style={stylesProducer.logoBox}>
              {company.logoUrl && <Image src={company.logoUrl} style={stylesProducer.logo} />}
            </View>
            <View style={stylesProducer.companyBlock}>
              <Text style={stylesProducer.companyName}>{company.nomeFantasia}</Text>
              <Text style={stylesProducer.companyRazao}>{company.razaoSocial}</Text>
              <View style={stylesProducer.companyMetaRow}>
                <Text style={stylesProducer.companyMetaText}>CNPJ: {company.cnpj}</Text>
                <Text style={stylesProducer.companyMetaText}>{company.cidade}/{company.uf}</Text>
              </View>
            </View>
          </View>

          <View style={stylesProducer.headerRight}>
            <View style={stylesProducer.headerRightBox}>
              <Text style={stylesProducer.headerRightLabel}>Extrato Consolidado</Text>
              <Text style={stylesProducer.headerRightTitle}>Ordem de Compra</Text>
              <Text style={stylesProducer.headerRightNumber}>#{order.number}</Text>
            </View>
            <Text style={stylesProducer.headerRightDate}>
              Emissao: {new Date().toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        <View style={stylesProducer.kpiContainer}>
          <View style={stylesProducer.kpiCard}>
            <Text style={stylesProducer.kpiLabel}>Total Carregado</Text>
            <Text style={stylesProducer.kpiValue}>{currency(statsProducer.totalLoadedValue)}</Text>
            <View style={[stylesProducer.kpiBar, { backgroundColor: '#3b82f6' }]} />
          </View>
          <View style={stylesProducer.kpiCard}>
            <Text style={[stylesProducer.kpiLabel, { color: '#10b981' }]}>Total Liquidado</Text>
            <Text style={[stylesProducer.kpiValue, { color: '#047857' }]}>{currency(statsProducer.totalPaid)}</Text>
            <View style={[stylesProducer.kpiBar, { backgroundColor: '#10b981' }]} />
          </View>
          <View style={stylesProducer.kpiCard}>
            <Text style={[stylesProducer.kpiLabel, { color: '#f59e0b' }]}>Retencoes/Taxas</Text>
            <Text style={[stylesProducer.kpiValue, { color: '#b45309' }]}>{currency(statsProducer.totalDebited)}</Text>
            <View style={[stylesProducer.kpiBar, { backgroundColor: '#f59e0b' }]} />
          </View>
          <View
            style={[
              stylesProducer.kpiBalanceCard,
              {
                backgroundColor: statsProducer.balance <= 0.05 ? '#059669' : '#e11d48',
                borderColor: statsProducer.balance <= 0.05 ? '#047857' : '#be123c',
              },
            ]}
          >
            <Text style={stylesProducer.kpiBalanceLabel}>Saldo Remanescente</Text>
            <Text style={stylesProducer.kpiBalanceValue}>{currency(statsProducer.balance)}</Text>
            <Text style={stylesProducer.kpiBalanceStatus}>
              {statsProducer.balance <= 0.05 ? 'Contrato Quitado' : 'Valor a Liquidar'}
            </Text>
          </View>
        </View>

        <View style={stylesProducer.infoRow}>
          <View style={stylesProducer.infoColumn}>
            <View style={stylesProducer.sectionHeader}>
              <Text style={stylesProducer.sectionHeaderText}>Identificacao do Produtor</Text>
            </View>
            <Text style={stylesProducer.infoLabel}>Razao Social / Nome</Text>
            <Text style={stylesProducer.infoValueStrong}>{order.partnerName || '-'}</Text>
            <View style={stylesProducer.infoRowGrid}>
              <View style={stylesProducer.infoCell}>
                <Text style={stylesProducer.infoLabel}>Documento</Text>
                <Text style={stylesProducer.infoValue}>{formatDoc(order.partnerDocument || '') || '-'}</Text>
              </View>
              <View style={stylesProducer.infoCellLast}>
                <Text style={stylesProducer.infoLabel}>Cidade / UF</Text>
                <Text style={stylesProducer.infoValue}>{order.partnerCity || '-'} / {order.partnerState || '-'}</Text>
              </View>
            </View>
          </View>

          <View style={[stylesProducer.infoColumn, stylesProducer.infoColumnLast]}>
            <View style={stylesProducer.sectionHeader}>
              <Text style={stylesProducer.sectionHeaderText}>Detalhes da Negociacao</Text>
            </View>
            <View style={stylesProducer.infoRowGrid}>
              <View style={stylesProducer.infoCell}>
                <Text style={stylesProducer.infoLabel}>Safra Vinculada</Text>
                <Text style={stylesProducer.infoValueStrong}>{order.harvest || '-'}</Text>
              </View>
              <View style={stylesProducer.infoCellLast}>
                <Text style={stylesProducer.infoLabel}>Consultor Responsavel</Text>
                <Text style={stylesProducer.infoValue}>{order.consultantName || '-'}</Text>
              </View>
            </View>
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={stylesProducer.badge}>{order.items?.[0]?.productName || '-'}</Text>
              <Text style={stylesProducer.badgeMuted}>Media: {currency(statsProducer.avgPricePerSc)} /SC</Text>
            </View>
          </View>
        </View>

        <View style={stylesProducer.tableTitleRow}>
          <Text style={stylesProducer.tableTitle}>Historico Analitico de Carregamentos</Text>
          <Text style={stylesProducer.tableBadge}>Total Volume: {num(statsProducer.totalWeightSc, 2)} SC</Text>
        </View>

        <View style={stylesProducer.table}>
          <View style={stylesProducer.tableHeader}>
            <Text style={[stylesProducer.tableHeaderCell, { width: '12%' }]}>Data</Text>
            <Text style={[stylesProducer.tableHeaderCell, { width: '30%' }]}>Logistica / Transporte</Text>
            <Text style={[stylesProducer.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>Peso KG</Text>
            <Text style={[stylesProducer.tableHeaderCell, { width: '14%', textAlign: 'right' }]}>Volume SC</Text>
            <Text style={[stylesProducer.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Preco Unit.</Text>
            <Text style={[stylesProducer.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Total</Text>
          </View>

          {statsProducer.activeLoadings.map((loading, idx) => (
            <View
              key={loading.id || idx}
              style={[stylesProducer.tableRow, idx % 2 === 0 ? stylesProducer.tableRowEven : stylesProducer.tableRowOdd]}
            >
              <Text style={[stylesProducer.tableCell, { width: '12%' }]}>{dateStr(loading.date)}</Text>
              <View style={{ width: '30%' }}>
                <Text style={stylesProducer.tableCell}>{loading.carrierName || '-'}</Text>
                <Text style={stylesProducer.tableCellMuted}>{loading.vehiclePlate || '-'} / {loading.driverName || '-'}</Text>
              </View>
              <Text style={[stylesProducer.tableCell, { width: '14%', textAlign: 'right' }]}>{num(loading.weightKg, 0)}</Text>
              <Text style={[stylesProducer.tableCell, { width: '14%', textAlign: 'right', color: '#2563eb' }]}>
                {num(loading.weightSc, 2)}
              </Text>
              <Text style={[stylesProducer.tableCell, { width: '15%', textAlign: 'right', color: '#64748b' }]}>
                {currency(loading.purchasePricePerSc)}
              </Text>
              <Text style={[stylesProducer.tableCell, { width: '15%', textAlign: 'right' }]}>
                {currency(loading.totalPurchaseValue)}
              </Text>
            </View>
          ))}

          <View style={stylesProducer.tableTotalRow}>
            <Text style={[stylesProducer.tableCell, { width: '42%' }]}>Totais Consolidados:</Text>
            <Text style={[stylesProducer.tableCell, { width: '14%', textAlign: 'right' }]}>{num(statsProducer.totalWeightKg, 0)} KG</Text>
            <Text style={[stylesProducer.tableCell, { width: '14%', textAlign: 'right', color: '#2563eb' }]}>
              {num(statsProducer.totalWeightSc, 2)} SC
            </Text>
            <Text style={[stylesProducer.tableCell, { width: '15%' }]}></Text>
            <Text style={[stylesProducer.tableCell, { width: '15%', textAlign: 'right' }]}>
              {currency(statsProducer.totalLoadedValue)}
            </Text>
          </View>
        </View>

        <View style={stylesProducer.financialSection}>
          <View style={stylesProducer.financialColumn}>
            <Text style={[stylesProducer.financialTitle, { color: '#047857' }]}>Liquidacoes Realizadas</Text>
            {statsProducer.payments.length === 0 ? (
              <Text style={stylesProducer.financialEmpty}>Sem registros de pagamento.</Text>
            ) : (
              statsProducer.payments.map((p, i) => (
                <View key={i} style={stylesProducer.financialItem}>
                  <View>
                    <Text style={stylesProducer.financialMeta}>{dateStr(p.date)}</Text>
                    <Text style={stylesProducer.financialNote}>Ref: {p.notes || p.accountName || '-'}</Text>
                  </View>
                  <Text style={[stylesProducer.financialValue, { color: '#047857' }]}>
                    {currency((Number(p.value) || 0) + (Number(p.discountValue) || 0))}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={[stylesProducer.financialColumn, stylesProducer.financialColumnLast]}>
            <Text style={[stylesProducer.financialTitle, { color: '#be123c' }]}>Retencoes e Despesas Extras</Text>
            {statsProducer.debitedExpenses.length === 0 ? (
              <Text style={stylesProducer.financialEmpty}>Nenhuma retencao aplicada.</Text>
            ) : (
              statsProducer.debitedExpenses.map((e, i) => (
                <View key={i} style={stylesProducer.financialItem}>
                  <View>
                    <Text style={stylesProducer.financialMeta}>{dateStr(e.date)}</Text>
                    <Text style={stylesProducer.financialNote}>Motivo: {e.notes || 'Taxa Diversa'}</Text>
                  </View>
                  <Text style={[stylesProducer.financialValue, { color: '#be123c' }]}>-{currency(e.value)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={stylesProducer.signatures}>
          <View style={stylesProducer.signaturesRow}>
            <View style={stylesProducer.signatureBox}>
              <View style={stylesProducer.signatureLine} />
              <Text style={stylesProducer.signatureName}>{company.razaoSocial || company.nomeFantasia}</Text>
              <Text style={stylesProducer.signatureRole}>Emitente / Comprador</Text>
            </View>
            <View style={[stylesProducer.signatureBox, stylesProducer.signatureBoxLast]}>
              <View style={stylesProducer.signatureLine} />
              <Text style={stylesProducer.signatureName}>{order.partnerName || 'PRODUTOR'}</Text>
              <Text style={stylesProducer.signatureRole}>Favorecido / Produtor</Text>
            </View>
          </View>

          <View style={stylesProducer.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[stylesProducer.footerText, stylesProducer.footerAccent]}>ERP Suporte Graos v1.8</Text>
              <Text style={[stylesProducer.footerText, { marginLeft: 6 }]}>| Documento Auditado Eletronicamente</Text>
            </View>
            <Text style={stylesProducer.footerText}>
              Pagina 1 de 1 | {new Date().toLocaleTimeString('pt-BR')}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PdfDocument;
