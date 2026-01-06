# InvestIQ Mobile

> Point. Scan. Invest with Confidence.

A cross-platform mobile application that enables real estate investors to instantly analyze any property by pointing their phone at it.

## Features

### 🎯 Point-and-Scan Analysis
- Camera integration with GPS and compass
- Instant property identification
- Real-time investment analytics

### 📍 GPS Location Services
- Automatic location detection
- Nearby property discovery
- Navigation integration

### 🗺️ Interactive Maps
- Property visualization with investment overlays
- Filter by investment strategy
- Cash flow heatmaps

### 📱 Offline Capabilities
- Local data caching with WatermelonDB
- Background sync when online
- Pre-cache nearby property data

### 🌐 Cross-Platform
- iOS (iPhone and iPad)
- Android phones and tablets
- Shared codebase with React Native + Expo

## Tech Stack

- **Framework**: React Native with Expo SDK 51
- **Navigation**: Expo Router (file-based)
- **State Management**: Zustand + React Query
- **Database**: WatermelonDB (offline-first)
- **Maps**: React Native Maps
- **Sensors**: Expo Location, Expo Sensors (compass)
- **Camera**: Expo Camera
- **UI**: Custom components with Reanimated 3

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for emulator)

### Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start development server
npm start
```

### Running on Device

```bash
# iOS
npm run ios

# Android
npm run android
```

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
npm run build:ios

# Build for Android
npm run build:android
```

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigator
│   │   ├── scan.tsx       # Camera/scan screen
│   │   ├── map.tsx        # Map screen
│   │   ├── history.tsx    # Scan history
│   │   ├── portfolio.tsx  # Portfolio tracker
│   │   └── settings.tsx   # Settings
│   ├── property/          # Property detail screens
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── scanner/           # Scan-related components
│   └── ui/                # UI primitives
├── hooks/                 # Custom hooks
├── services/              # API and data services
├── utils/                 # Utility functions
├── theme/                 # Colors, typography, spacing
└── database/              # WatermelonDB schema
```

## Core Screens

### Scan Screen (Home)
The primary screen featuring:
- Camera viewfinder with scan target reticle
- Compass display showing heading
- Distance slider for property targeting
- One-tap scanning

### Map Screen
Interactive map showing:
- User location
- Nearby properties with profit/loss markers
- Strategy filters
- Property quick-view cards

### History Screen
Scan history with:
- Recent scans list
- Favorites filter
- Quick metrics preview
- Direct navigation to analysis

### Portfolio Screen
Investment tracking:
- Owned properties list
- Performance metrics
- Cash flow tracking
- Equity growth

## API Integration

The app connects to the InvestIQ backend API:

```
POST /api/v1/analyze         # Full property analysis
GET  /api/v1/parcels/lookup  # Parcel by coordinates
GET  /api/v1/parcels/search  # Parcels in area
GET  /api/v1/market/{zip}    # Market data
```

## Offline Mode

The app uses WatermelonDB for:
- Caching scanned properties
- Storing portfolio data
- Pre-caching nearby parcels
- Sync queue for offline changes

## Configuration

Create a `.env` file:

```env
# Development (local backend)
EXPO_PUBLIC_API_URL=http://localhost:8000

# Production
EXPO_PUBLIC_API_URL=https://dealscope-production.up.railway.app

EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

## Development Roadmap

### Phase 1: Foundation ✅
- [x] Project setup
- [x] Navigation structure
- [x] Camera integration
- [x] GPS/Compass sensors
- [x] Core UI components

### Phase 2: Core Features (In Progress)
- [ ] API integration
- [ ] Complete analysis views
- [ ] Interactive charts
- [ ] Assumptions adjustment

### Phase 3: Enhancement
- [ ] Offline sync
- [ ] Push notifications
- [ ] Portfolio tracking
- [ ] Property comparison

### Phase 4: Polish
- [ ] Performance optimization
- [ ] Accessibility
- [ ] App Store assets
- [ ] Beta testing

## Contributing

1. Create a feature branch
2. Make your changes
3. Test on both iOS and Android
4. Submit a pull request

## License

Proprietary - All rights reserved.

---

Built with ❤️ for real estate investors.

