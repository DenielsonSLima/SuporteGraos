
import React, { useState } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { pdf, Document, Page } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportId: string;
  reportTitle: string;
  PdfDocument: React.FC<{ data: any }>;
  data: any;
}

import { reportAuditService } from '../../../services/reportAuditService';
import ModalPortal from '../../../components/ui/ModalPortal';

const ReportPdfPreviewModal: React.FC<Props> = ({ isOpen, onClose, reportId, reportTitle, PdfDocument, data }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gerar preview do PDF quando o modal abrir
  React.useEffect(() => {
    if (isOpen && PdfDocument) {
      generatePreview();
    }
    return () => {
      // Limpar URL anterior
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, data, PdfDocument]);

  const generatePreview = async () => {
    setIsLoadingPreview(true);
    setError(null);
    try {
      // Validar dados antes de gerar PDF
      if (!data || typeof data !== 'object') {
        throw new Error('Dados inválidos para gerar PDF');
      }
      
      const blob = await pdf(<PdfDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar visualização');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsGenerating(true);

    const filename = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

    try {
      // Gerar PDF usando React-PDF
      const blob = await pdf(<PdfDocument data={data} />).toBlob();
      
      // Salvar arquivo
      saveAs(blob, filename);

      // Registrar exportação em auditoria
      try {
        const recordsCount = Array.isArray(data?.rows) ? data.rows.length : 0;
        await reportAuditService.logPdfExport(reportId, reportTitle, recordsCount);
      } catch (auditErr) {
      }
    } catch (err) {
      alert("Ocorreu um erro ao gerar o arquivo PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ModalPortal>
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

          <div className="flex-1 overflow-hidden bg-slate-400/20 flex items-center justify-center">
            {isLoadingPreview ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={40} className="animate-spin text-slate-600" />
                <p className="text-sm font-bold text-slate-600">Gerando visualização...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-4 p-6">
                <div className="p-3 bg-red-100 rounded-full">
                  <FileText size={40} className="text-red-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-red-600 mb-2">Erro ao carregar visualização</p>
                  <p className="text-xs text-slate-600">{error}</p>
                </div>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="Visualização do PDF"
              />
            ) : (
              <div className="text-center">
                <p className="text-sm font-bold text-slate-600">Erro ao carregar visualização</p>
              </div>
            )}
          </div>

          <div className="bg-white border-t border-slate-300 px-6 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
              Padrão de Impressão A4 Portrait (210mm x 297mm) • Suporte Grãos ERP
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ReportPdfPreviewModal;
