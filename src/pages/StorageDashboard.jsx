/**
 * Storage Monitoring Dashboard
 *
 * Real-time monitoring of storage usage across all providers:
 * - Supabase (Primary DB + Storage)
 * - Cloudinary (Media Optimization)
 * - Uploadthing (Documents/CDN)
 * - Backblaze B2 (Backups/Archive — via Edge Function)
 *
 * SECURITY: B2 credentials are server-side only. All B2 operations
 * go through Supabase Edge Functions.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { unifiedStorage, databaseBackup } from '../lib/unifiedStorage'
import { TableSkeleton } from '../components/SkeletonLoaders'

export const StorageDashboard = () => {
  const [usage, setUsage] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [backupStatus, setBackupStatus] = useState('idle')
  const [lastBackup, setLastBackup] = useState(null)
  const [error, setError] = useState(null)

  // Provider configurations
  const PROVIDERS = [
    {
      id: 'supabase',
      name: 'Supabase',
      icon: 'database',
      color: '#3ECF8E',
      description: 'Primary Database & Auth',
      freeLimit: 1024 * 1024 * 1024, // 1 GB
      unit: 'Database + Storage'
    },
    {
      id: 'cloudinary',
      name: 'Cloudinary',
      icon: 'image',
      color: '#3448C5',
      description: 'Media Optimization & CDN',
      freeLimit: 25 * 1024 * 1024 * 1024, // 25 GB credits
      unit: 'Media Storage'
    },
    {
      id: 'uploadthing',
      name: 'Uploadthing',
      icon: 'cloud_upload',
      color: '#000000',
      description: 'Document Storage & CDN',
      freeLimit: 2 * 1024 * 1024 * 1024, // 2 GB
      unit: 'File Storage'
    },
    {
      id: 'b2',
      name: 'Backblaze B2',
      icon: 'archive',
      color: '#FF6B00',
      description: 'Cold Storage & Backups',
      freeLimit: 10 * 1024 * 1024 * 1024, // 10 GB
      unit: 'Archive Storage'
    }
  ]

  const STORAGE_ROUTES = {
    'supabase': [
      { type: 'avatar', label: 'User Avatars', bucket: 'avatars' },
      { type: 'contribution-photo', label: 'Contribution Photos (fallback)', bucket: 'contribution-photos' },
      { type: 'competition-poster', label: 'Competition Posters (fallback)', bucket: 'competition-assets' },
      { type: 'event-banner', label: 'Event Banners (fallback)', bucket: 'event-assets' },
      { type: 'learning-resource', label: 'Learning Resources (fallback)', bucket: 'learning-resources' },
      { type: 'project-file', label: 'Project Files (fallback)', bucket: 'project-files' },
      { type: 'document', label: 'Documents (fallback)', bucket: 'documents' }
    ],
    'cloudinary': [
      { type: 'avatar', label: 'User Avatars (primary)', bucket: 'iothinc/avatars' },
      { type: 'contribution-photo', label: 'Contribution Photos', bucket: 'iothinc/contributions' },
      { type: 'competition-poster', label: 'Competition Posters', bucket: 'iothinc/competitions' },
      { type: 'event-banner', label: 'Event Banners', bucket: 'iothinc/events' }
    ],
    'uploadthing': [
      { type: 'learning-resource', label: 'Learning Resources', bucket: 'learning-resources' },
      { type: 'meeting-recording', label: 'Meeting Recordings', bucket: 'meeting-recordings' },
      { type: 'project-file', label: 'Project Files', bucket: 'project-files' },
      { type: 'document', label: 'Documents', bucket: 'documents' }
    ],
    'b2': [
      { type: 'db-backup', label: 'Database Backups', bucket: 'IOTHINCBACKUP/database' },
      { type: 'log-archive', label: 'Log Archives', bucket: 'IOTHINCBACKUP/logs' },
      { type: 'export-archive', label: 'Data Exports', bucket: 'IOTHINCBACKUP/exports' },
      { type: 'meeting-recording', label: 'Meeting Recordings (replica)', bucket: 'IOTHINCBACKUP/recordings' },
      { type: 'learning-resource', label: 'Learning Resources (replica)', bucket: 'IOTHINCBACKUP/resources' }
    ]
  }

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  const getUsagePercentage = (used, limit) => {
    if (limit === 0) return 0
    return Math.min(100, (used / limit) * 100)
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return 'error'
    if (percentage >= 70) return 'warning'
    return 'success'
  }

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get usage from unified storage service
      // (Supabase is queried client-side; B2 goes via Edge Function)
      const [storageUsage, storageMetrics] = await Promise.all([
        unifiedStorage.getStorageUsage(),
        Promise.resolve(unifiedStorage.getMetrics())
      ])

      setUsage(storageUsage)
      setMetrics(storageMetrics)
    } catch (err) {
      console.error('Failed to fetch storage usage:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchUsage()
  }

  const handleBackup = async () => {
    setBackupStatus('running')
    try {
      const result = await databaseBackup.createFullBackup()
      setBackupStatus('success')
      setLastBackup(new Date().toISOString())
      alert(`Backup triggered successfully via Edge Function!\nBackup key: ${result.key || 'stored in B2'}`)
      fetchUsage()
    } catch (err) {
      setBackupStatus('error')
      console.error('Backup failed:', err)
      alert(`Backup failed: ${err.message}\n\nNote: The backup Edge Function must be deployed first.\nRun: supabase functions deploy db-backup`)
    }
  }

  const handleExportData = async () => {
    try {
      const result = await databaseBackup.exportAccessibleData()
      alert(`Data export downloaded!\nExported ${result.tables} tables as JSON.`)
    } catch (err) {
      alert(`Export failed: ${err.message}`)
    }
  }

  useEffect(() => {
    fetchUsage()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchUsage, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchUsage])

  if (loading) {
    return (
      <div className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <div className="h-8 w-48 bg-surface-container-highest animate-pulse rounded mb-2"></div>
          <div className="h-4 w-96 bg-surface-container-highest animate-pulse rounded"></div>
        </div>
        <TableSkeleton columns={4} rows={6} />
      </div>
    )
  }

  const totalUsed = PROVIDERS.reduce((sum, p) => sum + (usage?.[p.id]?.used || 0), 0)
  const totalLimit = PROVIDERS.reduce((sum, p) => sum + p.freeLimit, 0)
  const totalPercentage = getUsagePercentage(totalUsed, totalLimit)

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Storage Monitor</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Monitor usage across all storage providers. Total: {formatBytes(totalUsed)} / {formatBytes(totalLimit)} ({totalPercentage.toFixed(1)}%)
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface rounded-xl font-label-caps text-xs uppercase hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined">download</span>Export My Data
          </button>
          <button
            onClick={handleBackup}
            disabled={backupStatus === 'running'}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-label-caps text-xs uppercase hover:brightness-110 disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined">{backupStatus === 'running' ? 'progress_activity' : 'backup'}</span>
            {backupStatus === 'running' ? 'Backing up…' : 'Backup to B2'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface rounded-xl font-label-caps text-xs uppercase hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined">{refreshing ? 'progress_activity' : 'refresh'}</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
          <span className="material-symbols-outlined text-base align-middle mr-2">warning</span>
          Failed to fetch complete usage data: {error}. Some values may be estimates.
        </div>
      )}

      {/* Total Usage Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-on-surface-variant">Total Free Tier Usage</span>
          <span className="font-bold text-on-surface">{formatBytes(totalUsed)} / {formatBytes(totalLimit)}</span>
        </div>
        <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              totalPercentage >= 90 ? 'bg-error' : totalPercentage >= 70 ? 'bg-warning' : 'bg-primary'
            }`}
            style={{ width: `${totalPercentage}%` }}
          />
        </div>
        <p className="text-xs text-on-surface-variant mt-1">
          {totalPercentage >= 90 ? '⚠️ Critical: Consider upgrading plans or cleaning up' :
           totalPercentage >= 70 ? '⚠️ Warning: Approaching free tier limits' :
           '✅ Healthy: Plenty of free tier remaining'}
        </p>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {PROVIDERS.map(provider => {
          const providerUsage = usage?.[provider.id] || { used: 0, limit: provider.freeLimit }
          const percentage = getUsagePercentage(providerUsage.used, providerUsage.limit)
          const colorClass = getProgressColor(percentage)

          return (
            <div
              key={provider.id}
              className="bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-sm hover:border-primary/20 transition-colors"
              style={{ borderLeft: `4px solid ${provider.color}` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: provider.color }}
                >
                  <span className="material-symbols-outlined text-2xl">{provider.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-on-surface truncate">{provider.name}</h3>
                  <p className="text-xs text-on-surface-variant truncate">{provider.description}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-on-surface-variant">Used</span>
                  <span className="font-bold text-on-surface">{formatBytes(providerUsage.used)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-on-surface-variant">Free Limit</span>
                  <span className="font-bold text-on-surface">{formatBytes(providerUsage.limit)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-on-surface-variant">Remaining</span>
                  <span className={`font-bold ${percentage >= 90 ? 'text-error' : percentage >= 70 ? 'text-warning' : 'text-success'}`}>
                    {formatBytes(Math.max(0, providerUsage.limit - providerUsage.used))}
                  </span>
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      colorClass === 'error' ? 'bg-error' : colorClass === 'warning' ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-on-surface-variant mt-1 text-right">{percentage.toFixed(1)}% used</p>
              </div>

              <div className="pt-3 border-t border-outline-variant/30">
                <p className="text-[10px] font-label-caps uppercase text-on-surface-variant mb-2">{provider.unit}</p>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm" style={{ color: provider.color }}>storage</span>
                  <span>Free tier: {formatBytes(provider.freeLimit)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Data Routing Table */}
      <div className="bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline-variant">
          <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined">router</span>
            Data Routing Configuration
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Shows which provider handles each data type (primary → fallback → replication)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-[10px] font-label-caps uppercase text-on-surface-variant">
                <th className="p-4">Provider</th>
                <th className="p-4">Data Type</th>
                <th className="p-4">Bucket / Path</th>
                <th className="p-4">Max Size</th>
                <th className="p-4">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              {PROVIDERS.map(provider => (
                <React.Fragment key={provider.id}>
                  {STORAGE_ROUTES[provider.id].map((route, idx) => (
                    <tr key={`${provider.id}-${route.type}`} className="hover:bg-surface-container-high transition-colors">
                      <td className="p-4">
                        {idx === 0 && (
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-center"
                            style={{ backgroundColor: provider.color }}
                          >
                            <span className="material-symbols-outlined text-lg">{provider.icon}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono-data text-sm text-on-surface">{route.label}</td>
                      <td className="p-4 font-mono-data text-xs text-on-surface-variant">{route.bucket}</td>
                      <td className="p-4 text-sm text-on-surface-variant">
                        {formatBytes(route.maxSize || 0)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-label-caps uppercase ${
                          idx === 0 ? 'bg-primary/20 text-primary' :
                          idx === 1 ? 'bg-warning/20 text-warning' :
                          'bg-success/20 text-success'
                        }`}>
                          {idx === 0 ? 'Primary' : idx === 1 ? 'Fallback' : 'Replica'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Metrics */}
      {metrics && metrics.totalUploads > 0 && (
        <div className="mt-8 bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-sm">
          <h3 className="font-headline-sm text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">analytics</span>
            Session Upload Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PROVIDERS.map(provider => (
              <div key={provider.id} className="text-center p-4 bg-surface-container-low rounded-xl">
                <div className="text-3xl font-bold text-on-surface" style={{ color: provider.color }}>
                  {metrics.uploads[provider.id] || 0}
                </div>
                <div className="text-xs text-on-surface-variant font-label-caps uppercase mt-1">Uploads</div>
                <div className="text-xs text-on-surface-variant mt-1">
                  {formatBytes(metrics.bytes[provider.id] || 0)}
                </div>
                {(metrics.errors[provider.id] || 0) > 0 && (
                  <div className="text-xs text-error mt-1">
                    {metrics.errors[provider.id]} errors
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/30 text-center text-sm text-on-surface-variant">
            Total: {metrics.totalUploads} uploads • {formatBytes(metrics.totalBytes)} transferred • {metrics.totalErrors} errors
          </div>
        </div>
      )}

      {/* Backup Status */}
      <div className="mt-8 bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined">backup</span>
              Database Backup Status
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Full database backups stored in Backblaze B2 (cold storage)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold font-label-caps uppercase ${
              backupStatus === 'success' ? 'bg-success/20 text-success' :
              backupStatus === 'error' ? 'bg-error/20 text-error' :
              backupStatus === 'running' ? 'bg-warning/20 text-warning' :
              'bg-surface-variant text-on-surface-variant'
            }`}>
              {backupStatus === 'running' ? 'Running…' : backupStatus === 'success' ? 'Last: Success' : backupStatus === 'error' ? 'Last: Failed' : 'Not Run'}
            </span>
            {lastBackup && (
              <span className="text-sm text-on-surface-variant">
                Last backup: {new Date(lastBackup).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-surface-container-low rounded-xl">
            <p className="text-[10px] font-label-caps uppercase text-on-surface-variant mb-1">Backup Method</p>
            <p className="font-medium text-on-surface">Server-side via Supabase Edge Function (db-backup). B2 credentials never leave the server.</p>
          </div>
          <div className="p-4 bg-surface-container-low rounded-xl">
            <p className="text-[10px] font-label-caps uppercase text-on-surface-variant mb-1">Schedule</p>
            <p className="font-medium text-on-surface">Weekly on Sunday at 2:00 AM (via pg_cron)</p>
          </div>
          <div className="p-4 bg-surface-container-low rounded-xl">
            <p className="text-[10px] font-label-caps uppercase text-on-surface-variant mb-1">Retention</p>
            <p className="font-medium text-on-surface">Timestamped dumps in B2 (IOTHINCBACKUP/database). Manual export available as JSON download.</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-surface-container rounded-2xl border border-outline-variant p-6 shadow-sm">
        <h3 className="font-headline-sm text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">flash_on</span>
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBackup}
            disabled={backupStatus === 'running'}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-label-caps text-xs uppercase hover:brightness-110 disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined">backup</span> Backup to B2
          </button>
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface rounded-xl font-label-caps text-xs uppercase hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined">download</span> Export Data as JSON
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface rounded-xl font-label-caps text-xs uppercase hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined">{refreshing ? 'progress_activity' : 'refresh'}</span> Refresh All Metrics
          </button>
          <a
            href="https://supabase.com/dashboard/project/emmdteofzysvffkbuhqt/storage"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface rounded-xl font-label-caps text-xs uppercase hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined">open_in_new</span> Supabase Dashboard
          </a>
          <a
            href="https://console.cloudinary.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface rounded-xl font-label-caps text-xs uppercase hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined">open_in_new</span> Cloudinary Console
          </a>
          <a
            href="https://secure.backblaze.com/b2_buckets.htm"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface rounded-xl font-label-caps text-xs uppercase hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined">open_in_new</span> Backblaze B2 Console
          </a>
        </div>
      </div>
    </main>
  )
}

export default StorageDashboard