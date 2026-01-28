
import React, { useRef, useState } from 'react';
import { X, Download, Loader2, FileText, Printer } from 'lucide-react';
import { CashierReport } from '../../types';
import CashierReportTemplate from '../../templates/CashierReportTemplate';
import html2pdf from 'html2pdf.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  report: CashierReport;
  title: string;
}

const CashierPdfPreviewModal: React.FC<Props> = ({ isOpen, onClose, report, title }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    const content = contentRef.current;
    if (!content) return;

    setIsGenerating(true);

    // Configuração otimizada para A4 sem quebra de fontes
    const options = {
      margin: 8,
      filename: `Fechamento_Caixa_${title.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 800, // Largura padrão para match com template
        width: 800,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await new Promise(r => setTimeout(r, 400));
      await html2pdf().set(options).from(content).save();
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

        {/* Área de Preview com Scale dinâmico para evitar scroll horizontal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 flex justify-center bg-slate-400/30">
          <div 
            className="bg-white shadow-2xl origin-top transition-all duration-500 overflow-hidden sm:scale-100 scale-75" 
            style={{ width: '210mm', minHeight: '297mm' }} 
          >
            <div ref={contentRef} style={{ width: '800px', margin: '0 auto', backgroundColor: 'white' }}>
              <CashierReportTemplate report={report} title={title} />
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-slate-300 px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center shrink-0">
            Impressão Oficial v1.8 • Proporções de página garantidas para Papel A4
        </div>
      </div>
    </div>
  );
};

export default CashierPdfPreviewModal;
