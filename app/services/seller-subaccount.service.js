const Seller = require('../models/Seller');
const { formatError, createError } = require('../utils/errorHandler');
const SellerValidator = require('../validators/seller-validator');
const subAccountService = require('./asaas/subaccount.service');
const { Op } = require('sequelize');

class SellerSubAccountService {
    /**
     * Cria uma subconta para um vendedor no Asaas.
     * Este método é chamado DENTRO de uma transação maior no seller.service.
     * @param {object} seller - A instância do modelo Seller, recém-criada mas ainda não commitada.
     * @param {object} transaction - A transação Sequelize para garantir a atomicidade.
     * @returns {Promise<object>} - Retorna um objeto com o resultado da operação.
     */
    async create(seller, transaction) {
        try {
            if (!seller || !seller.id) {
                throw new Error('Objeto de vendedor inválido fornecido.');
            }

            if (seller.subaccount_id) {
                return createError(`Vendedor já possui uma subconta associada (ID: ${seller.subaccount_id})`, 400);
            }

            const subAccountData = this.formatDataForAsaasSubAccount(seller);

            const asaasResult = await subAccountService.addSubAccount(subAccountData);

            if (!asaasResult.success) {
                console.error('Erro ao criar subconta no Asaas:', JSON.stringify(asaasResult, null, 2));
                // Lança o erro para que a transação externa possa fazer rollback
                throw new Error(asaasResult.message || 'Erro desconhecido ao criar subconta no Asaas.');
            }

            return {
                success: true,
                data: asaasResult.data,
                message: 'Subconta do Asaas criada com sucesso.'
            };
        } catch (error) {
            console.error('Erro interno no SellerSubAccountService.create:', error.message);
            // Re-lança o erro para garantir que a transação externa falhe
            throw error;
        }
    }

    /**
     * Formata os dados do vendedor para o formato esperado pela API de subcontas do Asaas.
     * @param {object} seller - A instância do modelo Seller com as relações `user` e `userData`.
     * @returns {object} - Os dados formatados para a API do Asaas.
     */
    formatDataForAsaasSubAccount(seller) {
        if (!seller || !seller.user || !seller.user.userData) {
            throw new Error('Dados insuficientes para formatar para o Asaas. Relações `user` e `userData` são necessárias.');
        }

        const { user } = seller;
        const { userData } = user;

        const {
            name,
            email,
            cpf_cnpj,
            company_type,
            phone,
            mobile_phone,
            address,
            address_number,
            complement,
            province,
            postal_code,
            birth_date,
            income_value
        } = userData;

        // Validação de CPF/CNPJ
        const isPerson = cpf_cnpj && cpf_cnpj.length <= 11;
        if (isPerson && !birth_date) {
            throw new Error('Data de nascimento é obrigatória para CPF.');
        }

        const formattedData = {
            name: name || user.username,
            email: email || user.email,
            cpfCnpj: cpf_cnpj,
            loginEmail: email || user.email,
            companyType: company_type,
            phone: phone || mobile_phone,
            mobilePhone: mobile_phone || phone,
            address,
            addressNumber: address_number,
            complement,
            province,
            postalCode: postal_code,
            birthDate: birth_date,
            incomeValue: income_value
        };

        // Remove apenas chaves com valores nulos ou indefinidos, exceto campos obrigatórios
        const requiredFields = ['cpfCnpj', 'mobilePhone', 'incomeValue'];
        Object.keys(formattedData).forEach(key => {
            if ((formattedData[key] === null || formattedData[key] === undefined) && !requiredFields.includes(key)) {
                delete formattedData[key];
            }
        });

        // Validação adicional para campos obrigatórios
        if (!formattedData.cpfCnpj) {
            throw new Error('CPF/CNPJ é obrigatório para criar subconta');
        }
        if (!formattedData.mobilePhone) {
            throw new Error('Telefone celular é obrigatório para criar subconta');
        }
        if (!formattedData.incomeValue) {
            throw new Error('Valor de renda é obrigatório para criar subconta');
        }

        return formattedData;
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
}

module.exports = new SellerSubAccountService();
