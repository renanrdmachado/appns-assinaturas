const { PaymentService } = require('../services');

class PaymentController {
  // Listar todos os pagamentos
  async index(req, res) {
    try {
      const payments = await PaymentService.getAll();
      return res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Erro ao listar pagamentos:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar pagamentos',
        error: error.message
      });
    }
  }

  // Buscar pagamento específico
  async show(req, res) {
    const { id } = req.params;
    
    try {
      const result = await PaymentService.get(id);
      
      if (!result || !result.payment) {
        return res.status(404).json({ 
          success: false, 
          message: 'Pagamento não encontrado' 
        });
      }
      
      return res.json({ 
        success: true, 
        data: {
          payment: result.payment,
          relatedObject: result.relatedObject
        }
      });
    } catch (error) {
      console.error(`Erro ao buscar pagamento ID ${id}:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar pagamento',
        error: error.message
      });
    }
  }

  // Criar novo pagamento para pedido
  async storeForOrder(req, res) {
    try {
      const { order_id } = req.params;
      const result = await PaymentService.createForOrder(order_id, req.body);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Pagamento criado com sucesso',
        data: result.data
      });
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar pagamento',
        error: error.message
      });
    }
  }

  // Criar novo pagamento para assinatura de vendedor
  async storeForSellerSubscription(req, res) {
    try {
      const { subscription_id } = req.params;
      const result = await PaymentService.createForSellerSubscription(subscription_id, req.body);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Pagamento criado com sucesso',
        data: result.data
      });
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar pagamento',
        error: error.message
      });
    }
  }

  // Atualizar pagamento
  async update(req, res) {
    const { id } = req.params;
    
    try {
      const result = await PaymentService.update(id, req.body);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json({
        success: true,
        message: 'Pagamento atualizado com sucesso',
        data: result.data
      });
    } catch (error) {
      console.error(`Erro ao atualizar pagamento ID ${id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar pagamento',
        error: error.message
      });
    }
  }

  // Listar pagamentos por pedido
  async listByOrder(req, res) {
    const { order_id } = req.params;
    
    try {
      const result = await PaymentService.getByOrder(order_id);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json({ success: true, data: result.data });
    } catch (error) {
      console.error(`Erro ao listar pagamentos do pedido ID ${order_id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar pagamentos do pedido',
        error: error.message
      });
    }
  }

  // Listar pagamentos por assinatura de vendedor
  async listBySellerSubscription(req, res) {
    const { subscription_id } = req.params;
    
    try {
      const result = await PaymentService.getBySellerSubscription(subscription_id);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json({ success: true, data: result.data });
    } catch (error) {
      console.error(`Erro ao listar pagamentos da assinatura ID ${subscription_id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar pagamentos da assinatura',
        error: error.message
      });
    }
  }
}

module.exports = new PaymentController();