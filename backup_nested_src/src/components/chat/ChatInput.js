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
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Optional model selection */}
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="model-select-label">Model</InputLabel>
          <Select
            labelId="model-select-label"
            id="model-select"
            value={modelType}
            onChange={handleModelChange}
            label="Model"
          >
            <MenuItem value="default">Default</MenuItem>
            <MenuItem value="claude-3-opus">Claude 3 Opus</MenuItem>
            <MenuItem value="claude-3-sonnet">Claude 3 Sonnet</MenuItem>
            <MenuItem value="claude-3-haiku">Claude 3 Haiku</MenuItem>
            <MenuItem value="local-llama">Local Llama</MenuItem>
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
                  <CircularProgress size={24} />
                ) : (
                  <>
                    <IconButton
                      color="primary"
                      onClick={toggleRecording}
                      disabled={websocketStatus !== 'connected'}
                      sx={{ color: isRecording ? 'error.main' : 'inherit' }}
                    >
                      <MicIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || websocketStatus !== 'connected'}
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
              borderRadius: 2,
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default ChatInput;