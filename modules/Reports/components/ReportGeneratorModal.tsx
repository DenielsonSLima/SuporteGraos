
import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Calendar, FileText, Loader2 } from 'lucide-react';
import { getReportById } from '../registry';
import { ReportModule } from '../types';
import UniversalReportTemplate from '../templates/UniversalReportTemplate';
import html2pdf from 'html2pdf.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reportId: string | null;
}

const ReportGeneratorModal: React.FC<Props> = ({ isOpen, onClose, reportId }) => {
  const [reportModule, setReportModule] = useState<ReportModule | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const loadReport = async () => {
      if (!isOpen || !reportId) {
        setReportModule(null);
        return;
      }

      const module = await getReportById(reportId);
      if (isMounted) {
        setReportModule(module || null);
      }
    };

    void loadReport();

    return () => {
      isMounted = false;
    };
  }, [isOpen, reportId]);

  // Set default dates (Current Month)
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
      setReportData(null); // Clear previous data
    }
  }, [isOpen]);

  // Generate Report Data
  useEffect(() => {
    if (isOpen && reportModule) {
      setIsLoading(true);
      // Simulate small delay for UX
      setTimeout(() => {
        const data = reportModule.fetchData({ startDate, endDate });
        setReportData(data);
        setIsLoading(false);
      }, 500);
    }
  }, [isOpen, reportModule, startDate, endDate]);

  if (!isOpen || !reportModule) return null;

  const handleDownload = async () => {
    const content = contentRef.current;
    if (!content) return;

    setIsGenerating(true);

    const options = {
      margin: 0,
      filename: `${reportModule.metadata.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        width: reportData?.landscape ? 1123 : 794,
        windowWidth: reportData?.landscape ? 1123 : 794
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: reportData?.landscape ? 'landscape' : 'portrait', compress: true },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      await new Promise(r => setTimeout(r, 200));
      await html2pdf().set(options).from(content).save();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const TemplateComponent = UniversalReportTemplate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className={`w-full ${reportData?.landscape ? 'max-w-[95vw]' : 'max-w-5xl'} bg-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]`}>
        
        {/* Toolbar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-20">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FileText size={20} />
              {reportModule.metadata.title}
            </h3>
            
            {/* Filters */}
            {reportModule.metadata.needsDateFilter && (
              <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 ml-4">
                <Calendar size={14} className="ml-2 text-slate-400" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-transparent border-none text-xs text-white focus:ring-0" 
                />
                <span className="text-slate-500 text-xs">até</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="bg-transparent border-none text-xs text-white focus:ring-0" 
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleDownload}
              disabled={isLoading || !reportData || isGenerating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm disabled:opacity-50 active:scale-95"
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

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-500/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center text-white">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p>Gerando relatório...</p>
            </div>
          ) : reportData ? (
            <div 
              className="bg-white shadow-2xl origin-top" 
              style={{ 
                width: reportData?.landscape ? '297mm' : '210mm', 
                minHeight: reportData?.landscape ? undefined : '297mm' 
              }} 
            >
              <div ref={contentRef} style={{ width: reportData?.landscape ? '1123px' : '794px', margin: '0 auto', overflow: 'hidden' }}>
                <TemplateComponent data={reportData} />
              </div>
            </div>
          ) : (
            <div className="text-white opacity-50 flex items-center justify-center">
              Erro ao gerar dados.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ReportGeneratorModal;
