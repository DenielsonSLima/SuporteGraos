
import React, { useState, useEffect } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { Asset } from '../types';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import AssetDossierPdfDocument from './AssetDossierPdfDocument';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  financialHistory: any[];
}

const AssetDossierPdfModal: React.FC<Props> = ({ isOpen, onClose, asset, financialHistory }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const generatePreview = async () => {
      if (isOpen && asset) {
        try {
          const blob = await pdf(<AssetDossierPdfDocument asset={asset} financialHistory={financialHistory} />).toBlob();
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
  }, [isOpen, asset, financialHistory]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    setIsGenerating(true);

    const filename = `Dossie_Patrimonial_${asset.name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

    try {
      const blob = await pdf(<AssetDossierPdfDocument asset={asset} financialHistory={financialHistory} />).toBlob();
      saveAs(blob, filename);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh]">
        
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-lg">Visualização do Dossiê Patrimonial</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Documento Oficial para Conferência</p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleDownloadPdf} 
              disabled={isGenerating} 
              className="flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Baixar Arquivo PDF
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

<div className="flex-1 overflow-auto p-10 flex justify-center bg-slate-500/30">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0 shadow-2xl rounded-lg bg-white"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center">
              <Loader2 size={48} className="animate-spin text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDossierPdfModal;
