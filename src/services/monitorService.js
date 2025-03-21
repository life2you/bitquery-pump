/**
 * 代币监控服务
 * 用于监听新代币创建、价格变动等事件
 */

// 存储事件回调函数
const eventCallbacks = {
  newToken: [],
  priceChange: [],
  volumeChange: [],
  schedulerStatus: []
};

/**
 * 注册新代币事件处理程序
 * @param {Function} callback 回调函数，接收代币对象作为参数
 */
const onNewToken = (callback) => {
  if (typeof callback === 'function') {
    eventCallbacks.newToken.push(callback);
  }
};

/**
 * 注册价格变化事件处理程序
 * @param {Function} callback 回调函数，接收代币对象和价格变化信息作为参数
 */
const onPriceChange = (callback) => {
  if (typeof callback === 'function') {
    eventCallbacks.priceChange.push(callback);
  }
};

/**
 * 注册交易量变化事件处理程序
 * @param {Function} callback 回调函数，接收代币对象和交易量变化信息作为参数
 */
const onVolumeChange = (callback) => {
  if (typeof callback === 'function') {
    eventCallbacks.volumeChange.push(callback);
  }
};

/**
 * 注册调度器状态变化事件处理程序
 * @param {Function} callback 回调函数，接收状态信息作为参数
 */
const onSchedulerStatusChange = (callback) => {
  if (typeof callback === 'function') {
    eventCallbacks.schedulerStatus.push(callback);
  }
};

/**
 * 触发新代币事件
 * @param {Object} token 代币对象
 */
const triggerNewToken = (token) => {
  eventCallbacks.newToken.forEach(callback => {
    try {
      callback(token);
    } catch (error) {
      console.error('执行新代币事件回调失败:', error);
    }
  });
};

/**
 * 触发价格变化事件
 * @param {Object} token 代币对象
 * @param {Object} changeInfo 价格变化信息
 */
const triggerPriceChange = (token, changeInfo) => {
  eventCallbacks.priceChange.forEach(callback => {
    try {
      callback(token, changeInfo);
    } catch (error) {
      console.error('执行价格变化事件回调失败:', error);
    }
  });
};

/**
 * 触发交易量变化事件
 * @param {Object} token 代币对象
 * @param {Object} changeInfo 交易量变化信息
 */
const triggerVolumeChange = (token, changeInfo) => {
  eventCallbacks.volumeChange.forEach(callback => {
    try {
      callback(token, changeInfo);
    } catch (error) {
      console.error('执行交易量变化事件回调失败:', error);
    }
  });
};

/**
 * 触发调度器状态变化事件
 * @param {Object} statusInfo 状态信息
 */
const triggerSchedulerStatusChange = (statusInfo) => {
  eventCallbacks.schedulerStatus.forEach(callback => {
    try {
      callback(statusInfo);
    } catch (error) {
      console.error('执行调度器状态变化事件回调失败:', error);
    }
  });
};

/**
 * 获取调度器状态
 * @returns {Object} 调度器状态信息
 */
const getSchedulerStatus = () => {
  return {
    running: global.schedulerRunning || false,
    startTime: global.schedulerStartTime || null,
    lastRunTime: global.lastSchedulerRunTime || null,
    nextRunTimes: global.nextSchedulerRunTimes || {},
    lastBuyRunTime: global.lastBuyRunTime || null,
    lastSellRunTime: global.lastSellRunTime || null,
    lastHoldingCheckTime: global.lastHoldingCheckTime || null,
    lastPerformanceReportTime: global.lastPerformanceReportTime || null
  };
};

module.exports = {
  onNewToken,
  onPriceChange,
  onVolumeChange,
  onSchedulerStatusChange,
  triggerNewToken,
  triggerPriceChange,
  triggerVolumeChange,
  triggerSchedulerStatusChange,
  getSchedulerStatus
}; 