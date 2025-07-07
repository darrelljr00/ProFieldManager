const fs = require('fs').promises;
const path = require('path');

async function checkFileIntegrity() {
  // Check if files in database actually exist
  console.log('Checking file integrity...');
  
  const uploadsDir = 'uploads';
  
  try {
    const orgDirs = await fs.readdir(uploadsDir);
    for (const orgDir of orgDirs) {
      if (orgDir.startsWith('org-')) {
        const filesDir = path.join(uploadsDir, orgDir, 'files');
        try {
          const files = await fs.readdir(filesDir);
          console.log(`${orgDir}/files contains ${files.length} files`);
        } catch (err) {
          console.log(`${orgDir}/files directory not accessible`);
        }
      }
    }
  } catch (err) {
    console.error('Error checking file integrity:', err.message);
  }
}

checkFileIntegrity();
