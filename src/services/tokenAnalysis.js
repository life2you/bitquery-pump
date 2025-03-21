const { 
  fetchTokenDetails, 
  fetchTokenStats, 
  fetchTokenPrice, 
  fetchTokenOHLC, 
  fetchTokenLiquidity, 
  fetchFirstBuyers,
  fetchTokenMarketcap,
  fetchGraduatingTokens
} = require('../api/bitquery');
const { Token } = require('../database/models/Token');
const { TokenHolder } = require('../database/models/TokenHolder');
const { TokenTrade } = require('../database/models/TokenTrade');
const { Op } = require('sequelize');

/**
 * 计算代币的绑定曲线进度
 * 公式: (Supply * LastPrice) / 10,000,000
 * 当结果>=1时，代币有资格"毕业"到Raydium
 */
const calculateBondingCurveProgress = async (tokenAddress) => {
  try {
    const marketcapData = await fetchTokenMarketcap(tokenAddress);
    if (!marketcapData) return { progress: 0, marketCap: 0 };

    const supply = marketcapData.TokenSupplyUpdates?.[0]?.TokenSupplyUpdate?.Amount || 0;
    const decimals = marketcapData.TokenSupplyUpdates?.[0]?.TokenSupplyUpdate?.Currency?.Decimals || 0;
    const lastPrice = marketcapData.DEXTrades?.[0]?.Trade?.Price || 0;
    
    // 根据精度调整供应量
    const adjustedSupply = supply / (10 ** decimals);
    
    // 计算市值和绑定曲线进度
    const marketCap = adjustedSupply * lastPrice;
    const progress = marketCap / 10000000; // 分子为代币市值，分母为1000万，结果大于等于1时，代币有资格"毕业"
    
    return { 
      progress, 
      marketCap,
      supply: adjustedSupply,
      lastPrice
    };
  } catch (error) {
    console.error(`计算代币${tokenAddress}的绑定曲线进度失败:`, error);
    return { progress: 0, marketCap: 0 };
  }
};

/**
 * 计算代币的流动性评分
 * 基于代币在Pool中的余额
 */
const calculateLiquidityScore = async (tokenAddress) => {
  try {
    const liquidityData = await fetchTokenLiquidity(tokenAddress);
    if (!liquidityData || liquidityData.length === 0) return 0;
    
    // 获取总流动性 (各个Pool的余额总和)
    let totalLiquidity = 0;
    for (const item of liquidityData) {
      const balance = parseFloat(item.BalanceUpdate.PostBalance) || 0;
      totalLiquidity += balance;
    }
    
    // 根据流动性大小计算评分 (0-100)
    // 假设500是非常良好的流动性
    const score = Math.min(100, (totalLiquidity / 500) * 100);
    
    return score;
  } catch (error) {
    console.error(`计算代币${tokenAddress}的流动性评分失败:`, error);
    return 0;
  }
};

/**
 * 计算早期买家行为指标
 * 分析首批买家是否仍在持有
 */
const calculateEarlyBuyersBehavior = async (tokenAddress) => {
  try {
    const earlyBuyers = await fetchFirstBuyers(tokenAddress);
    if (!earlyBuyers || earlyBuyers.length === 0) return { holdRatio: 0, score: 0 };
    
    // 获取所有早期买家地址
    const buyerAddresses = earlyBuyers.map(trade => 
      trade.Trade.Buy.Account.Address
    );
    
    // 去重
    const uniqueBuyerAddresses = [...new Set(buyerAddresses)];
    
    // 获取这些地址当前的持币情况
    const holders = await TokenHolder.findAll({
      where: {
        tokenMintAddress: tokenAddress,
        address: {
          [Op.in]: uniqueBuyerAddresses
        },
        balance: {
          [Op.gt]: 0
        }
      }
    });
    
    // 计算早期买家中仍在持有的比例
    const holdRatio = uniqueBuyerAddresses.length > 0 ? 
      holders.length / uniqueBuyerAddresses.length : 0;
    
    // 转换为0-100的评分
    const score = holdRatio * 100;
    
    return { holdRatio, score };
  } catch (error) {
    console.error(`计算代币${tokenAddress}的早期买家行为指标失败:`, error);
    return { holdRatio: 0, score: 0 };
  }
};

/**
 * 计算价格动量评分
 * 基于OHLC数据分析价格趋势和动量
 */
const calculatePriceMomentumScore = async (tokenAddress) => {
  try {
    // 获取过去7天的OHLC数据
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const ohlcData = await fetchTokenOHLC(
      tokenAddress, 
      sevenDaysAgo.toISOString(), 
      new Date().toISOString(),
      'day'
    );
    
    if (!ohlcData || ohlcData.length < 2) return { trend: 'unknown', score: 0 };
    
    // 计算价格变化
    const priceChanges = [];
    for (let i = 1; i < ohlcData.length; i++) {
      const prevClose = parseFloat(ohlcData[i-1].close) || 0;
      const currClose = parseFloat(ohlcData[i].close) || 0;
      
      if (prevClose > 0) {
        const change = (currClose - prevClose) / prevClose;
        priceChanges.push(change);
      }
    }
    
    // 如果没有有效的价格变化数据
    if (priceChanges.length === 0) return { trend: 'unknown', score: 0 };
    
    // 计算平均变化率
    const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    
    // 确定趋势
    let trend = 'sideways';
    if (avgChange > 0.05) trend = 'bullish';
    else if (avgChange < -0.05) trend = 'bearish';
    
    // 计算动量得分
    // 使用最近的变化率加上一定的权重
    const recentChanges = priceChanges.slice(-3); // 最近3天
    const recentAvgChange = recentChanges.length > 0 
      ? recentChanges.reduce((sum, change) => sum + change, 0) / recentChanges.length
      : 0;
    
    // 结合平均变化率和最近变化率
    const momentum = avgChange * 0.4 + recentAvgChange * 0.6;
    
    // 转换为0-100的评分
    // 最大考虑±30%的变化
    const score = Math.min(100, Math.max(0, (momentum + 0.3) / 0.6 * 100));
    
    return { trend, score };
  } catch (error) {
    console.error(`计算代币${tokenAddress}的价格动量评分失败:`, error);
    return { trend: 'unknown', score: 0 };
  }
};

/**
 * 计算交易活跃度评分
 */
const calculateTradeActivityScore = async (tokenAddress) => {
  try {
    const stats = await fetchTokenStats(tokenAddress);
    if (!stats) return { score: 0 };
    
    const { 
      buyCount = 0, 
      sellCount = 0, 
      distinctBuyers = 0, 
      distinctSellers = 0 
    } = stats;
    
    const totalTrades = buyCount + sellCount;
    const uniqueTraders = distinctBuyers + distinctSellers;
    
    // 评分考虑:
    // 1. 交易总量 - 最高考虑1000笔
    // 2. 交易者数量 - 最高考虑500人
    // 3. 买卖比例 - 买入比例高于卖出为佳
    
    const tradeVolumeScore = Math.min(50, (totalTrades / 1000) * 50);
    const traderCountScore = Math.min(30, (uniqueTraders / 500) * 30);
    
    let buyRatioScore = 0;
    if (totalTrades > 0) {
      const buyRatio = buyCount / totalTrades;
      // 买入比例超过60%得分更高
      buyRatioScore = buyRatio > 0.6 ? 20 : (buyRatio / 0.6) * 20;
    }
    
    const score = tradeVolumeScore + traderCountScore + buyRatioScore;
    
    return { score };
  } catch (error) {
    console.error(`计算代币${tokenAddress}的交易活跃度评分失败:`, error);
    return { score: 0 };
  }
};

/**
 * 检查代币是否即将"毕业"到Raydium
 */
const isAboutToGraduate = async (tokenAddress) => {
  try {
    const { progress } = await calculateBondingCurveProgress(tokenAddress);
    return progress >= 0.9; // 90%以上的进度视为即将毕业
  } catch (error) {
    console.error(`检查代币${tokenAddress}是否即将"毕业"失败:`, error);
    return false;
  }
};

/**
 * 计算代币的综合评分并推荐买入或卖出
 */
const analyzeTokenAndRecommend = async (tokenAddress) => {
  try {
    // 1. 获取基础数据
    const details = await Token.findByPk(tokenAddress);
    if (!details) {
      return { 
        recommendation: 'unavailable', 
        reason: '代币数据不存在'
      };
    }
    
    // 2. 计算各项评分
    const [
      { progress, marketCap },
      liquidityScore,
      { holdRatio, score: earlyBuyerScore },
      { trend, score: momentumScore },
      { score: activityScore }
    ] = await Promise.all([
      calculateBondingCurveProgress(tokenAddress),
      calculateLiquidityScore(tokenAddress),
      calculateEarlyBuyersBehavior(tokenAddress),
      calculatePriceMomentumScore(tokenAddress),
      calculateTradeActivityScore(tokenAddress)
    ]);
    
    // 3. 组合评分 (总分100)
    const scoreWeights = {
      bondingCurve: 0.25,    // 绑定曲线进度 (25%)
      liquidity: 0.15,       // 流动性 (15%)
      earlyBuyers: 0.20,     // 早期买家行为 (20%)
      momentum: 0.25,        // 价格动量 (25%)
      activity: 0.15         // 交易活跃度 (15%)
    };
    
    // 绑定曲线评分 (进度在40%-90%之间最佳)
    const bondingCurveScore = 
      progress < 0.4 ? progress * 250 :  // 0-40%，线性增长到100
      progress < 0.9 ? 100 :             // 40-90%，满分100
      Math.max(0, 100 - (progress - 0.9) * 1000); // 90%以上，快速减分
    
    // 计算总分
    const totalScore = 
      bondingCurveScore * scoreWeights.bondingCurve +
      liquidityScore * scoreWeights.liquidity +
      earlyBuyerScore * scoreWeights.earlyBuyers +
      momentumScore * scoreWeights.momentum +
      activityScore * scoreWeights.activity;
    
    // 4. 生成推荐
    let recommendation = 'hold';
    let reason = '';
    
    // 基于总分的决策
    if (totalScore >= 75) {
      recommendation = 'buy';
      reason = '综合评分高，各项指标表现良好';
    } else if (totalScore <= 30) {
      recommendation = 'sell';
      reason = '综合评分低，风险较高';
    } else {
      recommendation = 'hold';
      reason = '评分适中，建议观望';
    }
    
    // 特殊情况处理
    if (progress >= 0.95) {
      recommendation = 'buy';
      reason = '代币即将毕业到Raydium，可能会有价格上涨';
    } else if (trend === 'bearish' && holdRatio < 0.3) {
      recommendation = 'sell';
      reason = '价格呈下降趋势，且早期买家多数已卖出';
    }
    
    return {
      tokenAddress,
      symbol: details.symbol,
      name: details.name,
      scores: {
        bondingCurve: bondingCurveScore,
        liquidity: liquidityScore,
        earlyBuyers: earlyBuyerScore,
        momentum: momentumScore,
        activity: activityScore,
        total: totalScore
      },
      metrics: {
        marketCap,
        bondingCurveProgress: progress,
        priceTrend: trend,
        earlyBuyerHoldRatio: holdRatio
      },
      recommendation,
      reason
    };
  } catch (error) {
    console.error(`分析代币${tokenAddress}失败:`, error);
    return { 
      recommendation: 'error', 
      reason: '分析过程中出错'
    };
  }
};

/**
 * 获取推荐买入的代币列表
 */
const getRecommendedTokens = async (limit = 10) => {
  try {
    // 获取数据库中的代币
    const tokens = await Token.findAll({
      limit: 100,
      order: [['createdAt', 'DESC']]
    });
    
    // 分析每个代币
    const analysisPromises = tokens.map(token => 
      analyzeTokenAndRecommend(token.mintAddress)
    );
    
    const analysisResults = await Promise.all(analysisPromises);
    
    // 按评分降序排序
    const sortedResults = analysisResults
      .filter(result => result.recommendation === 'buy')
      .sort((a, b) => b.scores.total - a.scores.total);
    
    // 返回前N个推荐
    return sortedResults.slice(0, limit);
  } catch (error) {
    console.error('获取推荐代币列表失败:', error);
    return [];
  }
};

/**
 * 寻找即将毕业到Raydium的代币
 */
const findTokensAboutToGraduate = async () => {
  try {
    const graduatingTokens = await fetchGraduatingTokens();
    
    // 处理和分析这些代币
    const results = [];
    for (const tokenData of graduatingTokens) {
      const mintAddress = tokenData.Trade?.Buy?.Currency?.MintAddress;
      if (!mintAddress) continue;
      
      const { progress } = await calculateBondingCurveProgress(mintAddress);
      
      // 只关注接近毕业的代币 (进度>=85%)
      if (progress >= 0.85) {
        results.push({
          mintAddress,
          name: tokenData.Trade?.Buy?.Currency?.Name,
          symbol: tokenData.Trade?.Buy?.Currency?.Symbol,
          price: tokenData.Trade?.Buy?.Price,
          priceUSD: tokenData.Trade?.Buy?.PriceInUSD,
          bondingCurveProgress: progress,
          volume: tokenData.volume,
          tradeCount: tokenData.tradeCount
        });
      }
    }
    
    // 按绑定曲线进度降序排序
    return results.sort((a, b) => b.bondingCurveProgress - a.bondingCurveProgress);
  } catch (error) {
    console.error('查找即将毕业代币失败:', error);
    return [];
  }
};

module.exports = {
  analyzeTokenAndRecommend,
  getRecommendedTokens,
  findTokensAboutToGraduate,
  calculateBondingCurveProgress,
  calculateLiquidityScore,
  calculateEarlyBuyersBehavior,
  calculatePriceMomentumScore,
  calculateTradeActivityScore,
  isAboutToGraduate
}; 