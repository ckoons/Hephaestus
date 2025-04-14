import { io } from 'socket.io-client';
import store from '../store';
import { setStatus, setSocket, setError } from '../store/slices/websocketSlice';
import { addMessage } from '../store/slices/chatSlice';
import { updateComponentStatus } from '../store/slices/componentsSlice';

let socket = null;

export const connectWebSocket = () => {
  const { dispatch } = store;

  // If already connected, return the socket
  if (socket) {
    return socket;
  }

  // Update connection status
  dispatch(setStatus('connecting'));

  // Connect to WebSocket server
  socket = io({
    path: '/ws',
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Save socket in store
  dispatch(setSocket(socket));

  // Handle connection events
  socket.on('connect', () => {
    dispatch(setStatus('connected'));
  });

  socket.on('disconnect', () => {
    dispatch(setStatus('disconnected'));
  });

  socket.on('connect_error', (error) => {
    dispatch(setError(error.message));
    dispatch(setStatus('disconnected'));
  });

  // Handle server messages
  socket.on('component_update', (data) => {
    dispatch(updateComponentStatus({
      componentId: data.id,
      status: data.status
    }));
  });

  socket.on('message', (data) => {
    dispatch(addMessage(data));
  });

  return socket;
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    store.dispatch(setStatus('disconnected'));
    store.dispatch(setSocket(null));
  }
};

export const sendMessage = (message) => {
  if (socket && socket.connected) {
    socket.emit('send_message', message);
    return true;
  }
  return false;
};

export const sendCommand = (componentId, command, data) => {
  if (socket && socket.connected) {
    const requestId = Date.now().toString();
    socket.emit('send_command', {
      type: 'send_command',
      component_id: componentId,
      command,
      data,
      request_id: requestId,
    });
    return requestId;
  }
  return null;
};

export const checkDeadlocks = () => {
  if (socket && socket.connected) {
    const requestId = Date.now().toString();
    socket.emit('check_deadlocks', {
      type: 'check_deadlocks',
      request_id: requestId,
    });
    return requestId;
  }
  return null;
};

export default {
  connectWebSocket,
  disconnectWebSocket,
  sendMessage,
  sendCommand,
  checkDeadlocks,
};