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
                throw createError('Objeto de vendedor inválido fornecido.', 400);
            }

            console.log(`DEBUG - Iniciando criação de subconta para seller ${seller.id}`);

            if (seller.subaccount_id) {
                console.log(`DEBUG - Seller ${seller.id} já possui subconta: ${seller.subaccount_id}`);
                console.log(`DEBUG - Verificação de dados: apiKey=${seller.subaccount_api_key ? 'presente' : 'ausente'}, walletId=${seller.subaccount_wallet_id ? 'presente' : 'ausente'}`);

                // Se tem subaccount_id mas faltam dados, tentar recuperar
                if (!seller.subaccount_api_key || !seller.subaccount_wallet_id) {
                    console.log('DEBUG - Subconta existe mas dados estão incompletos. Tentando recuperar da API...');

                    const subAccountData = this.formatDataForAsaasSubAccount(seller);
                    const existingSubAccount = await subAccountService.getSubAccountByCpfCnpj(subAccountData.cpfCnpj);

                    if (existingSubAccount.success && existingSubAccount.data) {
                        console.log(`DEBUG - Dados recuperados da subconta existente: ${existingSubAccount.data.id}`);

                        // Atualizar o seller com os dados completos
                        await seller.update({
                            subaccount_api_key: existingSubAccount.data.apiKey || seller.subaccount_api_key || null,
                            subaccount_wallet_id: existingSubAccount.data.walletId || seller.subaccount_wallet_id || null,
                        }, { transaction });

                        return {
                            success: true,
                            data: existingSubAccount.data,
                            message: 'Dados da subconta existente atualizados com sucesso.'
                        };
                    } else {
                        console.warn('WARN - Não foi possível recuperar dados da subconta existente');
                        // Continuar com os dados que temos
                    }
                }

                return {
                    success: true,
                    data: {
                        id: seller.subaccount_id,
                        apiKey: seller.subaccount_api_key,
                        walletId: seller.subaccount_wallet_id
                    },
                    message: 'Seller já possui subconta associada.'
                };
            }

            const subAccountData = this.formatDataForAsaasSubAccount(seller);

            // Primeiro, verificar se já existe uma subconta com este CPF
            console.log(`DEBUG - Verificação de subconta existente: cpfCnpj=${subAccountData.cpfCnpj}`);
            const existingSubAccount = await subAccountService.getSubAccountByCpfCnpj(subAccountData.cpfCnpj);

            if (existingSubAccount.success && existingSubAccount.data) {
                console.log(`DEBUG - Subconta existente encontrada: ${existingSubAccount.data.id}`);
                console.log(`DEBUG - Dados da subconta existente: apiKey=${existingSubAccount.data.apiKey ? 'presente' : 'ausente'}, walletId=${existingSubAccount.data.walletId ? 'presente' : 'ausente'}`);

                // Atualizar o seller com os dados da subconta existente
                await seller.update({
                    subaccount_id: existingSubAccount.data.id,
                    subaccount_api_key: existingSubAccount.data.apiKey || seller.subaccount_api_key || null,
                    subaccount_wallet_id: existingSubAccount.data.walletId || seller.subaccount_wallet_id || null,
                }, { transaction });

                return {
                    success: true,
                    data: existingSubAccount.data,
                    message: 'Subconta existente vinculada com sucesso.'
                };
            }

            // Se não existe, tentar criar uma nova
            console.log(`CPF ${subAccountData.cpfCnpj} não encontrado no Asaas. Criando nova subconta...`);
            const asaasResult = await subAccountService.addSubAccount(subAccountData);

            if (!asaasResult.success) {
                // Se falhou por CPF já em uso, tentar buscar novamente com múltiplas tentativas
                if (asaasResult.message && asaasResult.message.includes('já está em uso')) {
                    console.log('CPF já em uso detectado. Tentando múltiplas recuperações de subconta existente...');

                    // TENTATIVA 1: Buscar novamente imediatamente
                    let retryResult = await subAccountService.getSubAccountByCpfCnpj(subAccountData.cpfCnpj);
                    if (retryResult.success && retryResult.data) {
                        console.log(`DEBUG - Subconta existente recuperada na tentativa 1: ${retryResult.data.id}`);
                        console.log(`DEBUG - Dados da subconta recuperada: apiKey=${retryResult.data.apiKey ? 'presente' : 'ausente'}, walletId=${retryResult.data.walletId ? 'presente' : 'ausente'}`);

                        // Atualizar o seller com os dados da subconta recuperada
                        await seller.update({
                            subaccount_id: retryResult.data.id,
                            subaccount_api_key: retryResult.data.apiKey || seller.subaccount_api_key || null,
                            subaccount_wallet_id: retryResult.data.walletId || seller.subaccount_wallet_id || null,
                        }, { transaction });

                        return {
                            success: true,
                            data: retryResult.data,
                            message: 'Subconta existente recuperada e vinculada após conflito de CPF (tentativa 1).'
                        };
                    }

                    // TENTATIVA 2: Aguardar 1s e tentar novamente
                    console.log('Tentativa 1 falhou. Aguardando 1s e tentando novamente...');
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    retryResult = await subAccountService.getSubAccountByCpfCnpj(subAccountData.cpfCnpj);
                    if (retryResult.success && retryResult.data) {
                        console.log(`DEBUG - Subconta existente recuperada na tentativa 2: ${retryResult.data.id}`);
                        console.log(`DEBUG - Dados da subconta recuperada: apiKey=${retryResult.data.apiKey ? 'presente' : 'ausente'}, walletId=${retryResult.data.walletId ? 'presente' : 'ausente'}`);

                        // Atualizar o seller com os dados da subconta recuperada
                        await seller.update({
                            subaccount_id: retryResult.data.id,
                            subaccount_api_key: retryResult.data.apiKey || seller.subaccount_api_key || null,
                            subaccount_wallet_id: retryResult.data.walletId || seller.subaccount_wallet_id || null,
                        }, { transaction });

                        return {
                            success: true,
                            data: retryResult.data,
                            message: 'Subconta existente recuperada e vinculada após conflito de CPF (tentativa 2).'
                        };
                    }

                    // TENTATIVA 3: Aguardar mais 2s e tentar novamente
                    console.log('Tentativa 2 falhou. Aguardando 2s e tentando novamente...');
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    retryResult = await subAccountService.getSubAccountByCpfCnpj(subAccountData.cpfCnpj);
                    if (retryResult.success && retryResult.data) {
                        console.log(`DEBUG - Subconta existente recuperada na tentativa 3: ${retryResult.data.id}`);
                        console.log(`DEBUG - Dados da subconta recuperada: apiKey=${retryResult.data.apiKey ? 'presente' : 'ausente'}, walletId=${retryResult.data.walletId ? 'presente' : 'ausente'}`);

                        // Atualizar o seller com os dados da subconta recuperada
                        await seller.update({
                            subaccount_id: retryResult.data.id,
                            subaccount_api_key: retryResult.data.apiKey || seller.subaccount_api_key || null,
                            subaccount_wallet_id: retryResult.data.walletId || seller.subaccount_wallet_id || null,
                        }, { transaction });

                        return {
                            success: true,
                            data: retryResult.data,
                            message: 'Subconta existente recuperada e vinculada após conflito de CPF (tentativa 3).'
                        };
                    }

                    // Se todas as tentativas falharam
                    console.error('ERRO CRÍTICO: Todas as tentativas de recuperação de subconta falharam');
                    console.error('Resultado final do Asaas:', JSON.stringify(asaasResult, null, 2));
                    throw createError(`CPF ${subAccountData.cpfCnpj} já está em uso mas não foi possível recuperar a subconta existente após múltiplas tentativas.`, 409);
                }

                console.error('Erro ao criar subconta no Asaas:', JSON.stringify(asaasResult, null, 2));
                // Lança o erro para que a transação externa possa fazer rollback
                throw createError(asaasResult.message || 'Erro desconhecido ao criar subconta no Asaas.', asaasResult.status || 500);
            }

            // Se criou com sucesso, atualizar o seller
            console.log(`DEBUG - Nova subconta criada: ${asaasResult.data.id}`);
            console.log(`DEBUG - Dados da nova subconta: apiKey=${asaasResult.data.apiKey ? 'presente' : 'ausente'}, walletId=${asaasResult.data.walletId ? 'presente' : 'ausente'}`);

            await seller.update({
                subaccount_id: asaasResult.data.id,
                subaccount_api_key: asaasResult.data.apiKey || seller.subaccount_api_key || null,
                subaccount_wallet_id: asaasResult.data.walletId || seller.subaccount_wallet_id || null,
            }, { transaction });

            return {
                success: true,
                data: asaasResult.data,
                message: 'Subconta do Asaas criada com sucesso.'
            };
        } catch (error) {
            console.error('Erro interno no SellerSubAccountService.create:', error.message);
            console.error('Stack trace:', error.stack);

            // Registrar diagnóstico mínimo no seller (em nuvemshop_info) para futura reconciliação
            try {
                const info = seller.nuvemshop_info || {};
                info._subaccount_debug = {
                    lastError: error.message,
                    ts: new Date().toISOString()
                };
                await seller.update({ nuvemshop_info: info });
            } catch (metaErr) {
                console.warn('WARN - Falha ao registrar _subaccount_debug:', metaErr.message);
            }

            // Se conflito de CPF, devolver objeto indicando conflito para camada superior decidir continuar
            const isConflict = error.message && error.message.includes('CPF') && error.message.includes('já está em uso');
            const errObj = createError(error.message || 'Erro interno ao criar subconta', isConflict ? 409 : 500);
            errObj.conflict = isConflict;
            errObj.raw = { message: error.message, stack: error.stack };
            return errObj;
        }
    }

    /**
     * Formata os dados do vendedor para o formato esperado pela API de subcontas do Asaas.
     * @param {object} seller - A instância do modelo Seller com as relações `user` e `userData`.
     * @returns {object} - Os dados formatados para a API do Asaas.
     */
    formatDataForAsaasSubAccount(seller) {
        if (!seller || !seller.user || !seller.user.userData) {
            throw createError('Dados insuficientes para formatar para o Asaas. Relações `user` e `userData` são necessárias.', 400);
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
            income_value,
            city
        } = userData;

        // Validação de CPF/CNPJ
        const isPerson = cpf_cnpj && cpf_cnpj.length <= 11;
        if (isPerson && !birth_date) {
            throw createError('Data de nascimento é obrigatória para CPF.', 400);
        }

        const formattedData = {
            name: name || user.username,
            email: email || user.email,
            cpfCnpj: cpf_cnpj,
            loginEmail: email || user.email,
            companyType: company_type,
            phone,
            mobilePhone: mobile_phone,
            address,
            addressNumber: address_number,
            complement,
            province,
            city,
            postalCode: postal_code,
            birthDate: birth_date,
            incomeValue: income_value
        };

        // Remove apenas chaves com valores nulos ou indefinidos, exceto campos obrigatórios
        const requiredFields = ['cpfCnpj', 'mobilePhone', 'incomeValue', 'city'];
        Object.keys(formattedData).forEach(key => {
            if ((formattedData[key] === null || formattedData[key] === undefined) && !requiredFields.includes(key)) {
                delete formattedData[key];
            }
        });

        // Validação adicional para campos obrigatórios
        if (!formattedData.cpfCnpj) {
            throw createError('CPF/CNPJ é obrigatório para criar subconta', 400);
        }
        if (!formattedData.mobilePhone) {
            throw createError('Telefone celular é obrigatório para criar subconta', 400);
        }
        if (!formattedData.incomeValue) {
            throw createError('Valor de renda é obrigatório para criar subconta', 400);
        }
        if (!formattedData.city) {
            throw createError('Cidade é obrigatória para criar subconta', 400);
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
