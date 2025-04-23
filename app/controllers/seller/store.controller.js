const SellerService = require('../../services/seller.service');

class SellerStoreController {
  async getByStoreId(req, res) {
    try {
      const { store_id } = req.params;
      if (!store_id) {
        return res.status(400).json({ success: false, message: 'store_id é obrigatório' });
      }
      const result = await SellerService.getByStoreId(store_id);
      if (!result.success) {
        return res.status(result.status || 404).json(result);
      }
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SellerStoreController();