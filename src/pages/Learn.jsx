import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabaseClient'
import { GridSkeleton } from '../components/SkeletonLoaders'

export const Learn = () => {
  const { role } = useAuth()
  const canManage = (role === 'chairperson' || role === 'vice_chairperson')
  const [typeTab, setTypeTab] = useState('All')
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = "IOTHINC - Training & Learning" }, [])

  const fetchResources = async () => {
    setLoading(true)
    let q = supabase.from('learning_resources').select('*, uploader:profiles!learning_resources_uploaded_by_fkey(full_name)').order('created_at', { ascending: false })
    if (typeTab !== 'All') q = q.eq('type', typeTab)
    const { data } = await q
    setResources(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchResources() }, [typeTab])

  const handleDelete = async (id) => {
    if (!confirm('Delete this resource? This cannot be undone.')) return
    const { error } = await supabase.from('learning_resources').delete().eq('id', id)
    if (error) alert('Error deleting: ' + error.message)
    else fetchResources()
  }

  const tabs = ['All', 'VIDEO', 'ARTICLE', 'PDF', 'WORKSHOP']
  const typeIcon = (t) => ({ VIDEO: 'play_circle', ARTICLE: 'article', PDF: 'picture_as_pdf', WORKSHOP: 'construction' }[t] || 'school')
  const typeColor = (t) => ({ VIDEO: 'bg-error/20 text-error', ARTICLE: 'bg-primary/20 text-primary', PDF: 'bg-amber-500/20 text-amber-400', WORKSHOP: 'bg-success/20 text-success' }[t] || 'bg-surface-variant text-on-surface-variant')

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

  const hasFile = (r) => r.file_url && r.file_name
  const hasUrl = (r) => r.url

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Training & Learning</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Access curated learning resources, tutorials, and uploaded documents.</p>
        </div>
        {canManage && (
          <Link to="/learn/new" className="flex items-center gap-2 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-4 py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined">add</span>New Resource
          </Link>
        )}
      </div>

      <div className="flex gap-2 border-b border-outline-variant mb-6 pb-px overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button key={t} onClick={() => setTypeTab(t)} className={`px-4 py-2.5 font-label-caps text-xs uppercase font-bold border-b-2 transition-all whitespace-nowrap ${typeTab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <GridSkeleton items={6} variant="default" className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
      ) : resources.length === 0 ? (
        <div className="bg-surface-container rounded-xl border border-outline-variant p-12 text-center text-on-surface-variant italic">No resources found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map(r => (
            <div key={r.id} className="bg-surface-container rounded-xl border border-outline-variant p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">

              {/* Header: Type badge + Track */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded flex items-center gap-1 ${typeColor(r.type)}`}>
                  <span className="material-symbols-outlined text-sm">{typeIcon(r.type)}</span>{r.type}
                </span>
                {r.track && <span className="text-[10px] text-outline font-label-caps uppercase bg-surface-variant px-2 py-0.5 rounded">{r.track}</span>}
              </div>

              {/* Title & Description */}
              <h3 className="font-bold text-on-surface mb-2 line-clamp-2">{r.title}</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3 flex-1 mb-4">{r.description}</p>

              {/* Uploaded File Card */}
              {hasFile(r) && (
                <div className="bg-surface-container-low rounded-lg border border-outline-variant/50 p-3 mb-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl text-primary">{fileExtIcon(r.file_name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-on-surface truncate">{r.file_name}</div>
                    <div className="text-[10px] text-outline font-label-caps uppercase">Uploaded file</div>
                  </div>
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={r.file_name}
                    className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                    title="Download file"
                  >
                    <span className="material-symbols-outlined text-lg text-primary">download</span>
                  </a>
                </div>
              )}

              {/* Footer: Uploader + Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30">
                <div className="text-[10px] text-outline font-label-caps uppercase">
                  <div>{r.uploader?.full_name || 'Admin'}</div>
                  {r.duration_mins && <div>{r.duration_mins} min</div>}
                </div>
                <div className="flex items-center gap-3">
                  {hasFile(r) && (
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer" download={r.file_name} className="flex items-center gap-1 text-success text-xs font-bold font-label-caps uppercase hover:underline">
                      <span className="material-symbols-outlined text-sm">download</span>Download
                    </a>
                  )}
                  {hasUrl(r) && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary text-xs font-bold font-label-caps uppercase hover:underline">
                      <span className="material-symbols-outlined text-sm">open_in_new</span>Open
                    </a>
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="flex items-center gap-1 text-error text-xs font-bold font-label-caps uppercase hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>Delete
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </main>
  )
}