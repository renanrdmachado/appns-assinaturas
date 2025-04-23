const express = require('express');
const router = express.Router();
const StoreController = require('../../controllers/seller/store.controller');

// GET /app/seller/store/:store_id
router.get('/:store_id', StoreController.getByStoreId);

module.exports = router;