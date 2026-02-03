import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './PdfStyles';
import { settingsService } from '../../services/settingsService';

interface PdfFooterProps {
  text?: string;
  pageNumber?: boolean;
}

export const PdfFooter: React.FC<PdfFooterProps> = ({ 
  text = 'Sistema ERP Suporte Grãos • Gestão Comercial e Logística',
  pageNumber = true
}) => {
  const company = settingsService.getCompanyData();

  return (
    <View style={pdfStyles.footer} fixed>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
        <Text style={pdfStyles.footerText}>{text}</Text>
        <Text style={pdfStyles.footerText}>{company.nomeFantasia}</Text>
      </View>
      {pageNumber && (
        <Text style={{ ...pdfStyles.footerText, textAlign: 'center', marginTop: 2 }}>
          Página <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </Text>
      )}
    </View>
  );
};
