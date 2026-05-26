import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText, AlertCircle, RefreshCcw } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import PurchaseListPdfDocument from './PurchaseListPdfDocument';
import { useSettings } from '../../../../hooks/useSettings';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { PurchaseOrder } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orders: PurchaseOrder[];
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  selectedShareholder?: string;
}

const PurchaseListPdfModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  orders,
  searchTerm,
  startDate,
  endDate,
  selectedShareholder
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { company, watermark, isLoaded } = useSettings();
  const [showIframe, setShowIframe] = useState(false);

  // ✅ Filtros aplicados para exibir no subtítulo/detalhes
  const subtitleInfo = React.useMemo(() => {
    const parts: string[] = [];
    if (searchTerm) parts.push(`Busca: "${searchTerm}"`);
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início';
      const end = endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Fim';
      parts.push(`Período: ${start} a ${end}`);
    }
    if (selectedShareholder) parts.push(`Sócio: ${selectedShareholder}`);
    return parts.length > 0 ? `Filtros ativos - ${parts.join(' | ')}` : 'Todos os registros ativos';
  }, [searchTerm, startDate, endDate, selectedShareholder]);

  // ✅ Cria chave de atualização única baseada nos IDs dos pedidos e configurações
  const ordersKey = React.useMemo(() => {
    return orders.map(o => `${o.id}_${o.status}`).join(',');
  }, [orders]);

  useEffect(() => {
    let url: string | null = null;
    let isMounted = true;

    const generatePreview = async () => {
      if (isOpen && isLoaded && orders.length > 0) {
        try {
          setError(null);
          if (!pdfUrl) {
            setShowIframe(false);
          }

          const blob = await pdf(
            <PurchaseListPdfDocument
              orders={orders}
              title="Relatório de Pedidos de Compra"
              subtitle={subtitleInfo}
            />
          ).toBlob();

          if (!isMounted) return;

          url = URL.createObjectURL(blob);
          setPdfUrl(url);
          
          if (!showIframe) {
            setTimeout(() => {
              if (isMounted) setShowIframe(true);
            }, 150);
          }
        } catch (err) {
          console.error("Erro ao gerar preview do PDF da lista:", err);
          if (isMounted) {
            setError("Falha na geração do PDF consolidado. Tente recarregar a página.");
          }
        }
      }
    };

    generatePreview();

    return () => {
      isMounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, ordersKey, isLoaded, subtitleInfo, company?.razaoSocial, company?.logoUrl, watermark?.imageUrl]);

  useEffect(() => {
    if (!isOpen) {
      setShowIframe(false);
      setPdfUrl(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    if (!isLoaded) {
      alert("Aguarde o carregamento das configurações da empresa.");
      return;
    }
    setIsGenerating(true);

    const formattedDate = new Date().toLocaleDateString('pt-BR').replace(/\//g, '_');
    const filename = `Relatorio_Pedidos_Compra_${formattedDate}.pdf`;

    try {
      const blob = await pdf(
        <PurchaseListPdfDocument
          orders={orders}
          title="Relatório de Pedidos de Compra"
          subtitle={subtitleInfo}
        />
      ).toBlob();
      saveAs(blob, filename);
    } catch (err) {
      alert("Erro ao gerar PDF para download.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-[95vw] bg-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">

          <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-slate-700 text-white">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-black text-lg">
                  Relatório de Pedidos de Compra (Consolidado)
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Visualização Paisagem (Landscape)</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleDownloadPdf} 
                disabled={isGenerating || !isLoaded || !!error || orders.length === 0} 
                className="flex items-center gap-2 bg-white text-slate-900 px-6 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg"
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Baixar PDF
              </button>
              <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-8 flex justify-center bg-slate-400/20">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 bg-white w-full h-full rounded-lg shadow-inner text-center p-10">
                <AlertCircle size={48} className="text-amber-500" />
                <h4 className="text-lg font-bold text-slate-900 uppercase">Nenhum pedido filtrado</h4>
                <p className="text-slate-500 text-sm max-w-sm">Não há pedidos de compra para listar com os filtros selecionados no momento.</p>
              </div>
            ) : !isLoaded ? (
              <div className="flex flex-col items-center justify-center gap-4 bg-white/50 w-full h-full rounded-lg">
                <Loader2 size={48} className="animate-spin text-primary-600" />
                <p className="font-bold text-slate-700">Carregando configurações da empresa...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-6 bg-white w-full h-full rounded-lg shadow-inner p-10 text-center">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                  <AlertCircle size={40} />
                </div>
                <div className="max-w-md">
                  <h4 className="text-xl font-black text-slate-900 mb-2 uppercase italic">Ops! Algo deu errado</h4>
                  <p className="text-slate-600 text-sm">{error}</p>
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
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
                <Loader2 size={48} className="animate-spin text-slate-600" />
                <p className="font-bold text-slate-700">Gerando visualização do PDF...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default PurchaseListPdfModal;
