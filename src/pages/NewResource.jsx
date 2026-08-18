import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabaseClient'
import { useLearningResourceUpload } from '../lib/unifiedStorage'

export const NewResource = () => {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({ title: '', type: 'VIDEO', description: '', url: '', track: '', duration_mins: '' })
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { document.title = "IOTHINC - Training & Learning" }, [])

  if (!['chairperson', 'vice_chairperson'].includes(role)) return <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full"><div className="text-center text-error text-lg mt-20">Access denied. Top positions only.</div></main>

  const ALLOWED_TYPES = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'text/plain': 'TXT',
    'text/markdown': 'MD',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/gif': 'GIF',
    'video/mp4': 'MP4',
    'video/webm': 'WEBM',
    'application/zip': 'ZIP',
    'application/x-zip-compressed': 'ZIP'
  }
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

  const validateFile = (f) => {
    if (!ALLOWED_TYPES[f.type]) {
      alert(`Unsupported file type: ${f.type || 'unknown'}.\nAllowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MD, PNG, JPG, GIF, MP4, WEBM, ZIP`)
      return false
    }
    if (f.size > MAX_FILE_SIZE) {
      alert(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max allowed: 50 MB.`)
      return false
    }
    return true
  }

  const handleFileSelect = (f) => {
    if (f && validateFile(f)) {
      setFile(f)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const fileExtIcon = (name) => {
    const ext = name?.split('.').pop()?.toLowerCase()
    if (['pdf'].includes(ext)) return 'picture_as_pdf'
    if (['doc', 'docx'].includes(ext)) return 'description'
    if (['ppt', 'pptx'].includes(ext)) return 'slideshow'
    if (['xls', 'xlsx'].includes(ext)) return 'table_chart'
    if (['mp4', 'webm'].includes(ext)) return 'movie'
    if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return 'image'
    if (['zip'].includes(ext)) return 'folder_zip'
    return 'attach_file'
  }

  const uploadResource = useLearningResourceUpload()

  const uploadFile = async (f) => {
    setUploading(true)
    setUploadProgress(20)

    try {
      const result = await uploadResource(f, user?.id)
      setUploadProgress(100)
      setUploading(false)
      return result.url
    } catch (err) {
      setUploading(false)
      setUploadProgress(0)
      throw err
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.url && !file) {
      alert('Please provide either an external URL or upload a file.')
      return
    }

    setSubmitting(true)
    try {
      let fileUrl = null
      let fileName = null

      if (file) {
        fileUrl = await uploadFile(file)
        fileName = file.name
      }

      const { error } = await supabase.from('learning_resources').insert({
        title: form.title,
        type: form.type,
        description: form.description || null,
        url: form.url || null,
        file_url: fileUrl,
        file_name: fileName,
        track: form.track || null,
        duration_mins: form.duration_mins ? parseInt(form.duration_mins) : null,
        uploaded_by: user.id
      })
      if (error) throw error
      alert('Resource created successfully!')
      navigate('/learn')
    } catch (err) { alert('Error: ' + err.message) }
    setSubmitting(false)
  }

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full">
      <Link to="/learn" className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline mb-6">
        <span className="material-symbols-outlined text-lg">arrow_back</span>Back to Learning
      </Link>

      <div className="max-w-2xl mx-auto">
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">Add New Resource</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">Create a learning resource for club members. Upload a file or provide an external URL.</p>

        <form onSubmit={handleSubmit} className="bg-surface-container rounded-xl border border-outline-variant p-6 shadow-sm space-y-5">

          {/* Title */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Title</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary" required/>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary">
              <option value="VIDEO">Video</option>
              <option value="ARTICLE">Article</option>
              <option value="PDF">PDF</option>
              <option value="WORKSHOP">Workshop</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm h-28 resize-none focus:ring-primary" placeholder="What does this resource cover?"/>
          </div>

          {/* File Upload — Drag & Drop Zone */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">
              Upload File
              <span className="normal-case text-outline ml-1">(PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, images, videos, ZIP — max 50 MB)</span>
            </label>

            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container-low'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.gif,.mp4,.webm,.zip"
                  onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]) }}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-4xl text-outline mb-3 block">cloud_upload</span>
                <p className="text-sm text-on-surface font-bold mb-1">
                  {dragActive ? 'Drop your file here' : 'Drag & drop a file here'}
                </p>
                <p className="text-xs text-on-surface-variant">
                  or <span className="text-primary font-bold underline">browse from your device</span>
                </p>
              </div>
            ) : (
              <div className="border border-outline-variant rounded-xl p-4 bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl text-primary">{fileExtIcon(file.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-on-surface truncate">{file.name}</div>
                    <div className="text-[10px] text-outline font-label-caps uppercase mt-0.5">
                      {formatFileSize(file.size)} • {ALLOWED_TYPES[file.type] || file.type}
                    </div>
                    {uploading && (
                      <div className="mt-2 w-full h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }}/>
                      </div>
                    )}
                  </div>
                  {!uploading && (
                    <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className="p-2 rounded-lg hover:bg-error/10 transition-colors" title="Remove file">
                      <span className="material-symbols-outlined text-lg text-error">close</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider with OR */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-outline-variant/50"/>
            <span className="text-[10px] font-label-caps uppercase text-outline">or provide a link</span>
            <div className="flex-1 h-px bg-outline-variant/50"/>
          </div>

          {/* External URL */}
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">External URL</label>
            <input type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary" placeholder="https://..."/>
          </div>

          {/* Track & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Track</label>
              <input type="text" value={form.track} onChange={e => setForm({...form, track: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary" placeholder="e.g. IoT Basics"/>
            </div>
            <div>
              <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Duration (min)</label>
              <input type="number" value={form.duration_mins} onChange={e => setForm({...form, duration_mins: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary" min="1"/>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Link to="/learn" className="px-4 py-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-lg font-label-caps text-xs uppercase">Cancel</Link>
            <button type="submit" disabled={submitting || uploading} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2">
              {submitting ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/></svg>Uploading...</>
              ) : 'Create Resource'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
