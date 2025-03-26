require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const SellerService = require('../seller.service');
const { formatError, createError } = require('../../utils/errorHandler');
const AsaasValidator = require('../../validators/asaas-validator'); // Importar o validator

class WebhookService {
    async registerWebhook(webhookData) {
        try {
            // Validar dados do webhook
            if (!webhookData.url) {
                return createError('URL é obrigatória para o webhook', 400);
            }

            // Garantir que 'events' seja fornecido como um array
            if (!Array.isArray(webhookData.events) || webhookData.events.length === 0) {
                return createError('Pelo menos um evento deve ser especificado', 400);
            }

            // Definir valores padrão se não forem fornecidos
            const webhook = {
                name: webhookData.name || 'Assinaturas App Webhook',
                url: webhookData.url,
                email: webhookData.email,
                enabled: webhookData.enabled !== undefined ? webhookData.enabled : true,
                interrupted: webhookData.interrupted !== undefined ? webhookData.interrupted : false,
                authToken: webhookData.authToken || null,
                sendType: webhookData.sendType || 'SEQUENTIALLY',
                events: webhookData.events
            };

            const created = await AsaasApiClient.request({
                method: 'POST',
                endpoint: 'webhooks',
                data: webhook
            });

            return { success: true, data: created };
        } catch (error) {
            console.error('Erro ao registrar webhook:', error);
            return formatError(error);
        }
    }

    async getWebhooks() {
        try {
            const webhooks = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'webhooks'
            });
            return { success: true, data: webhooks };
        } catch (error) {
            console.error('Erro ao listar webhooks:', error);
            return formatError(error);
        }
    }

    async getWebhookById(id) {
        try {
            if (!id) {
                return createError('ID do webhook é obrigatório', 400);
            }
            
            const webhook = await AsaasApiClient.request({
                method: 'GET',
                endpoint: `webhooks/${id}`
            });
            
            return { success: true, data: webhook };
        } catch (error) {
            console.error(`Erro ao buscar webhook ${id}:`, error);
            return formatError(error);
        }
    }

    async updateWebhook(id, webhookData) {
        try {
            if (!id) {
                return createError('ID do webhook é obrigatório', 400);
            }

            const updated = await AsaasApiClient.request({
                method: 'PUT',
                endpoint: `webhooks/${id}`,
                data: webhookData
            });

            return { success: true, data: updated };
        } catch (error) {
            console.error(`Erro ao atualizar webhook ${id}:`, error);
            return formatError(error);
        }
    }

    async deleteWebhook(id) {
        try {
            if (!id) {
                return createError('ID do webhook é obrigatório', 400);
            }

            await AsaasApiClient.request({
                method: 'DELETE',
                endpoint: `webhooks/${id}`
            });

            return { success: true, message: 'Webhook excluído com sucesso' };
        } catch (error) {
            console.error(`Erro ao excluir webhook ${id}:`, error);
            return formatError(error);
        }
    }

    async processWebhookEvent(eventData) {
        try {
            // Registrar o evento de webhook
            console.log('Webhook event received:', JSON.stringify(eventData));
            
            if (!eventData.payment || !eventData.payment.id) {
                return createError('Dados de webhook inválidos: Informações de pagamento ausentes', 400);
            }

            // Encontrar a entidade relacionada (vendedor ou cliente) com base nas informações de pagamento
            const paymentInfo = eventData.payment;
            const entityInfo = await this.findEntityByPayment(paymentInfo);
            
            // Processar o evento de webhook com base em seu tipo
            switch(eventData.event) {
                case 'PAYMENT_CREATED':
                    console.log(`Pagamento criado: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        console.log(`Pagamento ${paymentInfo.id} pertence a ${entityInfo.type} ${entityInfo.entity.id}`);
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'PENDING');
                    } else {
                        console.warn(`Não foi possível encontrar entidade para o pagamento ${paymentInfo.id}`);
                    }
                    break;
                    
                case 'PAYMENT_RECEIVED':
                case 'PAYMENT_CONFIRMED':
                    console.log(`Pagamento confirmado: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        console.log(`Pagamento ${paymentInfo.id} pertence a ${entityInfo.type} ${entityInfo.entity.id}`);
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'RECEIVED');
                    } else {
                        console.warn(`Não foi possível encontrar entidade para o pagamento ${paymentInfo.id}`);
                    }
                    break;
                    
                case 'PAYMENT_OVERDUE':
                    console.log(`Pagamento atrasado: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        console.log(`Pagamento ${paymentInfo.id} pertence a ${entityInfo.type} ${entityInfo.entity.id}`);
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'OVERDUE');
                    } else {
                        console.warn(`Não foi possível encontrar entidade para o pagamento ${paymentInfo.id}`);
                    }
                    break;
                
                case 'PAYMENT_REFUNDED':
                    console.log(`Pagamento reembolsado: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        console.log(`Pagamento ${paymentInfo.id} pertence a ${entityInfo.type} ${entityInfo.entity.id}`);
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'REFUNDED');
                    } else {
                        console.warn(`Não foi possível encontrar entidade para o pagamento ${paymentInfo.id}`);
                    }
                    break;
                
                default:
                    console.warn(`Tipo de evento não tratado: ${eventData.event}`);
            }
            
            return { success: true, message: 'Evento de webhook processado com sucesso' };
        } catch (error) {
            console.error('Erro ao processar webhook:', error);
            return formatError(error);
        }
    }

    /**
     * Find an entity (seller or customer) related to a payment
     * @param {Object} paymentInfo - Payment information from webhook
     * @returns {Object} Object containing entity and type ('seller', 'customer' or null)
     */
    async findEntityByPayment(paymentInfo) {
        try {
            // First priority: Check if payment belongs to a seller by customer ID
            if (paymentInfo.customer) {
                console.log(`Procurando vendedor com payments_customer_id: ${paymentInfo.customer}`);
                
                // Get all sellers to find one with matching customer ID
                const sellers = await SellerService.getAll();
                
                if (sellers && sellers.length > 0) {
                    // Log all customer IDs to help with debugging
                    console.log('IDs de cliente disponíveis em nossa base de dados:');
                    sellers.forEach(s => {
                        if (s.payments_customer_id) {
                            console.log(`Vendedor ID ${s.id}, ID do cliente: ${s.payments_customer_id}`);
                        }
                    });
                    
                    // Filter sellers to find one with matching payments_customer_id
                    const sellerWithCustomerId = sellers.find(seller => 
                        seller.payments_customer_id && seller.payments_customer_id === paymentInfo.customer
                    );
                    
                    if (sellerWithCustomerId) {
                        console.log(`Vendedor encontrado pelo ID do cliente ${paymentInfo.customer}: Vendedor ID ${sellerWithCustomerId.id}`);
                        return { entity: sellerWithCustomerId, type: 'seller' };
                    } else {
                        console.log(`Nenhum vendedor encontrado com ID de cliente ${paymentInfo.customer}`);
                    }
                } else {
                    console.log('Nenhum vendedor encontrado na base de dados');
                }
            } else {
                console.log('Aviso: Informação de pagamento não contém ID do cliente');
            }

            // Second priority: Check if payment matches a payment/subscription ID
            if (paymentInfo.id) {
                console.log(`Procurando vendedor com payments_subscription_id: ${paymentInfo.id}`);
                
                const sellers = await SellerService.getAll();
                
                // Filter sellers to find one with matching payments_subscription_id
                const sellerWithSubId = sellers.find(seller => 
                    seller.payments_subscription_id && seller.payments_subscription_id === paymentInfo.id
                );
                
                if (sellerWithSubId) {
                    console.log(`Vendedor encontrado pelo ID do pagamento ${paymentInfo.id}: Vendedor ID ${sellerWithSubId.id}`);
                    return { entity: sellerWithSubId, type: 'seller' };
                } else {
                    console.log(`Nenhum vendedor encontrado com ID de pagamento ${paymentInfo.id}`);
                }
            }

            // Third priority: Try to extract seller ID from description if it exists
            if (paymentInfo.description && paymentInfo.description.trim() !== '') {
                console.log(`Verificando campo de descrição: "${paymentInfo.description}"`);
                
                // If description is formatted as seller ID or contains it
                const descMatch = paymentInfo.description.match(/seller[_-]?id[:\s]?(\d+)/i);
                if (descMatch && descMatch[1]) {
                    const sellerId = descMatch[1];
                    const seller = await SellerService.get(sellerId);
                    if (seller) {
                        console.log(`Vendedor encontrado pela referência na descrição ${sellerId}: Vendedor ID ${seller.id}`);
                        return { entity: seller, type: 'seller' };
                    }
                }
            }

            // If no entity found
            console.warn(`Nenhuma entidade encontrada para o pagamento ID ${paymentInfo.id}, cliente ${paymentInfo.customer}`);
            console.warn('Verifique se o ID do cliente no webhook corresponde ao payments_customer_id armazenado em sua base de dados');
            return { entity: null, type: null };
        } catch (error) {
            console.error('Erro ao encontrar entidade para o pagamento:', error);
            return { entity: null, type: null };
        }
    }

    /**
     * Update payment status for an entity
     * @param {Object} entity - The entity object (seller or customer)
     * @param {string} entityType - Type of entity ('seller' or 'customer')
     * @param {Object} paymentInfo - Payment information
     * @param {string} status - New payment status
     */
    async updatePaymentStatus(entity, entityType, paymentInfo, status) {
        try {
            if (entityType === 'seller') {
                // Update seller payment status
                await SellerService.update(entity.id, { 
                    payments_status: status,
                    payments_next_due: paymentInfo.dueDate || entity.payments_next_due,
                    payments_last_update: new Date()
                });
                console.log(`Updated payment status for seller ${entity.id} to ${status}`);
            } 
            // Add handling for customer entities when implemented
        } catch (error) {
            console.error(`Error updating payment status for ${entityType} ${entity.id}:`, error);
        }
    }
}

module.exports = new WebhookService();
