import React from 'react';
import AssignmentIcon from '@mui/icons-material/Assignment';
import StorageIcon from '@mui/icons-material/Storage';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ChatIcon from '@mui/icons-material/Chat';
import MailIcon from '@mui/icons-material/Mail';
import CodeIcon from '@mui/icons-material/Code';
import TuneIcon from '@mui/icons-material/Tune';
import PsychologyIcon from '@mui/icons-material/Psychology';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Get the appropriate icon for a component
 * @param {string} componentName The name of the component
 * @returns {JSX.Element} React component with the icon
 */
export const getComponentIcon = (componentName) => {
  const iconProps = { fontSize: 'small' };
  
  // Case-insensitive name check
  const name = componentName.toLowerCase();
  
  switch (name) {
    case 'telos':
      return <AssignmentIcon {...iconProps} color="primary" />;
    case 'athena':
      return <PsychologyIcon {...iconProps} color="secondary" />;
    case 'engram':
      return <StorageIcon {...iconProps} color="error" />;
    case 'ergon':
      return <SmartToyIcon {...iconProps} color="warning" />;
    case 'hermes':
      return <MailIcon {...iconProps} color="info" />;
    case 'sophia':
      return <MenuBookIcon {...iconProps} color="success" />;
    case 'prometheus':
      return <AccountTreeIcon {...iconProps} color="warning" />;
    case 'rhetor':
      return <ChatIcon {...iconProps} color="success" />;
    case 'codex':
      return <CodeIcon {...iconProps} color="primary" />;
    case 'harmonia':
      return <MusicNoteIcon {...iconProps} color="info" />;
    case 'synthesis':
      return <TuneIcon {...iconProps} color="error" />;
    case 'tekton':
      return <SettingsIcon {...iconProps} />;
    default:
      return <SettingsIcon {...iconProps} />;
  }
};

/**
 * Get a color for a component
 * @param {string} componentName The name of the component
 * @returns {string} Color hex code
 */
export const getComponentColor = (componentName) => {
  // Case-insensitive name check
  const name = componentName.toLowerCase();
  
  switch (name) {
    case 'telos':
      return '#4f46e5'; // Indigo
    case 'athena':
      return '#8b5cf6'; // Violet
    case 'engram':
      return '#ec4899'; // Pink
    case 'ergon':
      return '#f97316'; // Orange
    case 'hermes':
      return '#06b6d4'; // Cyan
    case 'sophia':
      return '#14b8a6'; // Teal
    case 'prometheus':
      return '#eab308'; // Yellow
    case 'rhetor':
      return '#22c55e'; // Green
    case 'codex':
      return '#6366f1'; // Indigo
    case 'harmonia':
      return '#0ea5e9'; // Light Blue
    case 'synthesis':
      return '#ef4444'; // Red
    case 'tekton':
      return '#3b82f6'; // Blue
    default:
      return '#3b82f6'; // Blue
  }
};

/**
 * Format a component status for display
 * @param {string} status Raw status value
 * @returns {string} Formatted status
 */
export const formatComponentStatus = (status) => {
  if (!status) return 'Unknown';
  
  switch (status.toUpperCase()) {
    case 'READY':
      return 'Ready';
    case 'INITIALIZING':
      return 'Initializing';
    case 'RUNNING':
      return 'Running';
    case 'STOPPING':
      return 'Stopping';
    case 'STOPPED':
      return 'Stopped';
    case 'FAILED':
      return 'Failed';
    case 'OFFLINE':
      return 'Offline';
    default:
      return status;
  }
};

/**
 * Get severity level for a component status
 * @param {string} status Raw status value
 * @returns {string} Severity level (success, warning, error, info)
 */
export const getStatusSeverity = (status) => {
  if (!status) return 'info';
  
  switch (status.toUpperCase()) {
    case 'READY':
    case 'RUNNING':
      return 'success';
    case 'INITIALIZING':
    case 'STOPPING':
      return 'warning';
    case 'STOPPED':
      return 'info';
    case 'FAILED':
    case 'OFFLINE':
      return 'error';
    default:
      return 'info';
  }
};