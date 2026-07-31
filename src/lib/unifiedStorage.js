/**
 * Unified Storage Service - Intelligent Multi-Provider Storage Router
 *
 * Routes data to the optimal storage provider based on:
 * - Data type and access patterns
 * - Performance requirements
 * - Cost optimization
 * - Redundancy needs
 *
 * Providers:
 * - Supabase: Primary DB, Auth, Realtime, Small files (<10MB), Structured data
 * - Cloudinary: Images, Videos, Media optimization (25GB free)
 * - Uploadthing: Documents, Large files, CDN delivery (2GB free)
 * - Backblaze B2: Backups, Archives, Cold storage (10GB free) — SERVER-SIDE ONLY
 *
 * SECURITY MODEL:
 * - B2 credentials are NEVER in the client bundle.
 *   The client requests signed upload/download URLs from a Supabase Edge Function.
 * - Cloudinary API secret is NEVER in the client bundle.
 *   Uploads use a signed upload preset (configured server-side).
 * - Supabase service key is NEVER used on the client.
 */

import { supabase } from '../supabaseClient'

// ============================================
// READ-ONLY PUBLIC CONFIG (safe for client)
// ============================================

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
// Use a SIGNED upload preset (created in Cloudinary Dashboard > Settings > Upload)
// A signed preset requires your API secret server-side — Cloudinary handles this.
// If you use an UNSIGNED preset, anyone can upload to your account.
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'iothinc_signed'

const UPLOADTHING_TOKEN = import.meta.env.VITE_UPLOADTHING_TOKEN

// ============================================
// STORAGE ROUTING RULES
// ============================================

/**
 * Defines which provider handles which data type
 * Optimized for: Performance, Cost, Features
 */
export const STORAGE_ROUTES = {
  // ┌─────────────────────────────────────────────────────────────┐
  // │ SUPABASE - Primary Database & Small Structured Files       │
  // └─────────────────────────────────────────────────────────────┘
  'avatar': {
    provider: 'supabase',
    bucket: 'avatars',
    path: 'users',
    maxSize: 5 * 1024 * 1024, // 5MB
    fallback: 'cloudinary',
    description: 'User profile pictures - Supabase for auth integration, Cloudinary fallback for optimization'
  },

  'contribution-photo': {
    provider: 'cloudinary',
    fallback: 'supabase',
    bucket: 'contribution-photos',
    path: 'contributions',
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Contribution images - Cloudinary primary for auto-optimization (WebP, responsive), Supabase fallback'
  },

  'competition-poster': {
    provider: 'cloudinary',
    fallback: 'supabase',
    bucket: 'competition-assets',
    path: 'competition-posters',
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Competition posters - Cloudinary for CDN + optimization, Supabase fallback'
  },

  'event-banner': {
    provider: 'cloudinary',
    fallback: 'supabase',
    bucket: 'event-assets',
    path: 'banners',
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Event banners - Cloudinary for responsive delivery'
  },

  // ┌─────────────────────────────────────────────────────────────┐
  // │ UPLOADTHING - Documents, Large Files, CDN Delivery         │
  // └─────────────────────────────────────────────────────────────┘
  'learning-resource': {
    provider: 'uploadthing',
    fallback: 'supabase',
    bucket: 'learning-resources',
    path: 'resources',
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'Learning resources (PDF, DOC, PPT, ZIP, videos) - Uploadthing for fast CDN, Supabase fallback'
  },

  'meeting-recording': {
    provider: 'uploadthing',
    fallback: 'b2',
    bucket: 'meeting-recordings',
    path: 'recordings',
    maxSize: 500 * 1024 * 1024, // 500MB
    description: 'Meeting recordings - Uploadthing for streaming, B2 for long-term archive'
  },

  'project-file': {
    provider: 'uploadthing',
    fallback: 'supabase',
    bucket: 'project-files',
    path: 'projects',
    maxSize: 100 * 1024 * 1024, // 100MB
    description: 'Project files - Uploadthing for sharing, Supabase fallback'
  },

  'document': {
    provider: 'uploadthing',
    fallback: 'supabase',
    bucket: 'documents',
    path: 'documents',
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'General documents - Uploadthing primary'
  },

  // ┌─────────────────────────────────────────────────────────────┐
  // │ BACKBLAZE B2 - Backups, Archives, Cold Storage             │
  // │ NOTE: B2 writes go through Supabase Edge Function,         │
  // │       never directly from the browser.                     │
  // └─────────────────────────────────────────────────────────────┘
  'db-backup': {
    provider: 'b2',
    bucket: 'IOTHINCBACKUP',
    path: 'database',
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    description: 'Database backups - B2 for cost-effective cold storage'
  },

  'log-archive': {
    provider: 'b2',
    bucket: 'IOTHINCBACKUP',
    path: 'logs',
    maxSize: 1 * 1024 * 1024 * 1024, // 1GB
    description: 'Application logs - B2 for compliance/debugging archive'
  },

  'export-archive': {
    provider: 'b2',
    bucket: 'IOTHINCBACKUP',
    path: 'exports',
    maxSize: 1 * 1024 * 1024 * 1024, // 1GB
    description: 'Data exports - B2 for long-term retention'
  },

  // ┌─────────────────────────────────────────────────────────────┐
  // │ REPLICATION - Critical data stored in multiple providers   │
  // └─────────────────────────────────────────────────────────────┘
  'replication-targets': {
    'avatar': ['supabase', 'cloudinary'],
    'contribution-photo': ['cloudinary', 'supabase'],
    'competition-poster': ['cloudinary', 'supabase'],
    'learning-resource': ['uploadthing', 'b2'], // Replicate to B2 for durability
    'meeting-recording': ['uploadthing', 'b2'],
  }
}

// ============================================
// UNIFIED STORAGE CLASS
// ============================================

export class UnifiedStorage {
  constructor() {
    this.metrics = {
      uploads: { supabase: 0, cloudinary: 0, uploadthing: 0, b2: 0 },
      bytes: { supabase: 0, cloudinary: 0, uploadthing: 0, b2: 0 },
      errors: { supabase: 0, cloudinary: 0, uploadthing: 0, b2: 0 }
    }
  }

  /**
   * Get storage config for a data type
   */
  getConfig(type) {
    return STORAGE_ROUTES[type] || {
      provider: 'uploadthing',
      bucket: 'default',
      path: 'misc',
      maxSize: 50 * 1024 * 1024
    }
  }

  /**
   * Get all available providers for a type (including replication targets)
   */
  getAllProviders(type) {
    const config = this.getConfig(type)
    const primary = config.provider
    const fallback = config.fallback
    const replication = STORAGE_ROUTES['replication-targets'][type] || []

    return [...new Set([primary, fallback, ...replication].filter(Boolean))]
  }

  /**
   * Validate file before uploading
   */
  _validateFile(file, config) {
    if (!file) throw new Error('No file provided')
    if (file.size > config.maxSize) {
      throw new Error(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. ` +
        `Max allowed: ${(config.maxSize / 1024 / 1024).toFixed(0)} MB for ${config.description?.split(' - ')[0] || 'this type'}`
      )
    }
  }

  /**
   * Main upload method - routes to optimal provider with automatic fallback
   */
  async upload(type, file, options = {}) {
    const config = this.getConfig(type)
    const {
      filename = file.name || `file-${Date.now()}`,
      metadata = {},
      onProgress,
      replicate = true,
      userId
    } = options

    // Sanitize filename to prevent path traversal
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `${config.path}/${userId || 'anonymous'}/${Date.now()}-${safeFilename}`

    // Validate file size
    this._validateFile(file, config)

    // Try primary provider, then fallback on failure
    let result
    let usedProvider = config.provider

    try {
      result = await this._uploadToProvider(config.provider, config.bucket, key, file, {
        ...metadata,
        contentType: file.type,
        originalType: type
      }, onProgress)

      this.metrics.uploads[config.provider]++
      this.metrics.bytes[config.provider] += file.size
    } catch (primaryErr) {
      console.warn(`Primary provider (${config.provider}) failed, trying fallback (${config.fallback}):`, primaryErr.message)
      this.metrics.errors[config.provider]++

      if (!config.fallback) throw primaryErr

      try {
        result = await this._uploadToProvider(config.fallback, config.bucket, key, file, {
          ...metadata,
          contentType: file.type,
          originalType: type,
          usedFallback: true
        }, onProgress)

        usedProvider = config.fallback
        this.metrics.uploads[config.fallback]++
        this.metrics.bytes[config.fallback] += file.size
      } catch (fallbackErr) {
        this.metrics.errors[config.fallback]++
        throw new Error(
          `Upload failed on both primary (${config.provider}: ${primaryErr.message}) ` +
          `and fallback (${config.fallback}: ${fallbackErr.message})`
        )
      }
    }

    // Replicate to backup providers if enabled (fire-and-forget, non-blocking)
    const replicas = []
    if (replicate) {
      const targets = STORAGE_ROUTES['replication-targets'][type] || []
      for (const replicaProvider of targets) {
        if (replicaProvider !== usedProvider) {
          // Run replications in parallel but don't block the return
          this._uploadToProvider(replicaProvider, config.bucket, key, file, {
            ...metadata,
            contentType: file.type,
            originalType: type,
            replica: true
          })
            .then(replicaResult => {
              replicas.push({ provider: replicaProvider, ...replicaResult })
              this.metrics.uploads[replicaProvider]++
              this.metrics.bytes[replicaProvider] += file.size
            })
            .catch(replicaErr => {
              this.metrics.errors[replicaProvider]++
              console.warn(`Replication to ${replicaProvider} failed:`, replicaErr.message)
            })
        }
      }
    }

    return {
      ...result,
      provider: usedProvider,
      type,
      key,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }
  }

  /**
   * Internal method to upload to specific provider
   */
  async _uploadToProvider(provider, bucket, key, file, metadata, onProgress) {
    switch (provider) {
      case 'supabase':
        return this._uploadToSupabase(bucket, key, file, metadata, onProgress)
      case 'cloudinary':
        return this._uploadToCloudinary(key, file, metadata, onProgress)
      case 'uploadthing':
        return this._uploadToUploadthing(file, metadata, onProgress)
      case 'b2':
        return this._uploadToB2ViaEdgeFunction(bucket, key, file, metadata, onProgress)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  // ============================================
  // PROVIDER-SPECIFIC UPLOAD IMPLEMENTATIONS
  // ============================================

  async _uploadToSupabase(bucket, key, file, metadata, onProgress) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(key, file, {
        contentType: metadata.contentType,
        upsert: metadata.upsert || false,
        cacheControl: metadata.cacheControl || '3600'
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(key)

    if (onProgress) onProgress(100)

    return { url: publicUrl, key, bucket }
  }

  /**
   * Cloudinary upload — uses a SIGNED upload preset.
   *
   * ⚠️  The preset must be configured as "Signed" in the Cloudinary dashboard.
   * With a signed preset the API secret stays on Cloudinary's servers;
   * the client only sends the preset name. This is the correct security model.
   *
   * Steps to set up:
   *  1. Cloudinary Dashboard → Settings → Upload → Upload presets
   *  2. Add preset, set Signing Mode = Signed
   *  3. Set the preset name as VITE_CLOUDINARY_UPLOAD_PRESET in .env
   */
  async _uploadToCloudinary(key, file, metadata, onProgress) {
    if (!CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary not configured: missing VITE_CLOUDINARY_CLOUD_NAME')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    formData.append('public_id', key.replace(/\//g, '_'))

    if (file.type.startsWith('image/')) {
      formData.append('folder', 'iothinc')
      formData.append('quality', 'auto')
      formData.append('fetch_format', 'auto')
    }

    const resourceType = file.type.startsWith('video/') ? 'video' : 'image'

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            if (data.error) {
              reject(new Error(`Cloudinary error: ${data.error.message}`))
              return
            }
            resolve({
              url: data.secure_url,
              key: data.public_id,
              publicId: data.public_id,
              format: data.format,
              width: data.width,
              height: data.height,
              bytes: data.bytes
            })
          } catch (e) {
            reject(new Error('Cloudinary: invalid JSON response'))
          }
        } else {
          reject(new Error(`Cloudinary upload failed (HTTP ${xhr.status}): ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Cloudinary upload failed: network error')))
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`)
      xhr.send(formData)
    })
  }

  async _uploadToUploadthing(file, metadata, onProgress) {
    if (!UPLOADTHING_TOKEN) {
      throw new Error('Uploadthing not configured: missing VITE_UPLOADTHING_TOKEN')
    }

    const { uploadFiles } = await import('../uploadthingClient')

    if (onProgress) onProgress(30)

    const res = await uploadFiles('default', { files: [file] })

    if (onProgress) onProgress(100)

    if (res && res[0]) {
      return {
        url: res[0].url,
        key: res[0].key,
        name: res[0].name,
        size: res[0].size
      }
    }
    throw new Error('Uploadthing upload failed: no result returned')
  }

  /**
   * B2 upload via Supabase Edge Function — B2 credentials NEVER leave the server.
   *
   * The Edge Function (supabase/functions/b2-upload/index.ts) receives the file,
   * signs the request with B2 credentials stored in Supabase secrets, and uploads.
   *
   * Deploy: supabase functions deploy b2-upload
   * Secrets: supabase secrets set B2_KEY_ID=xxx B2_APP_KEY=xxx B2_BUCKET=IOTHINCBACKUP
   */
  async _uploadToB2ViaEdgeFunction(bucket, key, file, metadata, onProgress) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Authentication required for B2 upload')

    if (onProgress) onProgress(10)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('key', key)
    formData.append('bucket', bucket)
    formData.append('contentType', metadata.contentType || file.type)
    formData.append('metadata', JSON.stringify({
      originalType: metadata.originalType,
      uploadedAt: new Date().toISOString()
    }))

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2-upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: formData
      }
    )

    if (onProgress) onProgress(90)

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      throw new Error(`B2 Edge Function error (${response.status}): ${errText}`)
    }

    const result = await response.json()
    if (onProgress) onProgress(100)

    return {
      url: result.url,
      key: result.key,
      bucket: result.bucket,
      signed: result.signed || false
    }
  }

  // ============================================
  // SIGNED URL GENERATION
  // ============================================

  async getSignedUrl(provider, bucket, key, expiresIn = 3600) {
    switch (provider) {
      case 'supabase': {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, expiresIn)
        if (error) throw error
        return data.signedUrl
      }

      case 'cloudinary':
        // Cloudinary public URLs are already CDN-delivered and optimized
        return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${key}`

      case 'uploadthing':
        // Uploadthing CDN URLs are public by default
        return `https://utfs.io/f/${key}`

      case 'b2': {
        // Request signed URL from Edge Function — B2 credentials stay server-side
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Authentication required')

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2-sign-url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ bucket, key, expiresIn })
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to get B2 signed URL: ${response.statusText}`)
        }

        const { url } = await response.json()
        return url
      }

      default:
        throw new Error(`Unknown provider for signed URL: ${provider}`)
    }
  }

  // ============================================
  // FILE MANAGEMENT
  // ============================================

  async delete(type, key, provider) {
    const config = this.getConfig(type)
    const targetProvider = provider || config.provider
    const bucket = config.bucket

    switch (targetProvider) {
      case 'supabase': {
        const { error } = await supabase.storage.from(bucket).remove([key])
        if (error) throw error
        break
      }
      case 'cloudinary':
        // Cloudinary deletion requires a signed API call — handled server-side
        console.warn('Cloudinary deletion requires a server-side API call (Edge Function or backend)')
        break
      case 'uploadthing':
        // Uploadthing deletion requires their server API
        console.warn('Uploadthing deletion requires server-side API call')
        break
      case 'b2': {
        // B2 deletion via Edge Function
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Authentication required')
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2-delete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ bucket, key })
          }
        )
        break
      }
      default:
        throw new Error(`Unsupported provider for delete: ${targetProvider}`)
    }
  }

  async list(type, prefix = '', provider) {
    const config = this.getConfig(type)
    const targetProvider = provider || config.provider
    const bucket = config.bucket

    switch (targetProvider) {
      case 'supabase': {
        const { data, error } = await supabase.storage.from(bucket).list(prefix)
        if (error) throw error
        return data
      }

      case 'b2': {
        // B2 listing via Edge Function
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Authentication required')

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2-list`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ bucket, prefix })
          }
        )

        if (!response.ok) throw new Error(`B2 list failed: ${response.statusText}`)
        const { items } = await response.json()
        return items || []
      }

      default:
        throw new Error(`Listing not supported for provider: ${targetProvider}`)
    }
  }

  // ============================================
  // METRICS & MONITORING
  // ============================================

  getMetrics() {
    return {
      ...this.metrics,
      totalUploads: Object.values(this.metrics.uploads).reduce((a, b) => a + b, 0),
      totalBytes: Object.values(this.metrics.bytes).reduce((a, b) => a + b, 0),
      totalErrors: Object.values(this.metrics.errors).reduce((a, b) => a + b, 0)
    }
  }

  resetMetrics() {
    this.metrics = {
      uploads: { supabase: 0, cloudinary: 0, uploadthing: 0, b2: 0 },
      bytes: { supabase: 0, cloudinary: 0, uploadthing: 0, b2: 0 },
      errors: { supabase: 0, cloudinary: 0, uploadthing: 0, b2: 0 }
    }
  }

  /**
   * Get storage usage estimates across all providers.
   * Supabase and B2 can be queried; Cloudinary and Uploadthing require server-side API calls.
   */
  async getStorageUsage() {
    const usage = {
      supabase: { used: 0, limit: 1024 * 1024 * 1024, unit: 'bytes' },    // 1GB free
      cloudinary: { used: 0, limit: 25 * 1024 * 1024 * 1024, unit: 'bytes' }, // 25GB credits
      uploadthing: { used: 0, limit: 2 * 1024 * 1024 * 1024, unit: 'bytes' }, // 2GB free
      b2: { used: 0, limit: 10 * 1024 * 1024 * 1024, unit: 'bytes' }      // 10GB free
    }

    // Supabase bucket usage — client-accessible
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      if (buckets) {
        for (const bucket of buckets) {
          const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 10000 })
          if (files) {
            for (const file of files) {
              if (file.metadata?.size) usage.supabase.used += file.metadata.size
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch Supabase bucket sizes:', e.message)
    }

    // B2 usage via Edge Function
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2-list`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ bucket: import.meta.env.VITE_B2_BUCKET_NAME, prefix: '' })
          }
        )
        if (response.ok) {
          const { totalBytes } = await response.json()
          if (typeof totalBytes === 'number') usage.b2.used = totalBytes
        }
      }
    } catch (e) {
      console.warn('Could not fetch B2 usage:', e.message)
    }

    return usage
  }
}

// ============================================
// SPECIALIZED UPLOAD HOOKS FOR REACT COMPONENTS
// ============================================

/**
 * Hook for avatar uploads (Supabase primary, Cloudinary fallback)
 */
export const useAvatarUpload = () => {
  const storage = new UnifiedStorage()

  return async (file, userId) => {
    return storage.upload('avatar', file, { userId })
  }
}

/**
 * Hook for contribution photos (Cloudinary primary, Supabase fallback)
 */
export const useContributionPhotoUpload = () => {
  const storage = new UnifiedStorage()

  return async (file, userId) => {
    return storage.upload('contribution-photo', file, { userId })
  }
}

/**
 * Hook for competition posters (Cloudinary primary, Supabase fallback)
 */
export const useCompetitionPosterUpload = () => {
  const storage = new UnifiedStorage()

  return async (file, competitionId) => {
    return storage.upload('competition-poster', file, {
      userId: competitionId,
      metadata: { competitionId }
    })
  }
}

/**
 * Hook for learning resources (Uploadthing primary, Supabase fallback)
 */
export const useLearningResourceUpload = () => {
  const storage = new UnifiedStorage()

  return async (file, userId) => {
    return storage.upload('learning-resource', file, { userId })
  }
}

/**
 * Hook for meeting recordings (Uploadthing primary, B2 fallback)
 */
export const useMeetingRecordingUpload = () => {
  const storage = new UnifiedStorage()

  return async (file, meetingId) => {
    return storage.upload('meeting-recording', file, {
      userId: meetingId,
      metadata: { meetingId }
    })
  }
}

/**
 * Hook for general document uploads
 */
export const useDocumentUpload = () => {
  const storage = new UnifiedStorage()

  return async (file, userId, type = 'document') => {
    return storage.upload(type, file, { userId })
  }
}

// ============================================
// DATABASE BACKUP UTILITY
// ============================================

export class DatabaseBackup {
  constructor() {
    this.storage = new UnifiedStorage()
  }

  /**
   * Create full database backup and store in B2 via Edge Function.
   *
   * The actual backup is triggered server-side to avoid RLS restrictions
   * and prevent large data exports leaking through the client.
   */
  async createFullBackup() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Authentication required to create backup')

    // Trigger backup via Edge Function — never do SELECT * from all tables client-side
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/db-backup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ type: 'full' })
      }
    )

    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText)
      throw new Error(`Backup Edge Function failed (${response.status}): ${err}`)
    }

    return response.json()
  }

  /**
   * Client-side data export (only data visible to current user via RLS).
   * This is NOT a full backup — just an export of the current user's accessible data.
   * Full backups require the Edge Function above.
   */
  async exportAccessibleData() {
    const tables = [
      'profiles', 'teams', 'team_members', 'events', 'registrations',
      'projects', 'contributions', 'contribution_comments', 'tasks',
      'notifications', 'competitions', 'competition_submissions',
      'learning_resources', 'meetings', 'meeting_attendees',
      'meeting_agenda_items', 'meeting_action_items', 'meeting_decisions',
      'team_join_requests', 'event_teams', 'event_team_members',
      'event_tasks', 'member_schedules', 'messages'
    ]

    const timestamp = new Date().toISOString()
    const exportData = { exportedAt: timestamp, tables: {} }

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*')
        if (!error && data) {
          exportData.tables[table] = { count: data.length, data }
        }
      } catch (e) {
        exportData.tables[table] = { error: e.message }
      }
    }

    // Download as JSON file (no server upload needed — user gets their data)
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `iothinc-export-${timestamp.replace(/[:.]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)

    return { exportedAt: timestamp, tables: Object.keys(exportData.tables).length }
  }

  /**
   * Request scheduled backup status from the Edge Function.
   * Automatic daily backups are configured as a Supabase scheduled job,
   * not via browser setInterval (which requires the tab to stay open).
   */
  async getBackupStatus() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { status: 'unauthenticated' }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/db-backup-status`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      )
      if (!response.ok) return { status: 'unknown' }
      return response.json()
    } catch {
      return { status: 'unknown' }
    }
  }
}

// Export singleton instance
export const unifiedStorage = new UnifiedStorage()
export const databaseBackup = new DatabaseBackup()

export default UnifiedStorage