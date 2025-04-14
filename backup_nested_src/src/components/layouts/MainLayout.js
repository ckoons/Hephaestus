import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getComponentSpecialty } from '../../utils/componentUtils';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  useMediaQuery,
  IconButton,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

import Sidebar from './Sidebar';
import ChatInput from '../chat/ChatInput';
import ConnectionStatus from '../common/ConnectionStatus';

// Define sidebar width
const SIDEBAR_WIDTH = 250;

const MainLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get active component from Redux store
  const components = useSelector((state) => state.components.list);
  const activeComponentId = useSelector((state) => state.components.activeComponentId);
  const showGreekNames = useSelector((state) => state.settings.showGreekNames);
  
  // Find active component
  const activeComponent = activeComponentId 
    ? components.find(c => c.id === activeComponentId) 
    : null;
  
  // Get page title based on route
  const getPageTitle = () => {
    if (location.pathname === '/') return 'Tekton - Projects';
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname === '/budget') return 'Budget Controls';
    if (activeComponent) {
      const specialty = getComponentSpecialty(activeComponent.name);
      return showGreekNames 
        ? `${activeComponent.name} - ${specialty}`
        : specialty;
    }
    return 'Tekton';
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar (mobile only) */}
      <AppBar
        position="fixed"
        sx={{
          display: { xs: 'block', md: 'none' },
          width: '100%',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {getPageTitle()}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <ConnectionStatus />
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.background.sidebar,
          },
        }}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        <Sidebar onItemClick={isMobile ? handleDrawerToggle : undefined} />
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          pt: { xs: 8, md: 0 }, // Add padding on mobile for the app bar
        }}
      >
        {/* Desktop header */}
        <AppBar 
          position="static" 
          color="default" 
          elevation={0}
          sx={{ 
            display: { xs: 'none', md: 'block' },
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar>
            <Typography variant="h6" component="div">
              {getPageTitle()}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <ConnectionStatus />
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {children}
        </Box>

        {/* Chat input */}
        <Divider />
        <Box sx={{ p: 2 }}>
          <ChatInput />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;