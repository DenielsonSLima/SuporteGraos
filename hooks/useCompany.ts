/**
 * useCompany.ts
 *
 * Hook de dados para informações da empresa (organization).
 *
 * • staleTime 10 min: raramente alterado.
 * • Realtime invalida quando a tabela companies mudar.
 * • Para salvar, use settingsService.updateCompanyData() e depois
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPANY }).
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { authService } from '../services/authService';
import { settingsService } from '../services/settingsService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export interface CompanyData {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    ie?: string;
    endereco: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    telefone: string;
    email: string;
    site?: string;
    logoUrl: string | null;
}

export const DEFAULT_COMPANY_DATA: CompanyData = {
    razaoSocial: 'Agro Grãos LTDA',
    nomeFantasia: 'Suporte Grãos',
    cnpj: '12.345.678/0001-90',
    ie: '123.456.789',
    endereco: 'Av. das Indústrias',
    numero: '1000',
    bairro: 'Distrito Industrial',
    cidade: 'Sinop',
    uf: 'MT',
    cep: '78550-000',
    telefone: '(66) 3531-0000',
    email: 'financeiro@suportegraos.com',
    site: 'www.suportegraos.com',
    logoUrl: null,
};

async function fetchCompany(): Promise<CompanyData> {
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) throw new Error('Empresa não identificada.');

    const { data, error } = await supabase
        .from('companies')
        .select('razao_social, nome_fantasia, cnpj, ie, endereco, numero, bairro, cidade, uf, cep, telefone, email, website, logo_url')
        .eq('id', companyId)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        // Fallback para os dados do service se não encontrar no banco (raro se autenticado)
        return DEFAULT_COMPANY_DATA;
    }

    return {
        razaoSocial: data.razao_social || '',
        nomeFantasia: data.nome_fantasia || '',
        cnpj: data.cnpj || '',
        ie: data.ie || '',
        endereco: data.endereco || '',
        numero: data.numero || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        uf: data.uf || '',
        cep: data.cep || '',
        telefone: data.telefone || '',
        email: data.email || '',
        site: data.website || '',
        logoUrl: data.logo_url || null,
    };
}

export function useCompany() {
    // Nota: settingsService já mantém um canal Realtime para 'companies'.
    // Aqui usamos staleTime alto (10 min) + invalidação manual pós-save
    // para evitar canal duplicado no WebSocket.

    return useQuery({
        queryKey: QUERY_KEYS.COMPANY,
        queryFn: fetchCompany,
        staleTime: STALE_TIMES.STABLE,
        placeholderData: keepPreviousData,
    });
}

// ─── Mutations ────────────────────────────────────────────────

export function useUpdateCompany() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CompanyData) => settingsService.updateCompanyData(data),
        onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.COMPANY }); },
    });
}
