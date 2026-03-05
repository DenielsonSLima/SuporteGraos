
import { supabase } from './supabase';
import { authService } from './authService';
import { Partner, PartnerAddress, Driver, Vehicle, SavePartnerAddressData } from '../modules/Partners/types';

/**
 * Service para o módulo de Parceiros (Padrão Foundation V2)
 * Todas as operações utilizam as tabelas com prefixo 'parceiros_'
 */
export const parceirosService = {
    // Helper para mapear banco (snake_case) para frontend (camelCase)
    mapDatabaseToPartner(dbRow: any): Partner {
        if (!dbRow) return {} as Partner;
        const addressRow = Array.isArray(dbRow.address) ? dbRow.address[0] : dbRow.address;

        // Ler categorias da junction table (parceiros_categorias)
        const categoriasRows = Array.isArray(dbRow.parceiros_categorias) ? dbRow.parceiros_categorias : [];
        const categories = categoriasRows.length > 0
            ? categoriasRows.map((c: any) => c.partner_type_id)
            : (dbRow.partner_type_id ? [dbRow.partner_type_id] : []);

        return {
            id: dbRow.id,
            companyId: dbRow.company_id,
            partnerTypeId: dbRow.partner_type_id,
            type: dbRow.type,
            categories,
            document: dbRow.document,
            name: dbRow.name,
            tradeName: dbRow.trade_name,
            nickname: dbRow.nickname,
            email: dbRow.email,
            phone: dbRow.phone,
            notes: dbRow.notes,
            active: dbRow.active !== false,
            createdAt: dbRow.created_at,
            updatedAt: dbRow.updated_at,
            address: addressRow ? parceirosService.mapDatabaseToAddress(addressRow) : undefined
        };
    },

    async getPartners(params?: {
        page?: number;
        pageSize?: number;
        searchTerm?: string;
        category?: string;
    }) {
        const { page = 1, pageSize = 20, searchTerm, category } = params || {};
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const buildBaseQuery = (query: any, useJunctionCategories: boolean) => {
            if (category && category !== 'all') {
                query = useJunctionCategories
                    ? query.eq('parceiros_categorias.partner_type_id', category)
                    : query.eq('partner_type_id', category);
            }

            if (searchTerm) {
                const search = `%${searchTerm.trim()}%`;
                query = query.or(`name.ilike."${search}",trade_name.ilike."${search}",nickname.ilike."${search}",document.ilike."${search}"`);
            }

            return query.order('name', { ascending: true }).range(from, to);
        };

        const categoriasJoin = (category && category !== 'all')
            ? 'parceiros_categorias!inner(partner_type_id)'
            : 'parceiros_categorias(partner_type_id)';

        let primaryQuery = supabase
            .from('parceiros_parceiros')
            .select(`
                *,
                ${categoriasJoin},
                address:parceiros_enderecos(
                    *,
                    city:cities(
                        name,
                        state:states(uf)
                    )
                )
            `, { count: 'exact' });

        const { data, error, count } = await buildBaseQuery(primaryQuery, true);

        let enrichedData = data || [];
        let finalCount = count || 0;

        if (error) {
            console.warn('[parceirosService] Junction indisponível, aplicando fallback legacy:', error.message);

            let fallbackQuery = supabase
                .from('parceiros_parceiros')
                .select(`
                    *,
                    address:parceiros_enderecos(
                        *,
                        city:cities(
                            name,
                            state:states(uf)
                        )
                    )
                `, { count: 'exact' });

            const { data: fallbackData, error: fallbackError, count: fallbackCount } = await buildBaseQuery(fallbackQuery, false);

            if (fallbackError) {
                console.error('[parceirosService] Error fetching partners (fallback):', fallbackError);
                throw fallbackError;
            }

            enrichedData = fallbackData || [];
            finalCount = fallbackCount || 0;
        } else if (category && category !== 'all' && enrichedData.length > 0) {
            const partnerIds = enrichedData.map((d: any) => d.id);
            const { data: allCats } = await supabase
                .from('parceiros_categorias')
                .select('partner_id, partner_type_id')
                .in('partner_id', partnerIds);

            if (allCats) {
                const catMap: Record<string, { partner_type_id: string }[]> = {};
                allCats.forEach((c: any) => {
                    if (!catMap[c.partner_id]) catMap[c.partner_id] = [];
                    catMap[c.partner_id].push({ partner_type_id: c.partner_type_id });
                });
                enrichedData = enrichedData.map((d: any) => ({
                    ...d,
                    parceiros_categorias: catMap[d.id] || d.parceiros_categorias
                }));
            }
        }

        return {
            data: enrichedData.map((row: any) => parceirosService.mapDatabaseToPartner(row)),
            count: finalCount
        };
    },

    async createPartner(partner: Omit<Partner, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) {
        const companyId = authService.getCurrentUser()?.companyId;
        if (!companyId) throw new Error('Company ID not found');

        const categories = partner.categories?.length ? partner.categories : [partner.partnerTypeId || '6'];

        const { data, error } = await supabase
            .from('parceiros_parceiros')
            .insert({
                company_id: companyId,
                name: partner.name,
                trade_name: partner.tradeName,
                nickname: partner.nickname,
                document: partner.document,
                type: partner.type,
                partner_type_id: categories[0], // Mantém coluna legada com a primeira categoria
                email: partner.email,
                phone: partner.phone,
                notes: partner.notes,
                active: true
            })
            .select()
            .single();

        if (error) throw error;

        // Insere TODAS as categorias na junction table
        if (data && categories.length > 0) {
            const rows = categories.map(typeId => ({
                company_id: companyId,
                partner_id: data.id,
                partner_type_id: typeId
            }));
            const { error: catError } = await supabase
                .from('parceiros_categorias')
                .insert(rows);
            if (catError) console.error('[parceirosService] Erro ao salvar categorias:', catError);
        }

        return this.mapDatabaseToPartner({ ...data, parceiros_categorias: categories.map(c => ({ partner_type_id: c })) });
    },

    async updatePartner(id: string, partner: Partial<Partner>) {
        const categories = partner.categories;

        const { data, error } = await supabase
            .from('parceiros_parceiros')
            .update({
                name: partner.name,
                trade_name: partner.tradeName,
                nickname: partner.nickname,
                document: partner.document,
                type: partner.type,
                partner_type_id: categories?.[0] || partner.partnerTypeId,
                email: partner.email,
                phone: partner.phone,
                notes: partner.notes,
                active: partner.active
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Atualiza categorias na junction table (delete + insert)
        if (categories && categories.length > 0) {
            const companyId = data?.company_id || authService.getCurrentUser()?.companyId;

            // Remove categorias antigas
            await supabase
                .from('parceiros_categorias')
                .delete()
                .eq('partner_id', id);

            // Insere as novas
            const rows = categories.map(typeId => ({
                company_id: companyId,
                partner_id: id,
                partner_type_id: typeId
            }));
            const { error: catError } = await supabase
                .from('parceiros_categorias')
                .insert(rows);
            if (catError) console.error('[parceirosService] Erro ao atualizar categorias:', catError);
        }

        return this.mapDatabaseToPartner({
            ...data,
            parceiros_categorias: (categories || []).map(c => ({ partner_type_id: c }))
        });
    },

    async deletePartner(id: string) {
        const { error } = await supabase
            .from('parceiros_parceiros')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- ENDEREÇOS ---
    mapDatabaseToAddress(dbRow: any): PartnerAddress {
        if (!dbRow) return {} as PartnerAddress;

        // PostgREST joins podem vir como objetos ou arrays de um único item
        const city = Array.isArray(dbRow.city) ? dbRow.city[0] : dbRow.city;
        const state = city?.state ? (Array.isArray(city.state) ? city.state[0] : city.state) : null;

        return {
            id: dbRow.id,
            companyId: dbRow.company_id,
            partnerId: dbRow.partner_id,
            cityId: dbRow.city_id,
            cep: dbRow.cep,
            street: dbRow.street,
            number: dbRow.number,
            neighborhood: dbRow.neighborhood,
            complement: dbRow.complement,
            isPrimary: dbRow.is_primary !== false,
            cityName: city?.name,
            stateUf: state?.uf
        };
    },

    async getAddresses(partnerId: string) {
        const { data, error } = await supabase
            .from('parceiros_enderecos')
            .select(`
                *,
                city:cities(
                    name,
                    state:states(uf)
                )
            `)
            .eq('partner_id', partnerId)
            .order('is_primary', { ascending: false });

        if (error) throw error;
        return (data || []).map(row => this.mapDatabaseToAddress(row));
    },

    async createAddress(address: Omit<PartnerAddress, 'id' | 'companyId'>) {
        const companyId = authService.getCurrentUser()?.companyId;
        if (!companyId) throw new Error('Company ID not found');

        const { data, error } = await supabase
            .from('parceiros_enderecos')
            .insert({
                company_id: companyId,
                partner_id: address.partnerId,
                city_id: address.cityId,
                cep: address.cep,
                street: address.street,
                number: address.number,
                neighborhood: address.neighborhood,
                complement: address.complement,
                is_primary: address.isPrimary
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapDatabaseToAddress(data);
    },

    async updateAddress(id: string, address: Partial<PartnerAddress>) {
        const { data, error } = await supabase
            .from('parceiros_enderecos')
            .update({
                city_id: address.cityId,
                cep: address.cep,
                street: address.street,
                number: address.number,
                neighborhood: address.neighborhood,
                complement: address.complement,
                is_primary: address.isPrimary
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapDatabaseToAddress(data);
    },

    async deleteAddress(id: string) {
        const { error } = await supabase
            .from('parceiros_enderecos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Salva o endereço do parceiro, resolvendo IDs de cidade/estado via strings.
     * Útil para o formulário unificado.
     */
    async savePartnerAddress(partnerId: string, addressData: SavePartnerAddressData) {
        const { cep, street, number, neighborhood, complement, cityName, stateUf } = addressData;
        if (!stateUf || !cityName) return;

        // 1. Resolve State ID
        const { data: stateData } = await supabase
            .from('states')
            .select('id')
            .eq('uf', stateUf.toUpperCase())
            .single();

        const stateId = stateData?.id;
        if (!stateId) throw new Error('Estado (UF) não encontrado.');

        // 2. Resolve or Create City ID
        let cityId;
        const { data: cityData } = await supabase
            .from('cities')
            .select('id')
            .eq('state_id', stateId)
            .ilike('name', cityName.trim())
            .maybeSingle();

        if (cityData) {
            cityId = cityData.id;
        } else {
            // Cria a cidade se não existir (usa locationService para log e company_id)
            const { locationService } = await import('./locationService');
            const newCity = await locationService.addCity(stateId, cityName.trim());
            cityId = newCity.id;
        }

        // 3. Upsert Address (Primário)
        const companyId = authService.getCurrentUser()?.companyId;
        const { data: existing } = await supabase
            .from('parceiros_enderecos')
            .select('id')
            .eq('partner_id', partnerId)
            .eq('is_primary', true)
            .maybeSingle();

        const payload = {
            company_id: companyId,
            partner_id: partnerId,
            city_id: cityId,
            cep: cep || '',
            street: street || '',
            number: number || '',
            neighborhood: neighborhood || '',
            complement: complement || '',
            is_primary: true
        };

        if (existing) {
            const { error } = await supabase
                .from('parceiros_enderecos')
                .update(payload)
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('parceiros_enderecos')
                .insert(payload);
            if (error) throw error;
        }
    },

    // --- MOTORISTAS ---
    mapDatabaseToDriver(dbRow: any): Driver {
        return {
            id: dbRow.id,
            companyId: dbRow.company_id,
            partnerId: dbRow.partner_id,
            name: dbRow.name,
            cnhNumber: dbRow.cnh_number,
            cnhCategory: dbRow.cnh_category,
            cpf: dbRow.cpf,
            phone: dbRow.phone,
            active: dbRow.active !== false,
            createdAt: dbRow.created_at
        };
    },

    async getDrivers(partnerId: string) {
        const { data, error } = await supabase
            .from('parceiros_motoristas')
            .select('*')
            .eq('partner_id', partnerId)
            .order('name');

        if (error) throw error;
        return (data || []).map(row => this.mapDatabaseToDriver(row));
    },

    async createDriver(driver: Omit<Driver, 'id' | 'companyId' | 'createdAt'>) {
        const companyId = authService.getCurrentUser()?.companyId;
        if (!companyId) throw new Error('Company ID not found');

        const { data, error } = await supabase
            .from('parceiros_motoristas')
            .insert({
                company_id: companyId,
                partner_id: driver.partnerId,
                name: driver.name,
                cnh_number: driver.cnhNumber,
                cnh_category: driver.cnhCategory,
                cpf: driver.cpf,
                phone: driver.phone,
                active: driver.active !== false
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapDatabaseToDriver(data);
    },

    async updateDriver(id: string, driver: Partial<Driver>) {
        const { data, error } = await supabase
            .from('parceiros_motoristas')
            .update({
                name: driver.name,
                cnh_number: driver.cnhNumber,
                cnh_category: driver.cnhCategory,
                cpf: driver.cpf,
                phone: driver.phone,
                active: driver.active
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapDatabaseToDriver(data);
    },

    async deleteDriver(id: string) {
        const { error } = await supabase
            .from('parceiros_motoristas')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- VEÍCULOS ---
    mapDatabaseToVehicle(dbRow: any): Vehicle {
        return {
            id: dbRow.id,
            companyId: dbRow.company_id,
            partnerId: dbRow.partner_id,
            plate: dbRow.plate,
            brand: dbRow.brand,
            model: dbRow.model,
            color: dbRow.color,
            year: dbRow.year,
            active: dbRow.active !== false,
            createdAt: dbRow.created_at
        };
    },

    async getVehicles(partnerId: string) {
        const { data, error } = await supabase
            .from('parceiros_veiculos')
            .select('*')
            .eq('partner_id', partnerId)
            .order('plate');

        if (error) throw error;
        return (data || []).map(row => this.mapDatabaseToVehicle(row));
    },

    async createVehicle(vehicle: Omit<Vehicle, 'id' | 'companyId' | 'createdAt'>) {
        const companyId = authService.getCurrentUser()?.companyId;
        if (!companyId) throw new Error('Company ID not found');

        const { data, error } = await supabase
            .from('parceiros_veiculos')
            .insert({
                company_id: companyId,
                partner_id: vehicle.partnerId,
                plate: vehicle.plate,
                brand: vehicle.brand,
                model: vehicle.model,
                color: vehicle.color,
                year: vehicle.year,
                active: vehicle.active !== false
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapDatabaseToVehicle(data);
    },

    async updateVehicle(id: string, vehicle: Partial<Vehicle>) {
        const { data, error } = await supabase
            .from('parceiros_veiculos')
            .update({
                plate: vehicle.plate,
                brand: vehicle.brand,
                model: vehicle.model,
                color: vehicle.color,
                year: vehicle.year,
                active: vehicle.active
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapDatabaseToVehicle(data);
    },

    async deleteVehicle(id: string) {
        const { error } = await supabase
            .from('parceiros_veiculos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- REALTIME (singleton channel) ---

    subscribeRealtime: (() => {
        const listeners = new Set<() => void>();
        let channel: ReturnType<typeof supabase.channel> | null = null;
        return (callback: () => void) => {
            listeners.add(callback);
            if (!channel) {
                channel = supabase
                    .channel('realtime:parceiros')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_parceiros' }, () => listeners.forEach(fn => fn()))
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_categorias' }, () => listeners.forEach(fn => fn()))
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_enderecos' }, () => listeners.forEach(fn => fn()))
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_motoristas' }, () => listeners.forEach(fn => fn()))
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_veiculos' }, () => listeners.forEach(fn => fn()))
                    .subscribe();
            }
            return () => {
                listeners.delete(callback);
                if (listeners.size === 0 && channel) {
                    supabase.removeChannel(channel);
                    channel = null;
                }
            };
        };
    })()
};
