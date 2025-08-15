#!/usr/bin/env node

/**
 * Script de "força bruta" para testar diferentes estratégias de criação de assinatura
 * Usage: node force-subscription.js [seller_id]
 */

const SellerSubscriptionService = require('./services/seller-subscription.service');

// Dados de teste para seller 23 baseados no seu log
const testData = {
    sellerId: '23',
    planData: { 
        plan_name: 'Plano Pro', 
        value: 29.9, 
        cycle: 'MONTHLY' 
    },
    billingInfo: {
        billingType: 'CREDIT_CARD',
        name: 'Loja demo',
        email: 'marcos.paulo.barbosa.702@ufrn.edu.br',
        cpfCnpj: '70248084461',
        phone: '84981343393',
        remoteIp: '189.124.179.107',
        creditCard: {
            holderName: 'marcos paulo barbosa',
            number: '5114770410898563',
            expiryMonth: '06',
            expiryYear: '2026',
            ccv: '980'
        },
        creditCardHolderInfo: {
            name: 'Loja demo',
            email: 'marcos.paulo.barbosa.702@ufrn.edu.br',
            cpfCnpj: '70248084461',
            mobilePhone: '84981343393',
            addressNumber: '0',
            postalCode: '59082110'
        }
    }
};

async function testStrategy1_DiagnosticOnly(data) {
    console.log('\n=== ESTRATÉGIA 1: APENAS DIAGNÓSTICO ===');
    
    try {
        const asaasHeaders = {
            'Accept': 'application/json',
            'access_token': process.env.AS_TOKEN
        };
        
        // Executar diagnóstico no customer atual
        await SellerSubscriptionService._fullCustomerDiagnostic('cus_000006937381', asaasHeaders);
        
        return { success: true, message: 'Diagnóstico executado' };
        
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function testStrategy2_NormalFlow(data) {
    console.log('\n=== ESTRATÉGIA 2: FLUXO NORMAL (SEM MUDANÇAS) ===');
    
    try {
        const result = await SellerSubscriptionService.createSubscription(
            data.sellerId,
            data.planData,
            data.billingInfo
        );
        
        return result;
        
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function testStrategy3_MinimalPayload(data) {
    console.log('\n=== ESTRATÉGIA 3: PAYLOAD ULTRA-MÍNIMO ===');
    
    // Payload extremamente reduzido
    const minimalBillingInfo = {
        billingType: 'CREDIT_CARD',
        name: data.billingInfo.name,
        email: data.billingInfo.email,
        cpfCnpj: data.billingInfo.cpfCnpj,
        phone: data.billingInfo.phone,
        remoteIp: data.billingInfo.remoteIp,
        creditCard: {
            holderName: data.billingInfo.creditCard.holderName,
            number: data.billingInfo.creditCard.number,
            expiryMonth: data.billingInfo.creditCard.expiryMonth,
            expiryYear: data.billingInfo.creditCard.expiryYear,
            ccv: data.billingInfo.creditCard.ccv
        }
        // Removendo creditCardHolderInfo completamente para ver se o Asaas aceita
    };
    
    try {
        const result = await SellerSubscriptionService.createSubscription(
            data.sellerId,
            data.planData,
            minimalBillingInfo
        );
        
        return result;
        
    } catch (error) {
        return { success: false, message: error.message };
    }
}

async function runAllStrategies(data) {
    console.log('🧪 TESTE MULTI-ESTRATÉGIAS PARA FORÇAR CRIAÇÃO DE ASSINATURA');
    console.log('Seller ID:', data.sellerId);
    console.log('Customer ID esperado: cus_000006937381');
    console.log('═'.repeat(80));
    
    const strategies = [
        { name: 'Diagnóstico Apenas', fn: testStrategy1_DiagnosticOnly },
        { name: 'Fluxo Normal', fn: testStrategy2_NormalFlow },
        { name: 'Payload Minimal', fn: testStrategy3_MinimalPayload }
    ];
    
    for (const [index, strategy] of strategies.entries()) {
        console.log(`\n🔄 Executando ${strategy.name}...`);
        
        try {
            const result = await strategy.fn(data);
            
            if (result.success) {
                console.log(`✅ ${strategy.name}: SUCESSO!`);
                if (result.data) {
                    console.log('Dados da assinatura:', JSON.stringify(result.data, null, 2));
                }
                console.log('\n🎉 PROBLEMA RESOLVIDO! Parando aqui.');
                return { success: true, strategy: strategy.name, result };
            } else {
                console.log(`❌ ${strategy.name}: FALHOU`);
                console.log('Motivo:', result.message);
            }
            
        } catch (error) {
            console.log(`💥 ${strategy.name}: ERRO CRÍTICO`);
            console.log('Erro:', error.message);
        }
        
        // Pausa entre estratégias para evitar rate limiting
        if (index < strategies.length - 1) {
            console.log('⏳ Aguardando 3s antes da próxima estratégia...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('\n😞 TODAS AS ESTRATÉGIAS FALHARAM');
    console.log('Sugestões:');
    console.log('1. Verificar se a conta Asaas está funcionando normalmente');
    console.log('2. Tentar recriar o customer do zero');
    console.log('3. Entrar em contato com o suporte do Asaas');
    
    return { success: false, message: 'Todas estratégias falharam' };
}

// Executar se chamado diretamente
if (require.main === module) {
    const sellerId = process.argv[2] || testData.sellerId;
    const dataToUse = { ...testData, sellerId };
    
    runAllStrategies(dataToUse).then((result) => {
        console.log('\n🏁 Teste multi-estratégias finalizado.');
        console.log('Resultado final:', result.success ? 'SUCESSO' : 'FALHA');
        process.exit(result.success ? 0 : 1);
    }).catch(err => {
        console.error('💥 Erro fatal no teste:', err.message);
        console.error(err.stack);
        process.exit(1);
    });
}

module.exports = { runAllStrategies, testData };
