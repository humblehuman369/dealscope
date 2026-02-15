# DealGapIQ - Real Estate Investment Analytics Platform

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript" />
</p>

Analyze any US property across **6 investment strategies** in seconds. Make data-driven real estate investment decisions with confidence.

## 🏠 Investment Strategies

| Strategy | Description | Risk | Time Horizon |
|----------|-------------|------|--------------|
| **Long-Term Rental** | Traditional buy-and-hold with monthly cash flow | Low | 10+ years |
| **Short-Term Rental** | Airbnb/VRBO for maximum revenue | Medium | 5-10 years |
| **BRRRR** | Buy, Rehab, Rent, Refinance, Repeat | Medium | 2-5 years |
| **Fix & Flip** | Buy distressed, renovate, sell | High | 6 months |
| **House Hacking** | Live in one unit, rent others | Low | 1+ years |
| **Wholesale** | Assign contracts without owning | Medium | 30-45 days |

## ✨ Features

- **Real-Time Data**: Property values and rent estimates from RentCast & AXESSO APIs
- **Instant Analytics**: Calculate all 6 strategies in under 3 seconds
- **Trust-First Design**: Every metric shows its data source (API, assumption, or override)
- **Sensitivity Analysis**: See how key variables affect your returns
- **Export Reports**: PDF, Excel, and CSV exports for due diligence
- **Data Quality Flags**: Missing fields, conflicts, and stale data clearly indicated

## 🌐 Live Deployment

### Quick Deploy (Recommended)

**Backend → Railway | Frontend → Vercel**

1. **Deploy Backend to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub"
   - Select `backend` folder as root
   - Add environment variables (see below)

2. **Deploy Frontend to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repo
   - Set root to `frontend`
   - Add `NEXT_PUBLIC_API_URL` = your Railway URL

See **[DEPLOY.md](./DEPLOY.md)** for detailed instructions.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (optional)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
cd dealgapiq

# Set environment variables
cp backend/.env.example backend/.env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## 🔑 API Keys Required

### RentCast API
- **Purpose**: Property data, valuations (AVM), rent estimates
- **Get Key**: https://app.rentcast.io/app/api
- **Docs**: https://developers.rentcast.io

### AXESSO API
- **Purpose**: STR data (ADR, occupancy), supplemental property info
- **Get Key**: https://axesso.developer.azure-api.net
- **Docs**: https://axesso.developer.azure-api.net/api-details

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/properties/search` | POST | Search property by address |
| `/api/v1/properties/{id}` | GET | Get cached property |
| `/api/v1/properties/demo/sample` | GET | Get demo property |
| `/api/v1/analytics/calculate` | POST | Calculate all strategies |
| `/api/v1/analytics/{id}/quick` | GET | Quick summary metrics |
| `/api/v1/assumptions/defaults` | GET | Default assumptions |
| `/api/v1/comparison/{id}` | GET | Strategy comparison |
| `/api/v1/sensitivity/analyze` | POST | Sensitivity analysis |

## 📁 Project Structure

```
dealgapiq/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── schemas.py           # Pydantic models
│   │   ├── core/
│   │   │   └── config.py        # Settings & environment
│   │   └── services/
│   │       ├── calculators.py   # All 6 strategy calculators
│   │       ├── api_clients.py   # RentCast & AXESSO clients
│   │       └── property_service.py  # Main service orchestrator
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout
│   │   │   ├── page.tsx         # Home/search page
│   │   │   └── property/
│   │   │       └── page.tsx     # Property analysis page
│   │   └── lib/
│   │       └── api.ts           # API client
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

## 🧮 Calculation Formulas

All calculations are derived from the **Property_Data_Analytics.xlsx** workbook:

### Key Metrics

```
Monthly Mortgage = P × [r(1+r)^n] / [(1+r)^n - 1]
NOI = Effective Gross Income - Operating Expenses
Cap Rate = NOI / Property Value
Cash-on-Cash = Annual Cash Flow / Total Cash Invested
DSCR = NOI / Annual Debt Service
```

### Strategy-Specific

- **LTR**: 5% vacancy, 10% management, 10% maintenance
- **STR**: 15% platform fees, 20% management, seasonality factors
- **BRRRR**: 75% LTV refinance, 10% post-rehab rent increase
- **Flip**: 70% rule (ARV × 0.70 - Rehab = Max Purchase)
- **House Hack**: FHA 3.5% down, 0.85% MIP
- **Wholesale**: 30% ARV discount target, $15k assignment fee

## 🔧 Configuration

### Default Assumptions

Edit `backend/app/schemas.py` to change default assumptions:

```python
class FinancingAssumptions(BaseModel):
    down_payment_pct: float = 0.20
    interest_rate: float = 0.075
    loan_term_years: int = 30
    closing_costs_pct: float = 0.03
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RENTCAST_API_KEY` | RentCast API key | Required |
| `AXESSO_API_KEY` | AXESSO API key | Required |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |

## 📈 Sample Analysis

For the demo property (Palm Beach County, FL):

| Strategy | Cash Required | Year 1 ROI | Risk |
|----------|---------------|------------|------|
| Long-Term Rental | $97,750 | 4.5% | Low |
| Short-Term Rental | $125,000 | 12.6% | Medium |
| BRRRR | $126,200 | 6.8% | Medium |
| Fix & Flip | $127,660 | 19.7% | High |
| House Hacking | $27,625 | 52.2% | Low |
| Wholesale | $1,500 | 900% | Medium |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Disclaimer

This tool is for educational and informational purposes only. It does not constitute financial, legal, or investment advice. Always consult qualified professionals before making investment decisions. Past performance does not guarantee future results.

---

Built with ❤️ for real estate investors
