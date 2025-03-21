const { DataTypes } = require('sequelize');

const name = 'Token';
const attributes = {
  mintAddress: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  symbol: {
    type: DataTypes.STRING,
    allowNull: true
  },
  decimals: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  creatorAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  creationTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  uri: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  totalSupply: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  lastPrice: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  lastPriceUsd: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  marketCap: {
    type: DataTypes.DECIMAL,
    allowNull: true
  },
  tradeVolume: {
    type: DataTypes.DECIMAL,
    allowNull: true,
    defaultValue: 0
  },
  buyVolume: {
    type: DataTypes.DECIMAL,
    allowNull: true,
    defaultValue: 0
  },
  sellVolume: {
    type: DataTypes.DECIMAL,
    allowNull: true,
    defaultValue: 0
  },
  buyCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  sellCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  holderCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  flagged: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  isPotentialBuy: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
};

const options = {
  timestamps: true, // 自动管理 createdAt 和 updatedAt
  indexes: [
    { 
      fields: ['creationTime'] 
    },
    { 
      fields: ['isPotentialBuy']
    }
  ]
};

/**
 * 初始化Token模型
 * @param {Sequelize} sequelize Sequelize实例
 */
const initTokenModel = async (sequelize) => {
  try {
    const Token = sequelize.define(name, attributes, options);
    await Token.sync({ alter: true });
    console.log('Token模型同步成功');
    return Token;
  } catch (error) {
    console.error('Token模型同步失败:', error);
    throw error;
  }
};

module.exports = {
  name,
  attributes,
  options,
  initTokenModel
}; 