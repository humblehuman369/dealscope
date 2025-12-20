# Manual Test: Property Search Functionality

## Prerequisites
```bash
cd /Users/bradgeisen/IQ-Data/dealscope/frontend
npm run dev
```
The server should start on `http://localhost:3000` (or 3001/3002 if port is in use)

## Test 1: Demo Property Button
1. Open browser to `http://localhost:3000`
2. Click the "Try demo property" button (sparkle icon)
3. **Expected:** Page navigates to property analysis for demo property
4. **Verify:** You see "123 Palm Beach Way, West Palm Beach, FL 33486" with DEMO badge

## Test 2: Search Form Submission
1. Go back to home page (`http://localhost:3000`)
2. Type an address in the search box: `953 Banyan Dr, Boca Raton, FL 33432`
3. Click the "Analyze" button
4. **Expected:** Page navigates to property analysis
5. **Verify:** You see property data with 6 investment strategies

## Test 3: Direct URL Navigation
1. Navigate directly to: `http://localhost:3000/property?address=123%20Main%20St,%20Miami,%20FL%2033101`
2. **Expected:** Property page loads immediately
3. **Verify:** Property data is displayed with mock values

## Test 4: Different Addresses
Try these addresses to verify mock data generation:
- `456 Ocean Ave, Santa Monica, CA 90401`
- `789 Broadway, New York, NY 10003`
- `321 Peachtree St, Atlanta, GA 30303`

Each should generate different property values based on the address hash.

## Test 5: Empty Address Validation
1. Go to home page
2. Leave search box empty
3. Try to click "Analyze" button
4. **Expected:** Button is disabled (grayed out)
5. **Verify:** No navigation occurs

## Test 6: Strategy Cards
On any property page:
1. Click each of the 6 strategy cards
2. **Expected:** Details panel updates to show strategy-specific metrics
3. **Verify:** All tabs work (Rehab, Details, Charts, 10-Year, Score, What-If, Compare)

## Test 7: Variable Sliders
1. On property page, expand the "Variables" panel
2. Adjust any slider (Purchase Price, Monthly Rent, etc.)
3. **Expected:** All strategy cards update in real-time
4. **Verify:** Calculations change based on new inputs

## Troubleshooting

### Issue: Button doesn't work
- **Check:** Make sure you actually typed in the input field
- **Check:** Open browser console (F12) for any errors
- **Try:** Refresh the page and try again

### Issue: Page shows "Unable to Load Property"
- **Check:** Backend server is running
- **Check:** No console errors
- **Try:** Click "Try Demo" button to test with known-good data

### Issue: Strategies show "NaN" or weird values
- **Check:** Sliders are set to reasonable values
- **Try:** Refresh page to reset to defaults

## Expected Behavior

### Home Page
- Clean, modern UI with gradient search button
- Search input accepts any text
- Button is disabled when input is empty
- Button shows "Analyzing" state when clicked

### Property Page
- Shows property address in header
- Displays 6 strategy cards in a grid
- Each card shows primary and secondary metrics
- "Best" badge appears on highest-scoring strategy
- Variables panel allows real-time adjustments
- Drill-down tabs show detailed analysis

## Success Criteria
✅ All 7 tests pass without errors  
✅ Navigation works smoothly  
✅ Data displays correctly  
✅ Calculations update in real-time  
✅ No console errors  

## Notes
- Currently using mock data (no real property API calls)
- Property values are generated based on address hash
- All calculations are performed client-side
- Data is cached in-memory (resets on server restart)

