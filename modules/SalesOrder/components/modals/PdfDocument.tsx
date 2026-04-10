import React, { useMemo } from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { SalesOrder } from '../../types';
import { Loading } from '../../../Loadings/types';
import { styles } from './PdfProducerStyles';
import { stylesInternal } from './PdfInternalStyles';
import { calculateInternalPdfStats } from '../../hooks/useSalesPerformanceStats';

type PdfVariant = 'producer' | 'internal';

export interface PdfCompanyData {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  endereco?: string;
  numero?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  logoUrl?: string | null;
  [key: string]: any;
}

export interface PdfWatermarkData {
  enabled?: boolean;
  text?: string;
  [key: string]: any;
}

interface Props {
  order: SalesOrder;
  loadings: Loading[];
  variant: PdfVariant;
  company?: PdfCompanyData;
  watermark?: PdfWatermarkData;
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

  const statsInternal = useMemo(() => calculateInternalPdfStats(order, loadings), [order, loadings]);

  if (variant === 'internal') {
    const marginPercentAbs = Math.min(Math.abs(statsInternal.marginPercent) * 4, 100);

    return (
      <Document>
        <Page size="A4" orientation="landscape" style={stylesInternal.page}>
          {watermark.imageUrl && String(watermark.imageUrl).toLowerCase() !== 'null' && (
            <Image src={watermark.imageUrl} style={stylesInternal.watermark} />
          )}

          <View style={stylesInternal.header}>
            <View style={stylesInternal.headerLeft}>
              <View style={stylesInternal.headerLogo}>
                {company.logoUrl && String(company.logoUrl).toLowerCase() !== 'null' && (
                  <Image src={company.logoUrl} style={stylesInternal.headerLogoImg} />
                )}
              </View>
              <View>
                <Text style={stylesInternal.headerTitle}>{company.razaoSocial}</Text>
                <Text style={stylesInternal.headerSubtitle}>Inteligencia logistica e auditoria de performance</Text>
                <View style={stylesInternal.headerMetaRow}>
                  <Text style={stylesInternal.headerMetaText}>Contrato venda: #{order.number} - {order.customerName || order.partnerName || '-'}</Text>
                  <Text style={stylesInternal.headerMetaText}>Emissao: {new Date().toLocaleDateString('pt-BR')}</Text>
                </View>
                <View style={[stylesInternal.headerMetaRow, { marginTop: 2 }]}>
                  {company.telefone && (
                    <Text style={stylesInternal.headerMetaText}>CONTATO: {company.telefone}</Text>
                  )}
                  {company.email && (
                    <Text style={stylesInternal.headerMetaText}>EMAIL: {company.email.toLowerCase()}</Text>
                  )}
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
              <Text style={[stylesInternal.tableHeaderCell, { width: '15%' }]}>Data / Motorista</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '25%' }]}>Transportadora / Destino</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Peso Orig.</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Peso Dest.</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Quebra kg</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Custo SC</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '8%', textAlign: 'right' }]}>Venda SC</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Frete Total</Text>
              <Text style={[stylesInternal.tableHeaderCell, { width: '10%', textAlign: 'right' }]}>Lucro Carga</Text>
            </View>

            {statsInternal.activeLoadings.map((l, idx) => {
              const rowCost = (Number(l?.totalPurchaseValue) || 0) + (Number(l?.totalFreightValue) || 0);
              const rowProfit = (Number(l?.totalSalesValue) || 0) - rowCost;
              const breakage = l?.unloadWeightKg ? (Number(l?.weightKg) || 0) - (Number(l?.unloadWeightKg) || 0) : 0;
              const breakagePerc = l?.unloadWeightKg ? (breakage / (Number(l?.weightKg) || 1)) * 100 : 0;

              return (
                <View key={l.id || idx} style={[stylesInternal.tableRow, idx % 2 === 0 ? undefined : stylesInternal.tableRowOdd]}>
                  <View style={{ width: '15%' }}>
                    <Text style={stylesInternal.tableCell}>{dateStr(l.date)}</Text>
                    <Text style={stylesInternal.tableCellSmall}>{l.driverName || '-'}</Text>
                  </View>
                  <View style={{ width: '25%' }}>
                    <Text style={stylesInternal.tableCell}>{l.carrierName || '-'}</Text>
                    <Text style={stylesInternal.tableCellSmall}>{l.customerName || '-'}</Text>
                  </View>
                  <View style={{ width: '8%', alignItems: 'flex-end' }}>
                    <Text style={stylesInternal.tableCell}>{num(l.weightKg, 0)}</Text>
                    <Text style={stylesInternal.tableCellSmall}>{num(Number(l.weightKg) / 60, 2)} SC</Text>
                  </View>
                  <View style={{ width: '8%', alignItems: 'flex-end' }}>
                    <Text style={[stylesInternal.tableCell, { color: '#1d4ed8' }]}>
                      {l.unloadWeightKg ? num(l.unloadWeightKg, 0) : 'Pendente'}
                    </Text>
                    {l.unloadWeightKg && (
                      <Text style={stylesInternal.tableCellSmall}>{num(Number(l.unloadWeightKg) / 60, 2)} SC</Text>
                    )}
                  </View>
                  <View style={{ width: '8%', alignItems: 'flex-end' }}>
                    {l?.unloadWeightKg ? (
                      <>
                        <Text style={[
                          stylesInternal.tableCell, 
                          { color: breakage > 0 ? '#e11d48' : breakage < 0 ? '#059669' : '#94a3b8' }
                        ]}>
                          {breakage > 0 ? num(breakage, 0) : breakage < 0 ? `+${num(Math.abs(breakage), 0)}` : '0'}
                        </Text>
                        <Text style={stylesInternal.tableCellSmall}>({num(breakagePerc, 2)}%)</Text>
                      </>
                    ) : (
                      <Text style={[stylesInternal.tableCell, { color: '#94a3b8' }]}>-</Text>
                    )}
                  </View>
                  <View style={{ width: '8%', alignItems: 'flex-end' }}>
                    <Text style={[stylesInternal.tableCell, { color: '#64748b' }]}> {currency(l.purchasePricePerSc)} </Text>
                    <Text style={stylesInternal.tableCellSmall}>{currency(l.totalPurchaseValue)}</Text>
                  </View>
                  <View style={{ width: '8%', alignItems: 'flex-end' }}>
                    <Text style={[stylesInternal.tableCell, { color: '#16a34a' }]}> {currency(l.salesPrice)} </Text>
                    <Text style={stylesInternal.tableCellSmall}>{currency(l.totalSalesValue)}</Text>
                  </View>
                  <View style={{ width: '10%', alignItems: 'flex-end' }}>
                    <Text style={[stylesInternal.tableCell, { color: '#475569' }]}> {currency(l.totalFreightValue)} </Text>
                    <Text style={stylesInternal.tableCellSmall}> T: {currency(l.freightPricePerTon)} </Text>
                  </View>
                  <Text style={[stylesInternal.tableCell, { width: '10%', textAlign: 'right', color: rowProfit >= 0 ? '#16a34a' : '#e11d48' }]}>
                    {currency(rowProfit)}
                  </Text>
                </View>
              );
            })}

            <View style={stylesInternal.tableTotalRow}>
              <Text style={[stylesInternal.tableCell, { width: '40%', textAlign: 'right' }]}>Totais consolidados:</Text>
              <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right' }]}>{num(statsInternal.totalWeightKgOrig, 0)} KG</Text>
              <Text style={[stylesInternal.tableCell, { width: '8%', textAlign: 'right', color: '#1d4ed8' }]}> {num(statsInternal.totalWeightKgDest, 0)} KG </Text>
              <Text style={[
                stylesInternal.tableCell, 
                { width: '8%', textAlign: 'right', color: statsInternal.totalBreakageKg > 0 ? '#e11d48' : '#059669' }
              ]}>
                {statsInternal.totalBreakageKg > 0 ? num(statsInternal.totalBreakageKg, 0) : `+${num(Math.abs(statsInternal.totalBreakageKg), 0)}`} KG
              </Text>
              <Text style={[stylesInternal.tableCell, { width: '8%' }]}></Text>
              <Text style={[stylesInternal.tableCell, { width: '8%' }]}></Text>
              <Text style={[stylesInternal.tableCell, { width: '10%' }]}></Text>
              <Text style={[stylesInternal.tableCell, { width: '10%', textAlign: 'right', color: statsInternal.netProfit >= 0 ? '#16a34a' : '#e11d48' }]}> {currency(statsInternal.netProfit)} </Text>
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
        <Page size="A4" style={styles.page}>
          <Text>Modo nao disponivel para esta visualizacao</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermark.imageUrl && String(watermark.imageUrl).toLowerCase() !== 'null' && (
          <Image src={watermark.imageUrl} style={styles.watermark} />
        )}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              {company.logoUrl && String(company.logoUrl).toLowerCase() !== 'null' && (
                <Image src={company.logoUrl} style={styles.logo} />
              )}
            </View>
            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>{company.nomeFantasia}</Text>
              <Text style={styles.companyRazao}>{company.razaoSocial}</Text>
              <View style={styles.companyMetaRow}>
                <Text style={styles.companyMetaText}>CNPJ: {company.cnpj}</Text>
                <Text style={styles.companyMetaText}>{company.cidade}/{company.uf}</Text>
              </View>
              <View style={[styles.companyMetaRow, { marginTop: 2 }]}>
                {company.telefone && (
                  <Text style={styles.companyMetaText}>CONTATO: {company.telefone}</Text>
                )}
                {company.email && (
                  <Text style={styles.companyMetaText}>EMAIL: {company.email.toLowerCase()}</Text>
                )}
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
              <Text style={[styles.footerText, styles.footerAccent]}>{company.nomeFantasia || 'ERP'} Intelligence</Text>
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
