# KODO Vercel Deployment Guide

Complete guide for deploying KODO to Vercel with serverless functions.

---

## 📋 Prerequisites

- [x] GitHub account with repository access
- [x] Vercel account (free or paid)
- [x] PostgreSQL database (managed service like Neon, Supabase, AWS RDS)
- [x] Redis instance (optional, for caching)
- [x] All API keys/credentials ready

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Fork/Push Repository to GitHub

```bash
cd c:\Git\KODO
git remote -v  # Verify you have origin pointing to your repo
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to https://vercel.com/new
2. Import GitHub repository (select KODO)
3. Vercel auto-detects it's a monorepo
4. Click "Deploy"

### Step 3: Add Environment Variables

After deployment starts:

1. Go to **Project Settings** → **Environment Variables**
2. Add variables from `.env.vercel.example`
3. Mark sensitive variables as **Sensitive**

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click the failed deployment
3. Click **Redeploy** (now with env vars)

---

## 📊 Complete Setup (30 Minutes)

### Phase 1: Prepare Database

**Option A: Neon (Recommended)**
```
1. Go to https://neon.tech
2. Create account
3. Create new project
4. Get connection string
5. Update DATABASE_URL in Vercel
```

**Option B: Supabase**
```
1. Go to https://supabase.com
2. Create project
3. Go to Settings → Database
4. Copy connection string
5. Update DATABASE_URL in Vercel
```

**Option C: AWS RDS**
```
1. Create PostgreSQL instance in AWS
2. Get connection string
3. Update DATABASE_URL in Vercel
```

### Phase 2: Set Up Payment Processing

**Stripe Setup**
```
1. Create Stripe account: https://stripe.com
2. Get live API keys
3. Add to Vercel:
   STRIPE_SECRET_KEY
   STRIPE_PUBLISHABLE_KEY
   STRIPE_WEBHOOK_SECRET
```

### Phase 3: Set Up Email Service

**SendGrid Setup**
```
1. Create SendGrid account: https://sendgrid.com
2. Create API key
3. Add to Vercel:
   SENDGRID_API_KEY
   SENDGRID_FROM_EMAIL
```

### Phase 4: Set Up Error Monitoring

**Sentry Setup**
```
1. Create Sentry account: https://sentry.io
2. Create new project
3. Get DSN
4. Add to Vercel:
   SENTRY_DSN
   SENTRY_AUTH_TOKEN
```

### Phase 5: Connect GitHub for Auto-Deploy

1. In Vercel: **Settings** → **Git Integration**
2. Connected branch: `main`
3. Production branch: `main`
4. Auto-deploy on push: **Enabled**

---

## 🔧 Environment Variables Setup

### Create `.env.vercel` in root:

```bash
# Copy template
cp .env.vercel.example .env.vercel

# Edit with your values
nano .env.vercel
```

### Add to Vercel Dashboard:

**Project Settings** → **Environment Variables**

```
DATABASE_URL = postgresql://user:pass@host/db
REDIS_URL = redis://user:pass@host:6379
JWT_SECRET = [generate random 256-bit string]
STRIPE_SECRET_KEY = sk_live_xxx
SENDGRID_API_KEY = SG.xxx
SENTRY_DSN = https://xxx@sentry.io/xxx
MAPBOX_TOKEN = pk_xxx
CLOUDINARY_NAME = xxx
CLOUDINARY_API_KEY = xxx
CLOUDINARY_API_SECRET = xxx
```

---

## 🏗️ Monorepo Structure

```
kodo/
├── api/
│   └── index.js          # Vercel serverless entry point
├── client/               # Vue 3 frontend
│   ├── src/
│   ├── dist/             # Built frontend
│   ├── package.json
│   └── vite.config.js
├── server/               # Express backend
│   ├── server.js         # Main server entry
│   ├── app.js            # Express app
│   ├── package.json
│   └── prisma/
├── package.json          # Root monorepo package
├── vercel.json           # Vercel configuration
└── .vercelignore         # Files to ignore
```

---

## 🚀 Deployment Process

### Automatic Deployment (On GitHub Push)

```bash
git push origin main
# Vercel automatically:
# 1. Triggers build
# 2. Runs build:vercel script
# 3. Builds client frontend
# 4. Deploys to https://[project].vercel.app
```

### Manual Deployment

**Via Vercel CLI:**
```bash
# Install CLI
npm install -g vercel

# Deploy from project root
vercel deploy --prod

# Deploy with environment variables
vercel env pull  # Pull from Vercel
vercel deploy --prod
```

---

## 📝 Build Configuration

### Root `package.json` Scripts

```json
{
  "scripts": {
    "build:vercel": "npm run build:client",
    "build:client": "cd client && npm install && npm run build",
    "build:server": "cd server && npm install"
  }
}
```

### Vercel `vercel.json`

```json
{
  "buildCommand": "npm run build:vercel",
  "functions": {
    "api/index.js": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

---

## 🌐 API Endpoints

After deployment, your API is available at:

```
https://[your-project].vercel.app/api/*

Examples:
- https://kodo.vercel.app/api/auth/register
- https://kodo.vercel.app/api/products
- https://kodo.vercel.app/api/orders
```

### Frontend Access

```
https://[your-project].vercel.app/

Examples:
- https://kodo.vercel.app/
- https://kodo.vercel.app/products
- https://kodo.vercel.app/dashboard
```

---

## 🔐 Security Configuration

### Environment Variables (Sensitive)

Mark as **Sensitive** in Vercel:
- `DATABASE_URL`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `SENDGRID_API_KEY`
- `SENTRY_AUTH_TOKEN`
- `CLOUDINARY_API_SECRET`

### CORS Configuration

Update in `server/src/middleware/securityProduction.js`:

```javascript
const allowedOrigins = [
  'https://your-domain.vercel.app',
  'https://your-custom-domain.com',
  'http://localhost:3000' // Development only
];
```

### Rate Limiting

Already configured in production:
- Auth endpoints: 5 requests/15 min
- API endpoints: 100 requests/15 min
- Admin endpoints: 10 requests/15 min

---

## 🧪 Testing After Deployment

### Health Check

```bash
curl https://kodo.vercel.app/api/health
# Expected: { "status": "healthy" }
```

### Create Test User

```bash
curl -X POST https://kodo.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "role": "buyer"
  }'
# Expected: 201 Created with token
```

### Test API Endpoints

```bash
# Get products
curl https://kodo.vercel.app/api/products

# Get dashboard (with token)
curl -H "Authorization: Bearer <token>" \
  https://kodo.vercel.app/api/protected/dashboard
```

---

## 🔍 Monitoring & Logs

### View Vercel Logs

1. Go to **Deployments** in Vercel
2. Click latest deployment
3. View **Function logs** and **Build logs**

### View Application Logs

Via Sentry dashboard: https://sentry.io

```
- Error tracking
- Performance monitoring
- User context
```

### Database Logs

Via your database provider:
- Neon: https://console.neon.tech
- Supabase: https://app.supabase.com

---

## 🚨 Troubleshooting

### Build Fails

**Issue**: `npm ERR! code ENOENT`

**Solution**:
```bash
# Check vercel.json buildCommand
# Ensure root package.json has build:vercel script
# Verify all dependencies installed
```

### API Returns 502

**Issue**: Serverless function timeout or error

**Solution**:
```bash
# Check Vercel logs
# Check database connection
# Check environment variables are set
# Increase maxDuration in vercel.json
```

### Database Connection Fails

**Issue**: `Error: connect ECONNREFUSED`

**Solution**:
```bash
# Verify DATABASE_URL in Vercel env vars
# Check database is running
# Check network is not blocking connection
# Verify connection string format
```

### CORS Errors

**Issue**: `Access to XMLHttpRequest blocked by CORS`

**Solution**:
```bash
# Update allowedOrigins in securityProduction.js
# Add your Vercel domain
# Redeploy
```

### Out of Memory

**Issue**: Serverless function crashes

**Solution**:
```json
// In vercel.json
{
  "functions": {
    "api/index.js": {
      "memory": 3008  // Increase from 1024
    }
  }
}
```

---

## 📊 Performance Optimization

### Frontend Optimization (Already Done)
- ✅ Route-based code splitting
- ✅ Lazy loading components
- ✅ Gzip compression
- ✅ Image optimization

### Backend Optimization
- ✅ Database indexes
- ✅ Redis caching
- ✅ Pagination
- ✅ Field selection

### Vercel Optimization
```json
{
  "functions": {
    "api/index.js": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

Increase `maxDuration` if you have long-running operations (max 300s for Pro plan)

---

## 🔄 Continuous Deployment

### GitHub Auto-Deploy

Every push to `main` automatically:
1. Triggers Vercel build
2. Runs `npm run build:vercel`
3. Builds frontend
4. Deploys to preview URL
5. Merges to main → Deploy to production

### Preview Deployments

Each PR creates preview deployment:
```
https://kodo-pr-123.vercel.app
```

---

## 📱 Custom Domain

### Add Custom Domain

1. In Vercel: **Settings** → **Domains**
2. Add your domain: `kodo.com`
3. Update DNS records (Vercel shows instructions)
4. Wait for DNS propagation (5-48 hours)

### Update Environment Variables

After adding domain, update:
```
API_URL=https://kodo.com
FRONTEND_URL=https://kodo.com
CORS_ORIGIN=https://kodo.com
```

---

## 📚 Useful Links

- **Vercel Docs**: https://vercel.com/docs
- **Express on Vercel**: https://vercel.com/docs/frameworks/express
- **Environment Variables**: https://vercel.com/docs/projects/environment-variables
- **Functions**: https://vercel.com/docs/functions/serverless-functions
- **Analytics**: https://vercel.com/docs/analytics

---

## ✅ Deployment Checklist

Before going live:

- [ ] GitHub repo connected to Vercel
- [ ] All environment variables added
- [ ] Database connected and migrations run
- [ ] Build successful
- [ ] Health endpoint working
- [ ] Test user creation works
- [ ] Product browsing works
- [ ] Authentication works
- [ ] Admin panel accessible
- [ ] Error monitoring active (Sentry)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate auto-enabled
- [ ] Monitoring dashboard set up
- [ ] Team notified

---

## 🎉 Success Criteria

✅ Deployment is successful when:

1. **Build**: Vercel build completes without errors
2. **Frontend**: https://kodo.vercel.app loads
3. **API**: https://kodo.vercel.app/api/health returns 200
4. **Database**: Can read/write data
5. **Auth**: User registration/login works
6. **Roles**: All 4 user roles accessible
7. **Flows**: Critical flows working
8. **Monitoring**: Errors tracked in Sentry
9. **Performance**: Response times < 500ms
10. **Security**: HTTPS, headers, CORS all working

---

## 🔗 Next Steps

1. Connect GitHub repository
2. Add environment variables
3. Run build and verify
4. Test all endpoints
5. Configure custom domain (optional)
6. Set up monitoring
7. Deploy to production

**Your KODO app is now live on Vercel! 🚀**

