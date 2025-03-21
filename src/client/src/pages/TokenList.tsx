import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TablePagination,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Checkbox,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Divider,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Download as DownloadIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getTokens } from '../services/apiService';

interface Column {
  id: 'name' | 'symbol' | 'creationTime' | 'lastPrice' | 'marketCap' | 'tradeVolume' | 'holderCount' | 'actions';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: number) => string;
}

const columns: Column[] = [
  { id: 'name', label: '名称', minWidth: 170 },
  { id: 'symbol', label: '符号', minWidth: 100 },
  { id: 'creationTime', label: '创建时间', minWidth: 170 },
  { 
    id: 'lastPrice', 
    label: '最新价格', 
    minWidth: 100, 
    align: 'right', 
    format: (value: number) => typeof value === 'number' ? value.toFixed(8) : '-' 
  },
  { 
    id: 'marketCap', 
    label: '市值', 
    minWidth: 100, 
    align: 'right', 
    format: (value: number) => typeof value === 'number' ? `$${value.toLocaleString()}` : '-' 
  },
  { 
    id: 'tradeVolume', 
    label: '交易量', 
    minWidth: 100, 
    align: 'right', 
    format: (value: number) => typeof value === 'number' ? value.toLocaleString() : '-' 
  },
  { id: 'holderCount', label: '持有者数量', minWidth: 120, align: 'right' },
  { id: 'actions', label: '操作', minWidth: 120, align: 'center' },
];

interface TokenData {
  mintAddress: string;
  name: string | null;
  symbol: string | null;
  creationTime: string;
  lastPrice: number | null;
  lastPriceUsd: number | null;
  marketCap: number | null;
  tradeVolume: number | null;
  holderCount: number | null;
  isPotentialBuy: boolean;
}

const TokenList: React.FC = () => {
  const navigate = useNavigate();
  
  // 状态
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // 筛选条件
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<string>('creationTime');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [onlyPotentialBuy, setOnlyPotentialBuy] = useState(false);
  
  // 获取代币列表
  const fetchTokens = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const queryParams = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        sort: sortField,
        order: sortOrder,
        search: searchTerm.trim(),
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        isPotentialBuy: onlyPotentialBuy ? 'true' : undefined
      };
      
      console.log('开始获取代币列表，参数:', queryParams);
      const response = await getTokens(queryParams);
      console.log('代币列表API返回结果:', response);
      
      // 检查API响应是否成功
      if (response && response.success === false) {
        console.warn('API请求失败:', response.error);
        setApiError(response.error || '获取数据失败');
        
        // 使用模拟数据保证UI可用性
        const mockTokens = generateMockTokens();
        setTokens(mockTokens);
        setTotalCount(100);
        return;
      }
      
      // 防止response或response.data未定义
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log('设置代币列表数据，数量:', response.data.length);
        setTokens(response.data);
        // 使用API返回的总数，如果没有则使用当前页数据长度
        setTotalCount(response.total || response.data.length);
      } else {
        console.warn('API返回的代币列表为空，使用模拟数据');
        
        // API失败时，使用模拟数据保证UI可用性
        const mockTokens = generateMockTokens();
        setTokens(mockTokens);
        setTotalCount(100); // 设置一个合理的总数值
      }
    } catch (error) {
      console.error('获取代币列表失败:', error);
      
      // 发生错误时，使用模拟数据保证UI可用性
      const mockTokens = generateMockTokens();
      setTokens(mockTokens);
      setTotalCount(100); // 设置一个合理的总数值
      setApiError('无法连接到API服务器或数据库，显示的是模拟数据。请检查服务器连接和数据库配置。');
    } finally {
      setLoading(false);
    }
  };
  
  // 生成模拟代币数据，用于API失败时
  const generateMockTokens = () => {
    const mockTokens: TokenData[] = [];
    
    for (let i = 0; i < rowsPerPage; i++) {
      const id = page * rowsPerPage + i;
      mockTokens.push({
        mintAddress: `mock-address-${id}`,
        name: `模拟代币 ${id}`,
        symbol: `MOCK${id}`,
        creationTime: new Date(Date.now() - id * 24 * 60 * 60 * 1000).toISOString(),
        lastPrice: 0.00001234 * (id + 1),
        lastPriceUsd: 0.05 * (id + 1),
        marketCap: 10000 * (id + 1),
        tradeVolume: 5000 * (id + 1),
        holderCount: 100 + id,
        isPotentialBuy: id % 3 === 0 // 每3个标记一个为潜在买入
      });
    }
    
    return mockTokens;
  };
  
  // 初始加载数据和筛选条件变化时重新加载
  useEffect(() => {
    fetchTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, sortField, sortOrder, onlyPotentialBuy]);
  
  // 手动刷新数据
  const refreshTokens = () => {
    fetchTokens();
  };
  
  // 处理搜索
  const handleSearch = () => {
    setPage(0);
    fetchTokens();
  };
  
  // 处理页面变化
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // 处理每页行数变化
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };
  
  // 处理排序变化
  const handleSortChange = (event: SelectChangeEvent) => {
    setSortField(event.target.value);
  };
  
  // 处理排序顺序变化
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };
  
  // 重置筛选条件
  const resetFilters = () => {
    setSearchTerm('');
    setStartDate(null);
    setEndDate(null);
    setSortField('creationTime');
    setSortOrder('desc');
    setOnlyPotentialBuy(false);
    setPage(0);
  };
  
  // 导出数据
  const exportData = () => {
    // 导出CSV逻辑
    console.log('导出数据');
  };
  
  // 批量分析代币
  const analyzeTokens = () => {
    // 分析逻辑
    console.log('分析代币');
  };
  
  // 导航到代币详情
  const navigateToToken = (mintAddress: string) => {
    if (mintAddress.startsWith('mock-address')) {
      // 提示用户这是模拟数据
      alert('此为模拟数据，无法查看详情！请检查服务器连接或数据库配置。');
      return;
    }
    navigate(`/tokens/${mintAddress}`);
  };
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          代币列表
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshTokens}
            sx={{ mr: 1 }}
            disabled={loading}
          >
            刷新
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportData}
            sx={{ mr: 1 }}
          >
            导出
          </Button>
          <Button
            variant="contained"
            startIcon={<BarChartIcon />}
            onClick={analyzeTokens}
          >
            批量分析
          </Button>
        </Box>
      </Box>
      
      {apiError && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#ffebee' }}>
          <Typography color="error">{apiError}</Typography>
        </Paper>
      )}
      
      {/* 筛选器卡片 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                fullWidth
                label="搜索代币"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton size="small" onClick={handleSearch}>
                      <SearchIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>排序字段</InputLabel>
                <Select
                  value={sortField}
                  label="排序字段"
                  onChange={handleSortChange}
                >
                  <MenuItem value="creationTime">创建时间</MenuItem>
                  <MenuItem value="lastPrice">价格</MenuItem>
                  <MenuItem value="marketCap">市值</MenuItem>
                  <MenuItem value="tradeVolume">交易量</MenuItem>
                  <MenuItem value="holderCount">持有者数量</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2} md={1}>
              <Button 
                fullWidth 
                variant="outlined" 
                onClick={toggleSortOrder}
                startIcon={sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
              >
                {sortOrder === 'asc' ? '升序' : '降序'}
              </Button>
            </Grid>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid item xs={12} sm={4} md={2}>
                <DatePicker
                  label="开始日期"
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <DatePicker
                  label="结束日期"
                  value={endDate}
                  onChange={setEndDate}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </LocalizationProvider>
            <Grid item xs={12} sm={4} md={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={onlyPotentialBuy}
                    onChange={(e) => setOnlyPotentialBuy(e.target.checked)}
                  />
                }
                label="潜在买入"
              />
            </Grid>
            <Grid item xs={12} sm={4} md={1}>
              <Button
                fullWidth
                variant="text"
                onClick={resetFilters}
              >
                重置
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* 代币数据表格 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="代币列表表格">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : tokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <Typography color="textSecondary">暂无数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tokens.map((token) => (
                  <TableRow 
                    hover 
                    role="checkbox" 
                    tabIndex={-1} 
                    key={token.mintAddress}
                    onClick={() => navigateToToken(token.mintAddress)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {token.name || '未命名'}
                        {token.isPotentialBuy && (
                          <Chip
                            size="small"
                            icon={<TrendingUpIcon />}
                            label="潜在买入"
                            color="secondary"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{token.symbol || '-'}</TableCell>
                    <TableCell>
                      {new Date(token.creationTime).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      {token.lastPrice !== null && token.lastPrice !== undefined && typeof token.lastPrice === 'number'
                        ? (columns[3].format ? columns[3].format(token.lastPrice) : token.lastPrice)
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {token.marketCap !== null && token.marketCap !== undefined && typeof token.marketCap === 'number'
                        ? (columns[4].format ? columns[4].format(token.marketCap) : token.marketCap)
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      {token.tradeVolume !== null && token.tradeVolume !== undefined && typeof token.tradeVolume === 'number'
                        ? (columns[5].format ? columns[5].format(token.tradeVolume) : token.tradeVolume)
                        : '-'}
                    </TableCell>
                    <TableCell align="right">{token.holderCount || '-'}</TableCell>
                    <TableCell align="center">
                      <Button size="small" onClick={(e) => {
                        e.stopPropagation();
                        navigateToToken(token.mintAddress);
                      }}>
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page < Math.ceil(totalCount / rowsPerPage) ? page : 0}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="每页行数:"
          labelDisplayedRows={({ from, to, count }) => {
            const isMock = tokens.length > 0 && tokens[0].mintAddress.startsWith('mock-address');
            const countText = count !== -1 ? count : '更多';
            return `${from}-${to} 共 ${countText}${isMock ? ' (模拟数据)' : ''}`;
          }}
        />
      </Paper>
    </Box>
  );
};

export default TokenList; 