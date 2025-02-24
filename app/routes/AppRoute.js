
const appProductsController = require('../controllers/AppProductsController');
const appOrdersController = require('../controllers/AppOrdersController');
const appSellersController = require('../controllers/AppSellersController');
const appUsersController = require('../controllers/AppUsersController');

const getProducts = async (req, res) => {
    // get products
    await appProductsController.getProducts(req,res);
}
const getProductById = async (req, res) => {
    // get products
    await appProductsController.getProductById(req,res);
}
const addProduct = async (req, res) => {
    // add products
    await appProductsController.addProducts(req,res);
}

const getOrders = async (req, res) => {
    // get orders
    await appOrdersController.getOrders(req,res);
}
const getOrderById = async (req, res) => {
    // get orders
    await appOrdersController.getOrderById(req,res);
}
const addOrder = async (req, res) => {
    // add order
    await appOrdersController.addOrder(req,res);
}

const getSellers = async (req, res) => {
    // get sellers
    await appSellersController.getSellers(req,res);
}
const getSellerById = async (req, res) => {
    // get sellers
    await appSellersController.getSellerById(req,res);
}
const getSellerSubscriptions = async (req, res) => {
    // get sellers subscription
    await appSellersController.getSellerSubscriptions(req,res);
}
const addSellerSubscription = async (req, res) => {
    // get sellers subscription
    await appSellersController.addSellerSubscription(req,res);
}
const addSeller = async (req, res) => {
    // add seller
    await appSellersController.addSeller(req,res);
}

const getUsers = async (req, res) => {
    // get users
    await appUsersController.getUsers(req,res);
}

const getUserById = async (req, res) => {
    // get users
    await appUsersController.getUserById(req,res);
}
const addUser = async (req, res) => {
    // add user
    await appUsersController.addUser(req,res);
}

module.exports = {
    getProducts,
    getProductById,
    addProduct,
    getOrders,
    getOrderById,
    addOrder,
    getSellers,
    getSellerById,
    getSellerSubscriptions,
    addSellerSubscription,
    addSeller,
    getUsers,
    getUserById,
    addUser
}