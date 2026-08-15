# File Upload System Guide

This guide explains the file upload and image management system for product images on the KODO platform.

## Overview

The file upload system uses **multer** for handling multipart/form-data uploads and **sharp** for image processing and optimization. Product images are stored locally in the filesystem with automatic resizing, optimization, and thumbnail generation.

## Features

- **Multiple image upload** - Upload up to 5 images at once
- **Image limit** - Maximum 10 images per product
- **Automatic optimization** - Images resized to 1200x1200px, 85% quality
- **Thumbnail generation** - 300x300px thumbnails for fast loading
- **File validation** - JPEG, PNG, GIF, WebP only
- **Size limits** - 5MB per image
- **Automatic cleanup** - Images deleted when product is deleted

## API Endpoints

### Upload Product Images

**POST** `/api/products/:id/images`

Upload one or more images for a product.

**Authentication:** Required (seller/admin only)  
**Rate Limit:** Standard (100 req/15min)  
**Content-Type:** `multipart/form-data`

**Request:**
```http
POST /api/products/abc123/images
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- images: [file1.jpg, file2.png, file3.jpg] (max 5 files)
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/api/products/abc123/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.png" \
  -F "images=@image3.jpg"
```

**PowerShell Example:**
```powershell
$token = "YOUR_TOKEN"
$productId = "abc123"
$files = @{
    images = Get-Item "C:\path\to\image1.jpg"
}

Invoke-RestMethod -Uri "http://localhost:4000/api/products/$productId/images" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -Form $files
```

**JavaScript (Fetch API) Example:**
```javascript
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);
formData.append('images', file3);

const response = await fetch(`/api/products/${productId}/images`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
console.log(data.uploadedImages); // Array of image URLs
```

**Success Response (201):**
```json
{
  "message": "Successfully uploaded 3 image(s)",
  "product": {
    "id": "abc123",
    "title": "Product Name",
    "description": "Product description",
    "price": 99.99,
    "images": [
      "http://localhost:4000/uploads/products/abc123-1234567890-optimized.jpeg",
      "http://localhost:4000/uploads/products/abc123-1234567891-optimized.jpeg",
      "http://localhost:4000/uploads/products/abc123-1234567892-optimized.jpeg"
    ],
    "sellerId": "seller123",
    "createdAt": "2025-11-14T10:00:00.000Z",
    "updatedAt": "2025-11-14T10:05:00.000Z",
    "seller": {
      "id": "seller123",
      "username": "johndoe",
      "email": "john@example.com"
    }
  },
  "uploadedImages": [
    "http://localhost:4000/uploads/products/abc123-1234567890-optimized.jpeg",
    "http://localhost:4000/uploads/products/abc123-1234567891-optimized.jpeg",
    "http://localhost:4000/uploads/products/abc123-1234567892-optimized.jpeg"
  ]
}
```

**Error Responses:**

**400 - No Files:**
```json
{
  "error": true,
  "message": "No images uploaded",
  "code": "NO_FILES",
  "requestId": "req-uuid"
}
```

**400 - Max Images Exceeded:**
```json
{
  "error": true,
  "message": "Maximum 10 images allowed per product",
  "code": "MAX_IMAGES_EXCEEDED",
  "details": {
    "current": 8,
    "attempting": 5,
    "max": 10
  },
  "requestId": "req-uuid"
}
```

**403 - Not Owner:**
```json
{
  "error": true,
  "message": "You can only upload images for your own products",
  "code": "FORBIDDEN",
  "requestId": "req-uuid"
}
```

**413 - File Too Large:**
```json
{
  "error": true,
  "message": "File too large",
  "code": "FILE_TOO_LARGE"
}
```

### Delete Product Image

**DELETE** `/api/products/:id/images/:imageIndex`

Delete a specific image from a product by index.

**Authentication:** Required (seller/admin only)

**Request:**
```http
DELETE /api/products/abc123/images/0
Authorization: Bearer <token>
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:4000/api/products/abc123/images/0 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**PowerShell Example:**
```powershell
$token = "YOUR_TOKEN"
$productId = "abc123"
$imageIndex = 0

Invoke-RestMethod -Uri "http://localhost:4000/api/products/$productId/images/$imageIndex" `
  -Method DELETE `
  -Headers @{ "Authorization" = "Bearer $token" }
```

**Success Response (200):**
```json
{
  "message": "Image deleted successfully",
  "product": {
    "id": "abc123",
    "title": "Product Name",
    "images": [
      "http://localhost:4000/uploads/products/abc123-1234567891-optimized.jpeg",
      "http://localhost:4000/uploads/products/abc123-1234567892-optimized.jpeg"
    ],
    ...
  }
}
```

## Image Processing

### Optimization Pipeline

When images are uploaded, they go through the following processing:

1. **Upload** - File received via multer and saved to `uploads/products/`
2. **Resize** - Resized to fit within 1200x1200px (maintains aspect ratio)
3. **Optimize** - Converted to JPEG with 85% quality
4. **Thumbnail** - 300x300px thumbnail generated with 70% quality
5. **Cleanup** - Original file deleted, optimized version kept
6. **Database** - Public URL stored in product's `images` array

### File Naming Convention

```
{productId}-{timestamp}-{random}-optimized.jpeg
```

Example: `abc123-1731577200000-987654321-optimized.jpeg`

Thumbnails use same name with `-thumb` suffix:
```
abc123-1731577200000-987654321-thumb.jpeg
```

### Accessing Images

**Full Image:**
```
http://localhost:4000/uploads/products/abc123-1731577200000-987654321-optimized.jpeg
```

**Thumbnail (if needed):**
```
http://localhost:4000/uploads/products/abc123-1731577200000-987654321-thumb.jpeg
```

## Configuration

### File Upload Settings

Located in `server/src/lib/upload.js`:

```javascript
// Maximum file size: 5MB
limits: {
  fileSize: 5 * 1024 * 1024,
  files: 5, // Max 5 files per upload
}

// Allowed file types
const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
```

### Image Processing Settings

```javascript
// Optimization settings
{
  width: 1200,
  height: 1200,
  quality: 85,
  format: 'jpeg'
}

// Thumbnail settings
{
  size: 300, // 300x300px
  quality: 70
}
```

### Upload Directory

Default: `server/uploads/products/`

Directory is created automatically if it doesn't exist.

## Frontend Integration

### HTML Form Example

```html
<form id="uploadForm" enctype="multipart/form-data">
  <input type="file" name="images" multiple accept="image/*" id="imageInput" />
  <button type="submit">Upload Images</button>
</form>

<script>
  document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    const files = document.getElementById('imageInput').files;
    
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    
    try {
      const response = await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Images uploaded:', data.uploadedImages);
        // Update UI with new images
      } else {
        console.error('Upload failed:', data.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  });
</script>
```

### Vue 3 Example

```vue
<template>
  <div>
    <input 
      type="file" 
      @change="handleFileSelect" 
      multiple 
      accept="image/*"
      ref="fileInput"
    />
    <button @click="uploadImages" :disabled="uploading">
      {{ uploading ? 'Uploading...' : 'Upload Images' }}
    </button>
    
    <div v-if="product.images" class="image-gallery">
      <div v-for="(image, index) in product.images" :key="index" class="image-item">
        <img :src="image" :alt="`Product image ${index + 1}`" />
        <button @click="deleteImage(index)">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import api from '@/services/api';

const fileInput = ref(null);
const selectedFiles = ref([]);
const uploading = ref(false);
const product = ref({ images: [] });

const handleFileSelect = (event) => {
  selectedFiles.value = Array.from(event.target.files);
};

const uploadImages = async () => {
  if (selectedFiles.value.length === 0) return;
  
  const formData = new FormData();
  selectedFiles.value.forEach(file => {
    formData.append('images', file);
  });
  
  uploading.value = true;
  
  try {
    const response = await api.post(`/products/${product.value.id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    product.value = response.data.product;
    selectedFiles.value = [];
    fileInput.value.value = '';
    
    alert(`Successfully uploaded ${response.data.uploadedImages.length} images`);
  } catch (error) {
    console.error('Upload failed:', error);
    alert(error.response?.data?.message || 'Upload failed');
  } finally {
    uploading.value = false;
  }
};

const deleteImage = async (index) => {
  if (!confirm('Are you sure you want to delete this image?')) return;
  
  try {
    const response = await api.delete(`/products/${product.value.id}/images/${index}`);
    product.value = response.data.product;
  } catch (error) {
    console.error('Delete failed:', error);
    alert(error.response?.data?.message || 'Delete failed');
  }
};
</script>

<style scoped>
.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.image-item {
  position: relative;
}

.image-item img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
}

.image-item button {
  position: absolute;
  top: 5px;
  right: 5px;
  background: red;
  color: white;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 4px;
}
</style>
```

## Validation & Limits

### File Validation

- **File Types:** JPEG, JPG, PNG, GIF, WebP only
- **File Size:** Maximum 5MB per file
- **Files Per Upload:** Maximum 5 files
- **Total Images:** Maximum 10 images per product

### Error Handling

The system validates:
1. File type (mimetype check)
2. File size (before processing)
3. Total image count (current + new ≤ 10)
4. Product ownership (only owner can upload)

If validation fails, uploaded files are automatically deleted.

## Storage Options

### Local Filesystem (Default)

Images stored in `server/uploads/products/`

**Pros:**
- Simple setup
- No external dependencies
- No additional costs
- Fast for development

**Cons:**
- Not scalable for multiple servers
- No CDN
- Manual backups needed
- Limited to server storage

### AWS S3 (Production Recommended)

To use S3 instead of local storage:

1. **Install AWS SDK:**
```bash
npm install aws-sdk
```

2. **Update `.env`:**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=kodo-product-images
```

3. **Modify `upload.js`:**
```javascript
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET,
  acl: 'public-read',
  key: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `products/${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
```

### Cloudinary (Alternative)

Popular image hosting with built-in CDN:

```bash
npm install cloudinary multer-storage-cloudinary
```

See [Cloudinary documentation](https://cloudinary.com/documentation/node_integration) for setup.

## Security Considerations

### File Upload Security

1. **File Type Validation** - Mimetype and extension checks
2. **File Size Limits** - Prevents DoS via large uploads
3. **Authentication Required** - Only authenticated sellers
4. **Ownership Verification** - Users can only upload to own products
5. **Input Sanitization** - Filenames sanitized
6. **Rate Limiting** - Upload endpoint rate limited

### Best Practices

- **Never trust client-side validation** - Always validate server-side
- **Scan uploads for malware** - Consider adding virus scanning
- **Use CDN in production** - Offload traffic from your server
- **Implement upload quotas** - Limit total storage per user
- **Monitor upload activity** - Log and alert on suspicious patterns
- **Backup uploaded files** - Regular backups to S3/Glacier

## Troubleshooting

### Images Not Uploading

**Check upload directory permissions:**
```bash
# Linux/Mac
chmod 755 server/uploads/products

# Windows
# Ensure IIS_IUSRS or your app user has write permissions
```

**Check multer configuration:**
```javascript
console.log('Upload dir:', uploadDir);
console.log('Dir exists:', fs.existsSync(uploadDir));
```

### Images Not Displaying

**Check static file serving:**
```javascript
// In app.js
app.use('/uploads', express.static('uploads'));
```

**Verify image URL:**
```bash
curl http://localhost:4000/uploads/products/image-name.jpeg
```

### Image Processing Fails

**Check sharp installation:**
```bash
npm install sharp --save
```

**Sharp requires native dependencies:**
- On Linux: `libvips` must be installed
- On Windows: Usually works out of the box
- On Mac: Usually works out of the box

**If sharp fails, disable processing temporarily:**
```javascript
// Skip processing for debugging
const imageUrl = getPublicUrl(file.path, req);
imageUrls.push(imageUrl);
```

### Out of Disk Space

**Monitor disk usage:**
```bash
# Linux/Mac
df -h

# Windows
Get-PSDrive
```

**Set up automatic cleanup:**
- Delete old product images when products deleted
- Implement image retention policy
- Archive to cold storage (S3 Glacier)

## Performance Optimization

### Image Optimization Tips

1. **Use WebP format** - Better compression than JPEG
2. **Responsive images** - Generate multiple sizes
3. **Lazy loading** - Load images as user scrolls
4. **CDN** - Serve images from edge locations
5. **Caching** - Set proper cache headers

### Example: Cache Headers

```javascript
// In app.js
app.use('/uploads', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
  next();
}, express.static('uploads'));
```

## Related Documentation

- [API Reference](./API_REFERENCE.md) - All API endpoints
- [Setup Guide](./SETUP.md) - Environment setup
- [Prisma Schema](./server/prisma/schema.prisma) - Database models

---

**Need help?** Check server logs with `LOG_LEVEL=debug` for detailed upload debugging information.
