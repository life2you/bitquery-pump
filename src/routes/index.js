const express = require('express');
const tokenRoutes = require('./tokens');
const simulationRoutes = require('./simulation');
const schedulerRoutes = require('./scheduler');
const monitorService = require('../services/monitorService');

const router = express.Router();

// API路由
router.use('/api/tokens', tokenRoutes);
router.use('/api/simulation', simulationRoutes);
router.use('/api/scheduler', schedulerRoutes);

// 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// 状态检查
router.get('/status', (req, res) => {
  // 获取服务关键状态信息
  const dbStatus = global.dbConnected ? 'connected' : 'disconnected';
  const wsStatus = global.wsConnected ? 'connected' : 'disconnected';
  const schedulerRunning = global.schedulerRunning || false;
  
  res.json({
    service: 'bitquery-pump',
    status: 'running',
    time: new Date().toISOString(),
    database: dbStatus,
    websocket: wsStatus,
    scheduler: schedulerRunning ? 'running' : 'stopped',
    config: {
      db_host: process.env.DB_HOST || 'default',
      api_proxy: process.env.API_PROXY ? 'enabled' : 'disabled',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

module.exports = router; 