import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  Avatar,
  LinearProgress,
} from '@mui/material';

import { getComponentIcon, getComponentColor, formatComponentStatus, getStatusSeverity } from '../../utils/componentUtils';

const ComponentCard = ({ component }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (component.status !== 'OFFLINE') {
      navigate(`/component/${component.id}`);
    }
  };
  
  // Get the color for the component
  const componentColor = getComponentColor(component.name);
  
  // Format the status
  const formattedStatus = formatComponentStatus(component.status);
  
  // Get status severity for styling
  const statusSeverity = getStatusSeverity(component.status);
  
  return (
    <Card 
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `4px solid ${componentColor}`,
        borderRadius: 2,
        opacity: component.status === 'OFFLINE' ? 0.6 : 1,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, opacity 0.3s ease',
        '&:hover': {
          transform: component.status !== 'OFFLINE' ? 'translateY(-4px)' : 'none',
          boxShadow: component.status !== 'OFFLINE' ? '0 8px 24px rgba(0, 0, 0, 0.2)' : 2,
          opacity: component.status === 'OFFLINE' ? 0.75 : 1,
        },
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <CardActionArea 
        onClick={handleClick}
        disabled={component.status === 'OFFLINE'}
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}
      >
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Component header with icon and name */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(0,0,0,0.1)',
                color: componentColor,
                mr: 1.5,
                width: 44,
                height: 44,
                border: `2px solid ${componentColor}`,
                boxShadow: `0 0 8px ${componentColor}40`,
              }}
            >
              {getComponentIcon(component.name) || component.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {component.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getComponentSpecialty(component.name)}
              </Typography>
            </Box>
          </Box>
          
          {/* Component description */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
            {component.description || `${component.name} component for Tekton platform`}
          </Typography>
          
          {/* Component status */}
          <Box sx={{ mt: 'auto' }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 0.5,
              backgroundColor: `${statusSeverity}.dark`,
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              mx: -1,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: `${statusSeverity}.main`,
                    mr: 1,
                    boxShadow: `0 0 6px ${statusSeverity === 'success' ? '#4caf50' : 
                               statusSeverity === 'warning' ? '#ff9800' : 
                               statusSeverity === 'error' ? '#f44336' : '#2196f3'}`
                  }}
                />
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
                  {formattedStatus}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'white' }}>
                {component.version || '1.0.0'}
              </Typography>
            </Box>
            
            {/* Progress bar for initializing state */}
            {component.status === 'INITIALIZING' && (
              <LinearProgress 
                color="warning" 
                sx={{ 
                  height: 4, 
                  borderRadius: 2,
                  mt: 1,
                  background: 'rgba(255, 152, 0, 0.2)' 
                }} 
              />
            )}
          </Box>
          
          {/* Background subtle hexagon pattern */}
          <Box 
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 80,
              height: 80,
              opacity: 0.04,
              backgroundImage: `url('/images/hexagon.png')`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default ComponentCard;