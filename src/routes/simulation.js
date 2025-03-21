const express = require('express');
const { 
  simulateBuy, 
  simulateSell, 
  getCurrentHoldings,
  getTradeHistory,
  getStrategyPerformance
} = require('../services/tradeSimulation');
const {
  executeAllBuyStrategies,
  executeAllSellStrategies
} = require('../services/tradeStrategies');

const router = express.Router();

/**
 * @api {post} /api/simulation/buy 模拟买入
 * @apiDescription 模拟买入指定代币
 * @apiName SimulateBuy
 * @apiGroup Simulation
 * 
 * @apiParam {String} tokenMintAddress 代币铸造地址
 * @apiParam {Number} amount 买入数量
 * @apiParam {Number} price 买入价格
 * @apiParam {String} [reason] 买入理由
 * @apiParam {Number} [score] 代币评分
 * @apiParam {String} [strategy] 策略名称
 * 
 * @apiSuccess {Object} result 买入结果
 */
router.post('/buy', async (req, res) => {
  try {
    const { tokenMintAddress, amount, price, reason, score, strategy } = req.body;
    
    if (!tokenMintAddress || !amount || !price) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const result = await simulateBuy(
      tokenMintAddress,
      parseFloat(amount),
      parseFloat(price),
      reason || '手动买入',
      score || 0,
      strategy || 'manual'
    );
    
    res.json(result);
  } catch (error) {
    console.error('模拟买入失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {post} /api/simulation/sell 模拟卖出
 * @apiDescription 模拟卖出指定代币
 * @apiName SimulateSell
 * @apiGroup Simulation
 * 
 * @apiParam {String} tokenMintAddress 代币铸造地址
 * @apiParam {Number} amount 卖出数量
 * @apiParam {Number} price 卖出价格
 * @apiParam {String} [reason] 卖出理由
 * @apiParam {String} [strategy] 策略名称
 * 
 * @apiSuccess {Object} result 卖出结果
 */
router.post('/sell', async (req, res) => {
  try {
    const { tokenMintAddress, amount, price, reason, strategy } = req.body;
    
    if (!tokenMintAddress || !amount || !price) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const result = await simulateSell(
      tokenMintAddress,
      parseFloat(amount),
      parseFloat(price),
      reason || '手动卖出',
      strategy || 'manual'
    );
    
    res.json(result);
  } catch (error) {
    console.error('模拟卖出失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {get} /api/simulation/holdings 获取持仓
 * @apiDescription 获取当前持仓明细
 * @apiName GetHoldings
 * @apiGroup Simulation
 * 
 * @apiSuccess {Array} holdings 持仓列表
 */
router.get('/holdings', async (req, res) => {
  try {
    const holdings = await getCurrentHoldings();
    res.json(holdings);
  } catch (error) {
    console.error('获取持仓失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {get} /api/simulation/history 获取交易历史
 * @apiDescription 获取模拟交易历史记录
 * @apiName GetTradeHistory
 * @apiGroup Simulation
 * 
 * @apiParam {Number} [limit=100] 返回结果数量限制
 * @apiParam {Number} [offset=0] 返回结果偏移量
 * 
 * @apiSuccess {Array} history 交易历史
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const history = await getTradeHistory(limit, offset);
    res.json(history);
  } catch (error) {
    console.error('获取交易历史失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @api {get} /api/simulation/performance 获取策略绩效
 * @apiDescription 获取各策略的绩效统计
 * @apiName GetStrategyPerformance
 * @apiGroup Simulation
 * 
 * @apiSuccess {Array} performance 策略绩效统计
 */
router.get('/performance', async (req, res) => {
  try {
    const performance = await getStrategyPerformance();
    res.json(performance);
  } catch (error) {
    console.error('获取策略绩效失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 执行自动买入策略
 * POST /api/simulation/auto-buy
 */
router.post('/auto-buy', async (req, res) => {
  try {
    const results = await executeAllBuyStrategies();
    res.json(results);
  } catch (error) {
    console.error('执行自动买入策略失败:', error);
    res.status(500).json({ error: '执行自动买入策略失败' });
  }
});

/**
 * 执行自动卖出策略
 * POST /api/simulation/auto-sell
 */
router.post('/auto-sell', async (req, res) => {
  try {
    const results = await executeAllSellStrategies();
    res.json(results);
  } catch (error) {
    console.error('执行自动卖出策略失败:', error);
    res.status(500).json({ error: '执行自动卖出策略失败' });
  }
});

module.exports = router; 