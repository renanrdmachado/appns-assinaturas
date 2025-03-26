const SellerSubscription = require('../models/SellerSubscription');
const Seller = require('../models/Seller');
const { formatError, createError } = require('../utils/errorHandler');
const SellerValidator = require('../validators/seller-validator');
const subscriptionService = require('./asaas/subscription.service');
const AsaasCustomerService = require('./asaas/customer.service');
const sequelize = require('../config/database');

class SellerSubscriptionService {
    async get(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const subscription = await SellerSubscription.findByPk(id);
            console.log("Service / SellerSubscription: ", subscription ? subscription.id : 'not found');
            
            if (!subscription) {
                return createError(`Assinatura com ID ${id} não encontrada`, 404);
            }
            
            return { success: true, data: subscription };
        } catch (error) {
            console.error('Erro ao buscar assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async getAll() {
        try {
            const subscriptions = await SellerSubscription.findAll();
            
            console.log("Service / All SellerSubscriptions count: ", subscriptions.length);
            return { success: true, data: subscriptions };
        } catch (error) {
            console.error('Erro ao buscar assinaturas de vendedores:', error.message);
            return formatError(error);
        }
    }
    
    async getBySellerId(sellerId) {
        try {
            // Verificar se o vendedor existe
            try {
                SellerValidator.validateId(sellerId);
            } catch (validationError) {
                return formatError(validationError);
            }
            
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError('Vendedor não encontrado', 404);
            }
            
            const subscriptions = await SellerSubscription.findAll({
                where: { seller_id: sellerId }
            });
            
            console.log(`Service / SellerSubscriptions for seller ${sellerId}: `, subscriptions.length);
            return { success: true, data: subscriptions };
        } catch (error) {
            console.error(`Erro ao buscar assinaturas para vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }

    async create(sellerId, data) {
        console.log('SellerSubscription - creating...');
        const transaction = await sequelize.transaction();
        
        try {
            // Verificar se o vendedor existe
            try {
                SellerValidator.validateId(sellerId);
            } catch (validationError) {
                return formatError(validationError);
            }
            
            const seller = await Seller.findByPk(sellerId);
            console.log('Seller:', seller ? seller.id : 'not found');
            if (!seller) {
                return createError('Vendedor não encontrado', 404);
            }
            
            // Verificar se o vendedor tem uma subconta no Asaas
            if (!seller.subaccount_id) {
                return createError('Vendedor não possui uma subconta no Asaas configurada', 400);
            }

            // Verificar se o vendedor já tem assinatura existente no sistema
            const existingSubscriptions = await SellerSubscription.findAll({
                where: { seller_id: sellerId }
            });
            
            if (existingSubscriptions.length > 0) {
                console.log(`Vendedor já tem ${existingSubscriptions.length} assinaturas cadastradas.`);
                // Opcional: Verificar se deseja continuar ou não
            }

            // Verificar se o vendedor tem um ID de cliente no Asaas
            if (!seller.payments_customer_id) {
                return createError('Vendedor não possui um ID de cliente no Asaas. Execute a sincronização com Asaas primeiro.', 400);
            }

            // Verificar se o vendedor tem CPF/CNPJ cadastrado
            if (!seller.Asaas_cpfCnpj) {
                return createError('CPF/CNPJ do vendedor não está preenchido. É necessário para criar assinaturas.', 400);
            }

            // Verificar se o cliente existe no Asaas e tem CPF/CNPJ preenchido
            const asaasCustomer = await AsaasCustomerService.get(seller.payments_customer_id);
            if (!asaasCustomer.success) {
                return createError(`Cliente não encontrado no Asaas: ${asaasCustomer.message}`, 400);
            }

            if (!asaasCustomer.data.cpfCnpj) {
                // Tentar atualizar o cliente no Asaas com o CPF/CNPJ do vendedor
                console.log(`Cliente ${seller.payments_customer_id} sem CPF/CNPJ no Asaas. Atualizando...`);
                const updateResult = await AsaasCustomerService.update(seller.payments_customer_id, {
                    cpfCnpj: seller.Asaas_cpfCnpj
                });
                
                if (!updateResult.success) {
                    return createError(`Não foi possível atualizar o CPF/CNPJ do cliente no Asaas: ${updateResult.message}`, 400);
                }
                
                console.log(`Cliente atualizado no Asaas com CPF/CNPJ: ${seller.Asaas_cpfCnpj}`);
            }
            
            // DEBUG: Exibir dados completos do vendedor
            console.log('DEBUG - Dados do vendedor:', {
                id: seller.id,
                nuvemshop_id: seller.nuvemshop_id,
                payments_customer_id: seller.payments_customer_id,
                subaccount_id: seller.subaccount_id,
                cpfCnpj: seller.Asaas_cpfCnpj
            });
            
            // Validação dos dados necessários para a assinatura local
            if (!data.cycle) {
                console.log("Ciclo não informado na requisição, usando padrão MONTHLY");
                data.cycle = 'MONTHLY';
            } else {
                // Normalizar o formato do ciclo para o formato que o Asaas espera
                const cycleMapping = {
                    'mensal': 'MONTHLY',
                    'semanal': 'WEEKLY',
                    'quinzenal': 'BIWEEKLY',
                    'bimestral': 'BIMONTHLY',
                    'trimestral': 'QUARTERLY',
                    'semestral': 'SEMIANNUALLY',
                    'anual': 'YEARLY'
                };
                
                if (cycleMapping[data.cycle.toLowerCase()]) {
                    data.cycle = cycleMapping[data.cycle.toLowerCase()];
                } else {
                    // Converter para maiúsculas se não for um dos alias conhecidos
                    data.cycle = data.cycle.toUpperCase();
                }
                
                // Validar se o ciclo está no formato aceito pelo Asaas
                const validCycles = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 
                                    'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'];
                if (!validCycles.includes(data.cycle)) {
                    return createError(`Ciclo '${data.cycle}' inválido. Use um dos seguintes: ${validCycles.join(', ')}`, 400);
                }
            }
            
            if (!data.value) {
                return createError('Valor (value) é obrigatório para criar uma assinatura', 400);
            }
            
            if (!data.plan_name) {
                return createError('Nome do plano (plan_name) é obrigatório para criar uma assinatura', 400);
            }
            
            if (!data.next_due_date) {
                console.log("Data de vencimento não informada, usando data atual");
                const currentDate = new Date();
                currentDate.setDate(currentDate.getDate() + 1); // Próximo dia
                data.next_due_date = currentDate.toISOString().split('T')[0];
            }
            
            // Verificar se já existe uma assinatura no Asaas para este vendedor
            console.log("Verificando assinaturas existentes no Asaas para o vendedor...");
            const externalReference = `seller_subscription_${seller.id}`;
            const existingAsaasSubscriptions = await subscriptionService.getByExternalReference(externalReference);
            
            let asaasResult;
            
            if (existingAsaasSubscriptions.success && 
                existingAsaasSubscriptions.data && 
                existingAsaasSubscriptions.data.data && 
                existingAsaasSubscriptions.data.data.length > 0) {
                
                const existingSubscription = existingAsaasSubscriptions.data.data[0];
                console.log(`Assinatura já existe no Asaas com ID ${existingSubscription.id} para o vendedor ${seller.id}`);
                
                // Usar a assinatura existente
                asaasResult = {
                    success: true,
                    data: existingSubscription,
                    message: 'Assinatura já existente no Asaas'
                };
                
                // Opcionalmente, atualizar a assinatura existente
                if (data.update_if_exists === true) {
                    console.log(`Atualizando assinatura existente ${existingSubscription.id}...`);
                    
                    // Formatar dados para o Asaas para atualização
                    const asaasUpdateData = this.formatDataForAsaasUpdate({
                        value: data.value,
                        next_due_date: data.next_due_date,
                        cycle: data.cycle,
                        plan_name: data.plan_name,
                        billing_type: data.billing_type
                    });
                    
                    // Atualizar assinatura no Asaas
                    asaasResult = await subscriptionService.update(existingSubscription.id, asaasUpdateData);
                    
                    if (!asaasResult.success) {
                        console.error(`Erro ao atualizar assinatura existente: ${asaasResult.message}`);
                        return asaasResult;
                    }
                }
            } else {
                // Formatar dados para o Asaas para criação
                const asaasSubscriptionData = this.formatDataForAsaasSubscription(data, seller);
                
                // DEBUG: Exibir dados completos formatados para o Asaas
                console.log('DEBUG - Dados formatados para Asaas:', asaasSubscriptionData);
                
                // Criar assinatura no Asaas
                console.log('Criando assinatura no Asaas...', asaasSubscriptionData);
                asaasResult = await subscriptionService.create(asaasSubscriptionData);
                
                // DEBUG: Exibir resposta do Asaas
                console.log('DEBUG - Resposta do Asaas:', 
                    asaasResult.success ? 
                    { id: asaasResult.data.id, status: asaasResult.data.status } :
                    { error: asaasResult.message });
                
                // Se houver erro no Asaas, retornar o erro
                if (!asaasResult.success) {
                    console.error('Erro ao criar assinatura no Asaas:', asaasResult.message);
                    await transaction.rollback();
                    return asaasResult;
                }
            }
            
            // Juntar o ID do vendedor com os dados da requisição
            const subscriptionData = {
                ...data,
                seller_id: sellerId,
                external_id: asaasResult.data.id, // Salvar o ID externo do Asaas
                status: this.mapAsaasStatusToLocalStatus(asaasResult.data.status),
                billing_type: asaasResult.data.billingType || data.billing_type || 'BOLETO',
                cycle: asaasResult.data.cycle || data.cycle
            };
            
            // Criar padrão para data de início
            if (!subscriptionData.start_date) {
                subscriptionData.start_date = new Date();
            }
            
            // Status padrão
            if (!subscriptionData.status) {
                subscriptionData.status = 'pending';
            }
            
            // Criar assinatura no banco local usando a transação
            console.log('Criando assinatura no banco local...', {
                seller_id: subscriptionData.seller_id,
                external_id: subscriptionData.external_id,
                plan_name: subscriptionData.plan_name,
                cycle: subscriptionData.cycle,
                value: subscriptionData.value
            });
            
            const subscription = await SellerSubscription.create(subscriptionData, { transaction });
            
            // Confirmar a transação
            await transaction.commit();
            
            console.log('SellerSubscription created:', subscription.id);
            return { 
                success: true, 
                data: subscription,
                asaasData: asaasResult.data
            };
        } catch (error) {
            // Reverter a transação em caso de erro
            await transaction.rollback();
            console.error('Erro ao criar assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async update(id, data) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const subscription = await SellerSubscription.findByPk(id);
            
            if (!subscription) {
                return createError(`Assinatura com ID ${id} não encontrada`, 404);
            }
            
            // Se tiver ID externo, atualizar no Asaas primeiro
            if (subscription.external_id) {
                // Formatar dados para o Asaas
                const asaasSubscriptionData = this.formatDataForAsaasUpdate(data);
                
                // Atualizar assinatura no Asaas
                console.log(`Atualizando assinatura ID ${subscription.external_id} no Asaas...`);
                const asaasResult = await subscriptionService.update(subscription.external_id, asaasSubscriptionData);
                
                // Se houver erro no Asaas, retornar o erro
                if (!asaasResult.success) {
                    console.error(`Erro ao atualizar assinatura ID ${subscription.external_id} no Asaas:`, asaasResult.message);
                    return asaasResult;
                }
                
                // Atualizar status local com base no status do Asaas
                if (asaasResult.data && asaasResult.data.status) {
                    data.status = this.mapAsaasStatusToLocalStatus(asaasResult.data.status);
                }
            } else {
                console.warn(`Assinatura ID ${id} não possui ID externo no Asaas para atualização`);
            }
            
            await subscription.update(data);
            
            console.log('SellerSubscription updated:', subscription.id);
            return { success: true, data: subscription };
        } catch (error) {
            console.error('Erro ao atualizar assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }
    
    async delete(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const subscription = await SellerSubscription.findByPk(id);
            
            if (!subscription) {
                return createError(`Assinatura com ID ${id} não encontrada`, 404);
            }
            
            // Se tiver ID externo, excluir no Asaas primeiro
            if (subscription.external_id) {
                // Excluir assinatura no Asaas
                console.log(`Excluindo assinatura ID ${subscription.external_id} no Asaas...`);
                const asaasResult = await subscriptionService.delete(subscription.external_id);
                
                // Se houver erro no Asaas, retornar o erro
                if (!asaasResult.success) {
                    console.error(`Erro ao excluir assinatura ID ${subscription.external_id} no Asaas:`, asaasResult.message);
                    return asaasResult;
                }
            } else {
                console.warn(`Assinatura ID ${id} não possui ID externo no Asaas para exclusão`);
            }
            
            await subscription.destroy();
            console.log(`Assinatura com ID ${id} foi excluída com sucesso`);
            return { success: true, message: `Assinatura com ID ${id} foi excluída com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Formata os dados para a criação de assinatura no Asaas
     */
    formatDataForAsaasSubscription(data, seller) {
        // DEBUG: Verificar quais dados estão disponíveis
        console.log('DEBUG - Formatando dados para Asaas subscription:', {
            customerId: data.customer || 'não especificado',
            sellerCustomerId: seller.payments_customer_id || 'não especificado',
            sellerSubaccountId: seller.subaccount_id || 'não especificado',
            hasMetadata: data.metadata ? 'sim' : 'não',
            cpfCnpj: seller.Asaas_cpfCnpj || 'não especificado'
        });
        
        // Usar o ID do cliente do vendedor no Asaas que já foi verificado
        // e garantindo que tem CPF/CNPJ associado
        const customerId = seller.payments_customer_id;
        
        if (!customerId) {
            console.error('ERRO: Nenhum customer_id válido para assinatura!');
            throw new Error('Customer ID é obrigatório para criar assinatura');
        }
        
        console.log('Customer ID para assinatura:', customerId);
        
        // Normalizar o ciclo para o formato que o Asaas espera
        let cycle = data.cycle || 'MONTHLY';
        const cycleMapping = {
            'mensal': 'MONTHLY',
            'semanal': 'WEEKLY',
            'quinzenal': 'BIWEEKLY',
            'bimestral': 'BIMONTHLY',
            'trimestral': 'QUARTERLY',
            'semestral': 'SEMIANNUALLY',
            'anual': 'YEARLY'
        };
        
        if (cycleMapping[cycle.toLowerCase()]) {
            cycle = cycleMapping[cycle.toLowerCase()];
        } else {
            // Converter para maiúsculas se não for um dos alias conhecidos
            cycle = cycle.toUpperCase();
        }
        
        // Mapear campos do nosso modelo para o formato esperado pelo Asaas
        const asaasData = {
            customer: customerId, // ID do cliente no Asaas
            billingType: data.billing_type || 'BOLETO', // Tipo de cobrança
            value: data.value, // Valor da assinatura
            nextDueDate: data.next_due_date, // Data de vencimento
            cycle: cycle, // Ciclo de cobrança normalizado
            description: data.plan_name || 'Assinatura SaaS', // Descrição
        };
        
        // Adicionar campos opcionais apenas se estiverem definidos
        if (data.max_payments) asaasData.maxPayments = data.max_payments;
        
        // Referência externa deve ser um identificador único e consistente
        // Usando ID da nossa aplicação
        asaasData.externalReference = `seller_subscription_${seller.id}`;
        
        if (data.end_date) asaasData.endDate = data.end_date;
        if (data.discount) asaasData.discount = data.discount;
        if (data.interest) asaasData.interest = data.interest;
        if (data.fine) asaasData.fine = data.fine;
        
        // Adicionar metadata se existir
        if (data.metadata) {
            // Se for preciso mesclar metadata com outras informações
            asaasData.metadata = { 
                ...data.metadata, 
                source: 'appns-assinaturas',
                seller_id: seller.id,
                cpfCnpj: seller.Asaas_cpfCnpj
            };
        } else {
            asaasData.metadata = {
                source: 'appns-assinaturas',
                seller_id: seller.id,
                cpfCnpj: seller.Asaas_cpfCnpj
            };
        }
        
        return asaasData;
    }
    
    /**
     * Formata os dados para a atualização de assinatura no Asaas
     */
    formatDataForAsaasUpdate(data) {
        // Mapear campos do nosso modelo para o formato esperado pelo Asaas
        const asaasData = {};
        
        if (data.value !== undefined) asaasData.value = data.value;
        if (data.next_due_date !== undefined) asaasData.nextDueDate = data.next_due_date;
        if (data.cycle !== undefined) asaasData.cycle = data.cycle;
        if (data.plan_name !== undefined) asaasData.description = data.plan_name;
        if (data.end_date !== undefined) asaasData.endDate = data.end_date;
        if (data.max_payments !== undefined) asaasData.maxPayments = data.max_payments;
        if (data.billing_type !== undefined) asaasData.billingType = data.billing_type;
        
        return asaasData;
    }
    
    /**
     * Mapeia status do Asaas para status local
     */
    mapAsaasStatusToLocalStatus(asaasStatus) {
        const statusMap = {
            'ACTIVE': 'active',
            'INACTIVE': 'inactive',
            'EXPIRED': 'inactive',
            'OVERDUE': 'overdue',
            'PENDING': 'pending'
        };
        
        return statusMap[asaasStatus] || 'pending';
    }
}

module.exports = new SellerSubscriptionService();
