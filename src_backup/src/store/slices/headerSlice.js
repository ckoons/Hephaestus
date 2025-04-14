import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  componentControls: {}
};

const headerSlice = createSlice({
  name: 'header',
  initialState,
  reducers: {
    setHeaderControls: (state, action) => {
      const { componentId, controls } = action.payload;
      state.componentControls[componentId] = controls;
    }
  }
});

export const { setHeaderControls } = headerSlice.actions;
export default headerSlice.reducer;