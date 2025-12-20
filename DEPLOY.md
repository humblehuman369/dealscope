# InvestIQ Deployment Guide

## 🚀 Quick Deploy (Recommended)

### Option 1: Railway (Backend) + Vercel (Frontend)

This is the fastest way to get live. Free tiers available for both.

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### 1.2 Deploy Backend
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub and select/create the investiq repo
4. Select the `backend` folder as root directory

### 1.3 Configure Environment Variables
In Railway dashboard, go to **Variables** tab and add:

```
APP_NAME=InvestIQ
APP_VERSION=1.0.0
DEBUG=false

# RentCast API (https://app.rentcast.io/app/api)
RENTCAST_API_KEY=your_key_here
RENTCAST_URL=https://api.rentcast.io/v1

# AXESSO API (https://rapidapi.com/axesso/api/axesso-zillow-data-api)
AXESSO_API_KEY=your_key_here
AXESSO_URL=https://api.axesso.de/zil

# Security
SECRET_KEY=generate-with-openssl-rand-hex-32

# CORS - Add your Vercel URL after deploying frontend
CORS_ORIGINS=["https://your-app.vercel.app","http://localhost:3000"]
```

### 1.4 Get Your Backend URL
After deployment, Railway provides a URL like:
```
https://investiq-api-production.up.railway.app
```

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### 2.2 Deploy Frontend
1. Click **"Add New Project"**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Framework Preset: **Next.js**

### 2.3 Configure Environment Variables
In Vercel dashboard, go to **Settings > Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://investiq-api-production.up.railway.app
```

### 2.4 Deploy
Click **Deploy** and wait ~2 minutes.

Your app is now live at: `https://your-app.vercel.app`

---

## Step 3: Get API Keys

### RentCast API
1. Go to [rentcast.io](https://app.rentcast.io/app/api)
2. Sign up for free account
3. Generate API key
4. Free tier: 50 requests/month

### AXESSO (Zillow Data)
1. Go to [RapidAPI - Axesso](https://rapidapi.com/axesso/api/axesso-zillow-data-api)
2. Subscribe to free tier
3. Copy your RapidAPI key
4. Free tier: 100 requests/month

---

## 🔧 Alternative Deployments

### Option 2: Render.com (All-in-One)

#### Backend
1. Go to [render.com](https://render.com)
2. New > Web Service
3. Connect GitHub repo
4. Root Directory: `backend`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables

#### Frontend
1. New > Static Site
2. Root Directory: `frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `.next`
5. Add `NEXT_PUBLIC_API_URL` env var

---

### Option 3: Docker (Self-Hosted)

```bash
# Clone and navigate
git clone <your-repo>
cd investiq

# Create .env file
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Build and run
docker-compose up -d --build

# Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

### Option 4: Fly.io

#### Backend
```bash
cd backend
fly launch --name investiq-api
fly secrets set RENTCAST_API_KEY=xxx AXESSO_API_KEY=xxx SECRET_KEY=xxx
fly deploy
```

#### Frontend
```bash
cd frontend
fly launch --name investiq-web
fly secrets set NEXT_PUBLIC_API_URL=https://investiq-api.fly.dev
fly deploy
```

---

## 🔒 Production Checklist

### Security
- [ ] Set strong `SECRET_KEY` (use `openssl rand -hex 32`)
- [ ] Configure `CORS_ORIGINS` with only your domains
- [ ] Set `DEBUG=false`
- [ ] Enable HTTPS (automatic on Railway/Vercel)

### Performance
- [ ] Enable caching (Redis optional)
- [ ] Set up monitoring (Railway/Vercel have built-in)
- [ ] Configure rate limiting

### API Keys
- [ ] RentCast API key configured
- [ ] AXESSO API key configured
- [ ] Monitor usage to stay within limits

---

## 🧪 Test Your Deployment

### Backend Health Check
```bash
curl https://your-api-url.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Frontend
1. Visit `https://your-app.vercel.app`
2. Click "Try Demo Property"
3. Should load sample property with all 6 strategies

### API Docs
Visit `https://your-api-url.railway.app/docs` for Swagger UI

---

## 🐛 Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGINS` includes your frontend URL
- Check for trailing slashes in URLs

### API Connection Failed
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check Railway/backend logs for errors
- Ensure API keys are valid

### Property Search Returns No Data
- Verify RentCast/AXESSO API keys are valid
- Check API usage limits
- Demo property should always work (uses mock data)

---

## 📊 Monitoring

### Railway
- View logs: Dashboard > Deployments > View Logs
- Metrics: Dashboard > Metrics tab

### Vercel
- View logs: Dashboard > Deployments > Functions tab
- Analytics: Dashboard > Analytics

---

## 💰 Cost Estimates

| Service | Free Tier | Paid |
|---------|-----------|------|
| Railway | $5 credit/month | $0.01/GB RAM/hour |
| Vercel | 100GB bandwidth | $20/month Pro |
| RentCast | 50 req/month | $49/month |
| AXESSO | 100 req/month | $10/month |

**Estimated monthly cost for light usage: $0 - $20**

---

## 🆘 Support

- GitHub Issues: Report bugs
- Railway Discord: deployment help
- Vercel Community: frontend issues

---

## 📝 Environment Variables Reference

### Backend (.env)
```env
APP_NAME=InvestIQ
APP_VERSION=1.0.0
DEBUG=false
RENTCAST_API_KEY=your_rentcast_key
RENTCAST_URL=https://api.rentcast.io/v1
AXESSO_API_KEY=your_axesso_key
AXESSO_URL=https://api.axesso.de/zil
SECRET_KEY=your_secret_key_min_32_chars
CORS_ORIGINS=["https://your-frontend.vercel.app"]
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```
