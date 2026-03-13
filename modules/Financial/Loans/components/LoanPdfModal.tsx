
import React, { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { LoanRecord, FinancialRecord } from '../../types';
import LoanPdfDocument from './LoanPdfDocument';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import type { Account } from '../../../../services/accountsService';
import { useAccounts } from '../../../../hooks/useAccounts';
import ModalPortal from '../../../../components/ui/ModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanRecord;
  history: FinancialRecord[];
}

const LoanPdfModal: React.FC<Props> = ({ isOpen, onClose, loan, history }) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);
  const { data: accounts = [] } = useAccounts();

  useEffect(() => {
    if (!isOpen) return;

    const generatePdf = async () => {
      try {
        setIsGenerating(true);
        const blob = await pdf(
          <LoanPdfDocument loan={loan} history={history} accounts={accounts} />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setIsGenerating(false);
      } catch (error) {
        setIsGenerating(false);
      }
    };

    generatePdf();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const filename = `Extrato_Emprestimo_${loan.entityName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const blob = await pdf(
        <LoanPdfDocument loan={loan} history={history} accounts={accounts} />
      ).toBlob();
      saveAs(blob, filename);
    } catch (error) {
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-4xl bg-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
          
          {/* Toolbar */}
          <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-20">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-lg">Visualização de Extrato</h3>
              <div className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-300">
                A4 Retrato
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {isGenerating ? 'Processando...' : 'Baixar PDF'}
              </button>
              <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Preview Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-500/50">
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

        </div>
      </div>
    </ModalPortal>
  );
};

export default LoanPdfModal;
