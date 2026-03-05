
import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { Asset } from '../types';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import PdfDocument from './PdfDocument';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  financialRecords: any[];
}

const AssetListPdfModal: React.FC<Props> = ({ isOpen, onClose, assets, financialRecords }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const generatePreview = async () => {
      if (isOpen && assets.length > 0) {
        try {
          const blob = await pdf(<PdfDocument assets={assets} financialRecords={financialRecords} />).toBlob();
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
  }, [isOpen, assets, financialRecords]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsGenerating(true);

    const filename = `Inventario_Patrimonial_Consolidado_${new Date().toISOString().slice(0, 10)}.pdf`;

    try {
      const blob = await pdf(<PdfDocument assets={assets} financialRecords={financialRecords} />).toBlob();
      saveAs(blob, filename);
    } catch (err) {
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh]">
        
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-600 rounded-lg text-white">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg">Inventário Consolidado</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total de {assets.length} ativos selecionados</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleDownloadPdf} 
              disabled={isGenerating} 
              className="flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Gerar PDF
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-10 flex justify-center bg-slate-300/30">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0 shadow-2xl rounded-lg bg-white"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center">
              <Loader2 size={48} className="animate-spin text-slate-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetListPdfModal;

