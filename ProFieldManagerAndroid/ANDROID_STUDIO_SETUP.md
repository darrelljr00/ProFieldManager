# Android Studio Setup Guide for Pro Field Manager

## 🚀 Complete Setup Instructions

### Step 1: Download and Install Android Studio
1. Visit [developer.android.com/studio](https://developer.android.com/studio)
2. Download Android Studio (latest version)
3. Install with default settings

### Step 2: SDK Setup
1. Open Android Studio
2. Go to **Tools → SDK Manager**
3. Install these components:
   - **Android SDK Platform 34** (Android 14)
   - **Android SDK Build-Tools 34.0.0**
   - **Android Emulator** (if you want to test on emulator)

### Step 3: Import Project
1. In Android Studio: **File → Open**
2. Navigate to `ProFieldManagerAndroid` folder
3. Click **OK**
4. Wait for Gradle sync to complete (bottom status bar)

### Step 4: Build APK
**Option A: Through Android Studio**
1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for build completion
3. Click **locate** in notification popup
4. APK is at: `app/build/outputs/apk/debug/app-debug.apk`

**Option B: Command Line (Linux/Mac)**
```bash
cd ProFieldManagerAndroid
chmod +x build_apk.sh
./build_apk.sh
```

**Option C: Manual Gradle**
```bash
cd ProFieldManagerAndroid
./gradlew clean
./gradlew assembleDebug
```

### Step 5: Install APK on Device

**USB Device:**
1. Enable **Developer Options** on Android device
2. Enable **USB Debugging**
3. Connect device to computer
4. Run: `adb install app/build/outputs/apk/debug/app-debug.apk`

**Android Emulator:**
1. In Android Studio: **Tools → AVD Manager**
2. Create/start emulator
3. Drag APK file onto emulator window

## 🔧 Customization Options

### Change App Name
Edit `app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Your App Name</string>
```

### Change Web URL
Edit `MainActivity.kt`, line ~95:
```kotlin
val webUrl = "https://your-domain.com"
```

### Change App Icon
Replace files in these folders:
- `app/src/main/res/mipmap-hdpi/` (72x72px)
- `app/src/main/res/mipmap-mdpi/` (48x48px)
- `app/src/main/res/mipmap-xhdpi/` (96x96px)
- `app/src/main/res/mipmap-xxhdpi/` (144x144px)
- `app/src/main/res/mipmap-xxxhdpi/` (192x192px)

### Change Package Name
1. Update `applicationId` in `app/build.gradle`
2. Rename package folders under `src/main/java/`
3. Update import statements

## 📱 Native Features Available

Your web app can access these Android features via JavaScript:

```javascript
// Camera
AndroidInterface.openCamera();

// File picker
AndroidInterface.openFilePicker();

// GPS location
const location = JSON.parse(AndroidInterface.getCurrentLocation());

// Device info
const device = JSON.parse(AndroidInterface.getDeviceInfo());

// Toast notification
AndroidInterface.showToast("Hello!");

// Vibration
AndroidInterface.vibrate(200);

// Network check
const online = AndroidInterface.isNetworkAvailable();
```

## 🛠 Troubleshooting

### Gradle Sync Failed
```bash
./gradlew clean
./gradlew build --refresh-dependencies
```

### Build Errors
- Verify Android SDK is installed
- Check JDK version (needs JDK 17+)
- Update Android Studio to latest version

### APK Install Failed
- Check USB debugging is enabled
- Try different USB cable/port
- Verify device allows unknown sources

### App Crashes on Device
- Check device Android version (needs 7.0+)
- Review device logs: **View → Tool Windows → Logcat**
- Test on Android emulator first

## 🔄 Sync with Replit Updates

The Android app loads your web app directly from the live URL, so web changes appear immediately. To update native Android functionality:

1. Modify Android code in Android Studio
2. Rebuild APK: **Build → Build APK(s)**
3. Install updated APK

## ✅ Pre-Deployment Checklist

Before releasing your APK:

- [ ] Test camera functionality
- [ ] Test file picker
- [ ] Test GPS tracking
- [ ] Test on multiple Android versions
- [ ] Verify all permissions work
- [ ] Test on different screen sizes
- [ ] Update version code/name in `build.gradle`
- [ ] Generate signed release APK (not debug)

## 📞 Support

For Android-specific issues:
1. Check Android Studio's **Build** output panel
2. Review **Logcat** for runtime errors
3. Test on Android emulator before physical devices
4. Consult Android developer documentation