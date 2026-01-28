
import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { FinancialRecord } from '../../types';
import FinancialHistoryTemplate from '../templates/FinancialHistoryTemplate';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  records: FinancialRecord[];
  groupBy: 'none' | 'month' | 'entity';
  filters: {
    startDate: string;
    endDate: string;
    category: string;
    bank: string;
  };
}

const FinancialPdfModal: React.FC<Props> = ({ isOpen, onClose, records, groupBy, filters }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const content = contentRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório Financeiro</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: A4 portrait; margin: 0; }
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
            </style>
          </head>
          <body>
            ${content.innerHTML}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-20">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-lg">Visualização de Relatório</h3>
            <div className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-300">
              {records.length} registros selecionados
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Printer size={18} /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors text-slate-300 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-500/50">
          <div 
            className="bg-white shadow-2xl transform transition-transform origin-top scale-95" 
            style={{ width: '210mm', minHeight: '297mm' }} 
          >
            <div ref={contentRef}>
              <FinancialHistoryTemplate records={records} groupBy={groupBy} filters={filters} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinancialPdfModal;
