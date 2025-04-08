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
          p: 3, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: `1px solid ${componentColor}`,
          borderRadius: 0,
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(90deg, 
            rgba(0,0,0,0) 0%, 
            ${statusSeverity === 'success' ? 'rgba(16, 185, 129, 0.05)' : 
              statusSeverity === 'warning' ? 'rgba(245, 158, 11, 0.05)' : 
              statusSeverity === 'error' ? 'rgba(239, 68, 68, 0.05)' : 
              'rgba(59, 130, 246, 0.05)'} 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'rgba(0,0,0,0.1)',
              color: componentColor,
              border: `2px solid ${componentColor}`,
              boxShadow: `0 0 10px ${componentColor}40`,
              mr: 3,
            }}
          >
            {getComponentIcon(component.name) || component.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>{component.name}</Typography>
              <Chip
                label={getComponentSpecialty(component.name)}
                size="small"
                sx={{ 
                  ml: 2,
                  bgcolor: `${componentColor}20`,
                  color: componentColor,
                  fontWeight: 500,
                }}
              />
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px' }}>
              {component.description || `${component.name} component for Tekton platform`}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: `${statusSeverity}.dark`,
              color: 'white',
              py: 0.75,
              px: 2,
              borderRadius: 6,
              mr: 2,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: `${statusSeverity}.light`,
                mr: 1,
                boxShadow: `0 0 6px ${statusSeverity === 'success' ? '#4caf50' : 
                          statusSeverity === 'warning' ? '#ff9800' : 
                          statusSeverity === 'error' ? '#f44336' : '#2196f3'}`
              }}
            />
            <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
              {formattedStatus}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ 
              borderRadius: 6,
              textTransform: 'none',
              borderColor: componentColor,
              color: componentColor,
              '&:hover': {
                borderColor: componentColor,
                bgcolor: `${componentColor}10`,
              }
            }}
          >
            Refresh
          </Button>
        </Box>

        {/* Background subtle hexagon pattern */}
        <Box 
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            opacity: 0.04,
            backgroundImage: `url('/images/hexagon.png')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      </Paper>
      
      {/* Component tabs */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        px: 2,
        pt: 1
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="component tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.2s ease',
              mx: 0.5,
              opacity: 0.7,
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                opacity: 0.9,
              },
            },
            '& .MuiTab-root.Mui-selected': {
              color: componentColor,
              opacity: 1,
              fontWeight: 600,
              bgcolor: 'rgba(255, 255, 255, 0.03)',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: componentColor,
              height: 3,
              borderRadius: 1.5,
            },
            '& .MuiTabs-scrollButtons': {
              color: 'text.secondary',
            },
          }}
        >
          <Tab 
            icon={<CodeIcon />} 
            iconPosition="start" 
            label="Console" 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            icon={<StorageIcon />} 
            iconPosition="start" 
            label="Data" 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            icon={<AccountTreeIcon />} 
            iconPosition="start" 
            label="Visualization" 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            icon={<SettingsIcon />} 
            iconPosition="start" 
            label="Settings" 
            sx={{ textTransform: 'none' }}
          />
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