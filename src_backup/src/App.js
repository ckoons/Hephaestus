import React, { useEffect, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, ThemeProvider, CssBaseline } from '@mui/material';
import MainLayout from './components/layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ComponentView from './pages/ComponentView';
import SettingsPage from './pages/SettingsPage';
import BudgetPage from './pages/BudgetPage';
import { connectWebSocket } from './services/websocketService';
import { setComponents } from './store/slices/componentsSlice';
import { createDarkTheme } from './themes/darkTheme';
import { createLightTheme } from './themes/lightTheme';

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const connectionStatus = useSelector(state => state.websocket.status);
  const settings = useSelector(state => state.settings);

  // Create dynamic theme based on user settings
  const theme = useMemo(() => {
    if (settings.theme === 'light') {
      return createLightTheme(settings);
    }
    return createDarkTheme(settings);
  }, [
    settings.theme,
    settings.headerColor,
    settings.footerColor,
    settings.backgroundColor,
    settings.sidebarColor,
    settings.paperColor,
    settings.textPrimaryColor,
    settings.textSecondaryColor,
    settings.componentsThemeColor
  ]);

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

  // Apply component GUI theme by sending a message to component iframes
  useEffect(() => {
    const componentIframes = document.querySelectorAll('iframe[src^="/component"]');
    componentIframes.forEach(iframe => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'TEKTON_THEME_UPDATE',
          theme: settings.theme,
          colors: {
            headerColor: settings.headerColor,
            footerColor: settings.footerColor,
            backgroundColor: settings.backgroundColor,
            componentsThemeColor: settings.componentsThemeColor,
            textPrimaryColor: settings.textPrimaryColor,
            textSecondaryColor: settings.textSecondaryColor,
          }
        }, '*');
      }
    });
  }, [
    settings.theme,
    settings.headerColor,
    settings.footerColor,
    settings.backgroundColor,
    settings.componentsThemeColor,
    settings.textPrimaryColor,
    settings.textSecondaryColor
  ]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
}

export default App;