import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  inputContexts: {},
  placeholders: {}
};

const footerSlice = createSlice({
  name: 'footer',
  initialState,
  reducers: {
    saveInputContext: (state, action) => {
      const { componentId, inputText } = action.payload;
      state.inputContexts[componentId] = inputText;
    },
    setPlaceholder: (state, action) => {
      const { componentId, placeholder } = action.payload;
      state.placeholders[componentId] = placeholder;
    }
  }
});

export const { saveInputContext, setPlaceholder } = footerSlice.actions;
export default footerSlice.reducer;