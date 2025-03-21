import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socketService';
import { getSystemStatus, getRecentTokens, getTokenStats } from '../services/apiService';

interface StatusItem {
  name: string;
  status: boolean;
  lastUpdated: string;
}

interface TokenItem {
  mintAddress: string;
  name: string;
  symbol: string;
  creationTime: string;
  isPotentialBuy: boolean;
}

interface StatsData {
  todayTokens: number;
  weekTokens: number;
  potentialBuyCount: number;
  totalTokens: number;
}

interface ActivityPoint {
  time: string;
  tokens: number;
  trades: number;
}

type NotificationType = 'success' | 'info' | 'warning' | 'error';

interface NotificationState {
  open: boolean;
  message: string;
  type: NotificationType;
  token: any | null;
}

interface DashboardProps {
  setNotification: (notification: NotificationState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setNotification }) => {
  const navigate = useNavigate();
  
  // 状态
  const [loading, setLoading] = useState<boolean>(true);
  const [systemStatus, setSystemStatus] = useState<StatusItem[]>([
    { name: '数据库连接', status: false, lastUpdated: new Date().toISOString() },
    { name: 'WebSocket连接', status: false, lastUpdated: new Date().toISOString() },
    { name: '定时任务', status: false, lastUpdated: new Date().toISOString() }
  ]);
  const [recentTokens, setRecentTokens] = useState<TokenItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    todayTokens: 0,
    weekTokens: 0,
    potentialBuyCount: 0,
    totalTokens: 0
  });
  const [activityData, setActivityData] = useState<ActivityPoint[]>([]);
  
  // 获取数据
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 获取系统状态
      const response = await getSystemStatus();
      if (response && response.statusItems) {
        setSystemStatus(response.statusItems);
      }
      
      // 获取最近代币
      const tokens = await getRecentTokens();
      if (tokens) {
        setRecentTokens(tokens);
      }
      
      // 获取统计数据
      const statsData = await getTokenStats();
      if (statsData) {
        setStats(statsData);
      }
      
      // 模拟活动数据（实际项目中应从API获取）
      const activityPoints = generateActivityData();
      setActivityData(activityPoints);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 生成模拟活动数据
  const generateActivityData = (): ActivityPoint[] => {
    const data: ActivityPoint[] = [];
    const now = new Date();
    
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tokens: Math.floor(Math.random() * 5),
        trades: Math.floor(Math.random() * 50 + 10)
      });
    }
    
    return data;
  };
  
  // WebSocket 实时更新
  useEffect(() => {
    // 连接 Socket
    socket.connect();
    
    // 监听新代币事件
    socket.on('new-token', (token) => {
      setRecentTokens(prev => [token, ...prev.slice(0, 9)]);
      setStats(prev => ({
        ...prev,
        todayTokens: prev.todayTokens + 1,
        weekTokens: prev.weekTokens + 1,
        totalTokens: prev.totalTokens + 1,
        potentialBuyCount: prev.potentialBuyCount + (token.isPotentialBuy ? 1 : 0)
      }));
      
      // 显示通知
      setNotification({
        open: true,
        message: `发现新代币: ${token.name} (${token.symbol})`,
        type: 'info',
        token: token
      });
    });
    
    // 初始加载数据
    fetchDashboardData();
    
    // 清理函数
    return () => {
      socket.off('new-token');
    };
  }, []);
  
  // 刷新按钮点击处理
  const handleRefresh = () => {
    fetchDashboardData();
  };
  
  // 点击代币导航到详情页
  const handleTokenClick = (mintAddress: string) => {
    navigate(`/tokens/${mintAddress}`);
  };
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          仪表盘
        </Typography>
        <IconButton onClick={handleRefresh} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
        </IconButton>
      </Box>
      
      <Grid container spacing={3}>
        {/* 系统状态卡片 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="系统状态" />
            <Divider />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemText primary="数据库连接" />
                  <ListItemSecondaryAction>
                    <Chip 
                      icon={systemStatus[0]?.status ? <CheckCircleIcon /> : <ErrorIcon />}
                      color={systemStatus[0]?.status ? "success" : "error"}
                      label={systemStatus[0]?.status ? "已连接" : "未连接"}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText primary="WebSocket连接" />
                  <ListItemSecondaryAction>
                    <Chip 
                      icon={systemStatus[1]?.status ? <CheckCircleIcon /> : <ErrorIcon />}
                      color={systemStatus[1]?.status ? "success" : "error"}
                      label={systemStatus[1]?.status ? "已连接" : "未连接"}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText primary="定时任务" />
                  <ListItemSecondaryAction>
                    <Chip 
                      icon={systemStatus[2]?.status ? <CheckCircleIcon /> : <ErrorIcon />}
                      color={systemStatus[2]?.status ? "success" : "error"}
                      label={systemStatus[2]?.status ? "运行中" : "已停止"}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 统计数据卡片 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="代币监控统计" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="primary">
                      {stats.todayTokens}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      今日新代币
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="primary">
                      {stats.weekTokens}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      本周新代币
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h3" color="secondary">
                      {stats.potentialBuyCount}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      潜在买入机会
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h3">
                      {stats.totalTokens}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      总代币数量
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 最近代币列表 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="最近发现的代币" />
            <Divider />
            <CardContent>
              {recentTokens.length > 0 ? (
                <List>
                  {recentTokens.map((token) => (
                    <ListItem
                      key={token.mintAddress}
                      button
                      onClick={() => handleTokenClick(token.mintAddress)}
                    >
                      <ListItemText
                        primary={token.name || '未命名'}
                        secondary={`${token.symbol || '无符号'} - ${new Date(token.creationTime).toLocaleString()}`}
                      />
                      {token.isPotentialBuy && (
                        <ListItemSecondaryAction>
                          <Chip
                            size="small"
                            color="secondary"
                            label="潜在买入"
                            icon={<TrendingUpIcon />}
                          />
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  {loading ? (
                    <CircularProgress />
                  ) : (
                    <Typography color="textSecondary">暂无代币数据</Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* 活动图表 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="代币和交易活动" />
            <Divider />
            <CardContent>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={activityData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="tokens"
                      name="新代币"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="trades"
                      name="交易量"
                      stackId="2"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 