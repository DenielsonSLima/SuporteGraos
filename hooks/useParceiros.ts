
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { parceirosService } from '../services/parceirosService';
import { QUERY_KEYS } from './queryKeys';
import { Partner, PartnerAddress, Driver, Vehicle } from '../modules/Partners/types';

const STALE_5_MIN = 5 * 60 * 1000;

/**
 * Hook para listagem de parceiros.
 * Inclui realtime para as 4 tabelas do módulo.
 */
export function usePartners(params?: {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    category?: string;
}) {
    const queryClient = useQueryClient();
    const enableRealtimeInDev = String((import.meta as any).env?.VITE_ENABLE_PARTNERS_REALTIME_DEV || '').toLowerCase() === 'true';
    const shouldUseRealtime = !import.meta.env.DEV || enableRealtimeInDev;

    useEffect(() => {
        if (!shouldUseRealtime) {
            return;
        }

        const unsub = parceirosService.subscribeRealtime(() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARTNERS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDRESSES });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DRIVERS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
        });
        return unsub;
    }, [queryClient, shouldUseRealtime]);

    return useQuery({
        queryKey: [...QUERY_KEYS.PARTNERS, params],
        queryFn: () => parceirosService.getPartners(params),
        staleTime: STALE_5_MIN,
        placeholderData: keepPreviousData,
    });
}

/**
 * Hook para endereços de um parceiro específico.
 */
export function usePartnerAddresses(partnerId: string) {
    return useQuery({
        queryKey: [...QUERY_KEYS.ADDRESSES, partnerId],
        queryFn: () => parceirosService.getAddresses(partnerId),
        enabled: !!partnerId,
        staleTime: STALE_5_MIN,
        placeholderData: keepPreviousData,
    });
}

/**
 * Hook para motoristas vinculados a um parceiro (Transportadora).
 */
export function usePartnerDrivers(partnerId: string) {
    return useQuery({
        queryKey: [...QUERY_KEYS.DRIVERS, partnerId],
        queryFn: () => parceirosService.getDrivers(partnerId),
        enabled: !!partnerId,
        staleTime: STALE_5_MIN,
        placeholderData: keepPreviousData,
    });
}

/**
 * Hook para veículos vinculados a um parceiro (Transportadora).
 */
export function usePartnerVehicles(partnerId: string) {
    return useQuery({
        queryKey: [...QUERY_KEYS.VEHICLES, partnerId],
        queryFn: () => parceirosService.getVehicles(partnerId),
        enabled: !!partnerId,
        staleTime: STALE_5_MIN,
        placeholderData: keepPreviousData,
    });
}

// --- MUTATIONS ---

export function useCreatePartner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (partner: Omit<Partner, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) =>
            parceirosService.createPartner(partner),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARTNERS });
        }
    });
}

export function useUpdatePartner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, partner }: { id: string, partner: Partial<Partner> }) =>
            parceirosService.updatePartner(id, partner),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARTNERS });
        }
    });
}

export function useDeletePartner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => parceirosService.deletePartner(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARTNERS });
        }
    });
}

// --- ADDRESS MUTATIONS ---

export function useCreateAddress(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (address: Omit<PartnerAddress, 'id' | 'companyId'>) =>
            parceirosService.createAddress(address),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.ADDRESSES, partnerId] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARTNERS });
        }
    });
}

export function useSavePartnerAddress(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (addressData: any) =>
            parceirosService.savePartnerAddress(partnerId, addressData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.ADDRESSES, partnerId] });
        }
    });
}

export function useUpdateAddress(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, address }: { id: string, address: Partial<PartnerAddress> }) =>
            parceirosService.updateAddress(id, address),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.ADDRESSES, partnerId] });
        }
    });
}

export function useDeleteAddress(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => parceirosService.deleteAddress(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.ADDRESSES, partnerId] });
        }
    });
}

// --- DRIVER MUTATIONS ---

export function useCreateDriver(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (driver: Omit<Driver, 'id' | 'companyId' | 'createdAt'>) =>
            parceirosService.createDriver(driver),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.DRIVERS, partnerId] });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARTNERS }); // Invalida parceiros para atualizar contagens se houver
        }
    });
}

export function useUpdateDriver(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, driver }: { id: string, driver: Partial<Driver> }) =>
            parceirosService.updateDriver(id, driver),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.DRIVERS, partnerId] });
        }
    });
}

export function useDeleteDriver(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => parceirosService.deleteDriver(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.DRIVERS, partnerId] });
        }
    });
}

// --- VEHICLE MUTATIONS ---

export function useCreateVehicle(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vehicle: Omit<Vehicle, 'id' | 'companyId' | 'createdAt'>) =>
            parceirosService.createVehicle(vehicle),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.VEHICLES, partnerId] });
        }
    });
}

export function useUpdateVehicle(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, vehicle }: { id: string, vehicle: Partial<Vehicle> }) =>
            parceirosService.updateVehicle(id, vehicle),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.VEHICLES, partnerId] });
        }
    });
}

export function useDeleteVehicle(partnerId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => parceirosService.deleteVehicle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.VEHICLES, partnerId] });
        }
    });
}
