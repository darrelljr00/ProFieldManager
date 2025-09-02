# Pro Field Manager - Android Studio Project

This is a complete Android Studio project for the Pro Field Manager application, designed to wrap your web application with native Android functionality.

## Features

✅ **16 KB Page Alignment Compliance** 
- Updated for Google Play's November 2025 requirement
- All native libraries built with 16 KB page alignment
- Compatible with Android 15+ devices

✅ **WebView Integration**
- Displays your web app (profieldmanager.com) in a native Android container
- Full JavaScript interface for native functionality
- Support for file uploads and camera access

✅ **Native Camera Functionality**
- Access device camera through WebView file inputs
- Capture photos with native camera interface
- Automatic file handling and upload integration

✅ **GPS/Location Services**
- Background GPS tracking
- Location data accessible via JavaScript interface
- Foreground service with notification

✅ **File System Access**
- Native file picker for document selection
- Support for multiple file types
- Proper Android scoped storage handling

✅ **Permissions Management**
- Runtime permission requests for camera, location, storage
- User-friendly permission explanations
- Graceful handling of denied permissions

## Project Structure

```
ProFieldManagerAndroid/
├── app/
│   ├── src/main/
│   │   ├── java/com/profieldmanager/
│   │   │   ├── MainActivity.kt              # Main WebView activity
│   │   │   ├── WebAppInterface.kt           # JavaScript bridge
│   │   │   ├── camera/
│   │   │   │   └── CameraActivity.kt        # Native camera
│   │   │   ├── filepicker/
│   │   │   │   └── FilePickerActivity.kt    # File selection
│   │   │   └── gps/
│   │   │       ├── GPSManager.kt            # GPS functionality
│   │   │       └── GPSService.kt            # Background service
│   │   ├── res/                             # Android resources
│   │   ├── cpp/                             # Native libraries (16KB aligned)
│   │   └── AndroidManifest.xml              # App permissions & components
│   └── build.gradle                         # App-level Gradle config
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar               # Gradle wrapper binary
│       └── gradle-wrapper.properties        # Wrapper configuration
├── gradlew                                  # Unix Gradle wrapper
├── gradlew.bat                              # Windows Gradle wrapper
├── build.gradle                             # Project-level Gradle config
├── settings.gradle                          # Project settings
├── gradle.properties                        # Gradle properties
└── build_apk.sh                            # Build script
```

## Quick Start

1. **Open in Android Studio:**
   - Download and extract the project
   - Open Android Studio
   - Choose "Open an existing project"
   - Select the `ProFieldManagerAndroid` folder

2. **Build APK via Script:**
   ```bash
   ./build_apk.sh
   ```

3. **Build APK via Android Studio:**
   - Click "Build" menu → "Build Bundle(s) / APK(s)" → "Build APK(s)"
   - APK will be generated in `app/build/outputs/apk/debug/`

4. **Install APK:**
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

## Configuration

### Web App URL
Update the web app URL in `MainActivity.kt`:
```kotlin
val webUrl = "https://profieldmanager.com" // Your web app URL
```

### App Information
Update app details in `app/build.gradle`:
```gradle
android {
    defaultConfig {
        applicationId "com.profieldmanager"        // Your package name
        versionCode 1                              // Version number
        versionName "1.0"                         // Version string
    }
}
```

### App Name & Branding
Update in `app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Pro Field Manager</string>
```

## Requirements

- **Android Studio**: 4.2+ (recommended: latest stable)
- **Gradle**: 8.7+ (included in wrapper)
- **Android SDK**: API 24+ (Android 7.0) minimum
- **Target SDK**: API 35 (Android 15) for Google Play compliance
- **NDK**: 26.3.11579264 for 16 KB page alignment

## Key Features Implementation

### 1. WebView JavaScript Interface
The app provides native functionality to your web app through `WebAppInterface.kt`:

```javascript
// Access native camera
AndroidInterface.openCamera();

// Get GPS location
const location = JSON.parse(AndroidInterface.getCurrentLocation());

// Show native toast
AndroidInterface.showToast("Hello from web app!");
```

### 2. Camera Integration
When your web app triggers file input with camera capture:
```html
<input type="file" accept="image/*" capture="camera">
```
The app automatically launches the native camera interface.

### 3. GPS Tracking
Background GPS service provides continuous location updates accessible via:
```javascript
const location = JSON.parse(AndroidInterface.getCurrentLocation());
console.log(location.latitude, location.longitude);
```

## Google Play Store Compliance

✅ **16 KB Page Alignment**: All native libraries built with `-Wl,-z,max-page-size=16384`
✅ **Target SDK 35**: Updated for Android 15 compatibility  
✅ **Privacy**: Proper permission declarations and runtime requests
✅ **Security**: HTTPS support, secure WebView settings

## Troubleshooting

### Build Issues
- Ensure you have Android Studio with SDK Platform 35 installed
- Run `./gradlew clean` before rebuilding
- Check that NDK version 26.3.11579264 is installed

### Runtime Issues
- Verify all permissions are granted in Android Settings
- Check WebView console logs via Chrome DevTools (`chrome://inspect`)
- Ensure your web app URL is accessible and HTTPS enabled

### Google Play Upload Issues
- Verify 16 KB page alignment fix is applied
- Use Android Studio's "Generate Signed Bundle" for release builds
- Test on physical Android 15+ device before submission

## Development Notes

- The project uses Kotlin for all Android code
- Native libraries include 16 KB page alignment for Google Play compliance
- WebView is configured for full web app compatibility
- Background services properly handle Android battery optimization
- All permissions follow Android 13+ privacy guidelines

## Support

For issues specific to the Android wrapper, check:
1. Android Studio build logs
2. Device logcat output: `adb logcat -s ProFieldManager`
3. WebView console via Chrome DevTools
4. Android app permissions in device settings