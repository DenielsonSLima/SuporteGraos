
import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import { SalesOrder } from '../../types';
import { Loading } from '../../../Loadings/types';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import PdfDocument from './PdfDocument';

type PdfVariant = 'producer' | 'internal'; // Reusing same logic naming: producer=customer, internal=manager

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder;
  loadings: Loading[];
}

const SalesPdfPreviewModal: React.FC<Props> = ({ isOpen, onClose, order, loadings }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [variant, setVariant] = useState<PdfVariant>('producer');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const generatePreview = async () => {
      if (isOpen && order) {
        try {
          const blob = await pdf(<PdfDocument order={order} loadings={loadings} variant={variant} />).toBlob();
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
  }, [isOpen, order, loadings, variant]);

  if (!isOpen) return null;

  const isLandscape = variant === 'internal';

  const handleDownload = async () => {
    setIsGenerating(true);

    const typeLabel = variant === 'producer' ? 'Cliente' : 'Interno';
    const filename = `Venda_${typeLabel}_${order.number}.pdf`;

    try {
      const blob = await pdf(<PdfDocument order={order} loadings={loadings} variant={variant} />).toBlob();
      saveAs(blob, filename);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar arquivo.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className={`w-full ${isLandscape ? 'max-w-[95vw]' : 'max-w-5xl'} bg-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[95vh]`}>
        
        {/* Toolbar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-20 shrink-0">
          <div className="flex items-center gap-4">
             <div className="flex bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setVariant('producer')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${variant === 'producer' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                   <UserCheck size={16} /> Cliente
                </button>
                <button 
                  onClick={() => setVariant('internal')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${variant === 'internal' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                   <ShieldCheck size={16} /> Interno
                </button>
             </div>
             <div>
                <h3 className="font-bold text-lg">Visualização de Venda</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{isLandscape ? 'Paisagem (A4 Landscape)' : 'Retrato (A4 Portrait)'}</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-black uppercase text-xs tracking-widest transition-all shadow-sm disabled:opacity-50 active:scale-95"
            >
              {isGenerating ? (
                <><Loader2 size={18} className="animate-spin" /> Gerando...</>
              ) : (
                <><Download size={18} /> Baixar PDF</>
              )}
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Preview Area (Scrollable) */}
        <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-500/50">
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

export default SalesPdfPreviewModal;
