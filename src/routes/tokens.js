const express = require('express');
const router = express.Router();

// 引入服务
const tokenService = require('../services/tokenService');

/**
 * @api {get} /api/tokens 获取代币列表
 * @apiDescription 获取所有监控的代币列表
 * @apiName GetTokens
 * @apiGroup Token
 * 
 * @apiParam {Number} [limit=50] 返回结果数量限制
 * @apiParam {Number} [offset=0] 返回结果偏移量
 * @apiParam {String} [sort=creationTime] 排序字段
 * @apiParam {String} [order=desc] 排序方向 (asc, desc)
 * 
 * @apiSuccess {Array} tokens 代币列表
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const sort = req.query.sort || 'creationTime';
    const order = req.query.order || 'desc';
    
    const tokens = await tokenService.getTokens(limit, offset, sort, order);
    res.json(tokens);
  } catch (error) {
    console.error('获取代币列表失败:', error);
    res.status(500).json({ error: '获取代币列表失败' });
  }
});

/**
 * @api {get} /api/tokens/stats 获取代币统计信息
 * @apiDescription 获取代币相关的统计数据，包括今日新代币、本周新代币、潜在买入机会和总代币数量
 * @apiName GetTokenStats
 * @apiGroup Token
 * 
 * @apiSuccess {Object} stats 代币统计信息
 * @apiSuccess {Number} stats.todayTokens 今日新代币数量
 * @apiSuccess {Number} stats.weekTokens 本周新代币数量
 * @apiSuccess {Number} stats.potentialBuyCount 潜在买入机会数量
 * @apiSuccess {Number} stats.totalTokens 总代币数量
 */
router.get('/stats', async (req, res) => {
  try {
    // 调用tokenService获取统计数据
    // 如果tokenService没有专门的getStats方法，我们可以在这里计算
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    
    // 按时间过滤获取今日和本周代币
    const todayTokens = await tokenService.getTokensCount({ 
      creationTime: { $gte: todayStart.toISOString() } 
    });
    
    const weekTokens = await tokenService.getTokensCount({ 
      creationTime: { $gte: weekStart.toISOString() } 
    });
    
    // 获取潜在买入机会
    const potentialBuyCount = await tokenService.getTokensCount({ 
      isPotentialBuy: true 
    });
    
    // 获取总代币数量
    const totalTokens = await tokenService.getTokensCount({});
    
    res.json({
      todayTokens,
      weekTokens,
      potentialBuyCount,
      totalTokens
    });
  } catch (error) {
    console.error('获取代币统计信息失败:', error);
    res.status(500).json({ 
      error: '获取代币统计信息失败',
      todayTokens: 0,
      weekTokens: 0,
      potentialBuyCount: 0,
      totalTokens: 0
    });
  }
});

/**
 * @api {get} /api/tokens/:mintAddress 获取代币详情
 * @apiDescription 获取指定代币的详细信息
 * @apiName GetToken
 * @apiGroup Token
 * 
 * @apiParam {String} mintAddress 代币铸造地址
 * 
 * @apiSuccess {Object} token 代币详细信息
 */
router.get('/:mintAddress', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    
    if (!mintAddress) {
      return res.status(400).json({ error: '缺少代币地址参数' });
    }
    
    const token = await tokenService.getToken(mintAddress);
    
    if (!token) {
      return res.status(404).json({ error: '代币不存在' });
    }
    
    res.json(token);
  } catch (error) {
    console.error(`获取代币${req.params.mintAddress}详情失败:`, error);
    res.status(500).json({ error: '获取代币详情失败' });
  }
});

/**
 * @api {get} /api/tokens/:mintAddress/trades 获取代币交易历史
 * @apiDescription 获取指定代币的交易历史记录
 * @apiName GetTokenTrades
 * @apiGroup Token
 * 
 * @apiParam {String} mintAddress 代币铸造地址
 * @apiParam {Number} [limit=50] 返回结果数量限制
 * @apiParam {Number} [offset=0] 返回结果偏移量
 * 
 * @apiSuccess {Array} trades 交易历史列表
 */
router.get('/:mintAddress/trades', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    if (!mintAddress) {
      return res.status(400).json({ error: '缺少代币地址参数' });
    }
    
    const trades = await tokenService.getTokenTrades(mintAddress, limit, offset);
    res.json(trades);
  } catch (error) {
    console.error(`获取代币${req.params.mintAddress}交易历史失败:`, error);
    res.status(500).json({ error: '获取代币交易历史失败' });
  }
});

/**
 * @api {get} /api/tokens/:mintAddress/holders 获取代币持有者
 * @apiDescription 获取指定代币的持有者列表
 * @apiName GetTokenHolders
 * @apiGroup Token
 * 
 * @apiParam {String} mintAddress 代币铸造地址
 * @apiParam {Number} [limit=50] 返回结果数量限制
 * @apiParam {Number} [offset=0] 返回结果偏移量
 * 
 * @apiSuccess {Array} holders 持有者列表
 */
router.get('/:mintAddress/holders', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    if (!mintAddress) {
      return res.status(400).json({ error: '缺少代币地址参数' });
    }
    
    const holders = await tokenService.getTokenHolders(mintAddress, limit, offset);
    res.json(holders);
  } catch (error) {
    console.error(`获取代币${req.params.mintAddress}持有者失败:`, error);
    res.status(500).json({ error: '获取代币持有者失败' });
  }
});

/**
 * @api {post} /api/tokens/:mintAddress/analyze 分析代币
 * @apiDescription 手动触发分析指定代币
 * @apiName AnalyzeToken
 * @apiGroup Token
 * 
 * @apiParam {String} mintAddress 代币铸造地址
 * 
 * @apiSuccess {Object} analysis 代币分析结果
 */
router.post('/:mintAddress/analyze', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    
    if (!mintAddress) {
      return res.status(400).json({ error: '缺少代币地址参数' });
    }
    
    const analysis = await tokenService.analyzeToken(mintAddress);
    res.json(analysis);
  } catch (error) {
    console.error(`分析代币${req.params.mintAddress}失败:`, error);
    res.status(500).json({ error: '分析代币失败' });
  }
});

module.exports = router; 