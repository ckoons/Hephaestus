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
        opacity: component.status === 'OFFLINE' ? 0.7 : 1,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: component.status !== 'OFFLINE' ? 'translateY(-4px)' : 'none',
          boxShadow: component.status !== 'OFFLINE' ? 4 : 2,
        },
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
                bgcolor: 'action.hover',
                color: componentColor,
                mr: 1.5,
              }}
            >
              {getComponentIcon(component.name)}
            </Avatar>
            <Typography variant="h6" component="h2">
              {component.name}
            </Typography>
          </Box>
          
          {/* Component description */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
            {component.description || `${component.name} component for Tekton platform`}
          </Typography>
          
          {/* Component status */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={formattedStatus}
                size="small"
                color={statusSeverity}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
            
            {/* Progress bar for initializing state */}
            {component.status === 'INITIALIZING' && (
              <LinearProgress color="warning" sx={{ height: 4, borderRadius: 2 }} />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default ComponentCard;