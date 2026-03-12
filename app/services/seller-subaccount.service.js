const Seller = require('../models/Seller');
const { formatError, createError } = require('../utils/errorHandler');
const SellerValidator = require('../validators/seller-validator');
const subAccountService = require('./asaas/subaccount.service');
const { Op } = require('sequelize');

class SellerSubAccountService {
    /**
     * REFATORADO: Método principal para criar/vincular subconta
     * Usa métodos privados para manter DRY + SOLID
     * Strategy: Busca lista completa → cria se não encontrar → lista novamente se conflito
     */
    async create(seller, transaction) {
        try {
            if (!seller || !seller.id) {
                throw createError('Objeto de vendedor inválido fornecido.', 400);
            }

            console.log(`\n📌 [SELLER #${seller.id}] Iniciando processo de subconta`);

            // CASO 1: Seller já tem subconta vinculada
            if (seller.subaccount_id) {
                console.log(`✅ Seller já possui subaccount_id=${seller.subaccount_id}`);

                // Se faltam dados, tentar recuperar
                if (!seller.subaccount_wallet_id) {
                    console.log(`⚠️  Faltam dados (walletId). Tentando recuperar...`);
                    const { formatDataForAsaasSubAccount } = this;
                    const subAccountData = formatDataForAsaasSubAccount.call(this, seller);
                    const recovered = await this._searchExistingSubaccountInList(subAccountData.cpfCnpj);

                    if (recovered) {
                        await this._updateSellerWithSubaccountData(seller, recovered, transaction);
                        return { success: true, data: recovered, message: 'Dados da subconta recuperados.' };
                    }
                }

                return {
                    success: true,
                    data: {
                        id: seller.subaccount_id,
                        walletId: seller.subaccount_wallet_id,
                        apiKey: seller.subaccount_api_key
                    },
                    message: 'Seller já possui subconta vinculada.'
                };
            }

            // CASO 2: Procurar subconta existente na lista completa (estratégia: sem filtro)
            const formattedData = this.formatDataForAsaasSubAccount(seller);
            const cpfCnpj = formattedData.cpfCnpj;

            console.log(`🔍 Buscando se CPF ${cpfCnpj} já existe...`);
            const existing = await this._searchExistingSubaccountInList(cpfCnpj);

            if (existing) {
                console.log(`✅ Subconta existente encontrada: ${existing.id}`);
                await this._updateSellerWithSubaccountData(seller, existing, transaction);
                return {
                    success: true,
                    data: existing,
                    message: 'Subconta existente vinculada com sucesso.'
                };
            }

            // CASO 3: Criar nova subconta
            console.log(`📝 CPF não encontrado. Criando nova subconta...`);
            const createResult = await subAccountService.addSubAccount(formattedData);

            if (createResult.success) {
                // Criou com sucesso
                console.log(`✅ Nova subconta criada: ${createResult.data.id}`);
                await this._updateSellerWithSubaccountData(seller, createResult.data, transaction);
                return {
                    success: true,
                    data: createResult.data,
                    message: 'Subconta do Asaas criada com sucesso.'
                };
            }

            // CASO 4: Criação falhou - pode ser conflito de CPF
            // Estratégia de recuperação: listar novamente
            if (createResult.message?.includes('já está em uso')) {
                console.log(`⚠️  Conflito detectado (CPF em uso). Tentando listar novamente...`);

                const recovered = await this._searchExistingSubaccountInList(cpfCnpj);
                if (recovered) {
                    console.log(`✅ Subconta recuperada após conflito: ${recovered.id}`);
                    await this._updateSellerWithSubaccountData(seller, recovered, transaction);
                    return {
                        success: true,
                        data: recovered,
                        message: 'Subconta existente recuperada e vinculada (CPF em uso).'
                    };
                }

                // Se mesmo assim não encontrou, é erro irreconciliável
                throw createError(
                    `CPF ${cpfCnpj} em uso mas não foi possível recuperar a subconta`,
                    409
                );
            }

            // Outro erro na criação
            throw createError(
                createResult.message || 'Erro ao criar subconta no Asaas',
                createResult.status || 500
            );

        } catch (error) {
            console.error(`❌ [SELLER #${seller?.id}] Erro ao criar subconta:`, error.message);

            // Registrar diagnóstico
            try {
                const info = seller.nuvemshop_info || {};
                info._subaccount_debug = {
                    lastError: error.message,
                    ts: new Date().toISOString()
                };
                await seller.update({ nuvemshop_info: info });
            } catch (metaErr) {
                console.warn('WARN - Falha ao registrar diagnóstico:', metaErr.message);
            }

            const isConflict = error.message?.includes('CPF') && error.message?.includes('em uso');
            const errObj = createError(error.message || 'Erro interno ao criar subconta', isConflict ? 409 : 500);
            errObj.conflict = isConflict;
            return errObj;
        }
    }

    /**
     * PRIVADO: Extrai e debugua dados da subconta da API
     * @param {object} apiResponse - Resposta bruta da API Asaas
     * @returns {object} {id, walletId, apiKey}
     */
    _extractSubaccountData(apiResponse) {
        console.log('\n   🔍 EXTRAINDO DADOS:');

        const id = apiResponse.id;
        const walletId = apiResponse.walletId;
        const apiKey = apiResponse.accessToken?.apiKey || apiResponse.apiKey;

        console.log(`      id: ${id}`);
        console.log(`      walletId: ${walletId || '❌ AUSENTE!'}`);
        console.log(`      apiKey (accessToken): ${apiResponse.accessToken?.apiKey ? '✓' : '❌ ausente'}`);
        console.log(`      apiKey (root): ${apiResponse.apiKey ? '✓' : '❌ ausente'}`);
        console.log(`      → apiKey final: ${apiKey ? '✓' : '❌ NENHUM!'}`);

        return { id, walletId, apiKey };
    }

    /**
     * PRIVADO: Lista TODAS as subcontas e procura pelo CPF localmente
     * Estratégia: API não retorna quando filtra por CPF, então listamos tudo
     * @param {string} cpfCnpj - CPF/CNPJ normalizado (apenas dígitos)
     * @returns {object|null} Dados da subconta ou null
     */
    async _searchExistingSubaccountInList(cpfCnpj) {
        console.log(`   📋 Listando todas as subcontas para procurar ${cpfCnpj}...`);

        try {
            // Listar subcontas SEM filtro (API bugs com filtro)
            const response = await subAccountService.listAllSubAccounts();

            if (!response.success || !response.data || !Array.isArray(response.data)) {
                console.log(`   ❌ Erro ao listar: ${response.message || 'resposta inválida'}`);
                return null;
            }

            const cpfDigits = String(cpfCnpj).replace(/\D/g, '');
            console.log(`   🔍 Procurando na lista de ${response.data.length} subcontas...`);

            // DEBUG: Exibir todos os CPFs listados
            console.log(`   📊 CPFs encontrados nas subcontas:`);
            for (let i = 0; i < response.data.length; i++) {
                const sub = response.data[i];
                const subCpf = String(sub.cpfCnpj || '').replace(/\D/g, '');
                console.log(`      [${i + 1}] ID: ${sub.id}, CPF: ${sub.cpfCnpj} (digits: ${subCpf}), Email: ${sub.email}`);
            }

            // Procurar na lista
            for (const subconta of response.data) {
                const subCpfDigits = String(subconta.cpfCnpj || '').replace(/\D/g, '');

                if (subCpfDigits === cpfDigits) {
                    console.log(`   ✅ ENCONTRADA na lista! ID: ${subconta.id}`);
                    return subconta;
                }
            }

            console.log(`   ❌ CPF ${cpfDigits} não encontrado na lista`);
            console.log(`      subaccount_wallet_id: ${walletId || '(null)'}`);
            console.log(`      subaccount_api_key: ${apiKey ? '(salvo)' : '(null)'}`);

            await seller.update({
                subaccount_id: id,
                subaccount_wallet_id: walletId || null,
                subaccount_api_key: apiKey || null
            }, { transaction });

            console.log(`   ✅ Seller #${seller.id} atualizado com sucesso\n`);
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
                income_value
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
                throw createError('CPF/CNPJ é obrigatório para criar subconta', 400);
            }
            if (!formattedData.mobilePhone) {
                throw createError('Telefone celular é obrigatório para criar subconta', 400);
            }
            if (!formattedData.incomeValue) {
                throw createError('Valor de renda é obrigatório para criar subconta', 400);
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
