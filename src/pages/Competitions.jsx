import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'
import { getOptimizedImageUrl } from '../utils/imageOptimizer'
import { useCompetitionPosterUpload } from '../lib/unifiedStorage'
import { GridSkeleton } from '../components/SkeletonLoaders'

// ── Status badge ──────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded-full ${
    status === 'active' ? 'bg-success/20 text-success border border-success/20' : 'bg-surface-variant text-on-surface-variant border border-outline-variant'
  }`}>{status}</span>
)

// ── Poster Lightbox (full-screen viewer) ──────────────────────
const PosterLightbox = ({ url, onClose }) => {
  // Close on Escape key
  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200 cursor-zoom-out"
      onClick={onClose}
    >
      {/* Close hint */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className="text-white/40 text-xs font-label-caps uppercase">Press Esc or click to close</span>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Image */}
      <img
        src={url}
        alt="Competition Poster"
        onClick={e => e.stopPropagation()}
        className="max-w-[92vw] max-h-[92vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
      />
    </div>
  )
}

// ── Competition Detail Modal ──────────────────────────────────
const CompDetailModal = ({ comp: initialComp, userId, canHost, onClose, onSubmit, onDelete, onRefresh }) => {
  const [comp, setComp] = useState(initialComp)
  const [editingLink, setEditingLink] = useState(false)
  const [linkValue, setLinkValue] = useState(initialComp.competition_link || '')
  const [uploading, setUploading] = useState(false)
  const [savingLink, setSavingLink] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const submission = comp.submissions?.find(s => s.member_id === userId)
  const hasSubmitted = !!submission
  const isDeadlinePassed = new Date(comp.registration_deadline) < new Date()
  const isHostOrAdmin = canHost

  // ── Poster upload ─────────────────────────────────────────
  const uploadPoster = useCompetitionPosterUpload()

  const handlePosterUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return }

    setUploading(true)
    try {
      const result = await uploadPoster(file, comp.id)
      const poster_url = result.url

      const { error: dbErr } = await supabase
        .from('competitions')
        .update({ poster_url })
        .eq('id', comp.id)
      if (dbErr) throw dbErr

      setComp(prev => ({ ...prev, poster_url }))
      onRefresh?.()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  // ── Competition link save ─────────────────────────────────
  const handleSaveLink = async () => {
    setSavingLink(true)
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ competition_link: linkValue || null })
        .eq('id', comp.id)
      if (error) throw error
      setComp(prev => ({ ...prev, competition_link: linkValue }))
      setEditingLink(false)
      onRefresh?.()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSavingLink(false)
    }
  }

  // ── Delete competition ────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm(`Delete "${comp.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await onDelete(comp.id)
      onClose()
    } catch (err) {
      alert('Error deleting: ' + err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-surface border border-outline-variant rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Poster Banner ───────────────────────────── */}
        <div className="relative w-full h-56 bg-gradient-to-br from-primary/20 via-primary/10 to-surface-container shrink-0 overflow-hidden">
          {comp.poster_url ? (
            <img
              src={getOptimizedImageUrl(comp.poster_url, { width: 800 })}
              alt="Competition Poster"
              width="672"
              height="224"
              onDoubleClick={() => setLightboxOpen(true)}
              title="Double-click to view full size"
              className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.02] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-on-surface-variant/40">
              <span className="material-symbols-outlined text-5xl">emoji_events</span>
              {isHostOrAdmin && <p className="text-xs font-label-caps uppercase">Upload a poster below</p>}
            </div>
          )}

          {/* Double-click hint on poster */}
          {comp.poster_url && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/50 rounded-full text-[10px] text-white/60 font-label-caps uppercase pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              Double-click to zoom
            </div>
          )}

          {/* Upload overlay for admin/host */}
          {isHostOrAdmin && (
            <label className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-bold font-label-caps uppercase px-3 py-1.5 rounded-xl cursor-pointer transition-all">
              {uploading
                ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Uploading…</>
                : <><span className="material-symbols-outlined text-sm">upload</span> {comp.poster_url ? 'Change Poster' : 'Upload Poster'}</>
              }
              <input type="file" accept="image/*" className="hidden" onChange={handlePosterUpload} disabled={uploading} />
            </label>
          )}

          {/* Close + Delete buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            {isHostOrAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-9 h-9 flex items-center justify-center bg-error/80 hover:bg-error text-white rounded-xl transition-all"
                title="Delete competition"
              >
                <span className="material-symbols-outlined text-[18px]">{deleting ? 'progress_activity' : 'delete'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-xl transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <StatusBadge status={comp.status} />
          </div>
        </div>

        {/* ── Content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Type + Title */}
          <span className="text-[10px] font-bold font-label-caps uppercase text-primary bg-primary/10 px-2 py-0.5 rounded mb-2 inline-block">
            {comp.type?.replace('_', ' ')}
          </span>
          <h2 className="font-bold text-2xl text-on-surface mb-3">{comp.title}</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">{comp.description}</p>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { icon: 'payments', label: 'Prize Pool', value: comp.prize_pool || 'TBD' },
              { icon: 'groups', label: 'Format', value: comp.format },
              { icon: 'schedule', label: 'Start Date', value: new Date(comp.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) },
              { icon: 'timer', label: 'Reg. Deadline', value: new Date(comp.registration_deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), highlight: isDeadlinePassed },
              { icon: 'person', label: 'Hosted By', value: comp.host?.full_name || 'System' },
              { icon: 'groups_2', label: 'Entries', value: `${comp.submissions?.length || 0} submitted` },
            ].map(({ icon, label, value, highlight }) => (
              <div key={label} className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-3">
                <p className="text-[10px] font-label-caps uppercase text-on-surface-variant flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-[13px]">{icon}</span>{label}
                </p>
                <p className={`text-sm font-bold ${highlight ? 'text-error' : 'text-on-surface'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Competition Link */}
          <div className="mb-6">
            <p className="text-[10px] font-label-caps uppercase text-on-surface-variant mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">link</span>
              Competition Link
            </p>
            {editingLink ? (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkValue}
                  onChange={e => setLinkValue(e.target.value)}
                  placeholder="https://devpost.com/..."
                  className="flex-1 bg-surface-container-low text-on-surface p-2.5 rounded-xl border border-primary text-sm focus:outline-none"
                />
                <button
                  onClick={handleSaveLink}
                  disabled={savingLink}
                  className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold font-label-caps uppercase hover:brightness-110 disabled:opacity-50"
                >
                  {savingLink ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditingLink(false); setLinkValue(comp.competition_link || '') }}
                  className="px-3 py-2 border border-outline-variant text-on-surface-variant rounded-xl text-xs hover:bg-surface-container-high">
                  Cancel
                </button>
              </div>
            ) : comp.competition_link ? (
              <div className="flex items-center gap-2">
                <a
                  href={comp.competition_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:underline truncate"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  {comp.competition_link}
                </a>
                {isHostOrAdmin && (
                  <button onClick={() => setEditingLink(true)} className="p-1 text-on-surface-variant hover:text-primary rounded">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                )}
              </div>
            ) : isHostOrAdmin ? (
              <button
                onClick={() => setEditingLink(true)}
                className="flex items-center gap-1.5 text-on-surface-variant/60 hover:text-primary text-sm transition-colors border border-dashed border-outline-variant px-3 py-2 rounded-xl w-full justify-center"
              >
                <span className="material-symbols-outlined text-sm">add_link</span>
                Add competition link
              </button>
            ) : (
              <p className="text-sm text-on-surface-variant italic">No link provided.</p>
            )}
          </div>

          {/* Submitted team info */}
          {hasSubmitted && (
            <div className="bg-success/5 border border-success/20 rounded-xl p-4 mb-5">
              <p className="text-[10px] font-label-caps uppercase text-success mb-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Your Submission
              </p>
              <p className="text-sm font-bold text-on-surface">{submission.team_name}</p>
              {submission.team_members && (() => {
                try {
                  const members = JSON.parse(submission.team_members)
                  return members.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {members.map((m, i) => (
                        <span key={i} className="text-xs bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full border border-outline-variant">{m}</span>
                      ))}
                    </div>
                  ) : null
                } catch { return null }
              })()}
            </div>
          )}
        </div>

        {/* ── Footer Action ────────────────────────────── */}
        <div className="p-5 border-t border-outline-variant bg-surface-container-low shrink-0 flex justify-between items-center">
          <span className="text-xs text-on-surface-variant font-label-caps uppercase">
            Created {new Date(comp.created_at).toLocaleDateString()}
          </span>
          {!hasSubmitted && !isDeadlinePassed ? (
            <button
              onClick={() => { onClose(); onSubmit(comp) }}
              className="flex items-center gap-2 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-sm">emoji_events</span>
              Submit Entry
            </button>
          ) : hasSubmitted ? (
            <span className="flex items-center gap-1.5 text-success font-bold text-xs font-label-caps uppercase">
              <span className="material-symbols-outlined text-sm">check_circle</span>Submitted
            </span>
          ) : (
            <span className="text-on-surface-variant/50 text-xs font-bold font-label-caps uppercase">Registration Closed</span>
          )}
        </div>
      </div>

      {/* Poster lightbox — renders above the modal */}
      {lightboxOpen && comp.poster_url && (
        <PosterLightbox url={comp.poster_url} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}

// ── Competition Card ──────────────────────────────────────────
const CompCard = ({ comp, userId, canHost, onDoubleClick, onSubmit, onViewParticipants, onDelete, onPosterZoom }) => {
  const submission = comp.submissions?.find(s => s.member_id === userId)
  const hasSubmitted = !!submission
  const isDeadlinePassed = new Date(comp.registration_deadline) < new Date()

  return (
    <div
      onDoubleClick={() => onDoubleClick(comp)}
      title="Double-click to view full details"
      className="bg-surface-container rounded-2xl border border-outline-variant flex flex-col shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer group relative overflow-hidden"
    >
      {/* ── Poster / Banner ─────────────────── */}
      <div className="relative w-full h-36 overflow-hidden shrink-0">
        {comp.poster_url ? (
          <img
            src={getOptimizedImageUrl(comp.poster_url, { width: 500 })}
            alt="poster"
            width="400"
            height="144"
            onDoubleClick={e => { e.stopPropagation(); onPosterZoom(comp.poster_url) }}
            title="Double-click to zoom poster"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-primary/5 to-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary/20">emoji_events</span>
          </div>
        )}
        {/* Status badge overlay on poster */}
        <div className="absolute top-2 left-2">
          <StatusBadge status={comp.status} />
        </div>
        {/* Admin delete overlay on poster */}
        {canHost && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(comp.id) }}
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-error text-white rounded-lg transition-colors"
            title="Delete competition"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        )}
      </div>

      {/* ── Card Body ──────────────────────── */}
      <div className="p-5 flex flex-col flex-1">

        <span className="text-[10px] font-bold font-label-caps uppercase text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded">
          {comp.type?.replace('_', ' ')}
        </span>

        <h3 className="font-bold text-base text-on-surface mb-1.5 line-clamp-1">{comp.title}</h3>
        <p className="text-xs text-on-surface-variant leading-relaxed mb-4 line-clamp-2 flex-1">{comp.description}</p>

      <div className="space-y-1.5 text-xs font-label-caps uppercase text-outline mb-4">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">payments</span>
          <span>Prize: <strong className="text-on-surface">{comp.prize_pool || 'TBD'}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-error">
          <span className="material-symbols-outlined text-sm text-error">timer</span>
          <span>Deadline: {new Date(comp.registration_deadline).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">groups_2</span>
          <span><strong className="text-on-surface">{comp.submissions?.length || 0}</strong> entries</span>
        </div>
      </div>

      <div className="pt-3 border-t border-outline-variant/30 flex flex-wrap justify-between items-center gap-2 mt-auto">
        {hasSubmitted ? (
          <span className="text-success text-xs font-bold font-label-caps uppercase flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">check_circle</span>Submitted
          </span>
        ) : isDeadlinePassed ? (
          <span className="text-on-surface-variant/50 text-xs font-bold font-label-caps uppercase">Closed</span>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onSubmit(comp) }}
            className="bg-primary text-on-primary font-bold font-label-caps text-[10px] uppercase px-3 py-2 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Submit Entry
          </button>
        )}
        {canHost && (
          <button
            onClick={e => { e.stopPropagation(); onViewParticipants(comp) }}
            className="flex items-center gap-1 text-xs font-bold font-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-sm">people</span>
            Participants ({comp.submissions?.length || 0})
          </button>
        )}
        </div>

        {/* Double-click hint */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-on-surface-variant/30 font-label-caps uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Double-click for full details
        </div>
      </div>
    </div>
  )
}

// ── Participants Modal ────────────────────────────────────────
const ParticipantsModal = ({ comp, onClose }) => {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('competition_submissions')
        .select('*, member:profiles!competition_submissions_member_id_fkey(full_name, avatar_url, department)')
        .eq('competition_id', comp.id)
        .order('created_at')
      setSubmissions(data || [])
      setLoading(false)
    }
    fetch()
  }, [comp.id])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-outline-variant rounded-2xl max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h3 className="font-bold text-on-surface text-lg">Participants</h3>
            <p className="text-xs text-on-surface-variant">{comp.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
              </svg>
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-center text-on-surface-variant italic py-10">No entries submitted yet.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub, i) => {
                let teamMembers = []
                try { teamMembers = sub.team_members ? JSON.parse(sub.team_members) : [] } catch {}
                return (
                  <div key={sub.id} className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{i + 1}</span>
                      <img src={getOptimizedImageUrl(sub.member?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(sub.member?.full_name || 'M')}`, { width: 32, height: 32 })} className="w-8 h-8 rounded-full border border-outline-variant object-cover" width="32" height="32" alt=""/>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-on-surface">{sub.member?.full_name}</p>
                        <p className="text-[10px] text-on-surface-variant font-label-caps uppercase">{sub.member?.department || '–'}</p>
                      </div>
                    </div>
                    <div className="pl-10">
                      <p className="text-sm font-bold text-on-surface flex items-center gap-1.5 mb-1">
                        <span className="material-symbols-outlined text-sm text-primary">group_work</span>
                        {sub.team_name}
                      </p>
                      {teamMembers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {teamMembers.map((m, mi) => (
                            <span key={mi} className="text-xs bg-surface-container-high text-on-surface-variant px-2.5 py-0.5 rounded-full border border-outline-variant">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Submit Entry Modal ────────────────────────────────────────
const SubmitModal = ({ comp, user, allMembers, onClose, onSubmit, submitting }) => {
  const [teamName, setTeamName] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredSuggestions = allMembers.filter(m =>
    m.id !== user?.id &&
    !teamMembers.includes(m.full_name) &&
    m.full_name.toLowerCase().includes(memberSearch.toLowerCase())
  ).slice(0, 6)

  const addMember = (name) => {
    if (name && !teamMembers.includes(name)) setTeamMembers(prev => [...prev, name])
    setMemberSearch(''); setShowSuggestions(false)
  }
  const removeMember = (name) => setTeamMembers(prev => prev.filter(m => m !== name))

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary">emoji_events</span>
          </div>
          <div>
            <h3 className="font-bold text-on-surface text-lg">Submit Entry</h3>
            <p className="text-xs text-on-surface-variant">{comp.title}</p>
          </div>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit({ teamName, teamMembers }) }} className="space-y-4">
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Team Name / Solo Alias *</label>
            <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)}
              className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Code_Crusaders" required />
          </div>
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1.5 uppercase">Add Team Members (optional)</label>
            <div className="relative">
              <input type="text" value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="w-full bg-surface-container-low text-on-surface p-3 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Search by name…" />
              {showSuggestions && memberSearch && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-surface border border-outline-variant rounded-xl shadow-lg overflow-hidden">
                  {filteredSuggestions.map(m => (
                    <button key={m.id} type="button" onMouseDown={() => addMember(m.full_name)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-high text-sm text-on-surface transition-colors">
                      <img src={getOptimizedImageUrl(m.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.full_name)}`, { width: 28, height: 28 })} className="w-7 h-7 rounded-full border border-outline-variant" width="28" height="28" alt=""/>
                      <div className="text-left">
                        <p className="font-semibold">{m.full_name}</p>
                        <p className="text-[10px] text-on-surface-variant font-label-caps uppercase">{m.department || ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {teamMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {teamMembers.map((m, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                    {m}
                    <button type="button" onClick={() => removeMember(m)} className="hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant mt-1.5">You are automatically included as the submitter.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant hover:bg-surface-container-high rounded-xl font-label-caps text-xs uppercase transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl font-bold font-label-caps text-xs uppercase hover:brightness-110 disabled:opacity-50 transition-all">
              {submitting ? 'Submitting…' : 'Submit Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export const Competitions = () => {
  const { role, user } = useAuth()
  const canHost = ['chairperson', 'vice_chairperson', 'department_lead'].includes(role)
  const isAdmin = (role === 'chairperson' || role === 'vice_chairperson')

  const [competitions, setCompetitions] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [targetComp, setTargetComp] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [participantsComp, setParticipantsComp] = useState(null)
  const [detailComp, setDetailComp] = useState(null)
  const [zoomedPosterUrl, setZoomedPosterUrl] = useState(null)

  const fetchCompetitions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          *,
          host:profiles!competitions_hosted_by_fkey(full_name),
          submissions:competition_submissions(id, member_id, team_name, team_members, status, created_at)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      setCompetitions(data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    document.title = 'Competitions | IOTHINC'
    fetchCompetitions()
    supabase.from('profiles').select('id, full_name, avatar_url, department').order('full_name')
      .then(({ data }) => setAllMembers(data || []))
  }, [])

  const handleSubmitEntry = async ({ teamName, teamMembers }) => {
    if (!targetComp || !user) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('competition_submissions').insert({
        competition_id: targetComp.id,
        member_id: user.id,
        team_name: teamName,
        team_members: teamMembers.length > 0 ? JSON.stringify(teamMembers) : null,
        status: 'submitted'
      })
      if (error) throw error
      alert('Entry submitted successfully!')
      setShowSubmitModal(false)
      setTargetComp(null)
      fetchCompetitions()
    } catch (err) { alert('Error: ' + err.message) }
    finally { setSubmitting(false) }
  }

  const handleDeleteCompetition = async (id) => {
    if (!window.confirm('Delete this competition? This cannot be undone.')) return
    try {
      const { error } = await supabase.from('competitions').delete().eq('id', id)
      if (error) throw error
      fetchCompetitions()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const myCompetitions = competitions.filter(c => c.submissions?.some(s => s.member_id === user?.id))
  const displayComps = activeTab === 'mine' ? myCompetitions : competitions

  if (loading) return (
    <div className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full">
      <GridSkeleton items={6} variant="event" className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
    </div>
  )

  return (
    <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-7xl mx-auto w-full animate-in fade-in duration-200">

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Competitions</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Participate in hackathons, tracks, coding contests, and win exciting prizes.
          </p>
        </div>
        {canHost && (
          <Link to="/competitions/host"
            className="flex items-center gap-2 bg-primary text-on-primary font-bold font-label-caps text-xs uppercase px-4 py-3 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined">add</span>Host Competition
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-2xl p-1.5 mb-6 border border-outline-variant w-fit">
        {[
          { id: 'all', label: 'All Competitions', icon: 'emoji_events', count: competitions.length },
          { id: 'mine', label: 'My Competitions', icon: 'person_check', count: myCompetitions.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* My Competitions empty state */}
      {activeTab === 'mine' && myCompetitions.length === 0 && (
        <div className="bg-surface-container rounded-2xl border border-dashed border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">person_check</span>
          <p className="text-on-surface-variant font-semibold">You haven't joined any competitions yet.</p>
          <button onClick={() => setActiveTab('all')} className="mt-4 px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-xl hover:brightness-110 transition-all">Browse Competitions →</button>
        </div>
      )}

      {/* Grid */}
      {displayComps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayComps.map(comp => (
            <CompCard
              key={comp.id}
              comp={comp}
              userId={user?.id}
              canHost={canHost}
              onDoubleClick={setDetailComp}
              onSubmit={c => { setTargetComp(c); setShowSubmitModal(true) }}
              onViewParticipants={setParticipantsComp}
              onDelete={handleDeleteCompetition}
              onPosterZoom={setZoomedPosterUrl}
            />
          ))}
        </div>
      )}
      {activeTab === 'all' && competitions.length === 0 && (
        <div className="bg-surface-container rounded-xl border border-outline-variant p-8 text-center text-on-surface-variant italic">
          No active competitions tracked.
        </div>
      )}

      {/* Detail Modal (double-click) */}
      {detailComp && (
        <CompDetailModal
          comp={detailComp}
          userId={user?.id}
          canHost={canHost}
          onClose={() => setDetailComp(null)}
          onSubmit={c => { setDetailComp(null); setTargetComp(c); setShowSubmitModal(true) }}
          onDelete={async (id) => { await handleDeleteCompetition(id); setDetailComp(null) }}
          onRefresh={fetchCompetitions}
        />
      )}

      {/* Submit Modal */}
      {showSubmitModal && targetComp && (
        <SubmitModal
          comp={targetComp}
          user={user}
          allMembers={allMembers}
          onClose={() => { setShowSubmitModal(false); setTargetComp(null) }}
          onSubmit={handleSubmitEntry}
          submitting={submitting}
        />
      )}

      {/* Participants Modal */}
      {participantsComp && (
        <ParticipantsModal comp={participantsComp} onClose={() => setParticipantsComp(null)} />
      )}

      {/* Poster Zoom Lightbox */}
      {zoomedPosterUrl && (
        <PosterLightbox url={zoomedPosterUrl} onClose={() => setZoomedPosterUrl(null)} />
      )}
    </main>
  )
}
