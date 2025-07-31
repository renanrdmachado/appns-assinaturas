const SellerService = require('../../services/seller.service');
const AsaasCustomerService = require('../../services/asaas/customer.service');
const SellerSubscriptionService = require('../../services/seller-subscription.service');

/**
 * Completa os dados do seller (CPF/CNPJ) e ativa integração com Asaas
 */
async function completeSellerData(req, res) {
    try {
        const { sellerId } = req.params;
        const { cpfCnpj, name, phone, address } = req.body;

        // Validar dados obrigatórios
        if (!cpfCnpj) {
            return res.status(400).json({
                success: false,
                message: 'CPF/CNPJ é obrigatório'
            });
        }

        // Buscar seller
        const sellerResult = await SellerService.get(sellerId);
        if (!sellerResult.success) {
            return res.status(404).json(sellerResult);
        }

        const seller = sellerResult.data;

        // Verificar se seller precisa de documentos
        if (seller.app_status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Seller não está pendente de documentos'
            });
        }

        // Atualizar dados do seller
        const updateResult = await SellerService.updateSellerDocuments(sellerId, {
            cpfCnpj,
            name,
            phone,
            address
        });

        if (!updateResult.success) {
            return res.status(400).json(updateResult);
        }

        res.json({
            success: true,
            message: 'Dados completados e integração com Asaas ativada com sucesso',
            data: updateResult.data
        });

    } catch (error) {
        console.error('Erro ao completar dados do seller:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
}

/**
 * Verifica o status de pendência de documentos do seller
 */
async function checkSellerStatus(req, res) {
    try {
        const { sellerId } = req.params;

        const sellerResult = await SellerService.get(sellerId);
        if (!sellerResult.success) {
            return res.status(404).json(sellerResult);
        }

        const seller = sellerResult.data;

        res.json({
            success: true,
            data: {
                seller_id: seller.id,
                app_status: seller.app_status,
                needsDocuments: seller.app_status === 'pending',
                has_asaas_integration: !!seller.payments_customer_id,
                store_name: seller.nuvemshop_info?.name?.pt || seller.nuvemshop_info?.name,
                store_email: seller.nuvemshop_info?.email
            }
        });

    } catch (error) {
        console.error('Erro ao verificar status do seller:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
}

module.exports = {
    completeSellerData,
    checkSellerStatus
};
