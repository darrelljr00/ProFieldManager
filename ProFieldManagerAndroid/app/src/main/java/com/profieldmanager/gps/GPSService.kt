package com.profieldmanager.gps

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.profieldmanager.R

class GPSService : Service() {
    
    private lateinit var gpsManager: GPSManager
    private val NOTIFICATION_ID = 1001
    private val CHANNEL_ID = "GPS_SERVICE_CHANNEL"

    override fun onCreate() {
        super.onCreate()
        gpsManager = GPSManager(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        
        gpsManager.startLocationUpdates { location ->
            location?.let {
                // Send location data to your web app or store locally
                sendLocationToWebApp(it)
            }
        }
        
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        gpsManager.stopLocationUpdates()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "GPS Service",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.description = "GPS tracking service for Pro Field Manager"
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pro Field Manager")
            .setContentText("GPS tracking is active")
            .setSmallIcon(R.drawable.ic_location)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun sendLocationToWebApp(location: Location) {
        // Here you would typically send the location data to your web app
        // You could use a broadcast receiver, shared preferences, or API call
        
        // For now, we'll just store it in shared preferences
        val sharedPrefs = getSharedPreferences("ProFieldManager", MODE_PRIVATE)
        with(sharedPrefs.edit()) {
            putString("last_latitude", location.latitude.toString())
            putString("last_longitude", location.longitude.toString())
            putLong("last_location_time", System.currentTimeMillis())
            apply()
        }
    }
}