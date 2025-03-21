const { fetchTokenPrice } = require('../api/bitquery');
const { DataTypes } = require('sequelize');
const db = require('../database');
const sequelize = db.sequelize;
const Token = sequelize.define('Token', require('../database/models/Token').attributes, require('../database/models/Token').options);

// 创建模拟交易模型
const SimulatedTrade = sequelize.define('SimulatedTrade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tokenMintAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Token,
      key: 'mintAddress'
    }
  },
  type: {
    type: DataTypes.ENUM('buy', 'sell'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  priceUsd: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true
  },
  totalValue: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false
  },
  totalValueUsd: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  strategy: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('open', 'closed'),
    allowNull: false,
    defaultValue: 'open'
  },
  pnl: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true
  },
  pnlPercent: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['tokenMintAddress']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// 建立与Token模型的关联
SimulatedTrade.belongsTo(Token, { foreignKey: 'tokenMintAddress', targetKey: 'mintAddress' });
Token.hasMany(SimulatedTrade, { foreignKey: 'tokenMintAddress', sourceKey: 'mintAddress' });

/**
 * 初始化模拟交易模型
 */
const initSimulatedTradeModel = async () => {
  try {
    await SimulatedTrade.sync({ alter: true });
    console.log('SimulatedTrade模型同步成功');
  } catch (error) {
    console.error('SimulatedTrade模型同步失败:', error);
  }
};

/**
 * 模拟买入代币
 * @param {string} tokenMintAddress 代币地址
 * @param {number} amount 买入数量
 * @param {number} price 买入价格
 * @param {string} reason 买入理由
 * @param {number} score 代币评分
 * @param {string} strategy 使用的策略
 * @returns {object} 模拟交易记录
 */
const simulateBuy = async (tokenMintAddress, amount, price, reason, score, strategy) => {
  try {
    const token = await Token.findByPk(tokenMintAddress);
    if (!token) {
      throw new Error(`代币${tokenMintAddress}不存在`);
    }

    const priceUsd = price * (token.lastPriceUsd / token.lastPrice || 1);
    const totalValue = amount * price;
    const totalValueUsd = amount * priceUsd;

    // 创建模拟买入记录
    const trade = await SimulatedTrade.create({
      tokenMintAddress,
      type: 'buy',
      amount,
      price,
      priceUsd,
      totalValue,
      totalValueUsd,
      reason,
      score,
      strategy,
      status: 'open'
    });

    return {
      id: trade.id,
      tokenMintAddress,
      symbol: token.symbol,
      name: token.name,
      type: 'buy',
      amount,
      price,
      priceUsd,
      totalValue,
      totalValueUsd,
      reason,
      score,
      strategy,
      timestamp: trade.createdAt
    };
  } catch (error) {
    console.error(`模拟买入代币${tokenMintAddress}失败:`, error);
    throw error;
  }
};

/**
 * 模拟卖出代币
 * @param {string} tokenMintAddress 代币地址
 * @param {number} amount 卖出数量
 * @param {number} price 卖出价格
 * @param {string} reason 卖出理由
 * @param {string} strategy 使用的策略
 * @returns {object} 模拟交易记录和盈亏情况
 */
const simulateSell = async (tokenMintAddress, amount, price, reason, strategy) => {
  try {
    const token = await Token.findByPk(tokenMintAddress);
    if (!token) {
      throw new Error(`代币${tokenMintAddress}不存在`);
    }

    // 检查是否有足够的持仓可卖出
    const openBuyTrades = await SimulatedTrade.findAll({
      where: {
        tokenMintAddress,
        type: 'buy',
        status: 'open'
      },
      order: [['createdAt', 'ASC']] // 按时间顺序，先买先卖
    });

    const openSellTrades = await SimulatedTrade.findAll({
      where: {
        tokenMintAddress,
        type: 'sell',
        status: 'open'
      }
    });

    // 计算当前持仓量
    const totalBought = openBuyTrades.reduce((sum, trade) => sum + parseFloat(trade.amount), 0);
    const totalSold = openSellTrades.reduce((sum, trade) => sum + parseFloat(trade.amount), 0);
    const currentHolding = totalBought - totalSold;

    if (currentHolding < amount) {
      throw new Error(`持仓不足，当前持有${currentHolding}，尝试卖出${amount}`);
    }

    const priceUsd = price * (token.lastPriceUsd / token.lastPrice || 1);
    const totalValue = amount * price;
    const totalValueUsd = amount * priceUsd;

    // 先创建卖出记录
    const sellTrade = await SimulatedTrade.create({
      tokenMintAddress,
      type: 'sell',
      amount,
      price,
      priceUsd,
      totalValue,
      totalValueUsd,
      reason,
      strategy,
      status: 'open'
    });

    // 计算盈亏 (FIFO原则 - 先进先出)
    let remainingAmountToSell = amount;
    let totalCost = 0;
    let totalProceed = amount * price;
    let tradeIdsToClose = [];

    for (const buyTrade of openBuyTrades) {
      if (remainingAmountToSell <= 0) break;

      const buyTradeAmount = parseFloat(buyTrade.amount);
      const amountToSell = Math.min(buyTradeAmount, remainingAmountToSell);
      
      // 累计成本
      totalCost += amountToSell * parseFloat(buyTrade.price);
      remainingAmountToSell -= amountToSell;

      // 如果完全卖出了这笔买入，则关闭这笔交易
      if (amountToSell === buyTradeAmount) {
        tradeIdsToClose.push(buyTrade.id);
      } else if (amountToSell > 0) {
        // 部分卖出，更新买入记录的金额
        await buyTrade.update({
          amount: buyTradeAmount - amountToSell
        });
      }
    }

    // 关闭已完全卖出的买入交易
    if (tradeIdsToClose.length > 0) {
      await SimulatedTrade.update(
        { status: 'closed' },
        { where: { id: tradeIdsToClose } }
      );
    }

    // 计算盈亏
    const pnl = totalProceed - totalCost;
    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    // 更新卖出记录的盈亏信息
    await sellTrade.update({
      pnl,
      pnlPercent
    });

    return {
      id: sellTrade.id,
      tokenMintAddress,
      symbol: token.symbol,
      name: token.name,
      type: 'sell',
      amount,
      price,
      priceUsd,
      totalValue,
      totalValueUsd,
      reason,
      strategy,
      pnl,
      pnlPercent,
      timestamp: sellTrade.createdAt
    };
  } catch (error) {
    console.error(`模拟卖出代币${tokenMintAddress}失败:`, error);
    throw error;
  }
};

/**
 * 获取当前持仓明细
 */
const getCurrentHoldings = async () => {
  try {
    // 获取所有代币的买入和卖出记录
    const allTrades = await SimulatedTrade.findAll({
      include: [{
        model: Token,
        attributes: ['mintAddress', 'name', 'symbol', 'lastPrice', 'lastPriceUsd']
      }]
    });

    // 按代币分组
    const holdingsByToken = {};

    for (const trade of allTrades) {
      const mintAddress = trade.tokenMintAddress;
      
      if (!holdingsByToken[mintAddress]) {
        holdingsByToken[mintAddress] = {
          mintAddress,
          name: trade.Token?.name || 'Unknown',
          symbol: trade.Token?.symbol || 'Unknown',
          totalBought: 0,
          totalSold: 0,
          totalCost: 0,
          avgBuyPrice: 0,
          currentPrice: parseFloat(trade.Token?.lastPrice) || 0,
          currentPriceUsd: parseFloat(trade.Token?.lastPriceUsd) || 0,
          holding: 0,
          currentValue: 0,
          pnl: 0,
          pnlPercent: 0,
          realizedPnl: 0
        };
      }

      const holding = holdingsByToken[mintAddress];

      if (trade.type === 'buy') {
        holding.totalBought += parseFloat(trade.amount);
        holding.totalCost += parseFloat(trade.totalValue);
      } else {
        holding.totalSold += parseFloat(trade.amount);
        holding.realizedPnl += parseFloat(trade.pnl || 0);
      }
    }

    // 计算当前持仓和盈亏
    const result = [];
    for (const mintAddress in holdingsByToken) {
      const holding = holdingsByToken[mintAddress];
      
      holding.holding = holding.totalBought - holding.totalSold;
      holding.avgBuyPrice = holding.totalBought > 0 ? holding.totalCost / holding.totalBought : 0;
      holding.currentValue = holding.holding * holding.currentPrice;
      
      // 计算未实现盈亏
      const unrealizedPnl = holding.currentValue - (holding.holding * holding.avgBuyPrice);
      holding.pnl = unrealizedPnl + holding.realizedPnl;
      holding.pnlPercent = holding.totalCost > 0 ? (holding.pnl / holding.totalCost) * 100 : 0;
      
      // 只添加有持仓的代币
      if (holding.holding > 0) {
        result.push(holding);
      }
    }

    return result;
  } catch (error) {
    console.error('获取当前持仓明细失败:', error);
    throw error;
  }
};

/**
 * 获取交易记录历史
 * @param {number} limit 限制数量
 * @param {number} offset 偏移量
 */
const getTradeHistory = async (limit = 100, offset = 0) => {
  try {
    const trades = await SimulatedTrade.findAll({
      include: [{
        model: Token,
        attributes: ['mintAddress', 'name', 'symbol']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return trades.map(trade => ({
      id: trade.id,
      tokenMintAddress: trade.tokenMintAddress,
      symbol: trade.Token?.symbol || 'Unknown',
      name: trade.Token?.name || 'Unknown',
      type: trade.type,
      amount: parseFloat(trade.amount),
      price: parseFloat(trade.price),
      priceUsd: parseFloat(trade.priceUsd || 0),
      totalValue: parseFloat(trade.totalValue),
      totalValueUsd: parseFloat(trade.totalValueUsd || 0),
      reason: trade.reason,
      score: parseFloat(trade.score || 0),
      strategy: trade.strategy,
      status: trade.status,
      pnl: parseFloat(trade.pnl || 0),
      pnlPercent: parseFloat(trade.pnlPercent || 0),
      timestamp: trade.createdAt
    }));
  } catch (error) {
    console.error('获取交易记录历史失败:', error);
    throw error;
  }
};

/**
 * 获取策略绩效统计
 */
const getStrategyPerformance = async () => {
  try {
    // 获取所有完成的交易（已卖出的）
    const completedTrades = await SimulatedTrade.findAll({
      where: {
        type: 'sell'
      }
    });

    // 按策略分组
    const performanceByStrategy = {};

    for (const trade of completedTrades) {
      const strategy = trade.strategy || 'default';
      
      if (!performanceByStrategy[strategy]) {
        performanceByStrategy[strategy] = {
          strategy,
          totalTrades: 0,
          profitableTrades: 0,
          lossTrades: 0,
          totalPnl: 0,
          avgPnlPercent: 0,
          winRate: 0,
          maxProfit: 0,
          maxLoss: 0
        };
      }

      const performance = performanceByStrategy[strategy];
      const pnl = parseFloat(trade.pnl || 0);
      const pnlPercent = parseFloat(trade.pnlPercent || 0);

      performance.totalTrades++;
      performance.totalPnl += pnl;
      
      if (pnl > 0) {
        performance.profitableTrades++;
        performance.maxProfit = Math.max(performance.maxProfit, pnlPercent);
      } else {
        performance.lossTrades++;
        performance.maxLoss = Math.min(performance.maxLoss, pnlPercent);
      }
    }

    // 计算每个策略的绩效指标
    for (const strategy in performanceByStrategy) {
      const performance = performanceByStrategy[strategy];
      
      performance.winRate = performance.totalTrades > 0 ? 
        (performance.profitableTrades / performance.totalTrades) * 100 : 0;
      
      performance.avgPnlPercent = performance.totalTrades > 0 ?
        performance.totalPnl / performance.totalTrades : 0;
    }

    return Object.values(performanceByStrategy);
  } catch (error) {
    console.error('获取策略绩效统计失败:', error);
    throw error;
  }
};

module.exports = {
  SimulatedTrade,
  initSimulatedTradeModel,
  simulateBuy,
  simulateSell,
  getCurrentHoldings,
  getTradeHistory,
  getStrategyPerformance
}; 