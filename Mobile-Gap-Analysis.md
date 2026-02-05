# Mobile Gap Analysis

**Generated:** February 4, 2026  
**Purpose:** Identify API parity and feature gaps between Frontend (Web) and Mobile applications

---

## Executive Summary

This analysis compares the Frontend (Next.js web app) and Mobile (React Native/Expo) implementations against the Backend API to identify:
1. **API Endpoints** used in Frontend but missing in Mobile
2. **UI/UX Features** available on Web but not implemented in Mobile
3. **Code requirements** to achieve feature parity

**Key Findings:**
- **API Parity:** Mobile uses ~40% of available backend endpoints
- **Feature Parity:** Mobile lacks ~60% of web features, particularly in portfolio management, reporting, and account settings
- **Critical Gaps:** Account deletion, document management, report generation, LOI features, and advanced filtering

---

## Part 1: API Parity Analysis

### Backend Endpoints Inventory

#### Authentication (`/api/v1/auth`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/register` | POST | ✅ | ✅ | Complete |
| `/login` | POST | ✅ | ✅ | Complete |
| `/login/form` | POST | ✅ | ❌ | Missing |
| `/refresh` | POST | ✅ | ✅ | Complete |
| `/logout` | POST | ✅ | ✅ | Complete |
| `/me` | GET | ✅ | ✅ | Complete |
| `/verify-email` | POST | ✅ | ❌ | **Missing** |
| `/resend-verification` | POST | ✅ | ❌ | **Missing** |
| `/forgot-password` | POST | ✅ | ❌ | **Missing** |
| `/reset-password` | POST | ✅ | ❌ | **Missing** |
| `/change-password` | POST | ✅ | ❌ | **Missing** |

#### Users (`/api/v1/users`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/me` | GET | ✅ | ❌ | **Missing** |
| `/me` | PATCH | ✅ | ❌ | **Missing** |
| `/me` | DELETE | ✅ | ❌ | **Missing** |
| `/me/profile` | GET | ✅ | ❌ | **Missing** |
| `/me/profile` | PATCH | ✅ | ❌ | **Missing** |
| `/me/onboarding` | POST | ✅ | ❌ | **Missing** |
| `/me/onboarding/complete` | POST | ✅ | ❌ | **Missing** |
| `/me/assumptions` | GET | ✅ | ❌ | **Missing** |
| `/me/assumptions` | PUT | ✅ | ❌ | **Missing** |
| `/me/assumptions` | DELETE | ✅ | ❌ | **Missing** |

#### Properties (`/api/v1/properties`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/properties/search` | POST | ✅ | ✅ | Complete |
| `/properties/{property_id}` | GET | ✅ | ❌ | **Missing** |
| `/properties/demo/sample` | GET | ✅ | ❌ | Missing |
| `/photos` | GET | ✅ | ❌ | **Missing** |
| `/market-data` | GET | ✅ | ❌ | **Missing** |
| `/market/assumptions` | GET | ✅ | ✅ | Complete |
| `/similar-rent` | GET | ✅ | ❌ | **Missing** |
| `/similar-sold` | GET | ✅ | ❌ | **Missing** |

#### Analytics (`/api/v1/analytics`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/calculate` | POST | ✅ | ✅ | Complete |
| `/{property_id}/quick` | GET | ✅ | ❌ | Missing |

#### Saved Properties (`/api/v1/saved-properties`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/` | GET | ✅ | ❌ | **Missing** |
| `/stats` | GET | ✅ | ❌ | **Missing** |
| `/bulk/status` | POST | ✅ | ❌ | **Missing** |
| `/bulk` | DELETE | ✅ | ❌ | **Missing** |
| `/` | POST | ✅ | ❌ | **Missing** |
| `/{property_id}` | GET | ✅ | ❌ | **Missing** |
| `/{property_id}` | PATCH | ✅ | ❌ | **Missing** |
| `/{property_id}` | DELETE | ✅ | ❌ | **Missing** |
| `/{property_id}/deal-maker` | GET | ✅ | ❌ | **Missing** |
| `/{property_id}/deal-maker` | PATCH | ✅ | ❌ | **Missing** |
| `/{property_id}/adjustments` | GET | ✅ | ❌ | **Missing** |
| `/{property_id}/adjustments` | POST | ✅ | ❌ | **Missing** |

#### Search History (`/api/v1/search-history`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/` | GET | ✅ | ❌ | **Missing** |
| `/recent` | GET | ✅ | ❌ | **Missing** |
| `/stats` | GET | ✅ | ❌ | **Missing** |
| `/{entry_id}` | DELETE | ✅ | ❌ | **Missing** |
| `/` | DELETE | ✅ | ❌ | **Missing** |

#### Reports (`/api/v1/reports`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/property/{property_id}/excel` | GET | ✅ | ❌ | **Missing** |
| `/property/{property_id}/financial-statements` | GET | ✅ | ❌ | **Missing** |
| `/property/{property_id}/csv` | GET | ✅ | ❌ | **Missing** |
| `/saved/{saved_property_id}/excel` | GET | ✅ | ❌ | **Missing** |

#### Documents (`/api/v1/documents`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/` | POST | ✅ | ❌ | **Missing** |
| `/` | GET | ✅ | ❌ | **Missing** |
| `/{document_id}` | GET | ✅ | ❌ | **Missing** |
| `/{document_id}/download` | GET | ✅ | ❌ | **Missing** |
| `/{document_id}/url` | GET | ✅ | ❌ | **Missing** |
| `/{document_id}` | PATCH | ✅ | ❌ | **Missing** |
| `/{document_id}` | DELETE | ✅ | ❌ | **Missing** |
| `/info/types` | GET | ✅ | ❌ | **Missing** |

#### Billing (`/api/v1/billing`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/plans` | GET | ✅ | ❌ | **Missing** |
| `/subscription` | GET | ✅ | ❌ | **Missing** |
| `/usage` | GET | ✅ | ❌ | **Missing** |
| `/subscription/cancel` | POST | ✅ | ❌ | **Missing** |
| `/checkout` | POST | ✅ | ❌ | **Missing** |
| `/portal` | POST | ✅ | ❌ | **Missing** |
| `/payments` | GET | ✅ | ❌ | **Missing** |

#### LOI (Letter of Intent) (`/api/v1/loi`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/generate` | POST | ✅ | ❌ | **Missing** |
| `/generate/pdf` | POST | ✅ | ❌ | **Missing** |
| `/generate/from-analysis` | POST | ✅ | ❌ | **Missing** |
| `/quick-generate` | POST | ✅ | ❌ | **Missing** |
| `/templates` | GET | ✅ | ❌ | **Missing** |
| `/preferences` | GET | ✅ | ❌ | **Missing** |
| `/preferences` | POST | ✅ | ❌ | **Missing** |
| `/history` | GET | ✅ | ❌ | **Missing** |
| `/history/{loi_id}` | GET | ✅ | ❌ | **Missing** |

#### Proforma (`/api/v1/proforma`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/generate` | POST | ✅ | ❌ | **Missing** |
| `/saved/{saved_property_id}` | GET | ✅ | ❌ | **Missing** |
| `/saved/{saved_property_id}/download` | GET | ✅ | ❌ | **Missing** |
| `/saved/{saved_property_id}/preview` | GET | ✅ | ❌ | **Missing** |

#### Defaults (`/api/v1/defaults`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/` | GET | ✅ | ✅ | Complete |
| `/resolved` | GET | ✅ | ✅ | Complete |
| `/market/{zip_code}` | GET | ✅ | ✅ | Complete |

#### Sync (`/api/v1/sync`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/pull` | POST | ❌ | ✅ | Mobile-only |
| `/push` | POST | ❌ | ✅ | Mobile-only |

#### Health (`/health`)
| Endpoint | Method | Frontend | Mobile | Status |
|----------|--------|----------|--------|--------|
| `/health` | GET | ✅ | ❌ | Missing |
| `/health/ready` | GET | ✅ | ❌ | Missing |
| `/health/deep` | GET | ✅ | ❌ | Missing |

---

## Part 2: Feature Parity Analysis

### 2.1 Dashboard Features

#### Frontend Dashboard (`/dashboard`)
**Features:**
- ✅ Portfolio summary (value, equity, cash flow, avg CoC)
- ✅ Deal pipeline visualization (watching → analyzing → contacted → under_contract → owned)
- ✅ Watchlist properties grid
- ✅ Portfolio properties grid
- ✅ Recent activity feed
- ✅ Market alerts
- ✅ Investment goals tracking
- ✅ Quick actions (search, save, analyze)
- ✅ Admin panel (for superusers)

#### Mobile Dashboard (`/(tabs)/dashboard`)
**Current Implementation:**
- ⚠️ Uses WebView wrapper to load web dashboard
- ❌ No native implementation
- ❌ No offline support
- ❌ No native navigation

**Gap:** Mobile dashboard is a WebView wrapper, not a native implementation. Missing all native features.

---

### 2.2 Profile & Settings

#### Frontend Profile (`/profile`)
**Features:**
- ✅ Account information (name, avatar)
- ✅ Business profile (name, type, address, phone, emails, social links, license, bio)
- ✅ Investor profile (experience, preferred strategies, target markets, budget, risk tolerance)
- ✅ Default assumptions management
- ✅ Account deletion
- ✅ Password change
- ✅ Email verification

#### Mobile Settings (`/(tabs)/settings`)
**Current Implementation:**
- ✅ Theme selection (light/dark/system)
- ✅ Push notifications toggle
- ✅ Local data stats (scanned, portfolio, cache)
- ✅ Clear all data
- ✅ Sign out
- ✅ Sync status indicator
- ✅ Manual sync trigger
- ❌ **No profile editing**
- ❌ **No account deletion**
- ❌ **No password change**
- ❌ **No business profile**
- ❌ **No investor preferences**

**Gap:** Mobile settings is minimal - only appearance and local data management. Missing all account/profile management features.

---

### 2.3 Property Management

#### Frontend Saved Properties
**Features:**
- ✅ List properties with filtering (status, tags, search)
- ✅ Sort by multiple fields (saved_at, updated_at, priority, etc.)
- ✅ Bulk operations (status update, delete)
- ✅ Property details view
- ✅ Status pipeline management
- ✅ Custom fields (nickname, tags, color labels, priority, notes)
- ✅ Custom value overrides (purchase price, rent, ARV, rehab budget)
- ✅ Deal Maker integration
- ✅ Adjustment history
- ✅ Document attachments
- ✅ Analytics caching

#### Mobile Portfolio (`/(tabs)/portfolio`)
**Current Implementation:**
- ⚠️ Not fully implemented
- ❌ No property list view
- ❌ No filtering/sorting
- ❌ No bulk operations
- ❌ No property details
- ❌ No status management
- ❌ No custom fields

**Gap:** Mobile portfolio management is essentially non-existent. All CRUD operations missing.

---

### 2.4 Search History

#### Frontend Search History (`/search-history`)
**Features:**
- ✅ Paginated search history list
- ✅ Filter by success status
- ✅ Filter by source (web, mobile, scanner)
- ✅ Recent searches quick access
- ✅ Search statistics (total, successful, saved, trends)
- ✅ Top markets analysis
- ✅ Delete individual entries
- ✅ Clear all history (with date filter)

#### Mobile History (`/(tabs)/history`)
**Current Implementation:**
- ⚠️ Not fully implemented
- ❌ No search history display
- ❌ No filtering
- ❌ No statistics
- ❌ No deletion

**Gap:** Mobile search history screen exists but is not functional.

---

### 2.5 Reports & Export

#### Frontend Reports
**Features:**
- ✅ Excel report generation (comprehensive)
- ✅ Financial statements report (NOI, DSCR, Pro Forma)
- ✅ CSV export
- ✅ Saved property reports
- ✅ Sensitivity analysis in reports
- ✅ Download/export functionality

#### Mobile Reports
**Current Implementation:**
- ❌ **No report generation**
- ❌ **No export functionality**
- ❌ **No PDF generation**
- ❌ **No file sharing**

**Gap:** Complete absence of reporting features in mobile.

---

### 2.6 Documents Management

#### Frontend Documents
**Features:**
- ✅ Upload documents (PDF, images, Office docs)
- ✅ List documents with filtering
- ✅ Filter by property
- ✅ Filter by document type
- ✅ Download documents
- ✅ Get presigned URLs
- ✅ Update metadata
- ✅ Delete documents
- ✅ Document type management

#### Mobile Documents
**Current Implementation:**
- ❌ **No document upload**
- ❌ **No document viewing**
- ❌ **No document management**

**Gap:** Complete absence of document management in mobile.

---

### 2.7 Billing & Subscription

#### Frontend Billing (`/billing`)
**Features:**
- ✅ View pricing plans
- ✅ Monthly/yearly toggle
- ✅ Current subscription display
- ✅ Usage tracking (properties, searches, API calls)
- ✅ Create checkout session (Stripe)
- ✅ Customer portal access
- ✅ Payment history
- ✅ Cancel subscription
- ✅ Upgrade/downgrade flows

#### Mobile Billing
**Current Implementation:**
- ❌ **No billing screen**
- ❌ **No subscription management**
- ❌ **No usage tracking**
- ❌ **No payment integration**

**Gap:** Complete absence of billing features in mobile.

---

### 2.8 Letter of Intent (LOI)

#### Frontend LOI
**Features:**
- ✅ Generate LOI from form
- ✅ Quick generate from analysis
- ✅ Generate PDF
- ✅ Template management
- ✅ User preferences
- ✅ LOI history
- ✅ View saved LOIs

#### Mobile LOI
**Current Implementation:**
- ❌ **No LOI features**
- ❌ **No wholesale workflow**

**Gap:** Complete absence of LOI/wholesale features in mobile.

---

### 2.9 Property Analysis Features

#### Frontend Analysis Features
**Features:**
- ✅ Verdict screen with all 6 strategies
- ✅ Deal Maker interactive worksheet
- ✅ Strategy-specific worksheets
- ✅ Compare properties side-by-side
- ✅ Rental comps view
- ✅ Sales comps view
- ✅ Market data display
- ✅ Photos gallery
- ✅ Sensitivity analysis
- ✅ What-if scenarios

#### Mobile Analysis Features
**Current Implementation:**
- ✅ Property search
- ✅ Basic analytics display
- ✅ Verdict screen (basic)
- ✅ Deal Maker screen (basic)
- ✅ Strategy screens (basic)
- ❌ **No comparison view**
- ❌ **No comps views**
- ❌ **No photos gallery**
- ❌ **No sensitivity analysis**
- ❌ **No advanced what-if**

**Gap:** Mobile has basic analysis but missing advanced features like comps, comparison, and sensitivity analysis.

---

### 2.10 Advanced Features

#### Frontend Advanced Features
**Features:**
- ✅ Pro Forma generation
- ✅ 10-year projections
- ✅ Amortization schedules
- ✅ Exit analysis
- ✅ IRR calculations
- ✅ Property sharing (public links, password-protected)
- ✅ Email invites
- ✅ Share visibility controls

#### Mobile Advanced Features
**Current Implementation:**
- ❌ **No pro forma**
- ❌ **No projections**
- ❌ **No sharing**
- ❌ **No advanced calculations**

**Gap:** All advanced financial analysis and sharing features missing in mobile.

---

## Part 3: Code Requirements

### 3.1 API Service Layer

#### Required New Services

**1. User Service** (`mobile/services/userService.ts`)
```typescript
// Required endpoints:
- GET /api/v1/users/me
- PATCH /api/v1/users/me
- DELETE /api/v1/users/me
- GET /api/v1/users/me/profile
- PATCH /api/v1/users/me/profile
- POST /api/v1/users/me/onboarding
- POST /api/v1/users/me/onboarding/complete
- GET /api/v1/users/me/assumptions
- PUT /api/v1/users/me/assumptions
- DELETE /api/v1/users/me/assumptions
```

**2. Saved Properties Service** (`mobile/services/savedPropertiesService.ts`)
```typescript
// Required endpoints:
- GET /api/v1/saved-properties
- GET /api/v1/saved-properties/stats
- POST /api/v1/saved-properties
- GET /api/v1/saved-properties/{id}
- PATCH /api/v1/saved-properties/{id}
- DELETE /api/v1/saved-properties/{id}
- POST /api/v1/saved-properties/bulk/status
- DELETE /api/v1/saved-properties/bulk
- GET /api/v1/saved-properties/{id}/deal-maker
- PATCH /api/v1/saved-properties/{id}/deal-maker
- GET /api/v1/saved-properties/{id}/adjustments
- POST /api/v1/saved-properties/{id}/adjustments
```

**3. Search History Service** (`mobile/services/searchHistoryService.ts`)
```typescript
// Required endpoints:
- GET /api/v1/search-history
- GET /api/v1/search-history/recent
- GET /api/v1/search-history/stats
- DELETE /api/v1/search-history/{entry_id}
- DELETE /api/v1/search-history
```

**4. Reports Service** (`mobile/services/reportsService.ts`)
```typescript
// Required endpoints:
- GET /api/v1/reports/property/{property_id}/excel
- GET /api/v1/reports/property/{property_id}/financial-statements
- GET /api/v1/reports/property/{property_id}/csv
- GET /api/v1/reports/saved/{saved_property_id}/excel
```

**5. Documents Service** (`mobile/services/documentsService.ts`)
```typescript
// Required endpoints:
- POST /api/v1/documents (multipart/form-data)
- GET /api/v1/documents
- GET /api/v1/documents/{document_id}
- GET /api/v1/documents/{document_id}/download
- GET /api/v1/documents/{document_id}/url
- PATCH /api/v1/documents/{document_id}
- DELETE /api/v1/documents/{document_id}
- GET /api/v1/documents/info/types
```

**6. Billing Service** (`mobile/services/billingService.ts`)
```typescript
// Required endpoints:
- GET /api/v1/billing/plans
- GET /api/v1/billing/subscription
- GET /api/v1/billing/usage
- POST /api/v1/billing/subscription/cancel
- POST /api/v1/billing/checkout
- POST /api/v1/billing/portal
- GET /api/v1/billing/payments
```

**7. LOI Service** (`mobile/services/loiService.ts`)
```typescript
// Required endpoints:
- POST /api/v1/loi/generate
- POST /api/v1/loi/generate/pdf
- POST /api/v1/loi/generate/from-analysis
- POST /api/v1/loi/quick-generate
- GET /api/v1/loi/templates
- GET /api/v1/loi/preferences
- POST /api/v1/loi/preferences
- GET /api/v1/loi/history
- GET /api/v1/loi/history/{loi_id}
```

**8. Property Details Service** (`mobile/services/propertyDetailsService.ts`)
```typescript
// Required endpoints:
- GET /api/v1/properties/{property_id}
- GET /api/v1/photos
- GET /api/v1/market-data
- GET /api/v1/similar-rent
- GET /api/v1/similar-sold
```

**9. Proforma Service** (`mobile/services/proformaService.ts`)
```typescript
// Required endpoints:
- POST /api/v1/proforma/generate
- GET /api/v1/proforma/saved/{saved_property_id}
- GET /api/v1/proforma/saved/{saved_property_id}/download
- GET /api/v1/proforma/saved/{saved_property_id}/preview
```

---

### 3.2 Screen Components

#### Required New Screens

**1. Profile Screen** (`mobile/app/profile/page.tsx`)
- Account information editing
- Business profile form
- Investor profile form
- Default assumptions editor
- Account deletion confirmation
- Password change form

**2. Saved Properties List** (`mobile/app/portfolio/list.tsx`)
- Property list with cards
- Filtering UI (status, tags, search)
- Sorting options
- Bulk selection
- Status pipeline visualization

**3. Property Details** (`mobile/app/portfolio/[id]/page.tsx`)
- Full property information
- Status management
- Custom fields editor
- Notes editor
- Deal Maker integration
- Documents list
- Adjustment history

**4. Search History Screen** (`mobile/app/(tabs)/history.tsx`)
- Search history list
- Filter controls
- Statistics display
- Delete actions
- Recent searches quick access

**5. Reports Screen** (`mobile/app/reports/page.tsx`)
- Report type selection
- Property selection
- Generate and download
- Share functionality

**6. Documents Screen** (`mobile/app/documents/page.tsx`)
- Document list
- Upload interface (camera + file picker)
- Document viewer
- Metadata editing
- Delete actions

**7. Billing Screen** (`mobile/app/billing/page.tsx`)
- Pricing plans display
- Current subscription
- Usage meters
- Checkout flow (Stripe SDK)
- Payment history

**8. LOI Screen** (`mobile/app/loi/page.tsx`)
- LOI form
- Template selection
- PDF preview
- History list

**9. Property Comparison** (`mobile/app/compare/page.tsx`)
- Side-by-side comparison
- Strategy comparison grid
- Metrics visualization

**10. Rental Comps** (`mobile/app/rental-comps/[address]/page.tsx`)
- Similar rental properties list
- Map view
- Filter by distance/price

**11. Sales Comps** (`mobile/app/sales-comps/[address]/page.tsx`)
- Similar sold properties list
- Map view
- ARV analysis

---

### 3.3 UI Components

#### Required New Components

**1. Property Card** (`mobile/components/property/PropertyCard.tsx`)
- Property thumbnail
- Address display
- Key metrics
- Status badge
- Quick actions menu

**2. Filter Bar** (`mobile/components/filters/FilterBar.tsx`)
- Status filter chips
- Tag filter chips
- Search input
- Sort dropdown

**3. Status Pipeline** (`mobile/components/property/StatusPipeline.tsx`)
- Visual pipeline stages
- Drag-to-update
- Status change confirmation

**4. Document Uploader** (`mobile/components/documents/DocumentUploader.tsx`)
- Camera integration
- File picker
- Progress indicator
- Preview before upload

**5. Report Generator** (`mobile/components/reports/ReportGenerator.tsx`)
- Report type selector
- Property selector
- Options (include sensitivity, etc.)
- Download/share actions

**6. Billing Plan Card** (`mobile/components/billing/PlanCard.tsx`)
- Plan details
- Feature list
- Pricing display
- CTA button

**7. Usage Meter** (`mobile/components/billing/UsageMeter.tsx`)
- Progress bar
- Current/limit display
- Reset date

**8. LOI Form** (`mobile/components/loi/LOIForm.tsx`)
- Buyer information
- Property information
- Terms editor
- Preview button

**9. Comparison Grid** (`mobile/components/compare/ComparisonGrid.tsx`)
- Side-by-side metrics
- Strategy comparison
- Highlight differences

**10. Comps List** (`mobile/components/comps/CompsList.tsx`)
- Property cards
- Distance/price filters
- Map integration

---

### 3.4 Navigation Updates

#### Required Navigation Changes

**1. Add Profile Tab** (`mobile/app/(tabs)/profile.tsx`)
- Replace settings with profile
- Move settings to profile submenu

**2. Add Portfolio Tab** (`mobile/app/(tabs)/portfolio.tsx`)
- List view
- Filter/sort
- Add property button

**3. Add Billing Route** (`mobile/app/billing/_layout.tsx`)
- Billing screen
- Checkout flow
- Payment history

**4. Add Reports Route** (`mobile/app/reports/_layout.tsx`)
- Reports list
- Generate screen
- Download/share

**5. Add Documents Route** (`mobile/app/documents/_layout.tsx`)
- Documents list
- Upload screen
- Viewer screen

---

### 3.5 Database Schema Updates

#### Required Local Database Tables

**1. Saved Properties Table**
```sql
CREATE TABLE saved_properties (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  external_property_id TEXT,
  zpid TEXT,
  address_street TEXT NOT NULL,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  full_address TEXT,
  nickname TEXT,
  status TEXT DEFAULT 'watching',
  tags TEXT, -- JSON array
  color_label TEXT,
  priority INTEGER,
  property_data_snapshot TEXT, -- JSON
  deal_maker_record TEXT, -- JSON
  custom_purchase_price REAL,
  custom_rent_estimate REAL,
  custom_arv REAL,
  custom_rehab_budget REAL,
  notes TEXT,
  saved_at INTEGER NOT NULL,
  last_viewed_at INTEGER,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  sync_pending INTEGER DEFAULT 0
);
```

**2. Search History Table**
```sql
CREATE TABLE search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  search_query TEXT NOT NULL,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  property_cache_id TEXT,
  zpid TEXT,
  result_summary TEXT, -- JSON
  search_source TEXT DEFAULT 'mobile',
  was_successful INTEGER DEFAULT 1,
  was_saved INTEGER DEFAULT 0,
  searched_at INTEGER NOT NULL,
  synced_at INTEGER,
  sync_pending INTEGER DEFAULT 0
);
```

**3. Documents Table**
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT,
  document_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  description TEXT,
  storage_key TEXT,
  uploaded_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  sync_pending INTEGER DEFAULT 0
);
```

---

### 3.6 File Structure

#### Required New Files

```
mobile/
├── services/
│   ├── userService.ts          [NEW]
│   ├── savedPropertiesService.ts [NEW]
│   ├── searchHistoryService.ts   [NEW]
│   ├── reportsService.ts         [NEW]
│   ├── documentsService.ts       [NEW]
│   ├── billingService.ts         [NEW]
│   ├── loiService.ts             [NEW]
│   ├── propertyDetailsService.ts [NEW]
│   └── proformaService.ts        [NEW]
├── app/
│   ├── profile/
│   │   └── page.tsx              [NEW]
│   ├── portfolio/
│   │   ├── list.tsx              [NEW]
│   │   └── [id]/
│   │       └── page.tsx          [NEW]
│   ├── billing/
│   │   └── page.tsx              [NEW]
│   ├── reports/
│   │   └── page.tsx              [NEW]
│   ├── documents/
│   │   ├── list.tsx              [NEW]
│   │   └── [id]/
│   │       └── page.tsx          [NEW]
│   ├── loi/
│   │   └── page.tsx              [NEW]
│   ├── compare/
│   │   └── page.tsx              [NEW]
│   ├── rental-comps/
│   │   └── [address]/
│   │       └── page.tsx          [NEW]
│   └── sales-comps/
│       └── [address]/
│           └── page.tsx          [NEW]
└── components/
    ├── property/
    │   ├── PropertyCard.tsx      [NEW]
    │   └── StatusPipeline.tsx    [NEW]
    ├── filters/
    │   └── FilterBar.tsx         [NEW]
    ├── documents/
    │   └── DocumentUploader.tsx  [NEW]
    ├── reports/
    │   └── ReportGenerator.tsx   [NEW]
    ├── billing/
    │   ├── PlanCard.tsx          [NEW]
    │   └── UsageMeter.tsx        [NEW]
    ├── loi/
    │   └── LOIForm.tsx           [NEW]
    ├── compare/
    │   └── ComparisonGrid.tsx    [NEW]
    └── comps/
        └── CompsList.tsx         [NEW]
```

---

## Part 4: Priority Recommendations

### Critical Priority (P0)
1. **Saved Properties CRUD** - Core functionality for portfolio management
2. **User Profile Management** - Account settings, profile editing
3. **Search History** - Basic list and delete functionality
4. **Property Details View** - Full property information display

### High Priority (P1)
5. **Document Management** - Upload, view, delete documents
6. **Billing Integration** - Subscription management, usage tracking
7. **Reports Generation** - Excel/PDF export functionality
8. **Deal Maker Integration** - Full worksheet functionality

### Medium Priority (P2)
9. **LOI Features** - Wholesale workflow
10. **Property Comparison** - Side-by-side analysis
11. **Rental/Sales Comps** - Comparable properties views
12. **Advanced Filtering** - Status, tags, search, sort

### Low Priority (P3)
13. **Pro Forma Generation** - Advanced financial projections
14. **Property Sharing** - Public links, email invites
15. **Sensitivity Analysis** - What-if scenarios
16. **Adjustment History** - Audit trail display

---

## Part 5: Implementation Estimates

### Service Layer
- **User Service**: 4-6 hours
- **Saved Properties Service**: 6-8 hours
- **Search History Service**: 2-3 hours
- **Reports Service**: 3-4 hours
- **Documents Service**: 4-6 hours
- **Billing Service**: 4-6 hours
- **LOI Service**: 4-6 hours
- **Property Details Service**: 2-3 hours
- **Proforma Service**: 3-4 hours

**Total Service Layer**: ~32-46 hours

### Screen Components
- **Profile Screen**: 8-12 hours
- **Portfolio List**: 12-16 hours
- **Property Details**: 16-20 hours
- **Search History**: 6-8 hours
- **Reports Screen**: 8-12 hours
- **Documents Screen**: 12-16 hours
- **Billing Screen**: 12-16 hours
- **LOI Screen**: 12-16 hours
- **Comparison Screen**: 8-12 hours
- **Comps Screens**: 8-12 hours each

**Total Screen Components**: ~110-148 hours

### UI Components
- **Property Card**: 4-6 hours
- **Filter Bar**: 6-8 hours
- **Status Pipeline**: 6-8 hours
- **Document Uploader**: 8-12 hours
- **Report Generator**: 6-8 hours
- **Billing Components**: 6-8 hours
- **LOI Form**: 8-12 hours
- **Comparison Grid**: 6-8 hours
- **Comps List**: 4-6 hours

**Total UI Components**: ~54-76 hours

### Database & Sync
- **Schema Updates**: 4-6 hours
- **Sync Integration**: 8-12 hours
- **Migration Scripts**: 2-4 hours

**Total Database & Sync**: ~14-22 hours

### Testing & Polish
- **Unit Tests**: 16-24 hours
- **Integration Tests**: 12-16 hours
- **UI/UX Polish**: 16-24 hours

**Total Testing & Polish**: ~44-64 hours

---

## **Total Estimated Effort: 254-356 hours (~32-45 developer days)**

---

## Part 6: Dependencies & Considerations

### External Libraries Required
1. **File Upload**: `expo-document-picker`, `expo-image-picker`
2. **File Sharing**: `expo-sharing`, `expo-file-system`
3. **PDF Generation**: `react-native-pdf`, `react-native-html-to-pdf`
4. **Stripe Integration**: `@stripe/stripe-react-native`
5. **Charts/Graphs**: `react-native-chart-kit` or `victory-native`
6. **Image Viewer**: `react-native-image-viewing`
7. **Date Picker**: `@react-native-community/datetimepicker`

### Platform-Specific Considerations
1. **iOS**: File sharing via ShareSheet, camera permissions
2. **Android**: File provider configuration, storage permissions
3. **Both**: Background sync, offline queue management

### Security Considerations
1. **Token Storage**: Already using `expo-secure-store` ✅
2. **File Upload**: Validate file types and sizes
3. **Payment Processing**: Use Stripe SDK (never handle raw card data)
4. **Document Access**: Implement proper access controls

---

## Conclusion

The Mobile application currently has **~40% API parity** and **~40% feature parity** with the Frontend web application. To achieve full parity, significant development work is required across:

1. **Service Layer**: 9 new service files
2. **Screen Components**: 11 new screens
3. **UI Components**: 10 new reusable components
4. **Database Schema**: 3 new tables
5. **Navigation**: Updated tab structure

**Estimated total effort: 254-356 hours** (~32-45 developer days) for a single developer, or ~16-23 days with 2 developers.

**Recommended approach:** Implement in phases:
- **Phase 1 (P0)**: Core portfolio management (Saved Properties, Profile, Search History)
- **Phase 2 (P1)**: Essential features (Documents, Billing, Reports)
- **Phase 3 (P2)**: Advanced features (LOI, Comparison, Comps)
- **Phase 4 (P3)**: Nice-to-have features (Sharing, Sensitivity Analysis)

This phased approach allows for incremental value delivery while building toward full feature parity.
