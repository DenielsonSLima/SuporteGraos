
import React, { useRef, useState } from 'react';
import { X, Download, Loader2, FileText, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
  Template: React.FC<{ data: any }>;
  data: any;
}

import { reportAuditService } from '../../../services/reportAuditService';

const ReportPdfPreviewModal: React.FC<Props> = ({ isOpen, onClose, reportId, reportTitle, Template, data }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setIsGenerating(true);

    const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

    const opt = {
      margin: [5, 5, 5, 5],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1024,
        width: 794 // Largura A4 em pixels (210mm)
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await new Promise(r => setTimeout(r, 300));
      await html2pdf().set(opt).from(contentRef.current).save();
      // Registrar exportação em auditoria
      try {
        const recordsCount = Array.isArray(data?.rows) ? data.rows.length : 0;
        await reportAuditService.logPdfExport(reportId, reportTitle, recordsCount);
      } catch (auditErr) {
        console.warn('⚠️ Falha ao registrar exportação PDF na auditoria:', auditErr);
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert("Ocorreu um erro ao gerar o arquivo PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary-600 rounded-lg text-white">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg">Visualização do Relatório</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">{reportTitle}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleDownloadPdf} 
              disabled={isGenerating} 
              className="flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isGenerating ? 'Gerando...' : 'Baixar PDF'}
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 flex justify-center bg-slate-400/20">
          <div 
            className="bg-white shadow-2xl origin-top transition-all duration-500 overflow-hidden" 
            style={{ width: '210mm', minHeight: '297mm' }} 
          >
            <div ref={contentRef} style={{ width: '794px', margin: '0 auto' }}>
                <Template data={data} />
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-slate-300 px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
            Padrão de Impressão A4 Portrait (210mm x 297mm) • Suporte Grãos ERP
        </div>
      </div>
    </div>
  );
};

export default ReportPdfPreviewModal;
