import React from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertColor, 
  Button, 
  Box, 
  Typography 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface TokenInfo {
  mintAddress: string;
  name: string;
  symbol: string;
}

interface NotificationBarProps {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  token: TokenInfo | null;
  onClose: () => void;
}

const NotificationBar: React.FC<NotificationBarProps> = ({
  open,
  message,
  severity,
  token,
  onClose
}) => {
  const navigate = useNavigate();

  const handleViewToken = () => {
    if (token && token.mintAddress) {
      navigate(`/tokens/${token.mintAddress}`);
      onClose();
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert 
        onClose={onClose} 
        severity={severity} 
        sx={{ width: '100%' }}
        action={
          token ? (
            <Button color="inherit" size="small" onClick={handleViewToken}>
              查看详情
            </Button>
          ) : null
        }
      >
        <Box>
          <Typography variant="body1">{message}</Typography>
          {token && (
            <Typography variant="caption" display="block">
              {token.name} ({token.symbol})
            </Typography>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default NotificationBar; 