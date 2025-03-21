const express = require('express');
const router = express.Router();
const {
  startScheduledTasks,
  stopAllTasks,
  manualRunBuyStrategies,
  manualRunSellStrategies,
  printHoldingSummary,
  printStrategyPerformance
} = require('../services/scheduler');
const monitorService = require('../services/monitorService');

/**
 * @api {get} /api/scheduler/status 获取调度器状态
 * @apiDescription 获取当前调度器运行状态
 * @apiName GetSchedulerStatus
 * @apiGroup Scheduler
 * 
 * @apiSuccess {Object} status 调度器状态信息
 */
router.get('/status', (req, res) => {
  try {
    const status = monitorService.getSchedulerStatus();
    res.json(status);
  } catch (error) {
    console.error('获取调度器状态失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/scheduler/start 启动调度器
 * @apiDescription 启动自动交易调度器
 * @apiName StartScheduler
 * @apiGroup Scheduler
 * 
 * @apiSuccess {Object} result 操作结果
 */
router.post('/start', (req, res) => {
  try {
    const result = startScheduledTasks();
    if (result) {
      res.json({ success: true, message: '调度器已启动' });
    } else {
      res.status(500).json({ success: false, message: '调度器启动失败' });
    }
  } catch (error) {
    console.error('启动调度器失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/scheduler/stop 停止调度器
 * @apiDescription 停止自动交易调度器
 * @apiName StopScheduler
 * @apiGroup Scheduler
 * 
 * @apiSuccess {Object} result 操作结果
 */
router.post('/stop', (req, res) => {
  try {
    const result = stopAllTasks();
    global.schedulerRunning = false;
    res.json({ success: true, message: '调度器已停止' });
  } catch (error) {
    console.error('停止调度器失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/scheduler/run-buy 手动执行买入策略
 * @apiDescription 手动执行一次所有买入策略
 * @apiName RunBuyStrategies
 * @apiGroup Scheduler
 * 
 * @apiSuccess {Array} results 策略执行结果
 */
router.post('/run-buy', async (req, res) => {
  try {
    const results = await manualRunBuyStrategies();
    res.json(results);
  } catch (error) {
    console.error('执行买入策略失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/scheduler/run-sell 手动执行卖出策略
 * @apiDescription 手动执行一次所有卖出策略
 * @apiName RunSellStrategies
 * @apiGroup Scheduler
 * 
 * @apiSuccess {Array} results 策略执行结果
 */
router.post('/run-sell', async (req, res) => {
  try {
    const results = await manualRunSellStrategies();
    res.json(results);
  } catch (error) {
    console.error('执行卖出策略失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {get} /api/scheduler/holdings 获取当前持仓概况
 * @apiDescription 获取当前模拟交易的持仓概况报告
 * @apiName GetHoldings
 * @apiGroup Scheduler
 * 
 * @apiSuccess {Array} holdings 持仓列表
 */
router.get('/holdings', async (req, res) => {
  try {
    // 实际使用时从tradeSimulation服务获取，这里只调用打印方法
    await printHoldingSummary();
    
    // 从tradeSimulation服务获取数据
    const holdings = await require('../services/tradeSimulation').getCurrentHoldings();
    
    // 计算总计数据
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    
    res.json({
      success: true,
      holdings,
      summary: {
        totalCost,
        totalValue,
        totalPnl,
        totalPnlPercent: parseFloat(totalPnlPercent.toFixed(2))
      }
    });
  } catch (error) {
    console.error('获取持仓概况出错:', error);
    res.status(500).json({ error: '获取持仓概况失败', message: error.message });
  }
});

/**
 * @api {get} /api/scheduler/performance 获取策略绩效报告
 * @apiDescription 获取各交易策略的绩效报告
 * @apiName GetPerformance
 * @apiGroup Scheduler
 * 
 * @apiSuccess {Array} performance 策略绩效列表
 */
router.get('/performance', async (req, res) => {
  try {
    // 实际使用时从tradeSimulation服务获取，这里只调用打印方法
    await printStrategyPerformance();
    
    // 从tradeSimulation服务获取数据
    const performance = await require('../services/tradeSimulation').getStrategyPerformance();
    
    res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('获取策略绩效出错:', error);
    res.status(500).json({ error: '获取策略绩效失败', message: error.message });
  }
});

module.exports = router; 