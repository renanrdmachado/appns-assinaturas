const ShopperSubscriptionService = require('../services/shopper-subscription.service');
const { formatError } = require('../utils/errorHandler');
const { getClientIp } = require('../utils/request-ip');

class ShopperSubscriptionController {
  // Listar todas as assinaturas de compradores
  async index(req, res) {
    try {
      const result = await ShopperSubscriptionService.getAll();
      
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }
      
      return res.json({ 
        success: true, 
        data: result.data 
      });
    } catch (error) {
      console.error('Erro ao listar assinaturas de compradores:', error);
      return res.status(500).json(formatError(error));
    }
  }

  // Buscar assinatura específica
  async show(req, res) {
    const { id } = req.params;
    
    try {
      const result = await ShopperSubscriptionService.get(id);
      
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

  // Criar nova assinatura a partir de um pedido
  async store(req, res) {
    try {
      const { order_id } = req.params;
      const subscriptionData = { ...(req.body || {}) };

      // Se for cartão, injeta o remoteIp calculado no backend
      if ((subscriptionData?.billing_type || subscriptionData?.billingType) === 'CREDIT_CARD') {
        const ip = getClientIp(req);
        subscriptionData.remoteIp = ip;
      }
      
      // Passar order_id e dados da assinatura para o service
  const result = await ShopperSubscriptionService.create(order_id, subscriptionData);
      
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }

      return res.status(201).json({
        success: true,
        message: 'Assinatura criada com sucesso',
        data: result.data
      });
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      return res.status(500).json(formatError(error));
    }
  }

  // Atualizar assinatura
  async update(req, res) {
    const { id } = req.params;
    
    try {
      const result = await ShopperSubscriptionService.update(id, req.body);
      
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
      const result = await ShopperSubscriptionService.delete(id);
      
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

  // Listar assinaturas por comprador
  async listByShopper(req, res) {
    const { shopper_id } = req.params;
    
    try {
      const result = await ShopperSubscriptionService.getByShopperId(shopper_id);
      
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }
      
      return res.json({ 
        success: true, 
        data: result.data 
      });
    } catch (error) {
      console.error(`Erro ao listar assinaturas do comprador ID ${shopper_id}:`, error);
      return res.status(500).json(formatError(error));
    }
  }

  // Listar assinaturas por pedido
  async listByOrder(req, res) {
    const { order_id } = req.params;
    
    try {
      const result = await ShopperSubscriptionService.getByOrderId(order_id);
      
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }
      
      return res.json({ 
        success: true, 
        data: result.data 
      });
    } catch (error) {
      console.error(`Erro ao listar assinaturas do pedido ID ${order_id}:`, error);
      return res.status(500).json(formatError(error));
    }
  }
}

module.exports = new ShopperSubscriptionController();
