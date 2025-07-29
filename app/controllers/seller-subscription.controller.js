const { SellerSubscriptionService } = require('../services');
const { formatError } = require('../utils/errorHandler');

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
    try {
      const { seller_id } = req.params;
      const subscriptionData = req.body;
      
      // Usar o novo método createSubscription que integra com Asaas
      const result = await SellerSubscriptionService.createSubscription(seller_id, subscriptionData);
      
      // Verificar se a operação foi bem-sucedida
      if (!result.success) {
        return res.status(result.status || 400).json(result);
      }

      return res.status(201).json({
        success: true,
        message: 'Assinatura criada com sucesso e integrada ao Asaas',
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
}

module.exports = new SellerSubscriptionController();