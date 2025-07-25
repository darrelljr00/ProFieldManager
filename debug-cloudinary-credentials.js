// Debug Cloudinary credentials
console.log('=== CLOUDINARY CREDENTIAL DEBUG ===');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? `${process.env.CLOUDINARY_API_KEY.substring(0, 6)}***` : 'NOT SET');
console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? `${process.env.CLOUDINARY_API_SECRET.substring(0, 6)}***` : 'NOT SET');

// Test the URL format
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const testUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
console.log('Upload URL:', testUrl);

// Verify if cloud name contains valid characters
if (cloudName) {
  const validCloudName = /^[a-zA-Z0-9\-_]+$/.test(cloudName);
  console.log('Cloud name format valid:', validCloudName);
  console.log('Cloud name length:', cloudName.length);
}