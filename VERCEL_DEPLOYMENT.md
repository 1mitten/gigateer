# 🚀 Vercel Deployment Guide for Gigateer

## ✅ Pre-Deployment Checklist

- [x] ✅ **vercel.json** configured for monorepo structure
- [x] ✅ **.vercelignore** excludes unnecessary files
- [x] ✅ **Root directory** set to `apps/web`
- [x] ✅ **Build commands** properly configured
- [x] ✅ **Environment variables** removed from code

## 📁 Project Structure for Vercel

Vercel will deploy from your monorepo with this structure:
```
gigateer/ (repository root)
├── vercel.json          # Vercel configuration
├── .vercelignore        # Files to exclude
├── apps/
│   └── web/            # Next.js app (deployment root)
│       ├── package.json
│       ├── next.config.js
│       └── src/
└── packages/
    └── contracts/      # Shared dependency (built first)
```

## 🔧 Vercel Configuration

The `vercel.json` at the repository root configures:

```json
{
  "buildCommand": "pnpm --filter @gigateer/contracts build && pnpm --filter @gigateer/web build",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next",
  "rootDirectory": "apps/web",
  "ignoreCommand": "git diff HEAD^ HEAD --quiet -- apps/web packages/contracts"
}
```

### What this does:
- **buildCommand**: Builds contracts package first, then the web app
- **rootDirectory**: Points Vercel to the Next.js app location
- **ignoreCommand**: Only rebuilds when web app or contracts package changes
- **framework**: Tells Vercel this is a Next.js application

## 🌐 Environment Variables (Required in Vercel Dashboard)

### Step 1: Go to Vercel Dashboard → Project Settings → Environment Variables

### Step 2: Add these required variables:

```bash
# Database (REQUIRED)
MONGODB_CONNECTION_STRING=mongodb+srv://your-connection-string
MONGODB_DATABASE_NAME=gigateer

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_PWA_ENABLED=true
NEXT_PUBLIC_CACHE_TTL=300000

# Production Environment
NODE_ENV=production
```

⚠️ **IMPORTANT**: Never commit these values to your repository!

## 📝 Deployment Steps

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from repository root
vercel

# Follow prompts:
# - Set up and deploy: Yes
# - Which scope: Your account
# - Link to existing project: No (first time) / Yes (subsequent)
# - Project name: gigateer-web
# - Root directory: apps/web
# - Override settings: No
```

### Option 2: Deploy via GitHub Integration

1. **Connect GitHub Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Select the repository

2. **Configure Project**
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: (leave default, uses vercel.json)
   - **Install Command**: (leave default, uses vercel.json)

3. **Add Environment Variables**
   - Click "Environment Variables"
   - Add all required variables from above
   - Deploy!

## 🔄 Automatic Deployments

Once configured, Vercel will automatically deploy:
- **Production**: Every push to `main` branch
- **Preview**: Every pull request

To control deployments, the `ignoreCommand` in vercel.json ensures:
- Only deploys when `apps/web/` or `packages/contracts/` changes
- Ignores changes to scrapers, documentation, etc.

## 🎯 Deployment Optimization

### Build Performance
- Uses `pnpm` with frozen lockfile for fast, consistent installs
- Builds only necessary packages (contracts + web)
- Caches dependencies between builds

### Runtime Performance
- Static pages pre-rendered at build time
- API routes with 30-second timeout
- PWA enabled for offline support
- Optimized images with Next.js Image component

## 🔍 Post-Deployment Verification

### 1. Check Build Logs
- Verify both packages built successfully
- Check for any warnings or errors
- Confirm static pages generated

### 2. Test Application
```bash
# Your deployment URLs:
https://gigateer-web.vercel.app          # Production
https://gigateer-web-git-main.vercel.app # Main branch
https://gigateer-web-pr-*.vercel.app     # PR previews
```

### 3. Verify Features
- [ ] Homepage loads with gig data
- [ ] City pages work (e.g., /bristol, /london)
- [ ] API endpoints respond (`/api/gigs`)
- [ ] PWA installs correctly
- [ ] MongoDB connection works

## 🚨 Troubleshooting

### "Module not found" errors
```bash
# Ensure package.json has correct workspace reference:
"@gigateer/contracts": "workspace:*"
```

### Environment variables not working
- Check they're added in Vercel Dashboard
- Redeploy after adding variables
- Use correct naming (NEXT_PUBLIC_* for client-side)

### Build fails with pnpm
- Ensure `packageManager` field in root package.json
- Vercel auto-detects pnpm from pnpm-lock.yaml

### MongoDB connection fails
- Verify MONGODB_CONNECTION_STRING is set
- Check MongoDB Atlas allows Vercel IPs (or use 0.0.0.0/0)
- Ensure database name is correct

## 📊 Monitoring

### Vercel Analytics (Built-in)
- Real User Metrics
- Web Vitals scores
- Geographic distribution

### Function Logs
```bash
# View in Vercel Dashboard → Functions tab
# Or use Vercel CLI:
vercel logs
```

### MongoDB Atlas Monitoring
- Check connection count
- Monitor query performance
- Set up alerts for issues

## 🔐 Security Notes

1. **Environment Variables**: Set in Vercel Dashboard only
2. **MongoDB Access**: Configure IP whitelist or use connection string with credentials
3. **API Routes**: Implement rate limiting (already configured)
4. **CORS**: Configure as needed in next.config.js

## 🎉 Success!

Once deployed, your app will be:
- **Globally distributed** via Vercel's Edge Network
- **Auto-scaling** based on traffic
- **Monitored** with built-in analytics
- **Secure** with HTTPS by default
- **Fast** with optimized caching

---

**Need help?** Check the [Vercel Documentation](https://vercel.com/docs) or your deployment logs in the Vercel Dashboard.