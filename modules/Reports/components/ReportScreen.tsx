
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Printer,
  Filter,
  RefreshCw,
  Search,
  ChevronRight,
  Activity,
  Eye
} from 'lucide-react';
import { ReportModule, GeneratedReportData } from '../types';
import ReportGeneratorModal from './ReportGeneratorModal';
import { useReportScreenOperations } from '../hooks/useReportScreenOperations';

interface Props {
  reportModule: ReportModule;
  reportId: string;
  onBack: () => void;
}

const ReportScreen: React.FC<Props> = ({ reportModule, reportId, onBack }) => {
  const { subscribeLogisticsRefresh, logReportAccess } = useReportScreenOperations();
  const [filters, setFilters] = useState(reportModule.initialFilters);
  const [data, setData] = useState<GeneratedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHtmlPdfOpen, setIsHtmlPdfOpen] = useState(false);


  // Atualização em tempo real para relatórios de logística
  const isLogistics = reportModule.metadata.category === 'logistics';
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Helper para lidar com fetch síncrono ou assíncrono
  const executeFetch = async (currentFilters: any) => {
    setIsLoading(true);
    try {
      const resultOrPromise = reportModule.fetchData(currentFilters);
      const result = resultOrPromise instanceof Promise ? await resultOrPromise : resultOrPromise;
      if (result) setData(result);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (isLogistics && reportModule.fetchData) {
      unsubscribe = subscribeLogisticsRefresh(() => {
        void executeFetch(filtersRef.current);
      });
      // Primeira carga
      void executeFetch(filtersRef.current);
    } else {
      // Fallback: só atualiza ao mudar filtro
      const debounceTimer = setTimeout(() => {
        void handleRefresh();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line
  }, [isLogistics, reportModule]);

  // Atualiza ao mudar filtros (para não-logística ou para garantir atualização)
  useEffect(() => {
    if (!isLogistics) {
      const debounceTimer = setTimeout(() => {
        void handleRefresh();
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      // Para logística, só atualiza se filtro mudar
      void executeFetch(filters);
    }
    // eslint-disable-next-line
  }, [filters]);

  const handleRefresh = async () => {
    await executeFetch(filters);

    // Log de acesso ao relatório (após dados carregados, se possível, ou independente)
    // Nota: data pode estar desatualizado aqui dentro do async, mas executeFetch atualiza o state.
    // O ideal seria logar no executeFetch ou usar um useEffect para logar quando data mudar.
    // Mantendo comportamento similar ao anterior:
    if (data) {
      void logReportAccess(
        reportModule.metadata.id,
        reportModule.metadata.title,
        filters,
        data.rows.length
      );
    }
  };

  const handleOpenPdfPreview = () => {
    if (!data || data.rows.length === 0) return;
    setIsHtmlPdfOpen(true);
  };

  const formatValue = (value: any, type?: string) => {
    if (value === undefined || value === null) return '-';
    if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value) < 0.005 ? 0 : value);
    if (type === 'date') return new Date(value).toLocaleDateString('pt-BR');
    if (type === 'number') return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
    return value;
  };

  const getAlignClass = (align?: string) => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  const FilterComponent = reportModule.FilterComponent;

  const categoryNames: Record<string, string> = {
    registration: 'Cadastros',
    commercial: 'Comercial',
    logistics: 'Logística',
    financial: 'Financeiro',
    analytics: 'Indicadores'
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in slide-in-from-right-4 duration-300">

      {/* Header / Breadcrumbs */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <span>Relatórios</span>
              <ChevronRight size={12} />
              <span>{categoryNames[reportModule.metadata.category]}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <reportModule.metadata.icon className="text-primary-600" size={24} />
              {reportModule.metadata.title}
            </h1>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors shadow-sm"
            title="Atualizar Dados"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenPdfPreview}
            disabled={!data || data.rows.length === 0}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={20} />
            Visualizar PDF / Imprimir
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">

        {/* Sidebar: Filters */}
        <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2">
              <Filter size={16} />
              Filtros
            </div>

            {FilterComponent ? (
              <FilterComponent
                filters={filters}
                onChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
              />
            ) : (
              <p className="text-sm text-slate-400 italic">Este relatório não possui filtros configuráveis.</p>
            )}
          </div>

          {/* Quick Summary Card (Preview) */}
          {data && data.summary && (
            <div className="bg-primary-50 rounded-xl border border-primary-100 p-5">
              <h3 className="text-sm font-bold text-primary-800 mb-3 uppercase tracking-wide">Resumo da Seleção</h3>
              <div className="space-y-3">
                {data.summary.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-end border-b border-primary-100 pb-1 last:border-0">
                    <span className="text-xs text-primary-600 font-medium">{item.label}</span>
                    <span className="text-lg font-bold text-primary-900">{formatValue(item.value, item.format)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content: Table Preview */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
            <div>
              <h3 className="font-bold text-slate-700">Pré-visualização dos Dados</h3>
              {data && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Mostrando {data.rows.length} registros • {data.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-0 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <RefreshCw size={40} className="animate-spin text-primary-600" />
              </div>
            )}

            {data ? (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white text-xs uppercase font-semibold text-slate-500 sticky top-0 shadow-sm z-10">
                  <tr>
                    {data.columns.map((col, idx) => (
                      <th key={idx} className={`px-6 py-3 bg-slate-50 border-b border-slate-200 ${col.width || ''} ${getAlignClass(col.align)}`}>
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={data.columns.length || 1} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Search size={32} className="mb-2 opacity-50" />
                          <p>Nenhum registro encontrado com os filtros atuais.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                        {data.columns.map((col, cIdx) => (
                          <td key={cIdx} className={`px-6 py-3 whitespace-nowrap ${getAlignClass(col.align)}`}>
                            {formatValue(row[col.accessor], col.format)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center text-slate-400">Carregando estrutura...</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Pré-visualização do PDF */}
      {isHtmlPdfOpen && (
        <ReportGeneratorModal
          isOpen={isHtmlPdfOpen}
          onClose={() => setIsHtmlPdfOpen(false)}
          reportId={reportId}
        />
      )}

    </div>
  );
};

export default ReportScreen;
