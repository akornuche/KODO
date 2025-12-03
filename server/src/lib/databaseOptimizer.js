const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Database optimization utilities
class DatabaseOptimizer {
  constructor() {
    this.connectionPool = null;
    this.queryMetrics = new Map();
    this.slowQueryThreshold = 1000; // 1 second
  }

  /**
   * Initialize optimized Prisma client with connection pooling
   */
  async initializePrisma() {
    const prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });

    // Enable query logging for performance monitoring
    prisma.$on('query', (e) => {
      this.logQueryPerformance(e);
    });

    // Connection pooling configuration
    await this.configureConnectionPool(prisma);

    return prisma;
  }

  /**
   * Configure database connection pooling
   */
  async configureConnectionPool(prisma) {
    try {
      // Test connection and log pool status
      await prisma.$connect();

      // Get connection pool info (PostgreSQL specific)
      const poolInfo = await prisma.$queryRaw`
        SELECT
          count(*) as total_connections,
          count(*) filter (where state = 'active') as active_connections,
          count(*) filter (where state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database();
      `;

      logger.info('Database connection pool status', {
        totalConnections: poolInfo[0].total_connections,
        activeConnections: poolInfo[0].active_connections,
        idleConnections: poolInfo[0].idle_connections,
      });

    } catch (error) {
      logger.error('Failed to configure connection pool:', error);
    }
  }

  /**
   * Log query performance metrics
   */
  logQueryPerformance(event) {
    const duration = parseFloat(event.duration);
    const query = event.query.replace(/\s+/g, ' ').trim();

    // Track slow queries
    if (duration > this.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        duration: `${duration}ms`,
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        timestamp: new Date().toISOString(),
      });
    }

    // Update query metrics
    const key = this.getQueryKey(query);
    const metrics = this.queryMetrics.get(key) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
    };

    metrics.count++;
    metrics.totalDuration += duration;
    metrics.avgDuration = metrics.totalDuration / metrics.count;
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.minDuration = Math.min(metrics.minDuration, duration);

    this.queryMetrics.set(key, metrics);
  }

  /**
   * Get a normalized key for query grouping
   */
  getQueryKey(query) {
    // Normalize query by removing parameters and extra whitespace
    return query
      .replace(/\$\d+/g, '?') // Replace $1, $2, etc. with ?
      .replace(/'[^']*'/g, '?') // Replace string literals with ?
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics() {
    const metrics = {};
    for (const [query, stats] of this.queryMetrics.entries()) {
      metrics[query] = {
        ...stats,
        avgDuration: Math.round(stats.avgDuration * 100) / 100,
        maxDuration: Math.round(stats.maxDuration * 100) / 100,
        minDuration: Math.round(stats.minDuration * 100) / 100,
      };
    }
    return metrics;
  }

  /**
   * Analyze and suggest database optimizations
   */
  async analyzeDatabase() {
    const prisma = await this.initializePrisma();

    try {
      const analysis = {
        tableStats: {},
        indexStats: {},
        recommendations: [],
        timestamp: new Date().toISOString(),
      };

      // Analyze table statistics
      const tables = ['User', 'Product', 'Order', 'Bid', 'Delivery', 'Review'];
      for (const table of tables) {
        const stats = await this.getTableStats(prisma, table);
        analysis.tableStats[table] = stats;
      }

      // Analyze index usage
      analysis.indexStats = await this.getIndexStats(prisma);

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      logger.info('Database analysis completed', { analysis });
      return analysis;

    } catch (error) {
      logger.error('Database analysis failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Get table statistics
   */
  async getTableStats(prisma, tableName) {
    try {
      const stats = await prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        WHERE tablename = ${tableName.toLowerCase()};
      `;

      return stats[0] || {};
    } catch (error) {
      logger.warn(`Failed to get stats for table ${tableName}:`, error.message);
      return {};
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexStats(prisma) {
    try {
      const indexStats = await prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC;
      `;

      return indexStats;
    } catch (error) {
      logger.warn('Failed to get index stats:', error.message);
      return [];
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Check for unused indexes
    const unusedIndexes = analysis.indexStats.filter(idx => idx.index_scans === '0');
    if (unusedIndexes.length > 0) {
      recommendations.push({
        type: 'unused_indexes',
        priority: 'medium',
        message: `Found ${unusedIndexes.length} potentially unused indexes`,
        details: unusedIndexes.map(idx => idx.indexname),
      });
    }

    // Check for tables needing vacuum
    for (const [tableName, stats] of Object.entries(analysis.tableStats)) {
      if (stats.dead_rows > stats.live_rows * 0.1) { // More than 10% dead rows
        recommendations.push({
          type: 'vacuum_needed',
          priority: 'high',
          message: `Table ${tableName} has high dead tuple ratio (${stats.dead_rows}/${stats.live_rows})`,
          action: 'Consider running VACUUM on this table',
        });
      }
    }

    // Check for missing indexes based on query patterns
    const queryMetrics = this.getQueryMetrics();
    const slowQueries = Object.entries(queryMetrics)
      .filter(([_, metrics]) => metrics.avgDuration > this.slowQueryThreshold)
      .slice(0, 5); // Top 5 slowest

    if (slowQueries.length > 0) {
      recommendations.push({
        type: 'slow_queries',
        priority: 'high',
        message: `Found ${slowQueries.length} slow queries averaging >${this.slowQueryThreshold}ms`,
        details: slowQueries.map(([query, metrics]) => ({
          query: query.substring(0, 100) + '...',
          avgDuration: metrics.avgDuration,
          count: metrics.count,
        })),
      });
    }

    return recommendations;
  }

  /**
   * Execute database maintenance tasks
   */
  async performMaintenance() {
    const prisma = await this.initializePrisma();

    try {
      logger.info('Starting database maintenance...');

      // Analyze tables for query planning
      await prisma.$executeRaw`ANALYZE;`;

      // Vacuum analyze for dead tuple cleanup
      await prisma.$executeRaw`VACUUM ANALYZE;`;

      logger.info('Database maintenance completed successfully');
    } catch (error) {
      logger.error('Database maintenance failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Create performance monitoring middleware
   */
  createPerformanceMiddleware() {
    return async (req, res, next) => {
      const start = Date.now();
      const originalSend = res.send;

      res.send = function(data) {
        const duration = Date.now() - start;

        // Log slow API responses
        if (duration > 1000) { // 1 second
          logger.warn('Slow API response', {
            method: req.method,
            url: req.url,
            duration: `${duration}ms`,
            userId: req.user?.id,
            requestId: req.id,
          });
        }

        originalSend.call(this, data);
      };

      next();
    };
  }
}

module.exports = new DatabaseOptimizer();