const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definição do modelo Shopper
const Shopper = sequelize.define('Shopper', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nuvemshop_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true, // Campo opcional
    set(value) {
      // Normaliza valores "vazios" para null para não violar unique com '0' ou ''
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        value === 0 ||
        value === '0' ||
        (typeof value === 'string' && value.trim().toLowerCase() === 'null')
      ) {
        this.setDataValue('nuvemshop_id', null);
      } else {
        this.setDataValue('nuvemshop_id', String(value));
      }
    }
  },
  nuvemshop_info: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('nuvemshop_info');
      if (!value || value === "") return {};
      
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error('Erro ao parser nuvemshop_info:', error.message);
        return {};
      }
    },
    set(value) {
      if (value === null || value === undefined || value === "") {
        this.setDataValue('nuvemshop_info', "{}");
        return;
      }
      
      try {
        const stringValue = typeof value === 'string' 
          ? value 
          : JSON.stringify(value);
        
        // Verificar se é um JSON válido
        JSON.parse(stringValue);
        this.setDataValue('nuvemshop_info', stringValue);
      } catch (error) {
        console.error('Erro ao converter nuvemshop_info para JSON:', error.message);
        this.setDataValue('nuvemshop_info', "{}");
      }
    }
  },
  payments_customer_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID do cliente no sistema de pagamento (Asaas)'
  },
  payments_status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false // Nome é obrigatório agora que não usamos nuvemshop_id
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false // Email é obrigatório agora que não usamos nuvemshop_id
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

const User = require('./User');

// Adicionar associação com o modelo User
Shopper.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = Shopper;
