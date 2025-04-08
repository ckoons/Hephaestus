import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryIcon from '@mui/icons-material/Memory';

import ComponentCard from '../components/common/ComponentCard';
import ChatWindow from '../components/chat/ChatWindow';
import { fetchComponents } from '../services/apiService';
import { setComponentsLoading, setComponents, setComponentsError } from '../store/slices/componentsSlice';
import { checkForDeadlocks } from '../services/apiService';

const Dashboard = () => {
  const dispatch = useDispatch();
  const components = useSelector(state => state.components.list);
  const componentsStatus = useSelector(state => state.components.status);
  const componentsError = useSelector(state => state.components.error);
  const websocketStatus = useSelector(state => state.websocket.status);
  
  // Load components on mount
  useEffect(() => {
    if (componentsStatus === 'idle') {
      loadComponents();
    }
  }, []);
  
  const loadComponents = async () => {
    dispatch(setComponentsLoading());
    try {
      const data = await fetchComponents();
      dispatch(setComponents(data));
    } catch (error) {
      dispatch(setComponentsError(error.message));
    }
  };
  
  const handleRefresh = () => {
    loadComponents();
  };
  
  const handleCheckDeadlocks = async () => {
    try {
      await checkForDeadlocks();
    } catch (error) {
      console.error('Error checking for deadlocks:', error);
    }
  };
  
  // Get active component count
  const activeComponentCount = components.filter(
    c => c.status === 'READY' || c.status === 'RUNNING'
  ).length;
  
  // Calculate overall system health percentage
  const systemHealth = components.length > 0
    ? Math.round((activeComponentCount / components.length) * 100)
    : 0;
  
  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Dashboard header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box className="sidebar-logo-container" sx={{ width: '400px' }}>
          <Box>
            <Typography className="sidebar-logo-text" variant="h4" component="h1">
              TEKTON
            </Typography>
            <Typography className="sidebar-platform-text" variant="subtitle2">
              Multi-AI Engineering Platform
            </Typography>
          </Box>
          <img
            src="/images/hexagon.png"
            alt="Tekton"
            className="hexagon-logo"
            width={48}
            height={48}
          />
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<MemoryIcon />}
            onClick={handleCheckDeadlocks}
            disabled={websocketStatus !== 'connected'}
            sx={{
              background: 'linear-gradient(45deg, #3a0ca3 30%, #4361ee 90%)',
              boxShadow: '0 3px 5px 2px rgba(67, 97, 238, .3)',
            }}
          >
            Check Deadlocks
          </Button>
        </Box>
      </Box>
      
      {/* System status cards */}
      <Grid container spacing={3} mb={4}>
        {/* System Health */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 2, 
            position: 'relative', 
            overflow: 'hidden',
            background: `linear-gradient(160deg, 
              ${systemHealth > 70 ? 'rgba(16, 185, 129, 0.1)' : 
                systemHealth > 40 ? 'rgba(245, 158, 11, 0.1)' : 
                'rgba(239, 68, 68, 0.1)'} 0%, 
              rgba(0, 0, 0, 0) 70%)`,
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                System Health
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex', mr: 3 }}>
                  <CircularProgress
                    variant="determinate"
                    value={systemHealth}
                    color={systemHealth > 70 ? 'success' : systemHealth > 40 ? 'warning' : 'error'}
                    size={90}
                    thickness={5}
                    sx={{
                      boxShadow: `0 0 10px ${systemHealth > 70 ? 'rgba(16, 185, 129, 0.3)' : 
                                            systemHealth > 40 ? 'rgba(245, 158, 11, 0.3)' : 
                                            'rgba(239, 68, 68, 0.3)'}`,
                      borderRadius: '50%',
                    }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700 }}>
                      {systemHealth}%
                    </Typography>
                    <Typography variant="caption" component="div" color="text.secondary">
                      health
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                    {activeComponentCount} of {components.length} components active
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: systemHealth > 70 ? 'success.main' : 
                             systemHealth > 40 ? 'warning.main' : 'error.main',
                      fontWeight: 500,
                      py: 0.5,
                      px: 1,
                      borderRadius: 1,
                      display: 'inline-block',
                      bgcolor: systemHealth > 70 ? 'rgba(16, 185, 129, 0.1)' : 
                              systemHealth > 40 ? 'rgba(245, 158, 11, 0.1)' : 
                              'rgba(239, 68, 68, 0.1)',
                    }}
                  >
                    {systemHealth > 70 ? '● System healthy' : systemHealth > 40 ? '● Minor issues' : '● Critical issues'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <Box 
              sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                opacity: 0.07,
                backgroundImage: `url('/images/hexagon.png')`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                zIndex: 0,
              }}
            />
          </Card>
        </Grid>
        
        {/* Connection Status */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 2, 
            position: 'relative', 
            overflow: 'hidden',
            background: `linear-gradient(160deg, 
              ${websocketStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 
                websocketStatus === 'connecting' ? 'rgba(245, 158, 11, 0.1)' : 
                'rgba(239, 68, 68, 0.1)'} 0%, 
              rgba(0, 0, 0, 0) 70%)`,
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Connection Status
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
                mb: 2
              }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: 
                      websocketStatus === 'connected' ? 'success.main' : 
                      websocketStatus === 'connecting' ? 'warning.main' : 'error.main',
                    mr: 2,
                    boxShadow: `0 0 10px ${
                      websocketStatus === 'connected' ? 'rgba(16, 185, 129, 0.5)' : 
                      websocketStatus === 'connecting' ? 'rgba(245, 158, 11, 0.5)' : 
                      'rgba(239, 68, 68, 0.5)'
                    }`,
                    animation: websocketStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none',
                    '@keyframes pulse': {
                      '0%': {
                        boxShadow: `0 0 0 0 ${
                          websocketStatus === 'connecting' ? 'rgba(245, 158, 11, 0.7)' : 'rgba(0,0,0,0)'
                        }`,
                      },
                      '70%': {
                        boxShadow: `0 0 0 10px ${
                          websocketStatus === 'connecting' ? 'rgba(245, 158, 11, 0)' : 'rgba(0,0,0,0)'
                        }`,
                      },
                      '100%': {
                        boxShadow: `0 0 0 0 ${
                          websocketStatus === 'connecting' ? 'rgba(245, 158, 11, 0)' : 'rgba(0,0,0,0)'
                        }`,
                      },
                    },
                  }}
                />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {websocketStatus === 'connected' ? 'Connected' : 
                    websocketStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {websocketStatus === 'connected' 
                      ? 'WebSocket connection established'
                      : websocketStatus === 'connecting'
                      ? 'Establishing WebSocket connection...'
                      : 'WebSocket connection lost'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  Last update: {new Date().toLocaleTimeString()}
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined"
                  disabled={websocketStatus === 'connected'}
                  sx={{ 
                    borderRadius: 4,
                    textTransform: 'none',
                    px: 2,
                    py: 0.5
                  }}
                >
                  Reconnect
                </Button>
              </Box>
            </CardContent>
            <Box 
              sx={{
                position: 'absolute',
                bottom: -30,
                right: -30,
                width: 130,
                height: 130,
                opacity: 0.05,
                backgroundImage: `url('/images/hexagon.png')`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                zIndex: 0,
              }}
            />
          </Card>
        </Grid>
        
        {/* Activity Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            borderRadius: 2, 
            position: 'relative', 
            overflow: 'hidden',
            background: 'linear-gradient(160deg, rgba(59, 130, 246, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Activity Summary
              </Typography>
              <Box sx={{ 
                p: 2, 
                borderRadius: 2, 
                bgcolor: 'background.paper',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2">
                    System started at {new Date().toLocaleTimeString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'info.main',
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2">
                    Components loaded: {components.length}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      mr: 1,
                    }}
                  />
                  <Typography variant="body2">
                    Active session: 0:{Math.floor(Math.random() * 59)}m
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                sx={{ mt: 2 }}
                endIcon={<RefreshIcon fontSize="small" />}
              >
                View All Activity
              </Button>
            </CardContent>
            <Box 
              sx={{
                position: 'absolute',
                top: -20,
                left: -20,
                width: 120,
                height: 120,
                opacity: 0.06,
                backgroundImage: `url('/images/hexagon.png')`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                zIndex: 0,
              }}
            />
          </Card>
        </Grid>
      </Grid>
      
      {/* Error state */}
      {componentsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading components: {componentsError}
        </Alert>
      )}
      
      {/* Loading state */}
      {componentsStatus === 'loading' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Components grid */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2 
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Components
          <Box 
            component="span" 
            sx={{ 
              ml: 1,
              fontSize: '0.9rem',
              fontWeight: 400,
              color: 'text.secondary',
              verticalAlign: 'middle'
            }}
          >
            ({components.length})
          </Box>
        </Typography>
        <Box>
          <Button
            size="small"
            sx={{ 
              mr: 1,
              textTransform: 'none',
              borderRadius: 4,
              px: 2,
            }}
          >
            Filter
          </Button>
          <Button
            size="small"
            variant="outlined"
            sx={{ 
              textTransform: 'none',
              borderRadius: 4,
              px: 2,
            }}
          >
            View Details
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ 
        bgcolor: 'rgba(30, 30, 30, 0.4)', 
        borderRadius: 3,
        p: 2,
        mb: 4,
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
      }}>
        <Grid container spacing={2}>
          {components.map((component) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={component.id}>
              <ComponentCard component={component} />
            </Grid>
          ))}
        </Grid>
      </Box>
      
      {/* Chat area */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2 
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Recent Conversations
        </Typography>
        <Box>
          <Button
            size="small"
            color="primary"
            sx={{ 
              textTransform: 'none',
              borderRadius: 4,
              px: 2,
            }}
          >
            Clear History
          </Button>
        </Box>
      </Box>
      
      <Paper 
        elevation={3} 
        sx={{ 
          height: 400, 
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          background: 'linear-gradient(to bottom, rgba(10, 10, 10, 0.3) 0%, rgba(0, 0, 0, 0) 100%)',
        }}
      >
        <ChatWindow />
      </Paper>
    </Box>
  );
};

export default Dashboard;