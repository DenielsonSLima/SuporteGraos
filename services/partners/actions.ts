import { supabase } from '../supabase';
import { db, transformPartnerToSupabase, transformPartnerFromSupabase } from './store';
import { logService } from '../logService';
import { authService } from '../authService';
import { auditService } from '../auditService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { parceirosService } from '../parceirosService';
import type { Partner } from './types';

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

export const add = async (partner: Partner): Promise<Partner> => {
  const created = await parceirosService.createPartner({
    ...partner,
    partnerTypeId: partner.partnerTypeId || partner.categories?.[0],
  } as any);
  
  const { userId, userName } = getLogInfo();
  logService.addLog({
    userId, userName, action: 'create', module: 'Parceiros',
    description: `Cadastrou novo parceiro: ${partner.name}`, entityId: created.id
  });

  void auditService.logAction('create', 'Parceiros', `Parceiro cadastrado: ${partner.name}`, {
    entityType: 'Partner', entityId: created.id,
    metadata: { category: partner.categories?.[0] || '1', document: partner.document }
  });

  db.add(created as Partner);
  return created as Partner;
};

export const update = async (updatedPartner: Partner): Promise<void> => {
  const existing = db.getById(updatedPartner.id);
  
  const updated = await parceirosService.updatePartner(updatedPartner.id, {
    ...updatedPartner,
    partnerTypeId: updatedPartner.partnerTypeId || updatedPartner.categories?.[0],
  } as any);

  const { userId, userName } = getLogInfo();
  logService.addLog({
    userId, userName, action: 'update', module: 'Parceiros',
    description: `Atualizou dados do parceiro: ${updatedPartner.name}`, entityId: updatedPartner.id
  });

  void auditService.logAction('update', 'Parceiros', `Parceiro atualizado: ${updatedPartner.name}`, {
    entityType: 'Partner', entityId: updatedPartner.id,
    metadata: { category: updatedPartner.categories?.[0] || '1' }
  });

  db.update(updated as Partner);
};

export const deletePartner = async (id: string): Promise<void> => {
  const partner = db.getById(id);
  if (!partner) return;

  await parceirosService.deletePartner(id);

  const { userId, userName } = getLogInfo();
  logService.addLog({
    userId, userName, action: 'delete', module: 'Parceiros',
    description: `Removeu o parceiro: ${partner.name}`, entityId: id
  });

  void auditService.logAction('delete', 'Parceiros', `Parceiro removido: ${partner.name}`, {
    entityType: 'Partner', entityId: id,
    metadata: { category: partner.categories?.[0] || '1', document: partner.document }
  });

  db.delete(id);
};

export const setAddressLocal = (partnerId: string, address: Partner['address']) => {
  const existing = db.getById(partnerId);
  if (existing) {
    db.update({ ...existing, address });
  }
};

export const importData = (data: Partner[]) => {
  db.setAll(data);
  sqlCanonicalOpsLog('partnerService.importData: Atualizando cache local');

  const companyId = authService.getCurrentUser()?.companyId;
  if (!companyId) return;

  // Importação em lote usando a nova tabela parceiros_parceiros
  const payload = data.map(p => ({
    company_id: companyId,
    name: p.name,
    trade_name: p.tradeName,
    nickname: p.nickname,
    document: p.document,
    type: p.type,
    partner_type_id: p.categories?.[0] || p.partnerTypeId || '6',
    email: p.email,
    phone: p.phone,
    notes: p.notes,
    active: p.active !== false
  }));

  void (async () => {
    try {
      const { error } = await supabase.from('parceiros_parceiros').upsert(payload, { onConflict: 'id' });
      if (error) console.error('❌ Erro ao importar parceiros (parceiros_parceiros):', error);
    } catch (err) {
      console.error('❌ Erro crítico ao importar parceiros:', err);
    }
  })();
};
