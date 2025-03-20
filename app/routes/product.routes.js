const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/product.controller');

router.get('/', ProductController.index);
router.get('/:id', ProductController.show);
router.post('/', ProductController.store);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.destroy);

module.exports = router;
