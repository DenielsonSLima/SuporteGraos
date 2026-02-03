
import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { CashierReport } from '../../types';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import CashierPdfDocument from './CashierPdfDocument';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: CashierReport;
  title: string;
}

const CashierPdfPreviewModal: React.FC<Props> = ({ isOpen, onClose, report, title }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const generatePreview = async () => {
      if (isOpen && report) {
        try {
          const blob = await pdf(<CashierPdfDocument report={report} title={title} />).toBlob();
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
  }, [isOpen, report, title]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsGenerating(true);

    const filename = `Fechamento_Caixa_${title.replace(/\s+/g, '_')}.pdf`;

    try {
      const blob = await pdf(<CashierPdfDocument report={report} title={title} />).toBlob();
      saveAs(blob, filename);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert("Ocorreu um erro técnico ao processar o arquivo.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Toolbar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-lg z-20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary-600 rounded-lg text-white">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg">Relatório Consolidado de Caixa</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Pré-visualização A4 Portrait</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleDownload} 
              disabled={isGenerating} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isGenerating ? 'Gerando PDF...' : 'Baixar Arquivo'}
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-4 sm:p-10 flex justify-center bg-slate-400/30">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full bg-white shadow-2xl"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-slate-500" size={48} />
            </div>
          )}
        </div>

        <div className="bg-white border-t border-slate-300 px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center shrink-0">
            PDF Pesquisável • React-PDF v3.x
        </div>
      </div>
    </div>
  );
};

export default CashierPdfPreviewModal;
