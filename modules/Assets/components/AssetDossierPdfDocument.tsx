import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Asset, AssetType } from '../types';
import { settingsService } from '../../../services/settingsService';

interface Props {
  asset: Asset;
  financialHistory: any[];
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
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#0f172a',
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
    borderBottom: 2,
    borderBottomColor: '#1e293b',
    paddingBottom: 15,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 15,
  },
  logo: {
    width: 48,
    height: 48,
  },
  companyInfo: {
    gap: 2,
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  companyDetail: {
    fontSize: 7,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#3b82f6',
    marginTop: 4,
  },
  badge: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#1e293b',
    marginBottom: 8,
    paddingBottom: 3,
    borderBottom: 1,
    borderBottomColor: '#cbd5e1',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoItem: {
    width: '48%',
    marginBottom: 8,
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
    borderBottomColor: '#cbd5e1',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 5,
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
  summaryBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    border: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
  footerBold: {
    fontSize: 7,
    color: '#1e293b',
    fontFamily: 'Helvetica-Bold',
  },
});

const AssetDossierPdfDocument: React.FC<Props> = ({ asset, financialHistory }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const formatDoc = (doc: string) => {
    if (!doc) return '';
    return doc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Em Uso';
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

  const statusColors = getStatusColor(asset.status);
  const totalTransactions = financialHistory.reduce((acc, t) => acc + t.value, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermark.imageUrl && (
          <View style={{ position: 'absolute', top: 120, left: 110, width: 300, height: 300, opacity: 0.03 }}>
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
              <Text style={styles.companyName}>{company.razaoSocial}</Text>
              <Text style={styles.companyDetail}>
                CNPJ: {formatDoc(company.cnpj)} | {company.telefone}
              </Text>
              <Text style={styles.companyDetail}>
                {company.cidade}/{company.uf}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.title}>Dossiê Patrimonial</Text>
            <Text style={styles.subtitle}>{asset.name}</Text>
            <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
              <Text style={{ color: statusColors.text }}>
                {getStatusLabel(asset.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Informações Básicas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Cadastrais</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nome do Ativo</Text>
              <Text style={styles.infoValue}>{asset.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tipo</Text>
              <Text style={styles.infoValue}>{getTypeLabel(asset.type)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Data de Aquisição</Text>
              <Text style={styles.infoValue}>{dateStr(asset.acquisitionDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Valor de Aquisição</Text>
              <Text style={styles.infoValue}>{currency(asset.acquisitionValue)}</Text>
            </View>
            {asset.saleValue && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Valor de Venda</Text>
                <Text style={styles.infoValue}>{currency(asset.saleValue)}</Text>
              </View>
            )}
            {asset.saleDate && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Data de Venda</Text>
                <Text style={styles.infoValue}>{dateStr(asset.saleDate)}</Text>
              </View>
            )}
          </View>
          {asset.description && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.infoLabel}>Descrição</Text>
              <Text style={[styles.infoValue, { fontSize: 8, marginTop: 4 }]}>
                {asset.description}
              </Text>
            </View>
          )}
        </View>

        {/* Histórico Financeiro */}
        {financialHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Histórico Financeiro ({financialHistory.length} transações)
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCellBold, { width: '15%' }]}>Data</Text>
                <Text style={[styles.tableCellBold, { width: '45%' }]}>Descrição</Text>
                <Text style={[styles.tableCellBold, { width: '20%', textAlign: 'right' }]}>Valor</Text>
                <Text style={[styles.tableCellBold, { width: '20%', textAlign: 'right' }]}>Pago</Text>
              </View>
              {financialHistory.map((record) => (
                <View key={record.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '15%' }]}>
                    {dateStr(record.date)}
                  </Text>
                  <Text style={[styles.tableCell, { width: '45%' }]}>
                    {record.description || record.category}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                    {currency(record.value)}
                  </Text>
                  <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                    {currency(record.paidValue || 0)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Movimentado:</Text>
                <Text style={styles.summaryValue}>{currency(totalTransactions)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total de Transações:</Text>
                <Text style={styles.summaryValue}>{financialHistory.length}</Text>
              </View>
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

export default AssetDossierPdfDocument;
