const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const securityManager = require('./securityManager');

/**
 * Audit logging system for KODO platform
 * Tracks security events, user actions, and system changes
 */
class AuditLogger {
  constructor() {
    this.logDirectory = process.env.AUDIT_LOG_DIR || path.join(process.cwd(), 'logs', 'audit');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxFiles = 30; // Keep 30 days of logs
    this.initialized = false;
  }

  /**
   * Initialize audit logging system
   */
  async initialize() {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
      this.initialized = true;
      logger.info('Audit logging system initialized', { logDirectory: this.logDirectory });
    } catch (error) {
      logger.error('Failed to initialize audit logging:', error);
      throw error;
    }
  }

  /**
   * Log authentication events
   * @param {string} event - Event type (login, logout, failed_login, etc.)
   * @param {Object} details - Event details
   */
  async logAuthEvent(event, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      category: 'authentication',
      event,
      userId: details.userId || null,
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null,
      success: details.success !== false,
      metadata: {
        ...details.metadata,
        sessionId: details.sessionId ? securityManager.hashData(details.sessionId) : null,
      }
    };

    // Hash sensitive data
    if (details.username) {
      auditEntry.username = securityManager.hashData(details.username);
    }

    await this.writeLogEntry(auditEntry);

    // Log security events for failed authentications
    if (!auditEntry.success) {
      securityManager.logSecurityEvent(`auth_${event}`, {
        userId: details.userId,
        ipAddress: details.ipAddress,
        reason: details.reason || 'unknown'
      });
    }
  }

  /**
   * Log user management events
   * @param {string} event - Event type (create, update, delete, role_change, etc.)
   * @param {Object} details - Event details
   */
  async logUserEvent(event, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      category: 'user_management',
      event,
      userId: details.userId || null,
      targetUserId: details.targetUserId || null,
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null,
      changes: details.changes || null,
      metadata: details.metadata || {}
    };

    await this.writeLogEntry(auditEntry);

    // Log sensitive user events
    if (['role_change', 'delete', 'password_reset'].includes(event)) {
      securityManager.logSecurityEvent(`user_${event}`, {
        userId: details.userId,
        targetUserId: details.targetUserId,
        changes: details.changes
      });
    }
  }

  /**
   * Log product/transaction events
   * @param {string} event - Event type (create, update, delete, bid, purchase, etc.)
   * @param {Object} details - Event details
   */
  async logProductEvent(event, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      category: 'product_transaction',
      event,
      userId: details.userId || null,
      productId: details.productId || null,
      orderId: details.orderId || null,
      amount: details.amount || null,
      ipAddress: details.ipAddress || null,
      metadata: {
        ...details.metadata,
        bidAmount: details.bidAmount,
        previousPrice: details.previousPrice,
        category: details.category
      }
    };

    await this.writeLogEntry(auditEntry);
  }

  /**
   * Log admin actions
   * @param {string} event - Event type (user_ban, system_config, data_export, etc.)
   * @param {Object} details - Event details
   */
  async logAdminEvent(event, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      category: 'admin_action',
      event,
      userId: details.userId || null,
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null,
      targetId: details.targetId || null,
      action: details.action || null,
      metadata: details.metadata || {}
    };

    await this.writeLogEntry(auditEntry);

    // All admin events are security-relevant
    securityManager.logSecurityEvent(`admin_${event}`, {
      userId: details.userId,
      targetId: details.targetId,
      action: details.action
    });
  }

  /**
   * Log API access events
   * @param {string} event - Event type (rate_limit_hit, suspicious_activity, etc.)
   * @param {Object} details - Event details
   */
  async logApiEvent(event, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      category: 'api_access',
      event,
      userId: details.userId || null,
      ipAddress: details.ipAddress || null,
      endpoint: details.endpoint || null,
      method: details.method || null,
      statusCode: details.statusCode || null,
      responseTime: details.responseTime || null,
      metadata: details.metadata || {}
    };

    await this.writeLogEntry(auditEntry);

    // Log security events for suspicious API activity
    if (['rate_limit_hit', 'suspicious_pattern', 'blocked_request'].includes(event)) {
      securityManager.logSecurityEvent(`api_${event}`, {
        userId: details.userId,
        ipAddress: details.ipAddress,
        endpoint: details.endpoint
      });
    }
  }

  /**
   * Log system events
   * @param {string} event - Event type (startup, shutdown, error, maintenance, etc.)
   * @param {Object} details - Event details
   */
  async logSystemEvent(event, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      category: 'system',
      event,
      severity: details.severity || 'info',
      metadata: {
        ...details.metadata,
        version: process.env.npm_package_version || 'unknown',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await this.writeLogEntry(auditEntry);
  }

  /**
   * Log data access events
   * @param {string} event - Event type (export, import, query, modification, etc.)
   * @param {Object} details - Event details
   */
  async logDataEvent(event, details = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      category: 'data_access',
      event,
      userId: details.userId || null,
      ipAddress: details.ipAddress || null,
      table: details.table || null,
      recordId: details.recordId || null,
      operation: details.operation || null,
      recordCount: details.recordCount || null,
      metadata: details.metadata || {}
    };

    await this.writeLogEntry(auditEntry);

    // Log sensitive data operations
    if (['export', 'bulk_delete', 'schema_change'].includes(event)) {
      securityManager.logSecurityEvent(`data_${event}`, {
        userId: details.userId,
        table: details.table,
        recordCount: details.recordCount
      });
    }
  }

  /**
   * Write audit entry to log file
   * @param {Object} entry - Audit entry
   */
  async writeLogEntry(entry) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const logFile = path.join(this.logDirectory, `audit_${date}.log`);

      // Check if file needs rotation
      await this.rotateLogIfNeeded(logFile);

      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(logFile, logLine, 'utf8');

      // Also log to main logger for real-time monitoring
      logger.info(`Audit: ${entry.category}:${entry.event}`, {
        userId: entry.userId,
        category: entry.category,
        event: entry.event
      });

    } catch (error) {
      logger.error('Failed to write audit log:', error);
      // Don't throw - audit logging shouldn't break the application
    }
  }

  /**
   * Rotate log file if it exceeds size limit
   * @param {string} logFile - Log file path
   */
  async rotateLogIfNeeded(logFile) {
    try {
      const stats = await fs.stat(logFile);
      if (stats.size > this.maxFileSize) {
        const timestamp = Date.now();
        const rotatedFile = `${logFile}.${timestamp}`;
        await fs.rename(logFile, rotatedFile);
        logger.info('Audit log rotated', { original: logFile, rotated: rotatedFile });

        // Clean up old rotated files
        await this.cleanupOldLogs();
      }
    } catch (error) {
      // File doesn't exist yet, no rotation needed
    }
  }

  /**
   * Clean up old rotated log files
   */
  async cleanupOldLogs() {
    try {
      const files = await fs.readdir(this.logDirectory);
      const rotatedFiles = files
        .filter(file => file.startsWith('audit_') && file.includes('.'))
        .map(file => ({
          name: file,
          path: path.join(this.logDirectory, file),
          timestamp: parseInt(file.split('.').pop())
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the most recent files
      if (rotatedFiles.length > this.maxFiles) {
        const filesToDelete = rotatedFiles.slice(this.maxFiles);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          logger.debug('Cleaned up old audit log', { file: file.name });
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old audit logs:', error);
    }
  }

  /**
   * Query audit logs
   * @param {Object} filters - Query filters
   * @returns {Array} Matching audit entries
   */
  async queryLogs(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        category,
        event,
        userId,
        limit = 100,
        offset = 0
      } = filters;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate ? new Date(endDate) : new Date();

      const results = [];
      let totalFound = 0;

      // Read log files in date range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const logFile = path.join(this.logDirectory, `audit_${dateStr}.log`);

        try {
          const content = await fs.readFile(logFile, 'utf8');
          const lines = content.trim().split('\n');

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const entry = JSON.parse(line);

              // Apply filters
              if (category && entry.category !== category) continue;
              if (event && entry.event !== event) continue;
              if (userId && entry.userId !== userId) continue;

              totalFound++;

              // Apply pagination
              if (totalFound > offset && results.length < limit) {
                results.push(entry);
              }
            } catch (parseError) {
              logger.warn('Failed to parse audit log entry:', parseError);
            }
          }
        } catch (fileError) {
          // File doesn't exist, continue
        }
      }

      return {
        entries: results,
        total: totalFound,
        limit,
        offset
      };

    } catch (error) {
      logger.error('Failed to query audit logs:', error);
      throw new Error('Failed to query audit logs');
    }
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Date range filters
   * @returns {Object} Statistics
   */
  async getAuditStats(filters = {}) {
    try {
      const queryResult = await this.queryLogs({ ...filters, limit: 10000 });
      const entries = queryResult.entries;

      const stats = {
        totalEntries: queryResult.total,
        categories: {},
        events: {},
        users: new Set(),
        timeRange: {
          start: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: filters.endDate || new Date().toISOString()
        }
      };

      entries.forEach(entry => {
        // Category counts
        stats.categories[entry.category] = (stats.categories[entry.category] || 0) + 1;

        // Event counts
        const eventKey = `${entry.category}:${entry.event}`;
        stats.events[eventKey] = (stats.events[eventKey] || 0) + 1;

        // Unique users
        if (entry.userId) {
          stats.users.add(entry.userId);
        }
      });

      stats.uniqueUsers = stats.users.size;

      return stats;
    } catch (error) {
      logger.error('Failed to get audit stats:', error);
      throw new Error('Failed to get audit statistics');
    }
  }

  /**
   * Express middleware for automatic audit logging
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  auditMiddleware(options = {}) {
    return async (req, res, next) => {
      const startTime = Date.now();

      // Store original end method
      const originalEnd = res.end;

      res.end = async function(...args) {
        const duration = Date.now() - startTime;

        // Log API access
        await this.logApiEvent('request', {
          userId: req.user?.id,
          ipAddress: req.ip,
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: duration,
          metadata: {
            userAgent: req.get('User-Agent'),
            contentLength: res.get('Content-Length')
          }
        });

        // Call original end method
        originalEnd.apply(this, args);
      }.bind(this);

      next();
    };
  }
}

module.exports = new AuditLogger();