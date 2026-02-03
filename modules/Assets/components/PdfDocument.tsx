import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Asset, AssetType } from '../types';
import { settingsService } from '../../../services/settingsService';

interface Props {
  assets: Asset[];
  financialRecords: any[];
}

const getTypeLabel = (type: AssetType): string => {
  const labels: Record<AssetType, string> = {
    vehicle: 'Veículo',
    machine: 'Máquina',
    property: 'Imóvel',
    equipment: 'Equipamento',
    other: 'Outro'
  };
  return labels[type] || type;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    opacity: 0.03,
    width: '70%',
    objectFit: 'contain',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: 'contain',
  },
  companyInfo: {
    gap: 3,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1e293b',
  },
  companyDetail: {
    fontSize: 8,
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1e293b',
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1d4ed8',
    marginTop: 6,
    paddingBottom: 3,
    borderBottom: 1,
    borderBottomColor: '#bfdbfe',
  },
  dateGenerated: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginTop: 4,
  },
  dashboard: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  dashCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    border: 1,
  },
  dashCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#0f172a',
  },
  dashLabel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dashValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  dashSubtext: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    marginTop: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#0f172a',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottom: 2,
    borderBottomColor: '#1e293b',
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
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  tableCellBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  statusBadge: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTop: 1,
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

const PdfDocument: React.FC<Props> = ({ assets, financialRecords }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const formatDoc = (doc: string) => {
    if (!doc) return '';
    return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  // Cálculos consolidados
  const activeAssets = assets.filter(a => a.status === 'active');
  const soldAssets = assets.filter(a => a.status === 'sold');
  const offAssets = assets.filter(a => a.status === 'write_off');

  const totalFixedValue = activeAssets.reduce((acc, a) => acc + a.acquisitionValue, 0);
  const totalSalesValue = soldAssets.reduce((acc, a) => acc + (a.saleValue || 0), 0);
  
  const totalReceived = financialRecords
    .filter(r => r.category === 'Venda de Ativo' && r.assetId)
    .reduce((acc, r) => acc + r.paidValue, 0);

  const totalPending = Math.max(0, totalSalesValue - totalReceived);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'sold': return 'Vendido';
      case 'write_off': return 'Baixado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#dcfce7', text: '#166534' };
      case 'sold': return { bg: '#dbeafe', text: '#1e40af' };
      case 'write_off': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        {watermark.imageUrl && (
          <Image src={watermark.imageUrl} style={styles.watermark} />
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logoUrl && (
              <Image src={company.logoUrl} style={styles.logo} />
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.razaoSocial}</Text>
              <Text style={styles.companyDetail}>
                CNPJ: {formatDoc(company.cnpj)} | {company.telefone}
              </Text>
              <Text style={styles.companyDetail}>
                {company.cidade}/{company.uf} - {company.endereco}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.title}>Inventário de Ativos</Text>
            <Text style={styles.subtitle}>Relatório Consolidado de Patrimônio</Text>
            <Text style={styles.dateGenerated}>
              Gerado em: {new Date().toLocaleString('pt-BR')}
            </Text>
          </View>
        </View>

        {/* Dashboard */}
        <View style={styles.dashboard}>
          <View style={[styles.dashCard, styles.dashCardDark]}>
            <Text style={[styles.dashLabel, { color: '#94a3b8' }]}>
              Patrimônio Imobilizado
            </Text>
            <Text style={[styles.dashValue, { color: '#ffffff' }]}>
              {currency(totalFixedValue)}
            </Text>
            <Text style={[styles.dashSubtext, { color: '#64748b' }]}>
              {activeAssets.length} itens em uso
            </Text>
          </View>

          <View style={[styles.dashCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
            <Text style={[styles.dashLabel, { color: '#166534' }]}>
              Total de Vendas
            </Text>
            <Text style={[styles.dashValue, { color: '#14532d' }]}>
              {currency(totalSalesValue)}
            </Text>
            <Text style={[styles.dashSubtext, { color: '#166534' }]}>
              {soldAssets.length} bens alienados
            </Text>
          </View>

          <View style={[styles.dashCard, { backgroundColor: '#dbeafe', borderColor: '#93c5fd' }]}>
            <Text style={[styles.dashLabel, { color: '#1e40af' }]}>
              Total Já Recebido
            </Text>
            <Text style={[styles.dashValue, { color: '#1e3a8a' }]}>
              {currency(totalReceived)}
            </Text>
            <Text style={[styles.dashSubtext, { color: '#1d4ed8' }]}>
              Liquidez Efetiva
            </Text>
          </View>

          <View style={[styles.dashCard, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
            <Text style={[styles.dashLabel, { color: '#991b1b' }]}>
              Saldo a Receber
            </Text>
            <Text style={[styles.dashValue, { color: '#7f1d1d' }]}>
              {currency(totalPending)}
            </Text>
            <Text style={[styles.dashSubtext, { color: '#991b1b' }]}>
              Créditos de Desinvestimento
            </Text>
          </View>
        </View>

        {/* Tabela de Ativos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Relação Completa de Bens e Equipamentos
          </Text>
          
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellBold, { width: '5%' }]}>#</Text>
              <Text style={[styles.tableCellBold, { width: '25%' }]}>Nome</Text>
              <Text style={[styles.tableCellBold, { width: '15%' }]}>Categoria</Text>
              <Text style={[styles.tableCellBold, { width: '12%' }]}>Aquisição</Text>
              <Text style={[styles.tableCellBold, { width: '18%', textAlign: 'right' }]}>Valor</Text>
              <Text style={[styles.tableCellBold, { width: '13%' }]}>Status</Text>
              <Text style={[styles.tableCellBold, { width: '12%', textAlign: 'right' }]}>Depreciação</Text>
            </View>

            {assets.map((asset, idx) => {
              const statusColors = getStatusColor(asset.status);
              return (
                <View key={asset.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '5%' }]}>{idx + 1}</Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>{asset.name}</Text>
                  <Text style={[styles.tableCell, { width: '15%' }]}>{getTypeLabel(asset.type)}</Text>
                  <Text style={[styles.tableCell, { width: '12%' }]}>{dateStr(asset.acquisitionDate)}</Text>
                  <Text style={[styles.tableCell, { width: '18%', textAlign: 'right' }]}>
                    {currency(asset.acquisitionValue)}
                  </Text>
                  <View style={{ width: '13%', flexDirection: 'row' }}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={{ color: statusColors.text }}>
                        {getStatusLabel(asset.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, { width: '12%', textAlign: 'right', color: '#64748b' }]}>
                    -
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

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
