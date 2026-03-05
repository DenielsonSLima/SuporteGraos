
import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, Loader2, FileText } from 'lucide-react';
import { LoanRecord } from '../../types';
import LoanListPdfDocument from './LoanListPdfDocument';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loans: LoanRecord[];
  tab: 'taken' | 'granted' | 'history' | 'all';
}

const LoanListPdfModal: React.FC<Props> = ({ isOpen, onClose, loans, tab }) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const generatePdf = async () => {
      try {
        setIsGenerating(true);
        const blob = await pdf(
          <LoanListPdfDocument loans={loans} tab={tab} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
      } finally {
        setIsGenerating(false);
      }
    };

    generatePdf();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, loans, tab]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      const labels: Record<string, string> = { all: 'Ativos', taken: 'Tomados', granted: 'Concedidos', history: 'Historico_Geral' };
      const filename = `Relatorio_Emprestimos_${labels[tab]}_${new Date().toISOString().slice(0, 10)}.pdf`;

      const blob = await pdf(
        <LoanListPdfDocument loans={loans} tab={tab} />
      ).toBlob();
      saveAs(blob, filename);
    } catch (err) {
      alert("Erro ao processar o arquivo PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* Toolbar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-lg z-20">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tighter italic">Relatório de Empréstimos</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Pré-visualização A4 Portrait</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleDownloadPdf} 
              disabled={isGenerating} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isGenerating ? 'Processando...' : 'Baixar PDF'}
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-400/30">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={48} className="animate-spin text-slate-700" />
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              className="bg-white shadow-2xl w-full h-full"
              title="PDF Preview"
            />
          )}
        </div>

        <div className="bg-white border-t border-slate-300 px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center shrink-0">
            Impressão Oficial de Auditoria Financeira • Suporte Grãos ERP
        </div>
      </div>
    </div>
  );
};

export default LoanListPdfModal;
