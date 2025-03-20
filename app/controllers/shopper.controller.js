const { ShopperService } = require('../services');

class ShopperController {
  // Listar todos os compradores
  async index(req, res) {
    try {
      const result = await ShopperService.getAll();
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao listar compradores:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar compradores',
        error: error.message
      });
    }
  }

  // Buscar comprador específico
  async show(req, res) {
    const { id } = req.params;
    
    try {
      const result = await ShopperService.get(id);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json(result);
    } catch (error) {
      console.error(`Erro ao buscar comprador ID ${id}:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar comprador',
        error: error.message
      });
    }
  }

  // Criar novo comprador
  async store(req, res) {
    try {
      const result = await ShopperService.create(req.body);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Comprador criado com sucesso',
        data: result.data
      });
    } catch (error) {
      console.error('Erro ao criar comprador:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar comprador',
        error: error.message
      });
    }
  }

  // Atualizar comprador
  async update(req, res) {
    const { id } = req.params;
    
    try {
      const result = await ShopperService.update(id, req.body);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json({
        success: true,
        message: 'Comprador atualizado com sucesso',
        data: result.data
      });
    } catch (error) {
      console.error(`Erro ao atualizar comprador ID ${id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar comprador',
        error: error.message
      });
    }
  }

  // Remover comprador
  async destroy(req, res) {
    const { id } = req.params;
    
    try {
      const result = await ShopperService.delete(id);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json({
        success: true,
        message: 'Comprador removido com sucesso'
      });
    } catch (error) {
      console.error(`Erro ao remover comprador ID ${id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao remover comprador',
        error: error.message
      });
    }
  }

  // Buscar comprador por nuvemshop_id externo
  async findByNuvemshopId(req, res) {
    const { nuvemshop_id } = req.params;
    
    try {
      const result = await ShopperService.getByNuvemshopId(nuvemshop_id);
      
      if (!result.success) {
        return res.status(result.status || 400).json({
          success: false,
          message: result.message
        });
      }
      
      return res.json(result);
    } catch (error) {
      console.error(`Erro ao buscar comprador com nuvemshop_id ${nuvemshop_id}:`, error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar comprador',
        error: error.message
      });
    }
  }
}

module.exports = new ShopperController();