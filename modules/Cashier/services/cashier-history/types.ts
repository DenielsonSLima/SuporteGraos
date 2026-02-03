/**
 * 📊 Tipos para Histórico e Snapshots de Caixa
 * 
 * MonthlyReport: Relatório calculado retroativamente (sem persistência)
 * MonthlySnapshot: Snapshot manual congelado (salvo em BD para auditoria)
 */

import { CashierReport } from '../types';

export interface MonthlyReport extends CashierReport {
  /** Mês/ano: "2026-01" */
  monthKey: string;
  
  /** Descrição: "Janeiro de 2026" */
  monthLabel: string;
  
  /** Data de geração do relatório */
  generatedAt: string; // ISO Date
  
  /** É um snapshot congelado (vs. retroativo calculado) */
  isSnapshot?: boolean;
  
  /** Data de fechamento do snapshot (quando foi finalizado) */
  snapshotClosedDate?: string; // ISO Date
  
  /** Usuário que finalizou o snapshot */
  snapshotClosedBy?: string;
}

export interface MonthlySnapshot {
  /** ID único: "snap-2026-01" */
  id: string;
  
  /** Mês: "2026-01" */
  monthKey: string;
  
  /** Data de fechamento */
  closedDate: string; // ISO Date (sempre 1º do próximo mês or manual date)
  
  /** Quem finalizou */
  closedBy: string; // email/nome do usuário
  
  /** Snapshot congelado do relatório */
  report: MonthlyReport;
  
  /** Notas do fechamento */
  notes?: string;
  
  /** Timestamp de criação */
  createdAt: string; // ISO Date
  
  /** Timestamp de última atualização */
  updatedAt: string; // ISO Date
}

export interface HistoryFilters {
  /** Filtrar por ano: 2026 */
  year?: number;
  
  /** Filtrar por mês (1-12) */
  month?: number;
  
  /** Apenas snapshots (vs. todos retroativos + snapshots) */
  snapshotsOnly?: boolean;
}

export interface HistoryListItem {
  /** "2026-01" */
  monthKey: string;
  
  /** "Janeiro de 2026" */
  label: string;
  
  /** Relatório (retroativo ou snapshot) */
  report: MonthlyReport;
  
  /** Tem snapshot finalizado? */
  hasSnapshot: boolean;
  
  /** Saldo final do mês */
  finalBalance: number;
  
  /** Total de movimentações no mês */
  transactionCount: number;
}
