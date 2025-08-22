const { formatError, createError } = require('../../utils/errorHandler');
const Seller = require('../../models/Seller');
const Shopper = require('../../models/Shopper');
const Order = require('../../models/Order');
const ShopperSubscription = require('../../models/ShopperSubscription');
const User = require('../../models/User');
const UserData = require('../../models/UserData');
const { Op } = require('sequelize');

/**
 * Classe de serviço para operações com Assinaturas relacionadas a um Seller
 */
class SellerSubscriptionsService {
    /**
     * Lista todas as assinaturas de shoppers vinculados a um seller
     * @param {string} sellerId - ID do seller
     * @param {Object} params - Parâmetros para filtragem opcional
     * @returns {Object} - Resultado da operação
     */
    async getSellerSubscriptions(sellerId, params = {}) {
        try {
            if (!sellerId) {
                return createError('ID do vendedor é obrigatório', 400);
            }

            // Verificar se o vendedor existe
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError(`Vendedor com ID ${sellerId} não encontrado`, 404);
            }

            // Buscar pedidos deste vendedor
            const orders = await Order.findAll({
                where: { seller_id: sellerId },
                attributes: ['id', 'shopper_id'],
                raw: true
            });

            if (orders.length === 0) {
                return { success: true, data: [], message: 'Este vendedor não possui pedidos' };
            }

            // Extrair IDs de pedidos 
            const orderIds = orders.map(order => order.id);

            // Construir condições de pesquisa
            const whereConditions = { order_id: { [Op.in]: orderIds } };
            
            // Adicionar filtros adicionais se fornecidos
            if (params.status) {
                whereConditions.status = params.status;
            }
            if (params.plan_name) {
                whereConditions.plan_name = { [Op.like]: `%${params.plan_name}%` };
            }

            // Buscar as assinaturas completas com suas relações
            const subscriptions = await ShopperSubscription.findAll({
                where: whereConditions,
                include: [
                    {
                        model: Shopper,
                        as: 'shopper',
                        include: [
                            {
                                model: User,
                                as: 'user',
                                include: [{ model: UserData, as: 'userData' }]
                            }
                        ]
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: params.limit ? parseInt(params.limit) : 50,
                offset: params.offset ? parseInt(params.offset) : 0
            });

            // Contar total de assinaturas para paginação
            const total = await ShopperSubscription.count({ where: whereConditions });

            return { 
                success: true, 
                data: subscriptions,
                pagination: {
                    total,
                    limit: params.limit ? parseInt(params.limit) : 50,
                    offset: params.offset ? parseInt(params.offset) : 0
                }
            };
        } catch (error) {
            console.error(`Erro ao listar assinaturas do vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Lista todas as assinaturas de um shopper específico vinculado a um seller
     * @param {string} sellerId - ID do seller
     * @param {string} shopperId - ID do shopper
     * @param {Object} params - Parâmetros para filtragem opcional
     * @returns {Object} - Resultado da operação
     */
    async getSellerShopperSubscriptions(sellerId, shopperId, params = {}) {
        try {
            if (!sellerId) {
                return createError('ID do vendedor é obrigatório', 400);
            }

            if (!shopperId) {
                return createError('ID do cliente é obrigatório', 400);
            }

            // Verificar se o vendedor existe
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError(`Vendedor com ID ${sellerId} não encontrado`, 404);
            }

            // Verificar se o shopper existe
            const shopper = await Shopper.findByPk(shopperId);
            if (!shopper) {
                return createError(`Cliente com ID ${shopperId} não encontrado`, 404);
            }

            // Verificar se existe algum pedido que conecte este shopper ao seller
            const orders = await Order.findAll({
                where: {
                    seller_id: sellerId,
                    shopper_id: shopperId
                },
                attributes: ['id'],
                raw: true
            });

            if (orders.length === 0) {
                return createError(`Cliente com ID ${shopperId} não está vinculado a este vendedor`, 404);
            }

            // Extrair IDs de pedidos
            const orderIds = orders.map(order => order.id);

            // Construir condições de pesquisa
            const whereConditions = { 
                order_id: { [Op.in]: orderIds },
                shopper_id: shopperId
            };
            
            // Adicionar filtros adicionais se fornecidos
            if (params.status) {
                whereConditions.status = params.status;
            }

            // Buscar as assinaturas completas
            const subscriptions = await ShopperSubscription.findAll({
                where: whereConditions,
                include: [
                    {
                        model: Shopper,
                        as: 'shopper',
                        include: [
                            {
                                model: User,
                                as: 'user',
                                include: [{ model: UserData, as: 'userData' }]
                            }
                        ]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });

            return { success: true, data: subscriptions };
        } catch (error) {
            console.error(`Erro ao buscar assinaturas do cliente ${shopperId} para o vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Obtém detalhes de uma assinatura específica vinculada a um seller
     * @param {string} sellerId - ID do seller
     * @param {string} subscriptionId - ID da assinatura
     * @returns {Object} - Resultado da operação
     */
    async getSellerSubscriptionById(sellerId, subscriptionId) {
        try {
            if (!sellerId) {
                return createError('ID do vendedor é obrigatório', 400);
            }

            if (!subscriptionId) {
                return createError('ID da assinatura é obrigatório', 400);
            }

            // Verificar se o vendedor existe
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError(`Vendedor com ID ${sellerId} não encontrado`, 404);
            }

            // Buscar a assinatura com suas relações
            const subscription = await ShopperSubscription.findByPk(subscriptionId, {
                include: [
                    {
                        model: Shopper,
                        as: 'shopper',
                        include: [
                            {
                                model: User,
                                as: 'user',
                                include: [{ model: UserData, as: 'userData' }]
                            }
                        ]
                    }
                ]
            });

            if (!subscription) {
                return createError(`Assinatura com ID ${subscriptionId} não encontrada`, 404);
            }

            // Verificar se esta assinatura está associada a um pedido deste seller
            const order = await Order.findByPk(subscription.order_id);
            
            if (!order || order.seller_id.toString() !== sellerId.toString()) {
                return createError(`Esta assinatura não pertence ao vendedor de ID ${sellerId}`, 403);
            }

            return { success: true, data: subscription };
        } catch (error) {
            console.error(`Erro ao buscar assinatura ${subscriptionId} do vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Atualiza uma assinatura completa
     */
    async updateSubscription(sellerId, subscriptionId, updateData) {
        try {
            if (!sellerId || !subscriptionId) {
                return createError('ID do vendedor e da assinatura são obrigatórios', 400);
            }

            // Verificar se a assinatura pertence ao seller
            const subscriptionCheck = await this.getSellerSubscriptionById(sellerId, subscriptionId);
            if (subscriptionCheck) {
                return subscriptionCheck;
            }

            // Filtrar apenas campos permitidos para atualização
            const allowedFields = ['status', 'price', 'notes'];
            const filteredData = {};
            
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });

            if (Object.keys(filteredData).length === 0) {
                return createError('Nenhum campo válido para atualização foi fornecido', 400);
            }

            // Atualizar a assinatura
            const [updatedRows] = await ShopperSubscription.update(filteredData, {
                where: { id: subscriptionId }
            });

            if (updatedRows === 0) {
                return createError('Nenhuma assinatura foi atualizada', 400);
            }

            // Buscar a assinatura atualizada
            const updatedSubscription = await this.getSellerSubscriptionById(sellerId, subscriptionId);
            
            return {
                success: true,
                data: updatedSubscription.data,
                message: 'Assinatura atualizada com sucesso'
            };
        } catch (error) {
            console.error(`Erro ao atualizar assinatura ${subscriptionId}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Atualiza apenas o status da assinatura
     */
    async updateSubscriptionStatus(sellerId, subscriptionId, status) {
        try {
            return await this.updateSubscription(sellerId, subscriptionId, { status });
        } catch (error) {
            console.error(`Erro ao atualizar status da assinatura ${subscriptionId}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Atualiza preço da assinatura
     */
    async updateSubscriptionPrice(sellerId, subscriptionId, price) {
        try {
            return await this.updateSubscription(sellerId, subscriptionId, { price });
        } catch (error) {
            console.error(`Erro ao atualizar preço da assinatura ${subscriptionId}:`, error.message);
            return formatError(error);
        }
    }
}

module.exports = new SellerSubscriptionsService();