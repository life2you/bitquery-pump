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
  BarChart as BarChartIcon
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
  { id: 'lastPrice', label: '最新价格', minWidth: 100, align: 'right', format: (value: number) => value.toFixed(8) },
  { id: 'marketCap', label: '市值', minWidth: 100, align: 'right', format: (value: number) => `$${value.toLocaleString()}` },
  { id: 'tradeVolume', label: '交易量', minWidth: 100, align: 'right', format: (value: number) => value.toLocaleString() },
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
      
      const response = await getTokens(queryParams);
      setTokens(response.data);
      setTotalCount(response.total);
    } catch (error) {
      console.error('获取代币列表失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 初始加载数据
  useEffect(() => {
    fetchTokens();
  }, [page, rowsPerPage, sortField, sortOrder]);
  
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
    setOnlyPotentialBuy(false);
    setSortField('creationTime');
    setSortOrder('desc');
    setPage(0);
  };
  
  // 导出数据
  const exportData = () => {
    // 实际项目中实现导出功能
    console.log('导出数据');
  };
  
  // 分析选中代币
  const analyzeTokens = () => {
    // 实际项目中实现批量分析
    console.log('分析代币');
  };
  
  // 跳转到代币详情
  const navigateToToken = (mintAddress: string) => {
    navigate(`/tokens/${mintAddress}`);
  };
  
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          代币列表
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<BarChartIcon />}
            onClick={analyzeTokens}
            sx={{ mr: 1 }}
          >
            批量分析
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            onClick={exportData}
          >
            导出数据
          </Button>
        </Box>
      </Box>
      
      {/* 筛选卡片 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="搜索代币"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="名称、符号或地址"
                InputProps={{
                  endAdornment: (
                    <IconButton size="small" onClick={handleSearch}>
                      <SearchIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <DatePicker
                    label="开始日期"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    format="yyyy-MM-dd"
                    slotProps={{
                      textField: {
                        size: 'small',
                        variant: 'outlined',
                        fullWidth: true
                      }
                    }}
                  />
                  <DatePicker
                    label="结束日期"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    format="yyyy-MM-dd"
                    slotProps={{
                      textField: {
                        size: 'small',
                        variant: 'outlined',
                        fullWidth: true
                      }
                    }}
                  />
                </Box>
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={onlyPotentialBuy}
                    onChange={(e) => setOnlyPotentialBuy(e.target.checked)}
                    color="primary"
                  />
                }
                label="仅潜在买入"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="sort-field-label">排序字段</InputLabel>
                <Select
                  labelId="sort-field-label"
                  value={sortField}
                  label="排序字段"
                  onChange={handleSortChange}
                >
                  <MenuItem value="creationTime">创建时间</MenuItem>
                  <MenuItem value="lastPrice">最新价格</MenuItem>
                  <MenuItem value="marketCap">市值</MenuItem>
                  <MenuItem value="tradeVolume">交易量</MenuItem>
                  <MenuItem value="holderCount">持有者数量</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} sm={2}>
              <Button
                variant="outlined"
                fullWidth
                onClick={toggleSortOrder}
                startIcon={sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
              >
                {sortOrder === 'asc' ? '升序' : '降序'}
              </Button>
            </Grid>
            
            <Grid item xs={6} sm={2}>
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={resetFilters}
              >
                重置
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
              >
                搜索
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* 代币表格 */}
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
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      加载中...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : tokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2">
                      没有找到符合条件的代币
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tokens.map((token) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={token.mintAddress}
                    onClick={() => navigateToToken(token.mintAddress)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">
                          {token.name || 'Unknown'}
                        </Typography>
                        {token.isPotentialBuy && (
                          <Chip 
                            label="潜在买入" 
                            color="success" 
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{token.symbol || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(token.creationTime).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      {token.lastPrice !== null 
                        ? (token.lastPrice < 0.00000001 
                          ? token.lastPrice.toExponential(4) 
                          : token.lastPrice.toFixed(8))
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {token.marketCap !== null 
                        ? `$${token.marketCap.toLocaleString()}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {token.tradeVolume !== null 
                        ? token.tradeVolume.toLocaleString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {token.holderCount !== null 
                        ? token.holderCount.toLocaleString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="查看详情">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToToken(token.mintAddress);
                          }}
                        >
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="每页行数:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `超过 ${to}`}`}
        />
      </Paper>
    </Box>
  );
};

export default TokenList; 