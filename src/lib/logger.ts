// Simple logger that no-ops in production for non-error logs
// Usage: import { logger } from '@/lib/logger'
// logger.debug('message', data)
// logger.audit('message', data) // prints only if ENABLE_AUDIT_LOGS === 'true'

type LogArgs = [message?: unknown, ...optionalParams: unknown[]];

const isProd = process.env.NODE_ENV === 'production';
const enableLogs = process.env.NEXT_PUBLIC_ENABLE_LOGS === 'true' || process.env.LOG_LEVEL === 'debug';
const enableAudit = process.env.NEXT_PUBLIC_ENABLE_AUDIT_LOGS === 'true' || process.env.ENABLE_AUDIT_LOGS === 'true';

function debug(...args: LogArgs) {
  if (!isProd || enableLogs) {
    console.log(...args);
  }
}

function info(...args: LogArgs) {
  if (!isProd || enableLogs) {
    console.log(...args);
  }
}

function warn(...args: LogArgs) {
  if (!isProd || enableLogs) {
    console.warn(...args);
  }
}

function error(...args: LogArgs) {
  // Always print errors
  console.error(...args);
}

function audit(...args: LogArgs) {
  if (enableAudit) {
    console.log('[AUDIT]', ...args);
  }
}

export const logger = { debug, info, warn, error, audit };


