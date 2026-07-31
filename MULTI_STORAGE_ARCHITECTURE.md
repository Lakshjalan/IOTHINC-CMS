# IOTHINC Multi-Provider Storage Architecture

## Overview

This document describes the complete multi-provider storage architecture for IOTHINC, distributing data across 4 storage providers based on data type, access patterns, and cost optimization.

## Storage Provider Allocation

| Provider | Free Tier | Primary Use Case | Data Types |
|----------|-----------|------------------|------------|
| **Supabase** | 1 GB DB + 1 GB Storage | Primary Database, Auth, Realtime, Small Files | User profiles, avatars (fallback), structured data, small fallbacks |
| **Cloudinary** | 25 GB Credits | Image/Video Optimization & CDN | Avatars (primary), contribution photos, competition posters, event banners |
| **Uploadthing** | 2 GB | Document Storage & Fast CDN | Learning resources, meeting recordings, project files, documents |
| **Backblaze B2** | 10 GB | Cold Storage & Backups | Database backups, log archives, data exports, replicated critical files |

## Data Routing Rules

### Primary → Fallback → Replication Chain

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    CLOUDINARY       │     │    SUPABASE      │     │  BACKBLAZE B2   │
│   (Primary)         │────▶│   (Fallback)     │────▶│   (Replica)     │
│  - Avatars          │     │  - Avatars       │     │  - DB Backups   │
│  - Contribution     │     │  - Contribution  │     │  - Archives     │
│    Photos           │     │    Photos        │     │  - Exports      │
│  - Competition      │     │  - Competition   │     │                 │
│    Posters          │     │    Posters       │     │                 │
│  - Event Banners    │     │  - Event Banners │     │                 │
└─────────────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   UPLOADTHING       │     │    SUPABASE      │     │  BACKBLAZE B2   │
│   (Primary)         │────▶│   (Fallback)     │────▶│   (Replica)     │
│  - Learning         │     │  - Learning      │     │  - Learning     │
│    Resources        │     │    Resources     │     │    Resources    │
│  - Meeting          │     │  - Meeting       │     │  - Meeting      │
│    Recordings       │     │    Recordings    │     │    Recordings   │
│  - Project Files    │     │  - Project Files │     │                 │
│  - Documents        │     │  - Documents     │     │                 │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
```

## Implementation Files

### Core Library
- **`src/lib/unifiedStorage.js`** - Main unified storage service with intelligent routing
  - `UnifiedStorage` class - Handles uploads, downloads, signed URLs, replication
  - Specialized hooks: `useAvatarUpload`, `useContributionPhotoUpload`, `useCompetitionPosterUpload`, `useLearningResourceUpload`, `useMeetingRecordingUpload`, `useDocumentUpload`
  - `DatabaseBackup` class - Automated daily backups to B2

### Dashboard
- **`src/pages/StorageDashboard.jsx`** - Real-time monitoring dashboard
  - Per-provider usage bars with percentages
  - Data routing configuration table
  - Session upload metrics
  - Database backup controls
  - Quick action buttons

### Updated Components
- **`src/hooks/useContributions.js`** - Uses `useContributionPhotoUpload` hook
- **`src/pages/MemberProfile.jsx`** - Uses `useAvatarUpload` hook
- **`src/pages/Competitions.jsx`** - Uses `useCompetitionPosterUpload` hook
- **`src/pages/NewResource.jsx`** - Uses `useLearningResourceUpload` hook

### Routing
- **`src/App.jsx`** - Added `/storage` route (admin only)
- **`src/components/Sidebar.jsx`** - Added "Storage Monitor" nav item

### Database Setup
- **`scripts/create-storage-buckets.sql`** - Creates all 8 Supabase storage buckets with RLS policies

## Environment Variables Required

```env
# Supabase (Primary)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Cloudinary (Media Optimization)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Uploadthing (Documents/CDN)
VITE_UPLOADTHING_TOKEN=sk_live_xxx
UPLOADTHING_SECRET=sk_live_xxx

# Backblaze B2 (Backups)
B2_KEY_ID=your-key-id
B2_APP_KEY=your-app-key
B2_BUCKET_NAME=IOTHINCBACKUP
B2_BUCKET_ID=your-bucket-id
```

## Setup Instructions

### 1. Create Supabase Storage Buckets
Run `scripts/create-storage-buckets.sql` in Supabase Dashboard > SQL Editor

### 2. Configure Cloudinary
1. Create Cloudinary account
2. Create unsigned upload preset named `ml_default`
3. Enable auto-optimization (f_auto, q_auto)
4. Add credentials to `.env`

### 3. Configure Uploadthing
1. Create Uploadthing account
2. Create app and get tokens
3. Add credentials to `.env`

### 4. Configure Backblaze B2
1. Create B2 account
2. Create bucket `IOTHINCBACKUP` (private)
3. Create application key with read/write access
4. Add credentials to `.env`

### 5. Enable Automatic Backups
The `DatabaseBackup` class automatically sets up daily backups at 2 AM when initialized. Call in your app initialization:

```javascript
import { databaseBackup } from './lib/unifiedStorage'
// In your main App component or initialization
databaseBackup.setupAutomaticBackups()
```

## Usage Examples

### Upload Avatar
```jsx
import { useAvatarUpload } from '../lib/unifiedStorage'

const MyComponent = () => {
  const uploadAvatar = useAvatarUpload()
  
  const handleUpload = async (file) => {
    const result = await uploadAvatar(file, userId)
    // result: { url, provider: 'cloudinary', key, size, replicas: [...] }
    await updateProfile({ avatar_url: result.url })
  }
}
```

### Upload Contribution Photo
```jsx
import { useContributionPhotoUpload } from '../lib/unifiedStorage'

const uploadPhoto = useContributionPhotoUpload()
const result = await uploadPhoto(file, userId)
// Automatically uses Cloudinary primary, Supabase fallback
```

### Upload Learning Resource
```jsx
import { useLearningResourceUpload } from '../lib/unifiedStorage'

const uploadResource = useLearningResourceUpload()
const result = await uploadResource(file, userId)
// Uses Uploadthing primary, Supabase fallback, B2 replica
```

### Access Storage Dashboard
Navigate to `/storage` (requires chairperson, vice_chairperson, or department_lead role)

## Monitoring & Metrics

The dashboard shows:
- **Per-provider usage**: Used / Free Limit / Percentage
- **Data routing table**: Which provider handles each data type
- **Session metrics**: Uploads count, bytes transferred, errors per provider
- **Backup status**: Last backup time, manual backup trigger

## Cost Optimization

| Strategy | Implementation |
|----------|----------------|
| **Right-sizing** | Each data type routed to most cost-effective provider |
| **Auto-optimization** | Cloudinary auto-delivers WebP, responsive images |
| **CDN Delivery** | Uploadthing & Cloudinary provide global CDN |
| **Cold Storage** | B2 for backups/archives (10GB free) |
| **Replication** | Critical data replicated to B2 for durability |
| **Fallbacks** | Automatic fallback prevents upload failures |

## Free Tier Limits

| Provider | Storage | Monthly Egress | Best For |
|----------|---------|----------------|----------|
| Supabase | 1 GB | Included | Database, small files |
| Cloudinary | 25 GB credits | Included | Images, videos |
| Uploadthing | 2 GB | 100 GB | Documents, large files |
| Backblaze B2 | 10 GB | 1 GB/day free | Backups, archives |

**Total Free Storage: ~38 GB** (vs 1 GB single-provider)

## Redundancy & Disaster Recovery

1. **Primary Failure**: Automatic fallback to secondary provider
2. **Provider Outage**: Data replicated across providers
3. **Database Corruption**: Daily B2 backups with point-in-time recovery
4. **Accidental Deletion**: Versioned objects in B2, Supabase trash

## Troubleshooting

### Upload Fails
- Check browser console for CORS errors
- Verify environment variables are set
- Check provider dashboard for quota limits

### Dashboard Shows 0 Usage
- Provider APIs require backend calls for accurate usage
- Dashboard shows estimates from client-side tracking
- Use provider dashboards for exact numbers

### Backup Fails
- Check B2 credentials and bucket permissions
- Verify bucket exists and is accessible
- Check network connectivity to B2 endpoint

## Future Enhancements

- [ ] Add Supabase Edge Functions for server-side operations (Cloudinary admin, Uploadthing deletion)
- [ ] Implement lifecycle policies for automatic tiering
- [ ] Add webhook notifications for backup completion
- [ ] Create analytics dashboard with historical trends
- [ ] Implement smart compression for documents
- [ ] Add virus scanning for uploads