import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: [],
  activeComponentId: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const componentsSlice = createSlice({
  name: 'components',
  initialState,
  reducers: {
    setComponents: (state, action) => {
      state.list = action.payload;
      state.status = 'succeeded';
    },
    setActiveComponent: (state, action) => {
      state.activeComponentId = action.payload;
    },
    updateComponentStatus: (state, action) => {
      const { componentId, status } = action.payload;
      const component = state.list.find(c => c.id === componentId);
      if (component) {
        component.status = status;
      }
    },
    setComponentsLoading: (state) => {
      state.status = 'loading';
    },
    setComponentsError: (state, action) => {
      state.status = 'failed';
      state.error = action.payload;
    },
  },
});

export const {
  setComponents,
  setActiveComponent,
  updateComponentStatus,
  setComponentsLoading,
  setComponentsError,
} = componentsSlice.actions;

export default componentsSlice.reducer;