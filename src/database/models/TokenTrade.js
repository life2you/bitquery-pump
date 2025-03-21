const { DataTypes } = require('sequelize');

const name = 'TokenTrade';
const attributes = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tokenMintAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Tokens',
      key: 'mintAddress'
    }
  },
  transactionSignature: {
    type: DataTypes.STRING,
    allowNull: false
  },
  blockTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  buyerAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sellerAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true
  },
  priceUsd: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true
  },
  type: {
    type: DataTypes.STRING, // 'buy' or 'sell'
    allowNull: true
  },
  programMethod: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dexName: {
    type: DataTypes.STRING,
    allowNull: true
  }
};

const options = {
  timestamps: true,
  indexes: [
    { 
      fields: ['tokenMintAddress'] 
    },
    { 
      fields: ['transactionSignature'] 
    },
    {
      fields: ['blockTime']
    },
    {
      fields: ['type']
    }
  ]
};

/**
 * 关联模型
 * @param {Object} models 所有模型集合
 */
const associate = (models) => {
  if (models.Token) {
    models.TokenTrade.belongsTo(models.Token, { foreignKey: 'tokenMintAddress', targetKey: 'mintAddress' });
  }
};

/**
 * 初始化TokenTrade模型
 * @param {Sequelize} sequelize Sequelize实例
 */
const initTokenTradeModel = async (sequelize) => {
  try {
    const TokenTrade = sequelize.define(name, attributes, options);
    await TokenTrade.sync({ alter: true });
    console.log('TokenTrade模型同步成功');
    return TokenTrade;
  } catch (error) {
    console.error('TokenTrade模型同步失败:', error);
    throw error;
  }
};

module.exports = {
  name,
  attributes,
  options,
  associate,
  initTokenTradeModel
}; 