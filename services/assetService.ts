import { Asset } from '../modules/Assets/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { supabase } from './supabase';

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
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('acquisition_date', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapAssetFromDb);
    db.setAll(mapped);
    isLoaded = true;
    console.log('🔄 Patrimônio sincronizando em tempo real...');
  } catch (error) {
    console.error('❌ Erro ao carregar assets:', error);
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

      console.log(`🔔 Realtime assets: ${payload.eventType}`);
    })
    .subscribe();
};

// ============================================================================
// PERSISTÊNCIA SUPABASE
// ============================================================================

const persistUpsert = async (asset: Asset) => {
  try {
    const payload: any = mapAssetToDb(asset);
    const isValidUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    if (!isValidUuid(payload.id)) delete payload.id;

    const { error } = await supabase.from('assets').upsert(payload).select();
    if (error) {
      console.error('Erro ao salvar asset no Supabase', error);
      return;
    }
    await loadFromSupabase();
  } catch (err) {
    console.error('Erro inesperado ao salvar asset no Supabase', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (error) console.error('Erro ao excluir asset no Supabase', error);
  } catch (err) {
    console.error('Erro inesperado ao excluir asset no Supabase', err);
  }
};

// Inicializa ao importar
void loadFromSupabase();
startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const assetService = {
  getAll: () => db.getAll(),
  
  getById: (id: string) => db.getById(id),

  subscribe: (callback: (items: Asset[]) => void) => db.subscribe(callback),

  add: (asset: Asset) => {
    db.add(asset);
    void persistUpsert(asset);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Patrimônio',
      description: `Registrou novo ativo: ${asset.name} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.acquisitionValue)})`,
      entityId: asset.id
    });
  },

  update: (asset: Asset) => {
    const old = db.getById(asset.id);
    db.update(asset);
    void persistUpsert(asset);
    
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
  },

  delete: (id: string) => {
    const asset = db.getById(id);
    db.delete(id);
    void persistDelete(id);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'delete', module: 'Patrimônio',
      description: `Excluiu ativo: ${asset?.name || 'Desconhecido'}`,
      entityId: id
    });
  },

  importData: (data: Asset[]) => {
    db.setAll(data);
    const payload = data.map(mapAssetToDb);
    void (async () => {
      try {
        const { error } = await supabase.from('assets').upsert(payload);
        if (error) console.error('Erro ao importar assets no Supabase', error);
      } catch (err) {
        console.error('Erro inesperado ao importar assets no Supabase', err);
      }
    })();
  }
};