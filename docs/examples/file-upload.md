# File Upload Example

This guide demonstrates how to handle file uploads with @adi-family/http, including single file uploads, multiple files, progress tracking, and file validation.

## Overview

We'll implement:
- Single file upload endpoint
- Multiple file uploads
- File size and type validation
- Progress tracking on client
- Image upload with metadata
- File download endpoints

## 1. Setup Dependencies

```bash
npm install multer
npm install -D @types/multer
```

## 2. File Upload Contracts

Since file uploads involve binary data that can't be easily validated with Zod, we'll use raw body handling:

```typescript
// contracts/files.ts
import { route } from '@adi-family/http'
import { z } from 'zod'
import type { HandlerConfig } from '@adi-family/http'

// Upload single file
export const uploadFileConfig = {
  method: 'POST',
  route: route.static('/api/files/upload'),
  // Note: Body schema omitted for multipart/form-data
  response: {
    schema: z.object({
      id: z.string(),
      filename: z.string(),
      originalName: z.string(),
      mimeType: z.string(),
      size: z.number(),
      url: z.string(),
      uploadedAt: z.string().datetime()
    })
  }
} as const satisfies HandlerConfig

// Upload multiple files
export const uploadMultipleFilesConfig = {
  method: 'POST',
  route: route.static('/api/files/upload-multiple'),
  response: {
    schema: z.object({
      files: z.array(z.object({
        id: z.string(),
        filename: z.string(),
        originalName: z.string(),
        mimeType: z.string(),
        size: z.number(),
        url: z.string()
      }))
    })
  }
} as const satisfies HandlerConfig

// Upload image with metadata
export const uploadImageConfig = {
  method: 'POST',
  route: route.static('/api/images/upload'),
  response: {
    schema: z.object({
      id: z.string(),
      filename: z.string(),
      url: z.string(),
      thumbnailUrl: z.string(),
      width: z.number(),
      height: z.number(),
      size: z.number()
    })
  }
} as const satisfies HandlerConfig

// Get file by ID
export const getFileConfig = {
  method: 'GET',
  route: route.dynamic('/api/files/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({
      id: z.string(),
      filename: z.string(),
      originalName: z.string(),
      mimeType: z.string(),
      size: z.number(),
      url: z.string(),
      uploadedAt: z.string()
    })
  }
} as const satisfies HandlerConfig

// Download file
export const downloadFileConfig = {
  method: 'GET',
  route: route.dynamic('/api/files/:id/download', z.object({ id: z.string() }))
  // Response is binary file, not JSON
} as const satisfies HandlerConfig

// Delete file
export const deleteFileConfig = {
  method: 'DELETE',
  route: route.dynamic('/api/files/:id', z.object({ id: z.string() })),
  response: {
    schema: z.object({
      success: z.boolean()
    })
  }
} as const satisfies HandlerConfig
```

## 3. File Storage Setup

```typescript
// server/storage/files.ts
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  }
})

// File filter for validation
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow only specific file types
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain'
  ]

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`))
  }
}

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
})

// In-memory database for file metadata
export const db = {
  files: new Map<string, {
    id: string
    filename: string
    originalName: string
    mimeType: string
    size: number
    path: string
    uploadedAt: string
  }>()
}
```

## 4. File Upload Handlers

Since file uploads require special middleware, we need to integrate with Express more directly:

```typescript
// server/app.ts
import express from 'express'
import { serveExpress } from '@adi-family/http-express'
import { upload, db } from './storage/files'
import {
  getFileHandler,
  deleteFileHandler
} from './handlers/files'

const app = express()
app.use(express.json())

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'))

// Single file upload endpoint
app.post('/api/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  const id = crypto.randomUUID()
  const fileData = {
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    uploadedAt: new Date().toISOString()
  }

  db.files.set(id, fileData)

  res.json({
    id: fileData.id,
    filename: fileData.filename,
    originalName: fileData.originalName,
    mimeType: fileData.mimeType,
    size: fileData.size,
    url: `/uploads/${fileData.filename}`,
    uploadedAt: fileData.uploadedAt
  })
})

// Multiple files upload endpoint
app.post('/api/files/upload-multiple', upload.array('files', 10), (req, res) => {
  if (!req.files || !Array.isArray(req.files)) {
    return res.status(400).json({ error: 'No files uploaded' })
  }

  const files = req.files.map(file => {
    const id = crypto.randomUUID()
    const fileData = {
      id,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedAt: new Date().toISOString()
    }

    db.files.set(id, fileData)

    return {
      id: fileData.id,
      filename: fileData.filename,
      originalName: fileData.originalName,
      mimeType: fileData.mimeType,
      size: fileData.size,
      url: `/uploads/${fileData.filename}`
    }
  })

  res.json({ files })
})

// File download endpoint
app.get('/api/files/:id/download', (req, res) => {
  const file = db.files.get(req.params.id)

  if (!file) {
    return res.status(404).json({ error: 'File not found' })
  }

  res.download(file.path, file.originalName)
})

// Register other handlers
serveExpress(app, [
  getFileHandler,
  deleteFileHandler
])

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
```

## 5. Other File Handlers

```typescript
// server/handlers/files.ts
import { handler } from '@adi-family/http'
import { getFileConfig, deleteFileConfig } from '../../contracts/files'
import { db } from '../storage/files'
import fs from 'fs'

// Get file metadata
export const getFileHandler = handler(getFileConfig, async (ctx) => {
  const file = db.files.get(ctx.params.id)

  if (!file) {
    throw new Error('File not found')
  }

  return {
    id: file.id,
    filename: file.filename,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    url: `/uploads/${file.filename}`,
    uploadedAt: file.uploadedAt
  }
})

// Delete file
export const deleteFileHandler = handler(deleteFileConfig, async (ctx) => {
  const file = db.files.get(ctx.params.id)

  if (!file) {
    throw new Error('File not found')
  }

  // Delete physical file
  if (fs.existsSync(file.path)) {
    fs.unlinkSync(file.path)
  }

  // Delete metadata
  db.files.delete(ctx.params.id)

  return { success: true }
})
```

## 6. Client Usage

### Basic Upload

```typescript
// client/file-upload.ts
async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('http://localhost:3000/api/files/upload', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  const result = await response.json()
  console.log('Uploaded:', result)
  return result
}

// Usage
const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const result = await uploadFile(file)
    console.log('File URL:', result.url)
  }
})
```

### Upload with Progress

```typescript
async function uploadFileWithProgress(
  file: File,
  onProgress: (progress: number) => void
) {
  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error('Upload failed'))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open('POST', 'http://localhost:3000/api/files/upload')
    xhr.send(formData)
  })
}

// Usage
const result = await uploadFileWithProgress(file, (progress) => {
  console.log(`Upload progress: ${progress.toFixed(2)}%`)
  // Update UI progress bar
  progressBar.style.width = `${progress}%`
})
```

### Multiple Files Upload

```typescript
async function uploadMultipleFiles(files: File[]) {
  const formData = new FormData()

  files.forEach(file => {
    formData.append('files', file)
  })

  const response = await fetch('http://localhost:3000/api/files/upload-multiple', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  return response.json()
}

// Usage
const files = Array.from(fileInput.files || [])
const result = await uploadMultipleFiles(files)
console.log(`Uploaded ${result.files.length} files`)
```

### File Download

```typescript
import { BaseClient } from '@adi-family/http'
import { getFileConfig } from '../contracts/files'

const client = new BaseClient({
  baseUrl: 'http://localhost:3000'
})

async function downloadFile(fileId: string) {
  // Get file metadata
  const file = await client.run(getFileConfig, {
    params: { id: fileId }
  })

  // Download file
  const response = await fetch(`http://localhost:3000/api/files/${fileId}/download`)
  const blob = await response.blob()

  // Create download link
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.originalName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

## 7. React Component Example

```typescript
// components/FileUpload.tsx
import { useState } from 'react'

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)

    try {
      const uploaded = await uploadFileWithProgress(file, setProgress)
      setResult(uploaded)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {file && (
        <div>
          <p>Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}

      {uploading && (
        <div>
          <div style={{ width: '100%', backgroundColor: '#eee' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '20px',
                backgroundColor: '#4caf50'
              }}
            />
          </div>
          <p>{progress.toFixed(2)}%</p>
        </div>
      )}

      {result && (
        <div>
          <p>Upload successful!</p>
          <img src={`http://localhost:3000${result.url}`} alt={result.originalName} />
          <a href={`http://localhost:3000${result.url}`} download>
            Download
          </a>
        </div>
      )}
    </div>
  )
}
```

## 8. File Validation

### Server-Side Validation

```typescript
// server/storage/files.ts
const imageFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif']

  if (!allowedMimes.includes(file.mimetype)) {
    cb(new Error('Only images are allowed'))
    return
  }

  cb(null, true)
}

export const imageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for images
  }
})
```

### Client-Side Validation

```typescript
function validateFile(file: File): string | null {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']

  if (file.size > maxSize) {
    return `File too large. Max size: ${maxSize / 1024 / 1024}MB`
  }

  if (!allowedTypes.includes(file.type)) {
    return `File type ${file.type} not allowed`
  }

  return null
}

// Usage
const error = validateFile(file)
if (error) {
  alert(error)
  return
}
```

## Best Practices

### 1. Validate File Size and Type

Always validate on both client and server.

### 2. Use Unique Filenames

Prevent filename collisions:

```typescript
const uniqueFilename = `${Date.now()}-${crypto.randomUUID()}${ext}`
```

### 3. Limit Upload Size

Configure appropriate limits:

```typescript
limits: {
  fileSize: 10 * 1024 * 1024, // 10MB
  files: 5 // Max 5 files
}
```

### 4. Clean Up Failed Uploads

Remove temporary files if upload fails.

### 5. Use Cloud Storage in Production

For production, use S3, Google Cloud Storage, etc., instead of local disk.

## Next Steps

- [Basic Examples](/examples/basic) - CRUD operations
- [Authentication](/examples/auth) - Secure file uploads
- [Advanced Examples](/examples/advanced) - Complex patterns
