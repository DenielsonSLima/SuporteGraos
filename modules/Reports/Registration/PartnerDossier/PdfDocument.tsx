import React from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { GeneratedReportData } from '../../types';
import { settingsService } from '../../../../services/settingsService';

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const dossier = data.rows[0];
  if (!dossier) return <Document><Page size="A4" style={pdfStyles.page}><Text>Sem dados</Text></Page></Document>;

  const { partner, purchases, sales, loadings, financial } = dossier;
  const company = settingsService.getCompanyData();

  const currency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  const formatCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length !== 14) return cnpj;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
  };

  const formatPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    if (numbers.length === 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return phone;
  };

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfWatermark />
        
        {/* Header customizado - sem quebra de linha */}
        <View style={{ marginBottom: 16, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#1e293b' }}>
          {/* Primeira linha: Logo + Informações da Empresa | Título */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
            {/* Logo + Empresa (lado esquerdo) */}
            <View style={{ width: 300, flexDirection: 'row', gap: 8 }}>
              {/* Logo */}
              <View style={{ 
                width: 52, 
                height: 52, 
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 4,
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0
              }}>
                {company.logoUrl ? (
                  <Image src={company.logoUrl} style={{ maxWidth: 50, maxHeight: 50 }} />
                ) : (
                  <Text style={{ fontSize: 26, color: '#94a3b8' }}>🌾</Text>
                )}
              </View>

              {/* Dados da Empresa - sem flex */}
              <View>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase' }}>
                  {company.razaoSocial}
                </Text>
                <Text style={{ fontSize: 6, color: '#475569', marginTop: 1 }}>
                  CNPJ: {formatCNPJ(company.cnpj)}
                </Text>
                <Text style={{ fontSize: 6, color: '#475569', marginTop: 0.5 }}>
                  {company.endereco}, {company.numero} - {company.bairro}
                </Text>
                <Text style={{ fontSize: 6, color: '#475569', marginTop: 0.5 }}>
                  {company.cidade}/{company.uf}
                </Text>
                <Text style={{ fontSize: 6, color: '#475569', marginTop: 0.5 }}>
                  Tel: {formatPhone(company.telefone)}
                </Text>
                <Text style={{ fontSize: 6, color: '#475569', marginTop: 0.5 }}>
                  E-mail: {company.email}
                </Text>
              </View>
            </View>

            {/* Título do Relatório (lado direito) */}
            <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'flex-start' }}>
              <Text style={{ 
                fontSize: 11, 
                fontWeight: 'bold', 
                color: '#1e293b',
                textTransform: 'uppercase',
                fontFamily: 'Helvetica-BoldOblique'
              }}>
                {data.title}
              </Text>
              {data.subtitle && (
                <Text style={{ fontSize: 6.5, color: '#475569', marginTop: 2, fontWeight: 'bold' }}>
                  {data.subtitle}
                </Text>
              )}
              <Text style={{ fontSize: 5.5, color: '#94a3b8', marginTop: 1 }}>
                Documento gerado em {new Date().toLocaleDateString('pt-BR')}
              </Text>
            </View>
          </View>
        </View>

        {/* Dados Cadastrais */}
        <View style={{ 
          backgroundColor: '#f8fafc', 
          borderWidth: 1, 
          borderColor: '#cbd5e1',
          padding: 8,
          marginBottom: 12
        }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 6, color: '#475569', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 2 }}>
            Dados Cadastrais
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <View>
              <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#64748b' }}>Razão Social / Nome</Text>
              <Text style={{ fontSize: 8, color: '#000000', marginTop: 1 }}>{partner.name}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#64748b' }}>Documento</Text>
              <Text style={{ fontSize: 8, color: '#000000', marginTop: 1, fontFamily: 'Courier' }}>{partner.document}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#64748b' }}>Tipo</Text>
              <Text style={{ fontSize: 8, color: '#000000', marginTop: 1 }}>{partner.type}</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#64748b' }}>Localização</Text>
              <Text style={{ fontSize: 8, color: '#000000', marginTop: 1 }}>{partner.address?.city} / {partner.address?.state}</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 6, fontWeight: 'bold', color: '#64748b' }}>Contato</Text>
              <Text style={{ fontSize: 8, color: '#000000', marginTop: 1 }}>{partner.phone || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Resumo Financeiro */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#a7f3d0', backgroundColor: '#d1fae5', padding: 6, borderRadius: 4 }}>
            <Text style={{ fontSize: 6, textTransform: 'uppercase', fontWeight: 'bold', color: '#065f46' }}>
              Créditos / A Receber
            </Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#059669', marginTop: 2 }}>
              {currency(financial.totalToReceive + financial.advancesGiven)}
            </Text>
            <Text style={{ fontSize: 5.5, color: '#047857', marginTop: 1 }}>
              Inclui Vendas e Adiant. Concedidos
            </Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fee2e2', padding: 6, borderRadius: 4 }}>
            <Text style={{ fontSize: 6, textTransform: 'uppercase', fontWeight: 'bold', color: '#991b1b' }}>
              Débitos / A Pagar
            </Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#dc2626', marginTop: 2 }}>
              {currency(financial.totalToPay + financial.advancesTaken)}
            </Text>
            <Text style={{ fontSize: 5.5, color: '#b91c1c', marginTop: 1 }}>
              Inclui Compras, Fretes e Adiant. Recebidos
            </Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', padding: 6, borderRadius: 4 }}>
            <Text style={{ fontSize: 6, textTransform: 'uppercase', fontWeight: 'bold', color: '#64748b' }}>
              Saldo Líquido Atual
            </Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: financial.netBalance >= 0 ? '#000000' : '#dc2626', marginTop: 2 }}>
              {currency(financial.netBalance)}
            </Text>
            <Text style={{ fontSize: 5.5, color: '#64748b', marginTop: 1 }}>
              {financial.netBalance >= 0 ? 'A favor da empresa' : 'A favor do parceiro'}
            </Text>
          </View>
        </View>

        {/* Histórico de Compras */}
        {purchases.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase', marginBottom: 4 }}>
              Histórico de Compras (Entradas)
            </Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '15%' }}>Data</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '15%' }}>Pedido</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '35%' }}>Produto</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '17.5%', textAlign: 'right' }}>Valor Total</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '17.5%', textAlign: 'right' }}>Pago</Text>
              </View>
              {purchases.slice(0, 10).map((p: any, idx: number) => (
                <View key={idx} style={idx % 2 === 1 ? pdfStyles.tableRowAlt : pdfStyles.tableRow}>
                  <Text style={{ ...pdfStyles.tableCell, width: '15%' }}>{date(p.date)}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '15%' }}>{p.number}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '35%' }}>{p.items[0]?.productName}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '17.5%', textAlign: 'right' }}>{currency(p.totalValue)}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '17.5%', textAlign: 'right', color: '#059669' }}>{currency(p.paidValue)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Histórico de Vendas */}
        {sales.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase', marginBottom: 4 }}>
              Histórico de Vendas (Saídas)
            </Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '15%' }}>Data</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '15%' }}>Pedido</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '35%' }}>Produto</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '17.5%', textAlign: 'right' }}>Valor Total</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '17.5%', textAlign: 'right' }}>Recebido</Text>
              </View>
              {sales.slice(0, 10).map((s: any, idx: number) => (
                <View key={idx} style={idx % 2 === 1 ? pdfStyles.tableRowAlt : pdfStyles.tableRow}>
                  <Text style={{ ...pdfStyles.tableCell, width: '15%' }}>{date(s.date)}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '15%' }}>{s.number}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '35%' }}>{s.productName}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '17.5%', textAlign: 'right' }}>{currency(s.totalValue)}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '17.5%', textAlign: 'right', color: '#059669' }}>{currency(s.paidValue)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Logística */}
        {loadings.length > 0 && (
          <View>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase', marginBottom: 4 }}>
              Movimentações Logísticas
            </Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '15%' }}>Data</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '15%' }}>Placa</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '35%' }}>Rota</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '17.5%', textAlign: 'right' }}>Peso (Kg)</Text>
                <Text style={{ ...pdfStyles.tableCellHeader, width: '17.5%', textAlign: 'right' }}>Valor Carga</Text>
              </View>
              {loadings.slice(0, 8).map((l: any, idx: number) => (
                <View key={idx} style={idx % 2 === 1 ? pdfStyles.tableRowAlt : pdfStyles.tableRow}>
                  <Text style={{ ...pdfStyles.tableCell, width: '15%' }}>{date(l.date)}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '15%' }}>{l.vehiclePlate}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '35%' }}>
                    {l.supplierName.split(' ')[0]} → {l.customerName.split(' ')[0]}
                  </Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '17.5%', textAlign: 'right' }}>{l.weightKg.toLocaleString()}</Text>
                  <Text style={{ ...pdfStyles.tableCell, width: '17.5%', textAlign: 'right' }}>
                    {currency(l.totalPurchaseValue || l.totalSalesValue)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
