const { simulateBuy, simulateSell, getCurrentHoldings } = require('./tradeSimulation');
const { models } = require('../database');

/**
 * 执行所有买入策略
 * @returns {Promise<Array>} 买入操作结果数组
 */
const executeAllBuyStrategies = async () => {
  console.log('执行所有买入策略...');
  
  try {
    // 存储所有策略的结果
    const allResults = [];
    
    // 执行早期买家策略
    const earlyBuyerResults = await executeEarlyBuyerStrategy();
    if (earlyBuyerResults.length > 0) {
      allResults.push(...earlyBuyerResults);
    }
    
    // 执行成长型代币策略
    const growingTokenResults = await executeGrowingTokenStrategy();
    if (growingTokenResults.length > 0) {
      allResults.push(...growingTokenResults);
    }
    
    // 返回所有结果
    return allResults;
  } catch (error) {
    console.error('执行买入策略出错:', error);
    return [];
  }
};

/**
 * 执行所有卖出策略
 * @returns {Promise<Array>} 卖出操作结果数组
 */
const executeAllSellStrategies = async () => {
  console.log('执行所有卖出策略...');
  
  try {
    // 获取当前持仓
    const holdings = await getCurrentHoldings();
    if (!holdings || holdings.length === 0) {
      console.log('没有持仓，跳过卖出策略');
      return [];
    }
    
    // 存储所有策略的结果
    const allResults = [];
    
    // 执行止盈策略
    const takeProfitResults = await executeTakeProfitStrategy(holdings);
    if (takeProfitResults.length > 0) {
      allResults.push(...takeProfitResults);
    }
    
    // 执行止损策略
    const stopLossResults = await executeStopLossStrategy(holdings);
    if (stopLossResults.length > 0) {
      allResults.push(...stopLossResults);
    }
    
    // 返回所有结果
    return allResults;
  } catch (error) {
    console.error('执行卖出策略出错:', error);
    return [];
  }
};

/**
 * 执行早期买家策略 - 寻找刚创建的新代币
 * @returns {Promise<Array>} 买入操作结果数组
 */
const executeEarlyBuyerStrategy = async () => {
  const strategyName = '早期买家策略';
  console.log(`执行${strategyName}...`);
  
  try {
    // 查找过去24小时内创建的代币
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const newTokens = await models.Token.findAll({
      where: {
        creationTime: {
          [models.Sequelize.Op.gte]: oneDayAgo
        },
        // 不是已标记的代币
        flagged: false,
        // 有交易活动
        tradeVolume: {
          [models.Sequelize.Op.gt]: 0
        }
      },
      limit: 10,
      order: [['creationTime', 'DESC']]
    });
    
    console.log(`找到${newTokens.length}个新代币`);
    
    const results = [];
    
    // 为每个符合条件的代币执行买入
    for (const token of newTokens) {
      try {
        // 检查代币是否有基本信息
        if (!token.symbol || !token.name || !token.lastPrice) {
          console.log(`代币${token.mintAddress}缺少基本信息，跳过`);
          continue;
        }
        
        // 简单评分算法
        const score = calculateEarlyTokenScore(token);
        if (score < 60) {
          console.log(`代币${token.symbol}(${token.mintAddress})评分${score}低于60，跳过`);
          continue;
        }
        
        // 决定买入金额 - 根据评分和分配的资金
        const amount = (score / 100) * (10000 / token.lastPrice);
        
        // 买入代币
        const buyResult = await simulateBuy(
          token.mintAddress,
          amount,
          token.lastPrice,
          `早期发现刚创建的代币，评分: ${score}`,
          score,
          strategyName
        );
        
        results.push(buyResult);
        console.log(`${strategyName}买入成功: ${token.symbol}(${token.mintAddress}), 数量: ${amount}, 价格: ${token.lastPrice}`);
      } catch (error) {
        console.error(`${strategyName}买入代币${token.mintAddress}失败:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error(`执行${strategyName}出错:`, error);
    return [];
  }
};

/**
 * 执行成长型代币策略 - 寻找交易量增长的代币
 * @returns {Promise<Array>} 买入操作结果数组
 */
const executeGrowingTokenStrategy = async () => {
  const strategyName = '成长型代币策略';
  console.log(`执行${strategyName}...`);
  
  try {
    // 查找交易量增长的代币 (这里假设我们已经计算了相关指标)
    const tokens = await models.Token.findAll({
      where: {
        // 不是已标记的代币
        flagged: false,
        // 标记为潜在买入的代币
        isPotentialBuy: true
      },
      limit: 5
    });
    
    console.log(`找到${tokens.length}个成长型代币`);
    
    const results = [];
    
    // 为每个符合条件的代币执行买入
    for (const token of tokens) {
      try {
        // 检查代币是否有基本信息
        if (!token.symbol || !token.name || !token.lastPrice) {
          console.log(`代币${token.mintAddress}缺少基本信息，跳过`);
          continue;
        }
        
        // 计算评分
        const score = calculateGrowingTokenScore(token);
        if (score < 70) {
          console.log(`代币${token.symbol}(${token.mintAddress})评分${score}低于70，跳过`);
          continue;
        }
        
        // 决定买入金额 - 根据评分和分配的资金
        const amount = (score / 100) * (15000 / token.lastPrice);
        
        // 买入代币
        const buyResult = await simulateBuy(
          token.mintAddress,
          amount,
          token.lastPrice,
          `成长型代币交易量增长，评分: ${score}`,
          score,
          strategyName
        );
        
        results.push(buyResult);
        console.log(`${strategyName}买入成功: ${token.symbol}(${token.mintAddress}), 数量: ${amount}, 价格: ${token.lastPrice}`);
        
        // 更新代币状态
        await token.update({ isPotentialBuy: false });
      } catch (error) {
        console.error(`${strategyName}买入代币${token.mintAddress}失败:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error(`执行${strategyName}出错:`, error);
    return [];
  }
};

/**
 * 执行止盈策略
 * @param {Array} holdings 当前持仓
 * @returns {Promise<Array>} 卖出操作结果数组
 */
const executeTakeProfitStrategy = async (holdings) => {
  const strategyName = '止盈策略';
  console.log(`执行${strategyName}...`);
  
  try {
    const results = [];
    
    // 设置止盈阈值
    const profitThreshold = 30; // 30%盈利
    
    // 检查每个持仓
    for (const holding of holdings) {
      try {
        if (holding.pnlPercent >= profitThreshold) {
          console.log(`代币${holding.symbol}(${holding.mintAddress})盈利${holding.pnlPercent.toFixed(2)}%，触发止盈`);
          
          // 卖出全部持仓
          const sellResult = await simulateSell(
            holding.mintAddress,
            holding.holding,
            holding.currentPrice,
            `达到${profitThreshold}%止盈目标，实际盈利: ${holding.pnlPercent.toFixed(2)}%`,
            strategyName
          );
          
          results.push(sellResult);
          console.log(`${strategyName}卖出成功: ${holding.symbol}(${holding.mintAddress}), 数量: ${holding.holding}, 价格: ${holding.currentPrice}, 盈利: ${sellResult.pnl}`);
        }
      } catch (error) {
        console.error(`${strategyName}卖出代币${holding.mintAddress}失败:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error(`执行${strategyName}出错:`, error);
    return [];
  }
};

/**
 * 执行止损策略
 * @param {Array} holdings 当前持仓
 * @returns {Promise<Array>} 卖出操作结果数组
 */
const executeStopLossStrategy = async (holdings) => {
  const strategyName = '止损策略';
  console.log(`执行${strategyName}...`);
  
  try {
    const results = [];
    
    // 设置止损阈值
    const lossThreshold = -15; // -15%亏损
    
    // 检查每个持仓
    for (const holding of holdings) {
      try {
        if (holding.pnlPercent <= lossThreshold) {
          console.log(`代币${holding.symbol}(${holding.mintAddress})亏损${holding.pnlPercent.toFixed(2)}%，触发止损`);
          
          // 卖出全部持仓
          const sellResult = await simulateSell(
            holding.mintAddress,
            holding.holding,
            holding.currentPrice,
            `达到${Math.abs(lossThreshold)}%止损线，实际亏损: ${Math.abs(holding.pnlPercent.toFixed(2))}%`,
            strategyName
          );
          
          results.push(sellResult);
          console.log(`${strategyName}卖出成功: ${holding.symbol}(${holding.mintAddress}), 数量: ${holding.holding}, 价格: ${holding.currentPrice}, 亏损: ${sellResult.pnl}`);
        }
      } catch (error) {
        console.error(`${strategyName}卖出代币${holding.mintAddress}失败:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error(`执行${strategyName}出错:`, error);
    return [];
  }
};

/**
 * 计算早期代币评分
 * @param {Object} token 代币对象
 * @returns {Number} 评分 (0-100)
 */
const calculateEarlyTokenScore = (token) => {
  let score = 0;
  
  try {
    // 1. 基础分 - 有基本信息
    if (token.name && token.symbol && token.decimals) {
      score += 20;
    }
    
    // 2. 交易量 - 新代币有交易活动
    if (token.tradeVolume > 0) {
      score += Math.min(30, token.tradeVolume / 1000 * 10);
    }
    
    // 3. 买入与卖出比例 - 买入多于卖出是好信号
    if (token.buyCount > 0 && token.sellCount > 0) {
      const ratio = token.buyCount / token.sellCount;
      if (ratio > 1.5) {
        score += 20;
      } else if (ratio > 1) {
        score += 10;
      }
    } else if (token.buyCount > 0 && token.sellCount === 0) {
      // 只有买入没有卖出
      score += 25;
    }
    
    // 4. 持有者数量 - 更多持有者意味着更广泛的分布
    if (token.holderCount > 10) {
      score += Math.min(25, token.holderCount / 10);
    }
    
    // 5. 防止评分超过100
    score = Math.min(100, score);
    
    return score;
  } catch (error) {
    console.error('计算早期代币评分出错:', error);
    return 0;
  }
};

/**
 * 计算成长型代币评分
 * @param {Object} token 代币对象
 * @returns {Number} 评分 (0-100)
 */
const calculateGrowingTokenScore = (token) => {
  let score = 0;
  
  try {
    // 从代币的分析元数据中提取信息
    const metadata = token.metadata || {};
    const analysis = metadata.analysis || {};
    
    // 1. 基础分 - 有基本信息
    if (token.name && token.symbol && token.lastPrice) {
      score += 10;
    }
    
    // 2. 价格增长
    const priceChange24h = analysis.priceChange24h || 0;
    if (priceChange24h > 0) {
      score += Math.min(30, priceChange24h / 2);
    }
    
    // 3. 交易量增长
    const volumeChange24h = analysis.volumeChange24h || 0;
    if (volumeChange24h > 0) {
      score += Math.min(30, volumeChange24h / 5);
    }
    
    // 4. 持有者分布
    const holderDistribution = analysis.topHoldersConcentration || 100;
    // 持有者集中度低（大鲸鱼比例小）是好事
    if (holderDistribution < 80) {
      score += Math.min(20, (80 - holderDistribution) / 2);
    }
    
    // 5. 流动性
    const liquidity = analysis.liquidityDepth || 0;
    score += Math.min(10, liquidity / 10);
    
    // 防止评分超过100
    score = Math.min(100, score);
    
    return score;
  } catch (error) {
    console.error('计算成长型代币评分出错:', error);
    return 0;
  }
};

module.exports = {
  executeAllBuyStrategies,
  executeAllSellStrategies,
  executeEarlyBuyerStrategy,
  executeGrowingTokenStrategy,
  executeTakeProfitStrategy,
  executeStopLossStrategy
}; 