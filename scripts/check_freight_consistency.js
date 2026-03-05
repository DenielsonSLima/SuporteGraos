// ============================================================================
// DIAGNÓSTICO DE FRETES E FINANCEIRO (Rodar no Console do Browser)
// ============================================================================

console.clear();
console.log('🕵️‍♂️ INICIANDO DIAGNÓSTICO DE FRETES...');

async function diagnoseFreight() {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');

    // Configuração automática (tenta pegar do env ou usa valores conhecidos)
    const supabaseUrl = 'https://vqhjbsiwzgxaozcedqcn.supabase.co';
    const supabaseAnonKey = 'sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V';

    const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            storage: window.sessionStorage,
            storageKey: 'supabase.auth.token'
        }
    });

    const { data: session } = await client.auth.getSession();
    if (!session?.session) {
        console.error('❌ ERRO: Não há sessão ativa. Faça login no sistema primeiro.');
        return;
    }

    const user = session.session.user;
    const companyId = user.user_metadata?.companyId || user.app_metadata?.companyId;
    console.log('👤 Usuário:', user.email);
    console.log('🏢 Company ID (Sessão):', companyId);

    // 1. Buscar a carga problemática (ex: valor ~11.152,40)
    console.log('\n🔍 1. Buscando cargas com valor de frete ~11.152,40...');

    const { data: loadings, error: loadingError } = await client
        .from('logistics_loadings')
        .select('*')
        .gte('total_freight_value', 11150)
        .lte('total_freight_value', 11155);

    if (loadingError) {
        console.error('❌ Erro ao buscar loads:', loadingError);
        return;
    }

    if (loadings.length === 0) {
        console.warn('⚠️ Nenhuma carga encontrada com esse valor exato.');
    } else {
        console.log(`✅ Encontradas ${loadings.length} cargas suspeitas.`);

        for (const load of loadings) {
            console.log('--------------------------------------------------');
            console.log(`🚛 Carga ID: ${load.id}`);
            console.log(`   Placa: ${load.vehicle_plate}`);
            console.log(`   Valor Frete: R$ ${load.total_freight_value}`);
            console.log(`   Company ID na Carga: ${load.company_id}`);
            console.log(`   Transportadora: ${load.carrier_name}`);

            if (load.company_id !== companyId) {
                console.error('🚨 MISMATCH DE COMPANY ID! A carga tem um ID diferente do seu usuário.');
                console.log(`   Seu ID: ${companyId}`);
                console.log(`   Load ID: ${load.company_id}`);
            }

            // 2. Buscar Payable associado
            const { data: payables, error: payableError } = await client
                .from('payables')
                .select('*')
                .eq('loading_id', load.id)
                .eq('sub_type', 'freight');

            if (payableError) {
                console.error('   ❌ Erro ao buscar payable:', payableError);
            } else if (payables.length === 0) {
                console.error('   ❌ NENHUM PAYABLE ENCONTRADO PARA ESTA CARGA!');
                console.log('   ➡️ A carga existe no Logística mas NÃO no Financeiro.');
                console.log('   ➡️ RECOMENDAÇÃO: Edite e Salve esta carga novamente para recriar o payable.');
            } else {
                const payable = payables[0];
                console.log(`   ✅ Payable encontrado (ID: ${payable.id})`);
                console.log(`      Valor: R$ ${payable.amount}`);
                console.log(`      Status: ${payable.status}`);
                console.log(`      Company ID no Payable: ${payable.company_id}`);

                if (payable.company_id !== companyId) {
                    console.error('      🚨 PAYABLE COM COMPANY ID DIFERENTE!');
                    console.error('      Isso explica por que não aparece na sua tela.');

                    // Tentar corrigir
                    console.log('      🛠️ Tentando corrigir company_id do Payable...');
                    const { error: updateError } = await client
                        .from('payables')
                        .update({ company_id: companyId })
                        .eq('id', payable.id);

                    if (updateError) console.error('      ❌ Falha ao corrigir:', updateError);
                    else console.log('      ✅ CORRIGIDO! Verifique se apareceu agora.');
                } else {
                    console.log('      ✅ Dados parecem corretos. Verifique filtros de data/status na tela.');
                }
            }
        }
    }
}

// Executar
diagnoseFreight();
