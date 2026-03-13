import React from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { CashierReport } from '../../types';
import { settingsService } from '../../../../services/settingsService';
import { styles } from './CashierPdfStyles';

interface Props {
  report: CashierReport;
  title: string;
}

const CashierPdfDocument: React.FC<Props> = ({ report, title }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => {
    const cleanValue = Math.abs(val || 0) < 0.01 ? 0 : val || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanValue);
  };

  const formatCNPJ = (value?: string) => {
    if (!value) return 'CNPJ não informado';
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 14) return value;
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value?: string) => {
    if (!value) return 'Contato não informado';
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10) return value;
    return digits.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  const safeText = (value?: string, fallback = '—') => (value && value.trim().length > 0 ? value : fallback);

  const referenceLabel = report.referenceDate
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(report.referenceDate))
    : 'Posição Corrente';

  const emissionDate = report.generatedAt || report.snapshotClosedDate || new Date().toISOString();
  const statusTag = report.isSnapshot ? 'Snapshot Auditável' : report.isClosed ? 'Fechamento Oficial' : 'Execução Dinâmica';
  const documentId = report.id?.toUpperCase() || 'CAIXA-AO-VIVO';
  const operator = report.snapshotClosedBy || `Motor ERP ${company.nomeFantasia || 'Sistema'}`;

  const addressLine = [safeText(company.endereco, ''), safeText(company.numero, '')]
    .filter(Boolean)
    .join(', ') || 'Endereço não informado';
  const cityUfLine = [safeText(company.cidade, ''), safeText(company.uf, '')]
    .filter(Boolean)
    .join(' / ') || 'Cidade / UF não informados';

  const bankPercent = (value: number) => {
    const total = report.totalBankBalance || 0;
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  // Dados para gráficos
  const totalComparison = [
    { label: 'Ativos Totais', value: report.totalAssets, color: '#10b981' },
    { label: 'Passivos Totais', value: report.totalLiabilities, color: '#ef4444' },
  ];
  const maxValue = Math.max(report.totalAssets, report.totalLiabilities, 1);

  const assetsBreakdown = [
    { label: 'Recebíveis Vendas', value: report.pendingSalesReceipts, color: '#10b981' },
    { label: 'Patrimônio Fixo', value: report.totalFixedAssetsValue, color: '#059669' },
    { label: 'Vendas de Bens', value: report.pendingAssetSalesReceipts, color: '#14b8a6' },
    { label: 'Haveres Sócios', value: report.shareholderReceivables, color: '#047857' },
    { label: 'Empréstimos Concedidos', value: report.loansGranted, color: '#065f46' },
    { label: 'Mercadoria Trânsito', value: report.merchandiseInTransitValue, color: '#064e3b' },
    { label: 'Adiant. Concedidos', value: report.advancesGiven, color: '#052e16' },
  ].filter(item => item.value > 0);

  const liabilitiesBreakdown = [
    { label: 'Dívida Fornecedores', value: report.pendingPurchasePayments, color: '#ef4444' },
    { label: 'Fretes a Liquidar', value: report.pendingFreightPayments, color: '#dc2626' },
    { label: 'Comissões a Pagar', value: report.commissionsToPay, color: '#b91c1c' },
    { label: 'Obrigações Sócios', value: report.shareholderPayables, color: '#991b1b' },
    { label: 'Créditos Terceiros', value: report.loansTaken, color: '#7f1d1d' },
    { label: 'Adiant. Recebidos', value: report.advancesTaken, color: '#450a0a' },
  ].filter(item => item.value > 0);

  return (
    <Document>
      {/* PÁGINA 1 - PRINCIPAL */}
      <Page size="A4" style={styles.page}>
        {watermark.imageUrl && (
          <Image src={watermark.imageUrl} style={styles.watermark} />
        )}

        {/* CABEÇALHO COMPLETO */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{safeText(company.razaoSocial, company.nomeFantasia || 'Sistema')}</Text>
              <Text style={styles.companySubtitle}>Fechamento 360º • Caixa & Liquidez</Text>
              <View style={styles.companyDetails}>
                <Text>CNPJ: {formatCNPJ(company.cnpj)}</Text>
                <Text>{addressLine} • {cityUfLine}</Text>
                <Text>{formatPhone(company.telefone)} • {safeText(company.email, 'Email não informado')}</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>RELATÓRIO DE CAIXA</Text>
            <Text style={styles.reportBadge}>{referenceLabel}</Text>
            <Text style={styles.reportMeta}>#{documentId.slice(0, 10)}</Text>
            <Text style={styles.reportMeta}>Emitido: {new Date(emissionDate).toLocaleString('pt-BR')}</Text>
            <Text style={styles.reportMeta}>Responsável: {operator}</Text>
          </View>
        </View>

        {/* METADADOS DO RELATÓRIO */}
        <View style={styles.metadataGrid}>
          <View style={styles.metadataCard}>
            <Text style={styles.metadataLabel}>Período Referência</Text>
            <Text style={styles.metadataValue}>{referenceLabel}</Text>
          </View>
          <View style={styles.metadataCard}>
            <Text style={styles.metadataLabel}>Status Operacional</Text>
            <Text style={styles.metadataValue}>{statusTag}</Text>
          </View>
          <View style={styles.metadataCard}>
            <Text style={styles.metadataLabel}>Responsável Técnico</Text>
            <Text style={styles.metadataValue}>{operator}</Text>
          </View>
          <View style={styles.metadataCard}>
            <Text style={styles.metadataLabel}>Última Atualização</Text>
            <Text style={styles.metadataValue}>{new Date(emissionDate).toLocaleString('pt-BR')}</Text>
          </View>
        </View>

        {/* KPIs PRINCIPAIS */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, styles.kpiCardPrimary]}>
            <Text style={[styles.kpiLabel, { color: '#94a3b8' }]}>Patrimônio Líquido Real</Text>
            <Text style={[styles.kpiValue, { color: report.netBalance >= 0 ? '#86efac' : '#fca5a5' }]}>
              {currency(report.netBalance)}
            </Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }]}>
            <Text style={[styles.kpiLabel, { color: '#64748b' }]}>Disponível em Banco</Text>
            <Text style={[styles.kpiValue, { color: '#0f172a' }]}>{currency(report.totalBankBalance)}</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#86efac', backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.kpiLabel, { color: '#16a34a' }]}>Total de Ativos</Text>
            <Text style={[styles.kpiValue, { color: '#0f172a' }]}>{currency(report.totalAssets)}</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#fca5a5', backgroundColor: '#fef2f2' }]}>
            <Text style={[styles.kpiLabel, { color: '#dc2626' }]}>Total de Passivos</Text>
            <Text style={[styles.kpiValue, { color: '#0f172a' }]}>{currency(report.totalLiabilities)}</Text>
          </View>
          <View style={[styles.kpiCard, { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }]}>
            <Text style={[styles.kpiLabel, { color: '#64748b' }]}>Aporte Inicial</Text>
            <Text style={[styles.kpiValue, { color: '#0f172a' }]}>{currency(report.totalInitialBalance)}</Text>
          </View>
        </View>

        {/* CONTEXTO E ABERTURA */}
        <View style={styles.contextGrid}>
          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>Posição de Abertura do Período</Text>
            {report.initialMonthBalances.length > 0 ? (
              report.initialMonthBalances.slice(0, 6).map((acc, idx) => (
                <View key={idx} style={styles.contextBalance}>
                  <Text style={styles.contextBalanceBank}>{acc.bankName}{acc.owner ? ` (${acc.owner})` : ''}</Text>
                  <Text style={styles.contextBalanceValue}>{currency(acc.value)}</Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 6, color: '#64748b' }}>Sem dados informados para este período.</Text>
            )}
          </View>
          <View style={styles.contextCard}>
            <Text style={styles.contextTitle}>Contexto Operacional</Text>
            <View style={styles.contextRow}>
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>Snapshot?</Text>
                <Text style={styles.contextValue}>{report.isSnapshot ? 'Sim' : 'Não'}</Text>
              </View>
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>Fechado?</Text>
                <Text style={styles.contextValue}>{report.isClosed ? 'Sim' : 'Não'}</Text>
              </View>
            </View>
            <View style={styles.contextRow}>
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>Referência</Text>
                <Text style={styles.contextValue}>{referenceLabel}</Text>
              </View>
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>Documento</Text>
                <Text style={styles.contextValue}>#{documentId.slice(0, 12)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ESPELHO DAS CONTAS BANCÁRIAS */}
        {report.bankBalances?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Espelho das Contas Bancárias</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '60%' }]}>Banco</Text>
                <Text style={[styles.tableHeaderCell, { width: '25%', textAlign: 'right' }]}>Saldo Atual</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Particip.</Text>
              </View>
              {report.bankBalances.map((acc) => (
                <View key={acc.id} style={styles.tableRow}>
                  <Text style={[styles.tableCellBold, { width: '60%', color: '#475569', textTransform: 'uppercase' }]}>
                    {acc.bankName}{acc.owner ? `\n${acc.owner}` : ''}
                  </Text>
                  <Text style={[styles.tableCellBold, { width: '25%', textAlign: 'right', color: '#0f172a' }]}>
                    {currency(acc.balance)}
                  </Text>
                  <Text style={[styles.tableCellBold, { width: '15%', textAlign: 'right', color: '#64748b' }]}>
                    {bankPercent(acc.balance)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* RODAPÉ FIXO */}
        <View style={styles.footer} fixed>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={styles.footerText}>✓ Relatório Validado via Fluxo ERP</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
          </View>
          <Text style={styles.footerText}>Autenticado em {new Date(emissionDate).toLocaleString('pt-BR')}</Text>
        </View>
      </Page>

      {/* PÁGINA 2 - ANÁLISE CONSOLIDADA E GRÁFICOS */}
      <Page size="A4" style={styles.page}>
        {watermark.imageUrl && (
          <Image src={watermark.imageUrl} style={styles.watermark} />
        )}

        {/* Cabeçalho simples página 2 */}
        <View style={{ marginBottom: 16, borderBottom: '1 solid #e2e8f0', paddingBottom: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0f172a' }}>
            Análise Consolidada • {referenceLabel}
          </Text>
          <Text style={{ fontSize: 7, color: '#64748b', marginTop: 2 }}>
            Distribuição patrimonial detalhada e decomposição de ativos/passivos operacionais.
          </Text>
        </View>

        {/* ESPELHO CONSOLIDADO - ATIVOS E PASSIVOS */}
        <View style={{ marginBottom: 12 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Espelho Consolidado do Caixa</Text>
            <Text style={styles.sectionSubtitle}>Referência • {referenceLabel}</Text>
          </View>
          <View style={styles.mirrorGrid}>
            {/* ATIVOS */}
            <View style={styles.mirrorColumn}>
              <Text style={[styles.mirrorTitle, { color: '#059669', borderBottomColor: '#059669' }]}>
                Direitos e Haveres (Ativos)
              </Text>
              <View style={[styles.mirrorItem, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                <Text style={[styles.mirrorLabel, { color: '#16a34a' }]}>Recebíveis Vendas (Grãos)</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.pendingSalesReceipts)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                <Text style={[styles.mirrorLabel, { color: '#16a34a' }]}>Patrimônio (Bens Ativos)</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.totalFixedAssetsValue)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                <Text style={[styles.mirrorLabel, { color: '#16a34a' }]}>Vendas de Bens (a Receber)</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.pendingAssetSalesReceipts)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                <Text style={[styles.mirrorLabel, { color: '#16a34a' }]}>Haveres de Sócios (Débitos)</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.shareholderReceivables)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                <Text style={[styles.mirrorLabel, { color: '#16a34a' }]}>Empréstimos Concedidos</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.loansGranted)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                <Text style={[styles.mirrorLabel, { color: '#16a34a' }]}>Mercadoria em Trânsito</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.merchandiseInTransitValue)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                <Text style={[styles.mirrorLabel, { color: '#16a34a' }]}>Adiantamentos Concedidos</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.advancesGiven)}</Text>
              </View>
              <View style={[styles.mirrorTotal, { backgroundColor: '#10b981' }]}>
                <Text style={styles.mirrorTotalLabel}>Total Ativos Operacionais</Text>
                <Text style={styles.mirrorTotalValue}>{currency(report.totalAssets)}</Text>
              </View>
            </View>

            {/* PASSIVOS */}
            <View style={styles.mirrorColumn}>
              <Text style={[styles.mirrorTitle, { color: '#dc2626', borderBottomColor: '#dc2626' }]}>
                Obrigações e Débitos (Passivos)
              </Text>
              <View style={[styles.mirrorItem, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                <Text style={[styles.mirrorLabel, { color: '#dc2626' }]}>Dívida Fornecedores (Grãos)</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.pendingPurchasePayments)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                <Text style={[styles.mirrorLabel, { color: '#dc2626' }]}>Saldos de Frete a Liquidar</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.pendingFreightPayments)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                <Text style={[styles.mirrorLabel, { color: '#dc2626' }]}>Comissões a Pagar</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.commissionsToPay)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                <Text style={[styles.mirrorLabel, { color: '#dc2626' }]}>Obrigações com Sócios</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.shareholderPayables)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                <Text style={[styles.mirrorLabel, { color: '#dc2626' }]}>Créditos de Terceiros / Emprést.</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.loansTaken)}</Text>
              </View>
              <View style={[styles.mirrorItem, { backgroundColor: '#fef2f2', borderColor: '#fca5a5' }]}>
                <Text style={[styles.mirrorLabel, { color: '#dc2626' }]}>Adiantamentos Recebidos</Text>
                <Text style={[styles.mirrorValue, { color: '#0f172a' }]}>{currency(report.advancesTaken)}</Text>
              </View>
              <View style={[styles.mirrorTotal, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.mirrorTotalLabel}>Total Obrigações</Text>
                <Text style={styles.mirrorTotalValue}>{currency(report.totalLiabilities)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* GRÁFICOS DE DISTRIBUIÇÃO */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Análise Visual de Distribuição Patrimonial</Text>

          <View style={styles.chartGrid}>
            {/* Gráfico 1: Comparativo Ativos vs Passivos */}
            <View style={styles.chartBox}>
              <Text style={styles.chartBoxTitle}>Ativos vs Passivos Totais</Text>
              <View style={styles.chartLegend}>
                {totalComparison.map((item, idx) => (
                  <View key={idx} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                    <Text style={styles.legendValue}>{currency(item.value)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.barChart}>
                {totalComparison.map((item, idx) => (
                  <View key={idx} style={styles.barItem}>
                    <Text style={styles.barLabel}>{item.label}</Text>
                    <View style={styles.barContainer}>
                      <View style={[styles.barFill, {
                        backgroundColor: item.color,
                        width: `${(item.value / maxValue) * 100}%`
                      }]} />
                    </View>
                    <Text style={styles.barValue}>{currency(item.value)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Gráfico 2: Detalhamento dos Ativos */}
            {assetsBreakdown.length > 0 && (
              <View style={styles.chartBox}>
                <Text style={styles.chartBoxTitle}>Composição dos Ativos</Text>
                <View style={styles.chartLegend}>
                  {assetsBreakdown.slice(0, 6).map((item, idx) => (
                    <View key={idx} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                      <Text style={styles.legendLabel}>{item.label}</Text>
                      <Text style={styles.legendValue}>{currency(item.value)}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.barChart}>
                  {assetsBreakdown.slice(0, 6).map((item, idx) => {
                    const maxAsset = Math.max(...assetsBreakdown.map(a => a.value), 1);
                    return (
                      <View key={idx} style={styles.barItem}>
                        <Text style={styles.barLabel}>{item.label}</Text>
                        <View style={styles.barContainer}>
                          <View style={[styles.barFill, {
                            backgroundColor: item.color,
                            width: `${(item.value / maxAsset) * 100}%`
                          }]} />
                        </View>
                        <Text style={styles.barValue}>{currency(item.value)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <View style={styles.chartGrid}>
            {/* Gráfico 3: Detalhamento dos Passivos */}
            {liabilitiesBreakdown.length > 0 && (
              <View style={styles.chartBox}>
                <Text style={styles.chartBoxTitle}>Composição dos Passivos</Text>
                <View style={styles.chartLegend}>
                  {liabilitiesBreakdown.slice(0, 6).map((item, idx) => (
                    <View key={idx} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                      <Text style={styles.legendLabel}>{item.label}</Text>
                      <Text style={styles.legendValue}>{currency(item.value)}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.barChart}>
                  {liabilitiesBreakdown.slice(0, 6).map((item, idx) => {
                    const maxLiability = Math.max(...liabilitiesBreakdown.map(l => l.value), 1);
                    return (
                      <View key={idx} style={styles.barItem}>
                        <Text style={styles.barLabel}>{item.label}</Text>
                        <View style={styles.barContainer}>
                          <View style={[styles.barFill, {
                            backgroundColor: item.color,
                            width: `${(item.value / maxLiability) * 100}%`
                          }]} />
                        </View>
                        <Text style={styles.barValue}>{currency(item.value)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* PATRIMÔNIO LÍQUIDO FINAL */}
        <View style={styles.finalBox}>
          <View style={styles.finalLeft}>
            <Text style={styles.finalTitle}>Patrimônio Líquido Real Projetado</Text>
            <Text style={styles.finalSubtitle}>Sobra estimada após liquidação integral de ativos e passivos operacionais.</Text>
          </View>
          <View style={styles.finalRight}>
            <Text style={styles.finalLabel}>Resultado Líquido Final</Text>
            <Text style={[styles.finalValue, { color: report.netBalance >= 0 ? '#86efac' : '#fca5a5' }]}>
              {currency(report.netBalance)}
            </Text>
          </View>
        </View>

        {/* RODAPÉ FIXO */}
        <View style={styles.footer} fixed>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={styles.footerText}>✓ Relatório Validado via Fluxo ERP</Text>
            <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
          </View>
          <Text style={styles.footerText}>Autenticado em {new Date(emissionDate).toLocaleString('pt-BR')}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default CashierPdfDocument;
