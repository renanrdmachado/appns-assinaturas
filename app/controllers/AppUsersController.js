require('dotenv').config();
const axios = require('axios');
const User = require('../models/User');

const getUsers = async (req,res) => {
    console.log("Controller - AppUsersController/getUsers");
    const getUser = await User.get();
    console.log("getUser",getUser);

    res.status(200).json(getUser);
}
const getUserById = async (req,res) => {
    console.log("Controller - AppUsersController/getUserById");
    const getUser = await User.get(req.params.id);
    console.log("getUserById",getUser);

    res.status(200).json(getUser);
}
const addUser = (req,res) => {
    console.log("Controller - AppUsersController/addUser");

    const createUser = User.create(req.body);
    console.log("createUser",createUser);

    res.status(200).json({ message: 'Controller - AppUsersController/addUser' });
}

module.exports = {
    getUsers,
    getUserById,
    addUser
}