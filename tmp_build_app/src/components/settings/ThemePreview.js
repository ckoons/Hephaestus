import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  AppBar, 
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider
} from '@mui/material';

/**
 * A component that shows a preview of the theme with current color settings
 */
const ThemePreview = ({ colors }) => {
  const {
    headerColor,
    footerColor,
    backgroundColor,
    sidebarColor,
    paperColor,
    textPrimaryColor,
    textSecondaryColor
  } = colors;

  return (
    <Paper 
      sx={{ 
        p: 0,
        borderRadius: 2,
        overflow: 'hidden',
        height: 300,
        width: '100%',
      }}
    >
      <Typography variant="subtitle1" sx={{ p: 2, pb: 1 }}>
        Theme Preview
      </Typography>
      
      {/* Miniature UI Preview */}
      <Box 
        sx={{ 
          display: 'flex',
          height: 260,
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Sidebar */}
        <Box 
          sx={{ 
            width: 80,
            height: '100%',
            backgroundColor: sidebarColor,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ p: 1, textAlign: 'center', fontWeight: 'bold', color: textPrimaryColor, fontSize: '0.7rem' }}>
            Sidebar
          </Box>
          <List dense sx={{ p: 0 }}>
            {['Item 1', 'Item 2', 'Item 3'].map((text, index) => (
              <ListItem key={text} disablePadding>
                <ListItemButton sx={{ minHeight: 28, px: 1 }}>
                  <ListItemText 
                    primary={text} 
                    sx={{ 
                      '& .MuiTypography-root': { 
                        fontSize: '0.7rem',
                        color: index === 0 ? 'primary.main' : textSecondaryColor
                      } 
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        
        {/* Main content */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <AppBar position="static" sx={{ backgroundColor: headerColor, boxShadow: 0 }}>
            <Toolbar variant="dense" sx={{ minHeight: 40 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ color: textPrimaryColor, fontSize: '0.75rem' }}
              >
                Header
              </Typography>
            </Toolbar>
          </AppBar>
          
          {/* Content area */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              backgroundColor: backgroundColor,
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                color: textPrimaryColor,
                fontSize: '0.75rem',
                fontWeight: 'medium'
              }}
            >
              Main Content Area
            </Typography>
            
            <Paper 
              sx={{ 
                p: 1.5, 
                backgroundColor: paperColor,
                width: '100%',
                flexGrow: 1,
              }}
            >
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: textPrimaryColor,
                  fontSize: '0.75rem',
                  mb: 0.5
                }}
              >
                Card Title
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: textSecondaryColor,
                  fontSize: '0.7rem'
                }}
              >
                This is card content with secondary text color. 
                The background uses the paper color setting.
              </Typography>
            </Paper>
          </Box>
          
          {/* Footer */}
          <Box 
            sx={{ 
              backgroundColor: footerColor,
              p: 1,
              borderTop: '1px solid',
              borderColor: 'divider',
              textAlign: 'center'
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: textSecondaryColor,
                fontSize: '0.7rem'
              }}
            >
              Footer
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default ThemePreview;