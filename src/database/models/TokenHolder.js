const { DataTypes } = require('sequelize');

const name = 'TokenHolder';
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
  address: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'unknown-address'
  },
  ownerAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  balance: {
    type: DataTypes.DECIMAL(30, 8),
    allowNull: false,
    defaultValue: 0
  },
  percentage: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: true
  },
  percentOfTotal: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: true
  },
  isCreator: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  lastUpdateTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
};

const options = {
  timestamps: true,
  indexes: [
    { 
      fields: ['tokenMintAddress'] 
    },
    { 
      fields: ['address'] 
    }
  ]
};

/**
 * 关联模型
 * @param {Object} models 所有模型集合
 */
const associate = (models) => {
  if (models.Token) {
    models.TokenHolder.belongsTo(models.Token, { foreignKey: 'tokenMintAddress', targetKey: 'mintAddress' });
  }
};

/**
 * 初始化TokenHolder模型
 * @param {Sequelize} sequelize Sequelize实例
 */
const initTokenHolderModel = async (sequelize) => {
  try {
    const TokenHolder = sequelize.define(name, attributes, options);
    
    // 强制同步表结构，确保表中包含所有定义的列
    await TokenHolder.sync({ alter: true });
    
    console.log('TokenHolder模型同步成功');
    
    // 检查表结构
    const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'TokenHolders'");
    console.log('TokenHolders表的列:', results.map(r => r.column_name));
    
    // 确保表中包含address列
    if (!results.some(r => r.column_name === 'address')) {
      console.log('TokenHolders表缺少address列，将添加此列');
      await sequelize.query("ALTER TABLE \"TokenHolders\" ADD COLUMN address VARCHAR(255)");
      console.log('已添加address列');
    }
    
    return TokenHolder;
  } catch (error) {
    console.error('TokenHolder模型同步失败:', error);
    throw error;
  }
};

module.exports = {
  name,
  attributes,
  options,
  associate,
  initTokenHolderModel
}; 