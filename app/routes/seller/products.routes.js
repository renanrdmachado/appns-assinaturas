const express = require('express');
const router = express.Router({ mergeParams: true });
const SellerProductsController = require('../../controllers/seller/products.controller');

/**
 * @route GET /sellers/:seller_id/products
 * @desc Lista todos os produtos de um seller
 * @access Privado
 */
router.get('/', SellerProductsController.getProducts);

/**
 * @route GET /sellers/:seller_id/products/:product_id
 * @desc Busca um produto específico de um seller
 * @access Privado
 */
router.get('/:product_id', SellerProductsController.getProductById);

/**
 * @route POST /sellers/:seller_id/products
 * @desc Cria um novo produto para um seller
 * @access Privado
 */
router.post('/', SellerProductsController.createProduct);

/**
 * @route PUT /sellers/:seller_id/products/:product_id
 * @desc Atualiza um produto de um seller
 * @access Privado
 */
router.put('/:product_id', SellerProductsController.updateProduct);

/**
 * @route DELETE /sellers/:seller_id/products/:product_id
 * @desc Remove um produto de um seller
 * @access Privado
 */
router.delete('/:product_id', SellerProductsController.deleteProduct);

/**
 * @route GET /sellers/:seller_id/products/:product_id/variants
 * @desc Obter variantes de um produto do seller
 * @access Privado
 */
router.get('/:product_id/variants', SellerProductsController.getProductVariants);

/**
 * @route POST /sellers/:seller_id/products/:product_id/sync
 * @desc Sincroniza um produto do seller com a Nuvemshop
 * @access Privado
 */
router.post('/:product_id/sync', SellerProductsController.syncProduct);

module.exports = router;