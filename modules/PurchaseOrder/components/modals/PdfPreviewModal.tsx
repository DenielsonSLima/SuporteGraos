
import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import { Loading } from '../../../Loadings/types';
import { LoadingCache } from '../../../../services/loadingCache';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import PdfDocument from './PdfDocument';

export type PdfVariant = 'producer' | 'internal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: any; // Aceita PurchaseOrder ou SalesOrder
  variant: PdfVariant;
}

const PdfPreviewModal: React.FC<Props> = ({ isOpen, onClose, order, variant }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadings, setLoadings] = useState<Loading[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && order.id) {
      const isSales = !!(order as any).customerName;
      const list = isSales 
        ? LoadingCache.getBySalesOrder(order.id)
        : LoadingCache.getByPurchaseOrder(order.id);
      setLoadings(list);
    }
  }, [isOpen, order.id]);

  useEffect(() => {
    let url: string | null = null;

    const generatePreview = async () => {
      if (isOpen && loadings.length >= 0) {
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

  const isSalesOrder = !!(order as any).customerName;
  const isLandscape = variant === 'internal';

  const handleDownloadPdf = async () => {
    setIsGenerating(true);

    const prefix = isSalesOrder ? 'Venda' : 'Compra';
    const typeLabel = variant === 'producer' ? (isSalesOrder ? 'Cliente' : 'Produtor') : 'Interno';
    const filename = `${prefix}_${typeLabel}_${order.number}.pdf`;

    try {
      const blob = await pdf(<PdfDocument order={order} loadings={loadings} variant={variant} />).toBlob();
      saveAs(blob, filename);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className={`w-full ${isLandscape ? 'max-w-[95vw]' : 'max-w-5xl'} bg-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]`}>
        
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${variant === 'producer' ? (isSalesOrder ? 'bg-emerald-600' : 'bg-blue-600') : 'bg-slate-700'}`}>
              {variant === 'producer' ? <UserCheck size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <h3 className="font-black text-lg">
                {isSalesOrder 
                    ? (variant === 'producer' ? 'Extrato de Venda (Cliente)' : 'Auditoria de Venda (Interno)') 
                    : (variant === 'producer' ? 'Extrato de Compra (Produtor)' : 'Auditoria de Compra (Interno)')}
              </h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Visualização {isLandscape ? 'Paisagem' : 'Retrato'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleDownloadPdf} disabled={isGenerating} className="flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg">
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Baixar PDF
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-400/20">
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

export default PdfPreviewModal;
