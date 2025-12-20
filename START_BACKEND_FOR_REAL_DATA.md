# Start Backend to Get REAL Property Data

## Problem Identified ✅
You're seeing **mock data** for 3788 Moon Bay Cir., Wellington, FL 33414 because:
1. The frontend is NOT connected to your Python backend
2. The frontend is using its own mock data generator
3. Your backend has REAL API keys but isn't running

## Solution: 3 Simple Steps

### Step 1: Install Backend Dependencies
```bash
cd /Users/bradgeisen/IQ-Data/dealscope/backend
pip3 install -r requirements.txt
```

This installs:
- FastAPI (web framework)
- Uvicorn (web server)
- httpx (API client for RentCast/AXESSO)
- All other dependencies

### Step 2: Start the Backend Server
```bash
cd /Users/bradgeisen/IQ-Data/dealscope/backend
python3 -m uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Starting DealScope API...
INFO:     RentCast API configured: Yes
INFO:     AXESSO API configured: Yes
INFO:     Application startup complete.
```

**Keep this terminal open!** The backend needs to stay running.

### Step 3: Update Frontend Configuration

Edit: `/Users/bradgeisen/IQ-Data/dealscope/frontend/.env.local`

Find this line:
```bash
NEXT_PUBLIC_API_URL=
```

Change it to:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Save the file.

### Step 4: Restart Frontend
In a NEW terminal:
```bash
cd /Users/bradgeisen/IQ-Data/dealscope/frontend
# Stop current server (Ctrl+C if running)
npm run dev
```

## Test with Real Data

1. Open browser: http://localhost:3000
2. Search for: **3788 Moon Bay Cir., Wellington, FL 33414**
3. Wait 2-3 seconds for API calls
4. You should now see REAL data!

## How to Verify It's Working

### Check Backend Terminal
You should see logs like:
```
INFO: POST /api/v1/properties/search
INFO: Searching for property: 3788 Moon Bay Cir., Wellington, FL 33414
INFO: Fetching from RentCast API...
INFO: Fetching from AXESSO API...
INFO: Successfully fetched property data
```

### Check Frontend
- Property details should be accurate
- Valuations from real market data
- Rental estimates from actual comps
- No more random/fake numbers

### Check Browser Console (F12)
Network tab should show:
```
POST http://localhost:8000/api/v1/properties/search
Status: 200 OK
```

## What Data You'll Get

### From RentCast API:
- ✅ Property valuation (AVM)
- ✅ Rental estimates (LTR & STR)
- ✅ Market trends
- ✅ Comparable properties
- ✅ Property tax estimates

### From AXESSO/Zillow API:
- ✅ Property details (beds, baths, sqft)
- ✅ Zestimate
- ✅ Recent sales history
- ✅ Neighborhood data
- ✅ School ratings

### Combined & Normalized:
- ✅ Best data from both sources
- ✅ Conflict resolution (when APIs disagree)
- ✅ Confidence scores
- ✅ Data provenance tracking

## Troubleshooting

### "No module named uvicorn"
```bash
cd backend
pip3 install -r requirements.txt
```

### "Module not found: app"
Make sure you're in the `backend` directory:
```bash
cd /Users/bradgeisen/IQ-Data/dealscope/backend
python3 -m uvicorn app.main:app --reload --port 8000
```

### "Port 8000 already in use"
Kill the existing process:
```bash
lsof -ti:8000 | xargs kill -9
```

### Frontend still shows mock data
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check `.env.local` has correct URL
3. Hard refresh browser (Cmd+Shift+R)
4. Clear browser cache
5. Restart frontend dev server

### API Rate Limits
If you see errors about rate limits:
- RentCast: 500 requests/month on free tier
- AXESSO: Check your plan limits
- Consider caching results

## Architecture

```
User Search
    ↓
Frontend (Next.js on :3000)
    ↓
NEXT_PUBLIC_API_URL=http://localhost:8000
    ↓
Backend (FastAPI on :8000)
    ↓
    ├─→ RentCast API (Property Data)
    └─→ AXESSO API (Zillow Data)
    ↓
Data Normalization & Merge
    ↓
Return to Frontend
    ↓
Display Real Property Data
```

## Current vs. Fixed

### Current (WRONG):
```
Frontend → Frontend Mock API → Fake Data
```

### Fixed (CORRECT):
```
Frontend → Backend API → RentCast + AXESSO → Real Data
```

## Quick Test Command

After starting backend, test it directly:
```bash
curl -X POST http://localhost:8000/api/v1/properties/search \
  -H "Content-Type: application/json" \
  -d '{"address": "3788 Moon Bay Cir., Wellington, FL 33414"}'
```

You should get back real property data in JSON format.

## Next Steps

1. Start backend (Step 1-2 above)
2. Update `.env.local` (Step 3)
3. Restart frontend (Step 4)
4. Test the search
5. Verify real data is showing

## Need Help?

Check these files:
- Backend logs: Terminal where uvicorn is running
- Frontend logs: Browser console (F12)
- API keys: `/Users/bradgeisen/IQ-Data/dealscope/backend/.env`
- Frontend config: `/Users/bradgeisen/IQ-Data/dealscope/frontend/.env.local`

---

**Bottom Line:** Your backend is ready with real API keys. Just start it and connect the frontend!

