require('dotenv').config();
const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql'
});

// Create a model for the user
const User = sequelize.define('User', {
  // Define attributes
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  seller_id: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  // Other model options
});

// Create a model for the seller
const Seller = sequelize.define('Seller', {
  // Define attributes
  nuvemshop_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  nuvemshop_info: {
    type: DataTypes.JSON,
    allowNull: true
  },
  nuvemshop_api_token: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  payments_customer_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payments_subscription_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  payments_next_due: {
    type: DataTypes.DATE,
    allowNull: true
  },
  payments_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subaccount_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subaccount_wallet_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subaccount_api_key: {
    type: DataTypes.STRING,
    allowNull: true
  },
  app_start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  app_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_cpfCnpj: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_mobilePhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_site: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_incomeValue: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_addressNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_province: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_postalCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_loginEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Asaas_birthDate: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  // Other model options
});

// Create a model for the orders
const Order = sequelize.define('Order', {
  // Define attributes
  seller_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  products: {
    type: DataTypes.JSON,
    allowNull: false
  },
  customer_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customer_info: {
    type: DataTypes.JSON,
    allowNull: false
  },
  nuvemshop: {
    type: DataTypes.JSON,
    allowNull: true
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  cycle: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  // Other model options
});

// Create a model for the products
const Product = sequelize.define('Product', {
  // Define attributes
  seller_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categories: {
    type: DataTypes.JSON,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  // Other model options
});


sequelize.sync() // Use { force: true } to drop and re-create tables
  .then(() => {
    console.log('Database & tables created!');
  })
  .catch(err => {
    console.error('Unable to create tables:', err);
  });

module.exports = {
  User,
  Seller,
  Order,
  Product
};

