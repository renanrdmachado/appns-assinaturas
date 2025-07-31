const express = require('express');
const router = express.Router();
const documentsController = require('../../controllers/seller/documents.controller');

// Verificar status de documentos do seller
router.get('/:sellerId/status', documentsController.checkSellerStatus);

// Completar dados do seller (CPF/CNPJ)
router.post('/:sellerId/complete', documentsController.completeSellerData);

module.exports = router;
