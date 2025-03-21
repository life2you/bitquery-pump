const express = require('express');
const router = express.Router();
const tokenService = require('../services/tokenService');

// 获取所有潜在买入机会的代币
router.get('/potential-buys', async (req, res) => {
  try {
    const tokens = await tokenService.getPotentialBuyTokens();
    res.json(tokens);
  } catch (error) {
    console.error('获取潜在买入机会时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取最近创建的代币
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tokens = await tokenService.getRecentTokens(limit);
    res.json(tokens);
  } catch (error) {
    console.error('获取最近创建的代币时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 根据创建者地址获取代币
router.get('/creator/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const tokens = await tokenService.getTokensByCreator(address);
    res.json(tokens);
  } catch (error) {
    console.error(`获取创建者${req.params.address}的代币时出错:`, error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取特定代币的详细信息
router.get('/:mintAddress', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    const token = await tokenService.updateTokenDetails(mintAddress);
    
    if (!token) {
      return res.status(404).json({ error: '未找到代币' });
    }
    
    res.json(token);
  } catch (error) {
    console.error(`获取代币${req.params.mintAddress}详情时出错:`, error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 手动触发代币分析
router.post('/:mintAddress/analyze', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    const token = await tokenService.updateTokenDetails(mintAddress);
    
    if (!token) {
      return res.status(404).json({ error: '未找到代币' });
    }
    
    res.json({
      mintAddress: token.mintAddress,
      name: token.name,
      symbol: token.symbol,
      isPotentialBuy: token.isPotentialBuy,
      analysis: token.metadata?.analysis || { score: 0, reasons: ['无分析数据'] }
    });
  } catch (error) {
    console.error(`分析代币${req.params.mintAddress}时出错:`, error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router; 