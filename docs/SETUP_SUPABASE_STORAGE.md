# Supabase Storage Setup for Phase 4

## CRITICAL: Storage Bucket Must Be Created

The photo upload functionality requires a Supabase Storage bucket named `construction-photos`. This bucket **DOES NOT EXIST BY DEFAULT** and must be created manually.

## Setup Steps

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New Bucket"**
5. Enter the following details:
   - **Name**: `construction-photos` (MUST be exactly this)
   - **Public**: ✅ Check "Public bucket" (photos need to be publicly accessible)
   - **File size limit**: 20 MB (or adjust as needed)
   - **Allowed MIME types**: Leave empty or specify: `image/jpeg, image/png, image/webp, image/heic`

### 2. Set Storage Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies:

```sql
-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'construction-photos');

-- Allow authenticated users to read photos
CREATE POLICY "Authenticated users can view photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'construction-photos');

-- Allow users to update their own photos
CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'construction-photos' AND auth.uid() = owner);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'construction-photos' AND auth.uid() = owner);

-- Allow public read access (for viewing photos in app)
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'construction-photos');
```

### 3. Verify Configuration

Test the storage setup with a simple query:

```javascript
// Test in browser console or API route
const { data, error } = await supabase.storage
  .from('construction-photos')
  .list()

if (error) {
  console.error('Storage bucket not configured:', error)
} else {
  console.log('Storage bucket ready:', data)
}
```

## Storage Structure

Photos are organized by project:

```
construction-photos/
├── {project_id}/
│   ├── {timestamp}_{filename}.jpg         (compressed photo)
│   └── {timestamp}_thumb_{filename}.jpg   (thumbnail)
└── ...
```

## Important Notes

### 1. Public vs Private
- The bucket is set to **PUBLIC** so photos can be displayed in the app
- Individual photo visibility is controlled by the `photos.visibility` field in the database
- Private photos are filtered at the API level, not storage level

### 2. File Size Limits
- **Original upload**: Max 20MB (configurable in bucket settings)
- **After compression**: Typically 1-3MB
- **Thumbnails**: ~50-100KB

### 3. Storage Costs
Supabase Free Tier:
- ✅ 1GB storage included
- ✅ 2GB bandwidth/month
- ✅ Sufficient for ~300-500 photos

Paid plans if you exceed limits:
- Storage: $0.021/GB/month
- Bandwidth: $0.09/GB

### 4. Image Formats
Supported formats:
- ✅ JPEG/JPG (recommended)
- ✅ PNG
- ✅ WebP
- ✅ HEIC (Apple)

All formats are converted to JPEG during compression for consistency.

## Testing Photo Upload

### From API (Postman/Thunder Client)

```http
POST /api/photos/upload
Authorization: Bearer {your_jwt_token}
Content-Type: multipart/form-data

Fields:
- file: [select image file]
- project_id: 1
- caption: "Test photo"
- photo_type: "general"
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "photo": {
      "id": 1,
      "project_id": 1,
      "photo_url": "https://{project}.supabase.co/storage/v1/object/public/construction-photos/1/{timestamp}_{filename}.jpg",
      "thumbnail_url": "https://{project}.supabase.co/storage/v1/object/public/construction-photos/1/{timestamp}_thumb_{filename}.jpg",
      "file_size": 1234567,
      "width": 1920,
      "height": 1080,
      ...
    }
  }
}
```

## Troubleshooting

### Error: "Bucket not found"
**Cause**: Storage bucket `construction-photos` doesn't exist
**Fix**: Follow Step 1 above to create the bucket

### Error: "Permission denied"
**Cause**: RLS policies not configured
**Fix**: Run the SQL policies from Step 2

### Error: "File too large"
**Cause**: File exceeds bucket size limit
**Fix**: 
- Increase bucket file size limit in Supabase dashboard
- Or ensure client-side compression is working

### Error: "Invalid MIME type"
**Cause**: File type not allowed in bucket settings
**Fix**: Update allowed MIME types in bucket settings

### Photos upload but don't display
**Cause**: Bucket is not public
**Fix**: Make bucket public in Supabase dashboard settings

## Migration Checklist

Before deploying to production:

- [ ] Create `construction-photos` bucket in Supabase
- [ ] Set bucket to public
- [ ] Configure file size limits
- [ ] Run RLS policy SQL commands
- [ ] Test photo upload via API
- [ ] Verify photos are accessible via public URL
- [ ] Check storage usage in Supabase dashboard
- [ ] Set up monitoring for storage quota

## Alternative: Using AWS S3

If you prefer AWS S3 instead of Supabase Storage, you'll need to:

1. Create an S3 bucket
2. Configure AWS credentials in environment variables
3. Update `src/app/api/photos/upload/route.ts` to use AWS SDK instead of Supabase Storage
4. Update `src/app/api/photos/[id]/route.ts` delete method

This is NOT implemented by default. Supabase Storage is the current implementation.

