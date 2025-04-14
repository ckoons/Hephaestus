import { configureStore } from '@reduxjs/toolkit';
import componentsReducer from './slices/componentsSlice';
import websocketReducer from './slices/websocketSlice';
import chatReducer from './slices/chatSlice';
import budgetReducer from './slices/budgetSlice';
import settingsReducer from './slices/settingsSlice';
import footerReducer from './slices/footerSlice';

const store = configureStore({
  reducer: {
    components: componentsReducer,
    websocket: websocketReducer,
    chat: chatReducer,
    budget: budgetReducer,
    settings: settingsReducer,
    footer: footerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these fields in the state
        ignoredActions: ['websocket/setSocket'],
        ignoredPaths: ['websocket.socket'],
      },
    }),
});

export default store;