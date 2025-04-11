import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * A color preset button component that displays a color swatch with a label and hex code
 */
const ColorPresetButton = ({ color, label, onClick, selected }) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: 80,
        height: 80,
        backgroundColor: color,
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 2,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        transition: 'all 0.2s',
        position: 'relative',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: 3,
        },
      }}
    >
      {selected && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 'bold',
          }}
        >
          ✓
        </Box>
      )}
      <Typography
        variant="caption"
        sx={{
          color: 'white',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
          fontWeight: 'medium',
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          mt: 0.5,
          color: 'rgba(255,255,255,0.7)',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        }}
      >
        {color}
      </Typography>
    </Box>
  );
};

export default ColorPresetButton;