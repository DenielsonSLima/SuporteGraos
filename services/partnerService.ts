
import { Partner } from '../modules/Partners/types';
import { PARTNER_CATEGORY_IDS } from '../constants';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { supabase } from './supabase';
import { partnerSupabaseSync } from './partner/supabaseSyncService';
import { locationService } from './locationService';
import { auditService } from './auditService';

// Initial Data - System starts empty
const INITIAL_PARTNERS: Partner[] = [];

// Initialize Persistence (sem localStorage, apenas Supabase + memoria)
const db = new Persistence<Partner>('partners', INITIAL_PARTNERS, { useStorage: false });

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// CARREGAMENTO DO SUPABASE
// ============================================================================

const loadFromSupabase = async () => {
  if (isLoaded) return;
  try {
    // Carrega parceiros
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .order('name');
    if (error) throw error;

    // Carrega endereços (com join para nome da cidade/UF) e monta mapa do endereço principal
    const { data: addresses, error: addrErr } = await supabase
      .from('partner_addresses')
      .select(`*, city:cities(name), state:ufs(uf, name)`) // join para trazer nomes
      .order('is_primary', { ascending: false })
      .order('created_at');
    if (addrErr) throw addrErr;

    const primaryMap: Record<string, any> = {};
    (addresses || []).forEach((a) => {
      // pega o primeiro (is_primary primeiro pela ordenação)
      if (!primaryMap[a.partner_id]) primaryMap[a.partner_id] = a;
    });

    const transformedData = await Promise.all((partners || []).map(async (p) => {
      const partner = transformPartnerFromSupabase(p);
      const addr = primaryMap[p.id];
      if (addr) {
        let cityName = addr.city?.name || '';
        let stateUf = addr.state?.uf || addr.state?.name || '';
        
        // Fallback: se join não trouxe dados, buscar diretamente por ID
        if (!cityName && addr.city_id) {
          cityName = await locationService.getCityNameById(addr.city_id) || '';
        }
        if (!stateUf && addr.state_id) {
          stateUf = await locationService.getStateUfById(addr.state_id) || '';
        }
        
        partner.address = {
          zip: addr.zip_code || '',
          street: addr.street || '',
          number: addr.number || '',
          neighborhood: addr.neighborhood || '',
          city: cityName,
          state: stateUf
        } as any;
      }
      return partner;
    }));

    db.setAll(transformedData);
    isLoaded = true;
    console.log('🔄 Parceiros sincronizando em tempo real...');
  } catch (error) {
    console.error('❌ Erro ao carregar parceiros:', error);
  }
};

// ============================================================================
// REALTIME LISTENERS
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:partners')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      // Converte formato Supabase -> frontend antes de atualizar cache
      const transformed = transformPartnerFromSupabase(rec);

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const existing = db.getById(transformed.id);
        if (existing) db.update(transformed);
        else db.add(transformed);
      } else if (payload.eventType === 'DELETE') {
        db.delete(transformed.id);
      }

    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('❌ Erro no canal Realtime (pode ser RLS)');
      }
    });
};

// Inicializar ao carregar o módulo
loadFromSupabase();
startRealtime();

// ============================================================================
// HELPER
// ============================================================================

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

// ============================================================================
// TRANSFORMAÇÃO DE DADOS: Frontend → Supabase
// ============================================================================

/**
 * Gera UUID compatível com navegador
 */
const generateUUID = (): string => {
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  // Fallback: gera UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Converte Partner do frontend para formato Supabase
 * Frontend: { categories: [], address: {} }
 * Supabase: { partner_type_id: "1" } + endereço em tabela separada
 */
const transformPartnerToSupabase = (frontendPartner: Partner) => {
  const firstCategory = frontendPartner.categories?.[0] || '1'; // Pega primeira categoria como partner_type_id
  const type = frontendPartner.type === 'PF' || frontendPartner.type === 'PJ' ? frontendPartner.type : 'PJ';

  // Gera UUID único se document for "NÃO INFORMADO" (evita violação de UNIQUE constraint)
  const document = frontendPartner.document === 'NÃO INFORMADO' 
    ? `TEMP-${generateUUID()}` 
    : frontendPartner.document;

  return {
    id: frontendPartner.id,
    name: frontendPartner.name,
    nickname: frontendPartner.nickname || null, // ✅ Apelido
    trade_name: frontendPartner.tradeName || null, // ✅ Nome Fantasia
    document,
    type,
    partner_type_id: firstCategory, // Categories[0] → partner_type_id
    email: frontendPartner.email || null,
    phone: frontendPartner.phone || null,
    mobile_phone: null, // Pode estar em outro lugar no form
    website: null,
    notes: null,
    active: frontendPartner.active !== false,
    company_id: null
  };
};

/**
 * Converte Partner do Supabase para formato frontend
 * Supabase: { partner_type_id: "1" }
 * Frontend: { categories: ["1"] }
 */
const transformPartnerFromSupabase = (supabasePartner: any): Partner => {
  // Converte TEMP-{uuid} de volta para "NÃO INFORMADO" na interface
  const document = supabasePartner.document?.startsWith('TEMP-') 
    ? 'NÃO INFORMADO' 
    : supabasePartner.document;

  return {
    id: supabasePartner.id,
    type: supabasePartner.type || 'PJ',
    categories: supabasePartner.partner_type_id ? [supabasePartner.partner_type_id] : [],
    document,
    name: supabasePartner.name,
    nickname: supabasePartner.nickname || undefined, // ✅ Apelido
    tradeName: supabasePartner.trade_name || undefined, // ✅ Nome Fantasia
    email: supabasePartner.email,
    phone: supabasePartner.phone,
    active: supabasePartner.active,
    createdAt: supabasePartner.created_at,
    address: undefined // Seria carregado de partner_addresses se necessário
  };
};

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const partnerService = {
  getAll: () => db.getAll(),
  
  getById: (id: string) => db.getById(id),

  // Atualiza somente o cache local com endereço (sem tocar Supabase)
  setAddressLocal: (partnerId: string, address: Partner['address']) => {
    const existing = db.getById(partnerId);
    if (existing) {
      db.update({ ...existing, address });
    }
  },
  
  // Assinatura reativa de mudanças (usando Persistence.subscribe)
  subscribe: (callback: (items: Partner[]) => void) => db.subscribe(callback),

  add: async (partner: Partner) => {
    // Adiciona no cache com id do frontend para UX rápida
    const originalId = partner.id;
    db.add(partner);

    let transformedSaved: Partner | null = null;
    
    // Log
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Parceiros',
      description: `Cadastrou novo parceiro: ${partner.name}`,
      entityId: partner.id
    });
    
    // Audit Log
    void auditService.logAction('create', 'Parceiros', `Parceiro cadastrado: ${partner.name}`, {
      entityType: 'Partner',
      entityId: partner.id,
      metadata: { category: partner.category, document: partner.document }
    });

    // Transformar para formato Supabase e salvar
    try {
      const supabasePartner = transformPartnerToSupabase(partner);
      delete (supabasePartner as any).id;
      
      const savedPartner = await partnerSupabaseSync.syncInsertPartner(partner, supabasePartner);
      
      // Substitui o registro temporário pelo retorno real do Supabase (novo id)
      transformedSaved = transformPartnerFromSupabase(savedPartner);
      db.delete(originalId);
      db.add(transformedSaved);
      console.log(`✅ Parceiro ${partner.name} salvo no Supabase com id ${transformedSaved.id}`);
    } catch (error) {
      console.error('❌ Erro ao salvar parceiro:', error);
      db.delete(originalId);
      throw error;
    }
    // Retorna o parceiro salvo (com ID real do Supabase)
    return transformedSaved as Partner;
  },

  update: async (updatedPartner: Partner) => {
    const existing = db.getById(updatedPartner.id);
    db.update(updatedPartner);

    // Log
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'update',
      module: 'Parceiros',
      description: `Atualizou dados do parceiro: ${updatedPartner.name}`,
      entityId: updatedPartner.id
    });
    
    // Audit Log
    void auditService.logAction('update', 'Parceiros', `Parceiro atualizado: ${updatedPartner.name}`, {
      entityType: 'Partner',
      entityId: updatedPartner.id,
      metadata: { category: updatedPartner.category }
    });

    // Transformar para formato Supabase e atualizar
    try {
      const supabasePartner = transformPartnerToSupabase(updatedPartner);
      await partnerSupabaseSync.syncUpdatePartner(updatedPartner, supabasePartner);
      console.log(`✅ Parceiro ${updatedPartner.name} atualizado no Supabase`);
    } catch (error) {
      console.error('❌ Erro ao atualizar parceiro:', error);
      if (existing) db.update(existing);
      throw error;
    }
  },

  delete: async (id: string) => {
    const partner = db.getById(id);
    if (!partner) return;

    db.delete(id);

    // Log
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Parceiros',
      description: `Removeu o parceiro: ${partner.name}`,
      entityId: id
    });
    
    // Audit Log
    void auditService.logAction('delete', 'Parceiros', `Parceiro removido: ${partner.name}`, {
      entityType: 'Partner',
      entityId: id,
      metadata: { category: partner.category, document: partner.document }
    });

    // Deletar do Supabase
    try {
      await partnerSupabaseSync.syncDeletePartner(id);
      console.log('✅ Parceiro excluído do Supabase');
    } catch (error) {
      console.error('❌ Erro ao excluir parceiro:', error);
      db.add(partner);
      throw error;
    }
  },

  importData: (data: Partner[]) => db.setAll(data),

  reload: () => {
    isLoaded = false;
    return loadFromSupabase();
  }
};
