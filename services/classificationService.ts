
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { DEFAULT_PARTNER_CATEGORIES } from '../constants';
import { supabase } from './supabase';
import { waitForInit } from './supabaseInitService';

// Interfaces reused from components to standardize
export interface PartnerType {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export interface ProductType {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

// Initial Data
const INITIAL_PRODUCT_TYPES: ProductType[] = [
  { 
    id: '1', 
    name: 'Milho em Grãos', 
    description: 'Grãos de milho in natura destinados à comercialização ou consumo.', 
    isSystem: true 
  }
];

// Persistence DBs
const partnerTypesDb = new Persistence<PartnerType>('partner_types', DEFAULT_PARTNER_CATEGORIES as PartnerType[]);
const productTypesDb = new Persistence<ProductType>('product_types', INITIAL_PRODUCT_TYPES);
let _isSupabaseLoaded = false;

// Load from optimized parallel Supabase loader
const loadFromSupabase = async () => {
  try {
    const stats = await waitForInit();

    // Load Partner Types
    if (stats.data.partnerTypes && stats.data.partnerTypes.length > 0) {
      const mappedPartners: PartnerType[] = stats.data.partnerTypes.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        isSystem: p.is_system || false
      }));
      partnerTypesDb.setAll(mappedPartners);
    }

    // Load Product Types
    if (stats.data.productTypes && stats.data.productTypes.length > 0) {
      const mappedProducts: ProductType[] = stats.data.productTypes.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        isSystem: p.is_system || false
      }));
      productTypesDb.setAll(mappedProducts);
    }

    _isSupabaseLoaded = true;
  } catch (error) {
    console.warn('⚠️ ClassificationService: Erro ao carregar:', error);
    _isSupabaseLoaded = false;
  }
};

// Initialize
loadFromSupabase();

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

export const classificationService = {
  // --- PARTNER TYPES ---
  getPartnerTypes: () => partnerTypesDb.getAll(),
  
  addPartnerType: async (type: PartnerType) => {
    partnerTypesDb.add(type);
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Configurações',
      description: `Criou tipo de parceiro: ${type.name}`,
      entityId: type.id
    });

    // Save to Supabase
    if (_isSupabaseLoaded) {
      try {
        await supabase
          .from('partner_types')
          .insert({
            id: type.id,
            name: type.name,
            description: type.description || null,
            is_system: type.isSystem || false,
            company_id: null
          });
        console.log(`✅ Tipo de parceiro ${type.name} salvo no Supabase`);
      } catch (error) {
        console.warn('⚠️ Erro ao salvar tipo no Supabase:', error);
      }
    }
  },

  updatePartnerType: async (type: PartnerType) => {
    partnerTypesDb.update(type);
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'update',
      module: 'Configurações',
      description: `Atualizou tipo de parceiro: ${type.name}`,
      entityId: type.id
    });

    // Update in Supabase
    if (_isSupabaseLoaded) {
      try {
        await supabase
          .from('partner_types')
          .update({
            name: type.name,
            description: type.description || null,
            is_system: type.isSystem || false
          })
          .eq('id', type.id);
        console.log(`✅ Tipo de parceiro ${type.name} atualizado no Supabase`);
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar tipo no Supabase:', error);
      }
    }
  },

  deletePartnerType: async (id: string) => {
    const t = partnerTypesDb.getById(id);
    partnerTypesDb.delete(id);
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Configurações',
      description: `Excluiu tipo de parceiro: ${t?.name || 'Desconhecido'}`,
      entityId: id
    });

    // Delete from Supabase
    if (_isSupabaseLoaded) {
      try {
        await supabase
          .from('partner_types')
          .delete()
          .eq('id', id);
        console.log(`✅ Tipo de parceiro excluído do Supabase`);
      } catch (error) {
        console.warn('⚠️ Erro ao excluir tipo do Supabase:', error);
      }
    }
  },

  // --- PRODUCT TYPES ---
  getProductTypes: () => productTypesDb.getAll(),

  addProductType: async (type: ProductType) => {
    productTypesDb.add(type);
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Configurações',
      description: `Criou tipo de produto: ${type.name}`,
      entityId: type.id
    });

    // Save to Supabase
    if (_isSupabaseLoaded) {
      try {
        await supabase
          .from('product_types')
          .insert({
            id: type.id,
            name: type.name,
            description: type.description || null,
            is_system: type.isSystem || false,
            company_id: null
          });
        console.log(`✅ Tipo de produto ${type.name} salvo no Supabase`);
      } catch (error) {
        console.warn('⚠️ Erro ao salvar tipo no Supabase:', error);
      }
    }
  },

  updateProductType: async (type: ProductType) => {
    productTypesDb.update(type);
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'update',
      module: 'Configurações',
      description: `Atualizou tipo de produto: ${type.name}`,
      entityId: type.id
    });

    // Update in Supabase
    if (_isSupabaseLoaded) {
      try {
        await supabase
          .from('product_types')
          .update({
            name: type.name,
            description: type.description || null,
            is_system: type.isSystem || false
          })
          .eq('id', type.id);
        console.log(`✅ Tipo de produto ${type.name} atualizado no Supabase`);
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar tipo no Supabase:', error);
      }
    }
  },

  deleteProductType: async (id: string) => {
    const t = productTypesDb.getById(id);
    productTypesDb.delete(id);
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Configurações',
      description: `Excluiu tipo de produto: ${t?.name || 'Desconhecido'}`,
      entityId: id
    });

    // Delete from Supabase
    if (_isSupabaseLoaded) {
      try {
        await supabase
          .from('product_types')
          .delete()
          .eq('id', id);
        console.log(`✅ Tipo de produto excluído do Supabase`);
      } catch (error) {
        console.warn('⚠️ Erro ao excluir tipo do Supabase:', error);
      }
    }
  },

  // Restore
  importData: (partnerTypes: PartnerType[], productTypes: ProductType[]) => {
    if (partnerTypes && Array.isArray(partnerTypes)) {
        partnerTypesDb.setAll(partnerTypes);
    }
    if (productTypes && Array.isArray(productTypes)) {
        productTypesDb.setAll(productTypes);
    }
  }
};
