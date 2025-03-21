import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Divider,
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Tabs,
  Tab,
  Link,
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  OpenInNew as OpenInNewIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getTokenDetail, getTokenTrades, getTokenHolders, analyzeToken } from '../services/apiService';

interface TokenDetail {
  mintAddress: string;
  name: string | null;
  symbol: string | null;
  decimals: number;
  creatorAddress: string;
  creationTime: string;
  uri: string | null;
  totalSupply: number | null;
  lastPrice: number | null;
  lastPriceUsd: number | null;
  marketCap: number | null;
  tradeVolume: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
  buyCount: number | null;
  sellCount: number | null;
  holderCount: number | null;
  isPotentialBuy: boolean;
  metadata: any;
}

interface TradeData {
  id: string;
  transactionSignature: string;
  blockTime: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: number;
  price: number;
  priceUsd: number | null;
  type: string;
  dexName: string | null;
}

interface HolderData {
  id: string;
  address: string;
  ownerAddress: string | null;
  balance: number;
  percentage: number;
  isCreator: boolean;
  lastUpdated: string;
}

const TokenDetail: React.FC = () => {
  const { mintAddress } = useParams<{ mintAddress: string }>();
  const navigate = useNavigate();
  
  // 状态
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenDetail | null>(null);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [holders, setHolders] = useState<HolderData[]>([]);
  const [tradePage, setTradePage] = useState(0);
  const [tradeRowsPerPage, setTradeRowsPerPage] = useState(10);
  const [totalTrades, setTotalTrades] = useState(0);
  const [holderPage, setHolderPage] = useState(0);
  const [holderRowsPerPage, setHolderRowsPerPage] = useState(10);
  const [totalHolders, setTotalHolders] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersError, setHoldersError] = useState('');
  
  // 获取代币详情
  const fetchTokenData = async () => {
    if (!mintAddress) return;
    
    setLoading(true);
    setError('');
    try {
      const token = await getTokenDetail(mintAddress);
      setTokenData(token);
      
      // 同时获取交易和持有者数据
      await Promise.all([
        fetchTrades(),
        fetchHolders()
      ]);
    } catch (error) {
      console.error('获取代币详情失败:', error);
      setError('获取代币详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 获取交易历史
  const fetchTrades = async () => {
    if (!mintAddress) return;
    
    try {
      const response = await getTokenTrades(mintAddress, {
        limit: tradeRowsPerPage,
        offset: tradePage * tradeRowsPerPage
      });
      
      setTrades(response.data);
      setTotalTrades(response.total);
    } catch (error) {
      console.error('获取交易历史失败:', error);
    }
  };
  
  // 获取持有者列表
  const fetchHolders = async () => {
    if (!mintAddress) return;
    
    setHoldersLoading(true);
    setHoldersError('');
    
    try {
      const response = await getTokenHolders(mintAddress, {
        limit: holderRowsPerPage,
        offset: holderPage * holderRowsPerPage
      });
      
      if (response && Array.isArray(response.data)) {
        setHolders(response.data);
        setTotalHolders(response.total || response.data.length);
      } else {
        setHolders([]);
        setTotalHolders(0);
        if (tabValue === 1) {
          setHoldersError('获取持有者数据失败');
        }
      }
    } catch (error) {
      console.error('获取持有者列表失败:', error);
      setHolders([]);
      setTotalHolders(0);
      if (tabValue === 1) {
        setHoldersError('获取持有者数据失败');
      }
    } finally {
      setHoldersLoading(false);
    }
  };
  
  // 分析代币
  const handleAnalyze = async () => {
    if (!mintAddress) return;
    
    setAnalyzing(true);
    try {
      const result = await analyzeToken(mintAddress);
      setTokenData(prev => prev ? { ...prev, ...result } : null);
    } catch (error) {
      console.error('分析代币失败:', error);
    } finally {
      setAnalyzing(false);
    }
  };
  
  // 初始加载
  useEffect(() => {
    if (mintAddress) {
      fetchTokenData();
    }
  }, [mintAddress]);
  
  // 交易分页变化
  useEffect(() => {
    fetchTrades();
  }, [tradePage, tradeRowsPerPage]);
  
  // 持有者分页变化
  useEffect(() => {
    fetchHolders();
  }, [holderPage, holderRowsPerPage]);
  
  // 处理标签页切换
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // 如果切换到持有者分布标签页，重新获取持有者数据
    if (newValue === 1) {
      fetchHolders();
    }
    // 如果切换到交易历史标签页，重新获取交易数据
    else if (newValue === 0) {
      fetchTrades();
    }
  };
  
  // 处理交易分页变化
  const handleTradePageChange = (event: unknown, newPage: number) => {
    setTradePage(newPage);
  };
  
  // 处理交易每页行数变化
  const handleTradeRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTradeRowsPerPage(+event.target.value);
    setTradePage(0);
  };
  
  // 处理持有者分页变化
  const handleHolderPageChange = (event: unknown, newPage: number) => {
    setHolderPage(newPage);
  };
  
  // 处理持有者每页行数变化
  const handleHolderRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHolderRowsPerPage(+event.target.value);
    setHolderPage(0);
  };
  
  // 生成持有者饼图数据
  const getHolderPieData = () => {
    if (!holders || !Array.isArray(holders) || holders.length === 0) {
      return [];
    }
    
    // 只取前10位持有者
    const topHolders = holders.slice(0, 10);
    
    // 如果总持有者多于10个，将其他持有者合并为一条数据
    if (totalHolders > 10) {
      const topHoldersPercentage = topHolders.reduce((acc, holder) => acc + (holder.percentage || 0), 0);
      topHolders.push({
        id: 'others',
        address: '其他持有者',
        ownerAddress: null,
        balance: 0, // 这里不重要
        percentage: 100 - topHoldersPercentage,
        isCreator: false,
        lastUpdated: ''
      });
    }
    
    return topHolders.map(holder => ({
      name: holder.isCreator ? `${holder.address.slice(0, 6)}...${holder.address.slice(-4)} (创建者)` : 
             holder.address === '其他持有者' ? holder.address :
             `${holder.address.slice(0, 6)}...${holder.address.slice(-4)}`,
      value: holder.percentage || 0,
      isCreator: holder.isCreator
    }));
  };
  
  // 饼图颜色
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', '#83a6ed'];
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }
  
  if (!tokenData) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        未找到代币信息
      </Alert>
    );
  }
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {tokenData.name || '未命名代币'} {tokenData.symbol ? `(${tokenData.symbol})` : ''}
          {tokenData.isPotentialBuy && (
            <Chip 
              icon={<TrendingUpIcon />} 
              label="潜在买入" 
              color="secondary" 
              size="small"
              sx={{ ml: 2, verticalAlign: 'middle' }}
            />
          )}
        </Typography>
        <Button
          variant="contained"
          startIcon={<BarChartIcon />}
          onClick={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? <CircularProgress size={24} /> : '分析'}
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {/* 基本信息卡片 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="基本信息" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    铸造地址
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {tokenData.mintAddress}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    创建者
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {tokenData.creatorAddress ? `${tokenData.creatorAddress.slice(0, 8)}...${tokenData.creatorAddress.slice(-8)}` : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    创建时间
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(tokenData.creationTime).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    小数位数
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {tokenData.decimals || 0}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    总供应量
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {tokenData.totalSupply ? tokenData.totalSupply.toLocaleString() : '-'}
                  </Typography>
                </Grid>
                {tokenData.uri && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      元数据URI
                    </Typography>
                    <Link href={tokenData.uri} target="_blank" rel="noopener" display="block" gutterBottom>
                      {tokenData.uri}
                      <OpenInNewIcon fontSize="small" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
                    </Link>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 价格信息卡片 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="价格信息" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    最新价格
                  </Typography>
                  <Typography variant="h4" gutterBottom color="primary">
                    {typeof tokenData.lastPrice === 'number' ? tokenData.lastPrice.toFixed(8) : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    美元价格
                  </Typography>
                  <Typography variant="h4" gutterBottom>
                    {typeof tokenData.lastPriceUsd === 'number' ? `$${tokenData.lastPriceUsd.toFixed(2)}` : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    市值
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {typeof tokenData.marketCap === 'number' ? `$${tokenData.marketCap.toLocaleString()}` : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    交易量
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {typeof tokenData.tradeVolume === 'number' ? tokenData.tradeVolume.toLocaleString() : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    买入交易量
                  </Typography>
                  <Typography variant="body1" gutterBottom color="success.main">
                    {typeof tokenData.buyVolume === 'number' ? tokenData.buyVolume.toLocaleString() : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    卖出交易量
                  </Typography>
                  <Typography variant="body1" gutterBottom color="error.main">
                    {typeof tokenData.sellVolume === 'number' ? tokenData.sellVolume.toLocaleString() : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    买入次数
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {tokenData.buyCount || 0}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    卖出次数
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {tokenData.sellCount || 0}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 标签内容 */}
        <Grid item xs={12}>
          <Paper sx={{ mb: 2 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="交易历史" />
              <Tab label="持有者分布" />
              <Tab label={`分析结果 ${tokenData.isPotentialBuy ? '(潜在买入)' : ''}`} />
            </Tabs>
          </Paper>
          
          {/* 交易历史选项卡 */}
          {tabValue === 0 && (
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 440 }}>
                <Table stickyHeader aria-label="交易历史表格">
                  <TableHead>
                    <TableRow>
                      <TableCell>时间</TableCell>
                      <TableCell>类型</TableCell>
                      <TableCell align="right">价格</TableCell>
                      <TableCell align="right">数量</TableCell>
                      <TableCell>买方</TableCell>
                      <TableCell>卖方</TableCell>
                      <TableCell>DEX</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trades.length > 0 ? (
                      trades.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell>{new Date(trade.blockTime).toLocaleString()}</TableCell>
                          <TableCell>
                            <Chip 
                              size="small"
                              color={trade.type === 'buy' ? 'success' : 'error'}
                              label={trade.type === 'buy' ? '买入' : '卖出'}
                              icon={trade.type === 'buy' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            />
                          </TableCell>
                          <TableCell align="right">{typeof trade.price === 'number' ? trade.price.toFixed(8) : '-'}</TableCell>
                          <TableCell align="right">{typeof trade.amount === 'number' ? trade.amount.toLocaleString() : '-'}</TableCell>
                          <TableCell>
                            {trade.buyerAddress ? `${trade.buyerAddress.slice(0, 6)}...${trade.buyerAddress.slice(-4)}` : '-'}
                          </TableCell>
                          <TableCell>
                            {trade.sellerAddress ? `${trade.sellerAddress.slice(0, 6)}...${trade.sellerAddress.slice(-4)}` : '-'}
                          </TableCell>
                          <TableCell>{trade.dexName || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          暂无交易数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={totalTrades}
                rowsPerPage={tradeRowsPerPage}
                page={tradePage}
                onPageChange={handleTradePageChange}
                onRowsPerPageChange={handleTradeRowsPerPageChange}
                labelRowsPerPage="每页行数:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `超过${to}`}`}
              />
            </Paper>
          )}
          
          {/* 持有者分布选项卡 */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              {holdersLoading ? (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                    <CircularProgress />
                  </Box>
                </Grid>
              ) : holdersError ? (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {holdersError}
                  </Alert>
                </Grid>
              ) : (
                <>
                  <Grid item xs={12} md={7}>
                    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                      <TableContainer sx={{ maxHeight: 440 }}>
                        <Table stickyHeader aria-label="持有者列表表格">
                          <TableHead>
                            <TableRow>
                              <TableCell>地址</TableCell>
                              <TableCell align="right">余额</TableCell>
                              <TableCell align="right">占比(%)</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {holders && Array.isArray(holders) && holders.length > 0 ? (
                              holders.map((holder) => (
                                <TableRow key={holder.id}>
                                  <TableCell>
                                    {holder.isCreator ? (
                                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {`${holder.address.slice(0, 8)}...${holder.address.slice(-8)}`}
                                        <Chip
                                          size="small"
                                          label="创建者"
                                          color="primary"
                                          sx={{ ml: 1 }}
                                        />
                                      </Box>
                                    ) : (
                                      `${holder.address.slice(0, 8)}...${holder.address.slice(-8)}`
                                    )}
                                  </TableCell>
                                  <TableCell align="right">{typeof holder.balance === 'number' ? holder.balance.toLocaleString() : '0'}</TableCell>
                                  <TableCell align="right">{typeof holder.percentage === 'number' ? holder.percentage.toFixed(2) : '0'}%</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={3} align="center">
                                  暂无持有者数据
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        component="div"
                        count={totalHolders}
                        rowsPerPage={holderRowsPerPage}
                        page={holderPage}
                        onPageChange={handleHolderPageChange}
                        onRowsPerPageChange={handleHolderRowsPerPageChange}
                        labelRowsPerPage="每页行数:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `超过${to}`}`}
                      />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 2, height: '100%' }}>
                      <Typography variant="h6" gutterBottom>
                        持有者分布
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        {holders && Array.isArray(holders) && holders.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={getHolderPieData()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                {getHolderPieData().map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.isCreator ? '#f44336' : COLORS[index % COLORS.length]} 
                                  />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Typography color="textSecondary">暂无持有者数据</Typography>
                          </Box>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                </>
              )}
            </Grid>
          )}
          
          {/* 分析结果选项卡 */}
          {tabValue === 2 && (
            <Paper sx={{ p: 3 }}>
              {tokenData.metadata && tokenData.metadata.analysis ? (
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      分析结果
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {tokenData.metadata.analysis.summary || '暂无分析总结'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          价格趋势评分
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {tokenData.metadata.analysis.priceScore || 0}/10
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {tokenData.metadata.analysis.priceComment || ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          交易活跃度评分
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {tokenData.metadata.analysis.tradingScore || 0}/10
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {tokenData.metadata.analysis.tradingComment || ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          持有者分布评分
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {tokenData.metadata.analysis.holdersScore || 0}/10
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {tokenData.metadata.analysis.holdersComment || ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          整体评分
                        </Typography>
                        <Typography variant="h4" color={tokenData.isPotentialBuy ? "secondary" : "primary"}>
                          {tokenData.metadata.analysis.totalScore || 0}/10
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {tokenData.isPotentialBuy ? '推荐买入' : '暂不推荐'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {tokenData.metadata.analysis.details && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        详细分析
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {tokenData.metadata.analysis.details}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" gutterBottom>
                    暂无分析数据，请点击上方"分析"按钮进行代币分析
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<BarChartIcon />} 
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    sx={{ mt: 2 }}
                  >
                    {analyzing ? <CircularProgress size={24} /> : '开始分析'}
                  </Button>
                </Box>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default TokenDetail; 