const SellerService = require('../../services/seller.service');
const UserService = require('../../services/user.service');
const ShopperService = require('../../services/shopper.service');
const OrderService = require('../../services/order.service');
const { formatError, createError } = require('../../utils/errorHandler');

class LgpdWebhooksController {
    /**
     * Webhook: store/redact
     * Deleta informações da loja após 48h da desinstalação
     */
    async storeRedact(req, res) {
        try {
            console.log('LGPD Webhook - Store Redact recebido:', req.body);
            
            const { store_id } = req.body;
            
            if (!store_id) {
                return res.status(400).json({
                    success: false,
                    message: 'store_id é obrigatório'
                });
            }
            
            // Buscar o seller pela store_id (nuvemshop_id)
            const sellerResult = await SellerService.getByNuvemshopId(store_id.toString());
            
            if (!sellerResult.success) {
                console.log(`Loja ${store_id} não encontrada no banco de dados`);
                return res.status(200).json({
                    success: true,
                    message: 'Loja não encontrada, nenhuma ação necessária'
                });
            }
            
            const seller = sellerResult.data;
            console.log(`Iniciando remoção de dados da loja ${store_id} (Seller ID: ${seller.id})`);
            
            // Deletar o seller (cascade irá remover dados relacionados)
            const deleteResult = await SellerService.delete(seller.id);
            
            if (!deleteResult.success) {
                console.error('Erro ao deletar seller:', deleteResult.message);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao processar remoção de dados'
                });
            }
            
            console.log(`Dados da loja ${store_id} removidos com sucesso`);
            
            return res.status(200).json({
                success: true,
                message: `Dados da loja ${store_id} removidos conforme LGPD`
            });
            
        } catch (error) {
            console.error('Erro no webhook store/redact:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Webhook: customers/redact
     * Remove dados do cliente após período de inatividade
     */
    async customersRedact(req, res) {
        try {
            console.log('LGPD Webhook - Customers Redact recebido:', req.body);
            
            const { store_id, customer, orders_to_redact } = req.body;
            
            if (!store_id || !customer) {
                return res.status(400).json({
                    success: false,
                    message: 'store_id e customer são obrigatórios'
                });
            }
            
            // Buscar o seller pela store_id
            const sellerResult = await SellerService.getByNuvemshopId(store_id.toString());
            
            if (!sellerResult.success) {
                console.log(`Loja ${store_id} não encontrada`);
                return res.status(200).json({
                    success: true,
                    message: 'Loja não encontrada, nenhuma ação necessária'
                });
            }
            
            // Buscar shopper pelo email ou identificação
            let shopperResult;
            
            if (customer.email) {
                // Primeiro tentar por email
                shopperResult = await ShopperService.getByEmail(customer.email);
            }
            
            // Se não encontrou por email e tem identificação, tentar por CPF/CNPJ
            if (!shopperResult?.success && customer.identification) {
                shopperResult = await ShopperService.getByCpfCnpj(customer.identification);
            }
            
            if (!shopperResult?.success) {
                console.log(`Cliente não encontrado no banco de dados: ${customer.email || customer.identification}`);
                return res.status(200).json({
                    success: true,
                    message: 'Cliente não encontrado, nenhuma ação necessária'
                });
            }
            
            const shopper = shopperResult.data;
            console.log(`Iniciando remoção de dados do cliente ${customer.email} (Shopper ID: ${shopper.id})`);
            
            // Remover pedidos específicos se fornecidos
            if (orders_to_redact && orders_to_redact.length > 0) {
                for (const orderId of orders_to_redact) {
                    try {
                        await OrderService.delete(orderId);
                        console.log(`Pedido ${orderId} removido`);
                    } catch (orderError) {
                        console.error(`Erro ao remover pedido ${orderId}:`, orderError.message);
                    }
                }
            }
            
            // Deletar o shopper
            const deleteResult = await ShopperService.delete(shopper.id);
            
            if (!deleteResult.success) {
                console.error('Erro ao deletar shopper:', deleteResult.message);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao processar remoção de dados do cliente'
                });
            }
            
            console.log(`Dados do cliente ${customer.email} removidos com sucesso`);
            
            return res.status(200).json({
                success: true,
                message: `Dados do cliente removidos conforme LGPD`
            });
            
        } catch (error) {
            console.error('Erro no webhook customers/redact:', error);
            return res.status(500).json(formatError(error));
        }
    }
    
    /**
     * Webhook: customers/data_request
     * Processa solicitação de dados do cliente
     */
    async customersDataRequest(req, res) {
        try {
            console.log('LGPD Webhook - Customers Data Request recebido:', req.body);
            
            const { 
                store_id, 
                customer, 
                orders_requested, 
                checkouts_requested, 
                drafts_orders_requested,
                data_request 
            } = req.body;
            
            if (!store_id || !customer || !data_request) {
                return res.status(400).json({
                    success: false,
                    message: 'store_id, customer e data_request são obrigatórios'
                });
            }
            
            // Buscar o seller pela store_id
            const sellerResult = await SellerService.getByNuvemshopId(store_id.toString());
            
            if (!sellerResult.success) {
                console.log(`Loja ${store_id} não encontrada`);
                return res.status(200).json({
                    success: true,
                    message: 'Loja não encontrada, nenhuma ação necessária'
                });
            }
            
            // Buscar dados do cliente
            let shopperResult;
            
            if (customer.email) {
                shopperResult = await ShopperService.getByEmail(customer.email);
            }
            
            if (!shopperResult?.success && customer.identification) {
                shopperResult = await ShopperService.getByCpfCnpj(customer.identification);
            }
            
            let customerData = {
                found: false,
                message: 'Cliente não encontrado nos nossos registros'
            };
            
            if (shopperResult?.success) {
                const shopper = shopperResult.data;
                
                // Coletar dados do cliente
                customerData = {
                    found: true,
                    shopper_id: shopper.id,
                    email: shopper.user?.email,
                    personal_data: shopper.user?.userData,
                    subscriptions: [], // Será preenchido se houver serviço de assinaturas
                    created_at: shopper.createdAt,
                    updated_at: shopper.updatedAt
                };
                
                // Buscar pedidos se solicitados
                if (orders_requested && orders_requested.length > 0) {
                    customerData.orders = [];
                    for (const orderId of orders_requested) {
                        try {
                            const orderResult = await OrderService.get(orderId);
                            if (orderResult.success) {
                                customerData.orders.push(orderResult.data);
                            }
                        } catch (orderError) {
                            console.error(`Erro ao buscar pedido ${orderId}:`, orderError.message);
                        }
                    }
                }
            }
            
            // Log para auditoria
            console.log(`Solicitação de dados processada - Request ID: ${data_request.id}, Cliente: ${customer.email}, Dados encontrados: ${customerData.found}`);
            
            // TODO: Implementar envio de email para o lojista com os dados
            // ou salvar em um local para que o lojista possa acessar
            
            return res.status(200).json({
                success: true,
                message: 'Solicitação de dados processada',
                data_request_id: data_request.id,
                customer_data: customerData
            });
            
        } catch (error) {
            console.error('Erro no webhook customers/data_request:', error);
            return res.status(500).json(formatError(error));
        }
    }
}

module.exports = new LgpdWebhooksController();
