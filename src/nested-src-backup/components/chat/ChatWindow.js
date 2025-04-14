import React from 'react';
import { Box } from '@mui/material';
import ChatMessage from './ChatMessage';

const ChatWindow = ({ messages, isTyping }) => {
  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </Box>
  );
};

export default ChatWindow;