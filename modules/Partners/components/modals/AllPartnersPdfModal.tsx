
import React, { useRef, useState } from 'react';
import { X, Download, Loader2, Users } from 'lucide-react';
import AllPartnersSummaryTemplate from '../../templates/AllPartnersSummaryTemplate';
import html2pdf from 'html2pdf.js';
import { Partner } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partners: Partner[];
  balances: Record<string, { credit: number, debit: number, net: number }>;
}

const AllPartnersPdfModal: React.FC<Props> = ({ isOpen, onClose, partners, balances }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!contentRef.current) return;
    setIsGenerating(true);

    const options = {
      margin: 0,
      filename: `Relatorio_Geral_Parceiros_${new Date().toISOString().slice(0,10)}.pdf`,
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
      await new Promise(r => setTimeout(r, 600));
      await html2pdf().set(options).from(contentRef.current).save();
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar relatório.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh]">
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 z-20 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-900/20"><Users size={20} /></div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight italic">Relatório Geral de Parceiros</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-black">Saldos e Posição Financeira Consolidada</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleDownload} 
              disabled={isGenerating} 
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              Exportar Geral
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-10 flex justify-center bg-slate-400/30">
          <div 
            className="bg-white shadow-2xl origin-top transition-transform duration-500 mb-10" 
            style={{ width: '210mm', minHeight: '297mm' }} 
          >
            <div ref={contentRef} style={{ width: '800px', margin: '0 auto', backgroundColor: 'white', position: 'relative' }}>
              <AllPartnersSummaryTemplate partners={partners} balances={balances} />
            </div>
          </div>
        </div>
        
        <div className="bg-white border-t border-slate-300 px-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center shrink-0">
            Mapa de Saldos da Base • Captura de Precisão (800px Viewport)
        </div>
      </div>
    </div>
  );
};

export default AllPartnersPdfModal;
