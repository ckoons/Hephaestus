import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ChatMessage = ({ message }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography>{message.content}</Typography>
      </Paper>
    </Box>
  );
};

export default ChatMessage;