const express = require('express');
const { 
  analyzeTokenAndRecommend, 
  getRecommendedTokens, 
  findTokensAboutToGraduate,
  calculateBondingCurveProgress
} = require('../services/tokenAnalysis');

const router = express.Router();

/**
 * 获取代币分析结果
 * GET /api/analysis/token/:address
 */
router.get('/token/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const analysis = await analyzeTokenAndRecommend(address);
    res.json(analysis);
  } catch (error) {
    console.error('获取代币分析失败:', error);
    res.status(500).json({ error: '获取代币分析失败' });
  }
});

/**
 * 获取推荐买入的代币列表
 * GET /api/analysis/recommendations?limit=10
 */
router.get('/recommendations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recommendations = await getRecommendedTokens(limit);
    res.json(recommendations);
  } catch (error) {
    console.error('获取推荐代币列表失败:', error);
    res.status(500).json({ error: '获取推荐代币列表失败' });
  }
});

/**
 * 获取绑定曲线进度
 * GET /api/analysis/bonding-curve/:address
 */
router.get('/bonding-curve/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const bondingCurveData = await calculateBondingCurveProgress(address);
    res.json(bondingCurveData);
  } catch (error) {
    console.error('获取绑定曲线进度失败:', error);
    res.status(500).json({ error: '获取绑定曲线进度失败' });
  }
});

/**
 * 获取即将毕业到Raydium的代币
 * GET /api/analysis/graduating-tokens
 */
router.get('/graduating-tokens', async (req, res) => {
  try {
    const graduatingTokens = await findTokensAboutToGraduate();
    res.json(graduatingTokens);
  } catch (error) {
    console.error('获取即将毕业代币失败:', error);
    res.status(500).json({ error: '获取即将毕业代币失败' });
  }
});

module.exports = router; 