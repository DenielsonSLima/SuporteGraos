const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testManageUsers() {
    console.log('🚀 Testing manage-users Edge Function...');

    // 1. Test LIST
    console.log('\n--- Testing LIST ---');
    const { data: listData, error: listError } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' }
    });

    if (listError) {
        console.error('❌ LIST Error:', listError);
    } else {
        console.log('✅ LIST Success:', listData.users?.length, 'users found.');
    }

    // 2. Test CREATE
    console.log('\n--- Testing CREATE ---');
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: createData, error: createError } = await supabase.functions.invoke('manage-users', {
        body: {
            action: 'create',
            firstName: 'Test',
            lastName: 'User',
            cpf: '123.456.789-00',
            email: testEmail,
            phone: '(00) 00000-0000',
            role: 'Operador',
            permissions: ['home'],
            generatePassword: true
        }
    });

    if (createError) {
        console.error('❌ CREATE Error:', createError);
    } else {
        console.log('✅ CREATE Success. User ID:', createData.user_id, 'Generated Password:', createData.generated_password);

        // 3. Test UPDATE (Inactivate)
        console.log('\n--- Testing UPDATE (Inactivate) ---');
        const { data: updateData, error: updateError } = await supabase.functions.invoke('manage-users', {
            body: {
                action: 'update',
                userId: createData.user_id,
                active: false
            }
        });

        if (updateError) {
            console.error('❌ UPDATE Error:', updateError);
        } else {
            console.log('✅ UPDATE Success.');
        }

        // 4. Test DELETE (Hard Delete)
        console.log('\n--- Testing DELETE (Hard Delete) ---');
        const { data: deleteData, error: deleteError } = await supabase.functions.invoke('manage-users', {
            body: {
                action: 'delete',
                userId: createData.user_id
            }
        });

        if (deleteError) {
            console.error('❌ DELETE Error:', deleteError);
        } else {
            console.log('✅ DELETE Success.');
        }
    }
}

testManageUsers().catch(console.error);
