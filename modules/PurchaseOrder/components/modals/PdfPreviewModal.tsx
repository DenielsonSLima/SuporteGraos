
import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import { Loading } from '../../../Loadings/types';
import { LoadingCache } from '../../../../services/loadingCache';

// Purchase Templates (Pastas Organizadas)
import ProducerOrderTemplate from '../../templates/ProducerOrderTemplate';
import InternalOrderTemplate from '../../templates/InternalOrderTemplate';

// Sales Templates (Pastas Organizadas)
import CustomerSalesTemplate from '../../../SalesOrder/templates/CustomerSalesTemplate';
import InternalSalesTemplate from '../../../SalesOrder/templates/InternalSalesTemplate';

import html2pdf from 'html2pdf.js';

export type PdfVariant = 'producer' | 'internal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: any; // Aceita PurchaseOrder ou SalesOrder
  variant: PdfVariant;
}

const PdfPreviewModal: React.FC<Props> = ({ isOpen, onClose, order, variant }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadings, setLoadings] = useState<Loading[]>([]);

  useEffect(() => {
    if (isOpen && order.id) {
      const isSales = !!(order as any).customerName;
      const list = isSales 
        ? LoadingCache.getBySalesOrder(order.id)
        : LoadingCache.getByPurchaseOrder(order.id);
      setLoadings(list);
    }
  }, [isOpen, order.id]);

  if (!isOpen) return null;

  const isSalesOrder = !!(order as any).customerName;
  const isLandscape = variant === 'internal';

  // Dimensões otimizadas para A4 (baseado no CashierPdfPreviewModal)
  // Retrato: 800px largura (~210mm)
  // Paisagem: 1100px largura (~297mm)
  const renderWidth = isLandscape ? 1100 : 800;

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    setIsGenerating(true);

    const prefix = isSalesOrder ? 'Venda' : 'Compra';
    const typeLabel = variant === 'producer' ? (isSalesOrder ? 'Cliente' : 'Produtor') : 'Interno';
    const filename = `${prefix}_${typeLabel}_${order.number}.pdf`;
    const orientation = isLandscape ? 'landscape' : 'portrait';

    const opt = {
      margin: 4, // Margem reduzida para melhor aproveitamento de espaço
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true, 
        scrollX: 0, 
        scrollY: 0,
        windowWidth: renderWidth,
        width: renderWidth,
        backgroundColor: '#ffffff',
        allowTaint: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: orientation, compress: true, precision: 10 },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await new Promise(r => setTimeout(r, 400)); // Delay para garantir renderização
      await html2pdf().set(opt).from(contentRef.current).save();
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Seleciona o template correto
  const renderTemplate = () => {
    if (isSalesOrder) {
        if (variant === 'producer') return <CustomerSalesTemplate order={order} loadings={loadings} />;
        return <InternalSalesTemplate order={order} loadings={loadings} />;
    } else {
        if (variant === 'producer') return <ProducerOrderTemplate order={order} loadings={loadings} />;
        return <InternalOrderTemplate order={order} loadings={loadings} />;
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

        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-400/20">
          <div 
            className="bg-white shadow-2xl origin-top transition-all duration-500 overflow-hidden" 
            style={{ 
                width: isLandscape ? '297mm' : '210mm', 
                minHeight: isLandscape ? '210mm' : '297mm', 
            }}
          >
            <div ref={contentRef} style={{ width: `${renderWidth}px`, margin: '0 auto', backgroundColor: 'white' }}>
                {renderTemplate()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
