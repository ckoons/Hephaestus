/**
 * Logging service for Hephaestus UI
 * 
 * This service provides a unified logging interface that:
 * 1. Logs to the browser console for development
 * 2. Sends log events to the server for centralized logging
 */

import { sendMessage } from './websocketService';

/**
 * Log a message both to the console and to the server
 * 
 * @param {string} level - Log level (debug, info, warning, error)
 * @param {string} category - Log category (ui, header, footer, etc.)
 * @param {string} message - Log message
 * @param {Object} [context] - Additional context
 */
const log = (level, category, message, context = {}) => {
  // Always log to console
  console.log(`[${level.toUpperCase()}][${category}] ${message}`, context);
  
  // Send log to server if websocket is connected
  try {
    sendMessage({
      type: 'log',
      level,
      category,
      message,
      context,
      timestamp: new Date().toISOString(),
      source: 'hephaestus-ui'
    });
  } catch (err) {
    // If sending to server fails, just continue
    console.warn('Failed to send log to server:', err);
  }
};

/**
 * Log a debug message
 * 
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {Object} [context] - Additional context
 */
export const debug = (category, message, context = {}) => {
  log('debug', category, message, context);
};

/**
 * Log an info message
 * 
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {Object} [context] - Additional context
 */
export const info = (category, message, context = {}) => {
  log('info', category, message, context);
};

/**
 * Log a warning message
 * 
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {Object} [context] - Additional context
 */
export const warning = (category, message, context = {}) => {
  log('warning', category, message, context);
};

/**
 * Log an error message
 * 
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {Object} [context] - Additional context
 */
export const error = (category, message, context = {}) => {
  log('error', category, message, context);
};

export default {
  debug,
  info,
  warning,
  error
};