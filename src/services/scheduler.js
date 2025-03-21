const cron = require('node-cron');
const { executeAllBuyStrategies, executeAllSellStrategies } = require('./tradeStrategies');
const { getCurrentHoldings, getStrategyPerformance } = require('./tradeSimulation');
const tokenService = require('./tokenService');

// 从环境变量获取定时任务配置
const BUY_CRON_SCHEDULE = process.env.BUY_CRON_SCHEDULE || '0 9 * * *';
const SELL_CRON_SCHEDULE = process.env.SELL_CRON_SCHEDULE || '0 15 * * *';
const HOLDING_CHECK_INTERVAL = process.env.HOLDING_CHECK_INTERVAL || '0 * * * *';
const PERFORMANCE_REPORT_SCHEDULE = process.env.PERFORMANCE_REPORT_SCHEDULE || '0 20 * * *';
const TOKEN_UPDATE_INTERVAL = process.env.TOKEN_UPDATE_INTERVAL || '*/10 * * * *'; // 默认每10分钟更新

// 定时任务列表
let scheduledTasks = [];

/**
 * 执行自动买入策略
 */
const runAutoBuyStrategies = async () => {
  try {
    console.log('======开始执行自动买入策略======', new Date().toISOString());
    const results = await executeAllBuyStrategies();
    console.log(`执行结果: 共${results.length}个买入操作`);
    
    // 打印买入明细
    if (results.length > 0) {
      console.table(results.map(r => ({
        策略: r.strategy,
        代币: r.symbol || r.tokenMintAddress,
        数量: r.amount,
        价格: r.price,
        总值: r.totalValue,
        理由: r.reason
      })));
    }
    
    console.log('======自动买入策略执行完成======');
    return results;
  } catch (error) {
    console.error('执行自动买入策略出错:', error);
    return [];
  }
};

/**
 * 执行自动卖出策略
 */
const runAutoSellStrategies = async () => {
  try {
    console.log('======开始执行自动卖出策略======', new Date().toISOString());
    const results = await executeAllSellStrategies();
    console.log(`执行结果: 共${results.length}个卖出操作`);
    
    // 打印卖出明细
    if (results.length > 0) {
      console.table(results.map(r => ({
        策略: r.strategy,
        代币: r.symbol || r.tokenMintAddress,
        数量: r.amount,
        价格: r.price,
        总值: r.totalValue,
        盈亏: r.pnl,
        盈亏百分比: `${r.pnlPercent}%`,
        理由: r.reason
      })));
    }
    
    console.log('======自动卖出策略执行完成======');
    return results;
  } catch (error) {
    console.error('执行自动卖出策略出错:', error);
    return [];
  }
};

/**
 * 输出当前持仓概况
 */
const printHoldingSummary = async () => {
  try {
    console.log('======当前持仓概况======', new Date().toISOString());
    const holdings = await getCurrentHoldings();
    
    if (holdings.length > 0) {
      console.table(holdings.map(h => ({
        代币: h.symbol || h.mintAddress,
        持有量: h.holding,
        平均买入价: h.avgBuyPrice,
        当前价格: h.currentPrice,
        总成本: h.totalCost,
        当前价值: h.currentValue,
        盈亏: h.pnl,
        盈亏百分比: `${h.pnlPercent.toFixed(2)}%`
      })));
      
      // 计算总盈亏
      const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
      const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const totalPnl = totalValue - totalCost;
      const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
      
      console.log('总成本:', totalCost);
      console.log('总价值:', totalValue);
      console.log('总盈亏:', totalPnl, `(${totalPnlPercent.toFixed(2)}%)`);
    } else {
      console.log('当前没有持仓');
    }
    
    console.log('========================');
  } catch (error) {
    console.error('输出持仓概况出错:', error);
  }
};

/**
 * 输出策略绩效报告
 */
const printStrategyPerformance = async () => {
  try {
    console.log('======策略绩效报告======', new Date().toISOString());
    const performance = await getStrategyPerformance();
    
    if (performance.length > 0) {
      console.table(performance.map(p => ({
        策略: p.strategy,
        总交易: p.totalTrades,
        盈利交易: p.profitableTrades,
        亏损交易: p.lossTrades,
        胜率: `${p.winRate.toFixed(2)}%`,
        总盈亏: p.totalPnl,
        平均盈亏: p.avgPnlPercent.toFixed(2),
        最大盈利: `${p.maxProfit.toFixed(2)}%`,
        最大亏损: `${p.maxLoss.toFixed(2)}%`
      })));
    } else {
      console.log('暂无交易记录');
    }
    
    console.log('========================');
  } catch (error) {
    console.error('输出策略绩效报告出错:', error);
  }
};

/**
 * 定期更新代币数据
 */
const updateTokenData = async () => {
  try {
    console.log('======开始更新代币数据======', new Date().toISOString());
    
    // 获取潜在的买入代币
    const potentialBuyTokens = await tokenService.getPotentialBuyTokens();
    console.log(`找到${potentialBuyTokens.length}个潜在买入代币`);
    
    // 优先更新这些代币
    for (const token of potentialBuyTokens) {
      console.log(`更新潜在买入代币: ${token.name || token.symbol || token.mintAddress}`);
      await tokenService.updateTokenDetails(token.mintAddress);
    }
    
    // 获取最近的代币（按创建时间排序）
    const recentTokens = await tokenService.getRecentTokens(10);
    console.log(`找到${recentTokens.length}个最近创建的代币`);
    
    // 更新这些代币
    for (const token of recentTokens) {
      // 如果已经更新过，跳过
      if (potentialBuyTokens.some(t => t.mintAddress === token.mintAddress)) {
        continue;
      }
      console.log(`更新最近创建的代币: ${token.name || token.symbol || token.mintAddress}`);
      await tokenService.updateTokenDetails(token.mintAddress);
    }
    
    console.log('======代币数据更新完成======');
    return true;
  } catch (error) {
    console.error('更新代币数据出错:', error);
    return false;
  }
};

/**
 * 启动所有定时任务
 */
const startScheduledTasks = () => {
  try {
    // 停止之前的所有任务
    stopAllTasks();
    
    // 记录启动时间
    global.schedulerStartTime = new Date();
    global.nextSchedulerRunTimes = {};
    
    // 1. 执行买入策略
    const buyTask = cron.schedule(BUY_CRON_SCHEDULE, async () => {
      await runAutoBuyStrategies();
      global.lastBuyRunTime = new Date();
    });
    global.nextSchedulerRunTimes.buy = getNextCronRunTime(BUY_CRON_SCHEDULE);
    
    // 2. 执行卖出策略
    const sellTask = cron.schedule(SELL_CRON_SCHEDULE, async () => {
      await runAutoSellStrategies();
      global.lastSellRunTime = new Date();
    });
    global.nextSchedulerRunTimes.sell = getNextCronRunTime(SELL_CRON_SCHEDULE);
    
    // 3. 检查持仓
    const holdingTask = cron.schedule(HOLDING_CHECK_INTERVAL, async () => {
      await printHoldingSummary();
      global.lastHoldingCheckTime = new Date();
    });
    global.nextSchedulerRunTimes.holdingCheck = getNextCronRunTime(HOLDING_CHECK_INTERVAL);
    
    // 4. 输出策略绩效报告
    const performanceTask = cron.schedule(PERFORMANCE_REPORT_SCHEDULE, async () => {
      await printStrategyPerformance();
      global.lastPerformanceReportTime = new Date();
    });
    global.nextSchedulerRunTimes.performanceReport = getNextCronRunTime(PERFORMANCE_REPORT_SCHEDULE);
    
    // 5. 定期更新代币数据
    const tokenUpdateTask = cron.schedule(TOKEN_UPDATE_INTERVAL, async () => {
      await updateTokenData();
      global.lastTokenUpdateTime = new Date();
    });
    global.nextSchedulerRunTimes.tokenUpdate = getNextCronRunTime(TOKEN_UPDATE_INTERVAL);
    
    // 将任务添加到列表中
    scheduledTasks.push(buyTask, sellTask, holdingTask, performanceTask, tokenUpdateTask);
    
    console.log('所有定时任务已启动');
    console.log('下一次买入策略执行时间:', global.nextSchedulerRunTimes.buy);
    console.log('下一次卖出策略执行时间:', global.nextSchedulerRunTimes.sell);
    console.log('下一次代币数据更新时间:', global.nextSchedulerRunTimes.tokenUpdate);
    
    // 立即执行一次持仓概况输出
    printHoldingSummary();
    // 立即执行一次代币数据更新
    updateTokenData();
    
    // 设置状态
    global.schedulerRunning = true;
    global.lastSchedulerRunTime = new Date();
    
    return true;
  } catch (error) {
    console.error('启动定时任务失败:', error);
    return false;
  }
};

/**
 * 停止所有定时任务
 */
const stopAllTasks = () => {
  scheduledTasks.forEach(task => {
    if (task && typeof task.stop === 'function') {
      task.stop();
    }
  });
  scheduledTasks = [];
  console.log('所有定时任务已停止');
  return true;
};

/**
 * 手动执行一次买入策略
 */
const manualRunBuyStrategies = async () => {
  return await runAutoBuyStrategies();
};

/**
 * 手动执行一次卖出策略
 */
const manualRunSellStrategies = async () => {
  return await runAutoSellStrategies();
};

/**
 * 获取下一次Cron任务执行时间
 * @param {string} cronExpression - Cron表达式
 * @returns {string} - 下一次执行时间的ISO字符串
 */
const getNextCronRunTime = (cronExpression) => {
  try {
    // 简单计算下一次执行时间
    const cronParser = require('cron-parser');
    const interval = cronParser.parseExpression(cronExpression);
    return interval.next().toDate().toISOString();
  } catch (error) {
    console.error('计算下一次执行时间出错:', error);
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 默认24小时后
  }
};

module.exports = {
  startScheduledTasks,
  stopAllTasks,
  manualRunBuyStrategies,
  manualRunSellStrategies,
  printHoldingSummary,
  printStrategyPerformance,
  updateTokenData
}; 