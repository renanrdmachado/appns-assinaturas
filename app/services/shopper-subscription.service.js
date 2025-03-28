const ShopperSubscription = require('../models/ShopperSubscription');
const Order = require('../models/Order');
const Shopper = require('../models/Shopper');
const { formatError, createError } = require('../utils/errorHandler');
const subscriptionService = require('./asaas/subscription.service');
const AsaasCustomerService = require('./asaas/customer.service');
const sequelize = require('../config/database');

class ShopperSubscriptionService {
    async get(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const subscription = await ShopperSubscription.findByPk(id);
            console.log("Service / ShopperSubscription: ", subscription ? subscription.id : 'not found');
            
            if (!subscription) {
                return createError(`Assinatura com ID ${id} não encontrada`, 404);
            }
            
            return { success: true, data: subscription };
        } catch (error) {
            console.error('Erro ao buscar assinatura de comprador:', error.message);
            return formatError(error);
        }
    }
    
    async getAll() {
        try {
            const subscriptions = await ShopperSubscription.findAll();
            
            console.log("Service / All ShopperSubscriptions count: ", subscriptions.length);
            return { success: true, data: subscriptions };
        } catch (error) {
            console.error('Erro ao buscar assinaturas de compradores:', error.message);
            return formatError(error);
        }
    }
    
    async getByShopperId(shopperId) {
        try {
            if (!shopperId) {
                return createError('ID do comprador é obrigatório', 400);
            }
            
            const shopper = await Shopper.findByPk(shopperId);
            if (!shopper) {
                return createError('Comprador não encontrado', 404);
            }
            
            const subscriptions = await ShopperSubscription.findAll({
                where: { shopper_id: shopperId }
            });
            
            console.log(`Service / ShopperSubscriptions for shopper ${shopperId}: `, subscriptions.length);
            return { success: true, data: subscriptions };
        } catch (error) {
            console.error(`Erro ao buscar assinaturas para comprador ${shopperId}:`, error.message);
            return formatError(error);
        }
    }
    
    async getByOrderId(orderId) {
        try {
            if (!orderId) {
                return createError('ID do pedido é obrigatório', 400);
            }
            
            const order = await Order.findByPk(orderId);
            if (!order) {
                return createError('Pedido não encontrado', 404);
            }
            
            const subscriptions = await ShopperSubscription.findAll({
                where: { order_id: orderId }
            });
            
            console.log(`Service / ShopperSubscriptions for order ${orderId}: `, subscriptions.length);
            return { success: true, data: subscriptions };
        } catch (error) {
            console.error(`Erro ao buscar assinaturas para pedido ${orderId}:`, error.message);
            return formatError(error);
        }
    }

    async create(orderId, data) {
        console.log('ShopperSubscription - creating from order...');
        console.log('Order ID:', orderId);
        console.log('Data recebida:', JSON.stringify(data, null, 2));
        const transaction = await sequelize.transaction();
        
        try {
            // Verificar se o pedido existe
            if (!orderId) {
                return createError('ID do pedido é obrigatório', 400);
            }
            
            const order = await Order.findByPk(orderId);
            
            if (!order) {
                return createError('Pedido não encontrado', 404);
            }
            
            // Extrair shopper_id do pedido
            const shopperId = order.shopper_id;
            
            if (!shopperId) {
                return createError('ID do comprador não encontrado no pedido', 400);
            }
            
            // Verificar se o comprador existe
            const shopper = await Shopper.findByPk(shopperId);
            
            if (!shopper) {
                return createError('Comprador não encontrado', 404);
            }
            
            // Verificar se já existe uma assinatura para este pedido
            const existingSubscription = await ShopperSubscription.findOne({
                where: { order_id: orderId }
            });
            
            if (existingSubscription) {
                console.log(`Assinatura já existe para o pedido ${orderId}`);
                return { 
                    success: false, 
                    message: 'Já existe uma assinatura para este pedido',
                    status: 400
                };
            }
            
            // Obter ou reutilizar o cliente no Asaas se já existir
            let customerId = shopper.asaas_customer_id;
            
            if (!customerId) {
                console.log('Comprador não possui ID de cliente no Asaas. Verificando se já existe...');
                
                // Verificar se shopper tem CPF/CNPJ
                if (!shopper.cpfCnpj) {
                    return createError('CPF/CNPJ do comprador não está preenchido. É necessário para criar assinaturas.', 400);
                }
                
                // Verificar se já existe um cliente com este CPF/CNPJ no Asaas antes de criar um novo
                const existingCustomer = await AsaasCustomerService.findByCpfCnpj(
                    shopper.cpfCnpj,
                    AsaasCustomerService.SHOPPER_GROUP
                );
                
                if (existingCustomer.success && existingCustomer.data) {
                    console.log(`Cliente já existe no Asaas com CPF/CNPJ ${shopper.cpfCnpj}. Reutilizando ID: ${existingCustomer.data.id}`);
                    customerId = existingCustomer.data.id;
                    
                    // Atualizar shopper com o ID do cliente
                    await shopper.update({ asaas_customer_id: customerId });
                    console.log(`Comprador ${shopper.id} atualizado com ID de cliente Asaas existente: ${customerId}`);
                } else {
                    // Criar novo cliente no Asaas somente se não existir
                    const customerData = {
                        name: shopper.name,
                        email: shopper.email,
                        cpfCnpj: shopper.cpfCnpj,
                        mobilePhone: shopper.mobilePhone,
                        address: shopper.address,
                        addressNumber: shopper.addressNumber,
                        province: shopper.province,
                        postalCode: shopper.postalCode,
                        externalReference: `shopper_${shopper.id}`,
                        groupName: AsaasCustomerService.SHOPPER_GROUP
                    };
                    
                    const customerResult = await AsaasCustomerService.create(customerData);
                    
                    if (!customerResult.success) {
                        return createError(`Não foi possível criar cliente no Asaas: ${customerResult.message}`, 400);
                    }
                    
                    customerId = customerResult.data.id;
                    
                    // Atualizar shopper com o ID do cliente
                    await shopper.update({ asaas_customer_id: customerId });
                    console.log(`Comprador ${shopper.id} atualizado com ID de cliente Asaas: ${customerId}`);
                }
            } else {
                console.log(`Comprador ${shopper.id} já possui ID de cliente Asaas: ${customerId}. Reutilizando...`);
            }
            
            // Resto do processo de criação da assinatura continua igual
            
            // VERIFICAR DATA DE VENCIMENTO - Não pode ser menor que hoje
            let nextDueDate = data.next_due_date || order.next_due_date;
            console.log('Data original da Order:', order.next_due_date);
            console.log('Data de vencimento extraída antes do processamento:', nextDueDate);
            console.log('Tipo da data extraída:', typeof nextDueDate);
            
            // Garantir que a data de vencimento é uma data válida e maior ou igual a hoje
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Verificar se a data é válida
            if (!nextDueDate) {
                await transaction.rollback();
                return createError('Data de vencimento (next_due_date) é obrigatória para criar uma assinatura', 400);
            }
            
            const dueDate = new Date(nextDueDate);
            if (isNaN(dueDate.getTime())) {
                await transaction.rollback();
                return createError('Data de vencimento inválida', 400);
            }
            
            // Verificar se a data é menor que hoje
            if (dueDate < today) {
                await transaction.rollback();
                return createError('Data de vencimento não pode ser anterior à data atual', 400);
            }
            
            const subscriptionData = {
                // Usar dados fornecidos ou do pedido
                plan_name: data.plan_name || `Assinatura do Pedido #${order.id}`,
                value: data.value || order.value,
                cycle: data.cycle || order.cycle || 'MONTHLY',
                next_due_date: nextDueDate,
                billing_type: data.billing_type || order.billing_type || 'BOLETO',
                // Armazenar os IDs de relacionamento
                shopper_id: shopperId,
                order_id: orderId
            };
            
            console.log('Dados montados para formatação:', JSON.stringify(subscriptionData, null, 2));
            
            // Criar padrão para data de início
            if (!subscriptionData.start_date) {
                subscriptionData.start_date = new Date();
            }
            
            // Status padrão
            if (!subscriptionData.status) {
                subscriptionData.status = 'pending';
            }
            
            // Criar assinatura no Asaas
            console.log('Formatando dados para assinatura no Asaas...');
            const asaasSubscriptionData = this.formatDataForAsaasSubscription(subscriptionData, customerId, shopper, order);
            
            console.log('Dados formatados para ASAAS:', JSON.stringify(asaasSubscriptionData));
            console.log('Criando assinatura no Asaas...');
            const asaasResult = await subscriptionService.create(asaasSubscriptionData);
            
            // Se houver erro no Asaas, retornar o erro
            if (!asaasResult.success) {
                console.error('Erro ao criar assinatura no Asaas:', asaasResult.message);
                await transaction.rollback();
                return asaasResult;
            }
            
            // Atualizar dados da assinatura com o ID externo
            subscriptionData.external_id = asaasResult.data.id;
            subscriptionData.status = this.mapAsaasStatusToLocalStatus(asaasResult.data.status);
            
            // Criar assinatura no banco local usando a transação
            console.log('Criando assinatura no banco local...');
            const subscription = await ShopperSubscription.create(subscriptionData, { transaction });
            
            // Atualizar pedido com o ID da assinatura se necessário
            if (!order.external_id) {
                await order.update({ 
                    external_id: asaasResult.data.id,
                    status: subscriptionData.status
                }, { transaction });
            }
            
            // Confirmar a transação
            await transaction.commit();
            
            console.log('ShopperSubscription created:', subscription.id);
            return { 
                success: true, 
                data: subscription,
                asaasData: asaasResult.data
            };
        } catch (error) {
            // Reverter a transação em caso de erro
            await transaction.rollback();
            console.error('Erro ao criar assinatura de comprador:', error.message);
            return formatError(error);
        }
    }
    
    async update(id, data) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const subscription = await ShopperSubscription.findByPk(id);
            
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
                
                // Se o pedido tiver o mesmo ID externo, atualizar o status também
                if (subscription.order_id) {
                    const order = await Order.findByPk(subscription.order_id);
                    if (order && order.external_id === subscription.external_id) {
                        await order.update({ status: data.status });
                    }
                }
            } else {
                console.warn(`Assinatura ID ${id} não possui ID externo no Asaas para atualização`);
            }
            
            await subscription.update(data);
            
            console.log('ShopperSubscription updated:', subscription.id);
            return { success: true, data: subscription };
        } catch (error) {
            console.error('Erro ao atualizar assinatura de comprador:', error.message);
            return formatError(error);
        }
    }
    
    async delete(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }
            
            const subscription = await ShopperSubscription.findByPk(id);
            
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
            console.error('Erro ao excluir assinatura de comprador:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Formata os dados para a criação de assinatura no Asaas
     */
    formatDataForAsaasSubscription(data, customerId, shopper, order) {
        // Usar o ID do cliente do shopper no Asaas
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
            customer: customerId,                  // Campo obrigatório: ID do cliente no Asaas
            billingType: data.billing_type || 'BOLETO', // Campo obrigatório: Tipo de cobrança
            value: data.value,                     // Campo obrigatório: Valor da assinatura
            cycle: cycle,                          // Campo obrigatório: Ciclo de cobrança normalizado
            description: data.plan_name || `Assinatura do Pedido #${order.id}`, // Descrição
        };
        
        // Formatar data de vencimento para o formato que o Asaas aceita (YYYY-MM-DD)
        if (data.next_due_date) {
            let dueDate;
            
            if (data.next_due_date instanceof Date) {
                dueDate = data.next_due_date;
            } else if (typeof data.next_due_date === 'string') {
                dueDate = new Date(data.next_due_date);
            } else {
                throw new Error('Formato de data inválido para next_due_date');
            }
            
            // Verificar se a data é válida
            if (isNaN(dueDate.getTime())) {
                throw new Error('Data de vencimento inválida');
            }
            
            // Formatar como YYYY-MM-DD
            const year = dueDate.getFullYear();
            const month = String(dueDate.getMonth() + 1).padStart(2, '0'); // Mês começa em 0
            const day = String(dueDate.getDate()).padStart(2, '0');
            
            asaasData.nextDueDate = `${year}-${month}-${day}`;
            console.log(`Data formatada para Asaas: ${asaasData.nextDueDate}`);
        } else {
            throw new Error('Data de vencimento (next_due_date) é obrigatória');
        }
        
        // Adicionar campos opcionais apenas se estiverem definidos
        if (data.max_payments) asaasData.maxPayments = data.max_payments;
        
        // Referência externa deve ser um identificador único e consistente
        asaasData.externalReference = `order_subscription_${order.id}`;
        
        // Formatar data final se existir (YYYY-MM-DD)
        if (data.end_date) {
            let endDate;
            
            if (data.end_date instanceof Date) {
                endDate = data.end_date;
            } else if (typeof data.end_date === 'string') {
                endDate = new Date(data.end_date);
            } else {
                throw new Error('Formato de data inválido para end_date');
            }
            
            if (isNaN(endDate.getTime())) {
                throw new Error('Data final inválida');
            }
            
            const year = endDate.getFullYear();
            const month = String(endDate.getMonth() + 1).padStart(2, '0');
            const day = String(endDate.getDate()).padStart(2, '0');
            
            asaasData.endDate = `${year}-${month}-${day}`;
        }
        
        if (data.discount) asaasData.discount = data.discount;
        if (data.interest) asaasData.interest = data.interest;
        if (data.fine) asaasData.fine = data.fine;
        
        // Adicionar metadata básica
        asaasData.metadata = {
            source: 'appns-assinaturas',
            order_id: order.id,
            shopper_id: shopper.id
        };
        
        console.log('Dados completos para envio ao Asaas:', JSON.stringify(asaasData, null, 2));
        
        return asaasData;
    }
    
    /**
     * Formata os dados para a atualização de assinatura no Asaas
     */
    formatDataForAsaasUpdate(data) {
        // Mapear campos do nosso modelo para o formato esperado pelo Asaas
        const asaasData = {};
        
        if (data.value !== undefined) asaasData.value = data.value;
        
        // Formatar next_due_date para YYYY-MM-DD se fornecido
        if (data.next_due_date !== undefined) {
            let nextDueDate = data.next_due_date;
            let dueDate;
            
            if (nextDueDate instanceof Date) {
                dueDate = nextDueDate;
            } else if (typeof nextDueDate === 'string') {
                dueDate = new Date(nextDueDate);
            } else {
                throw new Error('Formato de data inválido para next_due_date');
            }
            
            // Verificar se a data é válida
            if (isNaN(dueDate.getTime())) {
                throw new Error('Data de vencimento inválida');
            }
            
            // Formatar no formato YYYY-MM-DD
            const year = dueDate.getFullYear();
            const month = String(dueDate.getMonth() + 1).padStart(2, '0');
            const day = String(dueDate.getDate()).padStart(2, '0');
            
            asaasData.nextDueDate = `${year}-${month}-${day}`;
        }
        
        if (data.cycle !== undefined) asaasData.cycle = data.cycle;
        if (data.plan_name !== undefined) asaasData.description = data.plan_name;
        
        // Formatar end_date para YYYY-MM-DD se fornecido
        if (data.end_date !== undefined) {
            let endDate = data.end_date;
            let endDateObj;
            
            if (endDate instanceof Date) {
                endDateObj = endDate;
            } else if (typeof endDate === 'string') {
                endDateObj = new Date(endDate);
            } else if (endDate === null) {
                // Se a data final for null, significa que queremos removê-la
                asaasData.endDate = null;
                return asaasData;
            } else {
                throw new Error('Formato de data inválido para end_date');
            }
            
            // Verificar se a data é válida
            if (isNaN(endDateObj.getTime())) {
                throw new Error('Data final inválida');
            }
            
            // Formatar no formato YYYY-MM-DD
            const year = endDateObj.getFullYear();
            const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(endDateObj.getDate()).padStart(2, '0');
            
            asaasData.endDate = `${year}-${month}-${day}`;
        }
        
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

module.exports = new ShopperSubscriptionService();
