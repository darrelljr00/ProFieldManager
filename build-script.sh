#!/bin/bash

# Build the client
npm run build

# Copy dist/public to server/public for deployment
if [ -d "dist/public" ]; then
  echo "Copying build files to server/public..."
  mkdir -p server/public
  cp -r dist/public/* server/public/
  echo "Build files copied successfully"
else
  echo "Error: dist/public directory not found"
  exit 1
fi