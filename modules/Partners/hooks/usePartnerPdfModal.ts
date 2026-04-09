import { useEffect, useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Partner } from '../types';
import { purchaseService } from '../../../services/purchaseService';
import { salesService } from '../../../services/salesService';
import { loadingService } from '../../../services/loadingService';
import { financialIntegrationService } from '../../../services/financialIntegrationService';
import { advanceService } from '../../Financial/Advances/services/advanceService';

interface UsePartnerPdfModalParams {
  isOpen: boolean;
  partner: Partner;
}

export function usePartnerPdfModal({ isOpen, partner }: UsePartnerPdfModalParams) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen && partner) {
        const [purchases, allLoadings] = await Promise.all([
          purchaseService.loadFromSupabase().then(p => p.filter(ptr => ptr.partnerId === partner.id)),
          loadingService.loadFromSupabase()
        ]);
        const sales = salesService.getAll().filter(s => s.customerId === partner.id);
        const loadings = allLoadings.filter(l =>
          l.carrierId === partner.id || l.supplierName === partner.name || l.customerName === partner.name
        );
        const [payables, receivables] = await Promise.all([
          financialIntegrationService.getPayables(),
          financialIntegrationService.getReceivables()
        ]);

        const partnerPayables = payables.filter(r => r.entityName === partner.name);
        const partnerReceivables = receivables.filter(r => r.entityName === partner.name);
        const advances = advanceService.getTransactionsByPartner(partner.id);

        setData({ partner, purchases, sales, loadings, payables: partnerPayables, receivables: partnerReceivables, advances });
      }
    };

    fetchData();
  }, [isOpen, partner]);

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
      await new Promise(r => setTimeout(r, 600));
      await html2pdf().set(options as any).from(contentRef.current).save();
    } catch {
      alert('Erro ao gerar PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    contentRef,
    isGenerating,
    data,
    handleDownload,
  };
}
