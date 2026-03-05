/**
 * useWatermark.ts
 *
 * Hook de dados para marca d'água da empresa.
 *
 * • staleTime 10 min: raramente alterado.
 * • Realtime invalida quando a tabela watermarks mudar.
 * • Para salvar, use settingsService.updateWatermark() e depois
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WATERMARK }).
 */

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { authService } from '../services/authService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { settingsService } from '../services/settingsService';

export interface WatermarkRecord {
  id: string | null;
  imageUrl: string | null;
  opacity: number;
  orientation: 'portrait' | 'landscape';
}

const DEFAULT_WATERMARK: WatermarkRecord = {
  id: null,
  imageUrl: null,
  opacity: 15,
  orientation: 'portrait',
};

async function fetchWatermark(): Promise<WatermarkRecord> {
  const companyId = authService.getCurrentUser()?.companyId;
  if (!companyId) return DEFAULT_WATERMARK;

  const { data, error } = await supabase
    .from('watermarks')
    .select('id, image_url, opacity, orientation')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_WATERMARK;

  return {
    id:          data.id,
    imageUrl:    data.image_url ?? null,
    opacity:     typeof data.opacity === 'number' ? data.opacity : 15,
    orientation: data.orientation === 'landscape' ? 'landscape' : 'portrait',
  };
}

export function useWatermark() {
  // Nota: settingsService já mantém um canal Realtime para 'watermarks'.
  // Aqui usamos staleTime alto (10 min) + invalidação manual pós-save
  // para evitar canal duplicado no WebSocket.

  return useQuery({
    queryKey:        QUERY_KEYS.WATERMARK,
    queryFn:         fetchWatermark,
    staleTime:       STALE_TIMES.STABLE,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateWatermark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<WatermarkRecord, 'id'>) =>
      settingsService.updateWatermark(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WATERMARK });
    },
  });
}
