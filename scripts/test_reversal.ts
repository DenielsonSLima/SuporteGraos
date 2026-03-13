import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const entryId = '6f4d0c44-cda7-47aa-a32c-ecb68a0c89a0';
    console.log(`Buscando transações originais para entry_id: ${entryId}`);

    const { data: txs, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('entry_id', entryId);

    if (error) {
        console.error('Error fetching tx:', error);
        return;
    }

    console.log(`Encontradas ${txs?.length || 0} transações para reverter.`);

    for (const row of txs || []) {
        console.log(`Revertendo tx ${row.id} - ${row.amount} - ${row.type}`);
        
        const reversalType = row.type.toUpperCase() === 'IN' ? 'OUT' : (row.type === 'debit' ? 'credit' : 'debit');

        const { data: rev, error: revError } = await supabase
            .from('financial_transactions')
            .insert({
                transaction_date: new Date().toISOString().split('T')[0],
                description: `Estorno automático [REV_OF:${row.id}] ${row.description}`,
                amount: Number(row.amount),
                type: reversalType,
                account_id: row.account_id,
                company_id: row.company_id,
            })
            .select('*')
            .single();

        if (revError) {
            console.error('Erro ao reverter:', revError);
        } else {
            console.log('Estorno criado com sucesso:', rev.id);
        }
    }
}

run();
