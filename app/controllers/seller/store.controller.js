const SellerService = require('../../services/seller.service');

class SellerStoreController {
  async getByStoreId(req, res) {
    try {
      const { store_id } = req.params;
      if (!store_id) {
        return res.status(400).json({ success: false, message: 'store_id é obrigatório' });
      }

      let result = await SellerService.getByStoreId(store_id);
      
      // Se seller não encontrado, retornar 404 para que o frontend saiba que precisa criar
      if (!result.success && result.status === 404) {
        return res.status(404).json({ 
          success: false, 
          message: `Seller não encontrado para store_id ${store_id}. Necessário completar o processo de instalação.`,
          code: 'SELLER_NOT_FOUND'
        });
      }
      
      if (!result.success) {
        return res.status(result.status || 500).json(result);
      }
      
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar seller por store_id:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SellerStoreController();