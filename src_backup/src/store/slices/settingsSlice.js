import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'dark',
  fontSize: 'medium',
  notifications: true,
  autoConnect: true,
  developerMode: false,
  showGreekNames: true, // TEKTON_SHOW_GREEK_NAMES default is true
  
  // Color theme settings
  headerColor: '#1e293b',
  footerColor: '#1e293b',
  backgroundColor: '#000000',
  sidebarColor: '#0f0f0f',
  paperColor: '#1a1a1a',
  textPrimaryColor: '#f8fafc',
  textSecondaryColor: '#94a3b8',
  componentsThemeColor: '#1e293b',
};

// Color preset definitions
export const colorPresets = {
  dark: {
    blueGray: {
      headerColor: '#1e293b',
      footerColor: '#1e293b',
      backgroundColor: '#000000',
      sidebarColor: '#0f0f0f',
      paperColor: '#1a1a1a',
      textPrimaryColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      componentsThemeColor: '#1e293b',
    },
    darkBlue: {
      headerColor: '#1c2536',
      footerColor: '#1c2536',
      backgroundColor: '#000000',
      sidebarColor: '#0c1425',
      paperColor: '#161e2e',
      textPrimaryColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      componentsThemeColor: '#1c2536',
    },
    navySlate: {
      headerColor: '#212938',
      footerColor: '#212938',
      backgroundColor: '#000000',
      sidebarColor: '#111827',
      paperColor: '#1a202c',
      textPrimaryColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      componentsThemeColor: '#212938',
    },
    darkSlate: {
      headerColor: '#1a202c',
      footerColor: '#1a202c',
      backgroundColor: '#000000',
      sidebarColor: '#0f1420',
      paperColor: '#171923',
      textPrimaryColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      componentsThemeColor: '#1a202c',
    },
    slateGray: {
      headerColor: '#2d3748',
      footerColor: '#2d3748',
      backgroundColor: '#1a202c',
      sidebarColor: '#1e2533',
      paperColor: '#252d3d',
      textPrimaryColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      componentsThemeColor: '#2d3748',
    },
    gray: {
      headerColor: '#374151',
      footerColor: '#374151',
      backgroundColor: '#1f2937',
      sidebarColor: '#252f3f',
      paperColor: '#2d3748',
      textPrimaryColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      componentsThemeColor: '#374151',
    },
    black: {
      headerColor: '#111111',
      footerColor: '#111111',
      backgroundColor: '#000000',
      sidebarColor: '#0a0a0a',
      paperColor: '#151515',
      textPrimaryColor: '#f8fafc',
      textSecondaryColor: '#94a3b8',
      componentsThemeColor: '#111111',
    },
  },
  light: {
    white: {
      headerColor: '#ffffff',
      footerColor: '#ffffff',
      backgroundColor: '#f8fafc',
      sidebarColor: '#f1f5f9',
      paperColor: '#ffffff',
      textPrimaryColor: '#0f172a',
      textSecondaryColor: '#475569',
      componentsThemeColor: '#f8fafc',
    },
    slate50: {
      headerColor: '#f8fafc',
      footerColor: '#f8fafc',
      backgroundColor: '#f1f5f9',
      sidebarColor: '#e2e8f0',
      paperColor: '#ffffff',
      textPrimaryColor: '#0f172a',
      textSecondaryColor: '#475569',
      componentsThemeColor: '#f8fafc',
    },
    slate200: {
      headerColor: '#e2e8f0',
      footerColor: '#e2e8f0',
      backgroundColor: '#f1f5f9',
      sidebarColor: '#cbd5e1',
      paperColor: '#f8fafc',
      textPrimaryColor: '#0f172a',
      textSecondaryColor: '#475569',
      componentsThemeColor: '#e2e8f0',
    },
    slate300: {
      headerColor: '#cbd5e1',
      footerColor: '#cbd5e1',
      backgroundColor: '#e2e8f0',
      sidebarColor: '#94a3b8',
      paperColor: '#f1f5f9',
      textPrimaryColor: '#0f172a',
      textSecondaryColor: '#475569',
      componentsThemeColor: '#cbd5e1',
    },
    sky100: {
      headerColor: '#e0f2fe',
      footerColor: '#e0f2fe',
      backgroundColor: '#f1f5f9',
      sidebarColor: '#bae6fd',
      paperColor: '#f8fafc',
      textPrimaryColor: '#0f172a',
      textSecondaryColor: '#475569',
      componentsThemeColor: '#e0f2fe',
    },
    blue100: {
      headerColor: '#dbeafe',
      footerColor: '#dbeafe',
      backgroundColor: '#eff6ff',
      sidebarColor: '#bfdbfe',
      paperColor: '#ffffff',
      textPrimaryColor: '#1e3a8a',
      textSecondaryColor: '#3b82f6',
      componentsThemeColor: '#dbeafe',
    },
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setFontSize: (state, action) => {
      state.fontSize = action.payload;
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload;
    },
    setAutoConnect: (state, action) => {
      state.autoConnect = action.payload;
    },
    setDeveloperMode: (state, action) => {
      state.developerMode = action.payload;
    },
    setShowGreekNames: (state, action) => {
      state.showGreekNames = action.payload;
    },
    // Color setting actions
    setHeaderColor: (state, action) => {
      state.headerColor = action.payload;
    },
    setFooterColor: (state, action) => {
      state.footerColor = action.payload;
    },
    setBackgroundColor: (state, action) => {
      state.backgroundColor = action.payload;
    },
    setSidebarColor: (state, action) => {
      state.sidebarColor = action.payload;
    },
    setPaperColor: (state, action) => {
      state.paperColor = action.payload;
    },
    setTextPrimaryColor: (state, action) => {
      state.textPrimaryColor = action.payload;
    },
    setTextSecondaryColor: (state, action) => {
      state.textSecondaryColor = action.payload;
    },
    setComponentsThemeColor: (state, action) => {
      state.componentsThemeColor = action.payload;
    },
    // Apply a complete color preset
    applyColorPreset: (state, action) => {
      const { themeType, presetName } = action.payload;
      const preset = colorPresets[themeType][presetName];
      
      if (preset) {
        state.headerColor = preset.headerColor;
        state.footerColor = preset.footerColor;
        state.backgroundColor = preset.backgroundColor;
        state.sidebarColor = preset.sidebarColor;
        state.paperColor = preset.paperColor;
        state.textPrimaryColor = preset.textPrimaryColor;
        state.textSecondaryColor = preset.textSecondaryColor;
        state.componentsThemeColor = preset.componentsThemeColor;
      }
    },
    resetSettings: (state) => {
      return initialState;
    },
  },
});

export const {
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
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;