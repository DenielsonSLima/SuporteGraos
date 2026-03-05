import { supabase } from './supabase';

export interface HealthCheckResult {
  latency: number;
  message: string;
}

export const systemHealthService = {
  checkSupabaseDatabase: async (): Promise<HealthCheckResult> => {
    const startTime = performance.now();

    const { error } = await supabase
      .from('accounts')
      .select('id')
      .limit(1);

    if (error) {
      throw new Error(error.message || 'Falha na conexão com banco');
    }

    return {
      latency: Math.round(performance.now() - startTime),
      message: 'PostgreSQL Operacional'
    };
  },

  checkSupabaseRealtime: async (): Promise<HealthCheckResult> => {
    const startTime = performance.now();
    const channel = supabase.channel(`health_check_${Date.now()}`);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);

        channel
          .on('presence', { event: 'sync' }, () => {
            clearTimeout(timeout);
            resolve();
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              clearTimeout(timeout);
              reject(new Error('Subscription failed'));
            }
          });
      });

      return {
        latency: Math.round(performance.now() - startTime),
        message: 'WebSocket Conectado'
      };
    } finally {
      await supabase.removeChannel(channel);
    }
  }
};
