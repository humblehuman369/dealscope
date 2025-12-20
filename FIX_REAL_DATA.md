# How to Get REAL Property Data (Not Mock Data)

## Current Problem
The frontend is showing **mock/fake data** because it's not connected to your Python backend that has the real RentCast and AXESSO API keys.

## Your Backend is Ready! ✅
I found your backend configuration with REAL API keys:
- **RentCast API:** Configured ✅
- **AXESSO API:** Configured ✅
- **Backend Code:** Ready to fetch real data ✅

## Quick Fix (2 Steps)

### Step 1: Start the Python Backend
```bash
cd /Users/bradgeisen/IQ-Data/dealscope/backend
python -m uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Starting DealScope API...
INFO:     RentCast API configured: Yes
INFO:     AXESSO API configured: Yes
```

### Step 2: Connect Frontend to Backend
Edit this file: `/Users/bradgeisen/IQ-Data/dealscope/frontend/.env.local`

Change this line:
```bash
NEXT_PUBLIC_API_URL=
```

To this:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 3: Restart Frontend
```bash
# Stop the current frontend server (Ctrl+C)
cd /Users/bradgeisen/IQ-Data/dealscope/frontend
npm run dev
```

## Test It

1. Go to http://localhost:3000
2. Search for: **3788 Moon Bay Cir., Wellington, FL 33414**
3. You should now see REAL data from RentCast/AXESSO APIs!

## What Will Change

### Before (Mock Data)
- ❌ Random generated values based on address hash
- ❌ Not accurate for the actual property
- ❌ Same fake data every time

### After (Real Data)
- ✅ Actual property details from MLS/public records
- ✅ Real market valuations from RentCast
- ✅ Accurate rental estimates
- ✅ Comparable sales data
- ✅ Real market trends

## Verify It's Working

Check the backend terminal - you should see logs like:
```
INFO: Searching for property: 3788 Moon Bay Cir., Wellington, FL 33414
INFO: Fetching from RentCast API...
INFO: Fetching from AXESSO API...
INFO: Normalizing property data...
```

Check the frontend - property details should match the actual property:
- Correct number of bedrooms/bathrooms
- Actual square footage
- Real market value
- Accurate rental estimates

## Troubleshooting

### Backend won't start
```bash
# Install dependencies
cd backend
pip install -r requirements.txt
```

### Frontend still shows mock data
1. Make sure backend is running on port 8000
2. Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Hard refresh browser (Cmd+Shift+R)
4. Check browser console for errors

### API errors
- Check your API keys are valid
- Check API rate limits
- Check backend logs for specific errors

## Production Deployment

For production, set `NEXT_PUBLIC_API_URL` to your deployed backend URL:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

## Files to Check

1. **Backend:** `/Users/bradgeisen/IQ-Data/dealscope/backend/.env`
   - Contains your API keys ✅

2. **Frontend:** `/Users/bradgeisen/IQ-Data/dealscope/frontend/.env.local`
   - Needs to point to backend ⚠️

3. **Backend Main:** `/Users/bradgeisen/IQ-Data/dealscope/backend/app/main.py`
   - Has `/api/v1/properties/search` endpoint ✅

4. **Backend Service:** `/Users/bradgeisen/IQ-Data/dealscope/backend/app/services/unified_property_service.py`
   - Fetches from RentCast and AXESSO ✅

## Summary

You have everything you need! Just:
1. Start the backend (`python -m uvicorn app.main:app --reload --port 8000`)
2. Update `.env.local` to point to `http://localhost:8000`
3. Restart frontend
4. Search for the property again

You'll get REAL data instead of mock data! 🎉

