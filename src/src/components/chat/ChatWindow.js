import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  Paper,
} from '@mui/material';

import ChatMessage from './ChatMessage';

const ChatWindow = ({ componentId }) => {
  const messagesEndRef = useRef(null);
  const messages = useSelector(state => state.chat.messages);
  const isTyping = useSelector(state => state.chat.isTyping);
  
  // Filter messages for the current component if componentId is provided
  const filteredMessages = componentId 
    ? messages.filter(msg => msg.componentId === componentId || msg.componentId === null)
    : messages;
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredMessages, isTyping]);
  
  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {/* Chat messages */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {filteredMessages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              opacity: 0.7,
            }}
          >
            <Typography variant="h6" color="text.secondary" align="center">
              No messages yet
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Start a conversation by typing in the box below
            </Typography>
          </Box>
        ) : (
          filteredMessages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        
        {/* AI typing indicator */}
        {isTyping && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              mb: 1,
            }}
          >
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Tekton is thinking...
            </Typography>
          </Box>
        )}
        
        {/* Empty div for scrolling to bottom */}
        <div ref={messagesEndRef} />
      </Box>
    </Paper>
  );
};

export default ChatWindow;