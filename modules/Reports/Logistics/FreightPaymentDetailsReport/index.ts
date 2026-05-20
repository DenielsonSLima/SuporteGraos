import { Map as MapIcon } from 'lucide-react';
import { ReportModule } from '../../types';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from './Filters';

const freightPaymentDetailsReport: ReportModule = {
    metadata: {
        id: 'freight_payments_detailed',
        title: 'Relatório Detalhado de Fretes e Pagamentos',
        description: 'Visão completa: pesagem, cálculo, quebra, despesas, adiantamentos consumidos, pagamentos e saldos.',
        category: 'logistics',
        icon: MapIcon,
        needsDateFilter: true
    },
    initialFilters: {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
        carrierName: ''
    },
    FilterComponent: Filters,
    fetchData: async ({ startDate, endDate, carrierName }) => {
        const { supabase } = await import('../../../../services/supabase');

        // 1) Buscar fretes da VIEW v_logistics_freights (fonte da verdade)
        let query = supabase
            .from('v_logistics_freights')
            .select('*')
            .order('date', { ascending: true });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (carrierName) query = query.eq('carrier_name', carrierName);

        const { data: freights, error } = await query;
        if (error) {
            console.error('[FreightPaymentDetailsReport] Erro ao buscar fretes:', error.message);
            return { title: '', subtitle: '', landscape: true, columns: [], rows: [], summary: [] };
        }

        const freightRows = freights || [];

        // 2) Buscar carregamentos (ops_loadings) para despesas extras
        const loadingIds = freightRows.map((f: any) => f.id).filter(Boolean);
        const loadingsMap = new globalThis.Map<string, any>();
        if (loadingIds.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < loadingIds.length; i += chunkSize) {
                const chunk = loadingIds.slice(i, i + chunkSize);
                const { data: loadings } = await supabase
                    .from('ops_loadings')
                    .select('id, raw_payload')
                    .in('id', chunk);
                if (loadings) {
                    loadings.forEach((l: any) => loadingsMap.set(l.id, l));
                }
            }
        }

        // 3) Buscar financial_entries para cada loading (freight)
        const entriesMap = new globalThis.Map<string, any[]>(); // loading_id -> transactions[]
        if (loadingIds.length > 0) {
            const chunkSize = 100;
            for (let i = 0; i < loadingIds.length; i += chunkSize) {
                const chunk = loadingIds.slice(i, i + chunkSize);
                const { data: entries } = await supabase
                    .from('financial_entries')
                    .select('id, origin_id, origin_type')
                    .in('origin_id', chunk);

                if (entries && entries.length > 0) {
                    const entryIds = entries.map(e => e.id);
                    // Buscar transações para esses entries
                    const { data: txs } = await supabase
                        .from('financial_transactions')
                        .select('id, transaction_date, amount, description, entry_id, type, account_id, accounts(account_name)')
                        .in('entry_id', entryIds)
                        .order('transaction_date', { ascending: true });

                    if (txs) {
                        txs.forEach((tx: any) => {
                            const entry = entries.find(e => e.id === tx.entry_id);
                            if (entry) {
                                const loadingId = entry.origin_id;
                                if (!entriesMap.has(loadingId)) entriesMap.set(loadingId, []);
                                entriesMap.get(loadingId)!.push({
                                    date: tx.transaction_date,
                                    amount: Math.abs(tx.amount),
                                    description: tx.description || '',
                                    type: tx.type,
                                    account: (tx.accounts as any)?.account_name || 'Caixa/Banco',
                                    entryOriginType: entry.origin_type
                                });
                            }
                        });
                    }
                }
            }
        }

        // 4) Buscar adiantamentos consumidos (advances com parent_id)
        //    Precisamos vincular adiantamentos a transportadoras
        //    Os adiantamentos de motorista/transportadora estão na tabela advances
        //    com recipient_type = 'supplier' e vinculados por recipient_id (carrier)
        const { data: advancesData } = await supabase
            .from('advances')
            .select('id, recipient_id, recipient_type, amount, settled_amount, remaining_amount, description, advance_date, status, parent_id')
            .order('advance_date', { ascending: true });

        // Criar mapa de carrier_name -> carrier_id se possível
        // Na verdade, vamos pegar pelo financial_entries com origin_type = 'advance'
        const { data: advanceEntries } = await supabase
            .from('financial_entries')
            .select('id, origin_id, origin_type, partner_id')
            .eq('origin_type', 'advance');

        // Mapear: loading_id -> adiantamentos usados
        // Isso fica nos consumos (advances com parent_id != null)
        const consumedAdvances = (advancesData || []).filter((a: any) => a.parent_id != null);

        // 5) Montar as rows do relatório
        const rows = freightRows.map((f: any) => {
            const loading = loadingsMap.get(f.id);
            const rawPayload = loading?.raw_payload || {};
            const extraExpenses: any[] = Array.isArray(rawPayload.extraExpenses) ? rawPayload.extraExpenses : [];

            // Transações financeiras (pagamentos)
            const transactions = entriesMap.get(f.id) || [];

            // Separar pagamentos normais vs adiantamentos
            const payments: any[] = [];
            const advancesUsed: any[] = [];
            
            transactions.forEach((tx: any) => {
                const isVirtual = tx.account.toLowerCase().includes('contas virtuais') || tx.account.toLowerCase().includes('adiantamento');
                const isAdvance = tx.entryOriginType === 'advance';
                
                if (isVirtual || isAdvance) {
                    advancesUsed.push({
                        date: tx.date,
                        description: tx.description || 'Adiantamento consumido',
                        account: tx.account,
                        value: tx.amount,
                        type: 'advance' as const
                    });
                } else {
                    payments.push({
                        date: tx.date,
                        description: tx.description || 'Pagamento',
                        account: tx.account,
                        value: tx.amount,
                        type: 'payment' as const
                    });
                }
            });

            // Soma despesas extras
            const totalExpenses = extraExpenses.reduce((sum: number, e: any) => sum + (e.value || 0), 0);

            // Calcular se o pagamento veio de mês anterior
            const startMonth = startDate ? new Date(startDate).getMonth() : null;
            const startYear = startDate ? new Date(startDate).getFullYear() : null;
            const allPaymentItems = [...payments, ...advancesUsed];
            const previousMonthPayments = allPaymentItems.filter(p => {
                const payDate = new Date(p.date);
                if (startMonth !== null && startYear !== null) {
                    return payDate.getMonth() < startMonth || payDate.getFullYear() < startYear;
                }
                return false;
            });

            return {
                id: f.id,
                date: f.date,
                carrier: f.carrier_name || '',
                driver: f.driver_name || '',
                plate: f.vehicle_plate || '',
                supplier: f.supplier_name || '',
                destination: f.destination_city || '',
                product: f.product || '',
                // Pesos
                weightOriginKg: Number(f.weight || 0),
                weightUnloadKg: f.unload_weight_kg != null ? Number(f.unload_weight_kg) : null,
                breakageKg: f.breakage_kg != null ? Number(f.breakage_kg) : null,
                freightBase: f.freight_base || 'Origem',
                // Financeiro
                freightPerTon: Number(f.price_per_unit || 0),
                freightValue: Number(f.total_freight || 0),
                advanceValue: (payments.length > 0 || advancesUsed.length > 0) ? advancesUsed.reduce((acc, a) => acc + a.value, 0) : Number(f.advance_value || 0),
                paidValue: (payments.length > 0 || advancesUsed.length > 0) ? payments.reduce((acc, p) => acc + p.value, 0) : Number(f.paid_value || 0),
                totalDiscount: Number(f.total_discount || 0),
                balanceValue: Number(f.balance_value || 0),
                financialStatus: f.financial_status || 'pending',
                // Despesas extras
                extraExpenses,
                totalExpenses,
                // Pagamentos detalhados
                payments,
                advancesUsed,
                previousMonthPayments: previousMonthPayments.length,
                allPayments: [...payments, ...advancesUsed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            };
        });

        // 6) KPIs / Summary
        const totalFreightBruto = rows.reduce((a, b) => a + b.freightValue, 0);
        const totalPago = rows.reduce((a, b) => a + b.paidValue, 0);
        const totalAdiantamentos = rows.reduce((a, b) => a + b.advanceValue, 0);
        const totalDescontos = rows.reduce((a, b) => a + b.totalDiscount, 0);
        const totalSaldo = rows.reduce((a, b) => a + b.balanceValue, 0);
        const totalDespesas = rows.reduce((a, b) => a + b.totalExpenses, 0);
        const totalQuebraKg = rows.reduce((a, b) => a + (b.breakageKg || 0), 0);
        const totalWeightOrigin = rows.reduce((a, b) => a + b.weightOriginKg, 0);
        const totalWeightUnload = rows.reduce((a, b) => a + (b.weightUnloadKg || 0), 0);

        // Calcular saldo disponível de adiantamentos para as transportadoras do relatório
        const carrierIdsInReport = new Set<string>();
        freightRows.forEach((f: any) => {
            const loading = loadingsMap.get(f.id);
            if (loading?.raw_payload?.carrierId) {
                carrierIdsInReport.add(loading.raw_payload.carrierId);
            }
        });
        
        let availableAdvances = 0;
        if (advancesData && advancesData.length > 0) {
            // Apenas parents (parent_id is null) que não estão fully_settled e são das carriers do relatório
            const openAdvances = advancesData.filter((a: any) => 
                !a.parent_id && 
                a.status !== 'fully_settled' && 
                a.status !== 'cancelled' &&
                (carrierIdsInReport.size === 0 || carrierIdsInReport.has(a.recipient_id))
            );
            availableAdvances = openAdvances.reduce((sum: number, a: any) => sum + Number(a.remaining_amount || 0), 0);
        }

        return {
            title: 'Relatório Detalhado de Fretes e Pagamentos',
            subtitle: `Período: ${startDate ? new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''} a ${endDate ? new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''}${carrierName ? ` — ${carrierName}` : ''}`,
            landscape: true,
            columns: [
                { header: 'Data', accessor: 'date', format: 'date', width: 'w-20' },
                { header: 'Transportadora', accessor: 'carrier' },
                { header: 'Motorista', accessor: 'driver' },
                { header: 'Placa', accessor: 'plate' },
                { header: 'Peso Carrego', accessor: 'weightOriginKg', format: 'number', align: 'right' },
                { header: 'Peso Descarrego', accessor: 'weightUnloadKg', format: 'number', align: 'right' },
                { header: 'Quebra', accessor: 'breakageKg', format: 'number', align: 'right' },
                { header: 'Base Cálc', accessor: 'freightBase' },
                { header: 'Valor Frete', accessor: 'freightValue', format: 'currency', align: 'right' },
                { header: 'Saldo', accessor: 'balanceValue', format: 'currency', align: 'right' }
            ],
            rows,
            summary: [
                { label: 'Total Fretes', value: totalFreightBruto, format: 'currency' },
                { label: 'Total Pago (direto)', value: totalPago, format: 'currency' },
                { label: 'Total Adiantamentos', value: totalAdiantamentos, format: 'currency' },
                { label: 'Saldo Adiantamentos Fornecedor', value: availableAdvances, format: 'currency' },
                { label: 'Total Descontos', value: totalDescontos, format: 'currency' },
                { label: 'Saldo Pendente', value: totalSaldo, format: 'currency' },
                { label: 'Despesas Extras', value: totalDespesas, format: 'currency' },
                { label: 'Total Peso Origem (Kg)', value: totalWeightOrigin, format: 'number' },
                { label: 'Total Peso Descarga (Kg)', value: totalWeightUnload, format: 'number' },
                { label: 'Total Quebra (Kg)', value: totalQuebraKg, format: 'number' }
            ]
        };
    },
    Template: Template,
    PdfDocument: PdfDocument
};

export default freightPaymentDetailsReport;
