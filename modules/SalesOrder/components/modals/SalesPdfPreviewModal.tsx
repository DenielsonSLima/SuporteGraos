
import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import { SalesOrder } from '../../types';
import { Loading } from '../../../Loadings/types';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import PdfDocument from './PdfDocument';
import { useSettings } from '../../../../hooks/useSettings';
import ModalPortal from '../../../../components/ui/ModalPortal';

type PdfVariant = 'producer' | 'internal'; // Reusing same logic naming: producer=customer, internal=manager

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder;
  loadings: Loading[];
  variant: PdfVariant;
}

const SalesPdfPreviewModal: React.FC<Props> = ({ isOpen, onClose, order, loadings, variant }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { company, watermark, isLoaded } = useSettings();
  const [showIframe, setShowIframe] = useState(false);

  useEffect(() => {
    let url: string | null = null;

    const generatePreview = async () => {
      // ✅ SÓ GERA SE AS CONFIGURAÇÕES ESTIVEREM CARREGADAS
      if (isOpen && isLoaded && order) {
        try {
          const blob = await pdf(
            <PdfDocument
              order={order}
              loadings={loadings}
              variant={variant}
              company={company}
              watermark={watermark}
            />
          ).toBlob();
          url = URL.createObjectURL(blob);
          setPdfUrl(url);
          setTimeout(() => setShowIframe(true), 100);
        } catch (error) {
          console.error("Erro ao gerar preview de venda:", error);
        }
      }
    };

    generatePreview();

    return () => {
      if (url) URL.revokeObjectURL(url);
      setShowIframe(false);
    };
  }, [isOpen, order, loadings, variant, company, watermark, isLoaded]);

  if (!isOpen) return null;

  const isLandscape = variant === 'internal';

  const handleDownload = async () => {
    if (!isLoaded) {
      alert("Aguarde o carregamento das configurações da empresa.");
      return;
    }
    setIsGenerating(true);

    const typeLabel = variant === 'producer' ? 'Cliente' : 'Interno';
    const filename = `Venda_${typeLabel}_${order.number}.pdf`;

    try {
      const blob = await pdf(<PdfDocument order={order} loadings={loadings} variant={variant} company={company} watermark={watermark} />).toBlob();
      saveAs(blob, filename);
    } catch (error) {
      alert('Erro ao gerar arquivo.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className={`w-full ${isLandscape ? 'max-w-[95vw]' : 'max-w-5xl'} bg-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[95vh]`}>

          {/* Toolbar */}
          <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-20 shrink-0">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${variant === 'producer' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                {variant === 'producer' ? <UserCheck size={20} /> : <ShieldCheck size={20} />}
              </div>
              <div>
                <h3 className="font-bold text-lg">Visualização de Venda</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{isLandscape ? 'Paisagem (A4 Landscape)' : 'Retrato (A4 Portrait)'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={isGenerating || !isLoaded}
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
            {!isLoaded ? (
              <div className="flex flex-col items-center justify-center gap-4 bg-white/50 w-full h-full rounded-lg">
                <Loader2 size={48} className="animate-spin text-emerald-600" />
                <p className="font-bold text-slate-700">Carregando configurações da empresa...</p>
              </div>
            ) : pdfUrl && showIframe ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0 shadow-2xl rounded-lg bg-white"
                title="PDF Preview"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 bg-white/50 w-full h-full rounded-lg">
                <Loader2 size={48} className="animate-spin text-white" />
                <p className="font-bold text-slate-200 uppercase tracking-widest text-xs">Gerando visualização do PDF...</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </ModalPortal>
  );
};

export default SalesPdfPreviewModal;
