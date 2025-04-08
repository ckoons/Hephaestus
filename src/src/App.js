import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';
import MainLayout from './components/layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ComponentView from './pages/ComponentView';
import SettingsPage from './pages/SettingsPage';
import BudgetPage from './pages/BudgetPage';
import { connectWebSocket } from './services/websocketService';
import { setComponents } from './store/slices/componentsSlice';

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const connectionStatus = useSelector(state => state.websocket.status);

  useEffect(() => {
    // Connect to WebSocket server
    const socket = connectWebSocket();

    // Listen for component list updates
    socket.on('component_list', (data) => {
      dispatch(setComponents(data));
    });

    return () => {
      // Disconnect WebSocket when component unmounts
      socket.disconnect();
    };
  }, [dispatch]);

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/component/:id" element={<ComponentView />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/budget" element={<BudgetPage />} />
        </Routes>
      </MainLayout>
    </Box>
  );
}

export default App;