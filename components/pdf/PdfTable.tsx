import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './PdfStyles';

export interface PdfTableColumn {
  header: string;
  width?: string | number; // ex: '20%', 100, etc
  align?: 'left' | 'center' | 'right';
  render?: (row: any, index: number) => string | number;
  accessor?: string; // Se não tiver render, usar accessor para pegar o valor
}

interface PdfTableProps {
  columns: PdfTableColumn[];
  data: any[];
  alternateRows?: boolean;
}

export const PdfTable: React.FC<PdfTableProps> = ({ 
  columns, 
  data, 
  alternateRows = true 
}) => {
  const getCellValue = (row: any, column: PdfTableColumn, index: number): string => {
    if (column.render) {
      return String(column.render(row, index));
    }
    if (column.accessor) {
      return String(row[column.accessor] ?? '');
    }
    return '';
  };

  const getCellStyle = (align?: 'left' | 'center' | 'right') => {
    return {
      ...pdfStyles.tableCell,
      ...(align === 'right' ? pdfStyles.textRight : {}),
      ...(align === 'center' ? pdfStyles.textCenter : {}),
    };
  };

  return (
    <View style={pdfStyles.table}>
      {/* Header */}
      <View style={pdfStyles.tableHeader}>
        {columns.map((col, idx) => (
          <Text 
            key={idx} 
            style={{
              ...pdfStyles.tableCellHeader,
              width: col.width || `${100 / columns.length}%`,
              ...(col.align === 'right' ? pdfStyles.textRight : {}),
              ...(col.align === 'center' ? pdfStyles.textCenter : {}),
            }}
          >
            {col.header}
          </Text>
        ))}
      </View>

      {/* Rows */}
      {data.map((row, rowIndex) => (
        <View 
          key={rowIndex} 
          style={alternateRows && rowIndex % 2 === 1 ? pdfStyles.tableRowAlt : pdfStyles.tableRow}
        >
          {columns.map((col, colIndex) => (
            <Text 
              key={colIndex}
              style={{
                ...getCellStyle(col.align),
                width: col.width || `${100 / columns.length}%`,
              }}
            >
              {getCellValue(row, col, rowIndex)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};
