import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { LoanRecord, FinancialRecord } from '../../types';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import type { Account } from '../../../../services/accountsService';

interface Props {
  loan: LoanRecord;
  history: FinancialRecord[];
  accounts?: Account[];
}

const styles = {
  contractBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    marginBottom: 20,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  contractGrid: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: 16,
    marginBottom: 12,
  },
  contractItem: {
    flex: 1,
  },
  contractLabel: {
    fontSize: 8,
    fontWeight: 'bold' as const,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  contractValue: {
    fontSize: 11,
    fontWeight: 'bold' as const,
    color: '#1e293b',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    color: '#0f172a',
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
    paddingBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: 8,
    fontWeight: 'bold' as const,
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 8,
    fontSize: 9,
    minHeight: 24,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  colDate: { width: '12%' },
  colDesc: { width: '40%' },
  colAccount: { width: '20%' },
  colValue: { width: '16%', textAlign: 'right' as const },
  colSign: { width: '12%', textAlign: 'right' as const },
  summaryBox: {
    backgroundColor: '#1e293b',
    padding: 12,
    marginTop: 20,
    borderRadius: 4,
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: 32,
  },
  summaryItem: {
    alignItems: 'flex-end' as const,
  },
  summaryLabel: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    fontWeight: 'bold' as const,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold' as const,
  },
};

const LoanPdfDocument: React.FC<Props> = ({ loan, history, accounts = [] }) => {
  const currency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  };

  const dateStr = (val: string) => {
    return new Date(val).toLocaleDateString('pt-BR');
  };

  const getBankAccountName = (id?: string) => {
    if (!id) return '-';
    const acc = accounts.find(a => a.id === id);
    return acc?.account_name || id;
  };

  const originalValue = loan.originalValue ?? loan.totalValue;
  const totalPaid = Math.max(0, originalValue - loan.remainingValue);
  const totalPending = loan.remainingValue;

  const totalCredit = history
    .filter(h => h.subType === 'receipt')
    .reduce((acc, h) => acc + (h.paidValue || 0), 0);

  const totalDebit = history
    .filter(h => h.subType !== 'receipt')
    .reduce((acc, h) => acc + (h.paidValue || 0), 0);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        <PdfHeader 
          title="Extrato de Empréstimo" 
          subtitle={`${loan.entityName} - Contrato ${loan.type === 'taken' ? 'Tomado' : 'Concedido'}`} 
        />

        {/* Contract Details */}
        <View style={styles.contractBox}>
          <Text style={styles.sectionTitle}>Dados do Contrato</Text>
          
          <View style={styles.contractGrid}>
            <View style={styles.contractItem}>
              <Text style={styles.contractLabel}>Valor Original</Text>
              <Text style={styles.contractValue}>{currency(originalValue)}</Text>
            </View>
            <View style={styles.contractItem}>
              <Text style={styles.contractLabel}>Valor Pago</Text>
              <Text style={styles.contractValue}>{currency(totalPaid)}</Text>
            </View>
            <View style={styles.contractItem}>
              <Text style={styles.contractLabel}>Valor Pendente</Text>
              <Text style={styles.contractValue}>{currency(totalPending)}</Text>
            </View>
            <View style={styles.contractItem}>
              <Text style={styles.contractLabel}>Status</Text>
              <Text style={styles.contractValue}>{loan.status === 'active' ? 'Ativo' : 'Liquidado'}</Text>
            </View>
          </View>

          <View style={styles.contractGrid}>
            <View style={styles.contractItem}>
              <Text style={styles.contractLabel}>Data Início</Text>
              <Text style={styles.contractValue}>{dateStr(loan.contractDate)}</Text>
            </View>
            <View style={styles.contractItem}>
              <Text style={styles.contractLabel}>Conta Bancária</Text>
              <Text style={styles.contractValue}>{loan.accountName || getBankAccountName(loan.accountId)}</Text>
            </View>
            <View style={styles.contractItem}>
              <Text style={styles.contractLabel}>Tipo</Text>
              <Text style={styles.contractValue}>{loan.type === 'taken' ? 'Tomado' : 'Concedido'}</Text>
            </View>
          </View>
        </View>

        {/* History Table */}
        <View style={pdfStyles.section}>
          <Text style={styles.sectionTitle}>Extrato de Movimentações</Text>
          
          <View>
            <View style={styles.tableHeader}>
              <Text style={styles.colDate}>Data</Text>
              <Text style={styles.colDesc}>Descrição</Text>
              <Text style={styles.colAccount}>Conta</Text>
              <Text style={styles.colSign}>Tipo</Text>
              <Text style={styles.colValue}>Valor</Text>
            </View>

            {history.length === 0 ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic' }}>
                  Nenhuma movimentação registrada
                </Text>
              </View>
            ) : (
              history.map((item, idx) => (
                <View 
                  key={`${idx}`} 
                  style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <Text style={styles.colDate}>{dateStr(item.issueDate)}</Text>
                  <Text style={styles.colDesc}>{item.description}</Text>
                  <Text style={styles.colAccount}>{getBankAccountName(item.bankAccount)}</Text>
                  <Text style={[styles.colSign, { color: item.subType === 'receipt' ? '#10b981' : '#ef4444' }]}>
                    {item.subType === 'receipt' ? '+' : '-'}
                  </Text>
                  <Text style={[styles.colValue, { color: item.subType === 'receipt' ? '#10b981' : '#ef4444' }]}>
                    {currency(item.paidValue || 0)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Créditos</Text>
            <Text style={[styles.summaryValue, { color: '#10b981' }]}>
              {currency(totalCredit)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Débitos</Text>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
              {currency(totalDebit)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Saldo Pendente</Text>
            <Text style={styles.summaryValue}>
              {currency(totalPending)}
            </Text>
          </View>
        </View>

        <PdfFooter />
      </Page>
    </Document>
  );
};

export default LoanPdfDocument;
