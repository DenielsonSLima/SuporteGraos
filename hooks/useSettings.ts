
import { useState, useEffect } from 'react';
import { settingsService, CompanyData, WatermarkSettings } from '../services/settingsService';

/**
 * Hook para acessar as configurações da empresa e marca d'água de forma reativa.
 * Sincroniza com o estado interno do settingsService.
 */
export function useSettings() {
    const [company, setCompany] = useState<CompanyData>(settingsService.getCompanyData());
    const [watermark, setWatermark] = useState<WatermarkSettings>(settingsService.getWatermark());
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        // Timeout de segurança para evitar carregamento infinito
        const safetyTimeout = setTimeout(() => {
            if (isMounted) setIsLoaded(true);
        }, 1500);

        const unsubscribeCompany = settingsService.onCompanyChange((data) => {
            if (!isMounted) return;
            setCompany(data);
            
            if (data.razaoSocial || data.nomeFantasia) {
                setIsLoaded(true);
                clearTimeout(safetyTimeout);
            }
        });

        const unsubscribeWatermark = settingsService.onWatermarkChange((data) => {
            if (isMounted) setWatermark(data);
        });

        // Verificação imediata
        const currentData = settingsService.getCompanyData();
        if (currentData.razaoSocial || currentData.nomeFantasia) {
            setIsLoaded(true);
            clearTimeout(safetyTimeout);
        }

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            unsubscribeCompany();
            unsubscribeWatermark();
        };
    }, []);

    // Sanitização de URLs para evitar carregamento infinito em PDFs
    const sanitizedCompany = {
        ...company,
        // Mantém a URL se for truthy e não for a string literal "null"
        logoUrl: (company.logoUrl && String(company.logoUrl).toLowerCase() !== 'null' && String(company.logoUrl).trim() !== '') 
            ? company.logoUrl 
            : null
    };

    const sanitizedWatermark = {
        ...watermark,
        imageUrl: (watermark.imageUrl && String(watermark.imageUrl).toLowerCase() !== 'null' && String(watermark.imageUrl).trim() !== '') 
            ? watermark.imageUrl 
            : null
    };

    // Consideramos carregado se tivermos o nome fantasia ou razão social
    // Adicionamos uma tolerância: se não houver dados, mas o serviço já tentou carregar (id definido), liberamos.
    const hasData = (!!company.razaoSocial && company.razaoSocial.trim().length > 0) || 
                    (!!company.nomeFantasia && company.nomeFantasia.trim().length > 0);

    return {
        company: sanitizedCompany,
        watermark: sanitizedWatermark,
        isLoaded: hasData
    };
}
