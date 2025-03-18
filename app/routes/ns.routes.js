const express = require('express');
const router = express.Router();
const { authorize } = require('../controllers/ns.controller');

router.get('/install', authorize);

module.exports = router;
