import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './PdfStyles';

interface PdfSummaryProps {
  items: Array<{
    label: string;
    value: string | number;
    isTotal?: boolean;
    highlight?: 'success' | 'danger' | 'warning' | 'positive' | 'negative' | 'neutral';
  }>;
}

export const PdfSummary: React.FC<PdfSummaryProps> = ({ items }) => {
  return (
    <View style={pdfStyles.summaryBox}>
      {items.map((item, idx) => (
        <View key={idx} style={pdfStyles.summaryRow}>
          <Text style={item.isTotal ? pdfStyles.summaryTotal : pdfStyles.summaryLabel}>
            {item.label}
          </Text>
          <Text 
            style={{
              ...(item.isTotal ? pdfStyles.summaryTotal : pdfStyles.summaryValue),
              ...(item.highlight === 'success' || item.highlight === 'positive' ? pdfStyles.textSuccess : {}),
              ...(item.highlight === 'danger' || item.highlight === 'negative' ? pdfStyles.textDanger : {}),
              ...(item.highlight === 'warning' ? pdfStyles.textWarning : {}),
            }}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
};
