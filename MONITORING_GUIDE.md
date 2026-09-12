# Error Monitoring & Logging Guide

## Overview
KODO implements comprehensive error monitoring and structured logging for production observability.

---

## 1. Error Monitoring with Sentry

### Setup

#### Step 1: Create Sentry Account
- Visit [sentry.io](https://sentry.io)
- Sign up for free account
- Create new project for Node.js/Express

#### Step 2: Configure Environment
```bash
# In .env.production
SENTRY_DSN=https://YOUR_KEY@sentry.io/YOUR_PROJECT_ID
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

#### Step 3: Initialize
Sentry is automatically initialized when the app starts:
```javascript
// In errorMonitoring.js
const Sentry = require('@sentry/node');
errorMonitoring.initializeSentry();
```

### Features

#### Error Tracking
- **Automatic capture**: All uncaught exceptions
- **Manual capture**: `Sentry.captureException(error)`
- **Messages**: `Sentry.captureMessage(message)`

#### Performance Monitoring
```javascript
const transaction = Sentry.startTransaction({
  name: 'API Request',
  op: 'http.server'
});

// ... do work ...

transaction.finish();
```

#### User Context
```javascript
// When user logs in
Sentry.setUser({
  id: userId,
  email: user.email,
  username: user.username,
});

// When user logs out
Sentry.setUser(null);
```

#### Breadcrumbs (Event Trail)
```javascript
Sentry.addBreadcrumb({
  message: 'User navigated to checkout',
  category: 'user',
  level: 'info',
});
```

### Sampling Rates
```javascript
// Traces sampling (% of transactions to monitor)
SENTRY_TRACES_SAMPLE_RATE=0.1  // 10% - good for production

// Error sampling (all errors always captured)
// No configuration needed - 100% by default
```

### Filtering Events
Unwanted events can be filtered in `beforeSend`:
```javascript
beforeSend(event, hint) {
  // Filter out 404 errors
  if (event.request?.status === 404) {
    return null;
  }
  return event;
}
```

### Alerts
Set up in Sentry dashboard:
- **Error rate threshold**: Alert if > 5 errors/minute
- **Performance degradation**: Alert if response time > 2s
- **New issues**: Notify on first occurrence

---

## 2. Structured Logging

### Log Levels
```javascript
logger.error(message)     // Critical errors
logger.warn(message)      // Warnings
logger.info(message)      // General info
logger.http(message)      // HTTP requests
logger.debug(message)     // Debug info
```

### Log Locations
```bash
logs/
├── error-YYYY-MM-DD.log      # Only errors
├── combined-YYYY-MM-DD.log   # All logs
├── http-YYYY-MM-DD.log       # HTTP requests
└── archives/                 # Compressed old logs
```

### Log Rotation
- **Size**: Rotate when file > 50-100MB
- **Age**: Keep logs for 30 days
- **Compression**: Automatically gzip old logs
- **Retention**: Configurable per log type

### Structured Logging Usage

#### Basic Logging
```javascript
const { logger } = require('./src/lib/productionLogger');

logger.info('User registered', {
  userId: user.id,
  email: user.email,
  source: 'web'
});
```

#### Database Operations
```javascript
logger.logDatabaseOperation('SELECT', queryString, duration_ms, {
  table: 'users',
  rowCount: 1000
});
```

#### API Calls
```javascript
logger.logApiCall('POST', '/api/orders', 201, duration_ms, {
  userId: req.user.id,
  amount: order.total
});
```

#### Authentication Events
```javascript
logger.logAuthEvent('login_success', userId, {
  ip: req.ip,
  userAgent: req.get('user-agent')
});
```

#### Error Logging
```javascript
logger.error('Payment processing failed', error, {
  orderId: order.id,
  amount: order.total,
  provider: 'stripe'
});
```

### Child Loggers
```javascript
// Create contextual logger
const orderLogger = logger.child({
  context: 'orders',
  orderId: order.id
});

orderLogger.info('Order processing started');
// Automatically includes orderId in all logs
```

---

## 3. Log Analysis

### View Recent Errors
```bash
# Last 50 errors
tail -50 logs/error-$(date +%Y-%m-%d).log

# Stream live errors
tail -f logs/error-$(date +%Y-%m-%d).log
```

### Search Logs
```bash
# Find all errors for user ID
grep "userId: 12345" logs/combined-*.log

# Find slow queries
grep "duration_ms" logs/combined-*.log | awk '{print $(NF-1)}' | sort -n | tail -10

# Count errors by type
grep "error" logs/error-*.log | cut -d' ' -f3 | sort | uniq -c | sort -rn
```

### Parse JSON Logs
```bash
# Extract user IDs from logs
cat logs/combined-*.log | jq '.userId' | sort | uniq

# Get error distribution
cat logs/error-*.log | jq '.level' | sort | uniq -c
```

---

## 4. Monitoring Dashboards

### Recommended Services
- **Sentry**: Error tracking & performance
- **DataDog**: Log aggregation & monitoring
- **LogRocket**: Frontend errors & session replay
- **New Relic**: APM & infrastructure

### Key Metrics to Monitor
1. **Error Rate**: Errors per minute / total requests
2. **Response Time**: P50, P95, P99 latencies
3. **Database Queries**: Slow query log
4. **API Endpoints**: Most used, slowest
5. **User Engagement**: Active users, sessions
6. **System Health**: Memory, CPU, disk usage

### Set Up DataDog (Example)
```bash
# 1. Install agent
npm install --save @datadog/browser-rum

# 2. Initialize in client
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'YOUR_APP_ID',
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'kodo-web',
  env: 'production',
  sessionSampleRate: 100,
});

datadogRum.startSessionReplayRecording();

# 3. View in DataDog dashboard
```

---

## 5. Alerts & Notifications

### Create Alerts for

#### Critical Issues
- Unhandled exceptions
- Database connection failures
- Payment processing errors
- Authentication failures

#### Performance Issues
- Response time > 2 seconds (P95)
- Database query > 5 seconds
- Memory usage > 80%
- Disk usage > 90%

#### Security Issues
- Failed login attempts > 10/minute
- CORS rejections > 50/hour
- Rate limit violations > 100/hour

### Alert Channels
```javascript
// Sentry integrations
- Slack: #errors-critical
- Email: ops@kodo.com
- PagerDuty: for critical incidents
- Webhook: custom integrations
```

---

## 6. Incident Response

### When Errors Spike
1. **Check Dashboard**: Review error types & frequency
2. **Review Recent Changes**: Check deployment history
3. **Examine Logs**: Look for patterns in logs
4. **Identify Affected Users**: How many users impacted?
5. **Rollback if Critical**: Revert last deployment
6. **Communicate**: Notify team on Slack

### Error Triage Template
```
Error: [Error Type]
Severity: [Critical/High/Medium/Low]
Affected: [Number] users / [Time Period]
Root Cause: [Description]
Fix: [Action Taken]
Prevention: [Future improvements]
```

---

## 7. Performance Tuning

### Reduce Log Volume
```javascript
// In .env.production
LOG_LEVEL=warn              // Don't log debug/info
SENTRY_TRACES_SAMPLE_RATE=0.05  // 5% sampling

// Exclude noisy endpoints
beforeSend(event) {
  if (event.request?.url?.includes('/health')) {
    return null;
  }
}
```

### Optimize Log Storage
```bash
# Compress old logs weekly
0 2 * * 0 gzip logs/combined-*.log

# Delete logs older than 30 days
0 3 * * * find logs -name "*.gz" -mtime +30 -delete
```

### Database Optimization
```javascript
// Index important fields for fast log searches
CREATE INDEX idx_logs_userId ON logs(userId);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_level ON logs(level);
```

---

## 8. Compliance & Privacy

### Data Retention
- **Error logs**: Keep 30 days
- **HTTP logs**: Keep 7 days
- **Audit logs**: Keep 1 year (compliance)

### PII Redaction
```javascript
// Automatically redact sensitive data
beforeSend(event) {
  if (event.request?.cookies) {
    delete event.request.cookies; // Remove cookies
  }
  return event;
}
```

### GDPR Compliance
- User can request log deletion
- Implement data retention policies
- Anonymize logs after 30 days

---

## 9. Troubleshooting

### Sentry Not Capturing Errors
```javascript
// Check initialization
if (!process.env.SENTRY_DSN) {
  console.warn('Sentry DSN not set');
}

// Manually test
Sentry.captureMessage('Test message');
```

### Missing Logs
```bash
# Check log file exists
ls -la logs/

# Check directory permissions
chmod 755 logs/

# Check disk space
df -h
```

### High Log Volume
1. Increase `LOG_LEVEL` to `warn`
2. Reduce `SENTRY_TRACES_SAMPLE_RATE`
3. Filter noisy endpoints
4. Implement log batching

---

## 10. Production Checklist

- [ ] Sentry DSN configured
- [ ] Log directory created with proper permissions
- [ ] Log rotation enabled
- [ ] Monitoring dashboard set up
- [ ] Alert channels configured
- [ ] Alert thresholds tuned
- [ ] Team trained on log analysis
- [ ] Incident response plan documented
- [ ] Data retention policies set
- [ ] Backup of logs configured

