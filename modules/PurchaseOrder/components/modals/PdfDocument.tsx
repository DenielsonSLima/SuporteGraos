import React, { useMemo } from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { PurchaseOrder } from '../../types';
import { Loading } from '../../../Loadings/types';
import { PdfVariant } from './PdfPreviewModal';
import { stylesProducer } from './PdfProducerStyles';
import { stylesInternal } from './PdfInternalStyles';

import { CompanyData, WatermarkSettings } from '../../../../services/settingsService';

interface Props {
  order: PurchaseOrder;
  loadings: Loading[];
  variant: PdfVariant;
  company: CompanyData;
  watermark: WatermarkSettings;
}

const PdfDocument: React.FC<Props> = ({ order, loadings, variant, company, watermark }) => {

  const currency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);

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
          {typeof watermark.imageUrl === 'string' && watermark.imageUrl.startsWith('http') && (
            <Image src={watermark.imageUrl} style={stylesInternal.watermark} />
          )}

          <View style={stylesInternal.header}>
            <View style={stylesInternal.headerLeft}>
              <View style={stylesInternal.headerLogo}>
                {typeof company.logoUrl === 'string' && company.logoUrl.startsWith('http') && (
                  <Image src={company.logoUrl} style={stylesInternal.headerLogoImg} />
                )}
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
                <Text style={[stylesInternal.footerText, stylesInternal.footerAccent]}>{company.nomeFantasia || 'ERP'} Intelligence</Text>
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
        {watermark.imageUrl && String(watermark.imageUrl).toLowerCase() !== 'null' && (
          <Image src={watermark.imageUrl} style={stylesProducer.watermark} />
        )}

        <View style={stylesProducer.headerContainer}>
          <View style={stylesProducer.headerLeft}>
            <View style={stylesProducer.logoBox}>
              {company.logoUrl && String(company.logoUrl).toLowerCase() !== 'null' && (
                <Image src={company.logoUrl} style={stylesProducer.logo} />
              )}
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
              <Text style={[stylesProducer.footerText, stylesProducer.footerAccent]}>{company.nomeFantasia || 'ERP'} System</Text>
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
