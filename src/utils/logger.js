/**
 * Basic Logging utility for full codebase
 * Uses the global logging function set in server.js
 */

// Get global logging function with fallback
export const log = globalThis.logFunction || function(level, message, data) {
  if (level === 'ERROR') {
      console.error(message, data);
  } else if (level === 'DEBUG') {
      const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
      if (LOG_LEVEL === 'DEBUG') {
          console.log(message, data);
      }
  } else if (level === 'INFO' || level === 'WARN') {
      console.log(`[${level}] ${message}`, data);
  }
};