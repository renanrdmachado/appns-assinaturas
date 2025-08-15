#!/usr/bin/env node

/**
 * Script de debug para diagnosticar customer problemático no Asaas
 * Usage: node debug-customer.js [customer_id]
 */

const SellerSubscriptionService = require('./services/seller-subscription.service');

async function debugCustomer(customerId = 'cus_000006937381') {
    console.log(`🔍 Iniciando diagnóstico do customer: ${customerId}`);
    
    try {
        // Headers padrão do Asaas
        const asaasHeaders = {
            'Accept': 'application/json',
            'access_token': process.env.ASAAS_ACCESS_TOKEN || '$aact_YjE4MzZjOTAtMjc1ZS00OWE0LTllOWUtMTEyNjJjMjE2MzQw'
        };
        
        // Executar diagnóstico completo
        const diagnostic = await SellerSubscriptionService._fullCustomerDiagnostic(customerId, asaasHeaders);
        
        if (diagnostic.success) {
            console.log('\n✅ Diagnóstico concluído com sucesso!');
            console.log('📊 Recomendação:', diagnostic.recommendation);
            
            if (diagnostic.missingCritical && diagnostic.missingCritical.length > 0) {
                console.log('\n⚠️  AÇÃO RECOMENDADA: Recriar o customer com dados completos:');
                
                const sampleCustomerData = {
                    name: diagnostic.data.name || 'Nome Completo',
                    email: diagnostic.data.email || 'email@exemplo.com',
                    cpfCnpj: diagnostic.data.cpfCnpj || '12345678901',
                    phone: diagnostic.data.phone || '11999999999'
                };
                
                console.log('Dados sugeridos para recriação:');
                console.log(JSON.stringify(sampleCustomerData, null, 2));
            }
        } else {
            console.error('❌ Falha no diagnóstico:', diagnostic.message);
        }
        
    } catch (error) {
        console.error('💥 Erro crítico no diagnóstico:', error.message);
        console.error(error.stack);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const customerId = process.argv[2] || 'cus_000006937381';
    debugCustomer(customerId).then(() => {
        console.log('\n🏁 Diagnóstico finalizado.');
        process.exit(0);
    }).catch(err => {
        console.error('💥 Erro fatal:', err.message);
        process.exit(1);
    });
}

module.exports = { debugCustomer };
