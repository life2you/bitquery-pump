import axios from 'axios';

// 使用明确的API基础URL
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 系统状态
export const getSystemStatus = async () => {
  try {
    const response = await api.get('/scheduler/status');
    
    // 将API返回数据转换为前端需要的格式
    const schedulerStatus = response.data;
    
    // 创建状态项数组
    const statusItems = [
      {
        name: '数据库连接',
        status: true, // 如果API能返回数据，数据库连接应该是正常的
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'WebSocket连接',
        status: true, // 假设WebSocket连接正常
        lastUpdated: schedulerStatus.lastRunTime || new Date().toISOString()
      },
      {
        name: '定时任务',
        status: schedulerStatus.running || false,
        lastUpdated: schedulerStatus.lastRunTime || new Date().toISOString()
      }
    ];
    
    // 创建任务列表
    const tasks = Array.isArray(schedulerStatus.tasks) ? schedulerStatus.tasks : [
      {
        id: 'update-tokens',
        name: '更新代币信息',
        isRunning: schedulerStatus.running || false,
        lastRun: schedulerStatus.lastRunTime,
        nextRun: null
      },
      {
        id: 'update-holders',
        name: '更新持有者信息',
        isRunning: schedulerStatus.running || false,
        lastRun: schedulerStatus.lastRunTime,
        nextRun: null
      },
      {
        id: 'analyze-tokens',
        name: '分析代币',
        isRunning: schedulerStatus.running || false,
        lastRun: schedulerStatus.lastRunTime,
        nextRun: null
      },
      {
        id: 'cleanup',
        name: '清理数据',
        isRunning: schedulerStatus.running || false,
        lastRun: schedulerStatus.lastRunTime,
        nextRun: null
      }
    ];
    
    // 创建设置对象
    const settings = schedulerStatus.settings || {
      apiKey: schedulerStatus.apiKey || '',
      requestLimit: schedulerStatus.requestLimit || 5,
      databaseConnections: schedulerStatus.dbConnections || 10,
      autoStartScheduler: schedulerStatus.autoStart || true,
      notificationsEnabled: true,
      emailNotifications: false,
      emailAddress: '',
      webhookEnabled: false,
      webhookUrl: ''
    };
    
    return {
      statusItems,
      tasks,
      settings
    };
  } catch (error) {
    console.error('获取系统状态失败:', error);
    // 返回默认的系统状态
    return {
      statusItems: [
        { name: '数据库连接', status: false, lastUpdated: new Date().toISOString() },
        { name: 'WebSocket连接', status: false, lastUpdated: new Date().toISOString() },
        { name: '定时任务', status: false, lastUpdated: new Date().toISOString() }
      ],
      tasks: [
        { id: 'update-tokens', name: '更新代币信息', isRunning: false, lastRun: null, nextRun: null },
        { id: 'update-holders', name: '更新持有者信息', isRunning: false, lastRun: null, nextRun: null },
        { id: 'analyze-tokens', name: '分析代币', isRunning: false, lastRun: null, nextRun: null },
        { id: 'cleanup', name: '清理数据', isRunning: false, lastRun: null, nextRun: null }
      ],
      settings: {
        apiKey: '',
        requestLimit: 5,
        databaseConnections: 10,
        autoStartScheduler: true,
        notificationsEnabled: true,
        emailNotifications: false,
        emailAddress: '',
        webhookEnabled: false,
        webhookUrl: ''
      }
    };
  }
};

// 代币相关接口
export const getTokens = async (params: any) => {
  try {
    console.log('调用getTokens API，参数:', params);
    const response = await api.get('/tokens', { params });
    console.log('getTokens API返回:', response.data);
    
    // 确保返回的数据格式正确
    if (response.data && typeof response.data === 'object') {
      let tokenData = [];
      
      // 确定返回数据的格式并提取代币数组
      if (Array.isArray(response.data)) {
        tokenData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        tokenData = response.data.data;
      } else if (response.data.tokens && Array.isArray(response.data.tokens)) {
        tokenData = response.data.tokens;
      } else {
        // 其他情况，尝试将响应数据作为单个代币
        tokenData = [response.data];
      }
      
      // 处理每个代币的数据类型
      const processedTokens = tokenData.map((token: any) => ({
        ...token,
        // 确保数值字段是数字类型
        lastPrice: typeof token.lastPrice === 'string' ? parseFloat(token.lastPrice) : token.lastPrice,
        lastPriceUsd: typeof token.lastPriceUsd === 'string' ? parseFloat(token.lastPriceUsd) : token.lastPriceUsd,
        marketCap: typeof token.marketCap === 'string' ? parseFloat(token.marketCap) : token.marketCap,
        tradeVolume: typeof token.tradeVolume === 'string' ? parseFloat(token.tradeVolume) : token.tradeVolume,
        holderCount: typeof token.holderCount === 'string' ? parseInt(token.holderCount, 10) : token.holderCount,
        // 确保布尔字段是布尔类型
        isPotentialBuy: token.isPotentialBuy === 'true' ? true : !!token.isPotentialBuy
      }));
      
      // 返回处理后的数据
      return {
        data: processedTokens,
        total: response.data.total || processedTokens.length,
        success: true
      };
    } else {
      // 如果返回的数据不是对象，返回空数组
      console.warn('getTokens API返回的数据不是对象:', response.data);
      return { 
        data: [], 
        total: 0, 
        success: false,
        error: '服务器返回的数据格式不正确' 
      };
    }
  } catch (error) {
    console.error('获取代币列表失败:', error);
    // 返回空数据和错误信息
    let errorMessage = '请求代币列表失败';
    
    if (error && typeof error === 'object') {
      // @ts-ignore
      if (error.code === 'ECONNREFUSED') {
        errorMessage = '无法连接到API服务器';
      // @ts-ignore
      } else if (error.response && error.response.status) {
        // @ts-ignore
        errorMessage = `服务器错误 (${error.response.status})`;
      }
    }
    
    return { 
      data: [], 
      total: 0, 
      success: false,
      error: errorMessage 
    };
  }
};

export const getRecentTokens = async (limit = 10) => {
  try {
    const response = await api.get('/tokens', { 
      params: { 
        limit, 
        sort: 'creationTime', 
        order: 'desc' 
      } 
    });
    
    // 确保返回的数据格式正确
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      console.warn('getRecentTokens API返回的数据格式不正确:', response.data);
      return [];
    }
  } catch (error) {
    console.error('获取最近代币失败:', error);
    return [];
  }
};

export const getTokenStats = async () => {
  try {
    console.log('请求代币统计数据...');
    const response = await api.get('/tokens/stats');
    console.log('代币统计数据API返回:', response.data);
    
    // 确保数据格式正确
    if (response.data) {
      // 确保所有字段都是数字类型
      const statsData = {
        todayTokens: typeof response.data.todayTokens === 'number' ? response.data.todayTokens : 0,
        weekTokens: typeof response.data.weekTokens === 'number' ? response.data.weekTokens : 0,
        potentialBuyCount: typeof response.data.potentialBuyCount === 'number' ? response.data.potentialBuyCount : 0,
        totalTokens: typeof response.data.totalTokens === 'number' ? response.data.totalTokens : 0
      };
      
      return statsData;
    }
    
    // 如果返回的数据不正确，返回默认值
    return {
      todayTokens: 0,
      weekTokens: 0,
      potentialBuyCount: 0,
      totalTokens: 0
    };
  } catch (error) {
    console.error('获取代币统计信息失败:', error);
    // 返回默认的统计数据
    return {
      todayTokens: 0,
      weekTokens: 0,
      potentialBuyCount: 0,
      totalTokens: 0
    };
  }
};

export const getTokenDetail = async (mintAddress: string) => {
  try {
    console.log(`获取代币详情: ${mintAddress}`);
    const response = await api.get(`/tokens/${mintAddress}`);
    console.log('代币详情API返回:', response.data);
    
    // 确保数值字段是数字类型
    if (response.data) {
      const processedData = {
        ...response.data,
        lastPrice: typeof response.data.lastPrice === 'string' ? parseFloat(response.data.lastPrice) : response.data.lastPrice,
        lastPriceUsd: typeof response.data.lastPriceUsd === 'string' ? parseFloat(response.data.lastPriceUsd) : response.data.lastPriceUsd,
        marketCap: typeof response.data.marketCap === 'string' ? parseFloat(response.data.marketCap) : response.data.marketCap,
        tradeVolume: typeof response.data.tradeVolume === 'string' ? parseFloat(response.data.tradeVolume) : response.data.tradeVolume,
        buyVolume: typeof response.data.buyVolume === 'string' ? parseFloat(response.data.buyVolume) : response.data.buyVolume,
        sellVolume: typeof response.data.sellVolume === 'string' ? parseFloat(response.data.sellVolume) : response.data.sellVolume,
        buyCount: typeof response.data.buyCount === 'string' ? parseInt(response.data.buyCount, 10) : response.data.buyCount,
        sellCount: typeof response.data.sellCount === 'string' ? parseInt(response.data.sellCount, 10) : response.data.sellCount,
        holderCount: typeof response.data.holderCount === 'string' ? parseInt(response.data.holderCount, 10) : response.data.holderCount,
        totalSupply: typeof response.data.totalSupply === 'string' ? parseFloat(response.data.totalSupply) : response.data.totalSupply,
        decimals: typeof response.data.decimals === 'string' ? parseInt(response.data.decimals, 10) : response.data.decimals
      };
      return processedData;
    }
    return response.data;
  } catch (error) {
    console.error(`获取代币${mintAddress}详情失败:`, error);
    throw error;
  }
};

export const getTokenTrades = async (mintAddress: string, params: any) => {
  try {
    console.log(`获取代币交易历史: ${mintAddress}`, params);
    const response = await api.get(`/tokens/${mintAddress}/trades`, { params });
    console.log('交易历史API返回:', response.data);
    
    // 处理返回数据
    let tradesData = [];
    let total = 0;
    
    if (response.data) {
      if (Array.isArray(response.data)) {
        tradesData = response.data;
        total = tradesData.length;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        tradesData = response.data.data;
        total = response.data.total || tradesData.length;
      }
      
      // 确保数值字段是数字类型
      tradesData = tradesData.map((trade: any) => ({
        ...trade,
        price: typeof trade.price === 'string' ? parseFloat(trade.price) : trade.price,
        priceUsd: typeof trade.priceUsd === 'string' ? parseFloat(trade.priceUsd) : trade.priceUsd,
        amount: typeof trade.amount === 'string' ? parseFloat(trade.amount) : trade.amount
      }));
    }
    
    return {
      data: tradesData,
      total
    };
  } catch (error) {
    console.error(`获取代币${mintAddress}交易历史失败:`, error);
    return {
      data: [],
      total: 0
    };
  }
};

export const getTokenHolders = async (mintAddress: string, params: any) => {
  try {
    console.log(`获取代币持有者: ${mintAddress}`, params);
    const response = await api.get(`/tokens/${mintAddress}/holders`, { params });
    console.log('持有者数据API返回:', response.data);

    // 处理返回数据
    let holdersData = [];
    let total = 0;
    
    if (response.data) {
      if (Array.isArray(response.data)) {
        holdersData = response.data;
        total = holdersData.length;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        holdersData = response.data.data;
        total = response.data.total || holdersData.length;
      }
      
      // 确保数值字段是数字类型
      holdersData = holdersData.map((holder: any) => ({
        ...holder,
        balance: typeof holder.balance === 'string' ? parseFloat(holder.balance) : holder.balance,
        percentage: typeof holder.percentage === 'string' ? parseFloat(holder.percentage) : holder.percentage
      }));
    }
    
    return {
      data: holdersData,
      total
    };
  } catch (error) {
    console.error(`获取代币${mintAddress}持有者失败:`, error);
    return {
      data: [],
      total: 0
    };
  }
};

export const analyzeToken = async (mintAddress: string) => {
  const response = await api.post(`/tokens/${mintAddress}/analyze`);
  return response.data;
};

// 交易模拟接口
export const startSimulation = async (config: any) => {
  const response = await api.post('/simulation/start', config);
  return response.data;
};

export const stopSimulation = async (id: string) => {
  const response = await api.post('/simulation/stop', { id });
  return response.data;
};

export const getSimulationResults = async (params: any) => {
  const response = await api.get('/simulation/results', { params });
  return response.data;
};

// 定时任务接口
export const startScheduler = async (tasks: string[]) => {
  const response = await api.post('/scheduler/start', { tasks });
  return response.data;
};

export const stopScheduler = async (tasks: string[]) => {
  const response = await api.post('/scheduler/stop', { tasks });
  return response.data;
};

// 错误处理
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
); 