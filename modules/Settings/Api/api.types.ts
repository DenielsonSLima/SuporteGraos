/**
 * Tipos locais do submódulo Api/Integrações.
 * Centraliza os tipos de status de serviço usados pelo painel de diagnóstico.
 */

export type StatusType = 'idle' | 'checking' | 'online' | 'offline' | 'degraded';

export interface ServiceStatus {
  id: string;
  name: string;
  type: string;
  status: StatusType;
  latency: number | null;
  message: string;
  icon: any;
  color: string;
}
