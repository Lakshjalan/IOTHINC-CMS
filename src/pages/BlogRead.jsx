import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useBlogs } from '../hooks/useBlogs'
import { ArrowLeft } from '@phosphor-icons/react/dist/icons/ArrowLeft'

const BlogRead = () => {
  const { id } = useParams()
  const { fetchBlogById } = useBlogs()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadBlog = async () => {
      try {
        const data = await fetchBlogById(id)
        setBlog(data)
        document.title = `${data.title} | IOTHINC Blog`
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadBlog()
  }, [id])

  if (loading) {
    return (
      <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-4xl mx-auto w-full flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </main>
    )
  }

  if (error || !blog) {
    return (
      <main className="flex-1 px-4 md:px-stack-lg pt-24 pb-section-gap max-w-4xl mx-auto w-full text-center">
        <h2 className="text-2xl font-bold text-error mb-4">Blog not found</h2>
        <Link to="/" className="text-primary hover:underline">Return Home</Link>
      </main>
    )
  }

  return (
    <main className="flex-1 pt-24 pb-section-gap w-full">
      <article className="max-w-3xl mx-auto px-4 md:px-stack-lg">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary mb-8 font-mono tracking-wider uppercase transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
        
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-on-surface mb-6 tracking-tight leading-tight">{blog.title}</h1>
          <div className="flex items-center justify-center gap-4 text-on-surface-variant">
            <div className="flex items-center gap-2">
              <img src={blog.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(blog.author?.full_name || 'U')}`} alt="author" className="w-8 h-8 rounded-full object-cover border border-outline-variant" />
              <span className="font-medium text-sm">{blog.author?.full_name}</span>
            </div>
            <span className="text-outline-variant">•</span>
            <time className="text-sm font-mono">{new Date(blog.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          </div>
        </header>

        {blog.image_url && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-64 md:h-96 rounded-2xl overflow-hidden mb-12 shadow-lg border border-outline-variant/50"
          >
            <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover" />
          </motion.div>
        )}

        <div className="prose prose-invert max-w-none text-on-surface-variant font-light leading-relaxed prose-p:mb-6 prose-headings:text-on-surface prose-a:text-primary hover:prose-a:text-accent">
          {/* Simple newline to paragraph mapping. A real markdown parser like react-markdown is ideal, but this works well for plain text. */}
          {blog.content.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  )
}


export default BlogRead;
