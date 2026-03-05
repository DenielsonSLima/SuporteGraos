
import React, { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { FinancialRecord } from '../../types';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import FinancialHistoryPdfDocument from './FinancialHistoryPdfDocument';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  records: FinancialRecord[];
  groupBy: 'none' | 'month' | 'entity';
  filters: {
    startDate: string;
    endDate: string;
    category: string;
    bank: string;
  };
}

const FinancialPdfModal: React.FC<Props> = ({ isOpen, onClose, records, groupBy, filters }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const generatePreview = async () => {
      if (isOpen) {
        try {
          const blob = await pdf(
            <FinancialHistoryPdfDocument records={records} groupBy={groupBy} filters={filters} />
          ).toBlob();
          url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } catch (error) {
        }
      }
    };

    generatePreview();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, records, groupBy, filters]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsGenerating(true);
    const filename = `Relatorio_Financeiro_${new Date().toISOString().slice(0, 10)}.pdf`;

    try {
      const blob = await pdf(
        <FinancialHistoryPdfDocument records={records} groupBy={groupBy} filters={filters} />
      ).toBlob();
      saveAs(blob, filename);
    } catch (error) {
      alert('Erro ao gerar arquivo.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-20">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-lg">Visualização de Relatório</h3>
            <div className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-300">
              {records.length} registros selecionados
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Baixar PDF
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-500/50">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full bg-white shadow-2xl rounded-lg"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={48} className="animate-spin text-slate-400" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default FinancialPdfModal;
