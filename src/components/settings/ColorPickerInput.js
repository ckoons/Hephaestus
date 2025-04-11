import React, { useState } from 'react';
import { Box, TextField, Typography, Popover, Paper } from '@mui/material';

/**
 * A color picker input component with a text field and color swatch
 */
const ColorPickerInput = ({ label, value, onChange, fullWidth = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [inputValue, setInputValue] = useState(value);

  const handleColorClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleInputChange = (e) => {
    let newValue = e.target.value;
    
    // Ensure the value starts with a hash
    if (!newValue.startsWith('#') && newValue.length > 0) {
      newValue = `#${newValue}`;
    }
    
    setInputValue(newValue);
    
    // Only update if it's a valid hex color
    if (/^#([0-9A-F]{3}){1,2}$/i.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorPickerChange = (e) => {
    const newColor = e.target.value;
    setInputValue(newColor);
    onChange(newColor);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'color-popover' : undefined;

  return (
    <Box sx={{ mb: 2, width: fullWidth ? '100%' : 'auto' }}>
      <Typography variant="body2" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: value,
            border: '1px solid',
            borderColor: 'divider',
            mr: 1,
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
          onClick={handleColorClick}
        />
        <TextField
          size="small"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={() => {
            // Reset to the current value if invalid
            if (!/^#([0-9A-F]{3}){1,2}$/i.test(inputValue)) {
              setInputValue(value);
            }
          }}
          InputProps={{
            startAdornment: <Box component="span" sx={{ mr: 0.5 }}>#</Box>,
          }}
          sx={{
            '& input': {
              fontFamily: 'monospace',
              paddingLeft: 0,
            },
            '& .MuiInputBase-root': {
              paddingLeft: 1,
            },
            width: fullWidth ? '100%' : 120,
          }}
        />
        <input
          type="color"
          value={value}
          onChange={handleColorPickerChange}
          style={{
            marginLeft: 8,
            width: 36,
            height: 36,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            padding: 0,
          }}
        />
      </Box>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Paper sx={{ p: 2 }}>
          <input
            type="color"
            value={value}
            onChange={handleColorPickerChange}
            style={{
              width: 200,
              height: 100,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              padding: 0,
            }}
          />
        </Paper>
      </Popover>
    </Box>
  );
};

export default ColorPickerInput;