import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'disconnected', // 'disconnected' | 'connecting' | 'connected'
  socket: null,
  error: null,
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    setSocket: (state, action) => {
      state.socket = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setStatus, setSocket, setError } = websocketSlice.actions;

export default websocketSlice.reducer;