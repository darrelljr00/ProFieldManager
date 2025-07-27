# Pro Field Manager Mobile App

A comprehensive React Native mobile application for field service management, built with Expo and designed for professional field operations.

## Features

### Core Functionality
- **Dashboard**: Real-time overview with stats, activity feed, and quick actions
- **Jobs Management**: View, filter, and manage field jobs with priority indicators
- **Camera Integration**: Take photos with GPS location and automatic upload
- **GPS Tracking**: Real-time location tracking with address resolution
- **Inspections**: Pre-trip and post-trip vehicle inspections with digital forms
- **Time Clock**: Clock in/out with location verification and time tracking

### Technical Features
- **Authentication**: Secure login with JWT token management
- **Offline Support**: Local storage with sync capabilities
- **Real-time Updates**: WebSocket integration for live data
- **Cloud Storage**: Automatic photo backup and file management
- **Push Notifications**: Alert system for important updates

## Technology Stack

- **Framework**: React Native with Expo
- **UI Library**: React Native Paper (Material Design)
- **Navigation**: React Navigation v6
- **State Management**: TanStack Query (React Query)
- **Maps**: React Native Maps with Google Maps integration
- **Camera**: Expo Camera with media library support
- **Location**: Expo Location with background tracking
- **Storage**: AsyncStorage for local data persistence

## Development Setup

### Prerequisites
- Node.js 18+ 
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on device/simulator:
```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android
```

## Build & Deployment

### Development Build
```bash
eas build --profile development --platform all
```

### Production APK (Android)
```bash
eas build --profile production-apk --platform android
```

### Production IPA (iOS)
```bash
eas build --profile production --platform ios
```

### App Store Submission
```bash
eas submit --platform all
```

## Configuration

### Environment Variables
Create a `.env` file in the mobile directory:
```
EXPO_PUBLIC_API_URL=https://your-backend-url.com
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Backend Integration
Update the API base URL in `src/services/AuthService.ts` and `src/services/ApiService.ts`:
```typescript
private baseUrl = 'https://your-backend-url.com';
```

## App Architecture

### File Structure
```
mobile/
├── src/
│   ├── screens/           # Screen components
│   ├── services/          # API and business logic
│   ├── components/        # Reusable UI components
│   └── utils/            # Helper functions
├── android/              # Android-specific configuration
├── ios/                  # iOS-specific configuration
├── App.tsx              # Main app component
└── package.json         # Dependencies and scripts
```

### Key Services

1. **AuthService**: Handles user authentication and token management
2. **ApiService**: Centralized API communication with automatic token injection
3. **StorageService**: Local data persistence and cache management

### Screen Navigation

The app uses a bottom tab navigator with the following screens:
- Dashboard (Home)
- Jobs (Project management)
- Camera (Photo capture)
- Inspections (Vehicle forms)
- GPS (Location tracking)
- Time Clock (Time tracking)

## Security Features

- **Secure Authentication**: JWT tokens with automatic expiry handling
- **Location Privacy**: GPS data encrypted and organization-isolated
- **File Security**: Photos uploaded to secure cloud storage
- **Permission Management**: Granular camera, location, and storage permissions

## Performance Optimizations

- **Query Caching**: TanStack Query for efficient data fetching
- **Image Compression**: Automatic photo optimization before upload
- **Background Sync**: Offline capability with sync when online
- **Memory Management**: Efficient component lifecycle and cleanup

## Platform Support

### Android
- Minimum SDK: API 23 (Android 6.0)
- Target SDK: API 34 (Android 14)
- Supports: ARMv7, ARM64, x86, x86_64

### iOS
- Minimum: iOS 13.4
- Target: iOS 17+
- Supports: iPhone, iPad

## Troubleshooting

### Common Issues

1. **Metro bundler issues**:
```bash
npx expo start --clear
```

2. **iOS build failures**:
```bash
cd ios && pod install
```

3. **Android permissions**:
Check AndroidManifest.xml for required permissions

4. **API connection issues**:
Verify backend URL and network connectivity

## Contributing

1. Follow the existing code style and patterns
2. Test on both iOS and Android devices
3. Update documentation for new features
4. Ensure proper error handling and user feedback

## License

Professional Field Manager Mobile App
Copyright © 2025 Pro Field Manager

For support, contact: support@profieldmanager.com