package com.profieldmanager

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.profieldmanager.camera.CameraActivity
import com.profieldmanager.filepicker.FilePickerActivity
import com.profieldmanager.gps.GPSService

class MainActivity : ComponentActivity() {
    
    private lateinit var webView: WebView
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private lateinit var cameraLauncher: ActivityResultLauncher<Intent>
    private lateinit var filePickerLauncher: ActivityResultLauncher<Intent>
    
    // Permission request codes
    private val PERMISSION_REQUEST_CODE = 100
    private val REQUIRED_PERMISSIONS = arrayOf(
        Manifest.permission.CAMERA,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.READ_EXTERNAL_STORAGE,
        Manifest.permission.WRITE_EXTERNAL_STORAGE
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initializeWebView()
        requestPermissions()
        startGPSService()
        setupActivityLaunchers()
    }

    private fun initializeWebView() {
        webView = findViewById(R.id.webView)
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            mediaPlaybackRequiresUserGesture = false
            setSupportMultipleWindows(true)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                safeBrowsingEnabled = false
            }
            
            // Enable mixed content for HTTPS/HTTP communication
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }

        // Add JavaScript interface for native functionality
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidInterface")
        
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                return false
            }
        }
        
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback = filePathCallback
                
                val acceptTypes = fileChooserParams?.acceptTypes
                val captureEnabled = fileChooserParams?.isCaptureEnabled ?: false
                
                if (captureEnabled || acceptTypes?.contains("image/*") == true) {
                    // Launch camera for image capture
                    val cameraIntent = Intent(this@MainActivity, CameraActivity::class.java)
                    cameraLauncher.launch(cameraIntent)
                } else {
                    // Launch file picker
                    val filePickerIntent = Intent(this@MainActivity, FilePickerActivity::class.java)
                    filePickerLauncher.launch(filePickerIntent)
                }
                
                return true
            }
        }
        
        // Load your web app URL
        val webUrl = "https://profieldmanager.com" // Replace with your actual web app URL
        webView.loadUrl(webUrl)
    }
    
    private fun setupActivityLaunchers() {
        cameraLauncher = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->
            if (result.resultCode == RESULT_OK) {
                val imageUri = result.data?.getParcelableExtra<Uri>("imageUri")
                imageUri?.let {
                    fileUploadCallback?.onReceiveValue(arrayOf(it))
                }
            } else {
                fileUploadCallback?.onReceiveValue(null)
            }
            fileUploadCallback = null
        }
        
        filePickerLauncher = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->
            if (result.resultCode == RESULT_OK) {
                val selectedFiles = result.data?.getParcelableArrayListExtra<Uri>("selectedFiles")
                selectedFiles?.let {
                    fileUploadCallback?.onReceiveValue(it.toTypedArray())
                }
            } else {
                fileUploadCallback?.onReceiveValue(null)
            }
            fileUploadCallback = null
        }
    }

    private fun requestPermissions() {
        val permissionsToRequest = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        }
    }

    private fun startGPSService() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) 
            == PackageManager.PERMISSION_GRANTED) {
            val gpsIntent = Intent(this, GPSService::class.java)
            startService(gpsIntent)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val locationPermissionGranted = grantResults.isNotEmpty() &&
                    permissions.indexOf(Manifest.permission.ACCESS_FINE_LOCATION) >= 0 &&
                    grantResults[permissions.indexOf(Manifest.permission.ACCESS_FINE_LOCATION)] == PackageManager.PERMISSION_GRANTED

            if (locationPermissionGranted) {
                startGPSService()
            }
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}