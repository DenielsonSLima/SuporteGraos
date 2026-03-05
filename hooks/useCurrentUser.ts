/**
 * useCurrentUser.ts
 *
 * Hook leve para acessar o usuário autenticado sincronamente.
 * Evita que componentes .tsx importem authService diretamente (Skill 9.5).
 *
 * Para dados COMPLETOS do perfil (app_users), use useProfile().
 * Este hook retorna apenas o cache local do authService.
 */

import { useSyncExternalStore } from 'react';
import { authService } from '../services/authService';

type CurrentUser = ReturnType<typeof authService.getCurrentUser>;

let lastRawSnapshot: string | null = null;
let lastParsedSnapshot: CurrentUser = null;

const getSnapshot = (): CurrentUser => {
  const raw = sessionStorage.getItem('sg_user');

  if (raw === lastRawSnapshot) {
    return lastParsedSnapshot;
  }

  lastRawSnapshot = raw;
  lastParsedSnapshot = authService.getCurrentUser();

  return lastParsedSnapshot;
};
const getServerSnapshot = (): CurrentUser => null;
const subscribe = (_cb: () => void): (() => void) => {
  // authService não emite eventos; re-render ocorre via Supabase onAuthStateChange
  // que já atualiza todo o app. Aqui é apenas leitura síncrona.
  return () => {};
};

/**
 * Retorna o usuário autenticado atual (leitura de cache síncrona).
 * Equivale a `authService.getCurrentUser()` mas sem importar services no .tsx.
 */
export function useCurrentUser() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
