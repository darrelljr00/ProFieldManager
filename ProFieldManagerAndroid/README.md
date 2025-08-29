# Pro Field Manager - Android Studio Project

This is a complete Android Studio project for the Pro Field Manager application, designed to wrap your web application with native Android functionality.

## Features

✅ **WebView Integration**
- Displays your web app (profieldmanager.com) in a native Android container
- Full JavaScript support with native interface communication

✅ **Native Camera Support**
- Direct camera access for photo capture
- Integration with web app file upload workflows
- Custom camera activity with preview

✅ **File System Access**
- Native file picker for document and media selection
- Multiple file selection support
- Secure file sharing between app and web interface

✅ **GPS & Location Services**
- Background GPS tracking service
- Real-time location updates
- Location data sharing with web app

✅ **Comprehensive Permissions**
- Camera access
- Location tracking (foreground & background)
- File system read/write
- Notifications
- Phone state access

✅ **Modern Android Architecture**
- Target SDK 34 (Android 14)
- Jetpack Compose support
- Material Design 3 theming
- Kotlin-first development

## Project Structure

```
ProFieldManagerAndroid/
├── app/
│   ├── build.gradle                 # App-level dependencies and configuration
│   ├── proguard-rules.pro          # Code obfuscation rules
│   └── src/main/
│       ├── AndroidManifest.xml     # App permissions and components
│       ├── java/com/profieldmanager/
│       │   ├── MainActivity.kt      # Main WebView activity
│       │   ├── WebAppInterface.kt   # JavaScript ↔ Android bridge
│       │   ├── camera/
│       │   │   └── CameraActivity.kt # Native camera functionality
│       │   ├── filepicker/
│       │   │   └── FilePickerActivity.kt # File selection
│       │   └── gps/
│       │       ├── GPSManager.kt    # Location management
│       │       └── GPSService.kt    # Background location service
│       └── res/                     # UI layouts, strings, icons, themes
├── build.gradle                     # Project-level configuration
├── settings.gradle                  # Module settings
├── gradle.properties               # Global Gradle settings
└── gradlew / gradlew.bat           # Gradle wrapper scripts
```

## Setup Instructions

### 1. Prerequisites
- **Android Studio**: Latest version (Hedgehog or newer)
- **Java Development Kit**: JDK 17 or higher
- **Android SDK**: API level 34 (Android 14)

### 2. Import Project
1. Open Android Studio
2. Select "Import Project" or "Open an existing Android Studio project"
3. Navigate to the `ProFieldManagerAndroid` folder
4. Click "OK" to import

### 3. Sync and Build
1. Android Studio will automatically start syncing Gradle
2. Wait for "Gradle Sync" to complete (check bottom status bar)
3. Once synced, build the project: **Build → Make Project**

### 4. Generate APK
1. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for build to complete
3. Click "locate" in the notification to find your APK file
4. APK will be in: `app/build/outputs/apk/debug/app-debug.apk`

### 5. Install and Test
- Install APK on device: `adb install app-debug.apk`
- Or drag & drop APK onto Android emulator

## Web App Integration

The Android app loads your web application from `https://profieldmanager.com`. To change this:

1. Open `MainActivity.kt`
2. Find the line: `val webUrl = "https://profieldmanager.com"`
3. Update to your desired URL
4. Rebuild the APK

## JavaScript ↔ Native Communication

Your web app can access native Android features through the `AndroidInterface` object:

```javascript
// Take a photo
AndroidInterface.openCamera();

// Get current GPS location
const location = JSON.parse(AndroidInterface.getCurrentLocation());

// Show Android toast notification
AndroidInterface.showToast("Hello from web app!");

// Get device information
const deviceInfo = JSON.parse(AndroidInterface.getDeviceInfo());

// Vibrate device
AndroidInterface.vibrate(200); // 200ms

// Check network status
const isOnline = AndroidInterface.isNetworkAvailable();
```

## Permissions

The app requests these permissions automatically:
- **Camera**: Photo capture functionality
- **Location**: GPS tracking (fine & coarse location)
- **Storage**: File access for uploads/downloads
- **Notifications**: Push notification support
- **Phone State**: Device identification
- **Internet**: Web app communication

## Customization

### App Name & Icon
- **Name**: Modify `app/src/main/res/values/strings.xml`
- **Icon**: Replace files in `app/src/main/res/mipmap-*` folders

### Theme & Colors
- **Colors**: Edit `app/src/main/res/values/colors.xml`
- **Theme**: Modify `app/src/main/res/values/themes.xml`

### App Package & ID
1. Change `applicationId` in `app/build.gradle`
2. Rename package folders under `src/main/java/`
3. Update import statements in Kotlin files

## Building for Release

### 1. Generate Signed APK
1. **Build → Generate Signed Bundle / APK**
2. Choose "APK" → Click "Next"
3. Create new keystore or use existing
4. Select "release" build type
5. Click "Finish"

### 2. Release Checklist
- [ ] Update `versionCode` and `versionName` in `build.gradle`
- [ ] Test on multiple devices/screen sizes
- [ ] Verify all permissions work correctly
- [ ] Test camera, GPS, and file picker functionality
- [ ] Confirm web app loads properly
- [ ] Test offline behavior

## Troubleshooting

### Gradle Sync Issues
```bash
./gradlew clean
./gradlew build --refresh-dependencies
```

### Build Failures
- Check Android SDK is properly installed
- Verify JDK version compatibility
- Update Android Studio and build tools

### Permission Errors
- Ensure target device has Android 6.0+ for runtime permissions
- Test permission flows on different Android versions

## Syncing with Replit Changes

When you update your web app code in Replit, the Android app will automatically show the latest version since it loads the web app directly from your live URL.

For updating native Android functionality:
1. Make changes to the Android code
2. Rebuild the APK: **Build → Build APK(s)**
3. Install updated APK on devices

## Support

For Android-specific issues:
- Check Android Studio's "Build" panel for detailed error messages
- Review device logs: **View → Tool Windows → Logcat**
- Test on Android emulator before physical device

The Android app is designed to be a robust native container for your existing Pro Field Manager web application with full access to device capabilities.