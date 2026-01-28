import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ReportCategory = 'registration' | 'commercial' | 'logistics' | 'financial' | 'analytics';

export interface ReportMetadata {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  icon: LucideIcon;
  needsDateFilter?: boolean;
}

export interface ReportModule {
  metadata: ReportMetadata;
  
  /**
   * Componente React responsável por renderizar os inputs de filtro.
   * Recebe o estado atual dos filtros e uma função para atualizá-los.
   */
  FilterComponent?: React.FC<{ filters: any; onChange: (newFilters: any) => void }>;
  
  /**
   * Estado inicial dos filtros para este relatório
   */
  initialFilters: any;

  /**
   * Função que busca e processa os dados com base nos filtros
   */
  fetchData: (filters: any) => GeneratedReportData;
  
  /**
   * Componente que renderiza o PDF (Layout de impressão)
   */
  Template: React.FC<{ data: GeneratedReportData }>;
}

export interface ReportColumn {
  header: string;
  accessor: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  format?: 'currency' | 'date' | 'number' | 'text';
}

export interface ReportSummaryItem {
  label: string;
  value: number;
  format?: 'currency' | 'number';
}

export interface GeneratedReportData {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: any[];
  summary?: ReportSummaryItem[];
}