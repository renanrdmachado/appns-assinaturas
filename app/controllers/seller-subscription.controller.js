const { SellerSubscriptionService } = require('../services');
const { getClientIp } = require('../utils/request-ip');
const { formatError } = require('../utils/errorHandler');
const sequelize = require('../config/database');

class SellerSubscriptionController {
  // Listar todas as assinaturas de vendedores
  async index(req, res) {
    try {
      const result = await SellerSubscriptionService.getAll();

      // Verificar se a operação foi bem-sucedida
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }

      return res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error('Erro ao listar assinaturas de vendedores:', error);
      return res.status(500).json(formatError(error));
    }
  }

  // Buscar assinatura específica
  async show(req, res) {
    const { id } = req.params;

    try {
      const result = await SellerSubscriptionService.get(id);

      // Verificar se a operação foi bem-sucedida
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }

      return res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error(`Erro ao buscar assinatura ID ${id}:`, error);
      return res.status(500).json(formatError(error));
    }
  }

  // Criar nova assinatura
  async store(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { seller_id } = req.params;
      const { planData, billingInfo } = req.body || {};

      // Validar entrada mínima
      if (!planData || typeof planData !== 'object') {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'planData é obrigatório' });
      }

      // Forçar uso do IP real do requester no backend (ignorar qualquer remoteIp do front)
      const remoteIp = getClientIp(req);
      const safeBilling = {
        ...(billingInfo || {}),
        // Apenas define se não houver; o service também pode sobrepor com maior prioridade
        remoteIp: remoteIp || undefined,
      };

      // Usar o novo método createSubscription que integra com Asaas
      const result = await SellerSubscriptionService.createSubscription(seller_id, planData, safeBilling, transaction);

      // Verificar se a operação foi bem-sucedida
      if (!result.success) {
        await transaction.rollback();
        return res.status(result.status || 400).json(result);
      }

      // Commit da transação apenas se tudo foi bem-sucedido
      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Assinatura criada com sucesso e integrada ao Asaas',
        data: result.data
      });
    } catch (error) {
      // Rollback em caso de erro
      await transaction.rollback();
      console.error('Erro ao criar assinatura:', error);
      return res.status(500).json(formatError(error));
    }
  }

  // Atualizar assinatura
  async update(req, res) {
    const { id } = req.params;

    try {
      const result = await SellerSubscriptionService.update(id, req.body);

      // Verificar se a operação foi bem-sucedida
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }

      return res.json({
        success: true,
        message: 'Assinatura atualizada com sucesso',
        data: result.data
      });
    } catch (error) {
      console.error(`Erro ao atualizar assinatura ID ${id}:`, error);
      return res.status(500).json(formatError(error));
    }
  }

  // Remover assinatura
  async destroy(req, res) {
    const { id } = req.params;

    try {
      const result = await SellerSubscriptionService.delete(id);

      // Verificar se a operação foi bem-sucedida
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }

      return res.json({
        success: true,
        message: 'Assinatura removida com sucesso'
      });
    } catch (error) {
      console.error(`Erro ao remover assinatura ID ${id}:`, error);
      return res.status(500).json(formatError(error));
    }
  }

  // Listar assinaturas por vendedor
  async listBySeller(req, res) {
    const { seller_id } = req.params;

    try {
      const result = await SellerSubscriptionService.getBySellerId(seller_id);

      // Verificar se a operação foi bem-sucedida
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }

      return res.json({
        success: true,
        data: result.data
      });
    } catch (error) {
      console.error(`Erro ao listar assinaturas do vendedor ID ${seller_id}:`, error);
      return res.status(500).json(formatError(error));
    }
  }

  // Retry de assinatura com método de pagamento diferente
  async retryPaymentMethod(req, res) {
    const { seller_id } = req.params;
    const { payment_method } = req.body; // 'PIX', 'BOLETO', 'CREDIT_CARD'

    try {
      if (!payment_method) {
        return res.status(400).json({
          success: false,
          message: 'Método de pagamento é obrigatório (PIX, BOLETO, CREDIT_CARD)'
        });
      }

      if (!['PIX', 'BOLETO', 'CREDIT_CARD'].includes(payment_method)) {
        return res.status(400).json({
          success: false,
          message: 'Método de pagamento inválido. Use: PIX, BOLETO ou CREDIT_CARD'
        });
      }

      const result = await SellerSubscriptionService.retryWithPaymentMethod(seller_id, payment_method);

      // Verificar se a operação foi bem-sucedida
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }

      return res.json({
        success: true,
        message: `Assinatura processada com método ${payment_method}`,
        data: result.data
      });
    } catch (error) {
      console.error(`Erro ao tentar retry de pagamento para vendedor ID ${seller_id}:`, error);
      return res.status(500).json(formatError(error));
    }
  }
}

module.exports = new SellerSubscriptionController();