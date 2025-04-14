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
  Tabs,
  Tab,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import ColorizeIcon from '@mui/icons-material/Colorize';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

import { fetchUserSettings, updateUserSettings } from '../services/apiService';
import {
  setTheme,
  setFontSize,
  setNotifications,
  setAutoConnect,
  setDeveloperMode,
  setShowGreekNames,
  setHeaderColor,
  setFooterColor,
  setBackgroundColor,
  setSidebarColor,
  setPaperColor,
  setTextPrimaryColor,
  setTextSecondaryColor,
  setComponentsThemeColor,
  applyColorPreset,
  colorPresets,
} from '../store/slices/settingsSlice';

// Import color setting components
import ColorPresetButton from '../components/settings/ColorPresetButton';
import ColorPickerInput from '../components/settings/ColorPickerInput';
import ThemePreview from '../components/settings/ThemePreview';

// TabPanel component for tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SettingsPage = () => {
  const dispatch = useDispatch();
  const settingsState = useSelector(state => state.settings);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState(''); 
  
  // Local state for form
  const [localSettings, setLocalSettings] = useState({
    theme: settingsState.theme,
    fontSize: settingsState.fontSize,
    notifications: settingsState.notifications,
    autoConnect: settingsState.autoConnect,
    developerMode: settingsState.developerMode,
    showGreekNames: settingsState.showGreekNames,
    // Color settings
    headerColor: settingsState.headerColor,
    footerColor: settingsState.footerColor,
    backgroundColor: settingsState.backgroundColor,
    sidebarColor: settingsState.sidebarColor,
    paperColor: settingsState.paperColor,
    textPrimaryColor: settingsState.textPrimaryColor,
    textSecondaryColor: settingsState.textSecondaryColor,
    componentsThemeColor: settingsState.componentsThemeColor,
  });
  
  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Determine the current color preset if it matches exactly
  useEffect(() => {
    const themeType = localSettings.theme === 'light' ? 'light' : 'dark';
    const presets = colorPresets[themeType];
    
    let foundPreset = '';
    Object.entries(presets).forEach(([presetName, presetColors]) => {
      let matches = true;
      
      // Check if all color values match
      Object.entries(presetColors).forEach(([colorKey, colorValue]) => {
        if (localSettings[colorKey] !== colorValue) {
          matches = false;
        }
      });
      
      if (matches) {
        foundPreset = presetName;
      }
    });
    
    setSelectedPreset(foundPreset);
  }, [
    localSettings.theme,
    localSettings.headerColor,
    localSettings.footerColor,
    localSettings.backgroundColor,
    localSettings.sidebarColor,
    localSettings.paperColor,
    localSettings.textPrimaryColor,
    localSettings.textSecondaryColor,
    localSettings.componentsThemeColor,
  ]);
  
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
      dispatch(setShowGreekNames(data.showGreekNames !== false)); // Default to true
      
      // Color settings
      dispatch(setHeaderColor(data.headerColor || settingsState.headerColor));
      dispatch(setFooterColor(data.footerColor || settingsState.footerColor));
      dispatch(setBackgroundColor(data.backgroundColor || settingsState.backgroundColor));
      dispatch(setSidebarColor(data.sidebarColor || settingsState.sidebarColor));
      dispatch(setPaperColor(data.paperColor || settingsState.paperColor));
      dispatch(setTextPrimaryColor(data.textPrimaryColor || settingsState.textPrimaryColor));
      dispatch(setTextSecondaryColor(data.textSecondaryColor || settingsState.textSecondaryColor));
      dispatch(setComponentsThemeColor(data.componentsThemeColor || settingsState.componentsThemeColor));
      
      // Update local state
      setLocalSettings({
        theme: data.theme || 'dark',
        fontSize: data.fontSize || 'medium',
        notifications: data.notifications !== false,
        autoConnect: data.autoConnect !== false,
        developerMode: data.developerMode || false,
        showGreekNames: data.showGreekNames !== false,
        // Color settings
        headerColor: data.headerColor || settingsState.headerColor,
        footerColor: data.footerColor || settingsState.footerColor,
        backgroundColor: data.backgroundColor || settingsState.backgroundColor,
        sidebarColor: data.sidebarColor || settingsState.sidebarColor,
        paperColor: data.paperColor || settingsState.paperColor,
        textPrimaryColor: data.textPrimaryColor || settingsState.textPrimaryColor,
        textSecondaryColor: data.textSecondaryColor || settingsState.textSecondaryColor,
        componentsThemeColor: data.componentsThemeColor || settingsState.componentsThemeColor,
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
      dispatch(setShowGreekNames(localSettings.showGreekNames));
      
      // Color settings
      dispatch(setHeaderColor(localSettings.headerColor));
      dispatch(setFooterColor(localSettings.footerColor));
      dispatch(setBackgroundColor(localSettings.backgroundColor));
      dispatch(setSidebarColor(localSettings.sidebarColor));
      dispatch(setPaperColor(localSettings.paperColor));
      dispatch(setTextPrimaryColor(localSettings.textPrimaryColor));
      dispatch(setTextSecondaryColor(localSettings.textSecondaryColor));
      dispatch(setComponentsThemeColor(localSettings.componentsThemeColor));
      
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
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleApplyPreset = (presetName) => {
    const themeType = localSettings.theme === 'light' ? 'light' : 'dark';
    const preset = colorPresets[themeType][presetName];
    
    if (preset) {
      setLocalSettings({
        ...localSettings,
        ...preset
      });
      
      setSelectedPreset(presetName);
      
      // This would normally be dispatched when saving, but we want immediate effect
      dispatch(applyColorPreset({ themeType, presetName }));
    }
  };
  
  // Reset colors to default for current theme
  const handleResetColors = () => {
    const themeType = localSettings.theme === 'light' ? 'light' : 'dark';
    const defaultPreset = themeType === 'light' ? 'white' : 'blueGray';
    handleApplyPreset(defaultPreset);
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
          {/* Settings Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              aria-label="settings tabs"
            >
              <Tab 
                icon={<FormatColorFillIcon />} 
                iconPosition="start" 
                label="Appearance" 
                id="settings-tab-0" 
              />
              <Tab 
                icon={<ColorLensIcon />} 
                iconPosition="start" 
                label="Colors & Theme" 
                id="settings-tab-1" 
              />
              <Tab 
                icon={<DeveloperModeIcon />} 
                iconPosition="start" 
                label="Advanced" 
                id="settings-tab-2" 
              />
            </Tabs>
          </Box>
          
          {/* Appearance Tab */}
          <TabPanel value={tabValue} index={0}>
            {/* General Appearance settings */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                General Appearance
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
                      onChange={(e) => {
                        const newTheme = e.target.value;
                        handleChange('theme', newTheme);
                        
                        // Reset colors to default for the new theme
                        setTimeout(() => {
                          const defaultPreset = newTheme === 'light' ? 'white' : 'blueGray';
                          handleApplyPreset(defaultPreset);
                        }, 0);
                      }}
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
            <Paper sx={{ p: 3 }}>
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
                
                {/* TEKTON_SHOW_GREEK_NAMES */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.showGreekNames}
                          onChange={(e) => handleChange('showGreekNames', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="TEKTON_SHOW_GREEK_NAMES"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                    Show component Greek names alongside their specialties
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </TabPanel>
          
          {/* Colors & Theme Tab */}
          <TabPanel value={tabValue} index={1}>
            {/* Color & Theme Settings */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Color Presets
              </Typography>
              
              <Grid container spacing={2}>
                {/* Color presets */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    {localSettings.theme === 'dark' ? 'Dark' : 'Light'} Theme Presets
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                    {/* Dark theme presets */}
                    {localSettings.theme === 'dark' && (
                      <>
                        {Object.entries(colorPresets.dark).map(([presetName, presetColors]) => (
                          <ColorPresetButton
                            key={presetName}
                            color={presetColors.headerColor}
                            label={presetName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            onClick={() => handleApplyPreset(presetName)}
                            selected={selectedPreset === presetName}
                          />
                        ))}
                      </>
                    )}
                    
                    {/* Light theme presets */}
                    {localSettings.theme === 'light' && (
                      <>
                        {Object.entries(colorPresets.light).map(([presetName, presetColors]) => (
                          <ColorPresetButton
                            key={presetName}
                            color={presetColors.headerColor}
                            label={presetName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            onClick={() => handleApplyPreset(presetName)}
                            selected={selectedPreset === presetName}
                          />
                        ))}
                      </>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Button 
                      variant="outlined" 
                      color="secondary"
                      startIcon={<AutoFixHighIcon />}
                      onClick={handleResetColors}
                      sx={{ mt: 1 }}
                    >
                      Reset to Default Colors
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
            
            <Grid container spacing={3}>
              {/* Custom Colors */}
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h5" gutterBottom>
                    Custom Colors
                  </Typography>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    UI Elements
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerInput
                        label="Header"
                        value={localSettings.headerColor}
                        onChange={(color) => handleChange('headerColor', color)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerInput
                        label="Footer"
                        value={localSettings.footerColor}
                        onChange={(color) => handleChange('footerColor', color)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerInput
                        label="Background"
                        value={localSettings.backgroundColor}
                        onChange={(color) => handleChange('backgroundColor', color)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerInput
                        label="Sidebar"
                        value={localSettings.sidebarColor}
                        onChange={(color) => handleChange('sidebarColor', color)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerInput
                        label="Paper/Card"
                        value={localSettings.paperColor}
                        onChange={(color) => handleChange('paperColor', color)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerInput
                        label="Component GUI Theme"
                        value={localSettings.componentsThemeColor}
                        onChange={(color) => handleChange('componentsThemeColor', color)}
                      />
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                    Text Colors
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerInput
                        label="Primary Text"
                        value={localSettings.textPrimaryColor}
                        onChange={(color) => handleChange('textPrimaryColor', color)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <ColorPickerInput
                        label="Secondary Text"
                        value={localSettings.textSecondaryColor}
                        onChange={(color) => handleChange('textSecondaryColor', color)}
                      />
                    </Grid>
                  </Grid>
                  
                  {selectedPreset === '' && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      You are using a custom color configuration
                    </Alert>
                  )}
                </Paper>
              </Grid>
              
              {/* Theme Preview */}
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h5" gutterBottom>
                    Preview
                  </Typography>
                  
                  <ThemePreview
                    colors={{
                      headerColor: localSettings.headerColor,
                      footerColor: localSettings.footerColor,
                      backgroundColor: localSettings.backgroundColor,
                      sidebarColor: localSettings.sidebarColor,
                      paperColor: localSettings.paperColor,
                      textPrimaryColor: localSettings.textPrimaryColor,
                      textSecondaryColor: localSettings.textSecondaryColor,
                    }}
                  />
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Note: The component GUI theme setting will apply to all component interfaces
                    displayed in the right panel.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
          
          {/* Advanced Tab */}
          <TabPanel value={tabValue} index={2}>
            {/* Advanced settings */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Advanced Settings
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
            </Paper>
          </TabPanel>
          
          {/* Settings Action Buttons */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mt: 3,
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'background.default',
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              zIndex: 1,
            }}
          >
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
              color="primary"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SettingsPage;