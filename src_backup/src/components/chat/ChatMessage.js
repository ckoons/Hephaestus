import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  useTheme,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import PersonIcon from '@mui/icons-material/Person';

import { getComponentIcon, getComponentColor } from '../../utils/componentUtils';

// Custom markdown components for code syntax highlighting
const components = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={atomDark}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

const ChatMessage = ({ message }) => {
  const theme = useTheme();
  const components = useSelector(state => state.components.list);
  
  // Get component data if message is from a component
  const component = message.componentId 
    ? components.find(c => c.id === message.componentId) 
    : null;
  
  const isUser = message.sender === 'user';
  
  // Format timestamp
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  // Get component color
  const componentColor = component 
    ? getComponentColor(component.name)
    : theme.palette.primary.main;
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        mb: 2,
        px: 2,
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          bgcolor: isUser ? 'primary.main' : componentColor,
          width: 40,
          height: 40,
          mr: isUser ? 0 : 1.5,
          ml: isUser ? 1.5 : 0,
        }}
      >
        {isUser ? (
          <PersonIcon />
        ) : (
          component ? getComponentIcon(component.name) : null
        )}
      </Avatar>
      
      {/* Message content */}
      <Box sx={{ maxWidth: '70%' }}>
        {/* Header with name and time */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 0.5,
            flexDirection: isUser ? 'row-reverse' : 'row',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {isUser ? 'You' : (component ? component.name : 'Tekton')}
          </Typography>
          
          {message.metadata?.modelType && !isUser && (
            <Chip
              label={message.metadata.modelType}
              size="small"
              sx={{
                ml: isUser ? 0 : 1,
                mr: isUser ? 1 : 0,
                height: 20,
                fontSize: '0.7rem',
              }}
            />
          )}
          
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              ml: isUser ? 0 : 1,
              mr: isUser ? 1 : 0,
            }}
          >
            {formattedTime}
          </Typography>
        </Box>
        
        {/* Message bubble */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: isUser ? 'primary.dark' : theme.palette.background.paper,
            borderColor: isUser ? 'primary.main' : componentColor,
            borderLeft: !isUser ? `4px solid ${componentColor}` : 'none',
            borderRight: isUser ? `4px solid ${theme.palette.primary.main}` : 'none',
          }}
        >
          {message.content.includes('```') ? (
            <ReactMarkdown components={components}>
              {message.content}
            </ReactMarkdown>
          ) : (
            <Typography 
              variant="body1" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: isUser ? '0.95rem' : '1rem'
              }}
            >
              {message.content}
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ChatMessage;