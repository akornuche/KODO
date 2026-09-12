# ⚠️ IMMEDIATE ACTION REQUIRED

**Severity**: 🔴 **CRITICAL**  
**Issue**: Exposed Mapbox API token in Git history  
**Status**: ✅ Code fixed, now needs credentials rotation

---

## 🚨 What Happened

A Mapbox API token was hardcoded in the source code and accidentally committed to Git:

```
File: client/src/views/deliveries/DeliveryTrackingView.vue
Line: 558
Token: pk.eyJ1IjoiYWtvcm51Y2hlIiwiYSI6ImNtM3p5ZG5zZjAxbG0yanF1dWF5dWF5ZG4ifQ.example_token_replace_with_real
```

**Impact**: Anyone with access to the repo can see this token and potentially:
- Use the token to make API calls on your behalf
- Incur charges for usage
- Access your Mapbox account

---

## ✅ What We Did

- [x] Removed hardcoded token from source code
- [x] Updated to use environment variables
- [x] Committed fix to Git
- [x] Created security documentation

---

## 🔴 What YOU MUST DO NOW

### Step 1: Rotate the Mapbox Token (5 minutes)

**Go to**: https://account.mapbox.com/tokens/

1. Sign in to your Mapbox account
2. Find the token: `pk.eyJ1IjoiYWtvcm51Y2hlIiwiYSI6ImNtM3p5ZG5zZjAxbG0yanF1dWF5dWF5ZG4ifQ...`
3. Click **Delete** to revoke it
4. Click **Create a token** to create a new one
5. Name it: `KODO_PRODUCTION`
6. Permissions: `Maps:Read`, `Scopes:All`
7. Copy the new token

### Step 2: Update Environment Variables

#### Option A: Vercel Dashboard (Recommended for Production)

1. Go to: https://vercel.com/dashboard
2. Select your KODO project
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_MAPBOX_TOKEN`
5. Update value with the new token from Step 1
6. Click **Save**

#### Option B: Local .env Files (for Development)

1. Update `.env.production`:
   ```
   VITE_MAPBOX_TOKEN=pk.eyJ1IjoiYWtvcm51Y2hlIi[NEW_TOKEN_HERE]
   ```

2. Update `.env.development`:
   ```
   VITE_MAPBOX_TOKEN=pk.test_[YOUR_TEST_TOKEN]
   ```

### Step 3: Redeploy

**Vercel Auto-Deploy**:
```bash
git pull origin main
# Wait for automatic Vercel deployment
# Check: https://vercel.com/dashboard → kodo → Deployments
```

**Manual Redeploy**:
```bash
vercel deploy --prod
```

### Step 4: Verify

Test that delivery tracking still works:

```bash
# 1. Go to your app
https://kodo.vercel.app/orders/[ANY_ORDER_ID]/track

# 2. Check browser console for errors
# Should NOT see: "Mapbox token is undefined"

# 3. Try moving the map
# Should work without errors
```

---

## 📊 Verification Checklist

- [ ] Logged into Mapbox account
- [ ] Old token deleted (revoked)
- [ ] New token created and copied
- [ ] Vercel environment variable updated
- [ ] Redployed to production
- [ ] Tested delivery tracking page
- [ ] No console errors
- [ ] Map loads and interacts properly

---

## ⏰ Timeline

| Step | Time | Status |
|------|------|--------|
| Code fix | ✅ Done | Complete |
| Push to Git | ✅ Done | Complete |
| **Rotate Mapbox token** | ⏳ **URGENT** | **DO THIS NOW** |
| **Update Vercel env** | ⏳ **URGENT** | **DO THIS NOW** |
| **Redeploy** | ⏳ **URGENT** | **DO THIS NOW** |
| Test and verify | ⏳ Next | After redeploy |

---

## 🎯 Impact If You Don't Do This

**High Risk**:
- ❌ Delivery tracking won't work (map fails to load)
- ❌ Users see broken delivery tracking page
- ❌ Production is DOWN for that feature

**Security Risk**:
- ❌ Old token still exposed in Git history
- ❌ Someone could abuse the token
- ❌ Mapbox charges could spike

---

## 🆘 If You Get Stuck

### "I don't have Mapbox account access"
→ Contact: who@your-organization.com (whoever owns the account)

### "Map still shows errors after update"
→ Check:
1. Is new token in Vercel? `Settings → Environment Variables`
2. Did you redeploy? `Check Deployments tab`
3. Did you clear browser cache? `Ctrl+Shift+Delete`

### "Getting 401 Mapbox errors"
→ Token is still wrong/old:
1. Delete the wrong token from Mapbox account
2. Create new one
3. Copy exact new token value
4. Update in Vercel
5. Redeploy

### "Map works but with different styling"
→ Normal (different token = different style). This is fine.

---

## 📞 Quick Contacts

- **Mapbox Support**: https://support.mapbox.com
- **Vercel Support**: https://vercel.com/help
- **Your Team**: #security on Slack

---

## ✅ Success Criteria

You're done when:
- ✅ Old Mapbox token is deleted
- ✅ New Mapbox token is generated
- ✅ Vercel env var is updated
- ✅ Production is redeployed
- ✅ Delivery tracking page loads without errors
- ✅ Map renders and is interactive

---

## 📋 Security Documentation

For full details, see:
- `SECURITY_INCIDENT_REMEDIATION.md` (what happened & why)
- `VERCEL_DEPLOYMENT_GUIDE.md` (how to manage env vars)
- `.env.example` (example environment variables)

---

## ⏱️ Estimated Time: 10-15 minutes

**Please do this immediately.**

Questions? Check `SECURITY_INCIDENT_REMEDIATION.md` for full details.

