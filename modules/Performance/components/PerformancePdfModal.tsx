
import React, { useEffect, useState } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { PerformanceReport } from '../types';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import PerformancePdfDocument from './PerformancePdfDocument';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: PerformanceReport;
  periodLabel: string;
}

const PerformancePdfModal: React.FC<Props> = ({ isOpen, onClose, data, periodLabel }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const generatePreview = async () => {
      if (isOpen && data) {
        try {
          const blob = await pdf(<PerformancePdfDocument data={data} periodLabel={periodLabel} />).toBlob();
          url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } catch (error) {
          console.error('Erro ao gerar preview:', error);
        }
      }
    };

    generatePreview();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, data, periodLabel]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsGenerating(true);

    const filename = `Performance_Analitica_${periodLabel.replace(/\s+/g, '_')}.pdf`;

    try {
      const blob = await pdf(<PerformancePdfDocument data={data} periodLabel={periodLabel} />).toBlob();
      saveAs(blob, filename);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert("Erro ao processar o arquivo PDF analítico.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-[98vw] bg-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Toolbar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-lg z-20">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tighter italic">Exportação Consolidada</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Enquadramento Automático A4 Landscape</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleDownloadPdf} 
              disabled={isGenerating} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isGenerating ? 'Enquadrando Dados...' : 'Gerar PDF Completo'}
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Área de Preview */}
        <div className="flex-1 overflow-auto p-4 flex justify-center bg-slate-400/30">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full bg-white shadow-2xl rounded-lg"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-slate-500" size={48} />
            </div>
          )}
        </div>

        <div className="bg-white border-t border-slate-300 px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
            Relatório Gerencial de Performance • Versão para Impressão e Arquivo
        </div>
      </div>
    </div>
  );
};

export default PerformancePdfModal;
