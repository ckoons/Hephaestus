import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Icon,
  Tooltip,
  Avatar,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { styled } from '@mui/material/styles';

import { setActiveComponent } from '../../store/slices/componentsSlice';
import { getComponentIcon, getComponentSpecialty } from '../../utils/componentUtils';

// Custom components for consistent image paths
const TektonHexagon = styled('img')({
  width: 36,
  height: 36,
});

const Sidebar = ({ onItemClick }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get components from Redux store
  const components = useSelector((state) => state.components.list);
  const activeComponentId = useSelector((state) => state.components.activeComponentId);
  const showGreekNames = useSelector((state) => state.settings.showGreekNames);
  
  const handleComponentClick = (componentId) => {
    dispatch(setActiveComponent(componentId));
    navigate(`/component/${componentId}`);
    
    // Call onItemClick if provided (for mobile sidebar closing)
    if (onItemClick) {
      onItemClick();
    }
  };
  
  const handleNavClick = (path) => {
    navigate(path);
    
    // Call onItemClick if provided (for mobile sidebar closing)
    if (onItemClick) {
      onItemClick();
    }
  };
  
  // Check if a route is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Check if a component is active
  const isComponentActive = (componentId) => {
    return activeComponentId === componentId;
  };
  
  // Get status color for component
  const getStatusColor = (status) => {
    switch (status) {
      case 'READY':
      case 'RUNNING':
        return 'success.main';
      case 'INITIALIZING':
      case 'STOPPING':
        return 'warning.main';
      case 'FAILED':
        return 'error.main';
      default:
        return 'text.disabled';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 2 }}>
      {/* Logo */}
      <Box className="sidebar-logo-container">
        <Box>
          <Typography className="sidebar-logo-text" variant="h5">
            TEKTON
          </Typography>
          <Typography className="sidebar-platform-text" variant="caption">
            Multi-AI Engineering
          </Typography>
        </Box>
        <img
          src="/images/hexagon.png"
          alt="Tekton"
          className="hexagon-logo"
          width={36}
          height={36}
        />
      </Box>
      
      {/* Dashboard */}
      <List component="nav" disablePadding>
        <ListItem disablePadding>
          <ListItemButton 
            selected={isActive('/')}
            onClick={() => handleNavClick('/')}
            sx={{ px: 3 }}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Tekton - Projects" />
          </ListItemButton>
        </ListItem>
      </List>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Components */}
      <Typography variant="overline" sx={{ px: 3, mb: 1, color: 'text.secondary' }}>
        Components
      </Typography>
      
      <List component="nav" disablePadding sx={{ flexGrow: 1, overflow: 'auto' }}>
        {components.map((component) => (
          <ListItem key={component.id} disablePadding>
            <ListItemButton 
              selected={isComponentActive(component.id)}
              onClick={() => handleComponentClick(component.id)}
              disabled={component.status === 'OFFLINE'}
              sx={{ px: 3 }}
            >
              <ListItemIcon>
                {getComponentIcon(component.name)}
              </ListItemIcon>
              <ListItemText 
                primary={
                  showGreekNames 
                    ? `${component.name} - ${getComponentSpecialty(component.name)}` 
                    : getComponentSpecialty(component.name)
                } 
                primaryTypographyProps={{
                  sx: {
                    opacity: component.status === 'OFFLINE' ? 0.5 : 1,
                  }
                }}
              />
              <Box 
                sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: getStatusColor(component.status),
                  ml: 1,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Bottom nav items */}
      <List component="nav" disablePadding>
        <ListItem disablePadding>
          <ListItemButton 
            selected={isActive('/budget')}
            onClick={() => handleNavClick('/budget')}
            sx={{ px: 3 }}
          >
            <ListItemIcon>
              <MonetizationOnIcon />
            </ListItemIcon>
            <ListItemText primary="Budget" />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton 
            selected={isActive('/settings')}
            onClick={() => handleNavClick('/settings')}
            sx={{ px: 3 }}
          >
            <ListItemText primary="Settings" />
            <SettingsIcon fontSize="small" sx={{ ml: 1 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );
};

export default Sidebar;