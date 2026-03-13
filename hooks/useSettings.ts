
import { useState, useEffect } from 'react';
import { settingsService, CompanyData, WatermarkSettings } from '../services/settingsService';

/**
 * Hook para acessar as configurações da empresa e marca d'água de forma reativa.
 * Sincroniza com o estado interno do settingsService.
 */
export function useSettings() {
    const [company, setCompany] = useState<CompanyData>(settingsService.getCompanyData());
    const [watermark, setWatermark] = useState<WatermarkSettings>(settingsService.getWatermark());

    useEffect(() => {
        // Subscreve para mudanças na empresa
        const unsubscribeCompany = settingsService.onCompanyChange((data) => {
            setCompany(data);
        });

        // Subscreve para mudanças na marca d'água
        const unsubscribeWatermark = settingsService.onWatermarkChange((data) => {
            setWatermark(data);
        });

        return () => {
            unsubscribeCompany();
            unsubscribeWatermark();
        };
    }, []);

    return {
        company,
        watermark,
        isLoaded: !!company.razaoSocial && company.razaoSocial.length > 0
    };
}
