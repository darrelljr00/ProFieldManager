import * as fs from 'fs';
import * as path from 'path';

/**
 * Creates the complete folder structure for a new organization
 * This ensures all upload directories are ready when users join
 */
export async function createOrganizationFolders(organizationId: number): Promise<void> {
  const baseDir = `./uploads/org-${organizationId}`;
  
  const folders = [
    'image_gallery',
    'receipt_images', 
    'inspection_report_images',
    'files',
    'documents',
    'avatars',
    'logos',
    'employee_documents'
  ];

  try {
    // Create base organization directory
    await fs.promises.mkdir(baseDir, { recursive: true });
    
    // Create all subdirectories
    for (const folder of folders) {
      const folderPath = path.join(baseDir, folder);
      await fs.promises.mkdir(folderPath, { recursive: true });
    }
    
    console.log(`✓ Created organization folders for org-${organizationId}`);
  } catch (error) {
    console.error(`Error creating folders for org-${organizationId}:`, error);
    throw error;
  }
}

/**
 * Ensures organization folders exist before file operations
 */
export async function ensureOrganizationFolders(organizationId: number): Promise<void> {
  const baseDir = `./uploads/org-${organizationId}`;
  
  try {
    await fs.promises.access(baseDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await createOrganizationFolders(organizationId);
  }
}