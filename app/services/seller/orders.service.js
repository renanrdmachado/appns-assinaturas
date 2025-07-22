const { formatError, createError } = require('../../utils/errorHandler');
const subscriptionValidator = require('../../utils/subscription-validator');
const Seller = require('../../models/Seller');
const Order = require('../../models/Order');
const { Op } = require('sequelize');

/**
 * Classe de serviço para operações com Orders relacionados a um Seller
 */
class SellerOrdersService {
    /**
     * Lista todos os pedidos (orders) vinculados a um seller
     * @param {string} sellerId - ID do seller
     * @param {Object} params - Parâmetros para filtragem opcional
     * @returns {Object} - Resultado da operação
     */
    async getSellerOrders(sellerId, params = {}) {
        try {
            if (!sellerId) {
                return createError('ID do vendedor é obrigatório', 400);
            }

            // Validar assinatura do seller antes de prosseguir
            const subscriptionError = await subscriptionValidator.checkSubscriptionMiddleware(sellerId);
            if (subscriptionError) {
                return subscriptionError;
            }

            // Verificar se o vendedor existe
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError(`Vendedor com ID ${sellerId} não encontrado`, 404);
            }

            // Construir condições de pesquisa
            const whereConditions = { seller_id: sellerId };
            
            // Adicionar filtros adicionais se fornecidos
            if (params.status) {
                whereConditions.status = params.status;
            }
            if (params.reference) {
                whereConditions.reference = { [Op.like]: `%${params.reference}%` };
            }
            if (params.shopper_id) {
                whereConditions.shopper_id = params.shopper_id;
            }

            // Configurar opções de busca - simplificando para não usar associações que podem estar causando problemas
            const findOptions = {
                where: whereConditions,
                order: [['createdAt', 'DESC']],
                limit: params.limit ? parseInt(params.limit) : 50,
                offset: params.offset ? parseInt(params.offset) : 0
            };

            // Buscar os pedidos sem incluir relacionamentos para testar
            const orders = await Order.findAll(findOptions);

            // Contar total de pedidos para paginação
            const total = await Order.count({ where: whereConditions });

            return { 
                success: true, 
                data: orders,
                pagination: {
                    total,
                    limit: params.limit ? parseInt(params.limit) : 50,
                    offset: params.offset ? parseInt(params.offset) : 0
                }
            };
        } catch (error) {
            console.error(`Erro ao listar pedidos do vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Obtém detalhes de um pedido específico vinculado a um seller
     * @param {string} sellerId - ID do seller
     * @param {string} orderId - ID do pedido
     * @returns {Object} - Resultado da operação
     */
    async getSellerOrderById(sellerId, orderId) {
        try {
            if (!sellerId) {
                return createError('ID do vendedor é obrigatório', 400);
            }

            if (!orderId) {
                return createError('ID do pedido é obrigatório', 400);
            }

            // Validar assinatura do seller antes de prosseguir
            const subscriptionError = await subscriptionValidator.checkSubscriptionMiddleware(sellerId);
            if (subscriptionError) {
                return subscriptionError;
            }

            // Verificar se o vendedor existe
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError(`Vendedor com ID ${sellerId} não encontrado`, 404);
            }

            // Buscar o pedido sem incluir associações para testar
            const order = await Order.findOne({
                where: { 
                    id: orderId,
                    seller_id: sellerId
                }
            });

            if (!order) {
                return createError(`Pedido com ID ${orderId} não encontrado para este vendedor`, 404);
            }

            return { success: true, data: order };
        } catch (error) {
            console.error(`Erro ao buscar pedido ${orderId} do vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }
}

module.exports = new SellerOrdersService();