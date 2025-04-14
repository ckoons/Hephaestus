const API_BASE_URL = '/api';

export const fetchComponents = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/components`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return data.components;
  } catch (error) {
    console.error('Error fetching components:', error);
    throw error;
  }
};

export const fetchComponentDetails = async (componentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/components/${componentId}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching component ${componentId}:`, error);
    throw error;
  }
};

export const sendComponentCommand = async (componentId, command, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/components/${componentId}/command/${command}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error sending command to component ${componentId}:`, error);
    throw error;
  }
};

export const fetchBudgetInfo = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching budget info:', error);
    throw error;
  }
};

export const updateBudgetSettings = async (settings) => {
  try {
    const response = await fetch(`${API_BASE_URL}/budget`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating budget settings:', error);
    throw error;
  }
};

export const fetchUserSettings = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
};

export const updateUserSettings = async (settings) => {
  try {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
};

export const checkForDeadlocks = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/system/check-deadlocks`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking for deadlocks:', error);
    throw error;
  }
};

export default {
  fetchComponents,
  fetchComponentDetails,
  sendComponentCommand,
  fetchBudgetInfo,
  updateBudgetSettings,
  fetchUserSettings,
  updateUserSettings,
  checkForDeadlocks,
};