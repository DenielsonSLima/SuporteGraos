# 📄 Guia de Migração de Relatórios - HTML para React-PDF

## ✅ O que foi feito

### 1. **Instalação**
- `@react-pdf/renderer` - Biblioteca para gerar PDFs com texto pesquisável
- `file-saver` + `@types/file-saver` - Para download dos arquivos

### 2. **Componentes Base Criados**
Todos em `/components/pdf/`:
- **PdfStyles.ts** - Estilos padronizados (tabelas, cabeçalhos, rodapés, cores)
- **PdfHeader.tsx** - Cabeçalho profissional com logo, dados da empresa e título do relatório
- **PdfTable.tsx** - Tabela reutilizável com colunas configuráveis
- **PdfFooter.tsx** - Rodapé com informações do sistema e paginação automática
- **PdfSummary.tsx** - Box de resumo/totais
- **PdfWatermark.tsx** - Marca d'água centralizada (customizada ou padrão)

### 3. **Modal Migrado**
- `ReportPdfPreviewModal.tsx` - Agora usa React-PDF ao invés de html2canvas
- Preview em iframe nativo do navegador
- Download direto com texto pesquisável

### 4. **Exemplo Completo**
- `modules/Reports/Registration/PartnersList/PdfDocument.tsx` - Primeiro relatório migrado

---

## 🔄 Como Migrar Outros Relatórios

### Passo 1: Criar PdfDocument.tsx

Para cada relatório em `modules/Reports/[Categoria]/[NomeRelatorio]/`, crie um arquivo `PdfDocument.tsx`:

```tsx
import React from 'react';
import { Document, Page, View } from '@react-pdf/renderer';
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
import { PdfHeader } from '../../../../components/pdf/PdfHeader';
import { PdfTable, PdfTableColumn } from '../../../../components/pdf/PdfTable';
import { PdfFooter } from '../../../../components/pdf/PdfFooter';
import { PdfSummary } from '../../../../components/pdf/PdfSummary';
import { PdfWatermark } from '../../../../components/pdf/PdfWatermark';
import { GeneratedReportData } from '../../types';

const PdfDocument: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  // 1. Definir colunas da tabela
  const columns: PdfTableColumn[] = [
    {
      header: 'Coluna 1',
      width: '30%',
      accessor: 'campo1', // Nome do campo em data.rows
      align: 'left'
    },
    {
      header: 'Valor',
      width: '20%',
      align: 'right',
      render: (row) => `R$ ${row.valor.toFixed(2)}` // Formatação customizada
    },
    // ... mais colunas
  ];

  // 2. Preparar dados do resumo (opcional)
  const summaryItems = data.summary?.map(item => ({
    label: item.label,
    value: item.format === 'currency' 
      ? `R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : item.value
  }));

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Marca d'água (logo da empresa em segundo plano) */}
        <PdfWatermark />

        {/* Cabeçalho profissional com logo, dados da empresa e título */}
        <PdfHeader
          title={data.title}
          subtitle={data.subtitle}
          period={data.period} // Se houver filtro de período
        />

        {/* Conteúdo Principal */}
        <View style={pdfStyles.section}>
          <PdfTable
            columns={columns}
            data={data.rows}
            alternateRows={true}
          />
        </View>

        {/* Resumo/Totais (opcional) */}
        {summaryItems && summaryItems.length > 0 && (
          <PdfSummary items={summaryItems} />
        )}

        {/* Rodapé profissional com informações do sistema */}
        <PdfFooter />
      </Page>
    </Document>
  );
};

export default PdfDocument;
```

### Passo 2: Atualizar index.ts do Relatório

No arquivo `index.ts` do relatório:

```typescript
import PdfDocument from './PdfDocument'; // Adicionar esta linha

const seuRelatorio: ReportModule = {
  // ... metadata, filters, fetchData
  Template: Template, // Manter (compatibilidade)
  PdfDocument: PdfDocument // ADICIONAR ESTA LINHA
};
```

### Passo 3: Garantir `subtitle` no fetchData

No `fetchData` do relatório, adicione o campo `subtitle`:

```typescript
fetchData: (filters) => {
  // ... processar dados
  
  return {
    title: 'Nome do Relatório',
    subtitle: `Período: ${filters.startDate} a ${filters.endDate}`, // ADICIONAR
    columns: [...],
    rows: [...],
    summary: [...]
  };
}
```

---

## 📊 Componentes PdfTable - Opções Avançadas

### Formatação Customizada por Coluna

```typescript
const columns: PdfTableColumn[] = [
  {
    header: 'Data',
    width: '15%',
    render: (row) => new Date(row.date).toLocaleDateString('pt-BR')
  },
  {
    header: 'Valor',
    width: '20%',
    align: 'right',
    render: (row) => `R$ ${row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  },
  {
    header: 'Status',
    width: '15%',
    align: 'center',
    render: (row) => row.status === 'paid' ? 'Pago' : 'Pendente'
  }
];
```

### Colunas Condicionais

```typescript
const columns: PdfTableColumn[] = [
  { header: 'Nome', accessor: 'name', width: '40%' },
  // Mostrar coluna apenas se houver dados
  ...(data.rows.some(r => r.discount > 0) ? [{
    header: 'Desconto',
    width: '15%',
    render: (row: any) => `${row.discount}%`
  }] : [])
];
```

---

## 🎨 PdfSummary - Exemplos

### Resumo Financeiro

```tsx
<PdfSummary 
  items={[
    { label: 'Total de Pedidos', value: data.rows.length },
    { label: 'Valor Total', value: `R$ ${totalValue.toFixed(2)}` },
    { label: 'Valor Pago', value: `R$ ${paidValue.toFixed(2)}`, highlight: 'success' },
    { label: 'Saldo Pendente', value: `R$ ${pendingValue.toFixed(2)}`, highlight: 'danger', isTotal: true }
  ]}
/>
```

### Resumo com Destaque

```tsx
const summaryItems = [
  { 
    label: 'Total Recebido', 
    value: `R$ ${totalReceived.toFixed(2)}`, 
    highlight: 'success' as const 
  },
  { 
    label: 'Total Pago', 
    value: `R$ ${totalPaid.toFixed(2)}`, 
    highlight: 'danger' as const 
  },
  { 
    label: 'Lucro Líquido', 
    value: `R$ ${profit.toFixed(2)}`, 
    isTotal: true,
    highlight: profit > 0 ? 'success' as const : 'danger' as const
  }
];
```

---

## 📋 Lista de Relatórios para Migrar

### ✅ Concluídos
- [x] **PartnersList** - Lista Geral de Parceiros

### ⏳ Pendentes (por categoria)

#### Registration
- [ ] PartnerDossier
- [ ] PartnerBalance

#### Commercial
- [ ] SalesHistory
- [ ] PurchasesHistory
- [ ] PartnerPerformance

#### Logistics
- [ ] FreightReport

#### Financial
- [ ] AccountStatement
- [ ] LoansReport
- [ ] AccountBalances
- [ ] DreReport
- [ ] AdvancesReport
- [ ] PayablesReport
- [ ] ShareholdersReport
- [ ] TransfersReport

---

## 🚀 Benefícios da Migração

### Antes (html2canvas)
❌ PDF gerado como imagem  
❌ Texto não pesquisável  
❌ Tamanho de arquivo grande  
❌ Qualidade de impressão ruim  
❌ Impossível copiar/colar texto  
❌ Acessibilidade limitada

### Depois (React-PDF)
✅ PDF com texto real  
✅ Totalmente pesquisável  
✅ Arquivo menor (compressão nativa)  
✅ Qualidade perfeita para impressão  
✅ Copiar/colar funciona  
✅ Acessível (screen readers)

---

## 💡 Dicas

1. **Mantenha Template.tsx**: Não delete os templates antigos, isso garante compatibilidade caso precise voltar

2. **Teste Incrementalmente**: Migre um relatório por vez e teste antes de continuar

3. **Reutilize Estilos**: Use `pdfStyles` ao invés de criar estilos inline

4. **Formatação Consistente**: Use as funções helper para datas/moedas

5. **Preview no Navegador**: O preview é instantâneo no iframe nativo

---

## 🔧 Troubleshooting

### Erro: "Cannot resolve PdfStyles"
**Solução**: Verificar caminho relativo. De `modules/Reports/[Categoria]/[Nome]/`, usar:
```typescript
import { pdfStyles } from '../../../../components/pdf/PdfStyles';
```

### Tabela cortando no meio da página
**Solução**: React-PDF quebra automaticamente, mas pode ajustar com:
```tsx
<View wrap={false}> {/* Não quebrar este bloco */}
  <PdfTable ... />
</View>
```

### Fonte não suportada
**Solução**: React-PDF usa Helvetica por padrão. Para outras fontes, registre:
```typescript
import { Font } from '@react-pdf/renderer';
Font.register({ family: 'Roboto', src: '...' });
```

---

## 📞 Suporte

Se tiver dúvidas durante a migração:
1. Consulte o exemplo completo em `PartnersList/PdfDocument.tsx`
2. Revise a documentação em `/components/pdf/`
3. Use os componentes base sempre que possível (não reinventar)

**Prioridade**: Relatórios mais usados primeiro (SalesHistory, PurchasesHistory, FreightReport)
