
import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Loader2, UserCheck, ShieldCheck, AlertCircle, RefreshCcw } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { company, watermark, isLoaded } = useSettings();
  const [showIframe, setShowIframe] = useState(false);

  // ✅ Estabiliza a lista de carregamentos para evitar re-geração se a referência mudar mas o conteúdo não
  const loadingsKey = useMemo(() => {
    return (loadings || []).map(l => l.id).join(',');
  }, [loadings]);

  useEffect(() => {
    let url: string | null = null;
    let isMounted = true;

    const generatePreview = async () => {
      // ✅ SÓ GERA SE AS CONFIGURAÇÕES ESTIVEREM CARREGADAS
      if (isOpen && isLoaded && order) {
        try {
          setError(null);
          
          // Se ainda não temos URL, mostramos o loading. Se for apenas um update, mantemos o anterior até o novo ficar pronto
          if (!pdfUrl) {
            setShowIframe(false);
          }

          const blob = await pdf(
            <PdfDocument
              order={order}
              loadings={loadings}
              variant={variant}
              company={company}
              watermark={watermark}
            />
          ).toBlob();

          if (!isMounted) return;

          url = URL.createObjectURL(blob);
          setPdfUrl(url);
          
          // Pequeno delay para garantir que o blob está disponível para o iframe
          setTimeout(() => {
            if (isMounted) setShowIframe(true);
          }, 150);
        } catch (err) {
          console.error("Erro ao gerar preview de venda:", err);
          if (isMounted) {
            setError("Não foi possível gerar a visualização do PDF. Verifique se há imagens corrompidas ou dados ausentes.");
          }
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, order?.id, loadingsKey, variant, company?.razaoSocial, company?.logoUrl, watermark?.imageUrl, isLoaded]);

  // Limpeza total apenas ao fechar o modal
  useEffect(() => {
    if (!isOpen) {
      setShowIframe(false);
      setPdfUrl(null);
      setError(null);
    }
  }, [isOpen]);

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
      const blob = await pdf(
        <PdfDocument 
          order={order} 
          loadings={loadings} 
          variant={variant} 
          company={company} 
          watermark={watermark} 
        />
      ).toBlob();
      saveAs(blob, filename);
    } catch (err) {
      alert('Erro ao gerar arquivo para download.');
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
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownload}
                disabled={isGenerating || !isLoaded || !!error}
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
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-6 bg-white w-full h-full rounded-lg shadow-inner p-10 text-center">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                  <AlertCircle size={40} />
                </div>
                <div className="max-w-md">
                  <h4 className="text-xl font-black text-slate-900 mb-2 uppercase italic">Ops! Algo deu errado</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">{error}</p>
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
                >
                  <RefreshCcw size={18} /> Recarregar Sistema
                </button>
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
