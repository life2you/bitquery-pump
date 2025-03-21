import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Badge, 
  Switch, 
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  List,
  ListItem,
  Box
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface HeaderProps {
  open: boolean;
  toggleDrawer: () => void;
  darkMode: boolean;
  onThemeChange: (isDark: boolean) => void;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  createdAt: Date;
  read: boolean;
  tokenInfo?: {
    symbol: string;
    address: string;
  };
}

const Header: React.FC<HeaderProps> = ({ open, toggleDrawer, darkMode, onThemeChange }) => {
  // 模拟通知数据
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      message: '新的代币已添加到监控列表',
      type: 'success',
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
      tokenInfo: {
        symbol: 'BTC',
        address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8'
      }
    },
    {
      id: '2',
      message: '系统检测到可能的价格操纵',
      type: 'warning',
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      read: false
    },
    {
      id: '3',
      message: '交易模拟完成',
      type: 'info',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: true
    }
  ]);

  // 通知菜单状态
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<null | HTMLElement>(null);
  const notificationsOpen = Boolean(notificationsAnchorEl);

  // 处理主题变更
  const handleThemeChange = () => {
    const newDarkMode = !darkMode;
    localStorage.setItem('darkMode', newDarkMode.toString());
    onThemeChange(newDarkMode);
  };

  // 打开通知菜单
  const handleNotificationsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  // 关闭通知菜单
  const handleNotificationsClose = () => {
    setNotificationsAnchorEl(null);
  };

  // 标记通知为已读
  const handleNotificationRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
    // 这里可以添加API调用，将已读状态同步到后端
  };

  // 清除所有通知
  const handleClearNotifications = () => {
    setNotifications([]);
    // 这里可以添加API调用，清除后端通知
    handleNotificationsClose();
  };

  // 未读通知数量
  const unreadCount = notifications.filter(notification => !notification.read).length;

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <InfoIcon color="info" />;
    }
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={toggleDrawer}
          sx={{ marginRight: '36px', ...(open && { display: 'none' }) }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Bitquery Pump
        </Typography>
        
        <IconButton color="inherit" onClick={handleThemeChange}>
          {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
        
        <IconButton 
          color="inherit" 
          onClick={handleNotificationsOpen}
          aria-controls={notificationsOpen ? 'notifications-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={notificationsOpen ? 'true' : undefined}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        
        <Menu
          id="notifications-menu"
          anchorEl={notificationsAnchorEl}
          open={notificationsOpen}
          onClose={handleNotificationsClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              width: 320,
              maxHeight: 400,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">通知</Typography>
              {notifications.length > 0 && (
                <IconButton 
                  size="small" 
                  onClick={handleClearNotifications}
                  title="清除所有通知"
                >
                  <DeleteSweepIcon />
                </IconButton>
              )}
            </Box>
            <Divider />
            
            {notifications.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">没有通知</Typography>
              </Box>
            ) : (
              <List sx={{ width: '100%', p: 0 }}>
                {notifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem 
                      alignItems="flex-start" 
                      sx={{ 
                        opacity: notification.read ? 0.7 : 1,
                        backgroundColor: notification.read ? 'transparent' : (theme) => 
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
                      }}
                      onClick={() => handleNotificationRead(notification.id)}
                      button
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={notification.message}
                        secondary={
                          <React.Fragment>
                            <Typography
                              sx={{ display: 'block' }}
                              component="span"
                              variant="body2"
                              color="text.secondary"
                            >
                              {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: zhCN })}
                            </Typography>
                            {notification.tokenInfo && (
                              <Typography
                                component="span"
                                variant="body2"
                                color="primary"
                              >
                                {notification.tokenInfo.symbol}
                              </Typography>
                            )}
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
            
            {unreadCount > 0 && (
              <>
                <Divider />
                <MenuItem onClick={() => {
                  setNotifications(notifications.map(n => ({ ...n, read: true })));
                  // 这里可以添加API调用，将所有通知标记为已读
                }}>
                  <ListItemIcon>
                    <DoneAllIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>标记所有为已读</ListItemText>
                </MenuItem>
              </>
            )}
          </Paper>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 