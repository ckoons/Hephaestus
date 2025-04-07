import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import ChatWindow from '../components/chat/ChatWindow';
import { setActiveComponent } from '../store/slices/componentsSlice';
import { fetchComponentDetails } from '../services/apiService';
import { getComponentIcon, getComponentColor, formatComponentStatus, getStatusSeverity } from '../utils/componentUtils';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`component-tabpanel-${index}`}
      aria-labelledby={`component-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ComponentView = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [tabValue, setTabValue] = useState(0);
  const [componentDetails, setComponentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get component from store
  const components = useSelector(state => state.components.list);
  const component = components.find(c => c.id === id);
  
  // Set active component in store
  useEffect(() => {
    if (id) {
      dispatch(setActiveComponent(id));
      loadComponentDetails();
    }
    
    return () => {
      // Clear active component when unmounting
      dispatch(setActiveComponent(null));
    };
  }, [id, dispatch]);
  
  const loadComponentDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const details = await fetchComponentDetails(id);
      setComponentDetails(details);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    loadComponentDetails();
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Get component color
  const componentColor = component ? getComponentColor(component.name) : '#3b82f6';
  
  // Format component status
  const formattedStatus = component ? formatComponentStatus(component.status) : 'Unknown';
  
  // Get status severity
  const statusSeverity = component ? getStatusSeverity(component.status) : 'info';
  
  // Handle loading state
  if (!component) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Component header */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: `1px solid ${componentColor}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              color: componentColor,
              mr: 2,
            }}
          >
            {getComponentIcon(component.name)}
          </Box>
          <Box>
            <Typography variant="h5">{component.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {component.description || `${component.name} component for Tekton platform`}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Chip
            label={formattedStatus}
            color={statusSeverity}
            size="small"
            sx={{ mr: 2 }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Box>
      </Paper>
      
      {/* Component tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="component tabs"
          sx={{
            '& .MuiTab-root.Mui-selected': {
              color: componentColor,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: componentColor,
            },
          }}
        >
          <Tab icon={<CodeIcon />} iconPosition="start" label="Console" />
          <Tab icon={<StorageIcon />} iconPosition="start" label="Data" />
          <Tab icon={<AccountTreeIcon />} iconPosition="start" label="Visualization" />
          <Tab icon={<SettingsIcon />} iconPosition="start" label="Settings" />
        </Tabs>
      </Box>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          Error loading component details: {error}
        </Alert>
      )}
      
      {/* Tab panels */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {/* Console tab - Chat interface */}
        <TabPanel value={tabValue} index={0}>
          <ChatWindow componentId={id} />
        </TabPanel>
        
        {/* Data tab - Component data browser */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">
              Data browser for {component.name} will be displayed here
            </Typography>
          </Box>
        </TabPanel>
        
        {/* Visualization tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">
              Visualization tools for {component.name} will be displayed here
            </Typography>
          </Box>
        </TabPanel>
        
        {/* Settings tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">
              Settings for {component.name} will be displayed here
            </Typography>
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default ComponentView;