require('dotenv').config();
const SellerSubscription = require('../models/SellerSubscription');
const Seller = require('../models/Seller');
const AsaasApiClient = require('../helpers/AsaasApiClient');
const { formatError, createError } = require('../utils/errorHandler');
const SellerValidator = require('../validators/seller-validator');
const AsaasCustomerService = require('./asaas/customer.service');
const sequelize = require('../config/database');

class SellerSubscriptionService {
    /**
     * Cria uma assinatura para um seller no Asaas
     * @param {number} sellerId - ID do seller
     * @param {Object} planData - Dados do plano (plan_name, value, cycle)
     * @param {Object} billingInfo - Informações de cobrança
     * @returns {Object} - Resultado da operação
     */
    async createSubscription(sellerId, planData, billingInfo = {}) {
        try {
            console.log(`DEBUG - SellerSubscriptionService.createSubscription chamado com:`, {
                sellerId,
                planData,
                billingInfo
            });
            
            console.log(`Criando assinatura para seller ${sellerId}`);
            
            // Buscar seller
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError(`Seller com ID ${sellerId} não encontrado`, 404);
            }

            // Verificar se seller já tem customer_id no Asaas
            let customerId = seller.payments_customer_id;
            
            console.log('DEBUG - Status do customer:', {
                sellerId: sellerId,
                hasCustomerId: !!customerId,
                customerId: customerId
            });
            
            if (!customerId) {
                // Criar customer no Asaas para o seller
                const nuvemshopInfo = seller.nuvemshop_info ? JSON.parse(seller.nuvemshop_info) : {};
                const customerData = {
                    name: billingInfo.name || nuvemshopInfo.name?.pt || nuvemshopInfo.name || `Seller ${sellerId}`,
                    email: billingInfo.email || nuvemshopInfo.email || `seller${sellerId}@example.com`,
                    cpfCnpj: billingInfo.cpfCnpj || '00000000000',
                    phone: billingInfo.phone || nuvemshopInfo.phone || '00000000000'
                };

                console.log('DEBUG - Criando customer no Asaas com dados:', JSON.stringify(customerData, null, 2));

                const customerResult = await AsaasCustomerService.createCustomer(customerData);
                
                console.log('DEBUG - Resultado da criação do customer:', {
                    success: customerResult.success,
                    customerId: customerResult.data?.id,
                    error: customerResult.success ? null : customerResult.message
                });
                
                if (!customerResult.success) {
                    console.error('DEBUG - Falha ao criar customer:', customerResult);
                    return customerResult;
                }

                customerId = customerResult.data.id;
                
                // Salvar customer_id no seller
                await seller.update({ payments_customer_id: customerId });
                console.log(`Customer criado para seller ${sellerId}: ${customerId}`);
            }

            // Dados da assinatura no Asaas
            const subscriptionData = {
                customer: customerId,
                billingType: billingInfo.billingType || 'PIX',
                cycle: planData.cycle || 'MONTHLY',
                value: planData.value,
                nextDueDate: this.calculateNextDueDate(planData.cycle),
                description: `Assinatura ${planData.plan_name} - Seller ${sellerId}`,
                externalReference: `seller_${sellerId}`,
                // Configurações específicas
                split: null,
                discount: billingInfo.discount || null,
                interest: billingInfo.interest || null,
                fine: billingInfo.fine || null
            };

            // Validar dados obrigatórios antes de enviar para Asaas
            console.log('DEBUG - Validando dados obrigatórios para Asaas...');
            const requiredFields = ['customer', 'billingType', 'cycle', 'value', 'nextDueDate'];
            const missingFields = requiredFields.filter(field => !subscriptionData[field]);
            
            if (missingFields.length > 0) {
                console.error('DEBUG - Campos obrigatórios ausentes:', missingFields);
                return {
                    success: false,
                    message: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
                    data: { missingFields, subscriptionData }
                };
            }

            // Validar valor numérico
            if (isNaN(parseFloat(subscriptionData.value)) || parseFloat(subscriptionData.value) <= 0) {
                console.error('DEBUG - Valor inválido:', subscriptionData.value);
                return {
                    success: false,
                    message: `Valor da assinatura inválido: ${subscriptionData.value}`,
                    data: { value: subscriptionData.value }
                };
            }

            console.log('DEBUG - Dados validados com sucesso');

            // Criar assinatura no Asaas
            console.log('DEBUG - Enviando dados para Asaas:', JSON.stringify(subscriptionData, null, 2));
            
            let asaasSubscription;
            try {
                asaasSubscription = await AsaasApiClient.request({
                    method: 'POST',
                    endpoint: 'subscriptions',
                    data: subscriptionData
                });

                console.log('DEBUG - Resposta do Asaas (sucesso):', JSON.stringify(asaasSubscription, null, 2));
            } catch (asaasError) {
                console.error('DEBUG - Erro na requisição para Asaas:', {
                    message: asaasError.message,
                    status: asaasError.status,
                    asaasError: asaasError.asaasError,
                    subscriptionData: subscriptionData,
                    customerId: customerId,
                    planData: planData,
                    billingInfo: billingInfo
                });
                
                // Se tem erros específicos do Asaas, incluir nos logs
                if (asaasError.asaasError && asaasError.asaasError.errors) {
                    console.error('DEBUG - Erros específicos do Asaas:', asaasError.asaasError.errors);
                }
                
                return {
                    success: false,
                    message: `Erro ao criar assinatura no Asaas: ${asaasError.message}`,
                    error: {
                        message: asaasError.message,
                        status: asaasError.status,
                        asaasErrors: asaasError.asaasError?.errors || [],
                        sentData: subscriptionData
                    }
                };
            }

            console.log('Assinatura criada no Asaas:', asaasSubscription.id);

            // Salvar assinatura no banco local
            const localSubscription = await SellerSubscription.create({
                seller_id: sellerId,
                external_id: asaasSubscription.id,
                plan_name: planData.plan_name,
                value: planData.value,
                status: 'pending', // Inicia como pending até receber confirmação via webhook
                cycle: planData.cycle,
                next_due_date: asaasSubscription.nextDueDate,
                start_date: new Date(),
                payment_method: billingInfo.billingType || 'PIX',
                billing_type: billingInfo.billingType || 'PIX',
                features: planData.features || {},
                metadata: {
                    asaas_customer_id: customerId,
                    asaas_subscription_id: asaasSubscription.id,
                    created_via: 'api'
                }
            });

            return {
                success: true,
                message: 'Assinatura criada com sucesso',
                data: {
                    local_subscription: localSubscription,
                    asaas_subscription: asaasSubscription
                }
            };

        } catch (error) {
            console.error('Erro ao criar assinatura do seller:', error);
            return formatError(error);
        }
    }

    /**
     * Atualiza status da assinatura via webhook
     * @param {string} externalId - ID da assinatura no Asaas
     * @param {string} newStatus - Novo status
     * @param {Object} eventData - Dados do evento webhook
     * @returns {Object} - Resultado da operação
     */
    async updateSubscriptionStatus(externalId, newStatus, eventData = {}) {
        try {
            const subscription = await SellerSubscription.findOne({
                where: { 
                    external_id: externalId,
                    deleted_at: null 
                }
            });

            if (!subscription) {
                return createError(`Assinatura com external_id ${externalId} não encontrada`, 404);
            }

            // Mapear status do Asaas para status local
            const statusMap = {
                'ACTIVE': 'active',
                'EXPIRED': 'expired',
                'OVERDUE': 'overdue',
                'CANCELLED': 'canceled'
            };

            const localStatus = statusMap[newStatus] || newStatus.toLowerCase();

            // Atualizar assinatura
            const updateData = {
                status: localStatus,
                metadata: {
                    ...subscription.metadata,
                    last_webhook_event: eventData.event,
                    last_updated_via_webhook: new Date(),
                    asaas_status: newStatus
                }
            };

            // Se foi cancelada/expirada, definir end_date
            if (['canceled', 'expired'].includes(localStatus)) {
                updateData.end_date = new Date();
            }

            await subscription.update(updateData);

            console.log(`Assinatura ${externalId} atualizada para status ${localStatus}`);

            return {
                success: true,
                message: `Status da assinatura atualizado para ${localStatus}`,
                data: subscription
            };

        } catch (error) {
            console.error('Erro ao atualizar status da assinatura:', error);
            return formatError(error);
        }
    }

    /**
     * Calcula próxima data de vencimento baseada no ciclo
     * @param {string} cycle - Ciclo da assinatura (MONTHLY, YEARLY)
     * @returns {string} - Data formatada
     */
    calculateNextDueDate(cycle = 'MONTHLY') {
        const now = new Date();
        
        switch (cycle.toUpperCase()) {
            case 'MONTHLY':
                now.setMonth(now.getMonth() + 1);
                break;
            case 'YEARLY':
                now.setFullYear(now.getFullYear() + 1);
                break;
            case 'WEEKLY':
                now.setDate(now.getDate() + 7);
                break;
            default:
                // Default para mensal
                now.setMonth(now.getMonth() + 1);
        }

        return now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    }
    /**
     * Busca assinatura ativa de um seller
     * @param {number} sellerId - ID do seller
     * @returns {Object} - Resultado da operação
     */
    async getActiveSubscription(sellerId) {
        try {
            const subscription = await SellerSubscription.findOne({
                where: {
                    seller_id: sellerId,
                    status: ['active', 'overdue'], // Incluir overdue como "ativa"
                    deleted_at: null
                },
                order: [['createdAt', 'DESC']]
            });

            if (!subscription) {
                return createError('Assinatura ativa não encontrada', 404);
            }

            return {
                success: true,
                data: subscription
            };

        } catch (error) {
            console.error('Erro ao buscar assinatura ativa:', error);
            return formatError(error);
        }
    }

    /**
     * Lista todas as assinaturas de um seller
     * @param {number} sellerId - ID do seller
     * @returns {Object} - Resultado da operação
     */
    async getSellerSubscriptions(sellerId) {
        try {
            const subscriptions = await SellerSubscription.findAll({
                where: {
                    seller_id: sellerId,
                    deleted_at: null
                },
                order: [['createdAt', 'DESC']]
            });

            return {
                success: true,
                data: subscriptions
            };

        } catch (error) {
            console.error('Erro ao buscar assinaturas do seller:', error);
            return formatError(error);
        }
    }

    /**
     * Cancela uma assinatura de seller
     * @param {number} sellerId - ID do seller
     * @param {string} reason - Motivo do cancelamento
     * @returns {Object} - Resultado da operação
     */
    async cancelSubscription(sellerId, reason = 'Cancelado pelo usuário') {
        try {
            // Buscar assinatura ativa
            const subscription = await SellerSubscription.findOne({
                where: {
                    seller_id: sellerId,
                    status: ['active', 'pending', 'overdue'],
                    deleted_at: null
                },
                order: [['createdAt', 'DESC']]
            });

            if (!subscription) {
                return createError('Assinatura ativa não encontrada', 404);
            }

            // Cancelar no Asaas se tiver external_id
            if (subscription.external_id) {
                try {
                    await AsaasApiClient.request({
                        method: 'DELETE',
                        endpoint: `subscriptions/${subscription.external_id}`
                    });
                    console.log(`Assinatura ${subscription.external_id} cancelada no Asaas`);
                } catch (asaasError) {
                    console.warn('Erro ao cancelar no Asaas:', asaasError.message);
                    // Continuar com cancelamento local mesmo se falhar no Asaas
                }
            }

            // Atualizar status local
            await subscription.update({
                status: 'canceled',
                end_date: new Date(),
                metadata: {
                    ...subscription.metadata,
                    cancelled_at: new Date(),
                    cancel_reason: reason
                }
            });

            return {
                success: true,
                message: 'Assinatura cancelada com sucesso',
                data: subscription
            };

        } catch (error) {
            console.error('Erro ao cancelar assinatura:', error);
            return formatError(error);
        }
    }

    // Métodos antigos mantidos para compatibilidade
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
            SellerValidator.validateId(sellerId);
            
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

    /**
     * Busca uma assinatura pelo ID externo do Asaas
     * @param {string} externalId - ID da assinatura no Asaas
     * @returns {Promise<Object>} Resultado da operação
     */
    async getByExternalId(externalId) {
        try {
            if (!externalId) {
                return createError('ID externo é obrigatório', 400);
            }
            
            const subscription = await SellerSubscription.findOne({
                where: { external_id: externalId }
            });
            
            if (!subscription) {
                return {
                    success: false,
                    message: `Nenhuma assinatura de vendedor encontrada com ID externo ${externalId}`,
                    status: 404
                };
            }
            
            return { success: true, data: subscription };
        } catch (error) {
            console.error(`Erro ao buscar assinatura de vendedor por ID externo ${externalId}:`, error.message);
            return formatError(error);
        }
    }
}

module.exports = new SellerSubscriptionService();
