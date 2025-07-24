const { formatError, createError } = require('../../utils/errorHandler');
const { checkSubscriptionMiddleware } = require('../../utils/subscription-validator');
const Seller = require('../../models/Seller');
const Shopper = require('../../models/Shopper');
const Order = require('../../models/Order');
const User = require('../../models/User');
const UserData = require('../../models/UserData');
const { Op } = require('sequelize');

/**
 * Classe de serviço para operações com Shoppers relacionados a um Seller
 */
class SellerShoppersService {
    /**
     * Lista todos os shoppers (clientes) vinculados a um seller por meio de orders
     * @param {string} sellerId - ID do seller
     * @param {Object} params - Parâmetros para filtragem opcional
     * @returns {Object} - Resultado da operação
     */
    async getSellerShoppers(sellerId, params = {}) {
        try {
            if (!sellerId) {
                return createError('ID do vendedor é obrigatório', 400);
            }

            // Validar assinatura do seller antes de prosseguir
            const subscriptionError = await checkSubscriptionMiddleware(sellerId);
            if (subscriptionError) {
                return subscriptionError;
            }

            // Verificar se o vendedor existe
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError(`Vendedor com ID ${sellerId} não encontrado`, 404);
            }

            // Buscar pedidos deste vendedor
            const orderIds = await Order.findAll({
                where: { seller_id: sellerId },
                attributes: ['shopper_id'],
                raw: true
            });

            // Extrair IDs únicos de shoppers dos pedidos
            const shopperIds = [...new Set(orderIds.map(order => order.shopper_id))];

            if (shopperIds.length === 0) {
                return { success: true, data: [], message: 'Este vendedor não possui clientes' };
            }

            // Construir condições de pesquisa
            const whereConditions = { id: { [Op.in]: shopperIds } };
            
            // Adicionar filtros adicionais se fornecidos
            if (params.name) {
                whereConditions.name = { [Op.like]: `%${params.name}%` };
            }
            if (params.email) {
                whereConditions.email = { [Op.like]: `%${params.email}%` };
            }

            // Buscar os shoppers completos com suas relações
            const shoppers = await Shopper.findAll({
                where: whereConditions,
                include: [
                    {
                        model: User,
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }]
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: params.limit ? parseInt(params.limit) : 50,
                offset: params.offset ? parseInt(params.offset) : 0
            });

            // Contar total de shoppers para paginação
            const total = await Shopper.count({ where: whereConditions });

            return { 
                success: true, 
                data: shoppers,
                pagination: {
                    total,
                    limit: params.limit ? parseInt(params.limit) : 50,
                    offset: params.offset ? parseInt(params.offset) : 0
                }
            };
        } catch (error) {
            console.error(`Erro ao listar shoppers do vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Obtém detalhes de um shopper específico vinculado a um seller
     * @param {string} sellerId - ID do seller
     * @param {string} shopperId - ID do shopper
     * @returns {Object} - Resultado da operação
     */
    async getSellerShopperById(sellerId, shopperId) {
        try {
            if (!sellerId) {
                return createError('ID do vendedor é obrigatório', 400);
            }

            if (!shopperId) {
                return createError('ID do cliente é obrigatório', 400);
            }

            // Validar assinatura do seller antes de prosseguir
            const subscriptionError = await checkSubscriptionMiddleware(sellerId);
            if (subscriptionError) {
                return subscriptionError;
            }

            // Verificar se o vendedor existe
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError(`Vendedor com ID ${sellerId} não encontrado`, 404);
            }

            // Verificar se existe algum pedido que conecte este shopper ao seller
            const order = await Order.findOne({
                where: {
                    seller_id: sellerId,
                    shopper_id: shopperId
                }
            });

            if (!order) {
                return createError(`Cliente com ID ${shopperId} não está vinculado a este vendedor`, 404);
            }

            // Buscar o shopper com suas relações
            const shopper = await Shopper.findByPk(shopperId, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        include: [{ model: UserData, as: 'userData' }]
                    }
                ]
            });

            if (!shopper) {
                return createError(`Cliente com ID ${shopperId} não encontrado`, 404);
            }

            return { success: true, data: shopper };
        } catch (error) {
            console.error(`Erro ao buscar shopper ${shopperId} do vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }
}

module.exports = new SellerShoppersService();