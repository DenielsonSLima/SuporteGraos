import React, { useMemo } from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
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
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000000',
    backgroundColor: '#ffffff',
  },

  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },

  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 10,
    color: '#555555',
    marginBottom: 10,
  },

  section: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },

  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#000000',
  },

  row: {
    flexDirection: 'row',
    marginBottom: 5,
    justifyContent: 'space-between',
  },

  label: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
    width: '40%',
  },

  value: {
    fontSize: 9,
    color: '#000000',
    width: '60%',
  },

  table: {
    marginBottom: 15,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
    fontSize: 8,
  },

  tableCell: {
    flex: 1,
  },

  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000000',
    fontSize: 8,
    color: '#555555',
    textAlign: 'center',
  },
});

const PdfDocument: React.FC<Props> = ({ order, loadings, variant }) => {
  try {
    const company = settingsService.getCompanyData();

    // Formatadores simples
    const currency = (val: any) => {
      const num = typeof val === 'number' ? val : 0;
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(num);
    };

    const dateStr = (val: any) => {
      if (!val) return '-';
      try {
        if (typeof val === 'string') {
          if (val.includes('T')) {
            return new Date(val).toLocaleDateString('pt-BR');
          }
          const [year, month, day] = val.split('-');
          return `${day}/${month}/${year}`;
        }
        return '-';
      } catch {
        return '-';
      }
    };

    // Stats calculation com proteção
    const stats = useMemo(() => {
      try {
        const loadingsList = Array.isArray(loadings) ? loadings : [];
        const activeLoadings = loadingsList.filter(l => l?.status !== 'canceled');

        let totalWeightKg = 0;
        let totalWeightSc = 0;
        let totalLoadedValue = 0;

        for (const l of activeLoadings) {
          totalWeightKg += Number(l?.weightKg) || 0;
          totalWeightSc += Number(l?.weightSc) || 0;
          totalLoadedValue += Number(l?.totalPurchaseValue) || 0;
        }

        const avgPricePerSc = totalWeightSc > 0 ? totalLoadedValue / totalWeightSc : 0;

        const transactions = Array.isArray(order?.transactions) ? order.transactions : [];
        const payments = transactions.filter(t => t?.type === 'payment' || t?.type === 'advance');
        const expenses = transactions.filter(t => t?.type === 'expense');
        const debitedExpenses = expenses.filter(t => t?.deductFromPartner);

        let totalPaid = 0;
        let totalDebited = 0;

        for (const p of payments) {
          totalPaid += Number(p?.value) || 0;
          totalPaid += Number(p?.discountValue) || 0;
        }

        for (const d of debitedExpenses) {
          totalDebited += Number(d?.value) || 0;
        }

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
          activeLoadings: [],
        };
      }
    }, [order, loadings]);

    // Apenas producer
    if (variant !== 'producer') {
      return (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text>Modo não disponível</Text>
          </Page>
        </Document>
      );
    }

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>PEDIDO DE COMPRA</Text>
            <Text style={styles.subtitle}>
              {company?.nomeFantasia || 'EMPRESA'} - {company?.razaoSocial || ''}
            </Text>
          </View>

          {/* INFORMAÇÕES GERAIS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações do Pedido</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>Número:</Text>
              <Text style={styles.value}>{order?.number || '-'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Data:</Text>
              <Text style={styles.value}>{dateStr(order?.date)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Produtor:</Text>
              <Text style={styles.value}>{order?.partnerName || '-'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Safra:</Text>
              <Text style={styles.value}>{order?.harvest || '-'}</Text>
            </View>
          </View>

          {/* CARREGAMENTOS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Carregamentos (Total: {stats.activeLoadings.length})</Text>

            {stats.activeLoadings.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, { width: '25%' }]}>Data</Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>Motorista</Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>Peso (Sc)</Text>
                  <Text style={[styles.tableCell, { width: '25%' }]}>Valor</Text>
                </View>

                {stats.activeLoadings.map((loading: any, i: number) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {dateStr(loading?.date)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {loading?.driverName || '-'}
                    </Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {Number(loading?.weightSc || 0).toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { width: '25%' }]}>
                      {currency(loading?.totalPurchaseValue)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text>Nenhum carregamento registrado.</Text>
            )}
          </View>

          {/* TOTALIZADORES */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Totalizadores</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Peso Total (Sc):</Text>
              <Text style={styles.value}>{Number(stats.totalWeightSc || 0).toFixed(2)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Peso Total (Kg):</Text>
              <Text style={styles.value}>{Number(stats.totalWeightKg || 0).toFixed(2)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Valor Total Carregado:</Text>
              <Text style={styles.value}>{currency(stats.totalLoadedValue)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Preço Médio (Sc):</Text>
              <Text style={styles.value}>{currency(stats.avgPricePerSc)}</Text>
            </View>
          </View>

          {/* FINANCIAL */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financeiro</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Valor Carregado:</Text>
              <Text style={styles.value}>{currency(stats.totalLoadedValue)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Pagamentos e Antecipações:</Text>
              <Text style={styles.value}>- {currency(stats.totalPaid)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Retenções e Despesas:</Text>
              <Text style={styles.value}>- {currency(stats.totalDebited)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Saldo:</Text>
              <Text style={styles.value}>{currency(stats.balance)}</Text>
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text>Documento gerado pelo ERP Suporte Grãos v1.8</Text>
            <Text>Emitido em {new Date().toLocaleDateString('pt-BR')}</Text>
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
