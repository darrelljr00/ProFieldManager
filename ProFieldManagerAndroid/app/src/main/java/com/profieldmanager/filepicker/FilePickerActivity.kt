package com.profieldmanager.filepicker

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.profieldmanager.R

class FilePickerActivity : ComponentActivity() {
    
    private lateinit var filePickerLauncher: ActivityResultLauncher<Intent>
    private val selectedFiles = mutableListOf<Uri>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_file_picker)
        
        setupFilePickerLauncher()
        setupUI()
        
        // Immediately launch file picker
        openFilePicker()
    }

    private fun setupFilePickerLauncher() {
        filePickerLauncher = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->
            if (result.resultCode == Activity.RESULT_OK) {
                val data = result.data
                data?.let { handleFilePickerResult(it) }
            } else {
                // User cancelled file selection
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }
    }

    private fun setupUI() {
        // Setup RecyclerView for selected files (if needed)
        val recyclerView = findViewById<RecyclerView>(R.id.selectedFilesRecyclerView)
        recyclerView.layoutManager = LinearLayoutManager(this)
        
        // Setup buttons
        findViewById<android.widget.Button>(R.id.selectMoreFilesButton).setOnClickListener {
            openFilePicker()
        }
        
        findViewById<android.widget.Button>(R.id.confirmSelectionButton).setOnClickListener {
            returnSelectedFiles()
        }
        
        findViewById<android.widget.Button>(R.id.cancelButton).setOnClickListener {
            setResult(Activity.RESULT_CANCELED)
            finish()
        }
    }

    private fun openFilePicker() {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        }
        
        val chooserIntent = Intent.createChooser(intent, "Select Files")
        filePickerLauncher.launch(chooserIntent)
    }

    private fun handleFilePickerResult(data: Intent) {
        selectedFiles.clear()
        
        if (data.clipData != null) {
            // Multiple files selected
            val clipData = data.clipData!!
            for (i in 0 until clipData.itemCount) {
                val uri = clipData.getItemAt(i).uri
                selectedFiles.add(uri)
            }
        } else if (data.data != null) {
            // Single file selected
            selectedFiles.add(data.data!!)
        }
        
        // Auto-return if files are selected
        if (selectedFiles.isNotEmpty()) {
            returnSelectedFiles()
        }
    }

    private fun returnSelectedFiles() {
        val resultIntent = Intent()
        resultIntent.putParcelableArrayListExtra("selectedFiles", ArrayList(selectedFiles))
        setResult(Activity.RESULT_OK, resultIntent)
        finish()
    }
}