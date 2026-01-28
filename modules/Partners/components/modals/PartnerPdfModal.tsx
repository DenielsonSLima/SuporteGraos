
import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { Partner } from '../../types';
import PartnerDossierTemplate from '../../templates/PartnerDossierTemplate';
import { purchaseService } from '../../../../services/purchaseService';
import { salesService } from '../../../../services/salesService';
import { loadingService } from '../../../../services/loadingService';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { advanceService } from '../../../Financial/Advances/services/advanceService';
import html2pdf from 'html2pdf.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner;
}

const PartnerPdfModal: React.FC<Props> = ({ isOpen, onClose, partner }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && partner) {
        const purchases = purchaseService.getAll().filter(p => p.partnerId === partner.id);
        const sales = salesService.getAll().filter(s => s.customerId === partner.id);
        const loadings = loadingService.getAll().filter(l => 
            l.carrierId === partner.id || l.supplierName === partner.name || l.customerName === partner.name
        );
        const payables = financialIntegrationService.getPayables().filter(r => r.entityName === partner.name);
        const receivables = financialIntegrationService.getReceivables().filter(r => r.entityName === partner.name);
        const advances = advanceService.getTransactionsByPartner(partner.id);

        setData({ partner, purchases, sales, loadings, payables, receivables, advances });
    }
  }, [isOpen, partner]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!contentRef.current) return;
    setIsGenerating(true);

    const options = {
      margin: 0,
      filename: `Dossie_${partner.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        width: 800,
        windowWidth: 800,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await new Promise(r => setTimeout(r, 600)); // Delay para garantir render de ícones
      await html2pdf().set(options).from(contentRef.current).save();
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh]">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 z-20 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20"><FileText size={20} /></div>
            <div>
              <h3 className="font-black text-lg">Dossiê do Parceiro</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{partner.name}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleDownload} 
              disabled={isGenerating || !data} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Exportar PDF
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-10 flex justify-center bg-slate-400/30">
          {data ? (
            <div 
              className="bg-white shadow-2xl origin-top transition-transform duration-500 mb-10" 
              style={{ width: '210mm', minHeight: '297mm' }} 
            >
              {/* O Container de referência deve ter a largura exata de um A4 em 96DPI para a captura não cortar */}
              <div ref={contentRef} style={{ width: '800px', margin: '0 auto', backgroundColor: 'white', position: 'relative' }}>
                <PartnerDossierTemplate data={data} />
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center text-slate-600 font-black uppercase py-20 gap-4">
                <Loader2 size={48} className="animate-spin text-blue-600" />
                <span>Processando Informações...</span>
             </div>
          )}
        </div>
        
        <div className="bg-white border-t border-slate-300 px-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center shrink-0">
            Visualização em Tamanho Real (A4 Portrait) • Layout 360º de Auditoria
        </div>
      </div>
    </div>
  );
};

export default PartnerPdfModal;
