import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Button,
  Divider,
  Grid,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';

import { fetchUserSettings, updateUserSettings } from '../services/apiService';
import {
  setTheme,
  setFontSize,
  setNotifications,
  setAutoConnect,
  setDeveloperMode,
} from '../store/slices/settingsSlice';

const SettingsPage = () => {
  const dispatch = useDispatch();
  const settingsState = useSelector(state => state.settings);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Local state for form
  const [localSettings, setLocalSettings] = useState({
    theme: settingsState.theme,
    fontSize: settingsState.fontSize,
    notifications: settingsState.notifications,
    autoConnect: settingsState.autoConnect,
    developerMode: settingsState.developerMode,
  });
  
  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchUserSettings();
      
      // Update Redux store
      dispatch(setTheme(data.theme || 'dark'));
      dispatch(setFontSize(data.fontSize || 'medium'));
      dispatch(setNotifications(data.notifications !== false)); // Default to true
      dispatch(setAutoConnect(data.autoConnect !== false)); // Default to true
      dispatch(setDeveloperMode(data.developerMode || false));
      
      // Update local state
      setLocalSettings({
        theme: data.theme || 'dark',
        fontSize: data.fontSize || 'medium',
        notifications: data.notifications !== false,
        autoConnect: data.autoConnect !== false,
        developerMode: data.developerMode || false,
      });
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await updateUserSettings(localSettings);
      
      // Update Redux store
      dispatch(setTheme(localSettings.theme));
      dispatch(setFontSize(localSettings.fontSize));
      dispatch(setNotifications(localSettings.notifications));
      dispatch(setAutoConnect(localSettings.autoConnect));
      dispatch(setDeveloperMode(localSettings.developerMode));
      
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };
  
  const handleChange = (setting, value) => {
    setLocalSettings({
      ...localSettings,
      [setting]: value,
    });
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Appearance settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Appearance
            </Typography>
            
            <Grid container spacing={3}>
              {/* Theme */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Theme
                </Typography>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={localSettings.theme}
                    onChange={(e) => handleChange('theme', e.target.value)}
                  >
                    <FormControlLabel value="dark" control={<Radio />} label="Dark theme" />
                    <FormControlLabel value="light" control={<Radio />} label="Light theme" />
                    <FormControlLabel value="system" control={<Radio />} label="Use system theme" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              {/* Font Size */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Font Size
                </Typography>
                <FormControl fullWidth sx={{ maxWidth: 200 }}>
                  <InputLabel id="font-size-label">Font Size</InputLabel>
                  <Select
                    labelId="font-size-label"
                    value={localSettings.fontSize}
                    onChange={(e) => handleChange('fontSize', e.target.value)}
                    label="Font Size"
                  >
                    <MenuItem value="small">Small</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="large">Large</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Behavior settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Behavior
            </Typography>
            
            <Grid container spacing={3}>
              {/* Notifications */}
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.notifications}
                      onChange={(e) => handleChange('notifications', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Enable notifications"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Receive notifications for important events and alerts
                </Typography>
              </Grid>
              
              {/* Auto-connect */}
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.autoConnect}
                      onChange={(e) => handleChange('autoConnect', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Auto-connect to components"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Automatically connect to available components at startup
                </Typography>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Advanced settings */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Advanced
            </Typography>
            
            <Grid container spacing={3}>
              {/* Developer Mode */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DeveloperModeIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localSettings.developerMode}
                        onChange={(e) => handleChange('developerMode', e.target.checked)}
                        color="warning"
                      />
                    }
                    label="Developer mode"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Enable advanced debugging features and detailed logging
                </Typography>
                
                {localSettings.developerMode && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Developer mode may impact performance and increase resource usage
                  </Alert>
                )}
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Reset and Save buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadSettings}
                disabled={loading || saving}
              >
                Reset to Saved
              </Button>
              
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default SettingsPage;