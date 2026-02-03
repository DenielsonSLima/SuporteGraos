import React from 'react';
import { Document, Page, View } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfTable, PdfTableColumn } from '../../../../components/pdf/PdfTable';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { GeneratedReportData } from '../../types';

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const columns: PdfTableColumn[] = [
    {
      header: 'Nome / Razão Social',
      width: '40%',
      accessor: 'name',
      align: 'left'
    },
    {
      header: 'Documento',
      width: '20%',
      accessor: 'document',
      align: 'center'
    },
    {
      header: 'Localização',
      width: '25%',
      accessor: 'location',
      align: 'left'
    },
    {
      header: 'Tipo',
      width: '15%',
      accessor: 'typeLabel',
      align: 'center'
    }
  ];

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Marca d'água */}
        <PdfWatermark />

        {/* Cabeçalho profissional com logo e dados da empresa */}
        <PdfHeader
          title={data.title}
          subtitle={data.subtitle}
        />

        <View style={pdfStyles.section}>
          <PdfTable
            columns={columns}
            data={data.rows}
            alternateRows={true}
          />
        </View>

        {/* Rodapé profissional */}
        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
