const SellerService = require('../../services/seller.service');
const Seller = require('../../models/Seller');
const User = require('../../models/User');
const UserData = require('../../models/UserData');
const SellerSubscription = require('../../models/SellerSubscription');

/**
 * Completa os dados do seller (CPF/CNPJ) e ativa integração com Asaas
 */
async function completeSellerData(req, res) {
    try {
        const { sellerId } = req.params;
        const { cpfCnpj, name, phone, address, addressNumber, province, postalCode, birthDate } = req.body;

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
            address,
            addressNumber,
            province,
            postalCode,
            birthDate
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

        // Carrega seller com relações para expor userData ao front
        const sellerWithRelations = await Seller.findByPk(sellerId, {
            include: [{
                model: User,
                as: 'user',
                include: [{ model: UserData, as: 'userData' }]
            }]
        });

        if (!sellerWithRelations) {
            return res.status(404).json({ success: false, message: `Seller com ID ${sellerId} não encontrado` });
        }

        // Tentar interpretar nuvemshop_info se for string
        let storeInfo = sellerWithRelations.nuvemshop_info;
        if (typeof storeInfo === 'string') {
            try { storeInfo = JSON.parse(storeInfo); } catch (_) { storeInfo = {}; }
        }

        const userData = sellerWithRelations.user?.userData || null;

        // Buscar assinatura 1:1 do seller (não deletada)
        const subscription = await SellerSubscription.findOne({
            where: { seller_id: sellerWithRelations.id, deleted_at: null },
            order: [['createdAt', 'DESC']]
        });
        const subscriptionStatus = subscription ? subscription.status : null;
        const hasActiveSubscription = !!(subscription && subscription.status === 'active');

        // Determinar documentos completos com base no CPF/CNPJ disponível
        const cpfFromUserData = userData?.cpfCnpj || null;
        const cpfFromStore = storeInfo?.business_id || null;
        const effectiveCpfCnpj = cpfFromUserData || cpfFromStore || null;
        const needsDocuments = !effectiveCpfCnpj; // true se nenhum CPF/CNPJ disponível ainda

        res.json({
            success: true,
            data: {
                seller_id: sellerWithRelations.id,
                app_status: sellerWithRelations.app_status,
                // Front espera needsDocuments true quando não há CPF/CNPJ ainda
                needsDocuments,
                // Status local da assinatura do seller (true apenas se status === 'active')
                has_active_subscription: hasActiveSubscription,
                store_name: storeInfo?.name?.pt || storeInfo?.name || null,
                store_email: storeInfo?.email || sellerWithRelations.user?.email || null,
                // Status da assinatura do seller (1:1)
                subscription_status: subscriptionStatus,
                // Campos auxiliares úteis (opcional)
                subscription_id: subscription?.id || null,
                subscription_external_id: subscription?.external_id || null,
                // Expor userData para o front decidir exibição de captura de cartão
                userData: userData ? {
                    cpfCnpj: userData.cpfCnpj || null,
                    mobilePhone: userData.mobilePhone || null,
                    address: userData.address || null,
                    addressNumber: userData.addressNumber || null,
                    province: userData.province || null,
                    postalCode: userData.postalCode || null,
                    birthDate: userData.birthDate || null
                } : null,
                // Conveniência: cpfCnpj também no topo
                cpfCnpj: effectiveCpfCnpj
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
