/**
 * SplitCalculatorService
 * 
 * Serviço responsável pelo cálculo de divisão de valores (split) entre sistema e seller.
 * Implementa as regras de negócio para distribuição de receitas de assinaturas.
 * 
 * Regras:
 * - Se AS_SPLIT_SYSTEM_PERCENT > 0: usa split percentual
 * - Senão: usa split fixo (AS_SPLIT_SYSTEM_FIXED)
 * - Validações: valor deve ser > 0 e maior que taxa fixa
 */

const { createError } = require('../utils/errorHandler');

class SplitCalculatorService {
    /**
     * Calcula o split entre sistema e seller
     * 
     * @param {number} totalValue - Valor total da assinatura
     * @param {string} sellerWalletId - ID da carteira do seller no Asaas
     * @returns {Object} { success: boolean, split?: Array, error?: Object }
     */
    static calculateSplit(totalValue, sellerWalletId) {
        // Validação: seller deve ter wallet
        if (!sellerWalletId) {
            return {
                success: false,
                error: createError(
                    'Seller não possui carteira configurada (subaccount_wallet_id). Split é obrigatório para criar assinaturas.',
                    400
                )
            };
        }

        // Validação: valor deve ser positivo
        if (!totalValue || totalValue <= 0) {
            return {
                success: false,
                error: createError('Valor da assinatura deve ser maior que zero', 400)
            };
        }

        const systemPercent = parseFloat(process.env.AS_SPLIT_SYSTEM_PERCENT || 0);
        const systemFixed = parseFloat(process.env.AS_SPLIT_SYSTEM_FIXED || 2.0);

        // Determinar tipo de split: percentual ou fixo
        if (systemPercent > 0) {
            return this._calculatePercentualSplit(totalValue, systemPercent, sellerWalletId);
        } else {
            return this._calculateFixedSplit(totalValue, systemFixed, sellerWalletId);
        }
    }

    /**
     * Calcula split percentual
     * Sistema fica com X%, seller fica com (100 - X)%
     */
    static _calculatePercentualSplit(totalValue, systemPercent, sellerWalletId) {
        // Validação: percentual não pode ser >= 100
        if (systemPercent >= 100) {
            return {
                success: false,
                error: createError(
                    'Percentual do sistema deve ser menor que 100%',
                    400
                )
            };
        }

        const sellerPercent = 100 - systemPercent;

        console.log('DEBUG - Split percentual aplicado:', {
            totalValue,
            systemPercent,
            sellerPercent,
            walletId: sellerWalletId
        });

        return {
            success: true,
            split: [
                {
                    walletId: sellerWalletId,
                    percentualValue: sellerPercent
                }
            ]
        };
    }

    /**
     * Calcula split fixo
     * Sistema fica com valor fixo, seller fica com o restante
     */
    static _calculateFixedSplit(totalValue, systemFixed, sellerWalletId) {
        // Validação: valor total deve ser maior que taxa fixa
        if (totalValue <= systemFixed) {
            return {
                success: false,
                error: createError(
                    `Valor da assinatura (R$ ${totalValue.toFixed(2)}) deve ser maior que a taxa do sistema (R$ ${systemFixed.toFixed(2)})`,
                    400
                )
            };
        }

        const sellerFixed = totalValue - systemFixed;

        console.log('DEBUG - Split fixo aplicado:', {
            sysFixed: systemFixed,
            sellerFixed,
            walletId: sellerWalletId
        });

        return {
            success: true,
            split: [
                {
                    walletId: sellerWalletId,
                    fixedValue: sellerFixed
                }
            ]
        };
    }

    /**
     * Valida se um seller está apto a receber splits
     * 
     * @param {Object} seller - Objeto Seller do Sequelize
     * @returns {Object} { success: boolean, error?: Object }
     */
    static validateSellerForSplit(seller) {
        if (!seller) {
            return {
                success: false,
                error: createError('Seller do pedido não encontrado', 404)
            };
        }

        if (!seller.subaccount_wallet_id) {
            return {
                success: false,
                error: createError(
                    'Seller não possui carteira configurada (subaccount_wallet_id). Split é obrigatório para criar assinaturas.',
                    400
                )
            };
        }

        return { success: true };
    }
}

module.exports = SplitCalculatorService;
