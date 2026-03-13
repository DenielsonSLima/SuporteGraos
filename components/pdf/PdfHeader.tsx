import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from './PdfStyles';
import { settingsService } from '../../services/settingsService';

interface PdfHeaderProps {
  title: string;
  subtitle?: string;
  date?: string;
  period?: string;
  additionalInfo?: { label: string; value: string }[];
}

export const PdfHeader: React.FC<PdfHeaderProps> = ({
  title,
  subtitle,
  date,
  period,
  additionalInfo
}) => {
  const company = settingsService.getCompanyData();
  const emissionDate = date || new Date().toLocaleString('pt-BR');

  // Formatar CNPJ: XX.XXX.XXX/XXXX-XX
  const formatCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length !== 14) return cnpj;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`;
  };

  // Formatar telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
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
    <View style={pdfStyles.header}>
      {/* Linha superior: Logo + Dados da Empresa | Título do Relatório */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>

        {/* Esquerda: Logo + Empresa */}
        <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
          {/* Logo */}
          <View style={{
            width: 52,
            height: 52,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {company.logoUrl ? (
              <Image src={company.logoUrl} style={{ maxWidth: 50, maxHeight: 50 }} />
            ) : (
              <Text style={{ fontSize: 26, color: '#94a3b8' }}>🌾</Text>
            )}
          </View>

          {/* Dados da Empresa */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1e293b', textTransform: 'uppercase' }}>
              {company.razaoSocial || 'Relatório de Gestão'}
            </Text>
            <View style={{ marginTop: 2, fontSize: 6.5, color: '#475569' }}>
              <Text>CNPJ: {formatCNPJ(company.cnpj)}</Text>
              <Text>{company.endereco}, {company.numero} - {company.bairro}</Text>
              <Text>{company.cidade}/{company.uf}</Text>
              <Text>Tel: {formatPhone(company.telefone)}</Text>
              <Text>E-mail: {company.email}</Text>
            </View>
          </View>
        </View>

        {/* Direita: Título do Relatório */}
        <View style={{ textAlign: 'right', marginLeft: 10 }}>
          <Text style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: '#1e293b',
            textTransform: 'uppercase',
            fontFamily: 'Helvetica-BoldOblique'
          }}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: 7, color: '#475569', marginTop: 2, fontWeight: 'bold' }}>
              {subtitle}
            </Text>
          )}
          <Text style={{ fontSize: 6, color: '#94a3b8', marginTop: 2, textTransform: 'uppercase' }}>
            Emitido: {emissionDate}
          </Text>
        </View>
      </View>

      {/* Informações Adicionais (período, filtros) */}
      {(period || additionalInfo) && (
        <View style={{ marginTop: 4, fontSize: 7, color: '#64748b' }}>
          {period && <Text>Período: {period}</Text>}
          {additionalInfo && additionalInfo.map((info, idx) => (
            <Text key={idx}>{info.label}: {info.value}</Text>
          ))}
        </View>
      )}
    </View>
  );
};
