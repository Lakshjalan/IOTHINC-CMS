import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useBlogs } from '../hooks/useBlogs'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export const HomeBlogs = () => {
  const { blogs, loading } = useBlogs()
  
  // Only show published blogs on the home page
  const publishedBlogs = blogs.filter(b => b.published).slice(0, 3)

  if (loading || publishedBlogs.length === 0) return null

  return (
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={containerVariants}
        className="mb-12 text-center"
      >
        <motion.p variants={itemVariants} className="font-mono text-xs uppercase tracking-widest text-accent mb-3">
          Latest Updates
        </motion.p>
        <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-bold tracking-tight text-on-surface">
          From the Blog
        </motion.h2>
      </motion.div>

      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {publishedBlogs.map(blog => (
          <motion.div key={blog.id} variants={itemVariants} className="group flex flex-col h-full bg-surface-container-low rounded-2xl border border-outline-variant/60 overflow-hidden hover:border-accent/40 transition-colors">
            {blog.image_url ? (
              <div className="h-48 w-full overflow-hidden bg-surface-container-highest">
                <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
            ) : (
              <div className="h-48 w-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-outline-variant">article</span>
              </div>
            )}
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-xl font-bold text-on-surface mb-3 line-clamp-2 group-hover:text-primary transition-colors">{blog.title}</h3>
              <p className="text-sm text-on-surface-variant font-light leading-relaxed mb-6 line-clamp-3">
                {blog.content}
              </p>
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <img src={blog.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(blog.author?.full_name || 'U')}`} alt="author" className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-xs font-medium text-on-surface-variant">{blog.author?.full_name?.split(' ')[0]}</span>
                </div>
                <Link to={`/blog/${blog.id}`} className="text-xs font-label-caps uppercase text-primary hover:text-accent font-bold tracking-wider">
                  Read More
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
