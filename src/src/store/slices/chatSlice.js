import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
  isTyping: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    setTyping: (state, action) => {
      state.isTyping = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
    },
  },
});

export const {
  addMessage,
  setMessages,
  setTyping,
  setError,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;