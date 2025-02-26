const express = require('express');
const router = express.Router();
const { authorize } = require('../controllers/NsController');

router.get('/install', authorize);

module.exports = router;
