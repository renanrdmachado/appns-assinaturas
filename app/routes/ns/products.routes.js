const express = require('express');
const router = express.Router({ mergeParams: true }); // Importante para acessar seller_id
const NsProductsController = require('../../controllers/ns/products.controller');

// Rotas de produtos
router.get('/', NsProductsController.getProducts);
router.get('/:product_id', NsProductsController.getProductById);
router.post('/', NsProductsController.createProduct);
router.put('/:product_id', NsProductsController.updateProduct);
router.delete('/:product_id', NsProductsController.deleteProduct);
router.get('/:product_id/variants', NsProductsController.getProductVariants);

// Nova rota para sincronização de produtos
router.post('/:product_id/sync', NsProductsController.syncProduct);

module.exports = router;
