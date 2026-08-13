import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBlogs } from '../hooks/useBlogs'
import { useBlogCoverUpload } from '../lib/unifiedStorage'
import { motion, AnimatePresence } from 'motion/react'

const EMPTY_FORM = { title: '', content: '', published: true }

export const AdminBlogs = () => {
  const { user } = useAuth()
  const { blogs, loading, createBlog, updateBlog, deleteBlog } = useBlogs()
  const uploadBlogCover = useBlogCoverUpload()
  
  const [showModal, setShowModal] = useState(false)
  const [editingBlog, setEditingBlog] = useState(null)
  const [blogForm, setBlogForm] = useState(EMPTY_FORM)
  const [blogFile, setBlogFile] = useState(null)
  const [blogUploading, setBlogUploading] = useState(false)

  const handleOpenNew = () => {
    setEditingBlog(null)
    setBlogForm(EMPTY_FORM)
    setBlogFile(null)
    setShowModal(true)
  }

  const handleOpenEdit = (blog) => {
    setEditingBlog(blog)
    setBlogForm({
      title: blog.title,
      content: blog.content,
      published: blog.published
    })
    setBlogFile(null)
    setShowModal(true)
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete blog "${title}"? This cannot be undone.`)) return
    try {
      await deleteBlog(id)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleBlogSubmit = async (e) => {
    e.preventDefault()
    if (!blogForm.title || !blogForm.content) return alert('Title and content are required')
    setBlogUploading(true)
    try {
      let imageUrl = editingBlog ? editingBlog.image_url : null
      
      if (blogFile) {
        const uploadResult = await uploadBlogCover(blogFile, user?.id)
        imageUrl = uploadResult.url
      }
      
      if (editingBlog) {
        await updateBlog({ id: editingBlog.id, updates: { ...blogForm, image_url: imageUrl } })
        alert('Blog updated successfully!')
      } else {
        await createBlog({ ...blogForm, image_url: imageUrl })
        alert('Blog created successfully!')
      }
      
      setShowModal(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setBlogUploading(false)
    }
  }

  if (loading) return (
    <div className="flex-1 p-4 flex justify-center items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <main className="flex-1 overflow-y-auto px-4 md:px-8 pt-24 pb-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-display-sm md:text-display-md text-on-background">Manage Blogs</h1>
            <p className="text-on-surface-variant mt-1 text-sm md:text-base">Create, edit, and publish blogs for the community.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin" className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-bold font-label-caps text-xs uppercase hover:bg-surface-container-high transition-colors">
              Back to Admin
            </Link>
            <button onClick={handleOpenNew} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Blog
            </button>
          </div>
        </div>

        {/* Blogs List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-surface-container-low rounded-xl border border-outline-variant border-dashed">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">article</span>
              <p className="text-on-surface-variant font-medium">No blogs found.</p>
              <button onClick={handleOpenNew} className="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:bg-primary/20 transition-colors">Create the first one</button>
            </div>
          ) : (
            blogs.map(blog => (
              <div key={blog.id} className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant flex flex-col hover:border-primary/50 transition-colors">
                {blog.image_url ? (
                  <img src={blog.image_url} alt={blog.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline text-4xl">image</span>
                  </div>
                )}
                
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-on-surface line-clamp-2">{blog.title}</h3>
                    {!blog.published && (
                      <span className="text-[10px] font-bold font-label-caps uppercase px-2 py-0.5 rounded bg-warning/20 text-warning shrink-0 ml-2">Draft</span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4 flex-1 line-clamp-2">{blog.content}</p>
                  
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-outline-variant/30">
                    <span className="text-xs text-outline">{new Date(blog.created_at).toLocaleDateString()}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEdit(blog)} className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors" title="Edit">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(blog.id, blog.title)} className="p-1.5 text-error hover:bg-error/10 rounded-md transition-colors" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="relative bg-surface-container-high border border-outline-variant rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-outline-variant flex justify-between items-center shrink-0">
                <h2 className="font-display text-display-sm text-on-surface">
                  {editingBlog ? 'Edit Blog' : 'Write a New Blog'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="blog-form" onSubmit={handleBlogSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Blog Title</label>
                    <input type="text" value={blogForm.title} onChange={e => setBlogForm({...blogForm, title: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm focus:ring-primary mb-4" placeholder="A catchy title..." required />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Cover Image {editingBlog && editingBlog.image_url && '(Leave empty to keep current)'}</label>
                    <input type="file" accept="image/*" onChange={e => setBlogFile(e.target.files[0])} className="w-full bg-surface-container-low text-on-surface p-2 rounded-lg border border-outline-variant text-sm mb-4" />
                  </div>

                  <div>
                    <label className="block text-xs font-label-caps text-on-surface-variant mb-1 uppercase">Blog Content</label>
                    <textarea value={blogForm.content} onChange={e => setBlogForm({...blogForm, content: e.target.value})} className="w-full bg-surface-container-low text-on-surface p-3 rounded-lg border border-outline-variant text-sm h-64 resize-y focus:ring-primary" placeholder="Write your blog post here... (Markdown supported)" required />
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <input type="checkbox" id="publish-blog" checked={blogForm.published} onChange={e => setBlogForm({...blogForm, published: e.target.checked})} className="rounded bg-surface border-outline-variant text-primary focus:ring-primary" />
                    <label htmlFor="publish-blog" className="text-sm text-on-surface">Publish immediately</label>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-outline-variant bg-surface-container flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-on-surface rounded-lg font-bold font-label-caps text-xs uppercase hover:bg-surface-container-highest transition-colors">
                  Cancel
                </button>
                <button type="submit" form="blog-form" disabled={blogUploading} className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-bold font-label-caps text-xs uppercase hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2">
                  {blogUploading ? (
                    <><span className="material-symbols-outlined text-[16px] animate-spin">sync</span> Saving...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[16px]">save</span> Save Blog</>
                  )}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
