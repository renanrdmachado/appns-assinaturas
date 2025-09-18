require('dotenv').config();
const SellerSubscription = require('../models/SellerSubscription');
const Seller = require('../models/Seller');
const User = require('../models/User');
const UserData = require('../models/UserData');
const AsaasApiClient = require('../helpers/AsaasApiClient');
const { formatError, createError } = require('../utils/errorHandler');
const SellerValidator = require('../validators/seller-validator');
const AsaasCustomerService = require('./asaas/customer.service');
const subscriptionService = require('./asaas/subscription.service');
const sequelize = require('../config/database');
const { redactSensitive } = require('../utils/redact');
const AsaasFormatter = require('../utils/asaas-formatter');

class SellerSubscriptionService {
    // Utilitário interno para depurar estado do customer no Asaas
    async _debugCustomerState(customerId, asaasHeaders = {}) {
        try {
            const result = await AsaasCustomerService.get(customerId, asaasHeaders);
            if (!result.success) return { success: false, message: result.message };
            const c = result.data || {};
            const digits = String(c.cpfCnpj || '').replace(/\D/g, '');
            const tail = digits.slice(-2);
            const summary = digits ? `${digits.length}d (***${tail})` : 'missing';
            console.log('DEBUG - _debugCustomerState:', {
                id: c.id, name: c.name, personType: c.personType, deleted: c.deleted === true, cpfSummary: summary
            });
            return { success: true, hasCpfCnpj: !!digits, cpfLen: digits.length, cpfSummary: summary, personType: c.personType, deleted: c.deleted === true, raw: c };
        } catch (e) {
            console.warn('WARN - _debugCustomerState falhou:', e.message);
            return { success: false, message: e.message };
        }
    }
    /**
     * Cria uma assinatura para um seller no Asaas
     * @param {number} sellerId - ID do seller
     * @param {Object} planData - Dados do plano (plan_name, value, cycle)
     * @param {Object} billingInfo - Informações de cobrança
     * @param {Object} transaction - Transação do Sequelize (opcional)
     * @returns {Object} - Resultado da operação
     */
    async createSubscription(sellerId, planData, billingInfo = {}, transaction = null) {
        try {
            console.log(`DEBUG - SellerSubscriptionService.createSubscription chamado com:`, {
                sellerId,
                planData,
                // Nunca logar dados sensíveis em claro
                billingInfo: redactSensitive(billingInfo)
            });

            console.log(`Criando assinatura para seller ${sellerId}`);

            // Buscar seller (usando transação se fornecida)
            const seller = await Seller.findByPk(sellerId, { transaction });
            if (!seller) {
                return createError(`Seller com ID ${sellerId} não encontrado`, 404);
            }

            // Verificar se o seller tem subconta, se não tiver, criar uma
            let sellerWithRelations = seller;
            if (!seller.subaccount_id) {
                console.log(`Seller ${sellerId} não possui subconta. Criando subconta...`);
                try {
                    // Buscar seller com relações necessárias para criar subconta
                    sellerWithRelations = await Seller.findByPk(sellerId, {
                        include: [{
                            model: User,
                            as: 'user',
                            include: [{ model: UserData, as: 'userData' }]
                        }],
                        transaction
                    });

                    if (!sellerWithRelations) {
                        return createError(`Seller com ID ${sellerId} não encontrado`, 404);
                    }

                    // Salvar dados do billingInfo no UserData antes de tentar criar subconta
                    if (sellerWithRelations.user?.userData) {
                        console.log(`Atualizando UserData do seller ${sellerId} com dados do billingInfo`);

                        const updateData = {};

                        // Mapear campos do billingInfo para o UserData
                        if (billingInfo.cpfCnpj) {
                            updateData.cpf_cnpj = billingInfo.cpfCnpj;
                        }
                        if (billingInfo.phone) {
                            updateData.mobile_phone = billingInfo.phone;
                        }
                        if (billingInfo.creditCardHolderInfo?.incomeValue) {
                            updateData.income_value = billingInfo.creditCardHolderInfo.incomeValue;
                        }
                        if (billingInfo.name) {
                            updateData.name = billingInfo.name;
                        }
                        if (billingInfo.email) {
                            updateData.email = billingInfo.email;
                        }
                        if (billingInfo.address) {
                            updateData.address = billingInfo.address;
                        }
                        if (billingInfo.addressNumber) {
                            updateData.address_number = billingInfo.addressNumber;
                        }
                        if (billingInfo.province) {
                            updateData.province = billingInfo.province;
                        }
                        if (billingInfo.postalCode) {
                            updateData.postal_code = billingInfo.postalCode;
                        }
                        if (billingInfo.creditCardHolderInfo?.birthDate) {
                            updateData.birth_date = billingInfo.creditCardHolderInfo.birthDate;
                        }

                        if (Object.keys(updateData).length > 0) {
                            await sellerWithRelations.user.userData.update(updateData, { transaction });
                            console.log(`UserData atualizado com ${Object.keys(updateData).length} campos`);
                        }
                    } else {
                        console.log(`Seller ${sellerId} não tem UserData. Criando UserData com dados do billingInfo`);

                        // Criar UserData se não existir
                        const userDataData = {
                            cpf_cnpj: billingInfo.cpfCnpj || null,
                            mobile_phone: billingInfo.phone || null,
                            income_value: billingInfo.creditCardHolderInfo?.incomeValue || null,
                            name: billingInfo.name || null,
                            email: billingInfo.email || null,
                            address: billingInfo.address || null,
                            address_number: billingInfo.addressNumber || null,
                            province: billingInfo.province || null,
                            postal_code: billingInfo.postalCode || null,
                            birth_date: billingInfo.creditCardHolderInfo?.birthDate || null
                        };

                        const newUserData = await UserData.create(userDataData, { transaction });

                        // Vincular o UserData ao User
                        await sellerWithRelations.user.update({ user_data_id: newUserData.id }, { transaction });
                        console.log(`UserData criado e vinculado: ${newUserData.id}`);

                        // Recarregar o seller com as relações atualizadas
                        sellerWithRelations = await Seller.findByPk(sellerId, {
                            include: [{
                                model: require('../models/User'),
                                as: 'user',
                                include: [{ model: UserData, as: 'userData' }]
                            }],
                            transaction
                        });
                    }

                    // Criar subconta no Asaas
                    const SellerSubAccountService = require('./seller-subaccount.service');
                    const subAccountResult = await SellerSubAccountService.create(sellerWithRelations, transaction);

                    if (subAccountResult.success) {
                        console.log(`Subconta criada com sucesso para seller ${sellerId}: ${subAccountResult.data.id}`);
                        // Atualizar o seller com os dados da subconta
                        await sellerWithRelations.update({
                            subaccount_id: subAccountResult.data.id,
                            asaas_api_key: subAccountResult.data.apiKey,
                            wallet_id: subAccountResult.data.walletId,
                        }, { transaction });

                        // Recarregar o seller para obter os dados atualizados
                        sellerWithRelations = await Seller.findByPk(sellerId, { transaction });
                    } else {
                        console.error(`Falha ao criar subconta para seller ${sellerId}: ${subAccountResult.message}`);
                        // Continuar sem subconta, mas logar o erro
                    }
                } catch (subAccountError) {
                    console.error(`Erro ao criar subconta para seller ${sellerId}:`, subAccountError.message);
                    // Continuar sem subconta, mas logar o erro
                }
            }

            // Definir headers de subconta (se existir) para chamadas Asaas
            const asaasHeaders = sellerWithRelations.subaccount_api_key ? { access_token: sellerWithRelations.subaccount_api_key } : {};
            if (sellerWithRelations.subaccount_api_key) {
                const tail = sellerWithRelations.subaccount_api_key.slice(-4);
                console.log('DEBUG - Usando subaccount access_token (mascarado): ****' + tail);
            } else {
                console.log('DEBUG - Usando access_token padrão do ambiente');
            }

            // Determinar CPF/CNPJ válido no início para reutilizar em todo o método
            let validCpfCnpj = null;
            let nuvemshopInfo = {};
            try {
                if (seller.nuvemshop_info) {
                    nuvemshopInfo = typeof seller.nuvemshop_info === 'string'
                        ? JSON.parse(seller.nuvemshop_info)
                        : seller.nuvemshop_info;
                }
            } catch (e) {
                console.warn('WARN - Falha ao parsear nuvemshop_info, usando objeto vazio:', e.message);
                nuvemshopInfo = {};
            }

            // Normalizar/validar CPF/CNPJ vindo do billingInfo ou da loja
            const rawCpf = (billingInfo.cpfCnpj || '').toString();
            const cleanCpf = rawCpf.replace(/\D/g, '');
            const nsBusinessId = (nuvemshopInfo.business_id || '').toString().replace(/\D/g, '');

            // Tentar alternativas para CPF/CNPJ válido
            const cpfAlternatives = [
                cleanCpf.length === 11 || cleanCpf.length === 14 ? cleanCpf : null,
                nsBusinessId.length === 11 || nsBusinessId.length === 14 ? nsBusinessId : null,
                // Tentar também do creditCardHolderInfo se disponível
                billingInfo.creditCardHolderInfo?.cpfCnpj && !billingInfo.creditCardHolderInfo.cpfCnpj.includes('*')
                    ? String(billingInfo.creditCardHolderInfo.cpfCnpj).replace(/\D/g, '') : null
            ].filter(Boolean);

            if (cpfAlternatives.length > 0) {
                validCpfCnpj = cpfAlternatives[0];
            }

            // Verificar se seller já tem customer_id no Asaas
            let customerId = seller.payments_customer_id;

            console.log(`DEBUG - CPF/CNPJ válido determinado: ${validCpfCnpj ? `${validCpfCnpj.length}d (***${validCpfCnpj.slice(-2)})` : 'não encontrado'}`);

            console.log('DEBUG - Status do customer:', {
                sellerId: sellerId,
                hasCustomerId: !!customerId,
                customerId: customerId
            });

            if (!customerId) {
                // Criar customer no Asaas para o seller
                // Se cartão, validar cartão não mascarado (se enviado diretamente) antes
                if ((billingInfo.billingType || '').toUpperCase() === 'CREDIT_CARD' && billingInfo.creditCard) {
                    const cc = billingInfo.creditCard;
                    if ((cc.number && /\*/.test(String(cc.number))) || (cc.ccv && /\*/.test(String(cc.ccv)))) {
                        return {
                            success: false,
                            status: 400,
                            message: 'Dados de cartão mascarados detectados. Envie token de cartão (creditCardToken) ou número/ccv sem máscara.'
                        };
                    }
                }

                if (!validCpfCnpj) {
                    // Sem CPF/CNPJ válido para criar customer no Asaas
                    return {
                        success: false,
                        status: 400,
                        message: 'CPF/CNPJ inválido ou mascarado. Complete os documentos do seller ou envie o CPF/CNPJ sem máscara.'
                    };
                }

                const customerData = {
                    name: billingInfo.name || nuvemshopInfo.name?.pt || nuvemshopInfo.name || `Seller ${sellerId}`,
                    email: billingInfo.email || nuvemshopInfo.email || `seller${sellerId}@example.com`,
                    cpfCnpj: validCpfCnpj,
                    phone: billingInfo.phone || nuvemshopInfo.phone || '00000000000'
                };

                console.log('DEBUG - Criando customer no Asaas com dados:', JSON.stringify(customerData, null, 2));

                // Criar diretamente o customer no Asaas (mantém a sequência de chamadas esperada nos testes)
                const customerResult = await AsaasCustomerService.create(customerData, asaasHeaders);

                console.log('DEBUG - Resultado da criação do customer:', {
                    success: customerResult.success,
                    customerId: customerResult.data?.id,
                    error: customerResult.success ? null : customerResult.message
                });

                if (!customerResult.success) {
                    console.error('DEBUG - Falha ao criar customer:', customerResult);
                    return customerResult;
                }

                customerId = customerResult.data.id;

                // Salvar customer_id no seller
                await seller.update({ payments_customer_id: customerId });
                console.log(`Customer criado para seller ${sellerId}: ${customerId}`);
            } else {
                // Customer já existe: garantir que o cpfCnpj no Asaas corresponde ao da requisição.
                try {
                    const curr = await AsaasCustomerService.get(customerId, asaasHeaders);
                    const asaasCpfCnpj = String(curr.data?.cpfCnpj || '').replace(/\D/g, '');

                    const maskInfo = (doc) => {
                        if (!doc) return 'missing';
                        const digits = String(doc).replace(/\D/g, '');
                        const tail = digits.slice(-2);
                        return `${digits.length}d (***${tail})`;
                    };
                    console.log('DEBUG - Verificando customer existente no Asaas:', {
                        id: curr.data?.id,
                        cpfCnpjAsaas: maskInfo(asaasCpfCnpj),
                        cpfCnpjRequest: maskInfo(validCpfCnpj),
                        deleted: curr.data?.deleted
                    });

                    // CASO 1: Customer deletado no Asaas -> Recriar
                    if (curr.success && curr.data?.deleted === true) {
                        console.warn('WARN - Customer no Asaas está marcado como deletado. Recriando...');
                        // A lógica de recriação existente é mantida aqui...
                        const pickDigits = (v) => String(v || '').replace(/\D/g, '');
                        const candidateCpf = validCpfCnpj || pickDigits(curr.data?.cpfCnpj) || pickDigits(billingInfo.cpfCnpj) || pickDigits(billingInfo.creditCardHolderInfo?.cpfCnpj);
                        if (!candidateCpf || !(candidateCpf.length === 11 || candidateCpf.length === 14)) {
                            return {
                                success: false, status: 400,
                                message: 'Customer no Asaas está deletado e não há CPF/CNPJ válido para recriação.'
                            };
                        }
                        const customerData = {
                            name: billingInfo.name || curr.data?.name || `Seller ${sellerId}`,
                            email: billingInfo.email || curr.data?.email || `seller${sellerId}@example.com`,
                            cpfCnpj: candidateCpf,
                            phone: billingInfo.phone || curr.data?.mobilePhone || curr.data?.phone || '00000000000'
                        };
                        const created = await AsaasCustomerService.create(customerData, asaasHeaders);
                        if (!created.success) {
                            return { success: false, status: created.status || 400, message: `Falha ao recriar customer: ${created.message}` };
                        }
                        customerId = created.data.id;
                        await seller.update({ payments_customer_id: customerId });
                        console.log(`DEBUG - Customer recriado: ${customerId}`);

                        // CASO 2: CPF/CNPJ no Asaas está ausente ou difere do CPF/CNPJ válido da requisição -> Atualizar
                    } else if (validCpfCnpj && asaasCpfCnpj !== validCpfCnpj) {
                        console.warn(`WARN - CPF/CNPJ divergente ou ausente. Asaas: ${maskInfo(asaasCpfCnpj)}, Req: ${maskInfo(validCpfCnpj)}. Atualizando Asaas...`);

                        const updatePayload = {
                            cpfCnpj: validCpfCnpj,
                            personType: validCpfCnpj.length === 11 ? 'FISICA' : 'JURIDICA',
                            name: billingInfo.name || curr.data?.name,
                            email: billingInfo.email || curr.data?.email
                        };

                        const up = await AsaasCustomerService.update(customerId, updatePayload, asaasHeaders);

                        if (!up.success) {
                            return {
                                success: false, status: up.status || 400,
                                message: `Não foi possível atualizar CPF/CNPJ no Asaas: ${up.message}`
                            };
                        }

                        console.log('DEBUG - Cliente atualizado. Aguardando 2s para consistência da API...');
                        await new Promise(res => setTimeout(res, 2000)); // Delay aumentado para garantir consistência

                        // Revalidar após o delay para garantir que a mudança propagou
                        const afterUpdate = await AsaasCustomerService.get(customerId, asaasHeaders);
                        const finalCpfCnpj = String(afterUpdate.data?.cpfCnpj || '').replace(/\D/g, '');

                        console.log('DEBUG - Verificação pós-atualização:', {
                            cpfCnpjFinal: maskInfo(finalCpfCnpj)
                        });

                        if (finalCpfCnpj !== validCpfCnpj) {
                            return {
                                success: false, status: 400,
                                message: 'A atualização de CPF/CNPJ no Asaas não foi refletida a tempo. Tente novamente em alguns instantes.'
                            };
                        }
                    }
                } catch (e) {
                    console.warn('WARN - Falha ao verificar/atualizar customer existente:', e.message);
                }
            }

            // Dados da assinatura no Asaas
            const subscriptionData = {
                customer: customerId,
                billingType: (billingInfo.billingType || 'PIX').toUpperCase(),
                cycle: planData.cycle || 'MONTHLY',
                value: planData.value,
                nextDueDate: this.calculateNextDueDate(planData.cycle),
                description: `Assinatura ${planData.plan_name} - Seller ${sellerId}`,
                externalReference: `seller_${sellerId}`
            };

            // Incluir opcionais somente se fornecidos
            if (billingInfo.split) subscriptionData.split = billingInfo.split;
            if (billingInfo.discount) subscriptionData.discount = billingInfo.discount;
            if (billingInfo.interest) subscriptionData.interest = billingInfo.interest;
            if (billingInfo.fine) subscriptionData.fine = billingInfo.fine;

            // Para CREDIT_CARD, adicionar informações do portador e dados de cartão/token quando fornecidos
            if ((billingInfo.billingType || '').toUpperCase() === 'CREDIT_CARD') {
                // creditCardHolderInfo: usar o fornecido ou montar a partir de billingInfo
                if (billingInfo.creditCardHolderInfo) {
                    const holder = { ...billingInfo.creditCardHolderInfo };
                    // Manter apenas campos suportados pelo Asaas
                    const allowedHolderFields = new Set(['name', 'email', 'cpfCnpj', 'phone', 'mobilePhone', 'addressNumber', 'addressComplement', 'postalCode']);
                    Object.keys(holder).forEach(k => { if (!allowedHolderFields.has(k)) delete holder[k]; });
                    // Remover explicitamente province se vier do front
                    if (holder.province !== undefined) delete holder.province;

                    // Garantir campos obrigatórios da doc Asaas
                    if (!holder.addressNumber) holder.addressNumber = '0';
                    // Normalizar CEP para dígitos e validar valor (evitar placeholders como 00000000)
                    if (!holder.postalCode) holder.postalCode = '00000000';
                    if (holder.postalCode) holder.postalCode = String(holder.postalCode).replace(/\D/g, '');

                    // Garantir phone conforme doc: se só houver mobilePhone, duplicar; se só houver phone, duplicar
                    if (!holder.phone && holder.mobilePhone) holder.phone = holder.mobilePhone;
                    if (!holder.mobilePhone && holder.phone) holder.mobilePhone = holder.phone;
                    // Se ainda faltar phone, use billingInfo.phone
                    if (!holder.phone && billingInfo.phone) holder.phone = String(billingInfo.phone).replace(/\D/g, '');
                    if (!holder.mobilePhone && billingInfo.phone) holder.mobilePhone = String(billingInfo.phone).replace(/\D/g, '');

                    // Normalizar cpfCnpj se presente e não mascarado
                    if (holder.cpfCnpj && typeof holder.cpfCnpj === 'string') {
                        if (holder.cpfCnpj.includes('*')) {
                            // Se mascarado, usar o CPF válido determinado anteriormente
                            if (validCpfCnpj && (validCpfCnpj.length === 11 || validCpfCnpj.length === 14)) {
                                holder.cpfCnpj = validCpfCnpj;
                            } else {
                                delete holder.cpfCnpj; // deixará para o Asaas validar com customer
                            }
                        } else {
                            holder.cpfCnpj = holder.cpfCnpj.replace(/\D/g, '');
                        }
                    }

                    // Validações proativas para evitar erro genérico do Asaas
                    const invalidCep = !holder.postalCode || holder.postalCode.length !== 8 || /(\d)\1{7}/.test(holder.postalCode);
                    if (invalidCep) {
                        return {
                            success: false,
                            status: 400,
                            message: 'CEP (postalCode) inválido para o titular do cartão. Envie um CEP brasileiro válido com 8 dígitos.'
                        };
                    }

                    // Remover quaisquer campos vazios/undefined
                    Object.keys(holder).forEach(k => { if (holder[k] === undefined || holder[k] === null || holder[k] === '') delete holder[k]; });

                    subscriptionData.creditCardHolderInfo = holder;
                } else if (billingInfo.cpfCnpj || validCpfCnpj) {
                    const cpfToUse = validCpfCnpj || String(billingInfo.cpfCnpj).replace(/\D/g, '');
                    console.log(`CPF/CNPJ limpo: ${cpfToUse}`);
                    // Tentar obter CEP do billingInfo, já que é obrigatório
                    const providedPostal = billingInfo.creditCardHolderInfo?.postalCode || billingInfo.postalCode;
                    const postalDigits = providedPostal ? String(providedPostal).replace(/\D/g, '') : '';
                    if (!postalDigits || postalDigits.length !== 8 || /(\d)\1{7}/.test(postalDigits)) {
                        return {
                            success: false,
                            status: 400,
                            message: 'postalCode (CEP) é obrigatório e deve ter 8 dígitos válidos em creditCardHolderInfo.'
                        };
                    }
                    subscriptionData.creditCardHolderInfo = {
                        name: billingInfo.name,
                        email: billingInfo.email,
                        cpfCnpj: cpfToUse,
                        // Duplicar phone/mobilePhone para atender doc
                        phone: billingInfo.phone ? String(billingInfo.phone).replace(/\D/g, '') : '00000000000',
                        mobilePhone: billingInfo.phone ? String(billingInfo.phone).replace(/\D/g, '') : '00000000000',
                        addressNumber: '0',
                        postalCode: postalDigits
                    };
                }

                // Encaminhar creditCardToken com prioridade. Se houver token e também um objeto creditCard (possivelmente mascarado para UI), usar o token.
                if (billingInfo.creditCardToken) {
                    subscriptionData.creditCardToken = billingInfo.creditCardToken;
                } else if (billingInfo.creditCard) {
                    // Validar e normalizar cartão (evitar número truncado/placeholder)
                    const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
                    const isDigits = (v) => /^[0-9]+$/.test(String(v || ''));
                    const cc = billingInfo.creditCard;
                    const num = onlyDigits(cc.number);
                    console.log(`Número do cartão: ${num}`);
                    const ccv = onlyDigits(cc.ccv);
                    const expM = onlyDigits(cc.expiryMonth);
                    const expY = onlyDigits(cc.expiryYear);
                    const holderDigits = onlyDigits(cc.holderName);

                    if (num.length < 13) {
                        const masked = /\*/.test(String(cc.number));
                        const swappedHint = holderDigits.length >= 13 && /^[0-9]+$/.test(String(cc.holderName || ''))
                            ? ` (observamos ${holderDigits.length} dígitos em holderName — campos possivelmente invertidos)`
                            : '';
                        return {
                            success: false,
                            status: 400,
                            message: `Número de cartão inválido (${masked ? 'mascarado' : 'parece truncado'} - recebidos ${num.length} dígitos)${swappedHint}. Envie o número completo no campo creditCard.number ou um creditCardToken.`
                        };
                    }
                    if (!(ccv.length === 3 || ccv.length === 4)) {
                        return {
                            success: false,
                            status: 400,
                            message: 'CCV inválido. Deve ter 3 ou 4 dígitos.'
                        };
                    }
                    const m = parseInt(expM, 10);
                    if (!(m >= 1 && m <= 12)) {
                        return {
                            success: false,
                            status: 400,
                            message: 'Mês de expiração inválido.'
                        };
                    }
                    const y = parseInt(expY, 10);
                    if (!(String(y).length === 4)) {
                        return {
                            success: false,
                            status: 400,
                            message: 'Ano de expiração inválido. Use YYYY.'
                        };
                    }
                    if (!cc.holderName || isDigits(cc.holderName) || String(cc.holderName).trim().length < 2) {
                        return {
                            success: false,
                            status: 400,
                            message: 'Nome do titular do cartão inválido.'
                        };
                    }

                    subscriptionData.creditCard = {
                        holderName: String(cc.holderName).trim(),
                        number: num,
                        expiryMonth: expM.padStart(2, '0'),
                        expiryYear: String(y),
                        ccv
                    };
                }

                // Remote IP (requerido pelo Asaas para cartão)
                if (billingInfo.remoteIp) {
                    subscriptionData.remoteIp = billingInfo.remoteIp;
                } else {
                    return { success: false, status: 400, message: 'remoteIp é obrigatório para cobranças com cartão (Asaas).' };
                }
            }

            // Remover chaves nulas/undefined do payload (evita nulls explícitos no Asaas)
            const prune = (obj) => {
                if (!obj || typeof obj !== 'object') return obj;
                Object.keys(obj).forEach(k => {
                    const v = obj[k];
                    if (v && typeof v === 'object' && !Array.isArray(v)) prune(v);
                    if (v === null || v === undefined || v === '') delete obj[k];
                });
                return obj;
            };
            prune(subscriptionData);

            // Validar dados obrigatórios antes de enviar para Asaas
            console.log('DEBUG - Validando dados obrigatórios para Asaas...');
            const requiredFields = ['customer', 'billingType', 'cycle', 'value', 'nextDueDate'];
            const missingFields = requiredFields.filter(field => !subscriptionData[field]);

            if (missingFields.length > 0) {
                console.error('DEBUG - Campos obrigatórios ausentes:', missingFields);
                return {
                    success: false,
                    message: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
                    data: { missingFields, subscriptionData }
                };
            }

            // Validar valor numérico
            if (isNaN(parseFloat(subscriptionData.value)) || parseFloat(subscriptionData.value) <= 0) {
                console.error('DEBUG - Valor inválido:', subscriptionData.value);
                return {
                    success: false,
                    message: `Valor da assinatura inválido: ${subscriptionData.value}`,
                    data: { value: subscriptionData.value }
                };
            }

            // Para CREDIT_CARD, validar se temos dados mínimos
            if (subscriptionData.billingType === 'CREDIT_CARD') {
                if (!subscriptionData.creditCardHolderInfo) {
                    return {
                        success: false,
                        status: 400,
                        message: 'creditCardHolderInfo é obrigatório para CREDIT_CARD'
                    };
                }

                const holder = subscriptionData.creditCardHolderInfo;
                const requiredHolderFields = ['name', 'email', 'cpfCnpj', 'phone', 'postalCode', 'addressNumber'];
                const missingHolderFields = requiredHolderFields.filter(field => !holder[field]);

                if (missingHolderFields.length > 0) {
                    console.warn('DEBUG - Campos obrigatórios ausentes em creditCardHolderInfo:', missingHolderFields);
                }

                if (!subscriptionData.creditCard && !subscriptionData.creditCardToken) {
                    return {
                        success: false,
                        status: 400,
                        message: 'creditCard ou creditCardToken é obrigatório para CREDIT_CARD'
                    };
                }
            }

            console.log('DEBUG - Dados validados com sucesso');

            // Pré-checagem isolada: garantir que o customer tem cpfCnpj salvo no Asaas antes de enviar
            try {
                const state = await this._debugCustomerState(customerId, asaasHeaders);
                if (!state.success) {
                    console.warn('WARN - Pré-checagem do customer falhou:', state.message);
                } else if (!state.hasCpfCnpj) {
                    console.warn('WARN - Customer no Asaas sem CPF/CNPJ antes do POST da assinatura. Interrompendo.');
                    return {
                        success: false,
                        status: 400,
                        message: 'O customer no Asaas está sem CPF/CNPJ. Atualize o cadastro antes de criar a assinatura.'
                    };
                }
            } catch (_) { }

            // Criar assinatura no Asaas
            console.log('DEBUG - Enviando dados para Asaas:', JSON.stringify(subscriptionData, null, 2));

            let asaasSubscription;
            try {
                asaasSubscription = await AsaasApiClient.request({
                    method: 'POST',
                    endpoint: 'subscriptions',
                    data: subscriptionData,
                    headers: asaasHeaders
                });

                console.log('DEBUG - Resposta do Asaas (sucesso):', JSON.stringify(asaasSubscription, null, 2));
            } catch (asaasError) {
                console.error('DEBUG - Erro na requisição para Asaas:', {
                    message: asaasError.message,
                    status: asaasError.status,
                    asaasError: asaasError.asaasError,
                    subscriptionData: subscriptionData,
                    customerId: customerId,
                    planData: planData,
                    billingInfo: billingInfo
                });

                // Se tem erros específicos do Asaas, incluir nos logs
                if (asaasError.asaasError && asaasError.asaasError.errors) {
                    console.error('DEBUG - Erros específicos do Asaas:', asaasError.asaasError.errors);
                }

                // Fallback: se o Asaas apontar cliente removido, tentar recriar customer e refazer; se apontar CPF/CNPJ ausente, atualizar e refazer
                const errMsg = String(asaasError.message || '').toLowerCase();
                const asaasErrors = (asaasError.asaasError && asaasError.asaasError.errors) ? asaasError.asaasError.errors : [];
                const mentionsRemoved = errMsg.includes('cliente removido') || asaasErrors.some(e => String(e.description || '').toLowerCase().includes('removido'));
                const mentionsCpfMissing = errMsg.includes('cpf/cnpj') && (errMsg.includes('cadastro') || errMsg.includes('cliente'));

                // A lógica de retry para CPF/CNPJ foi removida, pois agora é tratada proativamente.
                // Mantemos apenas o retry para cliente removido, que é um caso mais raro.
                if (mentionsRemoved) {
                    console.log('DEBUG - Detectado erro: cliente removido. Tentando recriar customer e refazer criação da assinatura...');
                    try {
                        const pickDigits = (v) => String(v || '').replace(/\D/g, '');
                        const altCpf = validCpfCnpj || pickDigits(subscriptionData.creditCardHolderInfo?.cpfCnpj) || pickDigits(billingInfo.cpfCnpj);
                        if (!altCpf || !(altCpf.length === 11 || altCpf.length === 14)) {
                            return {
                                success: false,
                                status: 400,
                                message: 'Cliente no Asaas está removido e não foi possível determinar um CPF/CNPJ válido para recriação. Informe cpfCnpj.'
                            };
                        }
                        const newCustomerData = {
                            name: billingInfo.name || `Seller ${sellerId}`,
                            email: billingInfo.email || `seller${sellerId}@example.com`,
                            cpfCnpj: altCpf,
                            phone: billingInfo.phone || '00000000000'
                        };
                        const created = await AsaasCustomerService.create(newCustomerData, asaasHeaders);
                        if (!created.success) {
                            return {
                                success: false,
                                status: created.status || 400,
                                message: `Falha ao recriar customer no Asaas: ${created.message}`
                            };
                        }
                        customerId = created.data.id;
                        await Seller.update({ payments_customer_id: customerId }, { where: { id: sellerId } });
                        subscriptionData.customer = customerId;
                        console.log('DEBUG - Novo customer criado. Tentando criar subscription novamente...');
                        asaasSubscription = await AsaasApiClient.request({
                            method: 'POST',
                            endpoint: 'subscriptions',
                            data: subscriptionData,
                            headers: asaasHeaders
                        });
                        console.log('DEBUG - Retry após recriar customer: sucesso');
                    } catch (retryRemovedErr) {
                        console.error('DEBUG - Retry após recriar customer falhou:', {
                            message: retryRemovedErr.message,
                            status: retryRemovedErr.status,
                            asaasError: retryRemovedErr.asaasError
                        });
                        return {
                            success: false,
                            message: `Erro ao criar assinatura no Asaas após recriar customer: ${retryRemovedErr.message}`,
                            error: {
                                message: retryRemovedErr.message,
                                status: retryRemovedErr.status,
                                asaasErrors: retryRemovedErr.asaasError?.errors || [],
                                sentData: subscriptionData
                            }
                        };
                    }
                }

                // Fallback controlado para inconsistência eventual do Asaas: cliente tem CPF/CNPJ, mas API de assinatura ainda acusa ausência
                if (!asaasSubscription && mentionsCpfMissing) {
                    try {
                        console.log('DEBUG - Fallback: checando estado do customer após erro de CPF/CNPJ...');

                        // Fazer diagnóstico completo primeiro
                        console.log('🔍 Iniciando diagnóstico completo do customer...');
                        const diagnostic = await this._fullCustomerDiagnostic(customerId, asaasHeaders);
                        console.log('📊 Recomendação do diagnóstico:', diagnostic.recommendation);

                        const state = await this._debugCustomerState(customerId, asaasHeaders);
                        console.log('DEBUG - Estado completo do customer:', JSON.stringify(state.raw, null, 2));

                        if (state.success && state.hasCpfCnpj) {
                            const pick = (v) => String(v || '').replace(/\D/g, '');
                            const customerDigits = pick(state.raw?.cpfCnpj);
                            const holderDigits = pick(subscriptionData.creditCardHolderInfo?.cpfCnpj);

                            // Verificar se customer tem todos os campos mínimos obrigatórios
                            const customerData = state.raw;
                            const missingFields = [];
                            if (!customerData.name || customerData.name.trim() === '') missingFields.push('name');
                            if (!customerData.email || customerData.email.trim() === '') missingFields.push('email');
                            if (!customerData.cpfCnpj || customerData.cpfCnpj.replace(/\D/g, '') === '') missingFields.push('cpfCnpj');
                            if (!customerData.phone || customerData.phone.replace(/\D/g, '') === '') missingFields.push('phone');

                            console.log('DEBUG - Campos obrigatórios do customer:', {
                                name: customerData.name ? '✓' : '✗',
                                email: customerData.email ? '✓' : '✗',
                                cpfCnpj: customerData.cpfCnpj ? '✓' : '✗',
                                phone: customerData.phone ? '✓' : '✗',
                                missingFields: missingFields
                            });

                            // Verificar campos de endereço para assinaturas de cartão
                            const addressFields = ['address', 'addressNumber', 'postalCode'];
                            const missingAddress = addressFields.filter(field => !customerData[field]);

                            console.log('DEBUG - Verificação endereço:', {
                                address: customerData.address ? '✓' : '✗',
                                addressNumber: customerData.addressNumber ? '✓' : '✗',
                                postalCode: customerData.postalCode ? '✓' : '✗',
                                missingAddress: missingAddress
                            });

                            // Se faltam campos críticos OU campos de endereço, tentar atualizar o customer completamente
                            if (missingFields.length > 0 || missingAddress.length > 0) {
                                console.warn('WARN - Customer tem campos faltando. Tentando atualizar com dados completos...');
                                const updatePayload = {
                                    name: customerData.name || billingInfo.name || `Seller ${sellerId}`,
                                    email: customerData.email || billingInfo.email || `seller${sellerId}@example.com`,
                                    cpfCnpj: customerDigits || validCpfCnpj,
                                    phone: customerData.phone || billingInfo.phone || '00000000000',
                                    // Adicionar campos de endereço obrigatórios para cartão
                                    address: customerData.address || 'Rua Principal',
                                    addressNumber: customerData.addressNumber || (billingInfo.creditCardHolderInfo?.addressNumber) || '0',
                                    postalCode: customerData.postalCode || (billingInfo.creditCardHolderInfo?.postalCode) || '00000000'
                                };

                                console.log('DEBUG - Dados de atualização:', JSON.stringify(updatePayload, null, 2));

                                try {
                                    await AsaasApiClient.request({
                                        method: 'PUT',
                                        endpoint: `customers/${customerId}`,
                                        data: updatePayload,
                                        headers: asaasHeaders
                                    });
                                    console.log('DEBUG - Customer atualizado com campos obrigatórios + endereço.');
                                    await new Promise(res => setTimeout(res, 5000)); // Aguardar mais tempo para propagação
                                } catch (updateErr) {
                                    console.error('DEBUG - Erro ao atualizar customer:', updateErr.message);
                                }
                            }

                            // Alinhar o holder com o cadastro do cliente para evitar divergências sutis
                            if (!holderDigits || holderDigits !== customerDigits) {
                                subscriptionData.creditCardHolderInfo = {
                                    ...subscriptionData.creditCardHolderInfo,
                                    cpfCnpj: customerDigits
                                };
                                console.log('DEBUG - Holder cpfCnpj alinhado ao customer:', `***${customerDigits.slice(-2)}`);
                            }

                            // Aguardar mais tempo para consistência
                            console.log('DEBUG - Aguardando 6s antes do retry devido à consistência eventual do Asaas...');
                            await new Promise(res => setTimeout(res, 6000));

                            // Revalidar rapidamente
                            try { await AsaasCustomerService.get(customerId, asaasHeaders); } catch (_) { }

                            // Tentar novamente uma única vez
                            console.log('DEBUG - Retry único de criação da assinatura após alinhamento...');
                            asaasSubscription = await AsaasApiClient.request({
                                method: 'POST',
                                endpoint: 'subscriptions',
                                data: subscriptionData,
                                headers: asaasHeaders
                            });
                            console.log('DEBUG - Retry (fallback consistência) sucesso');
                        } else {
                            // Última tentativa: recriar customer do zero
                            console.warn('WARN - Customer sem CPF/CNPJ válido mesmo após checks. Tentando recriar customer...');
                            const newCustomerData = {
                                name: billingInfo.name || `Seller ${sellerId}`,
                                email: billingInfo.email || `seller${sellerId}@example.com`,
                                cpfCnpj: validCpfCnpj,
                                phone: billingInfo.phone || '00000000000'
                            };

                            try {
                                const created = await AsaasCustomerService.create(newCustomerData, asaasHeaders);
                                if (created.success) {
                                    const newCustomerId = created.data.id;
                                    await Seller.update({ payments_customer_id: newCustomerId }, { where: { id: sellerId } });
                                    subscriptionData.customer = newCustomerId;

                                    console.log('DEBUG - Novo customer criado para forçar consistência:', newCustomerId);
                                    await new Promise(res => setTimeout(res, 2000));

                                    asaasSubscription = await AsaasApiClient.request({
                                        method: 'POST',
                                        endpoint: 'subscriptions',
                                        data: subscriptionData,
                                        headers: asaasHeaders
                                    });
                                    console.log('DEBUG - Sucesso com customer recriado');
                                }
                            } catch (recreateErr) {
                                console.error('DEBUG - Falha ao recriar customer:', recreateErr.message);
                            }
                        }
                    } catch (retryConsistencyErr) {
                        console.error('DEBUG - Retry (fallback consistência) falhou:', {
                            message: retryConsistencyErr.message,
                            status: retryConsistencyErr.status,
                            asaasError: retryConsistencyErr.asaasError
                        });
                        // fazer um último dump do customer
                        try {
                            const finalCheck = await AsaasCustomerService.get(customerId, asaasHeaders);
                            console.log('DEBUG - Customer state após fallback consistency:', {
                                id: finalCheck.data?.id,
                                cpfCnpj: finalCheck.data?.cpfCnpj,
                                personType: finalCheck.data?.personType,
                                name: finalCheck.data?.name,
                                email: finalCheck.data?.email,
                                phone: finalCheck.data?.phone
                            });
                        } catch (_) { }
                    }
                }

                if (!asaasSubscription) {
                    return {
                        success: false,
                        message: `Erro ao criar assinatura no Asaas: ${asaasError.message}`,
                        error: {
                            message: asaasError.message,
                            status: asaasError.status,
                            asaasErrors: asaasError.asaasError?.errors || [],
                            sentData: subscriptionData
                        }
                    };
                }
            }

            console.log('Assinatura criada no Asaas:', asaasSubscription.id);

            // Salvar assinatura no banco local
            const localSubscription = await SellerSubscription.create({
                seller_id: sellerId,
                external_id: asaasSubscription.id,
                plan_name: planData.plan_name,
                value: planData.value,
                status: 'pending', // Inicia como pending até receber confirmação via webhook
                cycle: planData.cycle,
                next_due_date: asaasSubscription.nextDueDate,
                start_date: new Date(),
                billing_type: billingInfo.billingType || 'PIX',
                features: planData.features || {},
                metadata: {
                    asaas_customer_id: customerId,
                    asaas_subscription_id: asaasSubscription.id,
                    created_via: 'api'
                }
            }, { transaction });

            return {
                success: true,
                message: 'Assinatura criada com sucesso',
                data: {
                    local_subscription: localSubscription,
                    asaas_subscription: asaasSubscription
                }
            };

        } catch (error) {
            console.error('Erro ao criar assinatura do seller:', error);
            return formatError(error);
        }
    }

    /**
     * Atualiza status da assinatura via webhook
     * @param {string} externalId - ID da assinatura no Asaas
     * @param {string} newStatus - Novo status
     * @param {Object} eventData - Dados do evento webhook
     * @returns {Object} - Resultado da operação
     */
    async updateSubscriptionStatus(externalId, newStatus, eventData = {}) {
        try {
            const subscription = await SellerSubscription.findOne({
                where: {
                    external_id: externalId,
                    deleted_at: null
                }
            });

            if (!subscription) {
                return createError(`Assinatura com external_id ${externalId} não encontrada`, 404);
            }

            // Mapear status do Asaas para status local
            const statusMap = {
                'ACTIVE': 'active',
                'EXPIRED': 'expired',
                'OVERDUE': 'overdue',
                'CANCELLED': 'canceled'
            };

            const localStatus = statusMap[newStatus] || newStatus.toLowerCase();

            // Atualizar assinatura
            const updateData = {
                status: localStatus,
                metadata: {
                    ...subscription.metadata,
                    last_webhook_event: eventData.event,
                    last_updated_via_webhook: new Date(),
                    asaas_status: newStatus
                }
            };

            // Se foi cancelada/expirada, definir end_date
            if (['canceled', 'expired'].includes(localStatus)) {
                updateData.end_date = new Date();
            }

            await subscription.update(updateData);

            console.log(`Assinatura ${externalId} atualizada para status ${localStatus}`);

            return {
                success: true,
                message: `Status da assinatura atualizado para ${localStatus}`,
                data: subscription
            };

        } catch (error) {
            console.error('Erro ao atualizar status da assinatura:', error);
            return formatError(error);
        }
    }

    /**
     * Calcula próxima data de vencimento baseada no ciclo
     * @param {string} cycle - Ciclo da assinatura (MONTHLY, YEARLY)
     * @returns {string} - Data formatada
     */
    calculateNextDueDate(cycle = 'MONTHLY') {
        const now = new Date();

        switch (cycle.toUpperCase()) {
            case 'MONTHLY':
                now.setMonth(now.getMonth() + 1);
                break;
            case 'YEARLY':
                now.setFullYear(now.getFullYear() + 1);
                break;
            case 'WEEKLY':
                now.setDate(now.getDate() + 7);
                break;
            default:
                // Default para mensal
                now.setMonth(now.getMonth() + 1);
        }

        return now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    }
    /**
     * Busca assinatura ativa de um seller
     * @param {number} sellerId - ID do seller
     * @returns {Object} - Resultado da operação
     */
    async getActiveSubscription(sellerId) {
        try {
            const subscription = await SellerSubscription.findOne({
                where: {
                    seller_id: sellerId,
                    status: ['active', 'overdue'], // Incluir overdue como "ativa"
                    deleted_at: null
                },
                order: [['createdAt', 'DESC']]
            });

            if (!subscription) {
                return createError('Assinatura ativa não encontrada', 404);
            }

            return {
                success: true,
                data: subscription
            };

        } catch (error) {
            console.error('Erro ao buscar assinatura ativa:', error);
            return formatError(error);
        }
    }

    /**
     * Lista todas as assinaturas de um seller
     * @param {number} sellerId - ID do seller
     * @returns {Object} - Resultado da operação
     */
    async getSellerSubscriptions(sellerId) {
        try {
            const subscriptions = await SellerSubscription.findAll({
                where: {
                    seller_id: sellerId,
                    deleted_at: null
                },
                order: [['createdAt', 'DESC']]
            });

            return {
                success: true,
                data: subscriptions
            };

        } catch (error) {
            console.error('Erro ao buscar assinaturas do seller:', error);
            return formatError(error);
        }
    }

    /**
     * Cancela uma assinatura de seller
     * @param {number} sellerId - ID do seller
     * @param {string} reason - Motivo do cancelamento
     * @returns {Object} - Resultado da operação
     */
    async cancelSubscription(sellerId, reason = 'Cancelado pelo usuário') {
        try {
            // Buscar assinatura ativa
            const subscription = await SellerSubscription.findOne({
                where: {
                    seller_id: sellerId,
                    status: ['active', 'pending', 'overdue'],
                    deleted_at: null
                },
                order: [['createdAt', 'DESC']]
            });

            if (!subscription) {
                return createError('Assinatura ativa não encontrada', 404);
            }

            // Cancelar no Asaas se tiver external_id
            if (subscription.external_id) {
                try {
                    await AsaasApiClient.request({
                        method: 'DELETE',
                        endpoint: `subscriptions/${subscription.external_id}`
                    });
                    console.log(`Assinatura ${subscription.external_id} cancelada no Asaas`);
                } catch (asaasError) {
                    console.warn('Erro ao cancelar no Asaas:', asaasError.message);
                    // Continuar com cancelamento local mesmo se falhar no Asaas
                }
            }

            // Atualizar status local
            await subscription.update({
                status: 'canceled',
                end_date: new Date(),
                metadata: {
                    ...subscription.metadata,
                    cancelled_at: new Date(),
                    cancel_reason: reason
                }
            });

            return {
                success: true,
                message: 'Assinatura cancelada com sucesso',
                data: subscription
            };

        } catch (error) {
            console.error('Erro ao cancelar assinatura:', error);
            return formatError(error);
        }
    }

    // Métodos antigos mantidos para compatibilidade
    async get(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }

            const subscription = await SellerSubscription.findByPk(id);
            console.log("Service / SellerSubscription: ", subscription ? subscription.id : 'not found');

            if (!subscription) {
                return createError(`Assinatura com ID ${id} não encontrada`, 404);
            }

            return { success: true, data: subscription };
        } catch (error) {
            console.error('Erro ao buscar assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }

    async getAll() {
        try {
            const subscriptions = await SellerSubscription.findAll();

            console.log("Service / All SellerSubscriptions count: ", subscriptions.length);
            return { success: true, data: subscriptions };
        } catch (error) {
            console.error('Erro ao buscar assinaturas de vendedores:', error.message);
            return formatError(error);
        }
    }

    async getBySellerId(sellerId) {
        try {
            SellerValidator.validateId(sellerId);

            const seller = await Seller.findByPk(sellerId);
            if (!seller) {
                return createError('Vendedor não encontrado', 404);
            }

            const subscriptions = await SellerSubscription.findAll({
                where: { seller_id: sellerId }
            });

            console.log(`Service / SellerSubscriptions for seller ${sellerId}: `, subscriptions.length);
            return { success: true, data: subscriptions };
        } catch (error) {
            console.error(`Erro ao buscar assinaturas para vendedor ${sellerId}:`, error.message);
            return formatError(error);
        }
    }

    async update(id, data) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }

            const subscription = await SellerSubscription.findByPk(id);

            if (!subscription) {
                return createError(`Assinatura com ID ${id} não encontrada`, 404);
            }

            // Se tiver ID externo, atualizar no Asaas primeiro
            if (subscription.external_id) {
                // Formatar dados para o Asaas
                const asaasSubscriptionData = this.formatDataForAsaasUpdate(data);

                // Atualizar assinatura no Asaas
                console.log(`Atualizando assinatura ID ${subscription.external_id} no Asaas...`);
                const asaasResult = await subscriptionService.update(subscription.external_id, asaasSubscriptionData);

                // Se houver erro no Asaas, retornar o erro
                if (!asaasResult.success) {
                    console.error(`Erro ao atualizar assinatura ID ${subscription.external_id} no Asaas:`, asaasResult.message);
                    return asaasResult;
                }

                // Atualizar status local com base no status do Asaas
                if (asaasResult.data && asaasResult.data.status) {
                    data.status = this.mapAsaasStatusToLocalStatus(asaasResult.data.status);
                }
            } else {
                console.warn(`Assinatura ID ${id} não possui ID externo no Asaas para atualização`);
            }

            await subscription.update(data);

            console.log('SellerSubscription updated:', subscription.id);
            return { success: true, data: subscription };
        } catch (error) {
            console.error('Erro ao atualizar assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }

    async delete(id) {
        try {
            if (!id) {
                return createError('ID é obrigatório', 400);
            }

            const subscription = await SellerSubscription.findByPk(id);

            if (!subscription) {
                return createError(`Assinatura com ID ${id} não encontrada`, 404);
            }

            // Se tiver ID externo, excluir no Asaas primeiro
            if (subscription.external_id) {
                // Excluir assinatura no Asaas
                console.log(`Excluindo assinatura ID ${subscription.external_id} no Asaas...`);
                const asaasResult = await subscriptionService.delete(subscription.external_id);

                // Se houver erro no Asaas, retornar o erro
                if (!asaasResult.success) {
                    console.error(`Erro ao excluir assinatura ID ${subscription.external_id} no Asaas:`, asaasResult.message);
                    return asaasResult;
                }
            } else {
                console.warn(`Assinatura ID ${id} não possui ID externo no Asaas para exclusão`);
            }

            await subscription.destroy();
            console.log(`Assinatura com ID ${id} foi excluída com sucesso`);
            return { success: true, message: `Assinatura com ID ${id} foi excluída com sucesso` };
        } catch (error) {
            console.error('Erro ao excluir assinatura de vendedor:', error.message);
            return formatError(error);
        }
    }

    /**
     * Formata os dados para a criação de assinatura no Asaas
     */
    formatDataForAsaasSubscription(data, seller) {
        // DEBUG: Verificar quais dados estão disponíveis
        console.log('DEBUG - Formatando dados para Asaas subscription:', {
            customerId: data.customer || 'não especificado',
            sellerCustomerId: seller.payments_customer_id || 'não especificado',
            sellerSubaccountId: seller.subaccount_id || 'não especificado',
            hasMetadata: data.metadata ? 'sim' : 'não',
            cpfCnpj: seller.Asaas_cpfCnpj || 'não especificado'
        });

        // Usar o ID do cliente do vendedor no Asaas que já foi verificado
        // e garantindo que tem CPF/CNPJ associado
        const customerId = seller.payments_customer_id;

        if (!customerId) {
            console.error('ERRO: Nenhum customer_id válido para assinatura!');
            throw new Error('Customer ID é obrigatório para criar assinatura');
        }

        console.log('Customer ID para assinatura:', customerId);

        // Normalizar o ciclo para o formato que o Asaas espera
        let cycle = data.cycle || 'MONTHLY';
        const cycleMapping = {
            'mensal': 'MONTHLY',
            'semanal': 'WEEKLY',
            'quinzenal': 'BIWEEKLY',
            'bimestral': 'BIMONTHLY',
            'trimestral': 'QUARTERLY',
            'semestral': 'SEMIANNUALLY',
            'anual': 'YEARLY'
        };

        if (cycleMapping[cycle.toLowerCase()]) {
            cycle = cycleMapping[cycle.toLowerCase()];
        } else {
            // Converter para maiúsculas se não for um dos alias conhecidos
            cycle = cycle.toUpperCase();
        }

        // Mapear campos do nosso modelo para o formato esperado pelo Asaas
        const asaasData = {
            customer: customerId, // ID do cliente no Asaas
            billingType: data.billing_type || 'BOLETO', // Tipo de cobrança
            value: data.value, // Valor da assinatura
            cycle: cycle, // Ciclo de cobrança normalizado
            description: data.plan_name || 'Assinatura SaaS', // Descrição
        };

        // Garantir formatação da data no padrão YYYY-MM-DD
        if (data.next_due_date) {
            try {
                asaasData.nextDueDate = AsaasFormatter.formatDate(data.next_due_date);
            } catch (error) {
                throw new Error(`Erro ao formatar data de vencimento: ${error.message}`);
            }
        }

        // Adicionar campos opcionais apenas se estiverem definidos
        if (data.max_payments) asaasData.maxPayments = data.max_payments;

        // Referência externa deve ser um identificador único e consistente
        // Usando ID da nossa aplicação
        asaasData.externalReference = `seller_subscription_${seller.id}`;

        if (data.end_date) {
            try {
                asaasData.endDate = AsaasFormatter.formatDate(data.end_date);
            } catch (error) {
                throw new Error(`Erro ao formatar data final: ${error.message}`);
            }
        }
        if (data.discount) asaasData.discount = data.discount;
        if (data.interest) asaasData.interest = data.interest;
        if (data.fine) asaasData.fine = data.fine;

        // Adicionar metadata se existir
        if (data.metadata) {
            // Se for preciso mesclar metadata com outras informações
            asaasData.metadata = {
                ...data.metadata,
                source: 'appns-assinaturas',
                seller_id: seller.id,
                cpfCnpj: seller.Asaas_cpfCnpj
            };
        } else {
            asaasData.metadata = {
                source: 'appns-assinaturas',
                seller_id: seller.id,
                cpfCnpj: seller.Asaas_cpfCnpj
            };
        }

        return asaasData;
    }

    /**
     * Formata os dados para a atualização de assinatura no Asaas
     */
    formatDataForAsaasUpdate(data) {
        // Mapear campos do nosso modelo para o formato esperado pelo Asaas
        const asaasData = {};

        if (data.value !== undefined) asaasData.value = data.value;
        if (data.next_due_date !== undefined) {
            try {
                asaasData.nextDueDate = AsaasFormatter.formatDate(data.next_due_date);
            } catch (error) {
                throw new Error(`Erro ao formatar data de vencimento: ${error.message}`);
            }
        }
        if (data.cycle !== undefined) asaasData.cycle = AsaasFormatter.normalizeCycle(data.cycle) || data.cycle;
        if (data.plan_name !== undefined) asaasData.description = data.plan_name;
        if (data.end_date !== undefined) {
            if (data.end_date === null) {
                asaasData.endDate = null;
            } else {
                try {
                    asaasData.endDate = AsaasFormatter.formatDate(data.end_date);
                } catch (error) {
                    throw new Error(`Erro ao formatar data final: ${error.message}`);
                }
            }
        }
        if (data.max_payments !== undefined) asaasData.maxPayments = data.max_payments;
        if (data.billing_type !== undefined) asaasData.billingType = data.billing_type;

        return asaasData;
    }

    /**
     * Mapeia status do Asaas para status local
     */
    mapAsaasStatusToLocalStatus(asaasStatus) {
        const statusMap = {
            'ACTIVE': 'active',
            'INACTIVE': 'inactive',
            'EXPIRED': 'inactive',
            'OVERDUE': 'overdue',
            'PENDING': 'pending'
        };

        return statusMap[asaasStatus] || 'pending';
    }

    /**
     * Busca uma assinatura pelo ID externo do Asaas
     * @param {string} externalId - ID da assinatura no Asaas
     * @returns {Promise<Object>} Resultado da operação
     */
    async getByExternalId(externalId) {
        try {
            if (!externalId) {
                return createError('ID externo é obrigatório', 400);
            }

            const subscription = await SellerSubscription.findOne({
                where: { external_id: externalId }
            });

            if (!subscription) {
                return {
                    success: false,
                    message: `Nenhuma assinatura de vendedor encontrada com ID externo ${externalId}`,
                    status: 404
                };
            }

            return { success: true, data: subscription };
        } catch (error) {
            console.error(`Erro ao buscar assinatura de vendedor por ID externo ${externalId}:`, error.message);
            return formatError(error);
        }
    }

    /**
     * Retry de assinatura com método de pagamento específico
     * @param {number} sellerId - ID do seller
     * @param {string} paymentMethod - Método de pagamento ('PIX', 'BOLETO', 'CREDIT_CARD')
     * @returns {Promise<Object>} Resultado da operação
     */
    async retryWithPaymentMethod(sellerId, paymentMethod) {
        const transaction = await sequelize.transaction();

        try {
            console.log(`Tentando retry de assinatura para seller ${sellerId} com método ${paymentMethod}`);

            // Buscar seller com dados relacionados
            const seller = await Seller.findByPk(sellerId, {
                include: [
                    {
                        model: require('../models/User'),
                        as: 'user',
                        include: [{ model: require('../models/UserData'), as: 'userData' }]
                    }
                ],
                transaction
            });

            if (!seller) {
                await transaction.rollback();
                return createError(`Seller com ID ${sellerId} não encontrado`, 404);
            }

            // Verificar se já existe assinatura ativa
            const existingSubscription = await SellerSubscription.findOne({
                where: {
                    seller_id: sellerId,
                    status: 'active'
                },
                transaction
            });

            if (existingSubscription) {
                await transaction.rollback();
                return {
                    success: false,
                    message: 'Seller já possui assinatura ativa',
                    status: 400
                };
            }

            // Verificar se seller tem customer no Asaas
            if (!seller.payments_customer_id) {
                await transaction.rollback();
                return createError('Seller não possui customer no Asaas. Complete os dados primeiro.', 400);
            }

            // Preparar dados do plano
            const planData = {
                plan_name: 'Plano Básico',
                value: 29.90,
                cycle: 'MONTHLY',
                features: {
                    max_products: 100,
                    max_orders_per_month: 500,
                    support_level: 'basic'
                }
            };

            // Preparar informações de cobrança com método especificado
            let storeInfo;
            try {
                storeInfo = seller.nuvemshop_info ?
                    (typeof seller.nuvemshop_info === 'string' ?
                        JSON.parse(seller.nuvemshop_info) :
                        seller.nuvemshop_info) : {};
            } catch (error) {
                console.error('Erro ao fazer parse do nuvemshop_info:', error);
                storeInfo = {};
            }

            const billingInfo = {
                billingType: paymentMethod,
                name: storeInfo.name?.pt || storeInfo.business_name || `Loja ${seller.nuvemshop_id}`,
                email: storeInfo.email || seller.user?.email,
                cpfCnpj: storeInfo.business_id || seller.user?.userData?.cpfCnpj,
                phone: storeInfo.phone || seller.user?.userData?.mobilePhone
            };

            console.log(`Criando assinatura com método ${paymentMethod}:`, {
                sellerId,
                planData,
                billingInfo
            });

            // Criar assinatura com método específico
            const result = await this.createSubscription(sellerId, planData, billingInfo, transaction);

            if (result.success) {
                console.log('Assinatura criada com sucesso:', result.data);
            } else {
                console.error('Erro ao criar assinatura:', result.message);
            }

            return result;
        } catch (error) {
            console.error('Erro ao tentar retry de assinatura:', error);
            return formatError(error);
        }
    }

    /**
     * Diagnóstico completo de um customer no Asaas para troubleshooting
     */
    async _fullCustomerDiagnostic(customerId, asaasHeaders) {
        try {
            console.log('=== DIAGNÓSTICO COMPLETO DO CUSTOMER ===');
            const customer = await AsaasCustomerService.get(customerId, asaasHeaders);

            if (!customer.success) {
                console.error('❌ Customer não encontrado ou erro ao buscar:', customer.message);
                return { success: false, message: customer.message };
            }

            const data = customer.data;
            console.log('📋 Dados completos do customer:');
            console.log(JSON.stringify(data, null, 2));

            // Verificar campos obrigatórios para cartão
            const requiredFields = {
                'ID': data.id,
                'Nome': data.name,
                'Email': data.email,
                'CPF/CNPJ': data.cpfCnpj,
                'Telefone': data.phone || data.mobilePhone,
                'Tipo Pessoa': data.personType,
                'Deletado': data.deleted
            };

            console.log('🔍 Status dos campos obrigatórios:');
            let missingCritical = [];
            for (const [field, value] of Object.entries(requiredFields)) {
                const hasValue = value && String(value).trim() !== '';
                console.log(`  ${hasValue ? '✅' : '❌'} ${field}: ${value || 'AUSENTE'}`);
                if (!hasValue && ['Nome', 'Email', 'CPF/CNPJ'].includes(field)) {
                    missingCritical.push(field);
                }
            }

            // Verificar CPF/CNPJ especificamente
            if (data.cpfCnpj) {
                const cpfClean = data.cpfCnpj.replace(/\D/g, '');
                console.log('📄 Análise CPF/CNPJ:');
                console.log(`  Valor bruto: "${data.cpfCnpj}"`);
                console.log(`  Apenas dígitos: "${cpfClean}"`);
                console.log(`  Comprimento: ${cpfClean.length} (esperado: 11 para CPF ou 14 para CNPJ)`);
                console.log(`  Válido para pessoa: ${data.personType}`);

                const isValidLength = cpfClean.length === 11 || cpfClean.length === 14;
                const matchesPersonType = (data.personType === 'FISICA' && cpfClean.length === 11) ||
                    (data.personType === 'JURIDICA' && cpfClean.length === 14);
                console.log(`  ✅ Comprimento válido: ${isValidLength}`);
                console.log(`  ✅ Compatível com tipo pessoa: ${matchesPersonType}`);
            }

            // Tentar criar uma cobrança de teste PIX para verificar se o customer funciona
            console.log('🧪 Teste de compatibilidade: tentando criar cobrança PIX de R$ 5,00...');
            try {
                const testCharge = await AsaasApiClient.request({
                    method: 'POST',
                    endpoint: 'payments',
                    data: {
                        customer: customerId,
                        billingType: 'PIX',
                        value: 5.00, // Valor mínimo
                        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    },
                    headers: asaasHeaders
                });
                console.log('✅ Customer funciona para cobranças PIX');

                // Deletar a cobrança de teste
                try {
                    await AsaasApiClient.request({
                        method: 'DELETE',
                        endpoint: `payments/${testCharge.id}`,
                        headers: asaasHeaders
                    });
                    console.log('🗑️ Cobrança de teste removida');
                } catch (_) { }

            } catch (testErr) {
                console.error('❌ Customer falha até para PIX:', testErr.message);
                if (testErr.asaasError?.errors) {
                    console.error('Erros Asaas:', testErr.asaasError.errors);
                }
            }

            console.log('=== FIM DO DIAGNÓSTICO ===');
            return {
                success: true,
                data,
                missingCritical,
                recommendation: missingCritical.length > 0 ?
                    `Campos críticos faltando: ${missingCritical.join(', ')}. Considere recriar o customer.` :
                    'Customer parece estar completo. O problema pode ser de timing/consistência do Asaas.'
            };

        } catch (err) {
            console.error('Erro no SellerSubscriptionService:', err.message);
            return formatError(err);
        }
    }
}

module.exports = new SellerSubscriptionService();
