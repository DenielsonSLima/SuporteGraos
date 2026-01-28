
import { Loading } from '../modules/Loadings/types';
import { logService } from './logService';
import { authService } from './authService';
import { Persistence } from './persistence';
import { supabase } from './supabase';
import { payablesService } from './financial/payablesService';
import { purchaseService } from './purchaseService';
import { receivablesService, Receivable } from './financial/receivablesService';
import { salesService } from './salesService';

const db = new Persistence<Loading>('logistics_loadings', []);
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;
let toastCallback: ((type: 'success' | 'error' | 'info', title: string, message?: string) => void) | null = null;

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
  if (toastCallback) {
    toastCallback(type, title, message);
  }
};

const generateUUID = (): string => {
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const mapLoadingToDb = (l: Loading) => ({
  id: l.id,
  date: l.date,
  invoice_number: l.invoiceNumber || null,
  purchase_order_id: l.purchaseOrderId || null,
  purchase_order_number: l.purchaseOrderNumber || null,
  supplier_name: l.supplierName || null,
  carrier_id: l.carrierId || null,
  carrier_name: l.carrierName || null,
  driver_id: l.driverId || null,
  driver_name: l.driverName || null,
  vehicle_id: null,
  vehicle_plate: l.vehiclePlate,
  is_client_transport: !!l.isClientTransport,
  product: l.product,
  weight_kg: l.weightKg,
  weight_sc: l.weightSc || null,
  unload_weight_kg: l.unloadWeightKg || null,
  breakage_kg: l.breakageKg || null,
  purchase_price_per_sc: l.purchasePricePerSc || null,
  total_purchase_value: l.totalPurchaseValue || null,
  product_paid: l.productPaid || 0,
  freight_price_per_ton: l.freightPricePerTon || null,
  total_freight_value: l.totalFreightValue || null,
  freight_advances: l.freightAdvances || 0,
  freight_paid: l.freightPaid || 0,
  notes: l.notes || null,
  sales_order_id: l.salesOrderId || null,
  sales_order_number: l.salesOrderNumber || null,
  customer_name: l.customerName || null,
  sales_price: l.salesPrice || null,
  total_sales_value: l.totalSalesValue || null,
  status: l.status,
  is_redirected: !!l.isRedirected,
  original_destination: l.originalDestination || null,
  redirect_displacement_value: l.redirectDisplacementValue || null,
  metadata: l,
  company_id: null
});

const mapLoadingFromDb = (row: any): Loading => {
  const meta: Loading | undefined = row?.metadata;
  const base: Loading = meta ? { ...meta } : {
    id: row?.id,
    date: row?.date,
    invoiceNumber: row?.invoice_number || undefined,
    purchaseOrderId: row?.purchase_order_id || '',
    purchaseOrderNumber: row?.purchase_order_number || '',
    supplierName: row?.supplier_name || '',
    carrierId: row?.carrier_id || '',
    carrierName: row?.carrier_name || '',
    driverId: row?.driver_id || '',
    driverName: row?.driver_name || '',
    vehiclePlate: row?.vehicle_plate || '',
    isClientTransport: !!row?.is_client_transport,
    product: row?.product || '',
    weightKg: Number(row?.weight_kg) || 0,
    weightTon: Number(row?.weight_ton) || Number(row?.weight_kg || 0) / 1000,
    weightSc: Number(row?.weight_sc) || 0,
    unloadWeightKg: Number(row?.unload_weight_kg) || undefined,
    breakageKg: Number(row?.breakage_kg) || undefined,
    purchasePricePerSc: Number(row?.purchase_price_per_sc) || 0,
    totalPurchaseValue: Number(row?.total_purchase_value) || 0,
    productPaid: Number(row?.product_paid) || 0,
    freightPricePerTon: Number(row?.freight_price_per_ton) || 0,
    totalFreightValue: Number(row?.total_freight_value) || 0,
    freightAdvances: Number(row?.freight_advances) || 0,
    freightPaid: Number(row?.freight_paid) || 0,
    notes: row?.notes || undefined,
    salesOrderId: row?.sales_order_id || '',
    salesOrderNumber: row?.sales_order_number || '',
    customerName: row?.customer_name || '',
    salesPrice: Number(row?.sales_price) || 0,
    totalSalesValue: Number(row?.total_sales_value) || 0,
    status: (row?.status || 'in_transit'),
    isRedirected: !!row?.is_redirected,
    originalDestination: row?.original_destination || undefined,
    redirectDisplacementValue: Number(row?.redirect_displacement_value) || undefined,
    extraExpenses: [],
    transactions: []
  } as Loading;

  return {
    ...base,
    id: row?.id ?? base.id,
    date: row?.date ?? base.date,
    status: row?.status ?? base.status
  };
};

const loadFromSupabase = async () => {
  if (isLoaded) return;
  try {
    const { data, error } = await supabase
      .from('logistics_loadings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapLoadingFromDb);
    db.setAll(mapped);
    isLoaded = true;
    console.log('🔄 Carregamentos sincronizando em tempo real...');
  } catch (error) {
    console.error('❌ Erro ao carregar logistics_loadings:', error);
  }
};

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:logistics_loadings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'logistics_loadings' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const mapped = mapLoadingFromDb(rec);
        const existing = db.getById(mapped.id);
        if (existing) db.update(mapped);
        else db.add(mapped);
      } else if (payload.eventType === 'DELETE') {
        db.delete(rec.id);
      }
      // console.log(`🔔 Realtime logistics_loadings: ${payload.eventType}`);
    })
    .subscribe();
};

const persistUpsert = async (loading: Loading) => {
  try {
    const payload: any = mapLoadingToDb(loading);
    const isValidUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    if (!isValidUuid(payload.id)) delete payload.id;
    const { error } = await supabase.from('logistics_loadings').upsert(payload).select();
    if (error) {
      console.error('Erro ao salvar carregamento no Supabase', error);
      return;
    }
    await loadFromSupabase();
  } catch (err) {
    console.error('Erro inesperado ao salvar carregamento no Supabase', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('logistics_loadings').delete().eq('id', id);
    if (error) console.error('Erro ao excluir carregamento no Supabase', error);
  } catch (err) {
    console.error('Erro inesperado ao excluir carregamento no Supabase', err);
  }
};

// Inicializa carga e realtime ao importar o módulo
void loadFromSupabase();
startRealtime();

export const loadingService = {
  setToastCallback: (callback: (type: 'success' | 'error' | 'info', title: string, message?: string) => void) => {
    toastCallback = callback;
  },

  getAll: () => db.getAll(),

  subscribe: (callback: (items: Loading[]) => void) => db.subscribe(callback),

  getByPurchaseOrder: (purchaseId: string) => {
    return db.getAll().filter(l => l.purchaseOrderId === purchaseId);
  },

  getBySalesOrder: (salesId: string) => {
    return db.getAll().filter(l => l.salesOrderId === salesId);
  },

  add: (loading: Loading) => {
    console.log('🔵 loadingService.add() CHAMADO! Loading:', {
      purchaseOrderId: loading.purchaseOrderId,
      totalFreightValue: loading.totalFreightValue,
      totalPurchaseValue: loading.totalPurchaseValue,
      carrierId: loading.carrierId,
      supplierName: loading.supplierName
    });

    if (!loading.transactions) loading.transactions = [];
    if (!loading.extraExpenses) loading.extraExpenses = [];
    db.add(loading);
    void persistUpsert(loading);

    // ✅ Criar automaticamente um payable do FRETE se tiver compra associada
    if (loading.purchaseOrderId && loading.totalFreightValue && loading.totalFreightValue > 0 && loading.carrierId) {
      const freightAmount = Number(loading.totalFreightValue) || 0;
      const freightPaidAmount = Number(loading.freightPaid) || 0;

      console.log('🚚 Criando payable do FRETE:', {
        carrierId: loading.carrierId,
        carrierName: loading.carrierName,
        driverName: loading.driverName,
        weightKg: loading.weightKg,
        freightAmount
      });

      payablesService.add({
        id: generateUUID(),
        purchaseOrderId: loading.purchaseOrderId,
        partnerId: loading.carrierId,
        partnerName: loading.carrierName,
        driverName: loading.driverName,
        weightKg: loading.weightKg,
        description: `Frete do carregamento - Placa ${loading.vehiclePlate || 'N/A'}`,
        dueDate: loading.date,
        amount: freightAmount,
        paidAmount: freightPaidAmount,
        status: freightPaidAmount >= freightAmount ? 'paid' : 'pending',
        subType: 'freight',
        notes: `Carregamento: ${loading.weightKg}kg`
      });
      
      showToast('success', `💰 Frete ${loading.carrierName} criado no financeiro`);
    }

    // ✅ NOVO: Criar automaticamente um payable do FORNECEDOR do pedido de compra
    if (loading.purchaseOrderId && loading.totalPurchaseValue && loading.totalPurchaseValue > 0) {
      console.log('🔍 DEBUG FORNECEDOR - Buscando pedido de compra:', loading.purchaseOrderId);
      const purchaseOrder = purchaseService.getById(loading.purchaseOrderId);
      console.log('🔍 DEBUG FORNECEDOR - Pedido encontrado?', purchaseOrder ? 'SIM' : 'NÃO', purchaseOrder);
      
      if (purchaseOrder && purchaseOrder.partnerId) {
        console.log('✅ ENTROU NO IF - Tem partnerId:', purchaseOrder.partnerId);
        
        // ✅ CORREÇÃO: Buscar TODAS as cargas do pedido e SOMAR os valores
        const allLoadingsFromOrder = loadingService.getByPurchaseOrder(loading.purchaseOrderId);
        const totalPurchaseAmount = allLoadingsFromOrder.reduce((sum, l) => sum + (Number(l.totalPurchaseValue) || 0), 0);
        const totalPurchasePaid = allLoadingsFromOrder.reduce((sum, l) => sum + (Number(l.productPaid) || 0), 0);

        console.log('🔢 Valores calculados (SOMA DE TODAS AS CARGAS):', {
          totalCargas: allLoadingsFromOrder.length,
          purchaseAmount: totalPurchaseAmount,
          purchasePaidAmount: totalPurchasePaid,
          status: totalPurchasePaid >= totalPurchaseAmount ? 'paid' : 'pending'
        });

        console.log('🏭 Criando/Atualizando payable do FORNECEDOR:', {
          partnerId: purchaseOrder.partnerId,
          partnerName: purchaseOrder.partnerName || loading.supplierName,
          orderNumber: purchaseOrder.number,
          purchaseAmount: totalPurchaseAmount,
          purchasePaidAmount: totalPurchasePaid
        });

        // Verifica se já existe um payable para este pedido de compra
        const existingPayables = payablesService.getAll();
        console.log('🔍 Total de payables existentes:', existingPayables.length);
        
        const existingPayable = existingPayables.find(p => 
          p.purchaseOrderId === loading.purchaseOrderId && 
          p.subType === 'purchase_order'
        );
        console.log('🔍 Payable existente para este pedido?', existingPayable ? 'SIM' : 'NÃO');

        if (existingPayable) {
          console.log('⚠️ Já existe payable do fornecedor para este pedido, atualizando com SOMA de todas as cargas...');
          payablesService.update({
            ...existingPayable,
            amount: totalPurchaseAmount,
            paidAmount: totalPurchasePaid,
            status: totalPurchasePaid >= totalPurchaseAmount ? 'paid' : 'pending'
          });
          console.log('✅ Payable atualizado com valor total correto!');
        } else {
          console.log('✅ Criando novo payable do fornecedor com valor TOTAL...');
          try {
            payablesService.add({
              id: generateUUID(),
              purchaseOrderId: loading.purchaseOrderId,
              partnerId: purchaseOrder.partnerId,
              partnerName: purchaseOrder.partnerName || loading.supplierName,
              description: `Compra #${purchaseOrder.number} - ${loading.product}`,
              dueDate: loading.date,
              amount: totalPurchaseAmount,
              paidAmount: totalPurchasePaid,
              status: totalPurchasePaid >= totalPurchaseAmount ? 'paid' : 'pending',
              subType: 'purchase_order',
              notes: `Total de ${allLoadingsFromOrder.length} carregamento(s)`
            });
            console.log('✅✅ Payable do fornecedor criado com sucesso!');
          } catch (error) {
            console.error('❌ ERRO ao criar payable do fornecedor:', error);
          }
        }
      } else {
        console.log('⚠️ Condição não atendida - purchaseOrder:', !!purchaseOrder, 'partnerId:', purchaseOrder?.partnerId);
      }
    } else {
      console.log('⚠️ Condição de fornecedor não atendida - purchaseOrderId:', loading.purchaseOrderId, 'totalPurchaseValue:', loading.totalPurchaseValue);
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Logística',
      description: `Registrou carregamento: Placa ${loading.vehiclePlate} (${loading.weightKg}kg)`,
      entityId: loading.id
    });
  },

  update: (updatedLoading: Loading) => {
    const oldLoading = db.getById(updatedLoading.id);
    if (!updatedLoading.extraExpenses) updatedLoading.extraExpenses = [];
    if (!updatedLoading.transactions) updatedLoading.transactions = [];
    db.update(updatedLoading);
    void persistUpsert(updatedLoading);

    const shouldCreateReceivable = updatedLoading.salesOrderId && updatedLoading.unloadWeightKg && updatedLoading.unloadWeightKg > 0;

    if (shouldCreateReceivable) {
      const sale = salesService.getById(updatedLoading.salesOrderId!);
      const partnerId = sale?.customerId;
      const unitPrice = updatedLoading.salesPrice || sale?.unitPrice || 0;
      const totalSc = updatedLoading.weightSc || (updatedLoading.unloadWeightKg ? updatedLoading.unloadWeightKg / 60 : 0);
      const amount = updatedLoading.totalSalesValue && updatedLoading.totalSalesValue > 0
        ? updatedLoading.totalSalesValue
        : Number((unitPrice * totalSc).toFixed(2));

      if (partnerId && amount > 0) {
        const existingReceivable = receivablesService.getAll().find(r => r.salesOrderId === updatedLoading.salesOrderId);
        const receivedAmount = existingReceivable?.receivedAmount ?? sale?.paidValue ?? 0;
        const status: Receivable['status'] = receivedAmount >= amount
          ? 'received'
          : receivedAmount > 0
            ? 'partially_received'
            : 'pending';

        const receivablePayload: Receivable = {
          id: existingReceivable?.id || generateUUID(),
          salesOrderId: updatedLoading.salesOrderId!,
          partnerId,
          description: `Venda #${sale?.number || updatedLoading.salesOrderNumber || 'sem número'}`,
          dueDate: sale?.date || updatedLoading.date,
          amount,
          receivedAmount,
          status,
          notes: `Carga ${updatedLoading.vehiclePlate || ''} | Peso destino ${updatedLoading.unloadWeightKg}kg`,
          companyId: (sale as any)?.companyId || undefined
        };

        console.log('💰 Criando/Atualizando receivable:', {
          id: receivablePayload.id.substring(0, 8),
          salesOrderId: updatedLoading.salesOrderId,
          partnerId,
          amount,
          status,
          action: existingReceivable ? 'UPDATE' : 'CREATE'
        });

        if (existingReceivable) receivablesService.update(receivablePayload);
        else receivablesService.add(receivablePayload);
        
        showToast('success', `✅ Conta a Receber criada para ${(sale as any)?.partnerName || 'Cliente'}`);
        console.log('✅ Receivable salvo! Aguarde atualização em tempo real...');
      } else {
        console.warn('⚠️ Receivable não criado: falta partnerId ou valor', {
          salesOrderId: updatedLoading.salesOrderId,
          partnerId,
          amount,
          unloadWeightKg: updatedLoading.unloadWeightKg
        });
      }
    }

    const { userId, userName } = getLogInfo();
    let description = `Atualizou dados do carregamento ${updatedLoading.vehiclePlate}`;
    if (oldLoading) {
      if (updatedLoading.status === 'redirected' && oldLoading.status !== 'redirected') {
        description = `REMANEJO DE CARGA: Placa ${updatedLoading.vehiclePlate} desviada para ${updatedLoading.customerName}`;
      } else if (updatedLoading.status === 'completed' && oldLoading.status !== 'completed') {
        description = `Finalizou transporte da Placa ${updatedLoading.vehiclePlate}`;
      } else if ((updatedLoading.extraExpenses?.length || 0) > (oldLoading.extraExpenses?.length || 0)) {
        description = `Lançou despesa extra no frete: ${updatedLoading.vehiclePlate}`;
      }
    }

    logService.addLog({
      userId,
      userName,
      action: 'update' as any,
      module: 'Logística',
      description,
      entityId: updatedLoading.id
    });
  },

  delete: (id: string) => {
    const loading = db.getById(id);
    db.delete(id);
    void persistDelete(id);

    // ✅ DELETE EM CASCATA: Se o carregamento tinha um payable de frete, delete também
    if (loading && loading.totalFreightValue && loading.totalFreightValue > 0) {
      // Busca o payable associado ao frete deste carregamento
      const allPayables = payablesService.getAll();
      const relatedPayable = allPayables.find(
        p => p.purchaseOrderId === loading.purchaseOrderId && 
             p.subType === 'freight' && 
             p.partnerId === loading.carrierId
      );
      
      if (relatedPayable) {
        console.log(`🗑️ Deletando payable associado ao frete: ${relatedPayable.id}`);
        payablesService.delete(relatedPayable.id);
      }
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Logística',
      description: `Excluiu carregamento: Placa ${loading?.vehiclePlate || 'Desconhecida'}`,
      entityId: id
    });
  },

  importData: (data: Loading[]) => {
    db.setAll(data);
    const payload = data.map(mapLoadingToDb);
    void (async () => {
      try {
        const { error } = await supabase.from('logistics_loadings').upsert(payload);
        if (error) console.error('Erro ao importar carregamentos no Supabase', error);
      } catch (err) {
        console.error('Erro inesperado ao importar carregamentos no Supabase', err);
      }
    })();
  },

  // ✅ FUNÇÃO DE CORREÇÃO: Recalcular todos os payables de pedidos de compra
  recalculateAllPurchasePayables: () => {
    console.log('🔧 INICIANDO RECÁLCULO DE PAYABLES DE COMPRA...');
    
    const allPayables = payablesService.getAll();
    const purchasePayables = allPayables.filter(p => p.subType === 'purchase_order');
    
    console.log(`📊 Total de payables de compra encontrados: ${purchasePayables.length}`);
    
    purchasePayables.forEach(payable => {
      if (!payable.purchaseOrderId) {
        console.log(`⚠️ Payable ${payable.id} sem purchaseOrderId, pulando...`);
        return;
      }
      
      // Buscar todas as cargas deste pedido
      const loadings = loadingService.getByPurchaseOrder(payable.purchaseOrderId);
      
      if (loadings.length === 0) {
        console.log(`⚠️ Nenhuma carga encontrada para pedido ${payable.purchaseOrderId}`);
        return;
      }
      
      // Somar valores de todas as cargas
      const totalPurchaseAmount = loadings.reduce((sum, l) => sum + (Number(l.totalPurchaseValue) || 0), 0);
      const totalPurchasePaid = loadings.reduce((sum, l) => sum + (Number(l.productPaid) || 0), 0);
      
      // Verificar se o valor está diferente
      if (payable.amount !== totalPurchaseAmount || payable.paidAmount !== totalPurchasePaid) {
        console.log(`🔄 CORRIGINDO Payable ${payable.description}:`, {
          valorAntigo: payable.amount,
          valorNovo: totalPurchaseAmount,
          pagoAntigo: payable.paidAmount,
          pagoNovo: totalPurchasePaid,
          totalCargas: loadings.length
        });
        
        // Atualizar com valores corretos
        payablesService.update({
          ...payable,
          amount: totalPurchaseAmount,
          paidAmount: totalPurchasePaid,
          status: totalPurchasePaid >= totalPurchaseAmount ? 'paid' : totalPurchasePaid > 0 ? 'partially_paid' : 'pending'
        });
        
        console.log(`✅ Payable corrigido com sucesso!`);
      } else {
        console.log(`✓ Payable ${payable.description} já está correto (${totalPurchaseAmount})`);
      }
    });
    
    console.log('🎉 RECÁLCULO CONCLUÍDO!');
  }
};

// ✅ EXECUTAR CORREÇÃO AUTOMATICAMENTE AO CARREGAR O MÓDULO
setTimeout(() => {
  if (isLoaded) {
    console.log('🔧 Executando correção automática de payables...');
    loadingService.recalculateAllPurchasePayables();
  }
}, 2000);
