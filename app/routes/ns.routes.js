const express = require('express');
const router = express.Router();
const NsController = require('../controllers/ns.controller');

router.get('/install', NsController.authorize);

module.exports = router;
