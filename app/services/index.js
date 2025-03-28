const UserService = require('./user.service');
const SellerService = require('./seller.service');
const ProductService = require('./product.service');
const OrderService = require('./order.service');
const ShopperService = require('./shopper.service');
const SellerSubscriptionService = require('./seller-subscription.service');
const SellerSubAccountService = require('./seller-subaccount.service');
const PaymentService = require('./payment.service');
const NsService = require('./ns.service');

// Serviços Asaas
const AsaasService = require('./asaas.service');

module.exports = {
  UserService,
  SellerService,
  ProductService,
  OrderService,
  ShopperService,
  SellerSubscriptionService,
  SellerSubAccountService,
  PaymentService,
  NsService,
  AsaasService
};
