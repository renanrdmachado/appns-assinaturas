require('dotenv').config();
const AsaasApiClient = require('../../helpers/AsaasApiClient');
const AsaasValidator = require('../../validators/asaas-validator');
const { formatError, createError } = require('../../utils/errorHandler');

class SubAccountService {
    async addSubAccount(accountData) {
        try {
            // Usar o validator para validar os dados da subconta
            AsaasValidator.validateSubAccountData(accountData);

            console.log(`DEBUG - Iniciando criação/verificação de subconta para CPF: ${accountData.cpfCnpj}`);

            // PRIMEIRA TENTATIVA: Buscar subconta existente
            console.log(`DEBUG - Tentativa 1: Buscando subconta existente...`);
            const params = new URLSearchParams();
            params.append('cpfCnpj', accountData.cpfCnpj);

            let items;
            try {
                items = await AsaasApiClient.request({
                    method: 'GET',
                    endpoint: 'accounts',
                    params
                });
                console.log(`DEBUG - Resultado busca inicial: totalCount=${items.totalCount}, dataLength=${items.data ? items.data.length : 0}`);
            } catch (searchError) {
                console.warn(`DEBUG - Erro na busca inicial de subconta: ${searchError.message}`);
                // Se falhar a busca, assumir que não existe e tentar criar
                items = { totalCount: 0, data: [] };
            }

            let subAccountData;
            const diagnostics = {
                cpfRaw: accountData.cpfCnpj,
                attempts: [],
                conflict: false,
                reused: false
            };
            diagnostics.attempts.push({ stage: 'initial_lookup', total: items.totalCount, ts: Date.now() });
            if (items.totalCount > 0) {
                // CPF já existe, reutilizar subconta existente
                console.log(`CPF ${accountData.cpfCnpj} já existe no Asaas. Reutilizando subconta existente...`);
                subAccountData = items.data[0];

                // Verificar se a subconta está ativa
                if (subAccountData.status !== 'APPROVED') {
                    console.warn(`Subconta existente tem status: ${subAccountData.status}. Pode haver restrições.`);
                }

                console.log(`DEBUG - Subconta existente recuperada: ID=${subAccountData.id}, apiKey=${subAccountData.apiKey ? 'presente' : 'ausente'}, walletId=${subAccountData.walletId ? 'presente' : 'ausente'}`);
                return { success: true, data: subAccountData };
            }

            // SEGUNDA TENTATIVA: Criar nova subconta
            console.log(`CPF ${accountData.cpfCnpj} não encontrado. Tentando criar nova subconta...`);
            try {
                subAccountData = await AsaasApiClient.request({
                    method: 'POST',
                    endpoint: 'accounts',
                    data: accountData
                });
                console.log(`DEBUG - Nova subconta criada com sucesso: ID=${subAccountData.id}`);
                return { success: true, data: subAccountData };
            } catch (err) {
                console.error('Erro ao criar subconta no Asaas:', err.message);
                if (err.response) {
                    console.error('DEBUG - Detalhes response (status/body):', err.status, JSON.stringify(err.response?.data || {}, null, 2));
                } else if (err.asaasError) {
                    console.error('DEBUG - asaasError bruto:', JSON.stringify(err.asaasError, null, 2));
                }

                // Se falhou por CPF já em uso, fazer múltiplas tentativas de busca
                if (err.message && err.message.includes('CPF') && err.message.includes('já está em uso')) {
                    console.log('CPF já em uso detectado. Fazendo múltiplas tentativas de recuperação...');
                    diagnostics.conflict = true;

                    // TENTATIVA 2: Buscar novamente
                    console.log(`DEBUG - Tentativa 2: Buscando subconta existente após erro de criação...`);
                    try {
                        const retryItems = await AsaasApiClient.request({
                            method: 'GET',
                            endpoint: 'accounts',
                            params
                        });
                        console.log(`DEBUG - Resultado retry 2: totalCount=${retryItems.totalCount}, dataLength=${retryItems.data ? retryItems.data.length : 0}`);
                        diagnostics.attempts.push({ stage: 'retry2_digits', total: retryItems.totalCount, ts: Date.now() });

                        if (retryItems.totalCount > 0) {
                            console.log('Subconta existente encontrada no retry 2. Reutilizando...');
                            subAccountData = retryItems.data[0];
                            console.log(`DEBUG - Subconta recuperada no retry 2: ID=${subAccountData.id}, apiKey=${subAccountData.apiKey ? 'presente' : 'ausente'}, walletId=${subAccountData.walletId ? 'presente' : 'ausente'}`);
                            return { success: true, data: subAccountData };
                        }
                    } catch (retryError2) {
                        console.warn(`DEBUG - Retry 2 falhou: ${retryError2.message}`);
                    }

                    // TENTATIVA 2b: Buscar com CPF formatado (###.###.###-## ou ##.###.###/####-##)
                    const digits = String(accountData.cpfCnpj || '').replace(/\D/g, '');
                    let formattedCandidate = null;
                    if (digits.length === 11) {
                        formattedCandidate = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                    } else if (digits.length === 14) {
                        formattedCandidate = digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                    }
                    if (formattedCandidate) {
                        try {
                            const altParams = new URLSearchParams();
                            altParams.append('cpfCnpj', formattedCandidate);
                            console.log(`DEBUG - Tentativa 2b: Buscando com CPF formatado ${formattedCandidate}...`);
                            const altItems = await AsaasApiClient.request({
                                method: 'GET', endpoint: 'accounts', params: altParams
                            });
                            console.log(`DEBUG - Resultado tentativa 2b: totalCount=${altItems.totalCount}`);
                            diagnostics.attempts.push({ stage: 'retry2b_formatted', total: altItems.totalCount, ts: Date.now() });
                            if (altItems.totalCount > 0) {
                                subAccountData = altItems.data[0];
                                console.log('Subconta existente encontrada com CPF formatado. Reutilizando...');
                                return { success: true, data: subAccountData };
                            }
                        } catch (altErr) {
                            console.warn('DEBUG - Tentativa 2b falhou:', altErr.message);
                        }
                    }

                    // TENTATIVA 2c: Buscar por email se disponível
                    if (accountData.email) {
                        try {
                            const emailParams = new URLSearchParams();
                            emailParams.append('email', accountData.email);
                            console.log(`DEBUG - Tentativa 2c: Buscando por email ${accountData.email}...`);
                            const emailItems = await AsaasApiClient.request({ method: 'GET', endpoint: 'accounts', params: emailParams });
                            console.log(`DEBUG - Resultado tentativa 2c: totalCount=${emailItems.totalCount}`);
                            diagnostics.attempts.push({ stage: 'retry2c_email', total: emailItems.totalCount, ts: Date.now() });
                            if (emailItems.totalCount > 0) {
                                subAccountData = emailItems.data[0];
                                console.log('Subconta existente encontrada pela busca por email. Reutilizando...');
                                return { success: true, data: subAccountData };
                            }
                        } catch (emailErr) {
                            console.warn('DEBUG - Tentativa 2c falhou:', emailErr.message);
                        }
                    }

                    // TENTATIVA 3: Aguardar um pouco e tentar novamente
                    console.log(`DEBUG - Tentativa 3: Aguardando 2s e tentando novamente...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    try {
                        const retryItems3 = await AsaasApiClient.request({
                            method: 'GET',
                            endpoint: 'accounts',
                            params
                        });
                        console.log(`DEBUG - Resultado retry 3: totalCount=${retryItems3.totalCount}, dataLength=${retryItems3.data ? retryItems3.data.length : 0}`);
                        diagnostics.attempts.push({ stage: 'retry3_digits', total: retryItems3.totalCount, ts: Date.now() });

                        if (retryItems3.totalCount > 0) {
                            console.log('Subconta existente encontrada no retry 3. Reutilizando...');
                            subAccountData = retryItems3.data[0];
                            console.log(`DEBUG - Subconta recuperada no retry 3: ID=${subAccountData.id}, apiKey=${subAccountData.apiKey ? 'presente' : 'ausente'}, walletId=${subAccountData.walletId ? 'presente' : 'ausente'}`);
                            return { success: true, data: subAccountData };
                        }
                    } catch (retryError3) {
                        console.warn(`DEBUG - Retry 3 falhou: ${retryError3.message}`);
                    }

                    // Se todas as tentativas falharam
                    console.error('Todas as tentativas de recuperação de subconta falharam');
                    console.warn('DEBUG - Conflito irreconciliável de subconta. Diagnostic payload:', JSON.stringify(diagnostics, null, 2));
                    return { success: false, message: 'CPF informado já está em uso mas não foi possível recuperar a subconta existente', status: 409, diagnostics };
                }

                // Se não é erro de CPF em uso, retornar o erro original
                diagnostics.error = err.message;
                return { success: false, message: err.message, status: err.status || 500, diagnostics };
            }
        } catch (error) {
            console.error('Erro geral no addSubAccount:', error);
            return formatError(error);
        }
    }

    async getAllSubAccounts() {
        try {
            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'accounts'
            });

            const data = items.totalCount > 0 ? items.data : [];
            return { success: true, data: data };
        } catch (error) {
            return formatError(error);
        }
    }

    async getSubAccountByCpfCnpj(cpfCnpj) {
        try {
            if (!cpfCnpj) {
                return createError('CPF/CNPJ é obrigatório', 400);
            }

            console.log(`DEBUG - Buscando subconta por CPF/CNPJ: ${cpfCnpj}`);

            const params = new URLSearchParams();
            params.append('cpfCnpj', cpfCnpj);

            const items = await AsaasApiClient.request({
                method: 'GET',
                endpoint: 'accounts',
                params
            });

            console.log(`DEBUG - Resultado busca subconta: totalCount=${items.totalCount}, dataLength=${items.data ? items.data.length : 0}`);

            if (items.totalCount === 0) {
                console.log(`DEBUG - Nenhuma subconta encontrada para CPF/CNPJ: ${cpfCnpj}`);
                return createError('Nenhuma subconta encontrada para o CPF/CNPJ informado', 404);
            }

            const subAccountData = items.data[0];
            console.log(`DEBUG - Subconta encontrada: ID=${subAccountData.id}, status=${subAccountData.status}, apiKey=${subAccountData.apiKey ? 'presente' : 'ausente'}, walletId=${subAccountData.walletId ? 'presente' : 'ausente'}`);

            return { success: true, data: subAccountData };
        } catch (error) {
            console.error(`Erro ao buscar subconta por CPF/CNPJ ${cpfCnpj}:`, error);
            return formatError(error);
        }
    }

    async getSubAccount(cpfCnpj) {
        return await this.getSubAccountByCpfCnpj(cpfCnpj);
    }
}

module.exports = new SubAccountService();
