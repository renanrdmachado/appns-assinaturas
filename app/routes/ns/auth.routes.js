const express = require('express');
const router = express.Router();
const NsAuthController = require('../../controllers/ns/auth.controller');

// Rota de instalação e autorização
router.get('/install', NsAuthController.authorize);

module.exports = router;
