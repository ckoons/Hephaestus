import React from 'react';
import { useSelector } from 'react-redux';
import {
  Chip,
  Tooltip,
  Badge,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SyncIcon from '@mui/icons-material/Sync';

const ConnectionStatus = () => {
  const websocketStatus = useSelector(state => state.websocket.status);
  const components = useSelector(state => state.components.list);
  
  // Count active components
  const activeComponentCount = components.filter(
    c => c.status === 'READY' || c.status === 'RUNNING'
  ).length;
  
  // Count total components
  const totalComponentCount = components.length;
  
  // Get status data based on connection state
  const getStatusData = () => {
    switch (websocketStatus) {
      case 'connected':
        return {
          label: 'Connected',
          color: 'success',
          icon: <CheckCircleIcon />,
          tooltip: `Connected to server with ${activeComponentCount}/${totalComponentCount} components active`,
        };
      case 'connecting':
        return {
          label: 'Connecting',
          color: 'warning',
          icon: <SyncIcon className="rotating-icon" />,
          tooltip: 'Connecting to server...',
        };
      case 'disconnected':
        return {
          label: 'Disconnected',
          color: 'error',
          icon: <ErrorIcon />,
          tooltip: 'Disconnected from server',
        };
      default:
        return {
          label: 'Unknown',
          color: 'default',
          icon: <ErrorIcon />,
          tooltip: 'Connection status unknown',
        };
    }
  };
  
  const statusData = getStatusData();
  
  return (
    <Tooltip title={statusData.tooltip}>
      <Badge 
        badgeContent={activeComponentCount} 
        color="primary"
        sx={{ 
          '& .MuiBadge-badge': {
            right: -3,
            top: 3,
          } 
        }}
      >
        <Chip
          icon={statusData.icon}
          label={statusData.label}
          color={statusData.color}
          size="small"
          sx={{
            '.rotating-icon': {
              animation: 'spin 2s linear infinite',
              '@keyframes spin': {
                '0%': {
                  transform: 'rotate(0deg)',
                },
                '100%': {
                  transform: 'rotate(360deg)',
                },
              },
            },
          }}
        />
      </Badge>
    </Tooltip>
  );
};

export default ConnectionStatus;