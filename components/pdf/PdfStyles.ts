import { StyleSheet } from '@react-pdf/renderer';

export const pdfStyles = StyleSheet.create({
  // Página
  page: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    backgroundColor: '#ffffff',
  },

  // Cabeçalho
  header: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerInfo: {
    marginTop: 8,
    fontSize: 8,
    color: '#475569',
  },

  // Seções
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Tabelas
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1.5,
    borderBottomColor: '#94a3b8',
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontSize: 8,
  },
  tableCell: {
    fontSize: 8,
    color: '#334155',
    paddingRight: 4,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    paddingRight: 4,
  },

  // Rodapé
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 7,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },

  // Utilitários
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  col: {
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  textRight: {
    textAlign: 'right',
  },
  textCenter: {
    textAlign: 'center',
  },
  textPrimary: {
    color: '#1e293b',
  },
  textSecondary: {
    color: '#64748b',
  },
  textSuccess: {
    color: '#059669',
  },
  textDanger: {
    color: '#dc2626',
  },
  textWarning: {
    color: '#d97706',
  },

  // Sumário/Totais
  summaryBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  summaryTotal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1.5,
    borderTopColor: '#94a3b8',
  },

  // Alertas/Badges
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  badgeDanger: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeInfo: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
});
