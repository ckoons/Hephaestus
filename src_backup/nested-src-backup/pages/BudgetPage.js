import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Paper,
  Slider,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

import { fetchBudgetInfo, updateBudgetSettings } from '../services/apiService';
import {
  updateSessionCost,
  updateMonthlyTotal,
  setBudgetLimit,
  setRequireApproval,
  setApprovalThreshold,
} from '../store/slices/budgetSlice';

const BudgetPage = () => {
  const dispatch = useDispatch();
  const budgetState = useSelector(state => state.budget);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [localBudgetLimit, setLocalBudgetLimit] = useState(budgetState.budgetLimit);
  const [localApprovalThreshold, setLocalApprovalThreshold] = useState(budgetState.approvalThreshold);
  const [localRequireApproval, setLocalRequireApproval] = useState(budgetState.requireApproval);
  
  // Load budget info
  useEffect(() => {
    loadBudgetInfo();
  }, []);
  
  const loadBudgetInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchBudgetInfo();
      
      // Update Redux store
      dispatch(updateSessionCost(data.sessionCost || 0));
      dispatch(updateMonthlyTotal(data.monthlyTotal || 0));
      dispatch(setBudgetLimit(data.budgetLimit || 50));
      dispatch(setRequireApproval(data.requireApproval !== false)); // Default to true
      dispatch(setApprovalThreshold(data.approvalThreshold || 0.25));
      
      // Update local state
      setLocalBudgetLimit(data.budgetLimit || 50);
      setLocalRequireApproval(data.requireApproval !== false);
      setLocalApprovalThreshold(data.approvalThreshold || 0.25);
      
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
      await updateBudgetSettings({
        budgetLimit: localBudgetLimit,
        requireApproval: localRequireApproval,
        approvalThreshold: localApprovalThreshold,
      });
      
      // Update Redux store
      dispatch(setBudgetLimit(localBudgetLimit));
      dispatch(setRequireApproval(localRequireApproval));
      dispatch(setApprovalThreshold(localApprovalThreshold));
      
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };
  
  // Calculate budget percentages
  const usedPercentage = budgetState.budgetLimit > 0
    ? (budgetState.monthlyTotal / budgetState.budgetLimit) * 100
    : 0;
  
  const remainingPercentage = 100 - usedPercentage;
  
  // Format currency
  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Budget Controls
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
          {/* Budget summary cards */}
          <Grid container spacing={3} mb={4}>
            {/* Current Session */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Session
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <AttachMoneyIcon color="primary" />
                    <Typography variant="h4" component="div" color="primary">
                      {formatCurrency(budgetState.sessionCost)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Cost incurred in current session
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Monthly Total */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Monthly Total
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <AttachMoneyIcon color="primary" />
                    <Typography variant="h4" component="div" color="primary">
                      {formatCurrency(budgetState.monthlyTotal)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Total cost for current month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Remaining Budget */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Remaining Budget
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <AttachMoneyIcon color={remainingPercentage > 20 ? 'success' : 'error'} />
                    <Typography 
                      variant="h4" 
                      component="div" 
                      color={remainingPercentage > 20 ? 'success.main' : 'error.main'}
                    >
                      {formatCurrency(budgetState.remainingBudget)}
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1, mb: 0.5 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={usedPercentage} 
                      color={remainingPercentage > 20 ? 'success' : 'error'} 
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency(budgetState.monthlyTotal)} of {formatCurrency(budgetState.budgetLimit)} used
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Budget settings */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Budget Settings
            </Typography>
            
            <Grid container spacing={3}>
              {/* Budget Limit */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Monthly Budget Limit
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    type="number"
                    label="Budget ($)"
                    value={localBudgetLimit}
                    onChange={(e) => setLocalBudgetLimit(Number(e.target.value))}
                    InputProps={{
                      startAdornment: <AttachMoneyIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />,
                    }}
                    variant="outlined"
                    size="small"
                    sx={{ width: 150 }}
                  />
                  <Slider
                    value={localBudgetLimit}
                    onChange={(e, newValue) => setLocalBudgetLimit(newValue)}
                    min={0}
                    max={200}
                    step={5}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `$${value}`}
                    sx={{ flexGrow: 1, mx: 2 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Set your monthly spending limit for AI operations
                </Typography>
              </Grid>
              
              {/* Approval Threshold */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Operation Approval
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localRequireApproval}
                      onChange={(e) => setLocalRequireApproval(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Require approval for high-cost operations"
                />
                
                {localRequireApproval && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <TextField
                      type="number"
                      label="Threshold ($)"
                      value={localApprovalThreshold}
                      onChange={(e) => setLocalApprovalThreshold(Number(e.target.value))}
                      InputProps={{
                        startAdornment: <AttachMoneyIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />,
                      }}
                      variant="outlined"
                      size="small"
                      sx={{ width: 150 }}
                    />
                    <Slider
                      value={localApprovalThreshold}
                      onChange={(e, newValue) => setLocalApprovalThreshold(newValue)}
                      min={0.05}
                      max={1}
                      step={0.05}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `$${value.toFixed(2)}`}
                      sx={{ flexGrow: 1, mx: 2 }}
                    />
                  </Box>
                )}
                
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {localRequireApproval
                    ? `You'll be asked to confirm operations costing more than ${formatCurrency(localApprovalThreshold)}`
                    : 'All operations will execute without confirmation'
                  }
                </Typography>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </Paper>
          
          {/* Cost Breakdown */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Cost Breakdown
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This section will display detailed cost analytics for different components and operations.
            </Typography>
            
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">
                Cost analytics visualization will be displayed here
              </Typography>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default BudgetPage;