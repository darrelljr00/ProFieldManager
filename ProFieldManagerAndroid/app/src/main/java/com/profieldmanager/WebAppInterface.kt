package com.profieldmanager

import android.content.Context
import android.content.Intent
import android.webkit.JavascriptInterface
import android.widget.Toast
import com.profieldmanager.camera.CameraActivity
import com.profieldmanager.filepicker.FilePickerActivity
import com.profieldmanager.gps.GPSManager
import org.json.JSONObject

class WebAppInterface(private val context: Context) {
    
    private val gpsManager = GPSManager(context)

    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun openCamera() {
        val intent = Intent(context, CameraActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun openFilePicker() {
        val intent = Intent(context, FilePickerActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun getCurrentLocation(): String {
        val location = gpsManager.getCurrentLocation()
        val jsonObject = JSONObject()
        
        if (location != null) {
            jsonObject.put("latitude", location.latitude)
            jsonObject.put("longitude", location.longitude)
            jsonObject.put("accuracy", location.accuracy)
            jsonObject.put("timestamp", System.currentTimeMillis())
        } else {
            jsonObject.put("error", "Location not available")
        }
        
        return jsonObject.toString()
    }

    @JavascriptInterface
    fun requestLocationPermission(): Boolean {
        return gpsManager.hasLocationPermission()
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        val jsonObject = JSONObject()
        jsonObject.put("manufacturer", android.os.Build.MANUFACTURER)
        jsonObject.put("model", android.os.Build.MODEL)
        jsonObject.put("version", android.os.Build.VERSION.RELEASE)
        jsonObject.put("sdk", android.os.Build.VERSION.SDK_INT)
        return jsonObject.toString()
    }

    @JavascriptInterface
    fun vibrate(duration: Long) {
        try {
            @Suppress("DEPRECATION")
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as android.os.Vibrator
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                vibrator.vibrate(android.os.VibrationEffect.createOneShot(duration, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(duration)
            }
        } catch (e: Exception) {
            // Vibration not supported
        }
    }

    @JavascriptInterface
    fun isNetworkAvailable(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
        val activeNetwork = connectivityManager.activeNetworkInfo
        return activeNetwork?.isConnectedOrConnecting == true
    }
}