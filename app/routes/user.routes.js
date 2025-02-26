const express = require('express');
const router = express.Router();
const { getUsers, getUserById, addUser } = require('../controllers/AppUsersController');

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', addUser);

module.exports = router;
