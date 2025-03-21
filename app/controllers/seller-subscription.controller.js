const { SellerSubscriptionService } = require('../services');

class SellerSubscriptionController {
  // Listar todas as assinaturas de vendedores
  async index(req, res) {
    try {
      const subscriptions = await SellerSubscriptionService.getAll();
      return res.json({ success: true, data: subscriptions });
    } catch (error) {
      console.error('Erro ao listar assinaturas de vendedores:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar assinaturas de vendedores',
        error: error.message
      });
    }
  }

  // Buscar assinatura específica
  async show(req, res) {
    const { id } = req.params;
    
    try {
      const subscription = await SellerSubscriptionService.get(id);
      
      if (!subscription) {
        return res.status(404).json({ 
          success: false, 
          message: 'Assinatura não encontrada' 
        });
      }
      
      return res.json({ success: true, data: subscription });
    } catch (error) {
      console.error(`Erro ao buscar assinatura ID ${id}:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar assinatura',
        error: error.message
      });
    }
  }

  // Criar nova assinatura
  async store(req, res) {
    try {
      const { seller_id } = req.params;
      const subscriptionData = req.body;
      
      // Passar seller_id e dados da assinatura separadamente para o service
      const result = await SellerSubscriptionService.create(seller_id, subscriptionData);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Assinatura criada com sucesso',
        data: result.data
      });
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar assinatura',
        error: error.message
      });
    }
  }

  // Atualizar assinatura
  async update(req, res) {
    const { id } = req.params;
    
    try {
      const result = await SellerSubscriptionService.update(id, req.body);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json({
        success: true,
        message: 'Assinatura atualizada com sucesso',
        data: result.data
      });
    } catch (error) {
      console.error(`Erro ao atualizar assinatura ID ${id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar assinatura',
        error: error.message
      });
    }
  }

  // Remover assinatura
  async destroy(req, res) {
    const { id } = req.params;
    
    try {
      const result = await SellerSubscriptionService.delete(id);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json({
        success: true,
        message: 'Assinatura removida com sucesso'
      });
    } catch (error) {
      console.error(`Erro ao remover assinatura ID ${id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao remover assinatura',
        error: error.message
      });
    }
  }

  // Listar assinaturas por vendedor
  async listBySeller(req, res) {
    const { seller_id } = req.params;
    
    try {
      const result = await SellerSubscriptionService.getBySellerId(seller_id);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json({ success: true, data: result.data });
    } catch (error) {
      console.error(`Erro ao listar assinaturas do vendedor ID ${seller_id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar assinaturas do vendedor',
        error: error.message
      });
    }
  }
}

module.exports = new SellerSubscriptionController();