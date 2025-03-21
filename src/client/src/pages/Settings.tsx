import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  SelectChangeEvent,
  Alert,
  Snackbar,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { getSystemStatus, startScheduler, stopScheduler } from '../services/apiService';

interface SchedulerTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

interface SystemSettings {
  apiKey: string;
  requestLimit: number;
  databaseConnections: number;
  autoStartScheduler: boolean;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  emailAddress: string;
  webhookEnabled: boolean;
  webhookUrl: string;
}

const Settings: React.FC = () => {
  const [apiSettings, setApiSettings] = useState<SystemSettings>({
    apiKey: '',
    requestLimit: 5,
    databaseConnections: 10,
    autoStartScheduler: true,
    notificationsEnabled: true,
    emailNotifications: false,
    emailAddress: '',
    webhookEnabled: false,
    webhookUrl: ''
  });
  
  const [tasks, setTasks] = useState<SchedulerTask[]>([
    {
      id: 'update-tokens',
      name: '更新代币信息',
      description: '获取代币的最新价格、交易量等信息',
      cronExpression: '0 */30 * * * *', // 每30分钟
      isRunning: true,
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    },
    {
      id: 'update-holders',
      name: '更新持有者信息',
      description: '获取代币持有者分布数据',
      cronExpression: '0 0 */3 * * *', // 每3小时
      isRunning: true,
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'analyze-tokens',
      name: '分析代币',
      description: '分析代币潜力并标记潜在买入机会',
      cronExpression: '0 15 */4 * * *', // 每4小时
      isRunning: true,
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'cleanup',
      name: '清理数据',
      description: '清理过期数据和日志',
      cronExpression: '0 0 0 * * *', // 每天午夜
      isRunning: true,
      lastRun: new Date().toISOString(),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  ]);
  
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // 初始化数据
  useEffect(() => {
    fetchSettings();
  }, []);
  
  // 获取系统设置和任务状态
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await getSystemStatus();
      
      // 更新任务状态
      if (response && response.tasks) {
        setTasks(prevTasks => {
          const updatedTasks = [...prevTasks];
          response.tasks.forEach((statusTask: any) => {
            const index = updatedTasks.findIndex(task => task.id === statusTask.id);
            if (index !== -1) {
              updatedTasks[index] = {
                ...updatedTasks[index],
                isRunning: statusTask.isRunning,
                lastRun: statusTask.lastRun,
                nextRun: statusTask.nextRun
              };
            }
          });
          return updatedTasks;
        });
      }
      
      // 更新系统设置
      if (response && response.settings) {
        setApiSettings(prevSettings => ({
          ...prevSettings,
          ...response.settings
        }));
      }
    } catch (error) {
      console.error('获取设置失败:', error);
      showSnackbar('获取设置失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // 显示通知
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  
  // 关闭通知
  const closeSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  
  // 处理API设置变更
  const handleApiSettingChange = (field: string, value: any) => {
    setApiSettings({
      ...apiSettings,
      [field]: value
    });
  };
  
  // 保存API设置
  const saveApiSettings = () => {
    // 这里应该是调用API更新设置的逻辑
    showSnackbar('设置已保存', 'success');
  };
  
  // 处理任务选择
  const handleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };
  
  // 启动所选任务
  const startSelectedTasks = async () => {
    if (selectedTasks.length === 0) return;
    
    setLoading(true);
    try {
      await startScheduler(selectedTasks);
      
      // 更新任务状态
      setTasks(prevTasks => {
        return prevTasks.map(task => {
          if (selectedTasks.includes(task.id)) {
            return {
              ...task,
              isRunning: true
            };
          }
          return task;
        });
      });
      
      showSnackbar('任务已启动', 'success');
    } catch (error) {
      console.error('启动任务失败:', error);
      showSnackbar('启动任务失败', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // 停止所选任务
  const stopSelectedTasks = async () => {
    if (selectedTasks.length === 0) return;
    
    setLoading(true);
    try {
      await stopScheduler(selectedTasks);
      
      // 更新任务状态
      setTasks(prevTasks => {
        return prevTasks.map(task => {
          if (selectedTasks.includes(task.id)) {
            return {
              ...task,
              isRunning: false
            };
          }
          return task;
        });
      });
      
      showSnackbar('任务已停止', 'success');
    } catch (error) {
      console.error('停止任务失败:', error);
      showSnackbar('停止任务失败', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // 修改任务设置
  const handleTaskCronChange = (taskId: string, cronExpression: string) => {
    setTasks(prevTasks => {
      return prevTasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            cronExpression
          };
        }
        return task;
      });
    });
  };
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          系统设置
        </Typography>
        <Button
          variant="outlined"
          onClick={fetchSettings}
          startIcon={<RefreshIcon />}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : '刷新'}
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {/* API配置卡片 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="API配置" />
            <Divider />
            <CardContent>
              <TextField
                fullWidth
                label="Bitquery API密钥"
                type="password"
                value={apiSettings.apiKey}
                onChange={(e) => handleApiSettingChange('apiKey', e.target.value)}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="API请求限制 (每秒)"
                type="number"
                value={apiSettings.requestLimit}
                onChange={(e) => handleApiSettingChange('requestLimit', Number(e.target.value))}
                margin="normal"
                inputProps={{ min: 1, max: 20 }}
                helperText="每秒API请求数量限制 (1-20)"
              />
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={saveApiSettings}
                >
                  保存API设置
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 数据库配置卡片 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="数据库配置" />
            <Divider />
            <CardContent>
              <TextField
                fullWidth
                label="数据库连接数"
                type="number"
                value={apiSettings.databaseConnections}
                onChange={(e) => handleApiSettingChange('databaseConnections', Number(e.target.value))}
                margin="normal"
                inputProps={{ min: 1, max: 50 }}
                helperText="连接池大小 (1-50)"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={apiSettings.autoStartScheduler}
                    onChange={(e) => handleApiSettingChange('autoStartScheduler', e.target.checked)}
                  />
                }
                label="启动时自动运行定时任务"
              />
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={saveApiSettings}
                >
                  保存数据库设置
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 定时任务卡片 */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="定时任务管理" 
              action={
                <Box>
                  <Button
                    color="primary"
                    startIcon={<StartIcon />}
                    onClick={startSelectedTasks}
                    disabled={selectedTasks.length === 0 || loading}
                    sx={{ mr: 1 }}
                  >
                    启动所选
                  </Button>
                  <Button
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={stopSelectedTasks}
                    disabled={selectedTasks.length === 0 || loading}
                  >
                    停止所选
                  </Button>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <List>
                {tasks.map((task) => (
                  <Paper key={task.id} sx={{ mb: 2, p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={selectedTasks.includes(task.id)}
                              onChange={() => handleTaskSelection(task.id)}
                            />
                          }
                          label={task.name}
                        />
                        <Typography variant="body2" color="textSecondary">
                          {task.description}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Cron表达式"
                          value={task.cronExpression}
                          onChange={(e) => handleTaskCronChange(task.id, e.target.value)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <Typography variant="caption" color="textSecondary" display="block">
                          上次运行:
                        </Typography>
                        <Typography variant="body2">
                          {task.lastRun ? new Date(task.lastRun).toLocaleString() : '从未运行'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="caption" color="textSecondary" display="block">
                              状态:
                            </Typography>
                            <Typography variant="body2" color={task.isRunning ? 'success.main' : 'text.secondary'}>
                              {task.isRunning ? '运行中' : '已停止'}
                            </Typography>
                          </Box>
                          <IconButton 
                            color={task.isRunning ? 'error' : 'primary'}
                            onClick={() => task.isRunning ? stopSelectedTasks() : startSelectedTasks()}
                            disabled={loading}
                          >
                            {task.isRunning ? <StopIcon /> : <StartIcon />}
                          </IconButton>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 通知设置卡片 */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="通知设置" />
            <Divider />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={apiSettings.notificationsEnabled}
                        onChange={(e) => handleApiSettingChange('notificationsEnabled', e.target.checked)}
                      />
                    }
                    label="启用通知"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    邮件通知
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={apiSettings.emailNotifications}
                        onChange={(e) => handleApiSettingChange('emailNotifications', e.target.checked)}
                        disabled={!apiSettings.notificationsEnabled}
                      />
                    }
                    label="启用邮件通知"
                  />
                  
                  <TextField
                    fullWidth
                    label="邮箱地址"
                    value={apiSettings.emailAddress}
                    onChange={(e) => handleApiSettingChange('emailAddress', e.target.value)}
                    disabled={!apiSettings.notificationsEnabled || !apiSettings.emailNotifications}
                    margin="normal"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Webhook集成
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={apiSettings.webhookEnabled}
                        onChange={(e) => handleApiSettingChange('webhookEnabled', e.target.checked)}
                        disabled={!apiSettings.notificationsEnabled}
                      />
                    }
                    label="启用Webhook通知"
                  />
                  
                  <TextField
                    fullWidth
                    label="Webhook URL"
                    value={apiSettings.webhookUrl}
                    onChange={(e) => handleApiSettingChange('webhookUrl', e.target.value)}
                    disabled={!apiSettings.notificationsEnabled || !apiSettings.webhookEnabled}
                    margin="normal"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveApiSettings}
                  >
                    保存通知设置
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity as 'success' | 'error' | 'info' | 'warning'}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings; 