const WebSocket = require('ws');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// WebSocket客户端类，用于处理与Bitquery API的实时数据连接
class BitqueryWebSocketClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000; // 初始重连延迟(毫秒)
    this.callbackMap = new Map();
    this.subscriptionIds = new Map();
    
    // 获取代理配置
    this.proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    
    // 验证API密钥是否有效
    // 注意: Bitquery已更新到V2 API，需要使用OAuth令牌
    // 请访问https://docs.bitquery.io/docs/authorisation/how-to-generate/
    // 创建应用并生成有效的OAuth令牌
    if (!this.apiKey || this.apiKey === 'YOUR_BITQUERY_API_KEY' || this.apiKey === 'your_bitquery_api_key_here') {
      console.error('警告: 无效的Bitquery API密钥。请在.env文件中设置有效的BITQUERY_API_KEY');
      throw new Error('无效的API密钥');
    }
    
    if (this.proxyUrl) {
      console.log(`将使用代理: ${this.proxyUrl}`);
    }
  }

  // 连接到Bitquery WebSocket服务器
  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('正在连接Bitquery WebSocket服务器...');
        
        // 创建WebSocket连接选项
        const options = {};
        
        // 如果配置了代理，设置代理
        if (this.proxyUrl) {
          options.agent = new HttpsProxyAgent(this.proxyUrl);
          console.log(`正在通过代理 ${this.proxyUrl} 连接`);
        }
        
        // 设置请求头（header参数与子协议分开处理）
        options.headers = {
          'Content-Type': 'application/json'
        };
        
        // 创建WebSocket连接，在URL中添加token参数
        // 对于EAP端点(包括Solana)使用eap而不是graphql
        const wsUrl = `wss://streaming.bitquery.io/eap?token=${this.apiKey}`;
        console.log(`正在连接WebSocket: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl, 'graphql-ws', options);
        
        this.ws.on('open', () => {
          console.log('已连接到Bitquery WebSocket服务器');
          
          // 发送初始化消息
          const initMessage = JSON.stringify({ type: "connection_init" });
          this.ws.send(initMessage);
          console.log('已发送初始化消息');
        });
        
        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            
            // 处理连接确认
            if (message.type === 'connection_ack') {
              console.log('服务器已确认连接');
              this.isConnected = true;
              this.reconnectAttempts = 0;
              this.reconnectDelay = 2000;
              resolve();
              return;
            }
            
            // 处理心跳消息
            if (message.type === 'ka' || message.type === 'pong') {
              // console.log('收到心跳消息');
              return;
            }
            
            this.handleMessage(message);
          } catch (error) {
            console.error('处理WebSocket消息时出错:', error);
          }
        });
        
        this.ws.on('error', (error) => {
          console.error('WebSocket连接错误:', error);
          
          // 检查是否是API密钥认证错误
          if (error.message && error.message.includes('401')) {
            console.error('API密钥认证失败。请检查您的Bitquery API密钥是否有效');
          }
          
          if (!this.isConnected) {
            reject(error);
          }
        });
        
        this.ws.on('close', () => {
          console.log('WebSocket连接已关闭');
          this.isConnected = false;
          this.attemptReconnect();
        });
        
        // 添加超时
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('连接超时'));
          }
        }, 10000);
      } catch (error) {
        console.error('创建WebSocket连接时出错:', error);
        reject(error);
      }
    });
  }

  // 尝试重新连接
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`已达到最大重连尝试次数(${this.maxReconnectAttempts})，停止重连`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    console.log(`${delay / 1000}秒后尝试重连(尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      console.log('正在重新连接...');
      this.connect()
        .then(() => {
          console.log('重连成功');
          // 重新订阅之前的查询
          this.resubscribeAll();
        })
        .catch(error => {
          console.error('重连失败:', error);
        });
    }, delay);
  }

  // 重新订阅所有之前的订阅
  resubscribeAll() {
    for (const [queryId, { query, variables, callback }] of this.callbackMap.entries()) {
      this.subscribe(query, variables, callback, queryId);
    }
  }

  // 处理接收到的消息
  handleMessage(message) {
    // 处理数据消息
    if (message.type === 'data' && message.id) {
      const callback = this.callbackMap.get(message.id);
      if (callback && callback.callback) {
        callback.callback(message.payload.data);
      }
    }
    // 处理订阅完成消息
    else if (message.type === 'complete' && message.id) {
      console.log(`订阅 ${message.id} 已完成`);
    }
    // 处理错误消息
    else if (message.type === 'error') {
      console.error('WebSocket错误消息:', message.payload);
      
      // 检查是否是API密钥认证错误
      if (message.payload && message.payload.message && 
          (message.payload.message.includes('unauthorized') || 
           message.payload.message.includes('Unauthorized'))) {
        console.error('API密钥认证失败。请检查您的Bitquery API密钥是否有效');
      }
    }
    // 处理其他未识别的消息类型
    else {
      console.log(`收到未处理的消息类型: ${message.type}`, message);
    }
  }

  // 订阅查询
  subscribe(query, variables = {}, callback, queryId = null) {
    if (!this.isConnected) {
      console.error('WebSocket未连接，无法订阅');
      return null;
    }
    
    try {
      // 生成唯一的订阅ID
      const id = queryId || Math.random().toString(36).substring(2, 15);
      
      // 存储回调函数
      this.callbackMap.set(id, { query, variables, callback });
      
      // 创建订阅消息 - 注意使用"start"类型和正确的payload格式
      const message = {
        id,
        type: 'start',
        payload: {
          query,
          variables
        }
      };
      
      // 发送订阅请求
      this.ws.send(JSON.stringify(message));
      console.log(`已发送订阅请求，ID: ${id}`);
      
      return id;
    } catch (error) {
      console.error('订阅时出错:', error);
      return null;
    }
  }

  // 取消订阅
  unsubscribe(id) {
    if (!this.isConnected || !id) {
      return false;
    }
    
    try {
      const message = {
        id,
        type: 'stop'
      };
      
      this.ws.send(JSON.stringify(message));
      this.callbackMap.delete(id);
      console.log(`已取消订阅，ID: ${id}`);
      
      return true;
    } catch (error) {
      console.error('取消订阅时出错:', error);
      return false;
    }
  }

  // 关闭WebSocket连接
  close() {
    if (this.ws) {
      // 取消所有订阅
      for (const id of this.callbackMap.keys()) {
        this.unsubscribe(id);
      }
      
      this.ws.close();
      this.isConnected = false;
      console.log('WebSocket连接已关闭');
    }
  }
}

/**
 * 初始化WebSocket客户端
 * @returns {Promise<BitqueryWebSocketClient>} WebSocket客户端实例
 */
const initWebSocketClient = async () => {
  try {
    const apiKey = process.env.BITQUERY_API_KEY;
    if (!apiKey) {
      console.error('未设置Bitquery API密钥，无法初始化WebSocket客户端');
      return null;
    }
    
    const client = new BitqueryWebSocketClient(apiKey);
    await client.connect();
    return client;
  } catch (error) {
    console.error('初始化WebSocket客户端失败:', error);
    return null;
  }
};

module.exports = {
  BitqueryWebSocketClient,
  initWebSocketClient
}; 