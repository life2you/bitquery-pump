const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const routes = require('./routes');
// 恢复数据库引用
const db = require('./database');
const { testConnection } = require('./database/config');
const monitorService = require('./services/monitorService');
const { initSimulatedTradeModel } = require('./services/tradeSimulation');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { initWebSocketClient } = require('./utils/websocketClient');
const { startScheduledTasks } = require('./services/scheduler');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 全局连接状态
global.dbConnected = false;
global.wsConnected = false;
global.schedulerRunning = false;

// 中间件
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 处理CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 路由
app.use('/', routes);

// 添加一个测试路由，不需要数据库连接
app.get('/test', (req, res) => {
  res.json({ message: '应用正在运行', timestamp: new Date().toISOString() });
});

// WebSocket连接
io.on('connection', (socket) => {
  console.log('新客户端连接:', socket.id);
  
  // 当新的代币被检测到时，发送通知
  const newTokenHandler = (token) => {
    socket.emit('new-token', {
      mintAddress: token.mintAddress,
      name: token.name || 'Unknown',
      symbol: token.symbol || 'Unknown',
      creatorAddress: token.creatorAddress,
      creationTime: token.creationTime,
      isPotentialBuy: token.isPotentialBuy,
      analysis: token.metadata?.analysis || null
    });
  };
  
  // 注册新代币事件处理程序
  monitorService.onNewToken(newTokenHandler);
  
  // 断开连接时处理
  socket.on('disconnect', () => {
    console.log('客户端断开连接:', socket.id);
    // 这里可以清理资源，但onNewToken回调目前没有提供移除方法
  });
});

const initApp = async () => {
  try {
    // 初始化数据库连接
    try {
      const dbConnection = await testConnection();
      global.dbConnected = dbConnection;
      console.log('数据库连接已建立');
      
      // 特别处理TokenHolder模型确保结构正确
      if (dbConnection) {
        try {
          console.log('开始同步TokenHolder模型...');
          
          // 引入TokenHolder模型
          const { sequelize } = require('./database');
          const TokenHolder = require('./database/models/TokenHolder');
          
          // 显式初始化TokenHolder模型
          if (TokenHolder.initTokenHolderModel) {
            await TokenHolder.initTokenHolderModel(sequelize);
            console.log('TokenHolder模型同步完成');
          } else {
            console.warn('TokenHolder模型缺少initTokenHolderModel方法');
            
            // 检查TokenHolder表结构
            const [columns] = await sequelize.query(
              "SELECT column_name FROM information_schema.columns WHERE table_name = 'TokenHolders'"
            );
            console.log('当前TokenHolders表列:', columns.map(c => c.column_name));
            
            // 检查是否缺少address列
            if (!columns.some(c => c.column_name === 'address')) {
              console.log('TokenHolders表缺少address列，尝试添加...');
              try {
                await sequelize.query(
                  "ALTER TABLE \"TokenHolders\" ADD COLUMN address VARCHAR(255) NOT NULL DEFAULT 'unknown-address'"
                );
                console.log('已成功添加address列到TokenHolders表');
              } catch (alterError) {
                console.error('添加address列失败:', alterError);
              }
            }
          }
        } catch (modelError) {
          console.error('同步TokenHolder模型失败:', modelError);
          console.log('继续运行，但TokenHolder功能可能不可用');
        }
      }
      
      // 初始化模拟交易模型
      try {
        await initSimulatedTradeModel();
        console.log('模拟交易模型已初始化');
      } catch (error) {
        console.error('初始化模拟交易模型失败:', error);
        console.log('将继续运行，但模拟交易功能将不可用');
      }
    } catch (error) {
      console.error('数据库连接失败:', error);
      console.log('将继续运行，但依赖数据库的功能将不可用');
    }
    
    // 初始化WebSocket客户端
    try {
      const wsClient = await initWebSocketClient();
      global.wsConnected = !!wsClient;
      console.log('WebSocket客户端已初始化');
      
      // 如果WebSocket连接成功，订阅新代币更新
      if (wsClient) {
        const { NEW_TOKEN_SUBSCRIPTION } = require('./api/bitquery');
        const tokenService = require('./services/tokenService');
        const monitorService = require('./services/monitorService');
        
        // 订阅新代币更新
        wsClient.subscribe(
          NEW_TOKEN_SUBSCRIPTION,
          {},
          async (data) => {
            try {
              console.log('收到新代币数据:', data.Solana.TokenSupplyUpdates[0]);
              
              // 保存新代币
              const tokenResult = await tokenService.saveNewToken(data.Solana.TokenSupplyUpdates[0]);
              
              // 如果是新代币，触发新代币事件
              if (tokenResult.isNew) {
                monitorService.triggerNewToken(tokenResult.token);
                
                // 获取并更新代币详情
                setTimeout(async () => {
                  try {
                    await tokenService.updateTokenDetails(tokenResult.token.mintAddress);
                  } catch (updateError) {
                    console.error('更新代币详情失败:', updateError);
                  }
                }, 5000); // 延迟5秒再更新详情，给API时间生成数据
              }
            } catch (error) {
              console.error('处理新代币数据失败:', error);
            }
          }
        );
        
        console.log('已订阅新代币更新');
      }
    } catch (error) {
      console.error('初始化WebSocket客户端失败:', error);
      console.log('将继续运行，但实时数据功能将不可用');
    }
    
    // 启动服务器
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`服务器已启动，监听端口: ${PORT}`);
      
      // 可选：启动定时任务
      if (process.env.AUTO_START_SCHEDULER === 'true' && global.dbConnected) {
        try {
          const result = startScheduledTasks();
          global.schedulerRunning = result;
          console.log(`定时任务${result ? '已自动启动' : '自动启动失败'}`);
        } catch (error) {
          console.error('启动定时任务失败:', error);
          console.log('定时任务功能将不可用');
        }
      } else if (process.env.AUTO_START_SCHEDULER === 'true') {
        console.log('数据库未连接，定时任务无法启动');
      }
    });
    
    return app;
  } catch (error) {
    console.error('初始化应用失败:', error);
    process.exit(1);
  }
};

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 启动应用程序
initApp(); 