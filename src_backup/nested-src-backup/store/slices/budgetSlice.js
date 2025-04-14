import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sessionCost: 0,
  monthlyTotal: 0,
  budgetLimit: 50, // Default $50
  remainingBudget: 50,
  requireApproval: true,
  approvalThreshold: 0.25,
};

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    updateSessionCost: (state, action) => {
      state.sessionCost = action.payload;
      state.remainingBudget = state.budgetLimit - state.monthlyTotal;
    },
    updateMonthlyTotal: (state, action) => {
      state.monthlyTotal = action.payload;
      state.remainingBudget = state.budgetLimit - state.monthlyTotal;
    },
    setBudgetLimit: (state, action) => {
      state.budgetLimit = action.payload;
      state.remainingBudget = state.budgetLimit - state.monthlyTotal;
    },
    setRequireApproval: (state, action) => {
      state.requireApproval = action.payload;
    },
    setApprovalThreshold: (state, action) => {
      state.approvalThreshold = action.payload;
    },
    resetSessionCost: (state) => {
      state.sessionCost = 0;
    },
  },
});

export const {
  updateSessionCost,
  updateMonthlyTotal,
  setBudgetLimit,
  setRequireApproval,
  setApprovalThreshold,
  resetSessionCost,
} = budgetSlice.actions;

export default budgetSlice.reducer;