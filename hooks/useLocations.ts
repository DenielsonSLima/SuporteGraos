/**
 * useLocations.ts
 *
 * Hook de dados para estados e cidades.
 *
 * • staleTime 30 min: dados geográficos mudam muito raramente.
 * • Realtime invalida quando qualquer sessão adicionar/remover cidades.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { locationService } from '../services/locationService';
import { QUERY_KEYS } from './queryKeys';

const STALE_30_MIN = 30 * 60 * 1000;

export function useLocations() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = locationService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOCATIONS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey:        QUERY_KEYS.LOCATIONS,
    queryFn:         () => locationService.getAll(),
    staleTime:       STALE_30_MIN,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useAddCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { stateId: string; cityName: string }) =>
      locationService.addCity(params.stateId, params.cityName),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.LOCATIONS }); },
  });
}

export function useRemoveCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { cityId: string; cityName?: string }) =>
      locationService.removeCity(params.cityId, params.cityName),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.LOCATIONS }); },
  });
}
