import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'dark',
  fontSize: 'medium',
  notifications: true,
  autoConnect: true,
  developerMode: false,
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
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;