# Production Security Configuration Guide

## Overview
KODO implements comprehensive security hardening for production deployments including CORS, security headers, rate limiting, and input validation.

---

## 1. CORS Configuration

### Purpose
Controls which origins can access the API, preventing unauthorized cross-origin requests.

### Configuration
```javascript
// In .env.production
CORS_ALLOWED_ORIGINS=https://app.kodo.com,https://www.kodo.com
```

### Features
- ✅ Validates origin header
- ✅ Allows mobile apps (no origin header)
- ✅ Configurable allowed methods
- ✅ Exposes rate limit headers
- ✅ Credentials support enabled

### When to Update
Add new domains when:
- Launching mobile apps
- Adding subdomains
- Integrating third-party services
- Setting up staging/preview environments

---

## 2. Security Headers (Helmet.js)

### Content Security Policy (CSP)
```
default-src 'self'
script-src 'self', 'unsafe-inline', cdn.jsdelivr.net
style-src 'self', 'unsafe-inline', fonts.googleapis.com
```

**Purpose**: Prevents XSS attacks and injection vulnerabilities

### HTTP Strict Transport Security (HSTS)
```
max-age: 31536000 (1 year)
includeSubDomains: true
preload: true
```

**Purpose**: Forces HTTPS connections, prevents downgrade attacks

### X-Frame-Options
```
DENY
```

**Purpose**: Prevents clickjacking by blocking framing

### X-Content-Type-Options
```
nosniff
```

**Purpose**: Prevents MIME type sniffing

---

## 3. Rate Limiting

### Authentication Endpoints
```javascript
// Default: 5 requests per 15 minutes per IP
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=5
```

**Applies to**:
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/password-reset`

### General API Endpoints
```javascript
// Default: 100 requests per 15 minutes per IP
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Applies to**: All `/api/*` routes

### Tuning for Production
Adjust based on:
- Expected concurrent users
- API usage patterns
- CDN/proxy setup

Example for high-traffic:
```
RATE_LIMIT_AUTH_MAX_REQUESTS=10
RATE_LIMIT_MAX_REQUESTS=200
```

---

## 4. HTTPS & TLS

### Requirements
- Valid SSL/TLS certificate
- HTTPS enforced on production domain
- HSTS header enabled (1 year minimum)

### Configuration
```javascript
// Automatic HTTPS redirect in production
NODE_ENV=production
```

### Certificate Management
- **Self-Hosted**: Use Let's Encrypt + Certbot
- **Cloud Platform**: Use managed certificates (AWS ACM, Cloudflare)
- **Renewal**: Auto-renew 30 days before expiry

---

## 5. Input Validation & Sanitization

### Implemented Protections

#### SQL Injection
- ❌ Not applicable (using Prisma ORM)
- ✅ Protected by parameterized queries

#### NoSQL Injection
- ✅ MongoDB sanitization middleware
- ✅ Input validation on all endpoints

#### XSS Prevention
- ✅ HTML encoding in responses
- ✅ CSP headers restrict scripts
- ✅ Input sanitization removes harmful characters

#### CSRF
- ✅ CORS restrictions
- ✅ SameSite cookie policy

### Custom Sanitization Rules
```javascript
// Removes:
- Null bytes (\0)
- Control characters (\x00-\x1F, \x7F)
- Invalid UTF-8 sequences
```

---

## 6. Environment Variables for Security

### Critical - MUST CHANGE
```bash
# Authentication
JWT_SECRET=<generate: openssl rand -base64 32>
SESSION_SECRET=<generate: openssl rand -base64 32>

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
```

### Important - Configure for Production
```bash
# URLs
FRONTEND_URL=https://app.kodo.com
BACKEND_URL=https://api.kodo.com
CORS_ALLOWED_ORIGINS=https://app.kodo.com

# Security
NODE_ENV=production
LOG_LEVEL=warn
```

### Optional - Performance & Monitoring
```bash
# Redis (caching & sessions)
REDIS_URL=redis://:PASSWORD@redis-prod:6379

# Error tracking
SENTRY_DSN=https://YOUR_SENTRY_ID@sentry.io/PROJECT_ID
```

---

## 7. IP Whitelisting (Optional)

### When to Use
- Limiting admin endpoints to specific IPs
- Protecting sensitive operations
- Webhook validation

### Implementation
```javascript
// Add to middleware
const allowedAdminIPs = process.env.ADMIN_IPS?.split(',') || [];

const ipWhitelist = (req, res, next) => {
  if (req.path.startsWith('/api/admin')) {
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!allowedAdminIPs.includes(clientIP)) {
      return res.status(403).json({
        error: 'Access denied: IP not whitelisted'
      });
    }
  }
  next();
};
```

---

## 8. Monitoring & Alerts

### Critical Metrics
- ❌ Failed login attempts (spike)
- ❌ Rate limit violations
- ❌ CORS rejections
- ❌ Authentication errors
- ❌ Database errors

### Setup Monitoring
```javascript
// Sentry integration
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Alert Thresholds
- **Login failures**: > 10 in 5 minutes
- **Rate limit hits**: > 50 in 10 minutes
- **CORS rejections**: > 20 in 10 minutes

---

## 9. Production Checklist

- [ ] SSL/TLS certificate installed and valid
- [ ] HTTPS enforced (automatic redirect)
- [ ] JWT_SECRET changed to 32+ character random string
- [ ] CORS_ALLOWED_ORIGINS updated with production domain
- [ ] NODE_ENV set to `production`
- [ ] LOG_LEVEL set to `warn` or `error`
- [ ] Database connection verified
- [ ] Redis configured (optional but recommended)
- [ ] Sentry DSN configured for error tracking
- [ ] Rate limits tested under load
- [ ] Backups enabled and tested
- [ ] Monitoring & alerting configured
- [ ] Incident response plan documented

---

## 10. Incident Response

### Suspected Security Breach
1. **Immediate**: Enable verbose logging, increase monitoring
2. **Analysis**: Check logs for unauthorized access
3. **Containment**: Rotate compromised secrets
4. **Recovery**: Deploy patched version, restore from backups
5. **Notification**: Alert users if data compromised

### Severe Rate Limiting
1. Check for DDoS attack
2. Enable AWS WAF / Cloudflare protection
3. Increase rate limits temporarily for legitimate users
4. Identify malicious IPs for blocking

### Certificate Expiry
1. Auto-renewal should handle automatically
2. Manual renewal: `certbot renew`
3. Test renewal: `certbot renew --dry-run`

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

