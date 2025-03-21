import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CssBaseline, Container, Toolbar, ThemeProvider, createTheme } from '@mui/material';
import Dashboard from './pages/Dashboard';
import TokenList from './pages/TokenList';
import TokenDetail from './pages/TokenDetail';
import TradeSimulation from './pages/TradeSimulation';
import Settings from './pages/Settings';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import NotificationBar from './components/common/NotificationBar';

type NotificationType = 'success' | 'info' | 'warning' | 'error';

interface NotificationState {
  open: boolean;
  message: string;
  type: NotificationType;
  token: any | null;
}

const App: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    type: 'info',
    token: null
  });
  
  // 主题状态
  const [darkMode, setDarkMode] = useState(() => {
    // 从localStorage中获取主题设置
    const savedDarkMode = localStorage.getItem('darkMode');
    // 如果有保存的设置，则使用它，否则默认为false(浅色主题)
    return savedDarkMode ? savedDarkMode === 'true' : false;
  });

  // 创建主题
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
  });
  
  // 初始化时设置文档根元素的数据属性，用于CSS变量
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDrawer = () => {
    setOpen(!open);
  };
  
  // 处理主题变更
  const handleThemeChange = (isDark: boolean) => {
    setDarkMode(isDark);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <Header 
          open={open} 
          toggleDrawer={toggleDrawer} 
          darkMode={darkMode} 
          onThemeChange={handleThemeChange}
        />
        <Sidebar open={open} toggleDrawer={toggleDrawer} />
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <Toolbar />
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <NotificationBar 
              open={notification.open}
              message={notification.message}
              severity={notification.type}
              token={notification.token}
              onClose={() => setNotification({ ...notification, open: false })}
            />
            <Routes>
              <Route path="/" element={<Dashboard setNotification={setNotification} />} />
              <Route path="/tokens" element={<TokenList />} />
              <Route path="/tokens/:mintAddress" element={<TokenDetail />} />
              <Route path="/simulation" element={<TradeSimulation />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App; 