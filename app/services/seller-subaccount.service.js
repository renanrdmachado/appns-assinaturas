const Seller = require('../models/Seller');
const { formatError, createError } = require('../utils/errorHandler');
const SellerValidator = require('../validators/seller-validator');
const subAccountService = require('./asaas/subaccount.service');
const { Op } = require('sequelize');

class SellerSubAccountService {
    /**
     * Cria uma subconta para um vendedor no Asaas
     * @param {number} sellerId - ID do vendedor
     * @param {Object} data - Dados da subconta
     */
    async create(sellerId, data) {
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
            
            // Verificar se o vendedor já tem uma subconta
            if (seller.subaccount_id) {
                return createError(`Vendedor já possui uma subconta associada (ID: ${seller.subaccount_id})`, 400);
            }
            
            // DEBUG: Verificar dados do vendedor
            console.log('DEBUG - Dados do vendedor para criação de subconta:', {
                id: seller.id,
                nuvemshop_id: seller.nuvemshop_id,
                payments_customer_id: seller.payments_customer_id,
                cpfCnpj: seller.Asaas_cpfCnpj || 'não especificado'
            });
            
            // Formatar dados para o Asaas
            const subAccountData = this.formatDataForAsaasSubAccount(data, seller);
            
            // DEBUG: Verificar dados formatados
            console.log('DEBUG - Dados formatados para subconta Asaas:', {
                name: subAccountData.name,
                email: subAccountData.email,
                cpfCnpj: subAccountData.cpfCnpj
            });
            
            // Criar subconta no Asaas
            console.log('Criando subconta no Asaas...', JSON.stringify(subAccountData, null, 2));
            const asaasResult = await subAccountService.addSubAccount(subAccountData);
            
            // DEBUG: Verificar resposta do Asaas
            console.log('DEBUG - Resposta do Asaas para criação de subconta:', 
                asaasResult.success ? 
                { id: asaasResult.data.id, walletId: asaasResult.data.walletId } : 
                { error: asaasResult.message });
            
            // Se houver erro no Asaas, retornar o erro
            if (!asaasResult.success) {
                console.error('Erro ao criar subconta no Asaas:', 
                    JSON.stringify(asaasResult, null, 2));
                return asaasResult;
            }
            
            // Atualizar o vendedor com os dados da subconta criada no Asaas
            const updateData = {
                subaccount_id: asaasResult.data.id,
                subaccount_wallet_id: asaasResult.data.walletId,
                subaccount_api_key: asaasResult.data.apiKey
            };
            
            await seller.update(updateData);
            
            // Buscar o vendedor atualizado para retornar
            const updatedSeller = await Seller.findByPk(sellerId);
            
            console.log('Subconta do vendedor criada com sucesso:', updatedSeller.subaccount_id);
            return { 
                success: true, 
                data: updatedSeller,
                asaasData: asaasResult.data,
                message: 'Subconta do vendedor criada com sucesso'
            };
        } catch (error) {
            console.error('Erro ao criar subconta para vendedor:', error);
            return formatError(error);
        }
    }
    
    /**
     * Busca a subconta de um vendedor
     * @param {number} sellerId - ID do vendedor
     */
    async getBySellerId(sellerId) {
        try {
            // Verificar se o vendedor existe
            try {
                SellerValidator.validateId(sellerId);
            } catch (validationError) {
                return formatError(validationError);
            }
            
            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError('Vendedor não encontrado', 404);
            }
            
            // Verificar se o vendedor tem uma subconta
            if (!seller.subaccount_id) {
                return createError('Vendedor não possui uma subconta associada', 404);
            }
            
            // Buscar detalhes da subconta no Asaas
            const subAccountParams = new URLSearchParams();
            subAccountParams.append('cpfCnpj', seller.Asaas_cpfCnpj);
            
            const asaasResult = await subAccountService.getSubAccountByCpfCnpj(seller.Asaas_cpfCnpj);
            
            // Verificar se encontrou a subconta
            if (!asaasResult) {
                return createError(`Subconta do vendedor não encontrada no Asaas (ID: ${seller.subaccount_id})`, 404);
            }
            
            return { 
                success: true, 
                data: {
                    seller: seller,
                    subaccount: asaasResult
                }
            };
        } catch (error) {
            console.error(`Erro ao buscar subconta do vendedor ID ${sellerId}:`, error.message);
            return formatError(error);
        }
    }
    
    /**
     * Lista todas as subcontas de vendedores
     */
    async getAll() {
        try {
            // Buscar todos os vendedores que possuem subconta
            const sellers = await Seller.findAll({
                where: {
                    subaccount_id: {
                        [Op.ne]: null
                    }
                }
            });
            
            console.log(`Total de vendedores com subcontas: ${sellers.length}`);
            
            // Para cada vendedor, buscar detalhes da subconta no Asaas
            const result = [];
            
            for (const seller of sellers) {
                const subAccountParams = new URLSearchParams();
                subAccountParams.append('cpfCnpj', seller.Asaas_cpfCnpj);
                
                const asaasResult = await subAccountService.getSubAccountByCpfCnpj(seller.Asaas_cpfCnpj);
                
                result.push({
                    seller: seller,
                    subaccount: asaasResult || { id: seller.subaccount_id, message: 'Detalhes da subconta não encontrados no Asaas' }
                });
            }
            
            return { 
                success: true, 
                data: result
            };
        } catch (error) {
            console.error('Erro ao listar subcontas de vendedores:', error.message);
            return formatError(error);
        }
    }
    
    /**
     * Formata os dados para a criação de subconta no Asaas
     * @param {Object} data - Dados da requisição
     * @param {Object} seller - Dados do vendedor
     */
    formatDataForAsaasSubAccount(data, seller) {
        // Mapear campos do nosso modelo para o formato esperado pelo Asaas
        const subAccountData = {
            name: data.name || `Loja ${seller.nuvemshop_id}`,
            email: data.email || seller.Asaas_loginEmail,
            cpfCnpj: data.cpfCnpj || seller.Asaas_cpfCnpj,
            mobilePhone: data.mobilePhone || seller.Asaas_mobilePhone,
            address: data.address || seller.Asaas_address,
            addressNumber: data.addressNumber || seller.Asaas_addressNumber,
            province: data.province || seller.Asaas_province,
            postalCode: data.postalCode || seller.Asaas_postalCode,
            incomeValue: data.incomeValue || seller.Asaas_incomeValue || 5000  // Valor padrão caso não seja informado
        };
        
        // Campos opcionais
        if (data.loginEmail) subAccountData.loginEmail = data.loginEmail;
        if (data.birthDate) subAccountData.birthDate = data.birthDate;
        else if (seller.Asaas_birthDate) subAccountData.birthDate = seller.Asaas_birthDate;
        
        // Verificar se é pessoa física ou jurídica
        const cpfCnpj = subAccountData.cpfCnpj.replace(/\D/g, '');
        if (cpfCnpj.length === 11) {
            // É CPF (pessoa física), precisa de data de nascimento
            if (!subAccountData.birthDate) {
                console.warn('CPF detectado mas birthDate não informado. Usando data atual.');
                // Se não tiver data de nascimento, usa uma data padrão
                const defaultDate = new Date();
                defaultDate.setFullYear(defaultDate.getFullYear() - 30);
                subAccountData.birthDate = defaultDate.toISOString().split('T')[0];
            }
        } else if (cpfCnpj.length === 14) {
            // É CNPJ (pessoa jurídica), precisa de companyType
            if (!data.companyType) {
                // Tipo padrão de empresa: MEI
                subAccountData.companyType = 'MEI';
            } else {
                // Verificar se é um tipo válido
                const validTypes = ['MEI', 'INDIVIDUAL', 'LIMITED', 'ASSOCIATION'];
                if (validTypes.includes(data.companyType.toUpperCase())) {
                    subAccountData.companyType = data.companyType.toUpperCase();
                } else {
                    subAccountData.companyType = 'MEI';
                }
            }
        }
        
        if (data.phone) subAccountData.phone = data.phone;
        if (data.site) subAccountData.site = data.site;
        else if (seller.Asaas_site) subAccountData.site = seller.Asaas_site;
        
        if (data.complement) subAccountData.complement = data.complement;
        
        return subAccountData;
    }
}

module.exports = new SellerSubAccountService();
