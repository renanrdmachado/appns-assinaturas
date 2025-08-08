const AsaasApiClient = require('../../helpers/AsaasApiClient');
const { formatError, createError } = require('../../utils/errorHandler');

/**
 * Serviço DRY para operações de Cartão de Crédito no Asaas (lean payments e tokenização)
 * Reutilizável por Sellers (assinaturas que precisem capturar cartão) e Shoppers (pagamentos avulsos).
 */
class AsaasCardService {
  /**
   * Cria uma cobrança de cartão para redirecionamento (invoiceUrl)
   * - Usa billingType CREDIT_CARD sem enviar dados do cartão (Asaas coleta)
   */
  async createRedirectCharge({ customer, value, dueDate, description, externalReference }) {
    try {
      if (!customer || !value) {
        return createError('Campos obrigatórios: customer, value', 400);
      }

      const data = {
        customer,
        billingType: 'CREDIT_CARD',
        value,
        ...(dueDate ? { dueDate } : {}),
        ...(description ? { description } : {}),
        ...(externalReference ? { externalReference } : {})
      };

      const response = await AsaasApiClient.request({
        method: 'POST',
        endpoint: 'lean/payments',
        data
      });

      return { success: true, data: response };
    } catch (error) {
      console.error('AsaasCardService.createRedirectCharge error:', error);
      return formatError(error);
    }
  }

  /**
   * Cria uma cobrança com captura imediata (envia creditCard + creditCardHolderInfo)
   * - Requer SSL do seu lado ao coletar os dados de cartão
   */
  async chargeWithCard({ customer, value, dueDate, description, externalReference, creditCard, creditCardHolderInfo, remoteIp, installmentCount, installmentValue }) {
    try {
      if (!customer || !value) {
        return createError('Campos obrigatórios: customer, value', 400);
      }
      if (!creditCard || !creditCardHolderInfo) {
        return createError('É obrigatório informar creditCard e creditCardHolderInfo', 400);
      }

      const data = {
        customer,
        billingType: 'CREDIT_CARD',
        value,
        ...(dueDate ? { dueDate } : {}),
        ...(description ? { description } : {}),
        ...(externalReference ? { externalReference } : {}),
        creditCard,
        creditCardHolderInfo,
        ...(remoteIp ? { remoteIp } : {}),
        ...(installmentCount ? { installmentCount } : {}),
        ...(installmentValue ? { installmentValue } : {})
      };

      const response = await AsaasApiClient.request({
        method: 'POST',
        endpoint: 'lean/payments',
        data
      });

      return { success: true, data: response };
    } catch (error) {
      console.error('AsaasCardService.chargeWithCard error:', error);
      return formatError(error);
    }
  }

  /**
   * Tokeniza um cartão de crédito (gera creditCardToken)
   */
  async tokenize({ customer, creditCard, creditCardHolderInfo, remoteIp }) {
    try {
      if (!customer) return createError('customer é obrigatório', 400);
      if (!creditCard || !creditCardHolderInfo) {
        return createError('creditCard e creditCardHolderInfo são obrigatórios para tokenizar', 400);
      }

      const data = {
        customer,
        creditCard,
        creditCardHolderInfo,
        ...(remoteIp ? { remoteIp } : {})
      };

      const response = await AsaasApiClient.request({
        method: 'POST',
        endpoint: 'creditCard/tokenize',
        data
      });

      return { success: true, data: response };
    } catch (error) {
      console.error('AsaasCardService.tokenize error:', error);
      return formatError(error);
    }
  }

  /**
   * Cobra usando um token de cartão previamente gerado
   */
  async chargeWithToken({ customer, value, dueDate, description, externalReference, creditCardToken, remoteIp, installmentCount, installmentValue }) {
    try {
      if (!customer || !value) {
        return createError('Campos obrigatórios: customer, value', 400);
      }
      if (!creditCardToken) {
        return createError('creditCardToken é obrigatório', 400);
      }

      const data = {
        customer,
        billingType: 'CREDIT_CARD',
        value,
        ...(dueDate ? { dueDate } : {}),
        ...(description ? { description } : {}),
        ...(externalReference ? { externalReference } : {}),
        creditCardToken,
        ...(remoteIp ? { remoteIp } : {}),
        ...(installmentCount ? { installmentCount } : {}),
        ...(installmentValue ? { installmentValue } : {})
      };

      const response = await AsaasApiClient.request({
        method: 'POST',
        endpoint: 'lean/payments',
        data
      });

      return { success: true, data: response };
    } catch (error) {
      console.error('AsaasCardService.chargeWithToken error:', error);
      return formatError(error);
    }
  }
}

module.exports = new AsaasCardService();
