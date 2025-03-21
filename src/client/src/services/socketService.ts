import { io, Socket } from 'socket.io-client';

// 创建socket实例
export const socket: Socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// 连接管理
let connectedCallback: (() => void) | null = null;
let disconnectedCallback: (() => void) | null = null;

export const connectSocket = (onConnected?: () => void, onDisconnected?: () => void) => {
  if (onConnected) {
    connectedCallback = onConnected;
    socket.on('connect', onConnected);
  }
  
  if (onDisconnected) {
    disconnectedCallback = onDisconnected;
    socket.on('disconnect', onDisconnected);
  }
  
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (connectedCallback) {
    socket.off('connect', connectedCallback);
  }
  
  if (disconnectedCallback) {
    socket.off('disconnect', disconnectedCallback);
  }
  
  socket.disconnect();
};

// 监听新代币事件
export const subscribeToNewTokens = (callback: (token: any) => void) => {
  socket.on('new-token', callback);
  return () => {
    socket.off('new-token', callback);
  };
};

// 监听代币价格更新
export const subscribeToTokenPrices = (callback: (data: any) => void) => {
  socket.on('token-price-update', callback);
  return () => {
    socket.off('token-price-update', callback);
  };
};

// 监听系统状态更新
export const subscribeToSystemStatus = (callback: (status: any) => void) => {
  socket.on('system-status-update', callback);
  return () => {
    socket.off('system-status-update', callback);
  };
}; 