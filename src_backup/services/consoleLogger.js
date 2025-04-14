/**
 * Browser console logger that sends logs to server
 * This helps in debugging client-side issues
 */
import { sendMessage } from './websocketService';

// Store the original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error
};

// Override console methods to also send logs to server
console.log = function() {
  // Call the original method
  originalConsole.log.apply(console, arguments);
  
  // Convert arguments to an array
  const args = Array.from(arguments).map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  );
  
  // Send to server
  try {
    sendMessage({
      type: 'console_log',
      level: 'log',
      message: args.join(' '),
      timestamp: new Date().toISOString(),
      source: 'browser'
    });
  } catch (e) {
    // Do nothing if sending fails
  }
};

console.info = function() {
  // Call the original method
  originalConsole.info.apply(console, arguments);
  
  // Convert arguments to an array
  const args = Array.from(arguments).map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  );
  
  // Send to server
  try {
    sendMessage({
      type: 'console_log',
      level: 'info',
      message: args.join(' '),
      timestamp: new Date().toISOString(),
      source: 'browser'
    });
  } catch (e) {
    // Do nothing if sending fails
  }
};

console.warn = function() {
  // Call the original method
  originalConsole.warn.apply(console, arguments);
  
  // Convert arguments to an array
  const args = Array.from(arguments).map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  );
  
  // Send to server
  try {
    sendMessage({
      type: 'console_log',
      level: 'warn',
      message: args.join(' '),
      timestamp: new Date().toISOString(),
      source: 'browser'
    });
  } catch (e) {
    // Do nothing if sending fails
  }
};

console.error = function() {
  // Call the original method
  originalConsole.error.apply(console, arguments);
  
  // Convert arguments to an array
  const args = Array.from(arguments).map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  );
  
  // Send to server
  try {
    sendMessage({
      type: 'console_log',
      level: 'error',
      message: args.join(' '),
      timestamp: new Date().toISOString(),
      source: 'browser'
    });
  } catch (e) {
    // Do nothing if sending fails
  }
};

export default {
  // This is just a placeholder to allow importing this file
  initialize: () => console.info('Console logger initialized')
};
EOF < /dev/null