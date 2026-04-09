import { Asset } from '../modules/Assets/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { supabase } from './supabase';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from './sqlCanonicalOps';

const INITIAL_ASSETS: Asset[] = [];
const db = new Persistence<Asset>('company_assets', INITIAL_ASSETS);

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

// ============================================================================
// MAPEAMENTO SUPABASE <-> FRONTEND
// ============================================================================

const mapAssetToDb = (asset: Asset) => ({
  id: asset.id,
  name: asset.name,
  asset_type: asset.type,
  description: asset.description || null,
  acquisition_date: asset.acquisitionDate,
  acquisition_value: asset.acquisitionValue,
  origin: asset.origin,
  origin_description: asset.originDescription || null,
  status: asset.status,
  sale_date: asset.saleDate || null,
  sale_value: asset.saleValue || null,
  paid_value: asset.paidValue || 0,
  buyer_name: asset.buyerName || null,
  buyer_id: asset.buyerId || null,
  write_off_date: asset.writeOffDate || null,
  write_off_reason: asset.writeOffReason || null,
  write_off_notes: asset.writeOffNotes || null,
  identifier: asset.identifier || null,
  metadata: asset
});

const mapAssetFromDb = (row: any): Asset => {
  const meta: Asset | undefined = row?.metadata;
  const base: Asset = meta ? { ...meta } : {
    id: row?.id,
    name: row?.name || '',
    type: row?.asset_type || 'other',
    description: row?.description || undefined,
    acquisitionDate: row?.acquisition_date || '',
    acquisitionValue: Number(row?.acquisition_value) || 0,
    origin: row?.origin || 'purchase',
    originDescription: row?.origin_description || undefined,
    status: row?.status || 'active',
    saleDate: row?.sale_date || undefined,
    saleValue: Number(row?.sale_value) || undefined,
    paidValue: Number(row?.paid_value) || 0,
    buyerName: row?.buyer_name || undefined,
    buyerId: row?.buyer_id || undefined,
    writeOffDate: row?.write_off_date || undefined,
    writeOffReason: row?.write_off_reason || undefined,
    writeOffNotes: row?.write_off_notes || undefined,
    identifier: row?.identifier || undefined
  };

  return {
    ...base,
    id: row?.id ?? base.id,
    status: row?.status ?? base.status
  };
};

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async () => {
  if (isLoaded) return;

  try {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return;
    }

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('company_id', companyId)
      .order('acquisition_date', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapAssetFromDb);
    db.setAll(mapped);
    isLoaded = true;
  } catch (error) {
    console.error('[assetService] loadFromSupabase:', error);
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:assets')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const mapped = mapAssetFromDb(rec);
        const existing = db.getById(mapped.id);
        if (existing) db.update(mapped);
        else db.add(mapped);
      } else if (payload.eventType === 'DELETE') {
        db.delete(rec.id);
      }

    })
    .subscribe();
};

const subscribeRealtime = (callback: () => void) => {
  const companyId = authService.getCurrentUser()?.companyId;

  const channel = supabase
    .channel('realtime:assets:service')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'assets' },
      (payload: any) => {
        const changedCompanyId = payload?.new?.company_id ?? payload?.old?.company_id;
        if (!companyId || !changedCompanyId || changedCompanyId === companyId) {
          callback();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ============================================================================
// PERSISTÊNCIA SUPABASE
// ============================================================================

const persistUpsert = async (asset: Asset) => {
  try {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      throw new Error('Empresa não encontrada');
    }

    const payload: any = {
      ...mapAssetToDb(asset),
      company_id: companyId
    };

    const isValidUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    if (!isValidUuid(payload.id)) delete payload.id;

    const { data, error } = await supabase.from('assets').upsert(payload).select().single();
    if (error) throw error;

    // Atualiza local após sucesso
    const updated = mapAssetFromDb(data);
    db.update(updated);

    return updated;
  } catch (err) {
    console.error('[assetService] persistUpsert:', err);
    throw err;
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.rpc('rpc_ops_asset_delete_v1', { p_asset_id: id });
    if (error) throw error;
  } catch (err) {
    console.error('[assetService] persistDelete:', err);
    throw err;
  }
};

const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();
// startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const assetService = {
  getAll: () => db.getAll(),

  getById: (id: string) => db.getById(id),

  subscribe: (callback: (items: Asset[]) => void) => db.subscribe(callback),
  subscribeRealtime,
  startRealtime,
  stopRealtime,

  add: async (asset: Asset) => {
    const result = await persistUpsert(asset);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Patrimônio',
      description: `Registrou novo ativo: ${asset.name} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.acquisitionValue)})`,
      entityId: asset.id
    });

    return result;
  },

  update: async (asset: Asset) => {
    const old = db.getById(asset.id);
    const result = await persistUpsert(asset);

    const { userId, userName } = getLogInfo();
    if (old && old.status !== 'sold' && asset.status === 'sold') {
      logService.addLog({
        userId, userName, action: 'update', module: 'Patrimônio',
        description: `Venda de Ativo: ${asset.name} vendido para ${asset.buyerName}`,
        entityId: asset.id
      });
    } else if (old && old.status !== 'write_off' && asset.status === 'write_off') {
      logService.addLog({
        userId, userName, action: 'cancel', module: 'Patrimônio',
        description: `BAIXA PATRIMONIAL (Avaria/Perda): ${asset.name}. Motivo: ${asset.writeOffReason}`,
        entityId: asset.id
      });
    }

    return result;
  },

  delete: async (id: string) => {
    const asset = db.getById(id);
    await persistDelete(id);
    db.delete(id);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'delete', module: 'Patrimônio',
      description: `Excluiu ativo: ${asset?.name || 'Desconhecido'}`,
      entityId: id
    });
  },

  importData: (data: Asset[]) => {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    db.setAll(data);
    const payload = data.map(asset => ({
      ...mapAssetToDb(asset),
      company_id: companyId
    }));
    void (async () => {
      try {
        const { error } = await supabase.from('assets').upsert(payload);
        if (error) console.error('Erro ao importar assets no Supabase', error);
      } catch (err) {
        console.error('[assetService] importData:', err);
      }
    })();
  },

  reload: () => {
    isLoaded = false;
    return loadFromSupabase();
  },
  loadFromSupabase
};