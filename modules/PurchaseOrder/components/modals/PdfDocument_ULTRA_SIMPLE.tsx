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
  },
  
  title: {
    fontSize: 18,
    marginBottom: 10,
  },
  
  text: {
    fontSize: 10,
    marginBottom: 5,
  },
});

const PdfDocument: React.FC<Props> = ({ order, loadings, variant }) => {
  if (variant !== 'producer') {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.text}>Modo não disponível</Text>
        </Page>
      </Document>
    );
  }

  const stats = useMemo(() => {
    const validLoadings = Array.isArray(loadings) ? loadings : [];
    const activeLoadings = validLoadings.filter(l => l?.status !== 'canceled');
    
    let totalWeightSc = 0;
    let totalLoadedValue = 0;
    
    for (const l of activeLoadings) {
      totalWeightSc += Number(l?.weightSc) || 0;
      totalLoadedValue += Number(l?.totalPurchaseValue) || 0;
    }

    return {
      totalWeightSc,
      totalLoadedValue,
      activeLoadings,
    };
  }, [loadings]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>PEDIDO #{order?.number}</Text>
        
        <Text style={styles.text}>Produtor: {order?.partnerName}</Text>
        <Text style={styles.text}>Data: {order?.date}</Text>
        
        <Text style={styles.text}>---</Text>
        <Text style={styles.text}>Carregamentos: {stats.activeLoadings.length}</Text>
        <Text style={styles.text}>Total SC: {Number(stats.totalWeightSc).toFixed(2)}</Text>
        <Text style={styles.text}>Total Valor: R$ {Number(stats.totalLoadedValue).toFixed(2)}</Text>
      </Page>
    </Document>
  );
};

export default PdfDocument;
