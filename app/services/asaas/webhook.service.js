require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const SellerService = require('../seller.service');
const { formatError } = require('../../utils/errorHandler');

class WebhookService {
    async registerWebhook(webhookData) {
        try {
            // Validate required fields
            if (!webhookData.url) {
                throw new Error('URL é obrigatória para o webhook');
            }

            // Ensure 'events' is provided as an array
            if (!Array.isArray(webhookData.events) || webhookData.events.length === 0) {
                throw new Error('Pelo menos um evento deve ser especificado');
            }

            // Set defaults if not provided
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
            return formatError(error);
        }
    }

    async getWebhookById(id) {
        try {
            if (!id) {
                throw new Error('ID do webhook é obrigatório');
            }
            
            const webhook = await AsaasApiClient.request({
                method: 'GET',
                endpoint: `webhooks/${id}`
            });
            
            return { success: true, data: webhook };
        } catch (error) {
            return formatError(error);
        }
    }

    async updateWebhook(id, webhookData) {
        try {
            if (!id) {
                throw new Error('ID do webhook é obrigatório');
            }

            const updated = await AsaasApiClient.request({
                method: 'PUT',
                endpoint: `webhooks/${id}`,
                data: webhookData
            });

            return { success: true, data: updated };
        } catch (error) {
            return formatError(error);
        }
    }

    async deleteWebhook(id) {
        try {
            if (!id) {
                throw new Error('ID do webhook é obrigatório');
            }

            await AsaasApiClient.request({
                method: 'DELETE',
                endpoint: `webhooks/${id}`
            });

            return { success: true, message: 'Webhook excluído com sucesso' };
        } catch (error) {
            return formatError(error);
        }
    }

    async processWebhookEvent(eventData) {
        try {
            // Log the webhook event
            console.log('Webhook event received:', JSON.stringify(eventData));
            
            if (!eventData.payment || !eventData.payment.id) {
                console.error('Invalid webhook data: Missing payment information');
                return { success: false, message: 'Invalid webhook data' };
            }

            // Find the related entity (seller or customer) based on payment information
            const paymentInfo = eventData.payment;
            const entityInfo = await this.findEntityByPayment(paymentInfo);
            
            // Process the webhook event based on its type
            switch(eventData.event) {
                case 'PAYMENT_CREATED':
                    console.log(`Payment created: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        console.log(`Payment ${paymentInfo.id} belongs to ${entityInfo.type} ${entityInfo.entity.id}`);
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'PENDING');
                    } else {
                        console.warn(`Could not find entity for payment ${paymentInfo.id}`);
                    }
                    break;
                    
                case 'PAYMENT_RECEIVED':
                case 'PAYMENT_CONFIRMED':
                    console.log(`Payment confirmed: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        console.log(`Payment ${paymentInfo.id} belongs to ${entityInfo.type} ${entityInfo.entity.id}`);
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'RECEIVED');
                    } else {
                        console.warn(`Could not find entity for payment ${paymentInfo.id}`);
                    }
                    break;
                    
                case 'PAYMENT_OVERDUE':
                    console.log(`Payment overdue: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        console.log(`Payment ${paymentInfo.id} belongs to ${entityInfo.type} ${entityInfo.entity.id}`);
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'OVERDUE');
                    } else {
                        console.warn(`Could not find entity for payment ${paymentInfo.id}`);
                    }
                    break;
                
                case 'PAYMENT_REFUNDED':
                    console.log(`Payment refunded: ${paymentInfo.id}`);
                    if (entityInfo.entity) {
                        console.log(`Payment ${paymentInfo.id} belongs to ${entityInfo.type} ${entityInfo.entity.id}`);
                        await this.updatePaymentStatus(entityInfo.entity, entityInfo.type, paymentInfo, 'REFUNDED');
                    } else {
                        console.warn(`Could not find entity for payment ${paymentInfo.id}`);
                    }
                    break;
                
                default:
                    console.warn(`Unhandled event type: ${eventData.event}`);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error processing webhook:', error);
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
                console.log(`Looking for seller with payments_customer_id: ${paymentInfo.customer}`);
                
                // Get all sellers to find one with matching customer ID
                const sellers = await SellerService.getAll();
                
                if (sellers && sellers.length > 0) {
                    // Log all customer IDs to help with debugging
                    console.log('Available customer IDs in our database:');
                    sellers.forEach(s => {
                        if (s.payments_customer_id) {
                            console.log(`Seller ID ${s.id}, customer ID: ${s.payments_customer_id}`);
                        }
                    });
                    
                    // Filter sellers to find one with matching payments_customer_id
                    const sellerWithCustomerId = sellers.find(seller => 
                        seller.payments_customer_id && seller.payments_customer_id === paymentInfo.customer
                    );
                    
                    if (sellerWithCustomerId) {
                        console.log(`Found seller by customer ID ${paymentInfo.customer}: Seller ID ${sellerWithCustomerId.id}`);
                        return { entity: sellerWithCustomerId, type: 'seller' };
                    } else {
                        console.log(`No seller found with customer ID ${paymentInfo.customer}`);
                    }
                } else {
                    console.log('No sellers found in database');
                }
            } else {
                console.log('Warning: Payment info does not contain customer ID');
            }

            // Second priority: Check if payment matches a payment/subscription ID
            if (paymentInfo.id) {
                console.log(`Looking for seller with payments_subscription_id: ${paymentInfo.id}`);
                
                const sellers = await SellerService.getAll();
                
                // Filter sellers to find one with matching payments_subscription_id
                const sellerWithSubId = sellers.find(seller => 
                    seller.payments_subscription_id && seller.payments_subscription_id === paymentInfo.id
                );
                
                if (sellerWithSubId) {
                    console.log(`Found seller by payment ID ${paymentInfo.id}: Seller ID ${sellerWithSubId.id}`);
                    return { entity: sellerWithSubId, type: 'seller' };
                } else {
                    console.log(`No seller found with payment ID ${paymentInfo.id}`);
                }
            }

            // Third priority: Try to extract seller ID from description if it exists
            if (paymentInfo.description && paymentInfo.description.trim() !== '') {
                console.log(`Checking description field: "${paymentInfo.description}"`);
                
                // If description is formatted as seller ID or contains it
                const descMatch = paymentInfo.description.match(/seller[_-]?id[:\s]?(\d+)/i);
                if (descMatch && descMatch[1]) {
                    const sellerId = descMatch[1];
                    const seller = await SellerService.get(sellerId);
                    if (seller) {
                        console.log(`Found seller by description reference ${sellerId}: Seller ID ${seller.id}`);
                        return { entity: seller, type: 'seller' };
                    }
                }
            }

            // If no entity found
            console.warn(`No entity found for payment ID ${paymentInfo.id}, customer ${paymentInfo.customer}`);
            console.warn('Please verify that the customer ID in the webhook matches the payments_customer_id stored in your database');
            return { entity: null, type: null };
        } catch (error) {
            console.error('Error finding entity for payment:', error);
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
