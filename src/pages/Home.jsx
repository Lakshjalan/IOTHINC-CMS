import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Cpu } from '@phosphor-icons/react/dist/icons/Cpu'
import { Code } from '@phosphor-icons/react/dist/icons/Code'
import { Trophy } from '@phosphor-icons/react/dist/icons/Trophy'
import { BookOpen } from '@phosphor-icons/react/dist/icons/BookOpen'
import { Moon } from '@phosphor-icons/react/dist/icons/Moon'
import { Sun } from '@phosphor-icons/react/dist/icons/Sun'
import { ArrowRight } from '@phosphor-icons/react/dist/icons/ArrowRight'
import { GithubLogo } from '@phosphor-icons/react/dist/icons/GithubLogo'
import { LinkedinLogo } from '@phosphor-icons/react/dist/icons/LinkedinLogo'
import { Envelope } from '@phosphor-icons/react/dist/icons/Envelope'
import { useTheme } from '../context/ThemeContext'
import { CircuitHero } from '../components/CircuitHero'
import { IothincLogo } from '../assets/IothincLogo'
import { HomeBlogs } from '../components/HomeBlogs'

// Scroll reveal variants
const revealVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12
    }
  }
}

const bentoItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

const Home = () => {
  const { isDarkMode, toggleTheme } = useTheme()

  // Bento layout definitions
  const activities = [
    {
      icon: Cpu,
      title: 'Embedded Systems',
      description: 'Hands-on development with microcontrollers, sensor nodes, and PCB design. We bring hardware ideas to life.',
      className: 'md:col-span-2 bg-surface-container-low border border-outline-variant/60 hover:border-accent/40',
      iconClass: 'text-accent bg-accent/10'
    },
    {
      icon: Code,
      title: 'Full Stack Integration',
      description: 'Connecting physical devices to edge computing nodes and robust cloud services for real-time telemetry.',
      className: 'bg-surface-container-high border border-outline-variant/40 hover:border-accent/40',
      iconClass: 'text-accent bg-accent/5'
    },
    {
      icon: Trophy,
      title: 'Competitive Engineering',
      description: 'Representing VIT Chennai at nationwide hackathons and technical symposiums.',
      className: 'bg-surface-container-high border border-outline-variant/40 hover:border-accent/40',
      iconClass: 'text-accent bg-accent/5'
    },
    {
      icon: BookOpen,
      title: 'Mentorship & Knowledge',
      description: 'Weekly student-led workshops covering hardware-firmware integration, network protocols, and web dashboards.',
      className: 'md:col-span-2 bg-surface-container-low border border-outline-variant/60 hover:border-accent/40',
      iconClass: 'text-accent bg-accent/10'
    }
  ]

  const previewProjects = [
    {
      title: 'Robo Soccer',
      type: 'Project',
      category: 'Embedded Systems',
      desc: 'A DIY car powered by microcontroller and robust software deployed in a mini soccer arena'
    },
    {
      title: 'IoT Edge Gateway Dashboard',
      type: 'Project',
      category: 'Web Systems',
      desc: 'Next.js control panel managing hardware subscriptions, visualising live telemetry streams over WebSockets.'
    },
    {
      title: 'VIT Chennai Smart Campus Hack',
      type: 'Event',
      category: 'Workshop',
      desc: 'A 24-hour rapid prototyping hackathon focusing on automation solutions for modern academic spaces.'
    }
  ]

  const leadershipPreview = [
    {
      name: 'Aditya Vardhan',
      role: 'Chairperson',
      dept: 'IoT Core',
      bio: 'Enthusiastic embedded developer focused on secure wireless protocols and custom RTOS scheduling.'
    },
    {
      name: 'Sneha Ramachandran',
      role: 'Vice Chairperson',
      dept: 'Web & Systems',
      bio: 'Full stack developer building real-time dashboard applications and coordinating software integration.'
    },
    {
      name: 'Rohit Kulkarni',
      role: 'Department Lead',
      dept: 'Hardware Builds',
      bio: 'Specialist in custom PCB layouts, sensor integration, and micro-power management strategies.'
    }
  ]

  return (
    <div className="min-h-screen bg-background text-on-background font-body transition-colors duration-200 overflow-x-hidden selection:bg-accent/20 selection:text-accent">
      
      {/* Public Navbar */}
      <motion.nav
        className="fixed top-0 left-0 w-full h-16 border-b border-outline-variant bg-background/85 backdrop-blur-md z-50 flex items-center justify-between px-6 md:px-12"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-2">
          <IothincLogo className="h-12 w-auto text-on-surface" alt="IOTHINC Logo" />
        </div>

        <div className="flex items-center gap-6">
          <a href="#about" className="text-xs font-mono uppercase tracking-wider text-on-surface-variant hover:text-accent transition-colors">
            About
          </a>
          <a href="#what-we-do" className="text-xs font-mono uppercase tracking-wider text-on-surface-variant hover:text-accent transition-colors">
            What We Do
          </a>
          
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link 
            to="/login" 
            className="px-4 py-2 bg-accent text-on-primary text-xs font-mono uppercase tracking-wider font-semibold rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Log in
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <header className="min-h-screen relative flex flex-col items-center justify-center px-6 pt-16 border-b border-outline-variant overflow-hidden">
        {/* Animated Circuit Backdrop */}
        <div className="absolute inset-0 w-full h-full opacity-65 pointer-events-none">
          <CircuitHero />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl text-center flex flex-col items-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-bold tracking-tight text-on-surface mb-6 leading-tight max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Building the Internet of Things at VIT Chennai
          </motion.h1>
          
          <motion.p 
            className="text-sm md:text-base text-on-surface-variant max-w-xl mb-8 leading-relaxed font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            Where embedded systems, custom hardware design, and modern web architectures converge to solve real-world automation challenges.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 items-center"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto"
            >
              <Link 
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 bg-accent text-on-primary font-mono uppercase tracking-wider text-xs font-bold rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Log in <ArrowRight size={14} />
              </Link>
            </motion.div>

            <motion.a 
              href="#about"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto px-8 py-3.5 bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high font-mono uppercase tracking-wider text-xs font-bold rounded-lg transition-colors flex items-center justify-center"
            >
              About IOTHINC
            </motion.a>
          </motion.div>
        </div>
      </header>

      {/* About Section (Asymmetric Split Layout) */}
      <motion.section 
        id="about" 
        className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-b border-outline-variant"
        variants={revealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <span className="font-mono text-xs uppercase tracking-widest text-accent font-bold">About IOTHINC</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface mt-3">
              We bridge the physical and digital worlds.
            </h2>
          </div>
          <div className="lg:col-span-8 space-y-6">
            <p className="text-base text-on-surface-variant leading-relaxed">
              IOTHINC is a premier student-led IoT and Embedded Systems club at VIT Chennai. Established as a workspace for technical innovation, we bring together passionate builders across departments, from hardware designers laying out circuits to software engineers building cloud integration panels.
            </p>
            <p className="text-base text-on-surface-variant leading-relaxed">
              Our core mission centers on hands-on deployment. We believe true knowledge is built in the lab, testing firmware, debugging protocols, and deploying systems in real conditions on campus and beyond.
            </p>
          </div>
        </div>
      </motion.section>

      {/* What We Do Section (Asymmetric Bento Grid with Staggered children and hover animations) */}
      <section id="what-we-do" className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-b border-outline-variant">
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-16"
          variants={revealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <span className="font-mono text-xs uppercase tracking-widest text-accent font-bold">Our Domains</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface mt-3">What we build and teach</h2>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {activities.map((act, index) => {
            const IconComp = act.icon
            return (
              <motion.div 
                key={index} 
                className={`p-8 rounded-2xl transition-colors duration-300 flex flex-col group relative ${act.className}`}
                variants={bentoItemVariants}
                whileHover={{ 
                  y: -6, 
                  scale: 1.015,
                  boxShadow: '0 12px 30px -10px rgba(var(--color-primary) / 0.08)'
                }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors ${act.iconClass}`}>
                  <IconComp size={24} />
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-3">{act.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed font-light">{act.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Projects & Events Preview (Staggered Column Layout with dynamic entry) */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-b border-outline-variant">
        <motion.div 
          className="flex flex-col md:flex-row md:items-end justify-between mb-16"
          variants={revealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-accent font-bold">Featured Builds & Events</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface mt-3">Active Workspace</h2>
          </div>
          <Link to="/login" className="mt-4 md:mt-0 flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-semibold text-accent hover:text-accent/80 transition-colors">
            Log in to view all builds <ArrowRight size={14} />
          </Link>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {previewProjects.map((item, index) => (
            <motion.div 
              key={index}
              className={`bg-surface-container rounded-2xl border border-outline-variant p-6 flex flex-col justify-between hover:border-accent/40 transition-all ${
                index === 1 ? 'lg:translate-y-6' : ''
              }`}
              variants={bentoItemVariants}
              whileHover={{ y: index === 1 ? 16 : -6, scale: 1.015 }}
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest bg-accent/10 text-accent px-2 py-0.5 rounded">
                    {item.type}
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">{item.title}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed font-light">{item.desc}</p>
              </div>
              
              <div className="pt-6 mt-6 border-t border-outline-variant/30 text-xs font-mono text-accent flex items-center gap-2">
                Learn more at login
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Leadership Preview (Offset Cards Layout) */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto border-b border-outline-variant">
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-16"
          variants={revealVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <span className="font-mono text-xs uppercase tracking-widest text-accent font-bold">Club Organizers</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface mt-3">Core Leadership</h2>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {leadershipPreview.map((leader, index) => (
            <motion.div 
              key={index}
              className={`bg-surface-container-low border border-outline-variant rounded-2xl p-6 text-center hover:border-accent/30 transition-all ${
                index === 0 ? 'md:-translate-y-4' : index === 2 ? 'md:translate-y-4' : ''
              }`}
              variants={bentoItemVariants}
              whileHover={{ y: index === 0 ? -22 : index === 2 ? -2 : -6, scale: 1.015 }}
            >
              <div className="w-20 h-20 rounded-full bg-accent/10 text-accent font-mono font-bold text-xl flex items-center justify-center mx-auto mb-4 border border-accent/20">
                {leader.name.split(' ').map(n=>n[0]).join('')}
              </div>
              <h3 className="text-base font-bold text-on-surface">{leader.name}</h3>
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-semibold block mt-1">
                {leader.role}
              </span>
              <span className="text-[10px] font-mono uppercase text-on-surface-variant tracking-wider block mt-0.5">
                {leader.dept}
              </span>
              <p className="text-xs text-on-surface-variant leading-relaxed font-light mt-4">
                {leader.bio}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Join CTA Band */}
      <motion.section 
        className="py-20 px-6 max-w-7xl mx-auto text-center"
        variants={revealVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <div className="bg-surface-container border border-outline-variant rounded-3xl p-12 max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-on-surface mb-4">
            Become a part of the workspace.
          </h2>
          <p className="text-sm text-on-surface-variant max-w-lg mx-auto mb-8 font-light leading-relaxed">
            Collaborate on embedded builds, track club achievements, and join specialized engineering sub-teams.
          </p>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block"
          >
            <Link 
              to="/login"
              className="px-8 py-3 bg-accent text-on-primary font-mono uppercase tracking-wider text-xs font-bold rounded-lg hover:brightness-110 active:scale-[0.98] transition-all inline-flex items-center gap-2"
            >
              Log in <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Blogs Section */}
      <HomeBlogs />

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 border-t border-outline-variant bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <IothincLogo className="h-12 w-auto text-on-surface" alt="IOTHINC Logo" />
          </div>

          <div className="flex gap-6 text-xs font-mono text-on-surface-variant">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-accent transition-colors flex items-center gap-1">
              <GithubLogo size={14} /> GitHub
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-accent transition-colors flex items-center gap-1">
              <LinkedinLogo size={14} /> LinkedIn
            </a>
            <a href="mailto:iothinc.vitc@gmail.com" className="hover:text-accent transition-colors flex items-center gap-1">
              <Envelope size={14} /> Email
            </a>
          </div>

          <span className="text-[10px] font-mono text-on-surface-variant">
            VIT Chennai, 25BAI Workshop Space.
          </span>
        </div>
      </footer>

    </div>
  )
}


export default Home;
