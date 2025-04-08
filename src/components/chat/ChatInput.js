import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  InputAdornment,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';

import { addMessage, setTyping } from '../../store/slices/chatSlice';
import { sendMessage } from '../../services/websocketService';

const ChatInput = () => {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState('');
  const [modelType, setModelType] = useState('default');
  const [isRecording, setIsRecording] = useState(false);
  
  const isTyping = useSelector((state) => state.chat.isTyping);
  const activeComponentId = useSelector((state) => state.components.activeComponentId);
  const websocketStatus = useSelector((state) => state.websocket.status);
  const components = useSelector((state) => state.components.list);
  
  // Find active component
  const activeComponent = activeComponentId 
    ? components.find(c => c.id === activeComponentId) 
    : null;
  
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    // Create message object
    const message = {
      id: Date.now().toString(),
      content: inputValue,
      timestamp: new Date().toISOString(),
      sender: 'user',
      componentId: activeComponentId || null,
      metadata: {
        modelType,
      },
    };
    
    // Add to local state
    dispatch(addMessage(message));
    
    // Send via websocket
    if (websocketStatus === 'connected') {
      sendMessage(message);
      
      // Set AI as typing
      dispatch(setTyping(true));
    }
    
    // Clear input
    setInputValue('');
  };
  
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleModelChange = (e) => {
    setModelType(e.target.value);
  };
  
  const toggleRecording = () => {
    // This would be implemented with a proper speech recognition API
    setIsRecording(!isRecording);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(to bottom, rgba(30, 30, 30, 0.8) 0%, rgba(18, 18, 18, 0.8) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Optional model selection */}
        <FormControl variant="outlined" size="small" sx={{ 
          minWidth: 140,
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            bgcolor: 'rgba(0, 0, 0, 0.2)',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.3)',
            },
          }
        }}>
          <InputLabel id="model-select-label">Model</InputLabel>
          <Select
            labelId="model-select-label"
            id="model-select"
            value={modelType}
            onChange={handleModelChange}
            label="Model"
          >
            <MenuItem value="default">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    bgcolor: 'primary.main',
                    mr: 1,
                    boxShadow: '0 0 4px #3b82f6'
                  }} 
                />
                Default
              </Box>
            </MenuItem>
            <MenuItem value="claude-3-opus">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    bgcolor: '#8b5cf6',
                    mr: 1,
                    boxShadow: '0 0 4px #8b5cf6'
                  }} 
                />
                Claude 3 Opus
              </Box>
            </MenuItem>
            <MenuItem value="claude-3-sonnet">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    bgcolor: '#6366f1',
                    mr: 1,
                    boxShadow: '0 0 4px #6366f1'
                  }} 
                />
                Claude 3 Sonnet
              </Box>
            </MenuItem>
            <MenuItem value="claude-3-haiku">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    bgcolor: '#4f46e5',
                    mr: 1,
                    boxShadow: '0 0 4px #4f46e5'
                  }} 
                />
                Claude 3 Haiku
              </Box>
            </MenuItem>
            <MenuItem value="local-llama">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box 
                  sx={{ 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    bgcolor: '#10b981',
                    mr: 1,
                    boxShadow: '0 0 4px #10b981'
                  }} 
                />
                Local Llama
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
        
        {/* Main input field */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder={`Message ${activeComponent ? activeComponent.name : 'Tekton'}...`}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isTyping || websocketStatus !== 'connected'}
          multiline
          maxRows={4}
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {isTyping ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1, fontStyle: 'italic' }}>
                      Thinking...
                    </Typography>
                    <CircularProgress 
                      size={22} 
                      thickness={5}
                      sx={{ 
                        color: 'primary.main',
                        opacity: 0.8,
                      }} 
                    />
                  </Box>
                ) : (
                  <>
                    <IconButton
                      color="primary"
                      onClick={toggleRecording}
                      disabled={websocketStatus !== 'connected'}
                      sx={{ 
                        color: isRecording ? 'error.main' : 'inherit',
                        backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        '&:hover': {
                          backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        },
                      }}
                    >
                      <MicIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || websocketStatus !== 'connected'}
                      sx={{ 
                        backgroundColor: inputValue.trim() && websocketStatus === 'connected' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        '&:hover': {
                          backgroundColor: inputValue.trim() && websocketStatus === 'connected' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        },
                      }}
                    >
                      <SendIcon />
                    </IconButton>
                  </>
                )}
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(4px)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)',
              },
            },
            '& .MuiInputBase-input': {
              fontFamily: '"Inter", sans-serif',
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default ChatInput;