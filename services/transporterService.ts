/**
 * SERVIÇO DE TRANSPORTADORAS
 * Responsável por CRUD de transportadoras com Realtime Supabase
 */

import { supabase } from './supabase';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';

export interface Transporter {
  id: string;
  name: string;
  document: string;
  phone?: string;
  email?: string;
  active: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

const INITIAL_DATA: Transporter[] = [];
const db = new Persistence<Transporter>('transporters', INITIAL_DATA);

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// CARREGAMENTO
// ============================================================================

const loadFromSupabase = async () => {
  if (isLoaded) return;
  try {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    const { data, error } = await supabase
      .from('transporters')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;
    db.setAll(data || []);

    isLoaded = true;
    console.log('🔄 Transportadoras sincronizando em tempo real...');
  } catch (error) {
    console.error('❌ Erro ao carregar transportadoras:', error);
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:transporters')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transporters' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const existing = db.getById(rec.id);
        if (existing) db.update(rec);
        else db.add(rec);
      } else if (payload.eventType === 'DELETE') {
        db.delete(rec.id);
      }

      console.log(`🔔 Realtime transporters: ${payload.eventType}`);
    })
    .subscribe(status => {
      // Realtime subscribed
    });
};

// Inicializar ao carregar o módulo
// ❌ NÃO inicializar automaticamente - aguardar autenticação
// loadFromSupabase();
// startRealtime();

// ============================================================================
// HELPER
// ============================================================================

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

// ============================================================================
// EXPORT
// ============================================================================

export const transporterService = {
  getAll: (): Transporter[] => db.getAll(),

  getById: (id: string): Transporter | undefined => db.getById(id),

  getActive: (): Transporter[] => db.find(t => t.active),

  add: async (transporter: Omit<Transporter, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();

    // Adiciona no cache com id temporário para UX rápida
    const tempId = crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9);
    const tempTransporter: Transporter = {
      ...transporter,
      id: tempId,
      created_at: now,
      updated_at: now
    };
    db.add(tempTransporter);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Parceiros',
      description: `Cadastrou transportadora: ${transporter.name}`,
      entityId: tempId
    });

    try {
      const user = authService.getCurrentUser();
      const companyId = user?.companyId;

      // Deixa o Supabase gerar o UUID
      const insertPayload = {
        ...transporter,
        company_id: companyId,
        created_at: now,
        updated_at: now
      } as any;
      const { data, error } = await supabase
        .from('transporters')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;

      // Substitui o registro temporário pelo retorno real do Supabase (novo id)
      const savedTransporter: Transporter = data as Transporter;
      db.delete(tempId);
      db.add(savedTransporter);
      console.log(`✅ Transportadora ${transporter.name} salva no Supabase`);
    } catch (error) {
      console.error('❌ Erro ao salvar transportadora:', error);
      db.delete(tempId);
      throw error;
    }
  },

  update: async (transporter: Transporter) => {
    const existing = db.getById(transporter.id);
    db.update(transporter);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'update',
      module: 'Parceiros',
      description: `Atualizou transportadora: ${transporter.name}`,
      entityId: transporter.id
    });

    try {
      const { error } = await supabase
        .from('transporters')
        .update(transporter)
        .eq('id', transporter.id);
      if (error) throw error;
      console.log(`✅ Transportadora ${transporter.name} atualizada no Supabase`);
    } catch (error) {
      console.error('❌ Erro ao atualizar transportadora:', error);
      if (existing) db.update(existing);
      throw error;
    }
  },

  delete: async (id: string) => {
    const transporter = db.getById(id);
    if (!transporter) return;

    console.log('🗑️ [1/3] Deletando transportadora:', id);
    db.delete(id);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Parceiros',
      description: `Deletou transportadora: ${transporter.name}`,
      entityId: id
    });

    try {
      const { error } = await supabase.from('transporters').delete().eq('id', id);
      if (error) throw error;
      console.log('✅ [3/3] Transportadora excluída do Supabase');
    } catch (error) {
      console.error('❌ Erro ao excluir transportadora:', error);
      db.add(transporter);
      throw error;
    }
  },

  reload: () => {
    isLoaded = false;
    return loadFromSupabase();
  },
  loadFromSupabase,
  startRealtime
};
