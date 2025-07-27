#!/bin/bash
echo "🧪 Testing custom domain upload with authentication..."

curl -X POST "https://d08781a3-d8ec-4b72-a274-8e025593045b-00-1v1hzi896az5i.riker.replit.dev/api/projects/42/files" \
  -H "Origin: https://profieldmanager.com" \
  -H "Authorization: Bearer 16eb2dcdccc573b06c9f4bd23400262d96cb607f2c5dcda9f7b1365fbaa641aa" \
  -H "User-Agent: CustomDomainTest/1.0" \
  -F "file=@test_small.png" \
  -F "description=Custom domain Cloudinary test upload" \
  -v 2>&1 | head -30