import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControlLabel,
  Switch,
  Slider,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as ResetIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  CompareArrows as CompareIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { getTokens, startSimulation, stopSimulation, getSimulationResults } from '../services/apiService';

// 定义接口
interface TokenOption {
  mintAddress: string;
  name: string;
  symbol: string;
}

interface SimulationConfig {
  tokenMintAddress: string;
  strategy: string;
  amount: number;
  interval?: number;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  startDate?: Date;
  endDate?: Date;
  includeFees: boolean;
  slippageTolerance: number;
}

interface TradeResult {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  value: number;
  pnl?: number;
  pnlPercentage?: number;
}

interface SimulationSummary {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  totalInvested: number;
  currentValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  maxDrawdown: number;
}

const TradeSimulation: React.FC = () => {
  // 状态
  const [tokens, setTokens] = useState<TokenOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [selectedToken, setSelectedToken] = useState('');
  const [strategy, setStrategy] = useState('dca');
  const [config, setConfig] = useState<SimulationConfig>({
    tokenMintAddress: '',
    strategy: 'dca',
    amount: 100,
    interval: 24,
    targetPrice: 0,
    stopLoss: 10,
    takeProfit: 20,
    includeFees: true,
    slippageTolerance: 1,
  });
  const [trades, setTrades] = useState<TradeResult[]>([]);
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [error, setError] = useState('');
  const [historyView, setHistoryView] = useState(false);
  const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
  
  // 获取代币列表
  useEffect(() => {
    fetchTokens();
  }, []);
  
  const fetchTokens = async () => {
    setLoadingTokens(true);
    try {
      const response = await getTokens({ limit: 100, sort: 'tradeVolume', order: 'desc' });
      setTokens(response.data.map((token: any) => ({
        mintAddress: token.mintAddress,
        name: token.name || '未命名',
        symbol: token.symbol || '未知'
      })));
    } catch (error) {
      console.error('获取代币列表失败:', error);
      setError('获取代币列表失败，请稍后重试');
    } finally {
      setLoadingTokens(false);
    }
  };
  
  // 处理代币选择变化
  const handleTokenChange = (event: SelectChangeEvent) => {
    setSelectedToken(event.target.value);
    setConfig({ ...config, tokenMintAddress: event.target.value });
  };
  
  // 处理策略选择变化
  const handleStrategyChange = (event: SelectChangeEvent) => {
    const newStrategy = event.target.value;
    setStrategy(newStrategy);
    setConfig({ ...config, strategy: newStrategy });
  };
  
  // 处理配置变化
  const handleConfigChange = (field: string, value: any) => {
    setConfig({ ...config, [field]: value });
  };
  
  // 开始模拟
  const handleStartSimulation = async () => {
    if (!config.tokenMintAddress) {
      setError('请选择一个代币进行模拟');
      return;
    }
    
    setSimulating(true);
    setError('');
    try {
      await startSimulation(config);
      fetchSimulationResults();
    } catch (error) {
      console.error('启动模拟失败:', error);
      setError('启动模拟失败，请检查配置后重试');
      setSimulating(false);
    }
  };
  
  // 停止模拟
  const handleStopSimulation = async () => {
    try {
      await stopSimulation(selectedToken);
      setSimulating(false);
    } catch (error) {
      console.error('停止模拟失败:', error);
    }
  };
  
  // 获取模拟结果
  const fetchSimulationResults = async () => {
    setLoading(true);
    try {
      const response = await getSimulationResults({ tokenMintAddress: selectedToken });
      
      if (response.trades) {
        setTrades(response.trades);
      }
      
      if (response.summary) {
        setSummary(response.summary);
      }
      
      if (!response.isRunning) {
        setSimulating(false);
      }
    } catch (error) {
      console.error('获取模拟结果失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 重置模拟
  const handleResetSimulation = () => {
    setTrades([]);
    setSummary(null);
  };
  
  // 保存模拟
  const handleSaveSimulation = () => {
    if (!summary) return;
    
    const simulation = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      token: tokens.find(t => t.mintAddress === selectedToken),
      strategy,
      config,
      summary,
      trades: trades.slice(0, 10) // 只保存前10条交易记录
    };
    
    setSavedSimulations([simulation, ...savedSimulations]);
  };
  
  // 生成PnL图表数据
  const getPnlChartData = () => {
    if (!trades || trades.length === 0) return [];
    
    return trades.map((trade, index) => ({
      name: new Date(trade.timestamp).toLocaleTimeString(),
      pnl: trade.pnl || 0,
      pnlPercentage: trade.pnlPercentage || 0,
      value: trade.value
    }));
  };
  
  // 生成交易分布图表数据
  const getTradeDistributionData = () => {
    if (!trades || trades.length === 0) return [];
    
    const tradesByDate: any = {};
    
    trades.forEach(trade => {
      const date = new Date(trade.timestamp).toLocaleDateString();
      if (!tradesByDate[date]) {
        tradesByDate[date] = { buys: 0, sells: 0 };
      }
      
      if (trade.type === 'buy') {
        tradesByDate[date].buys += 1;
      } else {
        tradesByDate[date].sells += 1;
      }
    });
    
    return Object.keys(tradesByDate).map(date => ({
      date,
      buys: tradesByDate[date].buys,
      sells: tradesByDate[date].sells
    }));
  };
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          交易模拟
        </Typography>
        <Button
          variant="outlined"
          onClick={() => setHistoryView(!historyView)}
          startIcon={<CompareIcon />}
        >
          {historyView ? '返回模拟' : '查看历史模拟'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {!historyView ? (
        <Grid container spacing={3}>
          {/* 模拟配置卡片 */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader 
                title="模拟配置" 
                action={
                  <Box sx={{ display: 'flex' }}>
                    {simulating ? (
                      <Button
                        color="error"
                        startIcon={<StopIcon />}
                        onClick={handleStopSimulation}
                      >
                        停止
                      </Button>
                    ) : (
                      <Button
                        color="primary"
                        startIcon={<StartIcon />}
                        onClick={handleStartSimulation}
                        disabled={!selectedToken}
                      >
                        开始
                      </Button>
                    )}
                  </Box>
                } 
              />
              <Divider />
              <CardContent>
                <FormControl fullWidth margin="normal">
                  <InputLabel>选择代币</InputLabel>
                  <Select
                    value={selectedToken}
                    label="选择代币"
                    onChange={handleTokenChange}
                    disabled={simulating || loadingTokens}
                  >
                    {loadingTokens ? (
                      <MenuItem value="">
                        <CircularProgress size={20} /> 加载中...
                      </MenuItem>
                    ) : (
                      tokens.map((token) => (
                        <MenuItem key={token.mintAddress} value={token.mintAddress}>
                          {token.name} ({token.symbol})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>交易策略</InputLabel>
                  <Select
                    value={strategy}
                    label="交易策略"
                    onChange={handleStrategyChange}
                    disabled={simulating}
                  >
                    <MenuItem value="dca">定投策略 (DCA)</MenuItem>
                    <MenuItem value="target-price">目标价格策略</MenuItem>
                    <MenuItem value="stop-limit">止损止盈策略</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="投资金额"
                  type="number"
                  margin="normal"
                  value={config.amount}
                  onChange={(e) => handleConfigChange('amount', Number(e.target.value))}
                  disabled={simulating}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">USDC</InputAdornment>,
                  }}
                />
                
                {strategy === 'dca' && (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>投资间隔</InputLabel>
                    <Select
                      value={config.interval?.toString() || '24'}
                      label="投资间隔"
                      onChange={(e) => handleConfigChange('interval', Number(e.target.value))}
                      disabled={simulating}
                    >
                      <MenuItem value="1">每小时</MenuItem>
                      <MenuItem value="6">每6小时</MenuItem>
                      <MenuItem value="12">每12小时</MenuItem>
                      <MenuItem value="24">每天</MenuItem>
                      <MenuItem value="168">每周</MenuItem>
                    </Select>
                  </FormControl>
                )}
                
                {strategy === 'target-price' && (
                  <TextField
                    fullWidth
                    label="目标价格"
                    type="number"
                    margin="normal"
                    value={config.targetPrice}
                    onChange={(e) => handleConfigChange('targetPrice', Number(e.target.value))}
                    disabled={simulating}
                  />
                )}
                
                {strategy === 'stop-limit' && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      止损百分比 (%)
                    </Typography>
                    <Slider
                      value={config.stopLoss || 10}
                      onChange={(e, value) => handleConfigChange('stopLoss', value)}
                      disabled={simulating}
                      min={1}
                      max={50}
                      valueLabelDisplay="auto"
                    />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      止盈百分比 (%)
                    </Typography>
                    <Slider
                      value={config.takeProfit || 20}
                      onChange={(e, value) => handleConfigChange('takeProfit', value)}
                      disabled={simulating}
                      min={1}
                      max={100}
                      valueLabelDisplay="auto"
                    />
                  </>
                )}
                
                <Box sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.includeFees}
                        onChange={(e) => handleConfigChange('includeFees', e.target.checked)}
                        disabled={simulating}
                      />
                    }
                    label="包含交易费用"
                  />
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>
                  滑点容忍度 (%)
                </Typography>
                <Slider
                  value={config.slippageTolerance}
                  onChange={(e, value) => handleConfigChange('slippageTolerance', value)}
                  disabled={simulating}
                  min={0.1}
                  max={5}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
                
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="开始日期"
                    value={config.startDate}
                    onChange={(value) => handleConfigChange('startDate', value)}
                    slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                    disabled={simulating}
                  />
                  
                  <DateTimePicker
                    label="结束日期"
                    value={config.endDate}
                    onChange={(value) => handleConfigChange('endDate', value)}
                    slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
                    disabled={simulating}
                  />
                </LocalizationProvider>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    variant="outlined"
                    startIcon={<ResetIcon />}
                    onClick={handleResetSimulation}
                    disabled={simulating || (!trades.length && !summary)}
                  >
                    重置
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSimulation}
                    disabled={simulating || !summary}
                  >
                    保存结果
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* 模拟结果区域 */}
          <Grid item xs={12} md={8}>
            {/* 汇总卡片 */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="模拟结果概要" />
              <Divider />
              <CardContent>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : summary ? (
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="subtitle2" color="textSecondary">总交易次数</Typography>
                      <Typography variant="h6">{summary.totalTrades}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="subtitle2" color="textSecondary">总投资金额</Typography>
                      <Typography variant="h6">${summary.totalInvested.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="subtitle2" color="textSecondary">当前价值</Typography>
                      <Typography variant="h6">${summary.currentValue.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="subtitle2" color="textSecondary">最大回撤</Typography>
                      <Typography variant="h6">{summary.maxDrawdown.toFixed(2)}%</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Box 
                        sx={{ 
                          p: 2, 
                          bgcolor: summary.totalPnl >= 0 ? 'success.light' : 'error.light',
                          borderRadius: 1,
                          mt: 2 
                        }}
                      >
                        <Typography variant="subtitle1">
                          总收益: ${summary.totalPnl.toFixed(2)} ({summary.totalPnlPercentage.toFixed(2)}%)
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography color="textSecondary" align="center">
                    还没有模拟数据。请配置模拟参数并点击"开始"按钮。
                  </Typography>
                )}
              </CardContent>
            </Card>
            
            {/* 图表卡片 */}
            {trades.length > 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardHeader 
                      title="收益走势" 
                      subheader="模拟交易的收益变化趋势"
                    />
                    <Divider />
                    <CardContent>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={getPnlChartData()}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" orientation="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <RechartsTooltip />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="pnl"
                              name="收益 ($)"
                              stroke="#8884d8"
                              activeDot={{ r: 8 }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="pnlPercentage"
                              name="收益率 (%)"
                              stroke="#82ca9d"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="交易记录" />
                    <Divider />
                    <CardContent>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>时间</TableCell>
                              <TableCell>类型</TableCell>
                              <TableCell align="right">价格</TableCell>
                              <TableCell align="right">数量</TableCell>
                              <TableCell align="right">价值</TableCell>
                              <TableCell align="right">收益</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {trades.slice(0, 10).map((trade) => (
                              <TableRow key={trade.id}>
                                <TableCell>{new Date(trade.timestamp).toLocaleString()}</TableCell>
                                <TableCell>
                                  <Chip 
                                    size="small"
                                    color={trade.type === 'buy' ? 'success' : 'error'}
                                    label={trade.type === 'buy' ? '买入' : '卖出'}
                                  />
                                </TableCell>
                                <TableCell align="right">${trade.price.toFixed(8)}</TableCell>
                                <TableCell align="right">{trade.amount.toFixed(2)}</TableCell>
                                <TableCell align="right">${trade.value.toFixed(2)}</TableCell>
                                <TableCell align="right">
                                  {trade.pnl !== undefined ? (
                                    <Typography
                                      color={trade.pnl >= 0 ? 'success.main' : 'error.main'}
                                    >
                                      ${trade.pnl.toFixed(2)} ({trade.pnlPercentage?.toFixed(2)}%)
                                    </Typography>
                                  ) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {trades.length > 10 && (
                        <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
                          显示前10条记录，共 {trades.length} 条
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Grid>
        </Grid>
      ) : (
        // 历史模拟视图
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom>
              历史模拟记录
            </Typography>
            
            {savedSimulations.length === 0 ? (
              <Alert severity="info">
                暂无保存的模拟记录。运行模拟后点击"保存结果"按钮将模拟结果保存到此处。
              </Alert>
            ) : (
              savedSimulations.map((sim) => (
                <Card key={sim.id} sx={{ mb: 3 }}>
                  <CardHeader
                    title={`${sim.token?.name || '未知代币'} (${sim.token?.symbol || '?'}) - ${
                      sim.strategy === 'dca' ? '定投策略' :
                      sim.strategy === 'target-price' ? '目标价格策略' : '止损止盈策略'
                    }`}
                    subheader={`模拟时间: ${new Date(sim.date).toLocaleString()}`}
                  />
                  <Divider />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="textSecondary">总交易次数</Typography>
                        <Typography variant="body1">{sim.summary.totalTrades}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="textSecondary">总投资金额</Typography>
                        <Typography variant="body1">${sim.summary.totalInvested.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="textSecondary">总收益</Typography>
                        <Typography 
                          variant="body1"
                          color={sim.summary.totalPnl >= 0 ? 'success.main' : 'error.main'}
                        >
                          ${sim.summary.totalPnl.toFixed(2)} ({sim.summary.totalPnlPercentage.toFixed(2)}%)
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="subtitle2" color="textSecondary">最大回撤</Typography>
                        <Typography variant="body1">{sim.summary.maxDrawdown.toFixed(2)}%</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default TradeSimulation; 