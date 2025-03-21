// 代币分析工具，用于评估代币是否是潜在的好投资
const analyzeToken = (tokenData, tradeData, statsData, detailsData) => {
  let score = 0;
  const reasons = [];
  
  // 检查是否有足够的数据进行分析
  if (!tokenData || !tradeData) {
    return {
      isPotentialBuy: false,
      score: 0,
      reasons: ['数据不足以进行分析']
    };
  }
  
  try {
    // 1. 检查代币基本信息
    if (tokenData.name && tokenData.symbol) {
      score += 5;
    } else {
      reasons.push('代币缺少基本信息(名称或代号)');
    }
    
    // 2. 检查交易数据
    if (statsData) {
      // 检查买入/卖出比例 - 买入多于卖出是好信号
      if (statsData.buyCount > statsData.sellCount) {
        const ratio = statsData.buyCount / (statsData.sellCount || 1);
        if (ratio > 2) {
          score += 15;
          reasons.push(`买入交易数量是卖出的${ratio.toFixed(2)}倍`);
        } else if (ratio > 1.3) {
          score += 8;
          reasons.push(`买入交易数量是卖出的${ratio.toFixed(2)}倍`);
        }
      } else {
        reasons.push('卖出交易多于买入交易');
      }
      
      // 检查买入/卖出金额
      if (statsData.buyVolumeUSD > statsData.sellVolumeUSD) {
        const ratio = statsData.buyVolumeUSD / (statsData.sellVolumeUSD || 1);
        if (ratio > 2) {
          score += 15;
          reasons.push(`买入金额是卖出的${ratio.toFixed(2)}倍`);
        } else if (ratio > 1.3) {
          score += 8;
          reasons.push(`买入金额是卖出的${ratio.toFixed(2)}倍`);
        }
      } else {
        reasons.push('卖出金额多于买入金额');
      }
      
      // 检查不同买家数量 - 多个不同买家是好信号
      if (statsData.distinctBuyers > 5) {
        score += 10;
        reasons.push(`有${statsData.distinctBuyers}个不同的买家`);
      } else if (statsData.distinctBuyers > 2) {
        score += 5;
        reasons.push(`有${statsData.distinctBuyers}个不同的买家`);
      }
    }
    
    // 3. 检查持有情况
    if (detailsData && detailsData.topHoldings) {
      // 检查顶级持有者分布 - 分散的持有者是好信号
      const topHoldersCount = detailsData.topHoldings.length;
      if (topHoldersCount >= 5) {
        score += 10;
        reasons.push('持有者分布相对分散');
      }
      
      // 检查创建者持有比例 - 创建者持有较大比例可能是好信号(长期投资)
      if (detailsData.devHolding && detailsData.devHolding.length > 0) {
        const creatorHolding = detailsData.devHolding[0]?.BalanceUpdate?.balance;
        if (creatorHolding > 0) {
          score += 5;
          reasons.push('创建者仍然持有代币');
        }
      }
    }
    
    // 4. 检查价格历史(如果有)
    const recentTrades = tradeData.slice(0, 5);
    if (recentTrades.length >= 2) {
      // 检查价格趋势 - 稳定或上升是好信号
      const latestPrice = recentTrades[0]?.Trade?.Price || 0;
      const previousPrice = recentTrades[1]?.Trade?.Price || 0;
      
      if (latestPrice > previousPrice) {
        const increase = ((latestPrice - previousPrice) / previousPrice) * 100;
        if (increase > 10) {
          score += 10;
          reasons.push(`价格上涨${increase.toFixed(2)}%`);
        } else {
          score += 5;
          reasons.push('价格稳定上涨');
        }
      } else if (latestPrice === previousPrice) {
        score += 3;
        reasons.push('价格稳定');
      } else {
        const decrease = ((previousPrice - latestPrice) / previousPrice) * 100;
        if (decrease > 20) {
          reasons.push(`价格下跌${decrease.toFixed(2)}%`);
        }
      }
    }
    
    // 5. 检查URI和元数据 - 如果有完整的元数据是好信号
    if (tokenData.uri && tokenData.uri.length > 0) {
      score += 5;
      reasons.push('代币有元数据URI');
    }
    
    // 总结分析结果
    const isPotentialBuy = score >= 35; // 设置一个分数阈值
    
    if (isPotentialBuy) {
      reasons.unshift(`总评分: ${score}/70 - 可能是好的买入机会`);
    } else {
      reasons.unshift(`总评分: ${score}/70 - 不推荐现在买入`);
    }
    
    return {
      isPotentialBuy,
      score,
      reasons
    };
  } catch (error) {
    console.error('分析代币时出错:', error);
    return {
      isPotentialBuy: false,
      score: 0,
      reasons: ['分析过程中发生错误']
    };
  }
};

module.exports = {
  analyzeToken
}; 