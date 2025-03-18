require('dotenv').config();
const AsaasService = require('../../services/asaas/shopper.service');

/**
 * Creates a subscription for a shopper
 * @param {Object} req - Request object with subscription data
 * @param {Object} res - Response object
 */
const createShopperSubscription = async (req, res) => {
  try {
    const subscriptionData = req.body;
    
    // Validate required fields
    if (!subscriptionData.customer || !subscriptionData.billingType || !subscriptionData.value) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customer, billingType, or value'
      });
    }

    const result = await AsaasService.createShopperSubscription(subscriptionData);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating subscription:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to create subscription',
      error: error.message
    });
  }
};

module.exports = {
    createShopperSubscription
};
