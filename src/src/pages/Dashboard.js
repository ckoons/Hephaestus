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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
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
          >
            Check Deadlocks
          </Button>
        </Box>
      </Box>
      
      {/* System status cards */}
      <Grid container spacing={3} mb={3}>
        {/* System Health */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex', mr: 2 }}>
                  <CircularProgress
                    variant="determinate"
                    value={systemHealth}
                    color={systemHealth > 70 ? 'success' : systemHealth > 40 ? 'warning' : 'error'}
                    size={80}
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
                    }}
                  >
                    <Typography variant="h6" component="div">
                      {systemHealth}%
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body1">
                    {activeComponentCount} of {components.length} components active
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {systemHealth > 70 ? 'System healthy' : systemHealth > 40 ? 'Minor issues' : 'Critical issues'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Connection Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Connection Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: 
                      websocketStatus === 'connected' ? 'success.main' : 
                      websocketStatus === 'connecting' ? 'warning.main' : 'error.main',
                    mr: 1.5,
                  }}
                />
                <Typography variant="body1">
                  {websocketStatus === 'connected' ? 'Connected' : 
                   websocketStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {websocketStatus === 'connected' 
                  ? 'WebSocket connection established'
                  : websocketStatus === 'connecting'
                  ? 'Establishing WebSocket connection...'
                  : 'WebSocket connection lost'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Activity Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activity Summary
              </Typography>
              <Typography variant="body1">
                Recent activity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                System started at {new Date().toLocaleTimeString()}
              </Typography>
            </CardContent>
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
      <Typography variant="h5" gutterBottom>
        Components
      </Typography>
      <Grid container spacing={3} mb={3}>
        {components.map((component) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={component.id}>
            <ComponentCard component={component} />
          </Grid>
        ))}
      </Grid>
      
      {/* Chat area */}
      <Typography variant="h5" gutterBottom>
        Recent Conversations
      </Typography>
      <Box sx={{ height: 400 }}>
        <ChatWindow />
      </Box>
    </Box>
  );
};

export default Dashboard;